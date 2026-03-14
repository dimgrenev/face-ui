/**
 * Slider Machine
 *
 * States: idle, focused, dragging
 * Multi-thumb support: value is always number[].
 * Single thumb = [50], range = [20, 80].
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const sliderAnatomy = createAnatomy('slider').parts(
  'root',
  'track',
  'range',
  'thumb',
  'label',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SliderSchema extends MachineSchema {
  context: {
    value: number[]
    min: number
    max: number
    step: number
    disabled: boolean
    orientation: 'horizontal' | 'vertical'
    /** Index of the currently active thumb (for multi-thumb) */
    activeThumbIndex: number
    onValueChange?: (details: { value: number[] }) => void
  }
  state: 'idle' | 'focused' | 'dragging'
  event:
    | { type: 'FOCUS'; index: number }
    | { type: 'BLUR' }
    | { type: 'DRAG_START'; index: number }
    | { type: 'DRAG'; value: number }
    | { type: 'DRAG_END' }
    | { type: 'SET_VALUE'; value: number[] }
    | { type: 'INCREMENT'; index: number }
    | { type: 'DECREMENT'; index: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampValue(val: number, min: number, max: number, step: number): number {
  const stepped = Math.round((val - min) / step) * step + min
  return Math.min(max, Math.max(min, stepped))
}

function updateThumbValue(
  ctx: SliderSchema['context'],
  index: number,
  newValue: number,
): number[] {
  const clamped = clampValue(newValue, ctx.min, ctx.max, ctx.step)
  const values = [...ctx.value]
  values[index] = clamped

  // Ensure thumbs don't cross each other
  if (index > 0 && values[index] < values[index - 1]) {
    values[index] = values[index - 1]
  }
  if (index < values.length - 1 && values[index] > values[index + 1]) {
    values[index] = values[index + 1]
  }

  return values
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const sliderMachine = createMachine<SliderSchema>({
  id: 'slider',
  initial: 'idle',
  context: {
    value: [0],
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    orientation: 'horizontal',
    activeThumbIndex: 0,
  },

  watch: {
    value(ctx) {
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
            actions: [
              (ctx, e) => {
                ctx.activeThumbIndex = (e as { type: 'FOCUS'; index: number }).index
              },
            ],
          },
        ],
        DRAG_START: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'dragging',
            actions: [
              (ctx, e) => {
                ctx.activeThumbIndex = (e as { type: 'DRAG_START'; index: number }).index
              },
            ],
          },
        ],
        SET_VALUE: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SET_VALUE'; value: number[] }).value
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
        DRAG_START: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'dragging',
            actions: [
              (ctx, e) => {
                ctx.activeThumbIndex = (e as { type: 'DRAG_START'; index: number }).index
              },
            ],
          },
        ],
        INCREMENT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const index = (e as { type: 'INCREMENT'; index: number }).index
                ctx.value = updateThumbValue(ctx, index, ctx.value[index] + ctx.step)
              },
            ],
          },
        ],
        DECREMENT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const index = (e as { type: 'DECREMENT'; index: number }).index
                ctx.value = updateThumbValue(ctx, index, ctx.value[index] - ctx.step)
              },
            ],
          },
        ],
        SET_VALUE: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                ctx.value = (e as { type: 'SET_VALUE'; value: number[] }).value
              },
            ],
          },
        ],
      },
    },

    dragging: {
      on: {
        DRAG: {
          actions: [
            (ctx, e) => {
              const newValue = (e as { type: 'DRAG'; value: number }).value
              ctx.value = updateThumbValue(ctx, ctx.activeThumbIndex, newValue)
            },
          ],
        },
        DRAG_END: {
          target: 'focused',
        },
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: number[] }).value
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

export function connectSlider(
  state: MachineSnapshot<SliderSchema>,
  send: SendFn<SliderSchema>,
) {
  const { value, min, max, step, disabled, orientation, activeThumbIndex } = state.context
  const isDragging = state.matches('dragging')
  const isFocused = state.matches('focused')
  const isHorizontal = orientation === 'horizontal'

  // Calculate range percentage
  const getPercent = (val: number) => ((val - min) / (max - min)) * 100
  const rangeStart = value.length > 1 ? getPercent(value[0]) : 0
  const rangeEnd = getPercent(value[value.length - 1])

  return {
    getRootProps() {
      return {
        ...sliderAnatomy.getPartAttrs('root'),
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
        'data-dragging': isDragging || undefined,
        'data-focus': isFocused || undefined,
      }
    },

    getTrackProps() {
      return {
        ...sliderAnatomy.getPartAttrs('track'),
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
      }
    },

    getRangeProps() {
      const rangeStyle = isHorizontal
        ? { left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }
        : { bottom: `${rangeStart}%`, height: `${rangeEnd - rangeStart}%` }

      return {
        ...sliderAnatomy.getPartAttrs('range'),
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
        'data-dragging': isDragging || undefined,
        style: rangeStyle,
      }
    },

    getThumbProps(index: number) {
      const thumbValue = value[index] ?? min
      const percent = getPercent(thumbValue)
      const isActive = activeThumbIndex === index
      const thumbStyle = isHorizontal
        ? { left: `${percent}%` }
        : { bottom: `${percent}%` }

      return {
        ...sliderAnatomy.getPartAttrs('thumb'),
        role: 'slider' as const,
        tabIndex: disabled ? -1 : 0,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-valuenow': thumbValue,
        'aria-orientation': orientation,
        'aria-disabled': disabled || undefined,
        'data-index': index,
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
        'data-dragging': (isDragging && isActive) || undefined,
        'data-focus': (isFocused && isActive) || undefined,
        style: thumbStyle,
        onFocus() {
          send({ type: 'FOCUS', index })
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onPointerDown() {
          send({ type: 'DRAG_START', index })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (disabled) return

          const incrementKey = isHorizontal ? 'ArrowRight' : 'ArrowUp'
          const decrementKey = isHorizontal ? 'ArrowLeft' : 'ArrowDown'

          switch (event.key) {
            case incrementKey:
              event.preventDefault()
              send({ type: 'INCREMENT', index })
              break
            case decrementKey:
              event.preventDefault()
              send({ type: 'DECREMENT', index })
              break
            case 'Home':
              event.preventDefault()
              send({
                type: 'SET_VALUE',
                value: value.map((v, i) => (i === index ? min : v)),
              })
              break
            case 'End':
              event.preventDefault()
              send({
                type: 'SET_VALUE',
                value: value.map((v, i) => (i === index ? max : v)),
              })
              break
          }
        },
      }
    },

    getLabelProps() {
      return {
        ...sliderAnatomy.getPartAttrs('label'),
        'data-orientation': orientation,
        'data-disabled': disabled || undefined,
      }
    },
  }
}
