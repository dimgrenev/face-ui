/**
 * @face-ui/core — State Machine Runtime
 *
 * Framework-agnostic finite state machine.
 * ~330 LOC, zero dependencies.
 *
 * Features:
 * - Typed states, events, context via Schema generic
 * - Entry/exit actions per state
 * - Guards on transitions
 * - Effects (side-effects with cleanup, like useEffect)
 * - Computed values (derived from context)
 * - Watch (react to context changes)
 * - Subscribe for external listeners (React adapter uses this)
 */

import type { MachineSchema, MachineConfig, MachineService, MachineSnapshot, SendFn, ActionFn, EventHandler, TransitionConfig, StateNode } from './types'

// ---------------------------------------------------------------------------
// Guard combinators
// ---------------------------------------------------------------------------

export function and<S extends MachineSchema>(
  ...guards: ((ctx: S['context'], event: S['event']) => boolean)[]
): (ctx: S['context'], event: S['event']) => boolean {
  return (ctx, event) => guards.every((g) => g(ctx, event))
}

export function or<S extends MachineSchema>(
  ...guards: ((ctx: S['context'], event: S['event']) => boolean)[]
): (ctx: S['context'], event: S['event']) => boolean {
  return (ctx, event) => guards.some((g) => g(ctx, event))
}

export function not<S extends MachineSchema>(
  guard: (ctx: S['context'], event: S['event']) => boolean,
): (ctx: S['context'], event: S['event']) => boolean {
  return (ctx, event) => !guard(ctx, event)
}

// ---------------------------------------------------------------------------
// createMachine — returns a config object (not a running service)
// ---------------------------------------------------------------------------

export function createMachine<S extends MachineSchema>(
  config: MachineConfig<S>,
): MachineConfig<S> {
  return config
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function areContextValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime()
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false
    for (let index = 0; index < left.length; index += 1) {
      if (!areContextValuesEqual(left[index], right[index])) return false
    }
    return true
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    for (const key of leftKeys) {
      if (!(key in right)) return false
      if (!areContextValuesEqual(left[key], right[key])) return false
    }
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// interpret — starts a machine, returns a running service
// ---------------------------------------------------------------------------

export function interpret<S extends MachineSchema>(
  config: MachineConfig<S>,
  overrides?: Partial<S['context']>,
): MachineService<S> {
  // -- Mutable state ---------------------------------------------------------
  let currentState = config.initial as S['state']
  let ctx = { ...config.context, ...overrides } as S['context']
  let running = false
  const listeners = new Set<(snap: MachineSnapshot<S>) => void>()
  let effectCleanups: (() => void)[] = []
  let cachedSnapshot: MachineSnapshot<S> | null = null

  // -- Helpers ---------------------------------------------------------------

  const matches = (...states: S['state'][]): boolean =>
    states.includes(currentState)

  const hasTag = (tag: string): boolean => {
    const node = config.states[currentState] as StateNode<S> | undefined
    return node?.tags?.includes(tag) ?? false
  }

  const computeAll = (): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    if (config.computed) {
      for (const [key, fn] of Object.entries(config.computed)) {
        result[key] = fn(ctx, { matches, hasTag })
      }
    }
    return result
  }

  const buildSnapshot = (): MachineSnapshot<S> => {
    const node = config.states[currentState] as StateNode<S> | undefined
    return {
      value: currentState,
      context: ctx,
      tags: new Set(node?.tags ?? []),
      computed: computeAll(),
      matches,
      hasTag,
    }
  }

  /** Invalidate cached snapshot — next getSnapshot() will rebuild. */
  const invalidateSnapshot = () => {
    cachedSnapshot = buildSnapshot()
  }

  const notify = () => {
    invalidateSnapshot()
    for (const listener of listeners) {
      listener(cachedSnapshot!)
    }
  }

  const resolveAction = (
    nameOrFn: string | ActionFn<S>,
  ): ActionFn<S> | undefined => {
    if (typeof nameOrFn === 'function') return nameOrFn
    return config.implementations?.actions?.[nameOrFn] as ActionFn<S> | undefined
  }

  const runActions = (
    actions: (string | ActionFn<S>)[] | undefined,
    event: S['event'],
  ) => {
    if (!actions) return
    for (const a of actions) {
      const fn = resolveAction(a)
      fn?.(ctx, event)
    }
  }

  const cleanupEffects = () => {
    for (const cleanup of effectCleanups) {
      cleanup()
    }
    effectCleanups = []
  }

  const runEffects = () => {
    const node = config.states[currentState] as StateNode<S> | undefined
    if (!node?.effects) return
    for (const name of node.effects) {
      const effectFn = config.implementations?.effects?.[name]
      if (effectFn) {
        const cleanup = effectFn(ctx, send)
        if (typeof cleanup === 'function') {
          effectCleanups.push(cleanup)
        }
      }
    }
  }

  const runWatch = (prevCtx: Record<string, unknown>) => {
    if (!config.watch) return
    for (const [key, watchFn] of Object.entries(config.watch)) {
      if (watchFn && (ctx as Record<string, unknown>)[key] !== prevCtx[key]) {
        watchFn(ctx, prevCtx[key])
      }
    }
  }

  const transition = (event: S['event']): boolean => {
    const stateNode = config.states[currentState] as StateNode<S> | undefined
    if (!stateNode?.on) return false

    const handler = stateNode.on[event.type as S['event']['type']] as
      | EventHandler<S>
      | undefined
    if (handler == null) return false

    // Resolve handler to a single transition config
    let resolved: TransitionConfig<S> | undefined

    if (typeof handler === 'string') {
      // Simple target: 'otherState'
      resolved = { target: handler as S['state'] }
    } else if (Array.isArray(handler)) {
      // Array of guarded transitions — pick first matching
      for (const t of handler) {
        if (!t.guard || t.guard(ctx, event)) {
          resolved = t
          break
        }
      }
    } else if ('actions' in handler && !('target' in handler) && !('guard' in handler)) {
      // Action-only: { actions: [...] }
      const actionOnly = handler as { actions: (string | ActionFn<S>)[] }
      resolved = { actions: actionOnly.actions as ActionFn<S>[] }
    } else {
      // Single transition config
      const single = handler as TransitionConfig<S>
      if (!single.guard || single.guard(ctx, event)) {
        resolved = single
      }
    }

    if (!resolved) return false

    const prevCtx = { ...ctx } as Record<string, unknown>
    const prevState = currentState

    // Run actions (before state change if no target, or as part of transition)
    if (resolved.actions) {
      runActions(resolved.actions as (string | ActionFn<S>)[], event)
    }

    // State change
    if (resolved.target && resolved.target !== currentState) {
      // Exit current state
      cleanupEffects()
      const exitNode = config.states[prevState] as StateNode<S> | undefined
      runActions(exitNode?.exit as (string | ActionFn<S>)[] | undefined, event)

      // Enter new state
      currentState = resolved.target
      const enterNode = config.states[currentState] as StateNode<S> | undefined
      runActions(enterNode?.entry as (string | ActionFn<S>)[] | undefined, event)

      // Start effects of new state
      runEffects()
    }

    // Watch for context changes
    runWatch(prevCtx)

    // Notify subscribers
    notify()

    return true
  }

  const syncContext = (patch: Partial<S['context']>) => {
    if (!running) return
    const prevCtx = { ...ctx } as Record<string, unknown>
    let changed = false
    let shouldNotify = false

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue
      const currentValue = (ctx as Record<string, unknown>)[key]
      if (areContextValuesEqual(currentValue, value)) continue
      ;(ctx as Record<string, unknown>)[key] = value
      changed = true
      if (typeof currentValue !== 'function' || typeof value !== 'function') {
        shouldNotify = true
      }
    }

    if (!changed) return
    if (!shouldNotify) return
    runWatch(prevCtx)
    notify()
  }

  // -- Public API ------------------------------------------------------------

  const send: SendFn<S> = (event) => {
    if (!running) return
    const normalized: S['event'] =
      typeof event === 'string' ? ({ type: event } as S['event']) : event
    transition(normalized)
  }

  const service: MachineService<S> = {
    send,
    syncContext,

    getSnapshot: () => {
      if (!cachedSnapshot) cachedSnapshot = buildSnapshot()
      return cachedSnapshot
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    start: () => {
      if (running) return service
      running = true

      // Run entry actions of initial state
      const initialNode = config.states[currentState] as StateNode<S> | undefined
      const dummyEvent = { type: '__init__' } as S['event']
      runActions(initialNode?.entry as (string | ActionFn<S>)[] | undefined, dummyEvent)

      // Start effects of initial state
      runEffects()

      // Initial notification
      notify()

      return service
    },

    stop: () => {
      running = false
      cleanupEffects()
      listeners.clear()
    },
  }

  return service
}
