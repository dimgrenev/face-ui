/**
 * @face-ui/core — Modal Machine
 *
 * Unifies Dialog + Drawer + AlertDialog into a single FSM.
 *
 * - variant='center'                     -> classic dialog
 * - variant='left'|'right'|'top'|'bottom' -> drawer / sheet
 * - closable=false                       -> alertdialog (no Escape, no backdrop dismiss)
 */

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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
}

function focusInitialElement(ctx: ModalContext): void {
  const el = ctx.contentEl
  if (!el) return
  const focusable = getFocusableElements(el)
  try { (focusable[0] || el).focus() } catch {}
}

function focusInitialElementWhenVisible(ctx: ModalContext): (() => void) | undefined {
  focusInitialElement(ctx)

  let cancelled = false
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
  const cancel = typeof cancelAnimationFrame === 'function'
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
  try { previous.focus() } catch {}
}

function containTabFocus(ctx: ModalContext, event: { shiftKey?: boolean; preventDefault: () => void }): void {
  const el = ctx.contentEl
  if (!el) return
  const focusable = getFocusableElements(el)
  if (focusable.length === 0) {
    event.preventDefault()
    try { el.focus() } catch {}
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const activeInside = active instanceof HTMLElement && el.contains(active)

  if (event.shiftKey) {
    if (!activeInside || active === first) {
      event.preventDefault()
      try { last.focus() } catch {}
    }
    return
  }

  if (!activeInside || active === last) {
    event.preventDefault()
    try { first.focus() } catch {}
  }
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
    contentEl: null,
    previousFocusEl: null,
    titleId: '',
    descriptionId: '',
    onOpenChange: null,
  },

  computed: {
    isOpen: (ctx) => ctx.open,
    role: (ctx) => (ctx.closable ? 'dialog' : 'alertdialog'),
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
        ESCAPE: [
          { target: 'closed', guard: isClosable },
        ],
        BACKDROP_CLICK: [
          { target: 'closed', guard: isClosable },
        ],
        SET_CONTENT: { actions: [setContentEl] },
      },
    },
  },

  implementations: {
    effects: {
      trackDocumentEscape: (ctx, send) => {
        capturePreviousFocus(ctx)
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            send({ type: 'ESCAPE' })
          }
        }
        document.addEventListener('keydown', onKeyDown)

        return () => {
          document.removeEventListener('keydown', onKeyDown)
        }
      },
      focusInitial: (ctx) => {
        return focusInitialElementWhenVisible(ctx)
      },
      restoreFocus: (ctx) => {
        restorePreviousFocus(ctx)
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
        onClick() {
          send({ type: 'TOGGLE' })
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
        onKeyDown(e: { key: string; shiftKey?: boolean; preventDefault: () => void }) {
          if (e.key === 'Tab') {
            containTabFocus(ctx, e)
          }
          if (e.key === 'Escape') {
            send({ type: 'ESCAPE' })
          }
        },
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
        onClick() {
          send({ type: 'CLOSE' })
        },
      }
    },
  }
}
