/**
 * Select Machine — Shell Pattern
 *
 * States: closed, open
 * Shell-pattern: machine handles open/close and value selection.
 * Sub-component rendering (OptionList, Calendar, etc.) is the adapter's job.
 *
 * type='select' is default. The React adapter uses discriminated unions
 * to swap sub-components based on type.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const selectAnatomy = createAnatomy('select').parts(
  'root',
  'trigger',
  'content',
  'option',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SelectSchema extends MachineSchema {
  context: {
    value: string | string[] | null
    open: boolean
    searchQuery: string
    disabled: boolean
    type: string
    onValueChange?: (details: { value: string | string[] | null }) => void
    onOpenChange?: (details: { open: boolean }) => void
  }
  state: 'closed' | 'open'
  event:
    | { type: 'OPEN' }
    | { type: 'CLOSE' }
    | { type: 'TOGGLE' }
    | { type: 'SELECT'; value: string }
    | { type: 'SEARCH'; query: string }
    | { type: 'ESCAPE' }
    | { type: 'SET_VALUE'; value: string | string[] | null }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const selectMachine = createMachine<SelectSchema>({
  id: 'select',
  initial: 'closed',
  context: {
    value: null,
    open: false,
    searchQuery: '',
    disabled: false,
    type: 'select',
  },

  watch: {
    value(ctx) {
      ctx.onValueChange?.({ value: ctx.value })
    },
    open(ctx) {
      ctx.onOpenChange?.({ open: ctx.open })
    },
  },

  states: {
    closed: {
      entry: [
        (ctx) => {
          ctx.open = false
          ctx.searchQuery = ''
        },
      ],
      on: {
        OPEN: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
          },
        ],
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
          },
        ],
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string | string[] | null }).value
            },
          ],
        },
      },
    },

    open: {
      entry: [
        (ctx) => {
          ctx.open = true
        },
      ],
      on: {
        CLOSE: {
          target: 'closed',
        },
        TOGGLE: {
          target: 'closed',
        },
        ESCAPE: {
          target: 'closed',
        },
        SELECT: [
          {
            // Multi-select: toggle item, stay open
            guard: (ctx) => !ctx.disabled && Array.isArray(ctx.value),
            actions: [
              (ctx, e) => {
                const selectedValue = (e as { type: 'SELECT'; value: string }).value
                const values = ctx.value as string[]
                ctx.value = values.includes(selectedValue)
                  ? values.filter((v) => v !== selectedValue)
                  : [...values, selectedValue]
              },
            ],
          },
          {
            // Single-select: set value and close
            guard: (ctx) => !ctx.disabled && !Array.isArray(ctx.value),
            target: 'closed',
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SELECT'; value: string }).value
              },
            ],
          },
        ],
        SEARCH: {
          actions: [
            (ctx, e) => {
              ctx.searchQuery = (e as { type: 'SEARCH'; query: string }).query
            },
          ],
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string | string[] | null }).value
            },
          ],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectSelect(
  state: MachineSnapshot<SelectSchema>,
  send: SendFn<SelectSchema>,
) {
  const { value, open, disabled, searchQuery, type } = state.context
  const isOpen = state.matches('open')

  // Determine display value for trigger
  const displayValue = Array.isArray(value)
    ? value.join(', ')
    : value ?? ''

  return {
    getRootProps() {
      return {
        ...selectAnatomy.getPartAttrs('root'),
        'data-state': isOpen ? 'open' : 'closed',
        'data-disabled': disabled || undefined,
        'data-type': type,
      }
    },

    getTriggerProps() {
      return {
        ...selectAnatomy.getPartAttrs('trigger'),
        role: 'combobox' as const,
        'aria-expanded': isOpen,
        'aria-haspopup': 'listbox' as const,
        'aria-disabled': disabled || undefined,
        'data-state': isOpen ? 'open' : 'closed',
        'data-disabled': disabled || undefined,
        'data-placeholder': !value || (Array.isArray(value) && value.length === 0) || undefined,
        tabIndex: disabled ? -1 : 0,
        onClick() {
          send({ type: 'TOGGLE' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (disabled) return

          switch (event.key) {
            case 'Enter':
            case ' ':
              event.preventDefault()
              send({ type: 'TOGGLE' })
              break
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'OPEN' })
              break
            case 'Escape':
              if (isOpen) {
                event.preventDefault()
                send({ type: 'ESCAPE' })
              }
              break
          }
        },
      }
    },

    getContentProps() {
      return {
        ...selectAnatomy.getPartAttrs('content'),
        role: 'listbox' as const,
        'aria-multiselectable': Array.isArray(value) || undefined,
        'data-state': isOpen ? 'open' : 'closed',
        hidden: !isOpen,
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Escape') {
            event.preventDefault()
            send({ type: 'ESCAPE' })
          }
        },
      }
    },

    getOptionProps(props: { value: string; disabled?: boolean }) {
      const optionDisabled = disabled || props.disabled
      const isSelected = Array.isArray(value)
        ? value.includes(props.value)
        : value === props.value

      return {
        ...selectAnatomy.getPartAttrs('option'),
        role: 'option' as const,
        'aria-selected': isSelected,
        'aria-disabled': optionDisabled || undefined,
        'data-state': isSelected ? 'selected' : undefined,
        'data-disabled': optionDisabled || undefined,
        'data-value': props.value,
        tabIndex: optionDisabled ? -1 : 0,
        onClick() {
          if (!optionDisabled) {
            send({ type: 'SELECT', value: props.value })
          }
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (optionDisabled) return

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            send({ type: 'SELECT', value: props.value })
          }
        },
      }
    },
  }
}
