/**
 * @face-ui/core — Sidebar Machine
 *
 * Framework-agnostic FSM for a collapsible side panel.
 *
 * Supports:
 * - Expanded / collapsed states
 * - Item selection
 * - Nested groups (expandable sub-items)
 * - Configurable expanded/collapsed widths
 * - Keyboard toggle (bracket key)
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const sidebarAnatomy = createAnatomy('sidebar').parts(
  'root',
  'header',
  'content',
  'item',
  'group',
  'groupLabel',
  'toggle',
  'footer',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface SidebarContext {
  [key: string]: unknown
  collapsed: boolean
  selectedId: string | null
  expandedGroups: string[]
  width: number | string
  collapsedWidth: number | string
  onCollapsedChange: ((details: { collapsed: boolean }) => void) | null
  onSelectedChange: ((details: { selectedId: string }) => void) | null
}

type SidebarState = 'expanded' | 'collapsed'

type SidebarEvent =
  | { type: 'TOGGLE_COLLAPSE' }
  | { type: 'SET_COLLAPSED'; collapsed: boolean }
  | { type: 'SELECT'; id: string }
  | { type: 'TOGGLE_GROUP'; id: string }

export interface SidebarSchema extends MachineSchema {
  context: SidebarContext
  state: SidebarState
  event: SidebarEvent
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const syncCollapsedTrue = (ctx: SidebarContext): void => {
  ctx.collapsed = true
}

const syncCollapsedFalse = (ctx: SidebarContext): void => {
  ctx.collapsed = false
}

const selectItem = (ctx: SidebarContext, event: SidebarEvent): void => {
  const e = event as { type: 'SELECT'; id: string }
  ctx.selectedId = e.id
}

const toggleGroup = (ctx: SidebarContext, event: SidebarEvent): void => {
  const e = event as { type: 'TOGGLE_GROUP'; id: string }
  const id = e.id
  if (ctx.expandedGroups.includes(id)) {
    ctx.expandedGroups = ctx.expandedGroups.filter((g) => g !== id)
  } else {
    ctx.expandedGroups = [...ctx.expandedGroups, id]
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const sidebarMachine = createMachine<SidebarSchema>({
  id: 'sidebar',
  initial: 'expanded',
  context: {
    collapsed: false,
    selectedId: null,
    expandedGroups: [],
    width: 260,
    collapsedWidth: 60,
    onCollapsedChange: null,
    onSelectedChange: null,
  },

  watch: {
    collapsed: (ctx: SidebarContext) => {
      ctx.onCollapsedChange?.({ collapsed: ctx.collapsed })
    },
    selectedId: (ctx: SidebarContext) => {
      if (ctx.selectedId != null) {
        ctx.onSelectedChange?.({ selectedId: ctx.selectedId })
      }
    },
  },

  states: {
    expanded: {
      entry: [syncCollapsedFalse],
      on: {
        TOGGLE_COLLAPSE: {
          target: 'collapsed',
        },
        SET_COLLAPSED: [
          {
            guard: (_ctx, event) => {
              const e = event as { type: 'SET_COLLAPSED'; collapsed: boolean }
              return e.collapsed === true
            },
            target: 'collapsed',
          },
        ],
        SELECT: {
          actions: [selectItem],
        },
        TOGGLE_GROUP: {
          actions: [toggleGroup],
        },
      },
    },

    collapsed: {
      entry: [syncCollapsedTrue],
      on: {
        TOGGLE_COLLAPSE: {
          target: 'expanded',
        },
        SET_COLLAPSED: [
          {
            guard: (_ctx, event) => {
              const e = event as { type: 'SET_COLLAPSED'; collapsed: boolean }
              return e.collapsed === false
            },
            target: 'expanded',
          },
        ],
        SELECT: {
          actions: [selectItem],
        },
        TOGGLE_GROUP: {
          actions: [toggleGroup],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

interface SidebarItemConnectProps {
  id: string
  disabled?: boolean
}

interface SidebarGroupConnectProps {
  id: string
}

export function connectSidebar(state: MachineSnapshot<SidebarSchema>, send: SendFn<SidebarSchema>) {
  const ctx = state.context
  const isCollapsed = state.matches('collapsed')
  const attrs = sidebarAnatomy.getPartAttrs

  return {
    /** Whether the sidebar is collapsed. */
    collapsed: isCollapsed,
    /** Currently selected item ID. */
    selectedId: ctx.selectedId,

    getRootProps() {
      const currentWidth = isCollapsed ? ctx.collapsedWidth : ctx.width
      return {
        ...attrs('root'),
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
        style: {
          width: typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth,
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === '[') {
            event.preventDefault()
            send({ type: 'TOGGLE_COLLAPSE' })
          }
        },
      }
    },

    getHeaderProps() {
      return {
        ...attrs('header'),
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
      }
    },

    getContentProps() {
      return {
        ...attrs('content'),
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
      }
    },

    getItemProps(props: SidebarItemConnectProps) {
      const isSelected = ctx.selectedId === props.id
      const isDisabled = props.disabled

      return {
        ...attrs('item'),
        role: 'menuitem' as const,
        'aria-selected': isSelected,
        'data-selected': isSelected ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
        'data-value': props.id,
        tabIndex: isDisabled ? -1 : 0,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SELECT', id: props.id })
          }
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (isDisabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            send({ type: 'SELECT', id: props.id })
          }
        },
      }
    },

    getGroupProps(props: SidebarGroupConnectProps) {
      const isExpanded = ctx.expandedGroups.includes(props.id)

      return {
        ...attrs('group'),
        role: 'group' as const,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-value': props.id,
      }
    },

    getGroupLabelProps(props: SidebarGroupConnectProps) {
      const isExpanded = ctx.expandedGroups.includes(props.id)

      return {
        ...attrs('groupLabel'),
        role: 'button' as const,
        'aria-expanded': isExpanded,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-value': props.id,
        tabIndex: 0,
        onClick() {
          send({ type: 'TOGGLE_GROUP', id: props.id })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            send({ type: 'TOGGLE_GROUP', id: props.id })
          }
        },
      }
    },

    getToggleProps() {
      return {
        ...attrs('toggle'),
        role: 'button' as const,
        type: 'button' as const,
        'aria-label': isCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
        tabIndex: 0,
        onClick() {
          send({ type: 'TOGGLE_COLLAPSE' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            send({ type: 'TOGGLE_COLLAPSE' })
          }
        },
      }
    },

    getFooterProps() {
      return {
        ...attrs('footer'),
        'data-state': isCollapsed ? 'collapsed' : 'expanded',
      }
    },
  }
}
