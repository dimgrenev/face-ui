/**
 * Switcher Machine (NOT "switch")
 *
 * States: unchecked, checked
 * Binary toggle control with thumb animation support.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type {
  MachineSchema,
  MachineSnapshot,
  SendFn,
  StateNode,
} from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const switcherAnatomy = createAnatomy('switcher').parts(
  'root',
  'track',
  'thumb',
  'label',
  'input',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SwitcherSchema extends MachineSchema {
  context: {
    checked: boolean
    disabled: boolean
    required: boolean
    name: string
    value: string
    onCheckedChange?: (details: { checked: boolean }) => void
  }
  state: 'unchecked' | 'checked'
  event: { type: 'TOGGLE' } | { type: 'SET'; checked: boolean }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

// Every state accepts the same events. Decisions use context so external
// controlled updates cannot leave the next toggle tied to an obsolete state.
const checkedState: StateNode<SwitcherSchema> = {
  on: {
    TOGGLE: [
      {
        guard: (ctx) => !ctx.disabled && ctx.checked === true,
        target: 'unchecked',
        actions: [
          (ctx) => {
            ctx.checked = false
          },
        ],
      },
      {
        guard: (ctx) => !ctx.disabled,
        target: 'checked',
        actions: [
          (ctx) => {
            ctx.checked = true
          },
        ],
      },
    ],
    SET: [
      {
        guard: (_ctx, event) => event.type === 'SET' && event.checked === true,
        target: 'checked',
        actions: [
          (ctx) => {
            ctx.checked = true
          },
        ],
      },
      {
        guard: (_ctx, event) => event.type === 'SET' && event.checked === false,
        target: 'unchecked',
        actions: [
          (ctx) => {
            ctx.checked = false
          },
        ],
      },
    ],
  },
}

export const switcherMachine = createMachine<SwitcherSchema>({
  id: 'switcher',
  initial: 'unchecked',
  context: {
    checked: false,
    disabled: false,
    required: false,
    name: '',
    value: 'on',
  },

  watch: {
    checked(ctx) {
      ctx.onCheckedChange?.({ checked: ctx.checked })
    },
  },

  states: {
    unchecked: checkedState,
    checked: checkedState,
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectSwitcher(
  state: MachineSnapshot<SwitcherSchema>,
  send: SendFn<SwitcherSchema>,
) {
  const { checked, disabled, required, name, value } = state.context
  const dataState = checked ? 'checked' : 'unchecked'

  return {
    getRootProps() {
      return {
        ...switcherAnatomy.getPartAttrs('root'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getTrackProps() {
      return {
        ...switcherAnatomy.getPartAttrs('track'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getThumbProps() {
      return {
        ...switcherAnatomy.getPartAttrs('thumb'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getLabelProps() {
      return {
        ...switcherAnatomy.getPartAttrs('label'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getInputProps() {
      return {
        ...switcherAnatomy.getPartAttrs('input'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        type: 'checkbox' as const,
        role: 'switch' as const,
        name,
        value,
        checked,
        disabled,
        required,
        'aria-checked': checked,
        'aria-disabled': disabled || undefined,
        'aria-required': required || undefined,
        tabIndex: disabled ? -1 : 0,
        onChange(event: {
          target: { checked: boolean }
          defaultPrevented?: boolean
          nativeEvent?: { defaultPrevented: boolean }
        }) {
          if (
            disabled ||
            event.defaultPrevented ||
            event.nativeEvent?.defaultPrevented
          )
            return
          send({ type: 'SET', checked: event.target.checked })
        },
      }
    },
  }
}
