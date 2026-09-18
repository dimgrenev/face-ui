/**
 * @face-ui/core — Carousel Machine
 *
 * Multi-slide carousel with drag support, looping, and auto-play.
 * States: idle | dragging | auto-playing
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, ActionFn } from '../types'

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
  if (total <= 0 || !Number.isFinite(index)) return 0
  index = Math.trunc(index)
  if (loop) return ((index % total) + total) % total
  return Math.max(0, Math.min(index, total - 1))
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

const positionCount = (ctx: CarouselSchema['context']) =>
  Math.max(1, ctx.total - ctx.slidesPerView + 1)
const move =
  (offset: number): ActionFn<CarouselSchema> =>
  (ctx) => {
    ctx.index = clampIndex(ctx.index + offset, positionCount(ctx), ctx.loop)
  }
const navigationEvents = {
  NEXT: { actions: [move(1)] },
  PREV: { actions: [move(-1)] },
  GO_TO: {
    actions: [
      (ctx: CarouselSchema['context'], event: CarouselSchema['event']) => {
        if (event.type === 'GO_TO')
          ctx.index = clampIndex(event.index, positionCount(ctx), ctx.loop)
      },
    ],
  },
  PLAY: {
    target: 'auto-playing' as const,
    actions: [
      (ctx: CarouselSchema['context']) => {
        ctx.autoPlay = true
      },
    ],
  },
  PAUSE: {
    target: 'idle' as const,
    actions: [
      (ctx: CarouselSchema['context']) => {
        ctx.autoPlay = false
      },
    ],
  },
  DRAG_START: {
    target: 'dragging' as const,
    actions: [
      (ctx: CarouselSchema['context'], event: CarouselSchema['event']) => {
        if (event.type === 'DRAG_START')
          ctx.dragStartX = ctx.dragCurrentX = event.x
      },
    ],
  },
}
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
    idle: { effects: ['checkAutoPlay'], on: navigationEvents },
    dragging: {
      on: {
        ...navigationEvents,
        DRAG: {
          actions: [
            (ctx, event) => {
              if (event.type === 'DRAG') ctx.dragCurrentX = event.x
            },
          ],
        },
        DRAG_END: {
          target: 'idle',
          actions: [
            (ctx) => {
              const delta = ctx.dragCurrentX - ctx.dragStartX
              if (Math.abs(delta) > 50)
                ctx.index = clampIndex(
                  ctx.index + (delta < 0 ? 1 : -1),
                  positionCount(ctx),
                  ctx.loop,
                )
              ctx.dragStartX = ctx.dragCurrentX = 0
            },
          ],
        },
      },
    },
    'auto-playing': {
      effects: ['autoPlayTimer'],
      on: {
        ...navigationEvents,
        AUTO_NEXT: [
          {
            guard: (ctx) => !ctx.loop && ctx.index >= positionCount(ctx) - 1,
            target: 'idle',
            actions: [
              (ctx) => {
                ctx.autoPlay = false
              },
            ],
          },
          { actions: [move(1)] },
        ],
      },
    },
  },
  computed: {
    hasPrev: (ctx) => positionCount(ctx) > 1 && (ctx.loop || ctx.index > 0),
    hasNext: (ctx) =>
      positionCount(ctx) > 1 &&
      (ctx.loop || ctx.index < positionCount(ctx) - 1),
    canLoop: (ctx) => ctx.loop && positionCount(ctx) > 1,
    dragOffset: (ctx) => ctx.dragCurrentX - ctx.dragStartX,
    slidePercent: (ctx) => (ctx.total > 0 ? (ctx.index / ctx.total) * 100 : 0),
  },
  watch: { index: (ctx) => ctx.onIndexChange?.({ index: ctx.index }) },
  implementations: {
    effects: {
      autoPlayTimer: (ctx, send) => {
        if (!ctx.autoPlay) return
        const interval = Number.isFinite(ctx.autoPlayInterval)
          ? Math.max(100, ctx.autoPlayInterval)
          : 3000
        const timer = setInterval(() => send({ type: 'AUTO_NEXT' }), interval)
        return () => clearInterval(timer)
      },
      checkAutoPlay: (ctx, send) => {
        let cancelled = false
        if (ctx.autoPlay)
          queueMicrotask(() => {
            if (!cancelled) send({ type: 'PLAY' })
          })
        return () => {
          cancelled = true
        }
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
  'aria-hidden'?: boolean
  role?: string
  'aria-roledescription'?: string
  'aria-label'?: string
  'aria-live'?: 'polite' | 'off'
  'aria-pressed'?: boolean
  disabled?: boolean
  tabIndex?: number
  style?: Record<string, string>
  onPointerDown?: (e: { clientX: number; clientY?: number }) => void
  onPointerMove?: (e: { clientX: number; clientY?: number }) => void
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
          const prevKey =
            ctx.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
          const nextKey =
            ctx.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
          if (e.key === prevKey) send({ type: 'PREV' })
          if (e.key === nextKey) send({ type: 'NEXT' })
        },
      }
    },

    getViewportProps(): CarouselPartProps {
      return {
        ...carouselAnatomy.getPartAttrs('viewport'),
        'data-orientation': ctx.orientation,
        'aria-live': isAutoPlaying ? 'off' : 'polite',
        'data-state': stateValue,
        style: isDragging
          ? { cursor: 'grabbing', userSelect: 'none' }
          : ({ cursor: ctx.total > 1 ? 'grab' : undefined } as Record<
              string,
              string
            >),
        onPointerDown: (e) => {
          send({
            type: 'DRAG_START',
            x: ctx.orientation === 'vertical' ? (e.clientY ?? 0) : e.clientX,
          })
        },
        onPointerMove: (e) => {
          if (isDragging) {
            send({
              type: 'DRAG',
              x: ctx.orientation === 'vertical' ? (e.clientY ?? 0) : e.clientX,
            })
          }
        },
        onPointerUp: () => {
          if (isDragging) {
            send({ type: 'DRAG_END' })
          }
        },
      }
    },

    getSlideProps(index: number): CarouselPartProps & { inert?: string } {
      const isCurrent =
        index >= ctx.index && index < ctx.index + ctx.slidesPerView
      return {
        ...carouselAnatomy.getPartAttrs('slide'),
        inert: isCurrent ? undefined : '',
        'aria-hidden': !isCurrent,
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
        role: 'group',
      }
    },

    getIndicatorItemProps(index: number): CarouselPartProps {
      const isCurrent = index === ctx.index
      return {
        ...carouselAnatomy.getPartAttrs('indicator-item'),
        role: 'button',
        tabIndex: 0,
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
