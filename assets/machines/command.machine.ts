/**
 * @face-ui/core — Command Machine
 *
 * Framework-agnostic FSM for a command palette / search.
 *
 * Supports:
 * - Text-based search filtering (matches label or keywords)
 * - Grouped items
 * - Keyboard navigation (ArrowUp/Down to highlight, Enter to select)
 * - Focus/blur state tracking
 * - Highlighted item management
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const commandAnatomy = createAnatomy('command').parts(
  'root',
  'input',
  'list',
  'group',
  'groupLabel',
  'item',
  'empty',
  'separator',
)

// ---------------------------------------------------------------------------
// Item types (framework-agnostic — label stored as string for matching)
// ---------------------------------------------------------------------------

export interface CommandItemDef {
  id: string
  label: string
  keywords?: string[]
  group?: string
  disabled?: boolean
  onSelect?: () => void
}

export interface CommandGroupDef {
  id: string
  label: string
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface CommandContext {
  [key: string]: unknown
  query: string
  highlightedIndex: number
  items: CommandItemDef[]
  filteredItems: CommandItemDef[]
  groups: CommandGroupDef[]
  onValueChange: ((details: { value: string }) => void) | null
  onSelect: ((details: { item: CommandItemDef }) => void) | null
}

type CommandState = 'idle' | 'focused'

type CommandEvent =
  | { type: 'SET_QUERY'; value: string }
  | { type: 'HIGHLIGHT_NEXT' }
  | { type: 'HIGHLIGHT_PREV' }
  | { type: 'HIGHLIGHT_INDEX'; index: number }
  | { type: 'SELECT' }
  | { type: 'SELECT_ITEM'; id: string }
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'SET_ITEMS'; items: CommandItemDef[] }

export interface CommandSchema extends MachineSchema {
  context: CommandContext
  state: CommandState
  event: CommandEvent
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterItems(items: CommandItemDef[], query: string): CommandItemDef[] {
  if (!query.trim()) return items

  const lowerQuery = query.toLowerCase()
  return items.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(lowerQuery)
    const keywordMatch = item.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)) ?? false
    return labelMatch || keywordMatch
  })
}

function clampIndex(index: number, length: number): number {
  if (length === 0) return -1
  if (index < 0) return length - 1
  if (index >= length) return 0
  return index
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const setQuery = (ctx: CommandContext, event: CommandEvent): void => {
  const e = event as { type: 'SET_QUERY'; value: string }
  ctx.query = e.value
  ctx.filteredItems = filterItems(ctx.items, ctx.query)
  // Reset highlight to first item
  ctx.highlightedIndex = ctx.filteredItems.length > 0 ? 0 : -1
}

const highlightNext = (ctx: CommandContext): void => {
  const enabledItems = ctx.filteredItems.filter((item) => !item.disabled)
  if (enabledItems.length === 0) {
    ctx.highlightedIndex = -1
    return
  }

  // Find next enabled item
  let nextIndex = ctx.highlightedIndex + 1
  while (nextIndex < ctx.filteredItems.length && ctx.filteredItems[nextIndex].disabled) {
    nextIndex++
  }
  ctx.highlightedIndex = clampIndex(nextIndex, ctx.filteredItems.length)

  // If we landed on a disabled item, skip forward
  while (ctx.highlightedIndex >= 0 && ctx.filteredItems[ctx.highlightedIndex]?.disabled) {
    ctx.highlightedIndex = clampIndex(ctx.highlightedIndex + 1, ctx.filteredItems.length)
  }
}

const highlightPrev = (ctx: CommandContext): void => {
  const enabledItems = ctx.filteredItems.filter((item) => !item.disabled)
  if (enabledItems.length === 0) {
    ctx.highlightedIndex = -1
    return
  }

  let prevIndex = ctx.highlightedIndex - 1
  while (prevIndex >= 0 && ctx.filteredItems[prevIndex].disabled) {
    prevIndex--
  }
  ctx.highlightedIndex = clampIndex(prevIndex, ctx.filteredItems.length)

  // If we landed on a disabled item, skip backward
  while (ctx.highlightedIndex >= 0 && ctx.filteredItems[ctx.highlightedIndex]?.disabled) {
    ctx.highlightedIndex = clampIndex(ctx.highlightedIndex - 1, ctx.filteredItems.length)
  }
}

const highlightIndex = (ctx: CommandContext, event: CommandEvent): void => {
  const e = event as { type: 'HIGHLIGHT_INDEX'; index: number }
  ctx.highlightedIndex = e.index
}

const selectHighlighted = (ctx: CommandContext): void => {
  const item = ctx.filteredItems[ctx.highlightedIndex]
  if (!item || item.disabled) return
  item.onSelect?.()
  ctx.onSelect?.({ item })
}

const selectItemById = (ctx: CommandContext, event: CommandEvent): void => {
  const e = event as { type: 'SELECT_ITEM'; id: string }
  const item = ctx.filteredItems.find((i) => i.id === e.id)
  if (!item || item.disabled) return
  item.onSelect?.()
  ctx.onSelect?.({ item })
}

const setItems = (ctx: CommandContext, event: CommandEvent): void => {
  const e = event as { type: 'SET_ITEMS'; items: CommandItemDef[] }
  ctx.items = e.items
  ctx.filteredItems = filterItems(ctx.items, ctx.query)
  ctx.highlightedIndex = ctx.filteredItems.length > 0 ? 0 : -1
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const commandMachine = createMachine<CommandSchema>({
  id: 'command',
  initial: 'idle',
  context: {
    query: '',
    highlightedIndex: 0,
    items: [],
    filteredItems: [],
    groups: [],
    onValueChange: null,
    onSelect: null,
  },

  watch: {
    query: (ctx: CommandContext) => {
      ctx.onValueChange?.({ value: ctx.query })
    },
  },

  states: {
    idle: {
      on: {
        FOCUS: {
          target: 'focused',
        },
        HIGHLIGHT_INDEX: {
          actions: [highlightIndex],
        },
        SELECT_ITEM: {
          actions: [selectItemById],
        },
        SET_QUERY: {
          actions: [setQuery],
        },
        SET_ITEMS: {
          actions: [setItems],
        },
      },
    },

    focused: {
      on: {
        BLUR: {
          target: 'idle',
        },
        SET_QUERY: {
          actions: [setQuery],
        },
        HIGHLIGHT_NEXT: {
          actions: [highlightNext],
        },
        HIGHLIGHT_PREV: {
          actions: [highlightPrev],
        },
        HIGHLIGHT_INDEX: {
          actions: [highlightIndex],
        },
        SELECT: {
          actions: [selectHighlighted],
        },
        SELECT_ITEM: {
          actions: [selectItemById],
        },
        SET_ITEMS: {
          actions: [setItems],
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
  index: number
  disabled?: boolean
}

interface GroupConnectProps {
  id: string
}

export function connectCommand(state: MachineSnapshot<CommandSchema>, send: SendFn<CommandSchema>) {
  const ctx = state.context
  const isFocused = state.matches('focused')
  const attrs = commandAnatomy.getPartAttrs

  return {
    /** Current search query */
    query: ctx.query,
    /** Filtered items based on query */
    filteredItems: ctx.filteredItems,
    /** Currently highlighted index */
    highlightedIndex: ctx.highlightedIndex,
    /** Whether the input is focused */
    isFocused,
    /** Whether there are no results */
    isEmpty: ctx.filteredItems.length === 0 && ctx.query.length > 0,

    /**
     * Group filtered items by their group field.
     * Returns an array of { group, items } objects, with ungrouped items first.
     */
    getGroupedItems() {
      const grouped: { group: CommandGroupDef | null; items: CommandItemDef[] }[] = []
      const groupMap = new Map<string | undefined, CommandItemDef[]>()

      for (const item of ctx.filteredItems) {
        const key = item.group
        if (!groupMap.has(key)) {
          groupMap.set(key, [])
        }
        groupMap.get(key)!.push(item)
      }

      // Ungrouped items first
      const ungrouped = groupMap.get(undefined)
      if (ungrouped) {
        grouped.push({ group: null, items: ungrouped })
      }

      // Then grouped items in group definition order
      for (const groupDef of ctx.groups) {
        const items = groupMap.get(groupDef.id)
        if (items) {
          grouped.push({ group: groupDef, items })
        }
      }

      return grouped
    },

    getRootProps() {
      return {
        ...attrs('root'),
        'data-state': isFocused ? 'focused' : 'idle',
      }
    },

    getInputProps() {
      return {
        ...attrs('input'),
        role: 'combobox' as const,
        'aria-expanded': true,
        'aria-controls': 'command:list',
        'aria-activedescendant':
          ctx.highlightedIndex >= 0 ? `command:item:${ctx.filteredItems[ctx.highlightedIndex]?.id}` : undefined,
        autoComplete: 'off' as const,
        autoCorrect: 'off' as const,
        spellCheck: false,
        value: ctx.query,
        onChange(event: { target: { value: string } }) {
          send({ type: 'SET_QUERY', value: event.target.value })
        },
        onFocus() {
          send({ type: 'FOCUS' })
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          switch (event.key) {
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_NEXT' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send({ type: 'HIGHLIGHT_PREV' })
              break
            case 'Enter':
              event.preventDefault()
              send({ type: 'SELECT' })
              break
            case 'Escape':
              event.preventDefault()
              send({ type: 'BLUR' })
              break
          }
        },
      }
    },

    getListProps() {
      return {
        ...attrs('list'),
        id: 'command:list',
        role: 'listbox' as const,
        'aria-label': 'Command items',
      }
    },

    getGroupProps(props: GroupConnectProps) {
      return {
        ...attrs('group'),
        role: 'group' as const,
        'aria-labelledby': `command:group-label:${props.id}`,
        'data-value': props.id,
      }
    },

    getGroupLabelProps(props: GroupConnectProps) {
      return {
        ...attrs('groupLabel'),
        id: `command:group-label:${props.id}`,
        role: 'presentation' as const,
        'data-value': props.id,
      }
    },

    getItemProps(props: ItemConnectProps) {
      const isHighlighted = ctx.highlightedIndex === props.index
      const isDisabled = props.disabled

      return {
        ...attrs('item'),
        id: `command:item:${props.id}`,
        role: 'option' as const,
        'aria-selected': isHighlighted,
        'data-highlighted': isHighlighted ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.id,
        tabIndex: -1,
        onPointerDown(event: { preventDefault: () => void }) {
          if (!isDisabled) {
            event.preventDefault()
          }
        },
        onPointerEnter() {
          if (!isDisabled) {
            send({ type: 'HIGHLIGHT_INDEX', index: props.index })
          }
        },
        onMouseEnter() {
          if (!isDisabled) {
            send({ type: 'HIGHLIGHT_INDEX', index: props.index })
          }
        },
        onMouseOver() {
          if (!isDisabled) {
            send({ type: 'HIGHLIGHT_INDEX', index: props.index })
          }
        },
        onClick() {
          if (!isDisabled) {
            send({ type: 'SELECT_ITEM', id: props.id })
          }
        },
      }
    },

    getEmptyProps() {
      return {
        ...attrs('empty'),
        role: 'presentation' as const,
      }
    },

    getSeparatorProps() {
      return {
        ...attrs('separator'),
        role: 'separator' as const,
      }
    },
  }
}
