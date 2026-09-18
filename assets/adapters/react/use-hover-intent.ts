import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
  type PointerEvent,
  type FocusEvent,
} from 'react'

type Point = { x: number; y: number }
type Region = 'trigger' | 'content'
type Options = {
  enabled: boolean
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  send: (event: 'POINTER_ENTER' | 'POINTER_LEAVE' | 'FOCUS' | 'BLUR') => void
}
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

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

/** DOM hover and focus form one intent. A pointer can cross the real gap without
 * inventing a minimum close delay or making a noninteractive tooltip disappear. */
export function useHoverIntent(options: Options) {
  const latest = useRef(options)
  useCommitEffect(() => {
    latest.current = options
  })
  const intent = useRef({ trigger: false, content: false, focused: false })
  const bridge = useRef<{ from: Region; cancel: () => void } | null>(null)
  const cancelBridge = () => {
    if (bridge.current) intent.current[bridge.current.from] = false
    bridge.current?.cancel()
    bridge.current = null
  }
  useEffect(() => {
    if (!options.enabled) {
      cancelBridge()
      intent.current = { trigger: false, content: false, focused: false }
    }
    return cancelBridge
  }, [options.enabled])
  useEffect(() => {
    if (!options.open) cancelBridge()
  }, [options.open])

  const leave = (region: Region) => {
    intent.current[region] = false
    if (!Object.values(intent.current).some(Boolean))
      latest.current.send('POINTER_LEAVE')
  }
  const pointerEnter =
    (region: Region) => (event: PointerEvent<HTMLElement>) => {
      if (
        !latest.current.enabled ||
        event.defaultPrevented ||
        event.pointerType === 'touch'
      )
        return
      const previous = bridge.current?.from
      cancelBridge()
      intent.current[region] = true
      if (previous && previous !== region) intent.current[previous] = false
      latest.current.send('POINTER_ENTER')
    }
  const pointerLeave =
    (region: Region) => (event: PointerEvent<HTMLElement>) => {
      if (
        !latest.current.enabled ||
        event.defaultPrevented ||
        event.pointerType === 'touch'
      )
        return
      cancelBridge()
      const source =
        region === 'trigger'
          ? latest.current.triggerRef.current
          : latest.current.contentRef.current
      const target =
        region === 'trigger'
          ? latest.current.contentRef.current
          : latest.current.triggerRef.current
      const point = { x: event.clientX, y: event.clientY }
      const from = source?.getBoundingClientRect(),
        to = target?.getBoundingClientRect()
      const toward =
        from &&
        to &&
        ((to.top >= from.bottom && point.y >= from.bottom - 1) ||
          (to.bottom <= from.top && point.y <= from.top + 1) ||
          (to.left >= from.right && point.x >= from.right - 1) ||
          (to.right <= from.left && point.x <= from.left + 1))
      if (
        !latest.current.open ||
        !target ||
        !to?.width ||
        !to.height ||
        !toward
      ) {
        leave(region)
        return
      }
      // A fast pointer may jump straight to another control. Build the corridor
      // from the source edge, not that distant event coordinate.
      const exit = {
        x: Math.max(from!.left, Math.min(from!.right, point.x)),
        y: Math.max(from!.top, Math.min(from!.bottom, point.y)),
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
      if (!inside(point, polygon)) {
        leave(region)
        return
      }
      const doc = target.ownerDocument
      const move = (event: globalThis.PointerEvent) => {
        if (target.contains(event.target as Node)) return
        if (!inside({ x: event.clientX, y: event.clientY }, polygon)) {
          cancelBridge()
          leave(region)
        }
      }
      const exitDocument = (event: globalThis.PointerEvent) => {
        if (event.relatedTarget !== null) return
        cancelBridge()
        leave(region)
      }
      doc.addEventListener('pointermove', move)
      doc.addEventListener('pointerout', exitDocument)
      bridge.current = {
        from: region,
        cancel: () => {
          doc.removeEventListener('pointermove', move)
          doc.removeEventListener('pointerout', exitDocument)
        },
      }
    }
  const focus = (event: FocusEvent<HTMLElement>) => {
    if (!latest.current.enabled || event.defaultPrevented) return
    intent.current.focused = true
    latest.current.send('FOCUS')
  }
  const blur = (event: FocusEvent<HTMLElement>) => {
    if (!latest.current.enabled || event.defaultPrevented) return
    const target = event.relatedTarget as Node | null
    if (
      target &&
      (latest.current.triggerRef.current?.contains(target) ||
        latest.current.contentRef.current?.contains(target))
    )
      return
    intent.current.focused = false
    if (!intent.current.trigger && !intent.current.content)
      latest.current.send('BLUR')
  }
  const handlers = (region: Region) => ({
    onPointerEnter: pointerEnter(region),
    onPointerLeave: pointerLeave(region),
    onFocus: focus,
    onBlur: blur,
  })
  return { trigger: handlers('trigger'), content: handlers('content') }
}
