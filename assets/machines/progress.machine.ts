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
    onValueChange: ((details: { value: number; percent: number }) => void) | null
  }
  state: 'idle'
  event:
    | { type: 'SET_VALUE'; value: number }
    | { type: 'SET_MAX'; max: number }
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
    onValueChange: null,
  },

  states: {
    idle: {
      on: {
        SET_VALUE: {
          actions: [
            (ctx, event) => {
              const e = event as ProgressSchema['event'] & { type: 'SET_VALUE' }
              ctx.value = e.value
            },
          ],
        },
        SET_MAX: {
          actions: [
            (ctx, event) => {
              const e = event as ProgressSchema['event'] & { type: 'SET_MAX' }
              ctx.max = Math.max(e.max, 0)
            },
          ],
        },
      },
    },
  },

  computed: {
    percent: (ctx) => {
      if (ctx.value < 0) return 0
      const clamped = Math.min(Math.max(ctx.value / ctx.max, 0), 1)
      return clamped * 100
    },
    isIndeterminate: (ctx) => ctx.value < 0,
    isComplete: (ctx) => ctx.value >= ctx.max,
  },

  watch: {
    value: (ctx) => {
      const percent = Math.min(Math.max(ctx.value / ctx.max, 0), 1) * 100
      ctx.onValueChange?.({ value: ctx.value, percent })
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
        'aria-valuenow': isIndeterminate ? undefined : ctx.value,
        'aria-valuemin': 0,
        'aria-valuemax': ctx.max,
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

    /** Computed accessors */
    percent,
    isIndeterminate,
    isComplete: computed['isComplete'] as boolean,
  }
}
