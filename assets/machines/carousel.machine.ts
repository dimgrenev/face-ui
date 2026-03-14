/**
 * @face-ui/core — Carousel Machine
 *
 * Multi-slide carousel with drag support, looping, and auto-play.
 * States: idle | dragging | auto-playing
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const carouselAnatomy = createAnatomy('carousel').parts(
  'root',
  'viewport',
  'slide',
  'prev',
  'next',
  'indicator',
  'indicator-item',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface CarouselSchema extends MachineSchema {
  context: {
    index: number
    total: number
    loop: boolean
    autoPlay: boolean
    autoPlayInterval: number
    orientation: 'horizontal' | 'vertical'
    slidesPerView: number
    dragStartX: number
    dragCurrentX: number
    onIndexChange: ((details: { index: number }) => void) | null
  }
  state: 'idle' | 'dragging' | 'auto-playing'
  event:
    | { type: 'NEXT' }
    | { type: 'PREV' }
    | { type: 'GO_TO'; index: number }
    | { type: 'DRAG_START'; x: number }
    | { type: 'DRAG'; x: number }
    | { type: 'DRAG_END' }
    | { type: 'PLAY' }
    | { type: 'PAUSE' }
    | { type: 'AUTO_NEXT' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampIndex(index: number, total: number, loop: boolean): number {
  if (total <= 0) return 0
  if (loop) return ((index % total) + total) % total
  return Math.max(0, Math.min(index, total - 1))
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const carouselMachine = createMachine<CarouselSchema>({
  id: 'carousel',
  initial: 'idle',

  context: {
    index: 0,
    total: 0,
    loop: false,
    autoPlay: false,
    autoPlayInterval: 3000,
    orientation: 'horizontal',
    slidesPerView: 1,
    dragStartX: 0,
    dragCurrentX: 0,
    onIndexChange: null,
  },

  states: {
    idle: {
      entry: [
        (ctx) => {
          // Auto-transition to auto-playing if autoPlay is enabled
          // Handled via effect instead — see below
          void ctx
        },
      ],
      effects: ['checkAutoPlay'],
      on: {
        NEXT: {
          actions: [
            (ctx) => {
              const next = ctx.index + 1
              const canAdvance = ctx.loop || next < ctx.total
              if (canAdvance) {
                ctx.index = clampIndex(next, ctx.total, ctx.loop)
              }
            },
          ],
        },
        PREV: {
          actions: [
            (ctx) => {
              const prev = ctx.index - 1
              const canRetreat = ctx.loop || prev >= 0
              if (canRetreat) {
                ctx.index = clampIndex(prev, ctx.total, ctx.loop)
              }
            },
          ],
        },
        GO_TO: {
          actions: [
            (ctx, event) => {
              const e = event as CarouselSchema['event'] & { type: 'GO_TO' }
              ctx.index = clampIndex(e.index, ctx.total, ctx.loop)
            },
          ],
        },
        DRAG_START: {
          target: 'dragging',
          actions: [
            (ctx, event) => {
              const e = event as CarouselSchema['event'] & { type: 'DRAG_START' }
              ctx.dragStartX = e.x
              ctx.dragCurrentX = e.x
            },
          ],
        },
        PLAY: {
          target: 'auto-playing',
        },
      },
    },

    dragging: {
      on: {
        DRAG: {
          actions: [
            (ctx, event) => {
              const e = event as CarouselSchema['event'] & { type: 'DRAG' }
              ctx.dragCurrentX = e.x
            },
          ],
        },
        DRAG_END: {
          target: 'idle',
          actions: [
            (ctx) => {
              const delta = ctx.dragCurrentX - ctx.dragStartX
              const threshold = 50 // px — minimum drag distance to trigger slide change
              if (Math.abs(delta) > threshold) {
                if (delta < 0) {
                  // Dragged left → next
                  const next = ctx.index + 1
                  if (ctx.loop || next < ctx.total) {
                    ctx.index = clampIndex(next, ctx.total, ctx.loop)
                  }
                } else {
                  // Dragged right → prev
                  const prev = ctx.index - 1
                  if (ctx.loop || prev >= 0) {
                    ctx.index = clampIndex(prev, ctx.total, ctx.loop)
                  }
                }
              }
              ctx.dragStartX = 0
              ctx.dragCurrentX = 0
            },
          ],
        },
        // Allow pause even while dragging
        PAUSE: {
          target: 'idle',
          actions: [
            (ctx) => {
              ctx.dragStartX = 0
              ctx.dragCurrentX = 0
            },
          ],
        },
      },
    },

    'auto-playing': {
      effects: ['autoPlayTimer'],
      on: {
        AUTO_NEXT: {
          actions: [
            (ctx) => {
              const next = ctx.index + 1
              const canAdvance = ctx.loop || next < ctx.total
              if (canAdvance) {
                ctx.index = clampIndex(next, ctx.total, ctx.loop)
              } else if (!ctx.loop) {
                // At the end without loop — stop auto-play
                ctx.autoPlay = false
              }
            },
          ],
        },
        NEXT: {
          actions: [
            (ctx) => {
              const next = ctx.index + 1
              if (ctx.loop || next < ctx.total) {
                ctx.index = clampIndex(next, ctx.total, ctx.loop)
              }
            },
          ],
        },
        PREV: {
          actions: [
            (ctx) => {
              const prev = ctx.index - 1
              if (ctx.loop || prev >= 0) {
                ctx.index = clampIndex(prev, ctx.total, ctx.loop)
              }
            },
          ],
        },
        GO_TO: {
          actions: [
            (ctx, event) => {
              const e = event as CarouselSchema['event'] & { type: 'GO_TO' }
              ctx.index = clampIndex(e.index, ctx.total, ctx.loop)
            },
          ],
        },
        PAUSE: {
          target: 'idle',
        },
        DRAG_START: {
          target: 'dragging',
          actions: [
            (ctx, event) => {
              const e = event as CarouselSchema['event'] & { type: 'DRAG_START' }
              ctx.dragStartX = e.x
              ctx.dragCurrentX = e.x
            },
          ],
        },
      },
    },
  },

  computed: {
    hasPrev: (ctx) => ctx.loop || ctx.index > 0,
    hasNext: (ctx) => ctx.loop || ctx.index < ctx.total - 1,
    canLoop: (ctx) => ctx.loop && ctx.total > 1,
    dragOffset: (ctx) => ctx.dragCurrentX - ctx.dragStartX,
    slidePercent: (ctx) => {
      if (ctx.total <= 0) return 0
      return (ctx.index / ctx.total) * 100
    },
  },

  watch: {
    index: (ctx) => {
      ctx.onIndexChange?.({ index: ctx.index })
    },
  },

  implementations: {
    effects: {
      autoPlayTimer: (ctx, send) => {
        if (!ctx.autoPlay) return
        const timer = setInterval(() => {
          send({ type: 'AUTO_NEXT' })
        }, ctx.autoPlayInterval)
        return () => clearInterval(timer)
      },

      checkAutoPlay: (ctx, send) => {
        if (ctx.autoPlay) {
          // Defer to avoid sending during start()
          const raf = requestAnimationFrame(() => {
            send({ type: 'PLAY' })
          })
          return () => cancelAnimationFrame(raf)
        }
        return undefined
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

interface CarouselPartProps {
  'data-scope': string
  'data-part': string
  'data-state'?: string
  'data-orientation'?: string
  'data-index'?: number
  'data-current'?: ''
  role?: string
  'aria-roledescription'?: string
  'aria-label'?: string
  'aria-live'?: 'polite' | 'off'
  'aria-pressed'?: boolean
  disabled?: boolean
  tabIndex?: number
  style?: Record<string, string>
  onPointerDown?: (e: { clientX: number }) => void
  onPointerMove?: (e: { clientX: number }) => void
  onPointerUp?: () => void
  onClick?: () => void
  onKeyDown?: (e: { key: string }) => void
}

export function connectCarousel(
  state: {
    value: CarouselSchema['state']
    context: CarouselSchema['context']
    computed: Record<string, unknown>
  },
  send: (event: CarouselSchema['event']) => void,
) {
  const { value: stateValue, context: ctx, computed } = state
  const hasPrev = computed['hasPrev'] as boolean
  const hasNext = computed['hasNext'] as boolean
  const isDragging = stateValue === 'dragging'
  const isAutoPlaying = stateValue === 'auto-playing'

  return {
    getRootProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('root'),
        role: 'region',
        'aria-roledescription': 'carousel',
        'aria-label': 'Carousel',
        'data-orientation': ctx.orientation,
        'data-state': stateValue,
        onKeyDown: (e) => {
          const prevKey = ctx.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
          const nextKey = ctx.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
          if (e.key === prevKey) send({ type: 'PREV' })
          if (e.key === nextKey) send({ type: 'NEXT' })
        },
      }
    },

    getViewportProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('viewport'),
        'data-orientation': ctx.orientation,
        'data-state': stateValue,
        style: isDragging
          ? { cursor: 'grabbing', userSelect: 'none' }
          : { cursor: ctx.total > 1 ? 'grab' : undefined } as Record<string, string>,
        onPointerDown: (e) => {
          send({ type: 'DRAG_START', x: e.clientX })
        },
        onPointerMove: (e) => {
          if (isDragging) {
            send({ type: 'DRAG', x: e.clientX })
          }
        },
        onPointerUp: () => {
          if (isDragging) {
            send({ type: 'DRAG_END' })
          }
        },
      }
    },

    getSlideProps(index: number): CarouselPartProps {
      const isCurrent = index === ctx.index
      return {
        ...carouselAnatomy.getPartAttrs('slide'),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `Slide ${index + 1} of ${ctx.total}`,
        'data-index': index,
        'data-current': isCurrent ? '' : undefined,
        'data-state': isCurrent ? 'active' : 'inactive',
      }
    },

    getPrevProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('prev'),
        'aria-label': 'Previous slide',
        disabled: !hasPrev,
        onClick: () => send({ type: 'PREV' }),
      }
    },

    getNextProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('next'),
        'aria-label': 'Next slide',
        disabled: !hasNext,
        onClick: () => send({ type: 'NEXT' }),
      }
    },

    getIndicatorProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('indicator'),
        role: 'tablist',
      }
    },

    getIndicatorItemProps(index: number): CarouselPartProps {
      const isCurrent = index === ctx.index
      return {
        ...carouselAnatomy.getPartAttrs('indicator-item'),
        role: 'tab',
        tabIndex: isCurrent ? 0 : -1,
        'aria-label': `Go to slide ${index + 1}`,
        'aria-pressed': isCurrent,
        'data-index': index,
        'data-current': isCurrent ? '' : undefined,
        'data-state': isCurrent ? 'active' : 'inactive',
        onClick: () => send({ type: 'GO_TO', index }),
      }
    },

    /** Imperative helpers */
    next() {
      send({ type: 'NEXT' })
    },
    prev() {
      send({ type: 'PREV' })
    },
    goTo(index: number) {
      send({ type: 'GO_TO', index })
    },
    play() {
      send({ type: 'PLAY' })
    },
    pause() {
      send({ type: 'PAUSE' })
    },

    /** Computed accessors */
    hasPrev,
    hasNext,
    canLoop: computed['canLoop'] as boolean,
    isDragging,
    isAutoPlaying,
    index: ctx.index,
    total: ctx.total,
  }
}
