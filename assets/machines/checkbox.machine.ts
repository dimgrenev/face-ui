/**
 * Checkbox Machine
 *
 * States: unchecked, checked, indeterminate
 * Supports tri-state (boolean | 'indeterminate') with toggle and direct set.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const checkboxAnatomy = createAnatomy('checkbox').parts(
  'root',
  'control',
  'indicator',
  'label',
  'hiddenInput',
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

function stateFromChecked(checked: boolean | 'indeterminate'): CheckboxSchema['state'] {
  if (checked === 'indeterminate') return 'indeterminate'
  return checked ? 'checked' : 'unchecked'
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

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
    unchecked: {
      on: {
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'checked',
            actions: [(ctx) => { ctx.checked = true }],
          },
        ],
        SET: [
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === true
            },
            target: 'checked',
            actions: [(ctx) => { ctx.checked = true }],
          },
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === 'indeterminate'
            },
            target: 'indeterminate',
            actions: [(ctx) => { ctx.checked = 'indeterminate' }],
          },
        ],
      },
    },

    checked: {
      on: {
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'unchecked',
            actions: [(ctx) => { ctx.checked = false }],
          },
        ],
        SET: [
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === false
            },
            target: 'unchecked',
            actions: [(ctx) => { ctx.checked = false }],
          },
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === 'indeterminate'
            },
            target: 'indeterminate',
            actions: [(ctx) => { ctx.checked = 'indeterminate' }],
          },
        ],
      },
    },

    indeterminate: {
      on: {
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'checked',
            actions: [(ctx) => { ctx.checked = true }],
          },
        ],
        SET: [
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === true
            },
            target: 'checked',
            actions: [(ctx) => { ctx.checked = true }],
          },
          {
            guard: (ctx, e) => {
              const v = (e as { type: 'SET'; checked: boolean | 'indeterminate' }).checked
              return !ctx.disabled && v === false
            },
            target: 'unchecked',
            actions: [(ctx) => { ctx.checked = false }],
          },
        ],
      },
    },
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

    getControlProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('control'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        role: 'checkbox' as const,
        'aria-checked': isIndeterminate ? ('mixed' as const) : isChecked,
        'aria-disabled': disabled || undefined,
        'aria-required': required || undefined,
        tabIndex: disabled ? -1 : 0,
        onClick() {
          send({ type: 'TOGGLE' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            send({ type: 'TOGGLE' })
          }
        },
      }
    },

    getIndicatorProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('indicator'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        hidden: !isChecked && !isIndeterminate,
      }
    },

    getHiddenInputProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('hiddenInput'),
        type: 'checkbox' as const,
        name,
        checked: isChecked,
        disabled,
        required,
        tabIndex: -1,
        style: {
          position: 'absolute' as const,
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: '0',
          overflow: 'hidden' as const,
          clip: 'rect(0,0,0,0)',
          border: '0',
        },
        onChange() {
          send({ type: 'TOGGLE' })
        },
      }
    },

    getLabelProps() {
      return {
        ...checkboxAnatomy.getPartAttrs('label'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        onClick() {
          send({ type: 'TOGGLE' })
        },
      }
    },
  }
}
