import { useEffect, useRef, type RefObject } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

/** Reset after the browser's default action; a prevented reset changes nothing. */
export function useFormReset(
  ref: RefObject<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  >,
  reset: () => void,
) {
  const latest = useRef(reset)
  useIsomorphicLayoutEffect(() => {
    latest.current = reset
  })
  useEffect(() => {
    const input = ref.current
    const form = input?.form
    if (!form) return
    // Some browsers run a microtask checkpoint before the reset default action.
    // Use the next task so native controls finish resetting first.
    const onReset = (event: Event) =>
      setTimeout(() => {
        if (
          ref.current === input &&
          input.isConnected &&
          !event.defaultPrevented
        )
          latest.current()
      }, 0)
    form.addEventListener('reset', onReset)
    return () => {
      form.removeEventListener('reset', onReset)
    }
  })
}
