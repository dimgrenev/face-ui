import {
  useRef,
  useState,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type RefCallback,
  type RefObject,
} from 'react'
import {
  move,
  typeahead as search,
  type Typeahead,
} from '../../runtime/collection'
import {
  keyToMove,
  readDirection,
  type Orientation,
} from '../../runtime/keyboard'
import { isAvailable } from '../../runtime/layers'
import { useFocusRecovery } from './use-focus-recovery'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

export interface RovingFocusOptions {
  /** Every item key in DOM order, disabled ones included. */
  keys: readonly string[]
  /** Items that arrows skip and Tab never stops on; items `:disabled` at event time (a disabled fieldset) are skipped too. */
  disabled?: (key: string) => boolean
  /** The tab stop while focus is not on an item, such as the selected key; else the last focused item, else the first enabled one. */
  active?: string | null
  /** Arrows that move focus: `'both'` takes all four, as radio groups do; left and right swap in RTL. */
  orientation: Orientation
  /** Arrows wrap around at the ends; default true. */
  loop?: boolean
  /** `'one'` keeps a single tab stop (roving tabindex); `'all'` leaves every enabled item in the tab order. Default `'one'`. */
  tabStops?: 'one' | 'all'
  /** A keyboard move clicks the reached item, so `preventDefault()` in a click handler cancels the activation, as for a pointer. */
  activateOnMove?: boolean
  /** An item's text; when given, printable keys move focus by typeahead. */
  typeahead?: (key: string) => string
  /** Moves reveal the item by scrolling only this container, never its ancestors. */
  scrollRef?: RefObject<HTMLElement | null>
  /** Focuses the tab stop once on mount; a StrictMode replay does not focus again. */
  autoFocus?: boolean
}

export interface RovingFocus {
  /** Handlers for the group's root element; compose the consumer's own handlers first. */
  root: {
    onKeyDown: KeyboardEventHandler<HTMLElement>
    onFocus: FocusEventHandler<HTMLElement>
    onBlur: FocusEventHandler<HTMLElement>
  }
  /** Props for the focusable element of the item `key`. */
  item(key: string): { ref: RefCallback<HTMLElement>; tabIndex: 0 | -1 }
  /** The key whose item element is `target` itself; `null` for anything else, nested groups' items included. */
  keyOf(target: EventTarget | null): string | null
  /** Focuses the item without activating it. */
  focus(key: string): void
}

/** Scrolls `container` by the least amount that shows `node` inside its client box. */
function reveal(container: HTMLElement, node: HTMLElement) {
  const box = node.getBoundingClientRect()
  const view = container.getBoundingClientRect()
  const left = view.left + container.clientLeft
  const top = view.top + container.clientTop
  const right = left + container.clientWidth
  const bottom = top + container.clientHeight
  const x =
    box.left < left
      ? box.left - left
      : box.right > right
        ? box.right - right
        : 0
  const y =
    box.top < top
      ? box.top - top
      : box.bottom > bottom
        ? box.bottom - bottom
        : 0
  if (x || y) container.scrollBy({ left: x, top: y, behavior: 'instant' })
}

/**
 * Keyboard focus for a group of items: one tab stop (or all), arrows, Home/End and typeahead
 * between this group's own items, and focus recovery when the focused item goes away. The tab
 * stop is derived from props alone until focus enters, so server and client render the same.
 */
export function useRovingFocus({
  keys,
  disabled,
  active = null,
  orientation,
  loop = true,
  tabStops = 'one',
  activateOnMove = false,
  typeahead,
  scrollRef,
  autoFocus = false,
}: RovingFocusOptions): RovingFocus {
  const elements = useRef(new Map<string, HTMLElement>()).current
  // Kept after unmount, so recovery still knows which key a removed element had.
  const owners = useRef(new WeakMap<object, string>()).current
  const refs = useRef(new Map<string, RefCallback<HTMLElement>>()).current
  const order = useRef(keys)
  const query = useRef<Typeahead | null>(null)
  const autoFocused = useRef(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [inside, setInside] = useState(false)
  // The root is known once focus has entered it; the commit that stores it starts recovery.
  const [root, setRoot] = useState<HTMLElement | null>(null)

  const enabled = (key: string) => !disabled?.(key)
  const usable = (key: string | null): key is string =>
    key !== null && keys.includes(key) && enabled(key)
  const stop =
    [inside ? focused : null, active, focused].find(usable) ??
    keys.find(enabled) ??
    null
  const reachable = (key: string) => {
    const node = elements.get(key)
    return !!node && enabled(key) && !node.matches(':disabled')
  }
  const keyOf = (target: EventTarget | null) => {
    const key = owners.get(target as object)
    return key !== undefined && elements.get(key) === target ? key : null
  }
  const focus = (key: string) => {
    const node = elements.get(key)
    const container = scrollRef?.current
    node?.focus(container ? { preventScroll: true } : undefined)
    if (node && container) reveal(container, node)
  }

  useFocusRecovery({ current: root }, (lost) => {
    // The item now at the lost one's place, else the nearest before it.
    const key = owners.get(lost)
    const index = key === undefined ? -1 : order.current.indexOf(key)
    const around =
      index >= 0
        ? [...keys.slice(index), ...keys.slice(0, index).reverse()]
        : stop === null
          ? []
          : [stop]
    for (const key of around) {
      const node = elements.get(key)
      if (node && enabled(key) && isAvailable(node)) return node
    }
  })
  useIsomorphicLayoutEffect(() => {
    order.current = keys
    if (refs.size > keys.length) {
      const live = new Set(keys)
      for (const key of refs.keys()) if (!live.has(key)) refs.delete(key)
    }
  })
  useIsomorphicLayoutEffect(() => {
    if (!autoFocus || autoFocused.current) return
    autoFocused.current = true
    if (stop !== null) focus(stop)
  }, [])

  const onKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    const from = keyOf(event.target)
    if (from === null || event.defaultPrevented) return
    const to = keyToMove(event, orientation, readDirection(elements.get(from)))
    let next: string | null = null
    if (to) {
      // From an item arrows cannot reach (clicked while disabled), next/prev still start at its place.
      const edge = to === 'first' || to === 'last'
      next = move(
        keys.filter((key) => (key === from && !edge) || reachable(key)),
        from,
        to,
        loop,
      )
    } else if (
      typeahead &&
      Array.from(event.key).length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.nativeEvent.isComposing
    ) {
      const candidates = keys.map((key) => ({
        key,
        text: typeahead(key),
        disabled: !reachable(key),
      }))
      const [state, found] = search(
        query.current,
        event.key,
        event.timeStamp,
        candidates,
        from,
      )
      query.current = state
      // Space outside a query stays the item's own activation.
      if (!state.query) return
      next = found
    } else return
    event.preventDefault()
    if (next === null || next === from) return
    focus(next)
    if (activateOnMove) elements.get(next)?.click()
  }

  return {
    root: {
      onKeyDown,
      onFocus: (event) => {
        setRoot(event.currentTarget)
        const key = keyOf(event.target)
        if (key === null) return
        setFocused(key)
        setInside(true)
      },
      onBlur: (event) => {
        if (keyOf(event.relatedTarget) === null) setInside(false)
      },
    },
    item: (key) => {
      let ref = refs.get(key)
      if (!ref) {
        ref = (node) => {
          if (node) {
            elements.set(key, node)
            owners.set(node, key)
          } else elements.delete(key)
        }
        refs.set(key, ref)
      }
      const tabbable = tabStops === 'all' ? enabled(key) : key === stop
      return { ref, tabIndex: tabbable ? 0 : -1 }
    },
    keyOf,
    focus,
  }
}
