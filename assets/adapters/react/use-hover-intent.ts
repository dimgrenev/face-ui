import {
  useEffect,
  useState,
  type FocusEvent,
  type PointerEvent,
  type RefCallback,
} from 'react'
import { isRestoringFocus } from '../../runtime/layers'
import { useEventCallback } from './use-event-callback'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

export interface HoverIntentOptions {
  /** The open key, or `null` when nothing is open. */
  value: string | null
  /** Proposes the key to open or `null` to close; route it to useControllableState. */
  onValueChange: (next: string | null) => void
  /** Milliseconds from entering a trigger to proposing its key. */
  openDelay: number
  /** Milliseconds from leaving every trigger and the content to proposing `null`. */
  closeDelay: number
  /** Ignores all input and cancels a pending delay. */
  disabled?: boolean
  /** Keyboard focus on a trigger opens it as hover does; defaults to true. */
  focus?: boolean
}

export interface HoverIntentHandlers {
  ref: RefCallback<HTMLElement>
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
  onBlur: (event: FocusEvent<HTMLElement>) => void
}

export interface HoverIntent {
  /** Props for the trigger that opens `key`; the ref may go on the element the handlers are on. */
  trigger(key: string): HoverIntentHandlers
  /** Props for the open key's content; its ref measures the region the pointer may cross to. */
  content: HoverIntentHandlers
}

type Point = { x: number; y: number }
/** Region id of the content; every other region is a trigger key. */
const CONTENT = Symbol('content')
type Region = string | typeof CONTENT

function hull(points: Point[]) {
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const half = (list: Point[]) => {
    const result: Point[] = []
    for (const point of list) {
      while (
        result.length > 1 &&
        cross(result.at(-2)!, result.at(-1)!, point) <= 0
      )
        result.pop()
      result.push(point)
    }
    result.pop()
    return result
  }
  return [...half(sorted), ...half(sorted.reverse())]
}
function inside(point: Point, polygon: Point[]) {
  let contained = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j]
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      contained = !contained
  }
  return contained
}

/**
 * The open-intent table (RFC §1.2): ENTER{key} and LEAVE from the DOM, open
 * and close delays, proposals through `propose`. Pointer and focus are two
 * sources; LEAVE fires once neither is on a trigger or the content.
 */
function createIntent(
  propose: (next: string | null) => void,
  options: HoverIntentOptions,
) {
  const s = {
    value: options.value,
    openDelay: options.openDelay,
    closeDelay: options.closeDelay,
    disabled: !!options.disabled,
    focus: options.focus ?? true,
    mode: 'idle' as 'idle' | 'opening' | 'closing',
    /** The key a pending opening proposes. */
    target: null as string | null,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    /** The last proposal, so its commit is not taken for an external change. */
    proposed: undefined as { value: string | null } | undefined,
    pointer: null as Region | null,
    focused: false,
    /** The trigger keyboard focus entered; focus a layer restored holds but did not enter. */
    focusKey: null as string | null,
    bridge: null as (() => void) | null,
  }
  const triggers = new Map<string, HTMLElement>()
  let content: HTMLElement | null = null

  const idle = () => {
    clearTimeout(s.timer)
    s.mode = 'idle'
    s.target = null
  }
  const commit = (next: string | null) => {
    idle()
    s.proposed = { value: next }
    propose(next)
  }
  const schedule = () => {
    clearTimeout(s.timer)
    const opening = s.mode === 'opening'
    s.timer = setTimeout(
      () => commit(opening ? s.target : null),
      opening ? s.openDelay : s.closeDelay,
    )
  }
  const enter = (key: string) => {
    if (s.mode === 'closing') {
      // Moving to another trigger (a submenu sibling) opens it at once.
      if (key === s.value) idle()
      else commit(key)
    } else if (s.mode === 'opening') {
      if (key !== s.target) {
        s.target = key
        schedule()
      }
    } else if (key !== s.value) {
      if (s.openDelay > 0) {
        s.mode = 'opening'
        s.target = key
        schedule()
      } else commit(key)
    }
  }
  const leave = () => {
    if (s.mode === 'opening') idle()
    else if (s.mode === 'idle' && s.value !== null) {
      if (s.closeDelay > 0) {
        s.mode = 'closing'
        schedule()
      } else commit(null)
    }
  }
  /**
   * Replays input that arrived while the own proposal waited for its commit and
   * was measured against the old value: whatever still holds the intent wins.
   */
  const settle = () => {
    if (s.mode === 'opening' ? s.target === s.value : s.mode === 'closing' && s.value === null)
      idle()
    if (s.mode !== 'idle') return
    if (s.value !== null) {
      if (s.pointer === null && !s.focused) leave()
    } else {
      const key = typeof s.pointer === 'string' ? s.pointer : s.focusKey
      if (key !== null) enter(key)
    }
  }
  const endBridge = () => {
    s.bridge?.()
    s.bridge = null
  }
  const release = () => {
    s.pointer = null
    if (!s.focused) leave()
  }
  const holds = (node: Node | null) =>
    !!node &&
    (!!content?.contains(node) ||
      [...triggers.values()].some((element) => element.contains(node)))

  /**
   * A pointer leaving toward the other region keeps its intent while it stays
   * in the corridor between them, so a gap never needs a close delay.
   */
  const crossing = (region: Region, event: PointerEvent<HTMLElement>) => {
    const open = s.value
    if (open === null || (region !== CONTENT && region !== open)) return false
    const source = region === CONTENT ? content : triggers.get(region)
    const target = region === CONTENT ? triggers.get(open) : content
    if (!source || !target) return false
    const point = { x: event.clientX, y: event.clientY }
    const from = source.getBoundingClientRect(),
      to = target.getBoundingClientRect()
    const toward =
      (to.top >= from.bottom && point.y >= from.bottom - 1) ||
      (to.bottom <= from.top && point.y <= from.top + 1) ||
      (to.left >= from.right && point.x >= from.right - 1) ||
      (to.right <= from.left && point.x <= from.left + 1)
    if (!to.width || !to.height || !toward) return false
    // A fast pointer may jump straight to another control. Build the corridor
    // from the source edge, not that distant event coordinate.
    const exit = {
      x: Math.max(from.left, Math.min(from.right, point.x)),
      y: Math.max(from.top, Math.min(from.bottom, point.y)),
    }
    const polygon = hull([
      { x: exit.x - 2, y: exit.y - 2 },
      { x: exit.x + 2, y: exit.y - 2 },
      { x: exit.x - 2, y: exit.y + 2 },
      { x: exit.x + 2, y: exit.y + 2 },
      { x: to.left, y: to.top },
      { x: to.right, y: to.top },
      { x: to.left, y: to.bottom },
      { x: to.right, y: to.bottom },
    ])
    if (!inside(point, polygon)) return false
    const doc = target.ownerDocument
    const move = (event: globalThis.PointerEvent) => {
      if (target.contains(event.target as Node)) return
      if (!inside({ x: event.clientX, y: event.clientY }, polygon)) {
        endBridge()
        release()
      }
    }
    const exitDocument = (event: globalThis.PointerEvent) => {
      if (event.relatedTarget !== null) return
      endBridge()
      release()
    }
    doc.addEventListener('pointermove', move)
    doc.addEventListener('pointerout', exitDocument)
    s.bridge = () => {
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerout', exitDocument)
    }
    return true
  }

  const ignored = (event: { defaultPrevented: boolean; pointerType?: string }) =>
    s.disabled || event.defaultPrevented || event.pointerType === 'touch'
  const handlers = (
    region: Region,
    ref: RefCallback<HTMLElement>,
  ): HoverIntentHandlers => {
    const key = () => (region === CONTENT ? s.value : region)
    return {
      ref,
      onPointerEnter(event) {
        if (ignored(event)) return
        endBridge()
        s.pointer = region
        const entered = key()
        if (entered !== null) enter(entered)
      },
      onPointerLeave(event) {
        if (ignored(event) || s.pointer !== region) return
        endBridge()
        if (!crossing(region, event)) release()
      },
      onFocus(event) {
        if (ignored(event) || !s.focus) return
        s.focused = true
        // Focus returned by a closing layer is not the user arriving.
        const entered = isRestoringFocus() ? null : key()
        s.focusKey = region === CONTENT ? null : entered
        if (entered !== null) enter(entered)
      },
      onBlur(event) {
        if (ignored(event) || !s.focus || holds(event.relatedTarget)) return
        s.focused = false
        s.focusKey = null
        if (s.pointer === null) leave()
      },
    }
  }

  const refs = new Map<string, RefCallback<HTMLElement>>()
  const contentHandlers = handlers(CONTENT, (node) => {
    content = node
  })
  return {
    api: {
      trigger(key: string) {
        let ref = refs.get(key)
        if (!ref) {
          ref = (node) => {
            if (node) triggers.set(key, node)
            else triggers.delete(key)
          }
          refs.set(key, ref)
        }
        return handlers(key, ref)
      },
      content: contentHandlers,
    } satisfies HoverIntent,
    /** Takes the committed options; see the "Additional rules" of the table. */
    sync(options: HoverIntentOptions) {
      const { value, openDelay, closeDelay } = options
      const disabled = !!options.disabled
      const changed = !Object.is(value, s.value)
      const own = changed && !!s.proposed && Object.is(s.proposed.value, value)
      const retimed = openDelay !== s.openDelay || closeDelay !== s.closeDelay
      Object.assign(s, { value, openDelay, closeDelay, disabled })
      s.focus = options.focus ?? true
      s.proposed = undefined
      if (value === null && (s.bridge || s.pointer === CONTENT)) {
        // Closed while crossing or over content that is now hidden.
        endBridge()
        s.pointer = null
      }
      if (disabled) {
        dispose()
        Object.assign(s, { pointer: null, focused: false, focusKey: null })
      } else if (changed && !own) idle()
      else {
        if (retimed && s.mode !== 'idle') schedule()
        if (own) settle()
      }
    },
    dispose,
  }
  function dispose() {
    idle()
    endBridge()
  }
}

/**
 * Hover and keyboard focus as one open intent over any number of keyed
 * triggers and one content region, with open and close delays; a pointer can
 * cross the gap to the content without a close delay.
 */
export function useHoverIntent(options: HoverIntentOptions): HoverIntent {
  const propose = useEventCallback(options.onValueChange)
  const [intent] = useState(() => createIntent(propose, options))
  useIsomorphicLayoutEffect(() => intent.sync(options))
  useEffect(() => intent.dispose, [intent])
  return intent.api
}
