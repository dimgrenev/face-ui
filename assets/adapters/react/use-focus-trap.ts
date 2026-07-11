import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

/**
 * Keeps keyboard focus within `containerRef` while `active` is true — Tab from
 * the last focusable wraps to the first and Shift+Tab from the first wraps to
 * the last. Mirrors the Modal machine's focus-trap so modal overlay surfaces
 * (e.g. Command's dialog palette) share the same behavior. No-op when inactive.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        try { container.focus() } catch {}
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeEl = document.activeElement
      const inside = activeEl instanceof HTMLElement && container.contains(activeEl)
      if (event.shiftKey) {
        if (!inside || activeEl === first) {
          event.preventDefault()
          try { last.focus() } catch {}
        }
      } else if (!inside || activeEl === last) {
        event.preventDefault()
        try { first.focus() } catch {}
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [active, containerRef])
}
