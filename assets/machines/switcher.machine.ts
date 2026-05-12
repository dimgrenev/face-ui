/**
 * Switcher Machine (NOT "switch")
 *
 * States: unchecked, checked
 * Binary toggle control with thumb animation support.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const switcherAnatomy = createAnatomy('switcher').parts(
  'root',
  'control',
  'thumb',
  'label',
  'hiddenInput',
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
  event:
    | { type: 'TOGGLE' }
    | { type: 'SET'; checked: boolean }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

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
              const v = (e as { type: 'SET'; checked: boolean }).checked
              return !ctx.disabled && v === true
            },
            target: 'checked',
            actions: [(ctx) => { ctx.checked = true }],
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
              const v = (e as { type: 'SET'; checked: boolean }).checked
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

    getControlProps() {
      return {
        ...switcherAnatomy.getPartAttrs('control'),
        'data-state': dataState,
        'data-disabled': disabled || undefined,
        role: 'switch' as const,
        'aria-checked': checked,
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
        onClick() {
          send({ type: 'TOGGLE' })
        },
      }
    },

    getHiddenInputProps() {
      return {
        ...switcherAnatomy.getPartAttrs('hiddenInput'),
        type: 'checkbox' as const,
        role: 'switch' as const,
        name,
        value,
        checked,
        disabled,
        required,
        'aria-hidden': true as const,
        tabIndex: -1,
        style: {
          position: 'absolute' as const,
          width: 'var(--uf-membrane)',
          height: 'var(--uf-membrane)',
          margin: 'calc(-1 * var(--uf-membrane))',
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
  }
}
