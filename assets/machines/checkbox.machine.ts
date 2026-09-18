/**
 * Checkbox Machine
 *
 * States: unchecked, checked, indeterminate
 * Supports tri-state (boolean | 'indeterminate') with toggle and direct set.
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

export const checkboxAnatomy = createAnatomy('checkbox').parts(
  'root',
  'input',
  'indicator',
  'label',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface CheckboxSchema extends MachineSchema {
  context: {
    checked: boolean | 'indeterminate'
    disabled: boolean
    required: boolean
    name: string
    onCheckedChange?: (details: { checked: boolean | 'indeterminate' }) => void
  }
  state: 'unchecked' | 'checked' | 'indeterminate'
  event:
    | { type: 'TOGGLE' }
    | { type: 'SET'; checked: boolean | 'indeterminate' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateFromChecked(
  checked: boolean | 'indeterminate',
): CheckboxSchema['state'] {
  if (checked === 'indeterminate') return 'indeterminate'
  return checked ? 'checked' : 'unchecked'
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

// Every state accepts the same events. Decisions use context so external
// controlled updates cannot leave the next toggle tied to an obsolete state.
const checkedState: StateNode<CheckboxSchema> = {
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
      {
        target: 'indeterminate',
        actions: [
          (ctx) => {
            ctx.checked = 'indeterminate'
          },
        ],
      },
    ],
  },
}

export const checkboxMachine = createMachine<CheckboxSchema>({
  id: 'checkbox',
  initial: 'unchecked',
  context: {
    checked: false,
    disabled: false,
    required: false,
    name: '',
  },

  watch: {
    checked(ctx) {
      ctx.onCheckedChange?.({ checked: ctx.checked })
    },
  },

  states: {
    unchecked: checkedState,
    checked: checkedState,
    indeterminate: checkedState,
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectCheckbox(
  state: MachineSnapshot<CheckboxSchema>,
  send: SendFn<CheckboxSchema>,
) {
  const { checked, disabled, required, name } = state.context
  const isChecked = checked === true
  const isIndeterminate = checked === 'indeterminate'
  const dataState = stateFromChecked(checked)

  return {
    getRootProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('root'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getInputProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('input'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        type: 'checkbox' as const,
        role: 'checkbox' as const,
        name,
        checked: isChecked,
        disabled,
        required,
        'aria-checked': isIndeterminate ? ('mixed' as const) : isChecked,
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

    getIndicatorProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('indicator'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },

    getLabelProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('label'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
      }
    },
  }
}
