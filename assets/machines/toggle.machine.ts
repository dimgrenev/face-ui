/**
 * Toggle Machine — Unified Toggle + ToggleGroup
 *
 * States: idle, focused
 * Items-based: value is string[] (selected item values).
 * type='single': at most one item selected (toggle on/off).
 * type='multiple': each item toggles independently.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const toggleAnatomy = createAnatomy('toggle').parts(
  'root',
  'item',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface ToggleSchema extends MachineSchema {
  context: {
    value: string[]
    type: 'single' | 'multiple'
    disabled: boolean
    orientation: 'horizontal' | 'vertical'
    onValueChange?: (details: { value: string[] }) => void
  }
  state: 'idle' | 'focused'
  event:
    | { type: 'TOGGLE'; value: string }
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'FOCUS_NEXT' }
    | { type: 'FOCUS_PREV' }
    | { type: 'SET_VALUE'; value: string[] }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

function toggleValue(
  ctx: ToggleSchema['context'],
  itemValue: string,
): string[] {
  if (ctx.type === 'single') {
    // Single mode: toggle off if already selected, otherwise select this one
    return ctx.value.includes(itemValue) ? [] : [itemValue]
  }
  // Multiple mode: toggle individual item
  return ctx.value.includes(itemValue)
    ? ctx.value.filter((v) => v !== itemValue)
    : [...ctx.value, itemValue]
}

export const toggleMachine = createMachine<ToggleSchema>({
  id: 'toggle',
  initial: 'idle',
  context: {
    value: [],
    type: 'multiple',
    disabled: false,
    orientation: 'horizontal',
  },

  watch: {
    value(ctx) {
      ctx.onValueChange?.({ value: ctx.value })
    },
  },

  states: {
    idle: {
      on: {
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const itemValue = (e as { type: 'TOGGLE'; value: string }).value
                ctx.value = toggleValue(ctx, itemValue)
              },
            ],
          },
        ],
        FOCUS: {
          target: 'focused',
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string[] }).value
            },
          ],
        },
      },
    },

    focused: {
      on: {
        TOGGLE: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const itemValue = (e as { type: 'TOGGLE'; value: string }).value
                ctx.value = toggleValue(ctx, itemValue)
              },
            ],
          },
        ],
        BLUR: {
          target: 'idle',
        },
        FOCUS_NEXT: {
          actions: [],
        },
        FOCUS_PREV: {
          actions: [],
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: string[] }).value
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

export function connectToggle(
  state: MachineSnapshot<ToggleSchema>,
  send: SendFn<ToggleSchema>,
) {
  const { value, disabled, orientation, type } = state.context
  const isFocused = state.matches('focused')

  return {
    getRootProps() {
      return {
        ...toggleAnatomy.getPartAttrs('root'),
        role: 'group' as const,
        'aria-orientation': orientation,
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
        'data-focus': isFocused || undefined,
        'data-type': type,
      }
    },

    getItemProps(props: { value: string; disabled?: boolean }) {
      const itemDisabled = disabled || props.disabled
      const isPressed = value.includes(props.value)

      return {
        ...toggleAnatomy.getPartAttrs('item'),
        role: type === 'single' ? ('radio' as const) : ('checkbox' as const),
        'aria-checked': isPressed,
        'aria-pressed': isPressed,
        'aria-disabled': itemDisabled || undefined,
        'data-state': isPressed ? 'on' : 'off',
        'data-disabled': itemDisabled || undefined,
        'data-orientation': orientation,
        tabIndex: itemDisabled ? -1 : 0,
        onClick() {
          if (!itemDisabled) {
            send({ type: 'TOGGLE', value: props.value })
          }
        },
        onFocus() {
          send({ type: 'FOCUS' })
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
          } else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            send({ type: 'TOGGLE', value: props.value })
          }
        },
      }
    },
  }
}
