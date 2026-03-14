// @face-ui/core — main barrel export

// Runtime
export { createMachine, interpret } from './create-machine'

// Types
export type { MachineSchema, MachineConfig, MachineService, MachineSnapshot, SendFn, SubscribeFn, ActionFn, GuardFn, EffectFn, WatchFn, ComputedFn, ComputedHelpers, TransitionConfig, EventHandler, StateNode } from './types'

// Shared types
export type { ControlProps, LayoutProps, LabelProps, IconProps, ListStateProps, ValueProps, OpenProps, CheckedProps } from './shared-types'

// Anatomy
export { createAnatomy } from './anatomy'
export type { Anatomy } from './anatomy'

// Collection
export { ListCollection, createTypeahead } from './collection'

// Machines
export * from '../machines'

// React adapter
export { useMachine } from '../adapters/react/use-machine'
export type { UseMachineOptions, UseMachineReturn } from '../adapters/react/use-machine'
export { normalizeProps } from '../adapters/react/normalize-props'
export { mergeProps } from '../adapters/react/merge-props'
