/**
 * React adapter — useMachine hook
 *
 * Connects a Face UI state machine to React via useSyncExternalStore.
 * Second argument is flat Partial<TSchema['context']> — no wrapping.
 */

import { useSyncExternalStore, useRef } from 'react'
import { interpret, areContextValuesEqual } from '../../create-machine'
import type {
  MachineSchema,
  MachineConfig,
  MachineSnapshot,
  SendFn,
} from '../../types'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

export type UseMachineOptions<S extends MachineSchema> = Partial<S['context']>

export interface UseMachineReturn<S extends MachineSchema> {
  state: MachineSnapshot<S>
  send: SendFn<S>
  /** Restore external state without emitting user-change callbacks. */
  syncContext: (patch: Partial<S['context']>) => void
}

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

  // The machine runs while its content is committed and visible. React replays
  // this layout effect on StrictMode's simulated remount and when a Suspense
  // boundary hides and reveals the content; the same service survives, and the
  // next start() resumes it in its current state. The subscription below is a
  // separate, passive lifecycle owned by useSyncExternalStore: Suspense keeps
  // it while hidden, so stop() never drops subscribers.
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

  // The service's methods are stable for its lifetime.
  const state = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  )

  return { state, send: service.send, syncContext: service.syncContext }
}
