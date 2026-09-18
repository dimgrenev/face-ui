/**
 * @face-ui/core — Navigation Machine
 *
 * Framework-agnostic FSM for horizontal/vertical navigation with hover dropdowns.
 * Composition of Bar + Overlay pattern (like Notion's nav menu).
 *
 * Supports:
 * - Hover to open dropdown for items with sub-items
 * - Mouse leave closes after a configurable delay
 * - Active item tracking
 * - Horizontal and vertical orientation
 * - Keyboard navigation (ArrowLeft/Right for horizontal, ArrowUp/Down for vertical)
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const navigationAnatomy = createAnatomy('navigation').parts(
  'root',
  'list',
  'item',
  'trigger',
  'content',
  'link',
  'indicator',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface NavigationContext {
  [key: string]: unknown
  openItemId: string | null
  activeId: string | null
  focusedId: string | null
  itemOrder: string[]
  disabledIds: string[]
  orientation: 'horizontal' | 'vertical'
  closeDelay: number
  onActiveChange: ((details: { id: string }) => void) | null
}

type NavigationState = 'idle' | 'open' | 'closing'

type NavigationEvent =
  | { type: 'OPEN_ITEM'; id: string }
  | { type: 'CLOSE' }
  | { type: 'SET_ACTIVE'; id: string }
  | { type: 'FOCUS_ITEM'; id: string }
  | { type: 'MOUSE_ENTER'; id: string }
  | { type: 'MOUSE_LEAVE' }
  | { type: 'CANCEL_CLOSE' }
  | { type: 'NAVIGATE_NEXT' }
  | { type: 'NAVIGATE_PREV' }
  | { type: 'NAVIGATE_FIRST' }
  | { type: 'NAVIGATE_LAST' }

export interface NavigationSchema extends MachineSchema {
  context: NavigationContext
  state: NavigationState
  event: NavigationEvent
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const openItem = (ctx: NavigationContext, event: NavigationEvent): void => {
  const e = event as { type: 'OPEN_ITEM'; id: string }
  ctx.openItemId = e.id
}

const closeItem = (ctx: NavigationContext): void => {
  ctx.openItemId = null
}

const setActive = (ctx: NavigationContext, event: NavigationEvent): void => {
  const e = event as { type: 'SET_ACTIVE'; id: string }
  ctx.activeId = e.id
  ctx.focusedId = e.id
}

const handleMouseEnter = (
  ctx: NavigationContext,
  event: NavigationEvent,
): void => {
  const e = event as { type: 'MOUSE_ENTER'; id: string }
  ctx.openItemId = e.id
}

const setFocusedItem = (
  ctx: NavigationContext,
  event: NavigationEvent,
): void => {
  const e = event as { type: 'FOCUS_ITEM'; id: string }
  ctx.focusedId = e.id
}

const getEnabledItemIds = (ctx: NavigationContext): string[] =>
  ctx.itemOrder.filter((id) => !ctx.disabledIds.includes(id))

const focusByOffset = (ctx: NavigationContext, delta: 1 | -1): void => {
  const enabledIds = getEnabledItemIds(ctx)
  if (enabledIds.length === 0) return
  const currentId = ctx.focusedId ?? ctx.activeId
  const currentIndex = currentId ? enabledIds.indexOf(currentId) : -1
  const nextIndex =
    currentIndex < 0
      ? delta > 0
        ? 0
        : enabledIds.length - 1
      : (currentIndex + delta + enabledIds.length) % enabledIds.length
  ctx.focusedId = enabledIds[nextIndex]
}

const focusFirstItem = (ctx: NavigationContext): void => {
  const enabledIds = getEnabledItemIds(ctx)
  if (enabledIds.length > 0) ctx.focusedId = enabledIds[0]
}

const focusLastItem = (ctx: NavigationContext): void => {
  const enabledIds = getEnabledItemIds(ctx)
  if (enabledIds.length > 0) ctx.focusedId = enabledIds[enabledIds.length - 1]
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

const openedEvents = {
  OPEN_ITEM: {
    target: 'open' as const,
    actions: [openItem],
  },
  MOUSE_ENTER: {
    target: 'open' as const,
    actions: [handleMouseEnter],
  },
  CLOSE: {
    target: 'idle' as const,
    actions: [closeItem],
  },
  MOUSE_LEAVE: { target: 'closing' as const },
  CANCEL_CLOSE: { target: 'open' as const },
  SET_ACTIVE: {
    actions: [setActive],
  },
  FOCUS_ITEM: {
    actions: [setFocusedItem],
  },
  NAVIGATE_NEXT: {
    actions: [(ctx: NavigationContext) => focusByOffset(ctx, 1)],
  },
  NAVIGATE_PREV: {
    actions: [(ctx: NavigationContext) => focusByOffset(ctx, -1)],
  },
  NAVIGATE_FIRST: {
    actions: [focusFirstItem],
  },
  NAVIGATE_LAST: {
    actions: [focusLastItem],
  },
}

export const navigationMachine = createMachine<NavigationSchema>({
  id: 'navigation',
  initial: 'idle',
  context: {
    openItemId: null,
    activeId: null,
    focusedId: null,
    itemOrder: [],
    disabledIds: [],
    orientation: 'horizontal',
    closeDelay: 200,
    onActiveChange: null,
  },

  watch: {
    activeId: (ctx: NavigationContext) => {
      if (ctx.activeId != null) {
        ctx.onActiveChange?.({ id: ctx.activeId })
      }
    },
  },

  states: {
    idle: {
      on: {
        OPEN_ITEM: {
          target: 'open',
          actions: [openItem],
        },
        MOUSE_ENTER: {
          target: 'open',
          actions: [handleMouseEnter],
        },
        SET_ACTIVE: {
          actions: [setActive],
        },
        FOCUS_ITEM: {
          actions: [setFocusedItem],
        },
        NAVIGATE_NEXT: {
          actions: [(ctx) => focusByOffset(ctx, 1)],
        },
        NAVIGATE_PREV: {
          actions: [(ctx) => focusByOffset(ctx, -1)],
        },
        NAVIGATE_FIRST: {
          actions: [focusFirstItem],
        },
        NAVIGATE_LAST: {
          actions: [focusLastItem],
        },
      },
    },

    open: { on: openedEvents },
    closing: { on: openedEvents, effects: ['closeAfterDelay'] },
  },
  implementations: {
    effects: {
      closeAfterDelay: (ctx, send) => {
        const timer = setTimeout(() => send({ type: 'CLOSE' }), ctx.closeDelay)
        return () => clearTimeout(timer)
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

interface NavItemConnectProps {
  id: string
  hasItems?: boolean
  disabled?: boolean
}

export function connectNavigation(
  state: MachineSnapshot<NavigationSchema>,
  send: SendFn<NavigationSchema>,
) {
  const ctx = state.context
  const isOpen = ctx.openItemId !== null
  const attrs = navigationAnatomy.getPartAttrs
  const isHorizontal = ctx.orientation === 'horizontal'
  const firstEnabledId = ctx.itemOrder.find(
    (id) => !ctx.disabledIds.includes(id),
  )
  const tabStopId = [ctx.focusedId, ctx.activeId, firstEnabledId].find(
    (id) => id && ctx.itemOrder.includes(id) && !ctx.disabledIds.includes(id),
  )

  // Delay close helper — used by mouse leave handlers
  const scheduleClose = () => send({ type: 'MOUSE_LEAVE' })
  const cancelScheduledClose = () => send({ type: 'CANCEL_CLOSE' })

  return {
    /** Whether any dropdown is open */
    isOpen,
    /** Currently open item ID */
    openItemId: ctx.openItemId,
    /** Currently active item ID */
    activeId: ctx.activeId,

    getRootProps() {
      return {
        ...attrs('root'),
        role: 'navigation' as const,
        'data-orientation': ctx.orientation,
      }
    },

    getListProps() {
      return {
        ...attrs('list'),
        role: 'menubar' as const,
        'aria-orientation': ctx.orientation,
        'data-orientation': ctx.orientation,
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
          const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

          switch (event.key) {
            case nextKey:
              event.preventDefault()
              send({ type: 'NAVIGATE_NEXT' })
              break
            case prevKey:
              event.preventDefault()
              send({ type: 'NAVIGATE_PREV' })
              break
            case 'Home':
              event.preventDefault()
              send({ type: 'NAVIGATE_FIRST' })
              break
            case 'End':
              event.preventDefault()
              send({ type: 'NAVIGATE_LAST' })
              break
            case 'Escape':
              event.preventDefault()
              send({ type: 'CLOSE' })
              break
          }
        },
      }
    },

    getItemProps(props: NavItemConnectProps) {
      const isActive = ctx.activeId === props.id
      const isItemOpen = ctx.openItemId === props.id
      const isDisabled = props.disabled

      return {
        ...attrs('item'),
        'data-active': isActive ? '' : undefined,
        'data-state': isItemOpen ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.id,
        onMouseEnter() {
          if (!isDisabled && props.hasItems) {
            cancelScheduledClose()
            send({ type: 'MOUSE_ENTER', id: props.id })
          }
        },
        onMouseLeave() {
          if (props.hasItems) {
            scheduleClose()
          }
        },
      }
    },

    getTriggerProps(props: NavItemConnectProps) {
      const isItemOpen = ctx.openItemId === props.id
      const isDisabled = props.disabled
      const isTabStop = tabStopId === props.id

      return {
        ...attrs('trigger'),
        role: 'menuitem' as const,
        'aria-haspopup': props.hasItems ? ('menu' as const) : undefined,
        'aria-expanded': props.hasItems ? isItemOpen : undefined,
        'data-state': isItemOpen ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'aria-disabled': isDisabled || undefined,
        disabled: isDisabled,
        'data-value': props.id,
        tabIndex: isDisabled ? -1 : isTabStop ? 0 : -1,
        onClick() {
          if (isDisabled) return
          if (props.hasItems) {
            if (isItemOpen) {
              send({ type: 'CLOSE' })
            } else {
              send({ type: 'OPEN_ITEM', id: props.id })
            }
          } else {
            send({ type: 'SET_ACTIVE', id: props.id })
          }
        },
        onFocus() {
          if (!isDisabled) {
            send({ type: 'FOCUS_ITEM', id: props.id })
          }
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (isDisabled) return
          const openKey = isHorizontal ? 'ArrowDown' : 'ArrowRight'

          switch (event.key) {
            case openKey:
              if (props.hasItems) {
                event.preventDefault()
                send({ type: 'OPEN_ITEM', id: props.id })
              }
              break
            case 'Escape':
              event.preventDefault()
              send({ type: 'CLOSE' })
              break
          }
        },
      }
    },

    getContentProps(props: NavItemConnectProps) {
      const isItemOpen = ctx.openItemId === props.id

      return {
        ...attrs('content'),
        role: 'menu' as const,
        'data-state': isItemOpen ? 'open' : 'closed',
        'data-value': props.id,
        hidden: !isItemOpen,
        onMouseEnter() {
          cancelScheduledClose()
        },
        onMouseLeave() {
          scheduleClose()
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Escape') {
            event.preventDefault()
            send({ type: 'CLOSE' })
          }
        },
      }
    },

    getLinkProps(props: { id: string; disabled?: boolean }) {
      const isActive = ctx.activeId === props.id
      const isDisabled = props.disabled

      return {
        ...attrs('link'),
        role: 'menuitem' as const,
        'aria-current': isActive ? ('page' as const) : undefined,
        'data-active': isActive ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'aria-disabled': isDisabled || undefined,
        disabled: isDisabled,
        'data-value': props.id,
        tabIndex: isDisabled ? -1 : 0,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SET_ACTIVE', id: props.id })
            send({ type: 'CLOSE' })
          }
        },
      }
    },

    getIndicatorProps() {
      return {
        ...attrs('indicator'),
        'data-state': isOpen ? 'open' : 'closed',
        'aria-hidden': true as const,
      }
    },
  }
}
