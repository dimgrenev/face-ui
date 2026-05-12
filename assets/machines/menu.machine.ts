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
  highlightedByKeyboard: boolean
  itemOrder: string[]
  disabledValues: string[]
  itemLabels: Record<string, string>
  typeaheadQuery: string
  typeaheadLastAt: number
  disabled: boolean
  triggerEl: HTMLElement | null
  contentEl: HTMLElement | null
  onSelect: ((details: { value: string }) => void) | null
  onOpenChange: ((details: { open: boolean }) => void) | null
}

type MenuState = 'closed' | 'open'

type MenuEvent =
  | { type: 'OPEN' }
  | { type: 'OPEN_FIRST' }
  | { type: 'OPEN_LAST' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'DISMISS' }
  | { type: 'HIGHLIGHT'; value: string | null; focus?: boolean }
  | { type: 'SELECT'; value: string }
  | { type: 'SELECT_HIGHLIGHTED' }
  | { type: 'NAVIGATE_UP' }
  | { type: 'NAVIGATE_DOWN' }
  | { type: 'NAVIGATE_FIRST' }
  | { type: 'NAVIGATE_LAST' }
  | { type: 'TYPEAHEAD'; key: string; now?: number }
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

const TYPEAHEAD_TIMEOUT = 700

const getEnabledValues = (ctx: MenuContext): string[] => {
  if (ctx.disabled) return []
  return ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value))
}

const isEnabledValue = (ctx: MenuContext, value: string | null | undefined): value is string =>
  value != null && getEnabledValues(ctx).includes(value)

const isSelectableValue = (ctx: MenuContext, value: string | null | undefined): value is string => {
  if (ctx.disabled || value == null || ctx.disabledValues.includes(value)) return false
  return ctx.itemOrder.length === 0 || ctx.itemOrder.includes(value)
}

const isSelectableEventValue = (ctx: MenuContext, event: MenuEvent): boolean => (
  event.type === 'SELECT' && isSelectableValue(ctx, event.value)
)

const hasHighlightedItem = (ctx: MenuContext): boolean => isEnabledValue(ctx, ctx.highlightedValue)

const normalizeTypeaheadKey = (key: string): string | null => {
  if (key.length !== 1) return null
  return key.toLocaleLowerCase()
}

const isRepeatedQuery = (query: string): boolean => (
  query.length > 1 && Array.from(query).every((char) => char === query[0])
)

const getItemLabel = (ctx: MenuContext, value: string): string => (
  ctx.itemLabels[value] || value
)

const findTypeaheadMatch = (ctx: MenuContext, query: string): string | null => {
  const enabled = getEnabledValues(ctx)
  if (enabled.length === 0) return null

  const search = isRepeatedQuery(query) ? query[0] : query
  const currentIndex = ctx.highlightedValue ? enabled.indexOf(ctx.highlightedValue) : -1

  for (let offset = 1; offset <= enabled.length; offset += 1) {
    const index = currentIndex < 0
      ? offset - 1
      : (currentIndex + offset) % enabled.length
    const value = enabled[index]
    const label = getItemLabel(ctx, value).trim().toLocaleLowerCase()
    if (label.startsWith(search)) return value
  }

  return null
}

const setHighlightedValue = (
  ctx: MenuContext,
  value: string | null,
  highlightedByKeyboard: boolean,
): void => {
  const nextValue = isSelectableValue(ctx, value) ? value : null
  ctx.highlightedValue = nextValue
  ctx.highlightedByKeyboard = Boolean(nextValue && highlightedByKeyboard)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const syncOpenTrue = (ctx: MenuContext): void => {
  ctx.open = true
}

const syncOpenFalse = (ctx: MenuContext): void => {
  ctx.open = false
  ctx.highlightedValue = null
  ctx.highlightedByKeyboard = false
  ctx.typeaheadQuery = ''
  ctx.typeaheadLastAt = 0
}

const setHighlighted = (ctx: MenuContext, event: MenuEvent): void => {
  const { value, focus } = event as { type: 'HIGHLIGHT'; value: string | null; focus?: boolean }
  setHighlightedValue(ctx, value, Boolean(focus))
}

const highlightFirst = (ctx: MenuContext): void => {
  setHighlightedValue(ctx, getEnabledValues(ctx)[0] ?? null, true)
}

const highlightLast = (ctx: MenuContext): void => {
  const enabled = getEnabledValues(ctx)
  setHighlightedValue(ctx, enabled[enabled.length - 1] ?? null, true)
}

const highlightOffset = (ctx: MenuContext, delta: 1 | -1): void => {
  const enabled = getEnabledValues(ctx)
  if (enabled.length === 0) {
    setHighlightedValue(ctx, null, false)
    return
  }

  const currentIndex = ctx.highlightedValue ? enabled.indexOf(ctx.highlightedValue) : -1
  const nextIndex = currentIndex < 0
    ? (delta > 0 ? 0 : enabled.length - 1)
    : (currentIndex + delta + enabled.length) % enabled.length
  setHighlightedValue(ctx, enabled[nextIndex], true)
}

const selectItem = (ctx: MenuContext, event: MenuEvent): void => {
  const value = (event as { type: 'SELECT'; value: string }).value
  ctx.onSelect?.({ value })
}

const selectHighlightedItem = (ctx: MenuContext): void => {
  if (!isEnabledValue(ctx, ctx.highlightedValue)) return
  ctx.onSelect?.({ value: ctx.highlightedValue })
}

const applyTypeahead = (ctx: MenuContext, event: MenuEvent): void => {
  const { key, now = Date.now() } = event as { type: 'TYPEAHEAD'; key: string; now?: number }
  const normalizedKey = normalizeTypeaheadKey(key)
  if (!normalizedKey) return

  const queryPrefix = ctx.typeaheadLastAt > 0 && now - ctx.typeaheadLastAt <= TYPEAHEAD_TIMEOUT
    ? ctx.typeaheadQuery
    : ''
  const nextQuery = `${queryPrefix}${normalizedKey}`
  ctx.typeaheadQuery = nextQuery
  ctx.typeaheadLastAt = now

  const match = findTypeaheadMatch(ctx, nextQuery)
  if (match) setHighlightedValue(ctx, match, true)
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
    highlightedByKeyboard: false,
    itemOrder: [],
    disabledValues: [],
    itemLabels: {},
    typeaheadQuery: '',
    typeaheadLastAt: 0,
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
        OPEN_FIRST: [{ target: 'open', guard: isNotDisabled, actions: [highlightFirst] }],
        OPEN_LAST: [{ target: 'open', guard: isNotDisabled, actions: [highlightLast] }],
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
        OPEN_FIRST: { actions: [highlightFirst] },
        OPEN_LAST: { actions: [highlightLast] },
        TOGGLE: { target: 'closed' },
        DISMISS: { target: 'closed' },
        HIGHLIGHT: { actions: [setHighlighted] },
        SELECT: [{ target: 'closed', guard: isSelectableEventValue, actions: [selectItem] }],
        SELECT_HIGHLIGHTED: [{ target: 'closed', guard: hasHighlightedItem, actions: [selectHighlightedItem] }],
        NAVIGATE_UP: { actions: [(ctx) => highlightOffset(ctx, -1)] },
        NAVIGATE_DOWN: { actions: [(ctx) => highlightOffset(ctx, 1)] },
        NAVIGATE_FIRST: { actions: [highlightFirst] },
        NAVIGATE_LAST: { actions: [highlightLast] },
        TYPEAHEAD: { actions: [applyTypeahead] },
        SET_TRIGGER: { actions: [setTriggerEl] },
        SET_CONTENT: { actions: [setContentEl] },
      },
    },
  },

  implementations: {
    effects: {
      trackDismiss: (ctx, send) => {
        if (typeof document === 'undefined') return

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

type MenuKeyboardEvent = {
  key: string
  preventDefault: () => void
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

const isTypeaheadEvent = (event: MenuKeyboardEvent): boolean => (
  event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey
)

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
          switch (e.key) {
            case 'ArrowDown':
            case 'Enter':
            case ' ': {
              e.preventDefault()
              send({ type: 'OPEN_FIRST' })
              break
            }
            case 'ArrowUp': {
              e.preventDefault()
              send({ type: 'OPEN_LAST' })
              break
            }
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

        onKeyDown(e: MenuKeyboardEvent) {
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
              send({ type: 'NAVIGATE_FIRST' })
              break
            }
            case 'End': {
              e.preventDefault()
              send({ type: 'NAVIGATE_LAST' })
              break
            }
            case 'Enter':
            case ' ': {
              e.preventDefault()
              send({ type: 'SELECT_HIGHLIGHTED' })
              break
            }
            default: {
              if (isTypeaheadEvent(e)) {
                e.preventDefault()
                send({ type: 'TYPEAHEAD', key: e.key })
              }
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
        'aria-disabled': itemDisabled || undefined,
        'data-value': value,
        'data-highlighted': isHighlighted ? '' : undefined,
        'data-disabled': itemDisabled ? '' : undefined,
        disabled: itemDisabled || undefined,
        tabIndex: itemDisabled ? -1 : (isHighlighted ? 0 : -1),

        onPointerEnter() {
          if (!itemDisabled) {
            send({ type: 'HIGHLIGHT', value })
          }
        },

        onPointerLeave() {
          send({ type: 'HIGHLIGHT', value: null })
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
