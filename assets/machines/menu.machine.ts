/**
 * @face-ui/core — Menu Machine
 *
 * Unifies ContextMenu + DropdownMenu into a single FSM.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const menuAnatomy = createAnatomy('menu').parts(
  'trigger',
  'content',
  'item',
  'separator',
  'group',
  'group-label',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

type MenuTrigger = 'click' | 'context'

interface MenuContext {
  [key: string]: unknown
  open: boolean
  trigger: MenuTrigger
  highlightedValue: string | null
  disabled: boolean
  triggerEl: HTMLElement | null
  contentEl: HTMLElement | null
  onSelect: ((details: { value: string }) => void) | null
  onOpenChange: ((details: { open: boolean }) => void) | null
}

type MenuState = 'closed' | 'open'

type MenuEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'DISMISS' }
  | { type: 'HIGHLIGHT'; value: string }
  | { type: 'SELECT'; value: string }
  | { type: 'NAVIGATE_UP' }
  | { type: 'NAVIGATE_DOWN' }
  | { type: 'SET_TRIGGER'; el: HTMLElement | null }
  | { type: 'SET_CONTENT'; el: HTMLElement | null }

export interface MenuSchema extends MachineSchema {
  context: MenuContext
  state: MenuState
  event: MenuEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: MenuContext): boolean => !ctx.disabled

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const syncOpenTrue = (ctx: MenuContext): void => {
  ctx.open = true
}

const syncOpenFalse = (ctx: MenuContext): void => {
  ctx.open = false
  ctx.highlightedValue = null
}

const setHighlighted = (ctx: MenuContext, event: MenuEvent): void => {
  ctx.highlightedValue = (event as { type: 'HIGHLIGHT'; value: string }).value
}

const selectItem = (ctx: MenuContext, event: MenuEvent): void => {
  const value = (event as { type: 'SELECT'; value: string }).value
  ctx.onSelect?.({ value })
}

const setTriggerEl = (ctx: MenuContext, event: MenuEvent): void => {
  ctx.triggerEl = (event as { type: 'SET_TRIGGER'; el: HTMLElement | null }).el
}

const setContentEl = (ctx: MenuContext, event: MenuEvent): void => {
  ctx.contentEl = (event as { type: 'SET_CONTENT'; el: HTMLElement | null }).el
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const menuMachine = createMachine<MenuSchema>({
  id: 'menu',
  initial: 'closed',

  context: {
    open: false,
    trigger: 'click',
    highlightedValue: null,
    disabled: false,
    triggerEl: null,
    contentEl: null,
    onSelect: null,
    onOpenChange: null,
  },

  computed: {
    isOpen: (ctx) => ctx.open,
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
        OPEN: [{ target: 'open', guard: isNotDisabled }],
        TOGGLE: [{ target: 'open', guard: isNotDisabled }],
        SET_TRIGGER: { actions: [setTriggerEl] },
        SET_CONTENT: { actions: [setContentEl] },
      },
    },

    open: {
      tags: ['visible'],
      entry: [syncOpenTrue],
      effects: ['trackDismiss', 'trackContextMenu'],
      on: {
        CLOSE: { target: 'closed' },
        TOGGLE: { target: 'closed' },
        DISMISS: { target: 'closed' },
        HIGHLIGHT: { actions: [setHighlighted] },
        SELECT: {
          target: 'closed',
          actions: [selectItem],
        },
        NAVIGATE_UP: { actions: ['navigateUp'] },
        NAVIGATE_DOWN: { actions: ['navigateDown'] },
        SET_TRIGGER: { actions: [setTriggerEl] },
        SET_CONTENT: { actions: [setContentEl] },
      },
    },
  },

  implementations: {
    actions: {
      navigateUp: (ctx) => {
        // Navigation is delegated to the connect layer via getItemProps
        // The machine stores highlightedValue; the adapter reads DOM siblings
        // This is a placeholder for adapter integration
        void ctx
      },
      navigateDown: (ctx) => {
        void ctx
      },
    },

    effects: {
      trackDismiss: (ctx, send) => {
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            send({ type: 'DISMISS' })
          }
        }

        const onPointerDown = (e: MouseEvent) => {
          const target = e.target as Node | null
          if (!target) return
          const isInsideTrigger = ctx.triggerEl?.contains(target) ?? false
          const isInsideContent = ctx.contentEl?.contains(target) ?? false
          if (!isInsideTrigger && !isInsideContent) {
            send({ type: 'DISMISS' })
          }
        }

        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown)

        return () => {
          document.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('pointerdown', onPointerDown)
        }
      },

      trackContextMenu: (ctx, send) => {
        // Only attach context menu listener for context trigger
        if (ctx.trigger !== 'context') return

        const el = ctx.triggerEl
        if (!el) return

        const onContextMenu = (e: MouseEvent) => {
          e.preventDefault()
          send({ type: 'OPEN' })
        }

        el.addEventListener('contextmenu', onContextMenu)

        return () => {
          el.removeEventListener('contextmenu', onContextMenu)
        }
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export interface MenuConnectState {
  value: MenuState
  context: MenuContext
  computed: Record<string, unknown>
  matches: (...states: MenuState[]) => boolean
}

interface MenuItemProps {
  value: string
  disabled?: boolean
}

export function connectMenu(
  state: MenuConnectState,
  send: (event: MenuEvent | MenuEvent['type']) => void,
) {
  const { context: ctx } = state
  const isOpen = state.matches('open')
  const attrs = menuAnatomy.getPartAttrs
  const triggerIsClick = ctx.trigger === 'click'
  const triggerIsContext = ctx.trigger === 'context'

  return {
    getTriggerProps() {
      return {
        ...attrs('trigger'),
        'aria-haspopup': 'menu' as const,
        'aria-expanded': isOpen,
        'data-state': isOpen ? 'open' : 'closed',
        disabled: ctx.disabled || undefined,

        // Click trigger: toggle on click
        ...(triggerIsClick && {
          onClick() {
            send({ type: 'TOGGLE' })
          },
        }),

        // Context trigger: right-click handled by effect,
        // but still need onContextMenu for adapter-level prevention
        ...(triggerIsContext && {
          onContextMenu(e: { preventDefault: () => void }) {
            e.preventDefault()
            send({ type: 'OPEN' })
          },
        }),

        onKeyDown(e: { key: string; preventDefault: () => void }) {
          if (ctx.disabled) return
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            send({ type: 'OPEN' })
          }
        },
      }
    },

    getContentProps() {
      return {
        ...attrs('content'),
        role: 'menu',
        'aria-orientation': 'vertical' as const,
        hidden: !isOpen,
        'data-state': isOpen ? 'open' : 'closed',
        tabIndex: 0,

        onKeyDown(e: { key: string; preventDefault: () => void }) {
          switch (e.key) {
            case 'ArrowUp': {
              e.preventDefault()
              send({ type: 'NAVIGATE_UP' })
              break
            }
            case 'ArrowDown': {
              e.preventDefault()
              send({ type: 'NAVIGATE_DOWN' })
              break
            }
            case 'Escape': {
              e.preventDefault()
              send({ type: 'DISMISS' })
              break
            }
            case 'Home': {
              e.preventDefault()
              send({ type: 'NAVIGATE_UP' })
              break
            }
            case 'End': {
              e.preventDefault()
              send({ type: 'NAVIGATE_DOWN' })
              break
            }
          }
        },
      }
    },

    getItemProps(props: MenuItemProps) {
      const { value, disabled: itemDisabled } = props
      const isHighlighted = ctx.highlightedValue === value

      return {
        ...attrs('item'),
        role: 'menuitem',
        'data-value': value,
        'data-highlighted': isHighlighted ? '' : undefined,
        'data-disabled': itemDisabled ? '' : undefined,
        tabIndex: isHighlighted ? 0 : -1,

        onPointerEnter() {
          if (!itemDisabled) {
            send({ type: 'HIGHLIGHT', value })
          }
        },

        onPointerLeave() {
          send({ type: 'HIGHLIGHT', value: '' })
        },

        onClick() {
          if (!itemDisabled) {
            send({ type: 'SELECT', value })
          }
        },

        onKeyDown(e: { key: string; preventDefault: () => void }) {
          if (itemDisabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            send({ type: 'SELECT', value })
          }
        },
      }
    },

    getSeparatorProps() {
      return {
        ...attrs('separator'),
        role: 'separator',
      }
    },

    getGroupProps() {
      return {
        ...attrs('group'),
        role: 'group',
      }
    },

    getGroupLabelProps() {
      return {
        ...attrs('group-label'),
        role: 'presentation',
      }
    },
  }
}
