/**
 * @face-ui/core — Tree Machine
 *
 * Framework-agnostic FSM for tree view / hierarchical navigation.
 *
 * Supports:
 * - Expand / collapse branches
 * - Single item selection
 * - Keyboard navigation (ArrowUp/Down for focus, ArrowLeft to collapse/parent,
 *   ArrowRight to expand/first-child, Home, End, Enter/Space to select)
 * - Disabled state at root and item level
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const treeAnatomy = createAnatomy('tree').parts(
  'root',
  'item',
  'branch',
  'branchContent',
  'branchTrigger',
  'branchIndicator',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface TreeContext {
  [key: string]: unknown
  expandedIds: string[]
  selectedId: string | null
  focusedId: string | null
  visibleIds: string[]
  disabled: boolean
  onExpandedChange: ((details: { expandedIds: string[] }) => void) | null
  onSelectedChange: ((details: { selectedId: string }) => void) | null
}

type TreeState = 'idle' | 'focused'

type TreeEvent =
  | { type: 'TOGGLE_EXPAND'; id: string }
  | { type: 'SELECT'; id: string }
  | { type: 'FOCUS'; id: string }
  | { type: 'BLUR' }
  | { type: 'FOCUS_NEXT' }
  | { type: 'FOCUS_PREV' }
  | { type: 'FOCUS_FIRST' }
  | { type: 'FOCUS_LAST' }
  | { type: 'EXPAND_FOCUSED' }
  | { type: 'COLLAPSE_FOCUSED' }
  | { type: 'SET_EXPANDED'; expandedIds: string[] }
  | { type: 'SET_VISIBLE'; visibleIds: string[] }

export interface TreeSchema extends MachineSchema {
  context: TreeContext
  state: TreeState
  event: TreeEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: TreeContext): boolean => !ctx.disabled

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const toggleExpand = (ctx: TreeContext, event: TreeEvent): void => {
  const e = event as { type: 'TOGGLE_EXPAND'; id: string }
  const id = e.id
  if (ctx.expandedIds.includes(id)) {
    ctx.expandedIds = ctx.expandedIds.filter((v) => v !== id)
  } else {
    ctx.expandedIds = [...ctx.expandedIds, id]
  }
}

const selectItem = (ctx: TreeContext, event: TreeEvent): void => {
  const e = event as { type: 'SELECT'; id: string }
  ctx.selectedId = e.id
}

const setFocusedId = (ctx: TreeContext, event: TreeEvent): void => {
  const e = event as { type: 'FOCUS'; id: string }
  ctx.focusedId = e.id
}

const clearFocusedId = (ctx: TreeContext): void => {
  ctx.focusedId = null
}

const setExpanded = (ctx: TreeContext, event: TreeEvent): void => {
  const e = event as { type: 'SET_EXPANDED'; expandedIds: string[] }
  ctx.expandedIds = e.expandedIds
}

const setVisible = (ctx: TreeContext, event: TreeEvent): void => {
  const e = event as { type: 'SET_VISIBLE'; visibleIds: string[] }
  ctx.visibleIds = e.visibleIds
}

const focusByOffset = (ctx: TreeContext, delta: 1 | -1): void => {
  const visibleIds = ctx.visibleIds
  if (visibleIds.length === 0) return
  const currentId = ctx.focusedId ?? ctx.selectedId
  const currentIndex = currentId ? visibleIds.indexOf(currentId) : -1
  const nextIndex = currentIndex < 0
    ? (delta > 0 ? 0 : visibleIds.length - 1)
    : Math.max(0, Math.min(visibleIds.length - 1, currentIndex + delta))
  ctx.focusedId = visibleIds[nextIndex]
}

const focusFirst = (ctx: TreeContext): void => {
  if (ctx.visibleIds.length > 0) {
    ctx.focusedId = ctx.visibleIds[0]
  }
}

const focusLast = (ctx: TreeContext): void => {
  if (ctx.visibleIds.length > 0) {
    ctx.focusedId = ctx.visibleIds[ctx.visibleIds.length - 1]
  }
}

const expandFocused = (ctx: TreeContext): void => {
  if (ctx.focusedId && !ctx.expandedIds.includes(ctx.focusedId)) {
    ctx.expandedIds = [...ctx.expandedIds, ctx.focusedId]
  }
}

const collapseFocused = (ctx: TreeContext): void => {
  if (ctx.focusedId && ctx.expandedIds.includes(ctx.focusedId)) {
    ctx.expandedIds = ctx.expandedIds.filter((id) => id !== ctx.focusedId)
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const treeMachine = createMachine<TreeSchema>({
  id: 'tree',
  initial: 'idle',
  context: {
    expandedIds: [],
    selectedId: null,
    focusedId: null,
    visibleIds: [],
    disabled: false,
    onExpandedChange: null,
    onSelectedChange: null,
  },

  watch: {
    expandedIds: (ctx: TreeContext) => {
      ctx.onExpandedChange?.({ expandedIds: ctx.expandedIds })
    },
    selectedId: (ctx: TreeContext) => {
      if (ctx.selectedId != null) {
        ctx.onSelectedChange?.({ selectedId: ctx.selectedId })
      }
    },
  },

  states: {
    idle: {
      on: {
        TOGGLE_EXPAND: {
          guard: isNotDisabled,
          actions: [toggleExpand],
        },
        SELECT: {
          guard: isNotDisabled,
          actions: [selectItem],
        },
        SET_EXPANDED: {
          actions: [setExpanded],
        },
        SET_VISIBLE: {
          actions: [setVisible],
        },
        FOCUS: {
          target: 'focused',
          guard: isNotDisabled,
          actions: [setFocusedId],
        },
      },
    },
    focused: {
      on: {
        TOGGLE_EXPAND: {
          guard: isNotDisabled,
          actions: [toggleExpand],
        },
        SELECT: {
          guard: isNotDisabled,
          actions: [selectItem],
        },
        SET_EXPANDED: {
          actions: [setExpanded],
        },
        SET_VISIBLE: {
          actions: [setVisible],
        },
        FOCUS: {
          guard: isNotDisabled,
          actions: [setFocusedId],
        },
        BLUR: {
          target: 'idle',
          actions: [clearFocusedId],
        },
        FOCUS_NEXT: {
          guard: isNotDisabled,
          actions: [(ctx) => focusByOffset(ctx, 1)],
        },
        FOCUS_PREV: {
          guard: isNotDisabled,
          actions: [(ctx) => focusByOffset(ctx, -1)],
        },
        FOCUS_FIRST: {
          guard: isNotDisabled,
          actions: [focusFirst],
        },
        FOCUS_LAST: {
          guard: isNotDisabled,
          actions: [focusLast],
        },
        EXPAND_FOCUSED: {
          guard: isNotDisabled,
          actions: [expandFocused],
        },
        COLLAPSE_FOCUSED: {
          guard: isNotDisabled,
          actions: [collapseFocused],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

interface ItemConnectProps {
  id: string
  disabled?: boolean
  depth?: number
}

interface BranchConnectProps {
  id: string
  disabled?: boolean
  depth?: number
}

export function connectTree(state: MachineSnapshot<TreeSchema>, send: SendFn<TreeSchema>) {
  const ctx = state.context
  const attrs = treeAnatomy.getPartAttrs
  const tabStopId = ctx.focusedId ?? ctx.selectedId ?? ctx.visibleIds[0] ?? null

  return {
    /** Current expanded node IDs */
    expandedIds: ctx.expandedIds,
    /** Currently selected node ID */
    selectedId: ctx.selectedId,
    /** Currently focused node ID */
    focusedId: ctx.focusedId,

    getRootProps() {
      return {
        ...attrs('root'),
        role: 'tree' as const,
        'aria-label': 'Tree navigation',
        'data-disabled': ctx.disabled ? '' : undefined,
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (ctx.disabled) return

          switch (event.key) {
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'FOCUS_NEXT' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send({ type: 'FOCUS_PREV' })
              break
            case 'ArrowRight':
              event.preventDefault()
              send({ type: 'EXPAND_FOCUSED' })
              break
            case 'ArrowLeft':
              event.preventDefault()
              send({ type: 'COLLAPSE_FOCUSED' })
              break
            case 'Home':
              event.preventDefault()
              send({ type: 'FOCUS_FIRST' })
              break
            case 'End':
              event.preventDefault()
              send({ type: 'FOCUS_LAST' })
              break
            case 'Enter':
            case ' ':
              event.preventDefault()
              if (ctx.focusedId) {
                send({ type: 'SELECT', id: ctx.focusedId })
              }
              break
          }
        },
      }
    },

    getItemProps(props: ItemConnectProps) {
      const isSelected = ctx.selectedId === props.id
      const isFocused = ctx.focusedId === props.id
      const isDisabled = ctx.disabled || props.disabled

      return {
        ...attrs('item'),
        role: 'treeitem' as const,
        'aria-selected': isSelected,
        'data-selected': isSelected ? '' : undefined,
        'data-focused': isFocused ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.id,
        'data-depth': props.depth,
        tabIndex: tabStopId === props.id ? 0 : -1,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SELECT', id: props.id })
            send({ type: 'FOCUS', id: props.id })
          }
        },
        onFocus() {
          if (!isDisabled) {
            send({ type: 'FOCUS', id: props.id })
          }
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
      }
    },

    getBranchProps(props: BranchConnectProps) {
      const isExpanded = ctx.expandedIds.includes(props.id)
      const isFocused = ctx.focusedId === props.id
      const isDisabled = ctx.disabled || props.disabled

      return {
        ...attrs('branch'),
        role: 'treeitem' as const,
        'aria-expanded': isExpanded,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-focused': isFocused ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.id,
        'data-depth': props.depth,
        tabIndex: tabStopId === props.id ? 0 : -1,
      }
    },

    getBranchTriggerProps(props: BranchConnectProps) {
      const isExpanded = ctx.expandedIds.includes(props.id)
      const isDisabled = ctx.disabled || props.disabled

      return {
        ...attrs('branchTrigger'),
        'aria-expanded': isExpanded,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.id,
        onClick() {
          if (!isDisabled) {
            send({ type: 'TOGGLE_EXPAND', id: props.id })
            send({ type: 'FOCUS', id: props.id })
          }
        },
        onFocus() {
          if (!isDisabled) {
            send({ type: 'FOCUS', id: props.id })
          }
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
      }
    },

    getBranchContentProps(props: BranchConnectProps) {
      const isExpanded = ctx.expandedIds.includes(props.id)

      return {
        ...attrs('branchContent'),
        role: 'group' as const,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-value': props.id,
        hidden: !isExpanded,
      }
    },

    getBranchIndicatorProps(props: BranchConnectProps) {
      const isExpanded = ctx.expandedIds.includes(props.id)

      return {
        ...attrs('branchIndicator'),
        'aria-hidden': true as const,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-value': props.id,
      }
    },
  }
}
