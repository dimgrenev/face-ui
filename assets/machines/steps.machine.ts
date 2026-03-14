/**
 * @face-ui/core — Steps Machine
 *
 * Framework-agnostic FSM for step-by-step / wizard navigation.
 * Supports linear (no skipping) and non-linear modes, step completion tracking,
 * and progress percentage computation.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineConfig, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const stepsAnatomy = createAnatomy('steps').parts(
  'root',
  'item',
  'trigger',
  'content',
  'indicator',
  'separator',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface StepsContext {
  [key: string]: unknown
  step: number
  total: number
  completed: number[]
  linear: boolean
  disabled: boolean
  onStepChange: ((details: { step: number }) => void) | null
}

type StepsState = 'idle'

type StepsEvent =
  | { type: 'SET_STEP'; step: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'COMPLETE'; step: number }

export interface StepsSchema extends MachineSchema {
  context: StepsContext
  state: StepsState
  event: StepsEvent
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampStep(step: number, total: number): number {
  return Math.max(0, Math.min(step, total - 1))
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: StepsContext): boolean => !ctx.disabled

const canSetStep = (ctx: StepsContext, event: StepsEvent): boolean => {
  if (ctx.disabled) return false
  const e = event as { type: 'SET_STEP'; step: number }
  const target = e.step

  if (!ctx.linear) return true

  // In linear mode, can only move to adjacent steps or completed steps
  // Can go back freely, but can only go forward one step at a time
  // or to a previously completed step
  if (target <= ctx.step) return true
  if (target === ctx.step + 1) return true
  return ctx.completed.includes(target)
}

const canGoNext = (ctx: StepsContext): boolean => {
  if (ctx.disabled) return false
  return ctx.step < ctx.total - 1
}

const canGoPrev = (ctx: StepsContext): boolean => {
  if (ctx.disabled) return false
  return ctx.step > 0
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const setStep = (ctx: StepsContext, event: StepsEvent): void => {
  const e = event as { type: 'SET_STEP'; step: number }
  ctx.step = clampStep(e.step, ctx.total)
}

const goNext = (ctx: StepsContext): void => {
  ctx.step = clampStep(ctx.step + 1, ctx.total)
}

const goPrev = (ctx: StepsContext): void => {
  ctx.step = clampStep(ctx.step - 1, ctx.total)
}

const completeStep = (ctx: StepsContext, event: StepsEvent): void => {
  const e = event as { type: 'COMPLETE'; step: number }
  const stepIndex = e.step
  if (!ctx.completed.includes(stepIndex)) {
    ctx.completed = [...ctx.completed, stepIndex]
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const stepsMachine: MachineConfig<StepsSchema> = createMachine<StepsSchema>({
  id: 'steps',
  initial: 'idle',
  context: {
    step: 0,
    total: 0,
    completed: [],
    linear: true,
    disabled: false,
    onStepChange: null,
  },

  computed: {
    isFirst: (ctx: StepsContext) => ctx.step === 0,
    isLast: (ctx: StepsContext) => ctx.step === ctx.total - 1,
    canGoNext: (ctx: StepsContext) => ctx.step < ctx.total - 1,
    canGoPrev: (ctx: StepsContext) => ctx.step > 0,
    progress: (ctx: StepsContext) =>
      ctx.total > 0 ? Math.round((ctx.completed.length / ctx.total) * 100) : 0,
  },

  watch: {
    step: (ctx: StepsContext) => {
      ctx.onStepChange?.({ step: ctx.step })
    },
  },

  states: {
    idle: {
      on: {
        SET_STEP: [
          {
            guard: canSetStep,
            actions: [setStep],
          },
        ],
        NEXT: {
          guard: canGoNext,
          actions: [goNext],
        },
        PREV: {
          guard: canGoPrev,
          actions: [goPrev],
        },
        COMPLETE: {
          guard: isNotDisabled,
          actions: [completeStep],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

export function connectSteps(state: MachineSnapshot<StepsSchema>, send: SendFn<StepsSchema>) {
  const ctx = state.context
  const computed = state.computed
  const attrs = stepsAnatomy.getPartAttrs

  const isFirst = computed.isFirst as boolean
  const isLast = computed.isLast as boolean
  const canNext = computed.canGoNext as boolean
  const canPrev = computed.canGoPrev as boolean
  const progress = computed.progress as number

  function getStepState(index: number): 'active' | 'completed' | 'upcoming' {
    if (index === ctx.step) return 'active'
    if (index < ctx.step) return 'completed'
    if (ctx.completed.includes(index)) return 'completed'
    return 'upcoming'
  }

  return {
    /** Current step index (0-based) */
    step: ctx.step,
    /** Whether current step is the first */
    isFirst,
    /** Whether current step is the last */
    isLast,
    /** Whether the user can navigate forward */
    canGoNext: canNext,
    /** Whether the user can navigate backward */
    canGoPrev: canPrev,
    /** Completion progress as a percentage (0-100) */
    progress,
    /** Set of completed step indices */
    completed: ctx.completed,

    getRootProps() {
      return {
        ...attrs('root'),
        'data-orientation': 'horizontal',
        'data-disabled': ctx.disabled ? '' : undefined,
        'aria-label': 'Steps',
      }
    },

    getItemProps(index: number) {
      const stepState = getStepState(index)
      return {
        ...attrs('item'),
        'data-state': stepState,
        'data-index': index,
        'data-disabled': ctx.disabled ? '' : undefined,
      }
    },

    getTriggerProps(index: number) {
      const stepState = getStepState(index)
      const isDisabled = ctx.disabled || (ctx.linear && index > ctx.step + 1 && !ctx.completed.includes(index))

      return {
        ...attrs('trigger'),
        role: 'button' as const,
        type: 'button' as const,
        'aria-current': index === ctx.step ? ('step' as const) : undefined,
        'data-state': stepState,
        'data-index': index,
        'data-disabled': isDisabled ? '' : undefined,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SET_STEP', step: index })
          }
        },
      }
    },

    getContentProps(index: number) {
      const isCurrent = ctx.step === index
      return {
        ...attrs('content'),
        'data-state': getStepState(index),
        'data-index': index,
        hidden: !isCurrent,
      }
    },

    getIndicatorProps(index: number) {
      const stepState = getStepState(index)
      return {
        ...attrs('indicator'),
        'data-state': stepState,
        'data-index': index,
      }
    },

    getSeparatorProps(index: number) {
      // Separator between step[index] and step[index+1]
      const isCompleted = index < ctx.step || ctx.completed.includes(index)
      return {
        ...attrs('separator'),
        'data-state': isCompleted ? 'completed' : 'incomplete',
        'data-index': index,
        'aria-hidden': true as const,
      }
    },
  }
}
