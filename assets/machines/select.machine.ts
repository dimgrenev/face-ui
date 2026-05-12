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
    highlightedValue: string | null
    optionOrder: string[]
    disabledValues: string[]
    disabled: boolean
    type: string
    onValueChange?: (details: { value: string | string[] | null }) => void
    onOpenChange?: (details: { open: boolean }) => void
  }
  state: 'closed' | 'open'
  event:
    | { type: 'OPEN' }
    | { type: 'OPEN_FIRST' }
    | { type: 'OPEN_LAST' }
    | { type: 'CLOSE' }
    | { type: 'TOGGLE' }
    | { type: 'SELECT'; value: string }
    | { type: 'SELECT_HIGHLIGHTED' }
    | { type: 'SEARCH'; query: string }
    | { type: 'ESCAPE' }
    | { type: 'HIGHLIGHT'; value: string | null }
    | { type: 'HIGHLIGHT_NEXT' }
    | { type: 'HIGHLIGHT_PREV' }
    | { type: 'HIGHLIGHT_FIRST' }
    | { type: 'HIGHLIGHT_LAST' }
    | { type: 'SET_VALUE'; value: string | string[] | null }
}

type SelectContext = SelectSchema['context']

const getEnabledValues = (ctx: SelectContext): string[] => {
  if (ctx.disabled) return []
  return ctx.optionOrder.filter((value) => !ctx.disabledValues.includes(value))
}

const isEnabledValue = (ctx: SelectContext, value: string | null | undefined): value is string =>
  value != null && getEnabledValues(ctx).includes(value)

const getInitialHighlightedValue = (ctx: SelectContext): string | null => {
  if (typeof ctx.value === 'string' && isEnabledValue(ctx, ctx.value)) return ctx.value
  if (Array.isArray(ctx.value)) {
    const selected = ctx.value.find((value) => isEnabledValue(ctx, value))
    if (selected) return selected
  }
  return getEnabledValues(ctx)[0] ?? null
}

const highlightInitial = (ctx: SelectContext): void => {
  ctx.highlightedValue = getInitialHighlightedValue(ctx)
}

const highlightFirst = (ctx: SelectContext): void => {
  ctx.highlightedValue = getEnabledValues(ctx)[0] ?? null
}

const highlightLast = (ctx: SelectContext): void => {
  const enabled = getEnabledValues(ctx)
  ctx.highlightedValue = enabled[enabled.length - 1] ?? null
}

const highlightOffset = (ctx: SelectContext, delta: 1 | -1): void => {
  const enabled = getEnabledValues(ctx)
  if (enabled.length === 0) {
    ctx.highlightedValue = null
    return
  }
  const currentIndex = ctx.highlightedValue ? enabled.indexOf(ctx.highlightedValue) : -1
  const nextIndex = currentIndex < 0
    ? (delta > 0 ? 0 : enabled.length - 1)
    : (currentIndex + delta + enabled.length) % enabled.length
  ctx.highlightedValue = enabled[nextIndex]
}

const toggleHighlightedValue = (ctx: SelectContext): void => {
  if (!isEnabledValue(ctx, ctx.highlightedValue)) return
  const selectedValue = ctx.highlightedValue
  if (Array.isArray(ctx.value)) {
    const values = ctx.value
    ctx.value = values.includes(selectedValue)
      ? values.filter((v) => v !== selectedValue)
      : [...values, selectedValue]
    return
  }
  ctx.value = selectedValue
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
    highlightedValue: null,
    optionOrder: [],
    disabledValues: [],
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
          ctx.highlightedValue = null
        },
      ],
      on: {
        OPEN: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
            actions: [highlightInitial],
          },
        ],
        OPEN_FIRST: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
            actions: [highlightFirst],
          },
        ],
        OPEN_LAST: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
            actions: [highlightLast],
          },
        ],
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'open',
            actions: [highlightInitial],
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
        OPEN: {
          actions: [highlightInitial],
        },
        OPEN_FIRST: {
          actions: [highlightFirst],
        },
        OPEN_LAST: {
          actions: [highlightLast],
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
        SELECT_HIGHLIGHTED: [
          {
            guard: (ctx) => !ctx.disabled && Array.isArray(ctx.value) && isEnabledValue(ctx, ctx.highlightedValue),
            actions: [toggleHighlightedValue],
          },
          {
            guard: (ctx) => !ctx.disabled && !Array.isArray(ctx.value) && isEnabledValue(ctx, ctx.highlightedValue),
            target: 'closed',
            actions: [toggleHighlightedValue],
          },
        ],
        SEARCH: {
          actions: [
            (ctx, e) => {
              ctx.searchQuery = (e as { type: 'SEARCH'; query: string }).query
            },
          ],
        },
        HIGHLIGHT: {
          actions: [
            (ctx, e) => {
              const value = (e as { type: 'HIGHLIGHT'; value: string | null }).value
              ctx.highlightedValue = isEnabledValue(ctx, value) ? value : null
            },
          ],
        },
        HIGHLIGHT_NEXT: {
          actions: [(ctx) => highlightOffset(ctx, 1)],
        },
        HIGHLIGHT_PREV: {
          actions: [(ctx) => highlightOffset(ctx, -1)],
        },
        HIGHLIGHT_FIRST: {
          actions: [highlightFirst],
        },
        HIGHLIGHT_LAST: {
          actions: [highlightLast],
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
  const { value, open, disabled, searchQuery, type, highlightedValue } = state.context
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

    getTriggerProps(props: {
      id?: string
      contentId?: string
      labelId?: string
      ariaLabel?: string
      activeDescendantId?: string
    } = {}) {
      return {
        ...selectAnatomy.getPartAttrs('trigger'),
        id: props.id,
        role: 'combobox' as const,
        'aria-expanded': isOpen,
        'aria-haspopup': 'listbox' as const,
        'aria-controls': props.contentId,
        'aria-labelledby': props.labelId,
        'aria-label': props.labelId ? undefined : props.ariaLabel,
        'aria-activedescendant': props.activeDescendantId,
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
              send(isOpen ? { type: 'SELECT_HIGHLIGHTED' } : { type: 'TOGGLE' })
              break
            case 'ArrowDown':
              event.preventDefault()
              send(isOpen ? { type: 'HIGHLIGHT_NEXT' } : { type: 'OPEN_FIRST' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send(isOpen ? { type: 'HIGHLIGHT_PREV' } : { type: 'OPEN_LAST' })
              break
            case 'Home':
              if (isOpen) {
                event.preventDefault()
                send({ type: 'HIGHLIGHT_FIRST' })
              }
              break
            case 'End':
              if (isOpen) {
                event.preventDefault()
                send({ type: 'HIGHLIGHT_LAST' })
              }
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

    getContentProps(props: {
      id?: string
      labelId?: string
      ariaLabel?: string
      activeDescendantId?: string
    } = {}) {
      return {
        ...selectAnatomy.getPartAttrs('content'),
        id: props.id,
        role: 'listbox' as const,
        'aria-labelledby': props.labelId,
        'aria-label': props.labelId ? undefined : props.ariaLabel,
        'aria-activedescendant': props.activeDescendantId,
        'aria-multiselectable': Array.isArray(value) || undefined,
        'data-state': isOpen ? 'open' : 'closed',
        hidden: !isOpen,
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          switch (event.key) {
            case 'Escape':
              event.preventDefault()
              send({ type: 'ESCAPE' })
              break
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_NEXT' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_PREV' })
              break
            case 'Home':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_FIRST' })
              break
            case 'End':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_LAST' })
              break
            case 'Enter':
            case ' ':
              event.preventDefault()
              send({ type: 'SELECT_HIGHLIGHTED' })
              break
          }
        },
      }
    },

    getOptionProps(props: { value: string; disabled?: boolean; id?: string }) {
      const optionDisabled = disabled || props.disabled
      const isSelected = Array.isArray(value)
        ? value.includes(props.value)
        : value === props.value
      const isHighlighted = highlightedValue === props.value && !optionDisabled

      return {
        ...selectAnatomy.getPartAttrs('option'),
        id: props.id,
        role: 'option' as const,
        'aria-selected': isSelected,
        'aria-disabled': optionDisabled || undefined,
        'data-state': isSelected ? 'selected' : undefined,
        'data-highlighted': isHighlighted || undefined,
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

          switch (event.key) {
            case 'Enter':
            case ' ':
              event.preventDefault()
              send({ type: 'SELECT', value: props.value })
              break
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_NEXT' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_PREV' })
              break
            case 'Home':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_FIRST' })
              break
            case 'End':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_LAST' })
              break
            case 'Escape':
              event.preventDefault()
              send({ type: 'ESCAPE' })
              break
          }
        },
      }
    },
  }
}
