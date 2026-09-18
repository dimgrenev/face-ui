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
  'input',
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

/** Shared navigation order; empty strings are valid values, undefined means no target. */
export function getRadioNavigationValue(
  context: Pick<
    RadioSchema['context'],
    'itemOrder' | 'disabledValues' | 'disabled'
  >,
  current: string | null,
  direction: 1 | -1,
): string | undefined {
  if (context.disabled) return undefined
  const enabled = context.itemOrder.filter(
    (value) => !context.disabledValues.includes(value),
  )
  if (!enabled.length) return undefined
  const index = current === null ? -1 : enabled.indexOf(current)
  return enabled[
    index < 0
      ? direction === 1
        ? 0
        : enabled.length - 1
      : (index + direction + enabled.length) % enabled.length
  ]
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
            guard: (ctx, event) =>
              !ctx.disabled &&
              !ctx.disabledValues.includes(
                (event as { value: string }).value,
              ) &&
              ctx.itemOrder.includes((event as { value: string }).value),
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
            guard: (ctx, event) =>
              !ctx.disabled &&
              !ctx.disabledValues.includes(
                (event as { value: string }).value,
              ) &&
              ctx.itemOrder.includes((event as { value: string }).value),
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
              const next = getRadioNavigationValue(
                ctx,
                ctx.focusedValue ?? ctx.value,
                1,
              )
              if (next !== undefined) {
                ctx.focusedValue = next
                ctx.value = next
              }
            },
          ],
        },
        FOCUS_PREV: {
          actions: [
            (ctx) => {
              const next = getRadioNavigationValue(
                ctx,
                ctx.focusedValue ?? ctx.value,
                -1,
              )
              if (next !== undefined) {
                ctx.focusedValue = next
                ctx.value = next
              }
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
  const {
    value,
    focusedValue,
    itemOrder,
    disabledValues,
    disabled,
    orientation,
  } = state.context
  const isFocused = state.matches('focused')
  const firstEnabled = itemOrder.find(
    (itemValue) => !disabledValues.includes(itemValue),
  )
  const enabled = itemOrder.filter((item) => !disabledValues.includes(item))
  const tabStopValue =
    [focusedValue, value].find(
      (item) => item != null && enabled.includes(item),
    ) ?? firstEnabled

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
      return {
        ...radioAnatomy.getPartAttrs('item'),
        'data-state': value === props.value ? 'checked' : 'unchecked',
        'data-disabled': disabled || props.disabled || undefined,
        'data-orientation': orientation,
        'data-value': props.value,
      }
    },

    getInputProps(props: { value: string; disabled?: boolean }) {
      const itemDisabled = disabled || props.disabled
      const isSelected = value === props.value
      const isTabStop = tabStopValue === props.value

      return {
        ...radioAnatomy.getPartAttrs('input'),
        role: 'radio' as const,
        'aria-checked': isSelected,
        'aria-disabled': itemDisabled || undefined,
        'data-state': isSelected ? 'checked' : 'unchecked',
        'data-disabled': itemDisabled || undefined,
        'data-orientation': orientation,
        'data-value': props.value,
        tabIndex: !itemDisabled && isTabStop ? 0 : -1,
        onChange(event: {
          target: { checked: boolean }
          defaultPrevented?: boolean
          nativeEvent?: { defaultPrevented: boolean }
        }) {
          if (
            !itemDisabled &&
            event.target.checked &&
            !event.defaultPrevented &&
            !event.nativeEvent?.defaultPrevented
          ) {
            send({ type: 'SELECT', value: props.value })
          }
        },
        onFocus() {
          send({ type: 'FOCUS', value: props.value })
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onKeyDown(event: {
          key: string
          defaultPrevented?: boolean
          preventDefault: () => void
        }) {
          if (itemDisabled || event.defaultPrevented) return

          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault()
            send({ type: 'FOCUS_NEXT' })
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault()
            send({ type: 'FOCUS_PREV' })
          } else if (event.key === ' ') {
            event.preventDefault()
            send({ type: 'SELECT', value: props.value })
          }
        },
      }
    },

    getLabelProps(props: { disabled?: boolean } = {}) {
      return {
        ...radioAnatomy.getPartAttrs('label'),
        'data-disabled': disabled || props.disabled || undefined,
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
