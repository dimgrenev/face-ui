/**
 * @face-ui/core — Machine Types
 *
 * Framework-agnostic state machine type system.
 * Defines the shape of machines, states, events, actions, guards, effects, and computed values.
 */

// ---------------------------------------------------------------------------
// Schema — the generic constraint for all machines
// ---------------------------------------------------------------------------

export interface MachineSchema {
  context: Record<string, unknown>
  state: string
  event: { type: string }
}

// ---------------------------------------------------------------------------
// Config — how a machine is defined
// ---------------------------------------------------------------------------

export type ActionFn<S extends MachineSchema> = (
  ctx: S['context'],
  event: S['event'],
) => void

export type GuardFn<S extends MachineSchema> = (
  ctx: S['context'],
  event: S['event'],
) => boolean

export type EffectFn<S extends MachineSchema> = (
  ctx: S['context'],
  send: SendFn<S>,
) => (() => void) | void

export type WatchFn<S extends MachineSchema> = (
  ctx: S['context'],
  prevValue: unknown,
) => void

export type ComputedHelpers<S extends MachineSchema> = {
  matches: (...states: S['state'][]) => boolean
  hasTag: (tag: string) => boolean
}

export type ComputedFn<S extends MachineSchema> = (
  ctx: S['context'],
  helpers: ComputedHelpers<S>,
) => unknown

export interface TransitionConfig<S extends MachineSchema> {
  target?: S['state']
  actions?: (keyof NonNullable<MachineConfig<S>['implementations']>['actions'])[] | ActionFn<S>[]
  guard?: GuardFn<S>
}

export type EventHandler<S extends MachineSchema> =
  | S['state']
  | TransitionConfig<S>
  | TransitionConfig<S>[]
  | { actions: (string | ActionFn<S>)[] }

export interface StateNode<S extends MachineSchema> {
  tags?: string[]
  entry?: (string | ActionFn<S>)[]
  exit?: (string | ActionFn<S>)[]
  effects?: string[]
  on?: Partial<Record<S['event']['type'], EventHandler<S>>>
}

export interface MachineConfig<S extends MachineSchema> {
  id: string
  initial: S['state']
  context: S['context']
  states: Record<S['state'], StateNode<S>>
  computed?: Record<string, ComputedFn<S>>
  watch?: Partial<Record<keyof S['context'], WatchFn<S>>>
  implementations?: {
    actions?: Record<string, ActionFn<S>>
    effects?: Record<string, EffectFn<S>>
  }
}

// ---------------------------------------------------------------------------
// Service — the runtime instance of a machine
// ---------------------------------------------------------------------------

export interface MachineSnapshot<S extends MachineSchema> {
  value: S['state']
  context: S['context']
  tags: Set<string>
  computed: Record<string, unknown>
  matches: (...states: S['state'][]) => boolean
  hasTag: (tag: string) => boolean
}

export type SendFn<S extends MachineSchema> = (
  event: S['event'] | S['event']['type'],
) => void

export type SubscribeFn<S extends MachineSchema> = (
  snapshot: MachineSnapshot<S>,
) => void

export interface MachineService<S extends MachineSchema> {
  send: SendFn<S>
  syncContext: (patch: Partial<S['context']>) => void
  getSnapshot: () => MachineSnapshot<S>
  subscribe: (listener: SubscribeFn<S>) => () => void
  start: () => MachineService<S>
  stop: () => void
}
