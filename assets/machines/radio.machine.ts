/**
 * Radio Machine (NOT "radio-group")
 *
 * States: idle, focused
 * Flat API: options are NOT in machine context (handled by React adapter).
 * Machine manages value selection and focus state only.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const radioAnatomy = createAnatomy('radio').parts(
  'root',
  'item',
  'label',
  'indicator',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface RadioSchema extends MachineSchema {
  context: {
    value: string | null
    focusedValue: string | null
    itemOrder: string[]
    disabledValues: string[]
    disabled: boolean
    orientation: 'horizontal' | 'vertical'
    onValueChange?: (details: { value: string }) => void
  }
  state: 'idle' | 'focused'
  event:
    | { type: 'SELECT'; value: string }
    | { type: 'FOCUS'; value: string }
    | { type: 'BLUR' }
    | { type: 'FOCUS_NEXT' }
    | { type: 'FOCUS_PREV' }
    | { type: 'SET_VALUE'; value: string }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const radioMachine = createMachine<RadioSchema>({
  id: 'radio',
  initial: 'idle',
  context: {
    value: null,
    focusedValue: null,
    itemOrder: [],
    disabledValues: [],
    disabled: false,
    orientation: 'vertical',
  },

  watch: {
    value(ctx) {
      if (ctx.value != null) {
        ctx.onValueChange?.({ value: ctx.value })
      }
    },
  },

  states: {
    idle: {
      on: {
        SELECT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SELECT'; value: string }).value
              },
            ],
          },
        ],
        FOCUS: {
          target: 'focused',
          actions: [
            (ctx, e) => {
              ctx.focusedValue = (e as { type: 'FOCUS'; value: string }).value
            },
          ],
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string }).value
            },
          ],
        },
      },
    },

    focused: {
      on: {
        SELECT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SELECT'; value: string }).value
              },
            ],
          },
        ],
        BLUR: {
          target: 'idle',
          actions: [
            (ctx) => {
              ctx.focusedValue = null
            },
          ],
        },
        FOCUS_NEXT: {
          actions: [
            (ctx) => {
              const enabled = ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value))
              if (enabled.length === 0) return
              const current = ctx.focusedValue ?? ctx.value
              const currentIndex = current ? enabled.indexOf(current) : -1
              const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % enabled.length
              const nextValue = enabled[nextIndex]
              ctx.focusedValue = nextValue
              ctx.value = nextValue
            },
          ],
        },
        FOCUS_PREV: {
          actions: [
            (ctx) => {
              const enabled = ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value))
              if (enabled.length === 0) return
              const current = ctx.focusedValue ?? ctx.value
              const currentIndex = current ? enabled.indexOf(current) : -1
              const nextIndex = currentIndex < 0 ? enabled.length - 1 : (currentIndex - 1 + enabled.length) % enabled.length
              const nextValue = enabled[nextIndex]
              ctx.focusedValue = nextValue
              ctx.value = nextValue
            },
          ],
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string }).value
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

export function connectRadio(
  state: MachineSnapshot<RadioSchema>,
  send: SendFn<RadioSchema>,
) {
  const { value, focusedValue, itemOrder, disabledValues, disabled, orientation } = state.context
  const isFocused = state.matches('focused')
  const firstEnabled = itemOrder.find((itemValue) => !disabledValues.includes(itemValue))
  const tabStopValue = focusedValue ?? value ?? firstEnabled

  return {
    getRootProps() {
      return {
        ...radioAnatomy.getPartAttrs('root'),
        role: 'radiogroup' as const,
        'aria-orientation': orientation,
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
        'data-focus': isFocused || undefined,
      }
    },

    getItemProps(props: { value: string; disabled?: boolean }) {
      const itemDisabled = disabled || props.disabled
      const isSelected = value === props.value
      const isTabStop = tabStopValue === props.value

      return {
        ...radioAnatomy.getPartAttrs('item'),
        role: 'radio' as const,
        'aria-checked': isSelected,
        'aria-disabled': itemDisabled || undefined,
        'data-state': isSelected ? 'checked' : 'unchecked',
        'data-disabled': itemDisabled || undefined,
        'data-orientation': orientation,
        'data-value': props.value,
        tabIndex: isTabStop ? 0 : -1,
        onClick() {
          if (!itemDisabled) {
            send({ type: 'SELECT', value: props.value })
          }
        },
        onFocus() {
          send({ type: 'FOCUS', value: props.value })
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (itemDisabled) return

          const isVertical = orientation === 'vertical'
          const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight'
          const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft'

          if (event.key === nextKey) {
            event.preventDefault()
            send({ type: 'FOCUS_NEXT' })
          } else if (event.key === prevKey) {
            event.preventDefault()
            send({ type: 'FOCUS_PREV' })
          } else if (event.key === ' ') {
            event.preventDefault()
            send({ type: 'SELECT', value: props.value })
          }
        },
      }
    },

    getLabelProps() {
      return {
        ...radioAnatomy.getPartAttrs('label'),
        'data-disabled': disabled || undefined,
        'data-orientation': orientation,
      }
    },

    getIndicatorProps() {
      return {
        ...radioAnatomy.getPartAttrs('indicator'),
        'data-disabled': disabled || undefined,
      }
    },
  }
}
