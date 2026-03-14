/**
 * Rating Machine
 *
 * States: idle, hovering
 * Supports half-star ratings via allowHalf.
 * hoveredIndex tracks which star is being hovered.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const ratingAnatomy = createAnatomy('rating').parts(
  'root',
  'item',
  'label',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface RatingSchema extends MachineSchema {
  context: {
    value: number
    max: number
    disabled: boolean
    allowHalf: boolean
    hoveredIndex: number
    onValueChange?: (details: { value: number }) => void
  }
  state: 'idle' | 'hovering'
  event:
    | { type: 'HOVER'; index: number }
    | { type: 'LEAVE' }
    | { type: 'SELECT'; index: number }
    | { type: 'SET_VALUE'; value: number }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const ratingMachine = createMachine<RatingSchema>({
  id: 'rating',
  initial: 'idle',
  context: {
    value: 0,
    max: 5,
    disabled: false,
    allowHalf: false,
    hoveredIndex: -1,
  },

  watch: {
    value(ctx) {
      ctx.onValueChange?.({ value: ctx.value })
    },
  },

  states: {
    idle: {
      on: {
        HOVER: [
          {
            guard: (ctx) => !ctx.disabled,
            target: 'hovering',
            actions: [
              (ctx, e) => {
                ctx.hoveredIndex = (e as { type: 'HOVER'; index: number }).index
              },
            ],
          },
        ],
        SELECT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const index = (e as { type: 'SELECT'; index: number }).index
                // Toggle off if clicking the same value
                ctx.value = ctx.value === index ? 0 : index
              },
            ],
          },
        ],
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: number }).value
            },
          ],
        },
      },
    },

    hovering: {
      on: {
        HOVER: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                ctx.hoveredIndex = (e as { type: 'HOVER'; index: number }).index
              },
            ],
          },
        ],
        LEAVE: {
          target: 'idle',
          actions: [
            (ctx) => {
              ctx.hoveredIndex = -1
            },
          ],
        },
        SELECT: [
          {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx, e) => {
                const index = (e as { type: 'SELECT'; index: number }).index
                ctx.value = ctx.value === index ? 0 : index
              },
            ],
          },
        ],
        SET_VALUE: {
          actions: [
            (ctx, e) => {
              ctx.value = (e as { type: 'SET_VALUE'; value: number }).value
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

export function connectRating(
  state: MachineSnapshot<RatingSchema>,
  send: SendFn<RatingSchema>,
) {
  const { value, max, disabled, allowHalf, hoveredIndex } = state.context
  const isHovering = state.matches('hovering')
  const displayValue = isHovering && hoveredIndex >= 0 ? hoveredIndex : value

  return {
    getRootProps() {
      return {
        ...ratingAnatomy.getPartAttrs('root'),
        role: 'radiogroup' as const,
        'aria-label': 'Rating',
        'data-disabled': disabled || undefined,
        'data-hovering': isHovering || undefined,
        onMouseLeave() {
          send({ type: 'LEAVE' })
        },
      }
    },

    getItemProps(index: number) {
      // index is 1-based (1 = first star, max = last star)
      const isHighlighted = index <= displayValue
      const isHalf = allowHalf && index - 0.5 === displayValue
      const isSelected = index === value

      return {
        ...ratingAnatomy.getPartAttrs('item'),
        role: 'radio' as const,
        'aria-checked': isSelected,
        'aria-disabled': disabled || undefined,
        'aria-label': `${index} star${index !== 1 ? 's' : ''}`,
        'data-index': index,
        'data-highlighted': isHighlighted || undefined,
        'data-half': isHalf || undefined,
        'data-disabled': disabled || undefined,
        tabIndex: disabled ? -1 : isSelected || (value === 0 && index === 1) ? 0 : -1,
        onMouseEnter() {
          send({ type: 'HOVER', index })
        },
        onClick() {
          send({ type: 'SELECT', index })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (disabled) return

          switch (event.key) {
            case 'ArrowRight':
            case 'ArrowUp': {
              event.preventDefault()
              const step = allowHalf ? 0.5 : 1
              const next = Math.min(max, (value || 0) + step)
              send({ type: 'SET_VALUE', value: next })
              break
            }
            case 'ArrowLeft':
            case 'ArrowDown': {
              event.preventDefault()
              const step = allowHalf ? 0.5 : 1
              const prev = Math.max(0, (value || 0) - step)
              send({ type: 'SET_VALUE', value: prev })
              break
            }
            case 'Home':
              event.preventDefault()
              send({ type: 'SET_VALUE', value: 0 })
              break
            case 'End':
              event.preventDefault()
              send({ type: 'SET_VALUE', value: max })
              break
          }
        },
      }
    },

    getLabelProps() {
      return {
        ...ratingAnatomy.getPartAttrs('label'),
        'data-disabled': disabled || undefined,
      }
    },
  }
}
