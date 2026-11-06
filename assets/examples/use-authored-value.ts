import { useState } from 'react'

/** Keep a controlled example's input separate from its current user selection.
 * Omission delegates to the component's own uncontrolled/default/reset owner.
 * A runtime Reset remount reads the current authored input again.
 */
export function useAuthoredValue<T>(input: T | undefined, equal: (left: T | undefined, right: T | undefined) => boolean = Object.is) {
  const [state, setState] = useState(() => ({ input, value: input }))
  const changed = !equal(state.input, input)
  // Adjust this component before rendering its child, without an obsolete commit.
  if (changed) setState({ input, value: input })
  const value = input === undefined ? undefined : changed ? input : state.value
  const update = (next: T) => {
    if (input !== undefined) setState(current => ({ ...current, value: next }))
  }
  return [value, update] as const
}
