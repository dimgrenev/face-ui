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
      on: {
        OPEN: { target: 'open' },
        TOGGLE: { target: 'open' },
        SET_CONTENT: { actions: [setContentEl] },
      },
    },

    open: {
      tags: ['visible'],
      entry: [syncOpenTrue],
      effects: ['trackDocumentEscape'],
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
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            send({ type: 'ESCAPE' })
          }
        }
        document.addEventListener('keydown', onKeyDown)

        const el = ctx.contentEl
        if (el) {
          try { el.focus() } catch {}
        }

        return () => {
          document.removeEventListener('keydown', onKeyDown)
        }
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
        onKeyDown(e: { key: string; preventDefault: () => void }) {
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
