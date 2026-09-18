/**
 * @face-ui/core — Modal Machine
 *
 * Unifies centered and edge-aligned modal behavior into a single FSM.
 *
 * - variant='center'                     -> classic dialog
 * - variant='left'|'right'|'top'|'bottom' -> edge-aligned surface
 * - closable=false                       -> explicit dismissal only
 */

import { getFocusableElements, registerLayer } from '../runtime/layers'
import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const modalAnatomy = createAnatomy('modal').parts(
  'trigger',
  'backdrop',
  'positioner',
  'content',
  'title',
  'description',
  'close',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

type ModalVariant = 'center' | 'left' | 'right' | 'top' | 'bottom'

interface ModalContext {
  [key: string]: unknown
  open: boolean
  variant: ModalVariant
  closable: boolean
  autoFocusOnOpen: boolean
  contentEl: HTMLElement | null
  previousFocusEl: HTMLElement | null
  titleId: string
  descriptionId: string
  onOpenChange: ((details: { open: boolean }) => void) | null
}

type ModalState = 'closed' | 'open'

type ModalEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'BACKDROP_CLICK' }
  | { type: 'ESCAPE' }
  | { type: 'SET_CONTENT'; el: HTMLElement | null }

export interface ModalSchema extends MachineSchema {
  context: ModalContext
  state: ModalState
  event: ModalEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isClosable = (ctx: ModalContext): boolean => ctx.closable

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const syncOpenTrue = (ctx: ModalContext): void => {
  ctx.open = true
}

const syncOpenFalse = (ctx: ModalContext): void => {
  ctx.open = false
}

const setContentEl = (ctx: ModalContext, event: ModalEvent): void => {
  ctx.contentEl = (event as { type: 'SET_CONTENT'; el: HTMLElement | null }).el
  if (ctx.open) focusInitialElement(ctx)
}

function focusInitialElement(ctx: ModalContext): void {
  if (!ctx.autoFocusOnOpen) return
  const el = ctx.contentEl
  if (!el) return
  const focusable = getFocusableElements(el)
  try {
    ;(focusable[0] || el).focus()
  } catch {}
}

function focusInitialElementWhenVisible(
  ctx: ModalContext,
): (() => void) | undefined {
  focusInitialElement(ctx)

  let cancelled = false
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
  const cancel =
    typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : window.clearTimeout

  const frame = schedule(() => {
    if (cancelled || !ctx.open || !ctx.contentEl) return
    const active = document.activeElement
    if (active instanceof HTMLElement && ctx.contentEl.contains(active)) return
    focusInitialElement(ctx)
  })

  return () => {
    cancelled = true
    cancel(frame)
  }
}

function capturePreviousFocus(ctx: ModalContext): void {
  const active = document.activeElement
  ctx.previousFocusEl = active instanceof HTMLElement ? active : null
}

function restorePreviousFocus(ctx: ModalContext): void {
  const previous = ctx.previousFocusEl
  ctx.previousFocusEl = null
  if (!previous || !document.contains(previous)) return
  try {
    previous.focus()
  } catch {}
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const modalMachine = createMachine<ModalSchema>({
  id: 'modal',
  initial: 'closed',

  context: {
    open: false,
    variant: 'center',
    closable: true,
    autoFocusOnOpen: true,
    contentEl: null,
    previousFocusEl: null,
    titleId: '',
    descriptionId: '',
    onOpenChange: null,
  },

  computed: {
    isOpen: (ctx) => ctx.open,
    role: () => 'dialog',
  },

  watch: {
    open: (ctx) => {
      ctx.onOpenChange?.({ open: ctx.open })
    },
  },

  states: {
    closed: {
      entry: [syncOpenFalse],
      effects: ['restoreFocus'],
      on: {
        OPEN: { target: 'open' },
        TOGGLE: { target: 'open' },
        SET_CONTENT: { actions: [setContentEl] },
      },
    },

    open: {
      tags: ['visible'],
      entry: [syncOpenTrue],
      effects: ['trackDocumentEscape', 'focusInitial'],
      on: {
        CLOSE: { target: 'closed' },
        TOGGLE: { target: 'closed' },
        ESCAPE: [{ target: 'closed', guard: isClosable }],
        BACKDROP_CLICK: [{ target: 'closed', guard: isClosable }],
        SET_CONTENT: { actions: [setContentEl] },
      },
    },
  },

  implementations: {
    effects: {
      trackDocumentEscape: (ctx, send) => {
        if (typeof document === 'undefined') return
        capturePreviousFocus(ctx)
        return registerLayer(ctx.contentEl?.ownerDocument ?? document, {
          elements: () => [ctx.contentEl],
          modal: () => ctx.contentEl,
          onEscape: () => send({ type: 'ESCAPE' }),
          onOutside: () => send({ type: 'BACKDROP_CLICK' }),
        })
      },
      focusInitial: (ctx) => {
        if (typeof document === 'undefined') return
        return focusInitialElementWhenVisible(ctx)
      },
      restoreFocus: (ctx) => {
        if (typeof document !== 'undefined') restorePreviousFocus(ctx)
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export interface ModalConnectState {
  value: ModalState
  context: ModalContext
  computed: Record<string, unknown>
  matches: (...states: ModalState[]) => boolean
}

export function connectModal(
  state: ModalConnectState,
  send: (event: ModalEvent | ModalEvent['type']) => void,
) {
  const { context: ctx, computed } = state
  const isOpen = state.matches('open')
  const role = computed['role'] as string
  const attrs = modalAnatomy.getPartAttrs

  return {
    getTriggerProps() {
      return {
        ...attrs('trigger'),
        type: 'button' as const,
        'aria-haspopup': role as 'dialog',
        'aria-expanded': isOpen,
        onClick(event?: { defaultPrevented?: boolean }) {
          if (!event?.defaultPrevented) send({ type: 'TOGGLE' })
        },
      }
    },

    getBackdropProps() {
      return {
        ...attrs('backdrop'),
        hidden: !isOpen,
        'data-state': isOpen ? 'open' : 'closed',
        onClick() {
          send({ type: 'BACKDROP_CLICK' })
        },
      }
    },

    getPositionerProps() {
      return {
        ...attrs('positioner'),
        'data-state': isOpen ? 'open' : 'closed',
        'data-variant': ctx.variant,
      }
    },

    getContentProps() {
      return {
        ...attrs('content'),
        role,
        'aria-modal': true,
        'aria-labelledby': ctx.titleId || undefined,
        'aria-describedby': ctx.descriptionId || undefined,
        'data-state': isOpen ? 'open' : 'closed',
        'data-variant': ctx.variant,
        hidden: !isOpen,
        tabIndex: -1,
      }
    },

    getTitleProps() {
      return {
        ...attrs('title'),
        id: ctx.titleId,
      }
    },

    getDescriptionProps() {
      return {
        ...attrs('description'),
        id: ctx.descriptionId,
      }
    },

    getCloseProps() {
      return {
        ...attrs('close'),
        type: 'button' as const,
        'aria-label': 'Close',
        hidden: !ctx.closable,
        tabIndex: ctx.closable ? 0 : -1,
        onClick(event?: { defaultPrevented?: boolean }) {
          if (!event?.defaultPrevented) send({ type: 'CLOSE' })
        },
      }
    },
  }
}
