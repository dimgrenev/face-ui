import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * A stable function that calls the latest committed `fn` (before any layout effect of the commit
 * runs); call it from events and effects, never during render.
 */
export function useEventCallback<A extends unknown[], R>(
  fn: ((...args: A) => R) | undefined,
): (...args: A) => R | undefined {
  const latest = useRef(fn)
  useInsertionEffect(() => {
    latest.current = fn
  })
  return useCallback((...args: A) => latest.current?.(...args), [])
}
