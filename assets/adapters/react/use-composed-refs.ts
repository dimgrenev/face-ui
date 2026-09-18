import { useMemo, type Ref } from 'react'

/** Keep one ref lifecycle for both callback refs (including cleanup) and objects. */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return useMemo(() => {
    let cleanups: Array<() => void> = []
    return (node: T | null) => {
      for (const cleanup of cleanups) cleanup()
      cleanups = []
      if (node === null) return
      for (const ref of refs) {
        if (typeof ref === 'function') {
          const cleanup = ref(node) as unknown
          cleanups.push(
            typeof cleanup === 'function'
              ? (cleanup as () => void)
              : () => ref(null),
          )
        } else if (ref) {
          const object = ref as { current: T | null }
          object.current = node
          cleanups.push(() => {
            object.current = null
          })
        }
      }
      // Returning void keeps React 18 and 19 on the same detach path. A consumer
      // callback's cleanup replaces its null call, as it does in React 19.
    }
  }, refs)
}
