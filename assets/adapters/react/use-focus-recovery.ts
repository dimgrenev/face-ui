import { useRef, type RefObject } from 'react'
import { isAvailable } from '../../runtime/layers'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

/**
 * When the last element focused inside `root` becomes unavailable (disconnected, `:disabled`,
 * hidden, inert) and focus fell to `<body>`, focuses `fallback(lost)` after the commit, without
 * scrolling. Checked after every commit of the calling component; a deliberate blur, focus moved
 * elsewhere or an unavailable root recovers nothing.
 */
export function useFocusRecovery(
  rootRef: RefObject<HTMLElement | null>,
  fallback: (lost: HTMLElement) => HTMLElement | null | undefined,
): void {
  const last = useRef<HTMLElement | null>(null)
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    const lost = last.current
    if (lost) {
      const doc = lost.ownerDocument
      const active = doc.activeElement
      // Firefox keeps focus on a control that became disabled; other losses land on <body>.
      if (
        (!active || active === doc.body || active === lost) &&
        !isAvailable(lost)
      ) {
        last.current = null
        const next = root && isAvailable(root) ? fallback(lost) : null
        if (next && isAvailable(next)) next.focus({ preventScroll: true })
      }
    }
    if (!root) return
    const doc = root.ownerDocument
    // Focus set during this commit (autoFocus, the recovery above) fired no listener.
    if (root.contains(doc.activeElement))
      last.current = doc.activeElement as HTMLElement
    const onFocusIn = (event: FocusEvent) => {
      last.current = event.target as HTMLElement
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null
      if (next) {
        if (!root.contains(next)) last.current = null
        return
      }
      // No destination: the element is going away, or was blurred on purpose while still
      // usable (a click on the page). Only the first is a loss to recover from.
      const left = event.target as HTMLElement
      queueMicrotask(() => {
        if (
          last.current === left &&
          doc.activeElement !== left &&
          isAvailable(left)
        )
          last.current = null
      })
    }
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    return () => {
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
    }
  })
}
