/**
 * React adapter — useMachine hook
 *
 * Connects a @face-ui/core machine to React via useSyncExternalStore.
 * Second argument is flat Partial<TSchema['context']> — no wrapping.
 */

import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react'
import { interpret, areContextValuesEqual } from '../../create-machine'
import type {
  MachineSchema,
  MachineConfig,
  MachineSnapshot,
  SendFn,
} from '../../types'

export type UseMachineOptions<S extends MachineSchema> = Partial<S['context']>

export interface UseMachineReturn<S extends MachineSchema> {
  state: MachineSnapshot<S>
  send: SendFn<S>
  /** Restore external state without emitting user-change callbacks. */
  syncContext: (patch: Partial<S['context']>) => void
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useMachine<S extends MachineSchema>(
  config: MachineConfig<S>,
  options?: UseMachineOptions<S>,
): UseMachineReturn<S> {
  const serviceRef = useRef<ReturnType<typeof interpret<S>> | null>(null)
  const optionsRef = useRef(options)
  const callbacksRef = useRef<Record<string, (...args: unknown[]) => unknown>>(
    {},
  )
  const resolvedOptions = { ...options } as UseMachineOptions<S>
  for (const [key, value] of Object.entries(options ?? {})) {
    if (typeof value !== 'function' && !callbacksRef.current[key]) continue
    callbacksRef.current[key] ??= (...args) => {
      const callback = (
        optionsRef.current as Record<string, unknown> | undefined
      )?.[key]
      return typeof callback === 'function' ? callback(...args) : undefined
    }
    ;(resolvedOptions as Record<string, unknown>)[key] =
      callbacksRef.current[key]
  }

  // Create service once
  if (serviceRef.current === null) {
    serviceRef.current = interpret(config, resolvedOptions)
  }

  const service = serviceRef.current

  useIsomorphicLayoutEffect(() => {
    optionsRef.current = options
  })

  // Effects belong to the committed tree. Keep the same service across React's
  // setup/cleanup replay so event handlers and subscriptions remain connected.
  useIsomorphicLayoutEffect(() => {
    service.start()
    return () => {
      service.stop()
    }
  }, [service])

  // Controlled context must be restored before paint. A passive effect leaves a
  // visible frame where an optimistic machine value can flash in the UI.
  useIsomorphicLayoutEffect(() => {
    const svc = service
    const current = svc.getSnapshot().context as Record<string, unknown>
    const patch: Partial<S['context']> = {}
    let hasPatch = false

    for (const [key, value] of Object.entries(resolvedOptions)) {
      if (value === undefined) continue
      if (areContextValuesEqual(current[key], value)) continue
      ;(patch as Record<string, unknown>)[key] = value
      hasPatch = true
    }

    if (!hasPatch) return
    svc.syncContext(patch)
  })

  // Subscribe via useSyncExternalStore
  const subscribe = useMemo(
    () => (cb: () => void) => service.subscribe(cb),
    [service],
  )
  const getSnapshot = useMemo(() => () => service.getSnapshot(), [service])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return { state, send: service.send, syncContext: service.syncContext }
}
