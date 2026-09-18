import { useCallback, useInsertionEffect, useRef, useState } from 'react'
import { invalidProp } from '../../runtime/props'
import { useEventCallback } from './use-event-callback'

const sameValue = (a: unknown, b: unknown) =>
  Object.is(a, b) ||
  (Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((item, index) => Object.is(item, b[index])))

export interface ControllableStateOptions<T> {
  /** Controlled value; `undefined` means uncontrolled, `null` is a value. */
  value: T | undefined
  /** Uncontrolled starting value, read once on mount. */
  defaultValue: T | (() => T)
  /**
   * Called once per user proposal that differs from the current value, with a fresh copy of arrays;
   * never for prop sync, form reset, normalization or removal recovery, never inside a state updater.
   */
  onChange?: (value: T) => void
  /** Decides which proposals are no-ops; defaults to `Object.is`, element-wise for arrays. */
  equal?: (a: T, b: T) => boolean
  /** `[component, prop]` named in the development report when the component switches modes. */
  name: readonly [component: string, prop: string]
}

/**
 * State owned by the parent while `value` is defined and by the component otherwise.
 * `setValue` proposes a user change; `replaceValue` silently sets the uncontrolled value (omitted:
 * the mount default) and does nothing while controlled.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  equal = sameValue,
  name: [component, prop],
}: ControllableStateOptions<T>): readonly [
  value: T,
  setValue: (next: T | ((current: T) => T)) => void,
  replaceValue: (next?: T) => void,
] {
  const [initial] = useState(defaultValue)
  const [internal, setInternal] = useState(() => initial)
  const controlled = value !== undefined
  // Remember the last accepted controlled value so that releasing control keeps it.
  if (controlled && !equal(value, internal)) setInternal(() => value)
  const current = controlled ? value : internal
  // Handlers read the last commit plus the proposals made since it: several proposals in one
  // handler chain like state updaters, while a refused one (no commit follows) is dropped after
  // the handler, so the next proposal starts from what the parent actually shows.
  const committed = useRef({ value: current, controlled, equal })
  const queued = useRef<{ value: T } | null>(null)
  useInsertionEffect(() => {
    if (committed.current.controlled !== controlled)
      invalidProp(
        component,
        prop,
        value,
        controlled
          ? 'switching from uncontrolled to controlled'
          : 'keeping the last controlled value',
      )
    committed.current = { value: current, controlled, equal }
    if (controlled || (queued.current && equal(current, queued.current.value)))
      queued.current = null
  })
  const report = useEventCallback(onChange)
  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const { controlled, equal } = committed.current
      const base = (queued.current ?? committed.current).value
      const value =
        typeof next === 'function' ? (next as (current: T) => T)(base) : next
      if (equal(value, base)) return
      const proposal = (queued.current = { value })
      if (controlled)
        queueMicrotask(() => {
          if (queued.current === proposal) queued.current = null
        })
      else setInternal(() => value)
      report(Array.isArray(value) ? ([...value] as T) : value)
    },
    [report],
  )
  const replaceValue = useCallback(
    (next?: T) => {
      if (committed.current.controlled) return
      const value = next === undefined ? initial : next
      queued.current = { value }
      setInternal(() => value)
    },
    [initial],
  )
  return [current, setValue, replaceValue] as const
}
