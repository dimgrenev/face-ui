/**
 * @face-ui/core — Progress Machine
 *
 * Pure-computed FSM for progress indicators (linear, circular, etc.).
 * Single state (idle) — all interesting values are derived via computed.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const progressAnatomy = createAnatomy('progress').parts(
  'root',
  'track',
  'indicator',
  'label',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface ProgressSchema extends MachineSchema {
  context: {
    value: number
    max: number
    indeterminate: boolean
    onValueChange: ((details: { value: number; percent: number }) => void) | null
  }
  state: 'idle'
  event:
    | { type: 'SET_VALUE'; value: number }
    | { type: 'SET_MAX'; max: number }
    | { type: 'SET_INDETERMINATE'; indeterminate: boolean }
}

function normalizeMax(max: number): number {
  return Number.isFinite(max) && max > 0 ? max : 1
}

function normalizeValue(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), normalizeMax(max))
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const progressMachine = createMachine<ProgressSchema>({
  id: 'progress',
  initial: 'idle',

  context: {
    value: 0,
    max: 100,
    indeterminate: false,
    onValueChange: null,
  },

  states: {
    idle: {
      on: {
        SET_VALUE: {
          actions: [
            (ctx, event) => {
              const e = event as ProgressSchema['event'] & { type: 'SET_VALUE' }
              ctx.value = normalizeValue(e.value, ctx.max)
            },
          ],
        },
        SET_MAX: {
          actions: [
            (ctx, event) => {
              const e = event as ProgressSchema['event'] & { type: 'SET_MAX' }
              ctx.max = normalizeMax(e.max)
              ctx.value = normalizeValue(ctx.value, ctx.max)
            },
          ],
        },
        SET_INDETERMINATE: {
          actions: [
            (ctx, event) => {
              const e = event as ProgressSchema['event'] & { type: 'SET_INDETERMINATE' }
              ctx.indeterminate = e.indeterminate
            },
          ],
        },
      },
    },
  },

  computed: {
    normalizedMax: (ctx) => normalizeMax(ctx.max),
    normalizedValue: (ctx) => normalizeValue(ctx.value, ctx.max),
    percent: (ctx) => ctx.indeterminate
      ? 0
      : (normalizeValue(ctx.value, ctx.max) / normalizeMax(ctx.max)) * 100,
    isIndeterminate: (ctx) => ctx.indeterminate,
    isComplete: (ctx) => !ctx.indeterminate && normalizeValue(ctx.value, ctx.max) >= normalizeMax(ctx.max),
  },

  watch: {
    value: (ctx) => {
      if (ctx.indeterminate) return
      const value = normalizeValue(ctx.value, ctx.max)
      const percent = (value / normalizeMax(ctx.max)) * 100
      ctx.onValueChange?.({ value, percent })
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

interface ProgressProps {
  'data-scope': string
  'data-part': string
  'data-state'?: string
  role?: string
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuetext'?: string
  'aria-label'?: string
  style?: Record<string, string>
  children?: string
}

export function connectProgress(
  state: { context: ProgressSchema['context']; computed: Record<string, unknown> },
  send: (event: ProgressSchema['event']) => void,
) {
  const { context: ctx, computed } = state
  const percent = computed['percent'] as number
  const isIndeterminate = computed['isIndeterminate'] as boolean
  const normalizedValue = computed['normalizedValue'] as number
  const normalizedMax = computed['normalizedMax'] as number
  const dataState = isIndeterminate
    ? 'indeterminate'
    : (computed['isComplete'] as boolean)
      ? 'complete'
      : 'loading'

  return {
    getRootProps(): ProgressProps {
      return {
        ...progressAnatomy.getPartAttrs('root'),
        role: 'progressbar',
        'aria-valuenow': isIndeterminate ? undefined : normalizedValue,
        'aria-valuemin': 0,
        'aria-valuemax': normalizedMax,
        'aria-valuetext': isIndeterminate
          ? undefined
          : `${Math.round(percent)}%`,
        'data-state': dataState,
      }
    },

    getTrackProps(): ProgressProps {
      return {
        ...progressAnatomy.getPartAttrs('track'),
        'data-state': dataState,
      }
    },

    getIndicatorProps(): ProgressProps {
      return {
        ...progressAnatomy.getPartAttrs('indicator'),
        'data-state': dataState,
        style: {
          width: isIndeterminate ? 'var(--progress-indeterminate-width, 50%)' : `${percent}%`,
        },
      }
    },

    getLabelProps(): ProgressProps {
      return {
        ...progressAnatomy.getPartAttrs('label'),
        'data-state': dataState,
      }
    },

    /** Imperative helpers */
    setValue(value: number) {
      send({ type: 'SET_VALUE', value })
    },
    setMax(max: number) {
      send({ type: 'SET_MAX', max })
    },
    setIndeterminate(indeterminate: boolean) {
      send({ type: 'SET_INDETERMINATE', indeterminate })
    },

    /** Computed accessors */
    percent,
    isIndeterminate,
    isComplete: computed['isComplete'] as boolean,
  }
}
