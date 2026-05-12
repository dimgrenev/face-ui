/**
 * Input Machine
 *
 * States: idle, focused
 * Base text input machine. Type variants (textarea, number, otp, tags)
 * are handled by the React adapter, not this machine.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const inputAnatomy = createAnatomy('input').parts(
  'root',
  'input',
  'label',
  'clear',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface InputSchema extends MachineSchema {
  context: {
    value: string
    disabled: boolean
    readOnly: boolean
    type: string
    onValueChange?: (details: { value: string }) => void
    silentSync: boolean
  }
  state: 'idle' | 'focused'
  event:
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'SET_VALUE'; value: string }
    | { type: 'SYNC_VALUE'; value: string }
    | { type: 'CLEAR' }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const inputMachine = createMachine<InputSchema>({
  id: 'input',
  initial: 'idle',
  context: {
    value: '',
    disabled: false,
    readOnly: false,
    type: 'text',
    silentSync: false,
  },

  watch: {
    value(ctx) {
      if (ctx.silentSync) {
        ctx.silentSync = false
        return
      }
      ctx.onValueChange?.({ value: ctx.value })
    },
  },

  states: {
    idle: {
      on: {
        FOCUS: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'focused',
          },
        ],
        SET_VALUE: [
          {
            guard: (ctx) => !ctx.disabled && !ctx.readOnly,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SET_VALUE'; value: string }).value
              },
            ],
          },
        ],
        SYNC_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.silentSync = true
              ctx.value = (e as { type: 'SYNC_VALUE'; value: string }).value
            },
          ],
        },
        CLEAR: [
          {
            guard: (ctx) => !ctx.disabled && !ctx.readOnly,
            actions: [
              (ctx) => {
                ctx.value = ''
              },
            ],
          },
        ],
      },
    },

    focused: {
      on: {
        BLUR: {
          target: 'idle',
        },
        SET_VALUE: [
          {
            guard: (ctx) => !ctx.disabled && !ctx.readOnly,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SET_VALUE'; value: string }).value
              },
            ],
          },
        ],
        SYNC_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.silentSync = true
              ctx.value = (e as { type: 'SYNC_VALUE'; value: string }).value
            },
          ],
        },
        CLEAR: [
          {
            guard: (ctx) => !ctx.disabled && !ctx.readOnly,
            actions: [
              (ctx) => {
                ctx.value = ''
              },
            ],
          },
        ],
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectInput(
  state: MachineSnapshot<InputSchema>,
  send: SendFn<InputSchema>,
) {
  const { value, disabled, readOnly, type } = state.context
  const isFocused = state.matches('focused')
  const isEmpty = value === ''

  return {
    getRootProps() {
      return {
        ...inputAnatomy.getPartAttrs('root'),
        'data-disabled': disabled || undefined,
        'data-readonly': readOnly || undefined,
        'data-focus': isFocused || undefined,
        'data-empty': isEmpty || undefined,
      }
    },

    getInputProps() {
      return {
        ...inputAnatomy.getPartAttrs('input'),
        type,
        value,
        disabled,
        readOnly,
        'aria-disabled': disabled || undefined,
        'aria-readonly': readOnly || undefined,
        'data-disabled': disabled || undefined,
        'data-readonly': readOnly || undefined,
        'data-focus': isFocused || undefined,
        onFocus() {
          send({ type: 'FOCUS' })
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onChange(event: { target: { value: string } }) {
          send({ type: 'SET_VALUE', value: event.target.value })
        },
      }
    },

    getLabelProps() {
      return {
        ...inputAnatomy.getPartAttrs('label'),
        'data-disabled': disabled || undefined,
        'data-focus': isFocused || undefined,
        'data-empty': isEmpty || undefined,
      }
    },

    getClearProps() {
      return {
        ...inputAnatomy.getPartAttrs('clear'),
        role: 'button' as const,
        tabIndex: -1,
        'aria-label': 'Clear input',
        'data-disabled': disabled || undefined,
        hidden: isEmpty || disabled || readOnly,
        onClick() {
          send({ type: 'CLEAR' })
        },
      }
    },
  }
}
