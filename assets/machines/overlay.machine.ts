/**
 * @face-ui/core — Overlay Machine
 *
 * Unifies Tooltip + Popover + HoverCard into a single FSM.
 *
 * - trigger='hover'                -> tooltip (non-interactive, delay-based)
 * - trigger='click'                -> popover (interactive, toggle + dismiss)
 * - trigger='hover' + interactive  -> hovercard (hover-triggered, interactive content)
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const overlayAnatomy = createAnatomy('overlay').parts(
  'trigger',
  'content',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

type OverlayTrigger = 'hover' | 'click'

interface OverlayPositioning {
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

interface OverlayContext {
  [key: string]: unknown
  open: boolean
  trigger: OverlayTrigger
  interactive: boolean
  openDelay: number
  closeDelay: number
  positioning: OverlayPositioning
  _timerId: ReturnType<typeof setTimeout> | null
  onOpenChange: ((details: { open: boolean }) => void) | null
}

type OverlayState = 'closed' | 'opening' | 'open' | 'closing'

type OverlayEvent =
  | { type: 'POINTER_ENTER' }
  | { type: 'POINTER_LEAVE' }
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'CLICK' }
  | { type: 'OPEN_DELAY_DONE' }
  | { type: 'CLOSE_DELAY_DONE' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS' }
  | { type: 'RECONFIGURE' }

export interface OverlaySchema extends MachineSchema {
  context: OverlayContext
  state: OverlayState
  event: OverlayEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isHoverTrigger = (ctx: OverlayContext): boolean => ctx.trigger === 'hover'

const isClickTrigger = (ctx: OverlayContext): boolean => ctx.trigger === 'click'

const hasOpenDelay = (ctx: OverlayContext): boolean => ctx.openDelay > 0

const hasCloseDelay = (ctx: OverlayContext): boolean => ctx.closeDelay > 0

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const syncOpenTrue = (ctx: OverlayContext): void => {
  ctx.open = true
}

const syncOpenFalse = (ctx: OverlayContext): void => {
  ctx.open = false
}

const clearTimer = (ctx: OverlayContext): void => {
  if (ctx._timerId !== null) {
    clearTimeout(ctx._timerId)
    ctx._timerId = null
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const overlayMachine = createMachine<OverlaySchema>({
  id: 'overlay',
  initial: 'closed',

  context: {
    open: false,
    trigger: 'hover',
    interactive: false,
    openDelay: 200,
    closeDelay: 0,
    positioning: { side: 'top', align: 'center', sideOffset: 8 },
    _timerId: null,
    onOpenChange: null,
  },

  computed: {
    isOpen: (_ctx, { matches }) => matches('open', 'closing'),
  },

  watch: {
    open: (ctx) => {
      ctx.onOpenChange?.({ open: ctx.open })
    },
  },

  states: {
    closed: {
      entry: [syncOpenFalse, clearTimer],
      on: {
        // Hover trigger: enter → opening (with delay)
        POINTER_ENTER: [
          {
            target: 'opening',
            guard: (ctx) => isHoverTrigger(ctx) && hasOpenDelay(ctx),
          },
          { target: 'open', guard: isHoverTrigger },
        ],
        FOCUS: [
          {
            target: 'opening',
            guard: (ctx) => isHoverTrigger(ctx) && hasOpenDelay(ctx),
          },
          { target: 'open', guard: isHoverTrigger },
        ],
        // Click trigger: toggle
        CLICK: [{ target: 'open', guard: isClickTrigger }],
        // Programmatic
        OPEN: { target: 'open' },
      },
    },

    opening: {
      effects: ['trackOpenDelay'],
      on: {
        RECONFIGURE: [
          { target: 'closed', guard: isClickTrigger },
          { target: 'opening', reenter: true },
        ],
        OPEN: { target: 'open' },
        OPEN_DELAY_DONE: { target: 'open' },
        // Cancel on leave before delay completes
        POINTER_LEAVE: [{ target: 'closed', guard: isHoverTrigger }],
        BLUR: [{ target: 'closed', guard: isHoverTrigger }],
        CLOSE: { target: 'closed' },
      },
      exit: [clearTimer],
    },

    open: {
      tags: ['visible'],
      entry: [syncOpenTrue],
      on: {
        // Hover trigger: leave → closing or closed
        POINTER_LEAVE: [
          {
            target: 'closing',
            guard: (ctx) => isHoverTrigger(ctx) && hasCloseDelay(ctx),
          },
          { target: 'closed', guard: isHoverTrigger },
        ],
        BLUR: [
          {
            target: 'closing',
            guard: (ctx) => isHoverTrigger(ctx) && hasCloseDelay(ctx),
          },
          { target: 'closed', guard: isHoverTrigger },
        ],
        // Hover re-enter content (interactive mode): stay open
        POINTER_ENTER: [
          // If interactive hover, cancel any pending close by staying open
          { guard: (ctx) => isHoverTrigger(ctx) && ctx.interactive },
        ],
        // Click trigger: click toggles off
        CLICK: [{ target: 'closed', guard: isClickTrigger }],
        // Dismiss (Escape + outside click) for click mode
        DISMISS: { target: 'closed' },
        CLOSE: { target: 'closed' },
      },
    },

    closing: {
      effects: ['trackCloseDelay'],
      on: {
        RECONFIGURE: [
          { target: 'open', guard: isClickTrigger },
          { target: 'closing', reenter: true },
        ],
        CLOSE_DELAY_DONE: { target: 'closed' },
        // Re-enter before delay: go back to open
        POINTER_ENTER: [
          {
            target: 'open',
            guard: (ctx) => isHoverTrigger(ctx) && ctx.interactive,
          },
          { target: 'open', guard: isHoverTrigger },
        ],
        FOCUS: [{ target: 'open', guard: isHoverTrigger }],
        OPEN: { target: 'open' },
        CLOSE: { target: 'closed' },
      },
      exit: [clearTimer],
    },
  },

  implementations: {
    effects: {
      trackOpenDelay: (ctx, send) => {
        ctx._timerId = setTimeout(() => {
          send({ type: 'OPEN_DELAY_DONE' })
        }, ctx.openDelay)

        return () => {
          clearTimer(ctx)
        }
      },

      trackCloseDelay: (ctx, send) => {
        ctx._timerId = setTimeout(() => {
          send({ type: 'CLOSE_DELAY_DONE' })
        }, ctx.closeDelay)

        return () => {
          clearTimer(ctx)
        }
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export interface OverlayConnectState {
  value: OverlayState
  context: OverlayContext
  computed: Record<string, unknown>
  matches: (...states: OverlayState[]) => boolean
}

export function connectOverlay(
  state: OverlayConnectState,
  send: (event: OverlayEvent | OverlayEvent['type']) => void,
) {
  const { context: ctx } = state
  const isOpen = state.matches('open', 'closing')
  const attrs = overlayAnatomy.getPartAttrs

  const triggerIsHover = ctx.trigger === 'hover'
  const triggerIsClick = ctx.trigger === 'click'

  return {
    getTriggerProps() {
      return {
        ...attrs('trigger'),
        'aria-expanded': isOpen,
        'data-state': isOpen ? 'open' : 'closed',

        // Hover triggers
        ...(triggerIsHover && {
          onPointerEnter() {
            send({ type: 'POINTER_ENTER' })
          },
          onPointerLeave() {
            send({ type: 'POINTER_LEAVE' })
          },
          onFocus() {
            send({ type: 'FOCUS' })
          },
          onBlur() {
            send({ type: 'BLUR' })
          },
        }),

        // Click trigger
        ...(triggerIsClick && {
          onClick(event?: { defaultPrevented?: boolean }) {
            if (!event?.defaultPrevented) send({ type: 'CLICK' })
          },
        }),
      }
    },

    getContentProps() {
      return {
        ...attrs('content'),
        role: triggerIsHover && !ctx.interactive ? 'tooltip' : undefined,
        hidden: !isOpen,
        'data-state': isOpen ? 'open' : 'closed',
        'data-side': ctx.positioning.side,
        'data-align': ctx.positioning.align,

        // Interactive hover: pointer on content keeps it open
        ...(triggerIsHover &&
          ctx.interactive && {
            onPointerEnter() {
              send({ type: 'POINTER_ENTER' })
            },
            onPointerLeave() {
              send({ type: 'POINTER_LEAVE' })
            },
          }),
      }
    },
  }
}
