import { useEffect, useState, type DependencyList, type RefObject } from 'react'

const userScrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll'

/**
 * Whether the user can scroll the element: its content overflows along an axis whose
 * overflow is `auto` or `scroll`. Measured again when the element or its first child
 * resizes, and after a commit that changes `deps`; always false without ResizeObserver.
 */
export function useScrollable(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList,
): boolean {
  const [scrollable, setScrollable] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') {
      setScrollable(false)
      return
    }
    const observer = new ResizeObserver(() => {
      const { overflowX, overflowY } = getComputedStyle(node)
      setScrollable(
        (userScrolls(overflowX) && node.scrollWidth > node.clientWidth) ||
          (userScrolls(overflowY) && node.scrollHeight > node.clientHeight),
      )
    })
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, deps)
  return scrollable
}
