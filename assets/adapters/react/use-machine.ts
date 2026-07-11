/**
 * React adapter — useMachine hook
 *
 * Connects a @face-ui/core machine to React via useSyncExternalStore.
 * Second argument is flat Partial<TSchema['context']> — no wrapping.
 */

import { useSyncExternalStore, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { interpret, areContextValuesEqual } from '../../create-machine'
import type { MachineSchema, MachineConfig, MachineSnapshot, SendFn } from '../../types'

export type UseMachineOptions<S extends MachineSchema> = Partial<S['context']>

export interface UseMachineReturn<S extends MachineSchema> {
  state: MachineSnapshot<S>
  send: SendFn<S>
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useMachine<S extends MachineSchema>(
  config: MachineConfig<S>,
  options?: UseMachineOptions<S>,
): UseMachineReturn<S> {
  const serviceRef = useRef<ReturnType<typeof interpret<S>> | null>(null)

  // Create service once
  if (serviceRef.current === null) {
    serviceRef.current = interpret(config, options)
    serviceRef.current.start()
  }

  const service = serviceRef.current

  // Controlled context must be restored before paint. A passive effect leaves a
  // visible frame where an optimistic machine value can flash in the UI.
  useIsomorphicLayoutEffect(() => {
    if (!options || !serviceRef.current) return
    const svc = serviceRef.current
    const current = svc.getSnapshot().context as Record<string, unknown>
    const patch: Partial<S['context']> = {}
    let hasPatch = false

    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) continue
      if (areContextValuesEqual(current[key], value)) continue
      ;(patch as Record<string, unknown>)[key] = value
      hasPatch = true
    }

    if (!hasPatch) return
    svc.syncContext(patch)
  }, [options, service])

  // Subscribe via useSyncExternalStore
  const subscribe = useMemo(
    () => (cb: () => void) => service.subscribe(cb),
    [service],
  )
  const getSnapshot = useMemo(
    () => () => service.getSnapshot(),
    [service],
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      serviceRef.current?.stop()
      serviceRef.current = null
    }
  }, [])

  return { state, send: service.send }
}
