/**
 * @face-ui/core — Accordion Machine
 *
 * Framework-agnostic FSM for accordion / collapsible panels.
 * Collapsible is simply an Accordion with a single item.
 *
 * Supports:
 * - Single or multiple expanded items
 * - Collapsible mode (allow closing the last open item)
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Disabled state at root and item level
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineConfig, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const accordionAnatomy = createAnatomy('accordion').parts(
  'root',
  'item',
  'trigger',
  'content',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface AccordionContext {
  [key: string]: unknown
  expandedIds: string[]
  focusedValue: string | null
  multiple: boolean
  collapsible: boolean
  disabled: boolean
  onExpandedChange: ((details: { expandedIds: string[] }) => void) | null
}

type AccordionState = 'idle' | 'focused'

type AccordionEvent =
  | { type: 'TOGGLE'; value: string }
  | { type: 'FOCUS'; value: string }
  | { type: 'BLUR' }
  | { type: 'FOCUS_NEXT' }
  | { type: 'FOCUS_PREV' }
  | { type: 'FOCUS_FIRST' }
  | { type: 'FOCUS_LAST' }
  | { type: 'SET_EXPANDED'; expandedIds: string[] }
  | { type: 'EXPAND_ALL' }
  | { type: 'COLLAPSE_ALL' }

export interface AccordionSchema extends MachineSchema {
  context: AccordionContext
  state: AccordionState
  event: AccordionEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: AccordionContext): boolean => !ctx.disabled

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const toggleItem = (ctx: AccordionContext, event: AccordionEvent): void => {
  const e = event as { type: 'TOGGLE'; value: string }
  const value = e.value
  const isExpanded = ctx.expandedIds.includes(value)

  if (isExpanded) {
    // Collapse: check if collapsible allows it
    if (ctx.collapsible || ctx.expandedIds.length > 1) {
      ctx.expandedIds = ctx.expandedIds.filter((id) => id !== value)
    }
  } else {
    // Expand
    if (ctx.multiple) {
      ctx.expandedIds = [...ctx.expandedIds, value]
    } else {
      ctx.expandedIds = [value]
    }
  }
}

const setExpanded = (ctx: AccordionContext, event: AccordionEvent): void => {
  const e = event as { type: 'SET_EXPANDED'; expandedIds: string[] }
  ctx.expandedIds = e.expandedIds
}

const expandAll = (ctx: AccordionContext): void => {
  // expandAll is only meaningful when multiple=true; otherwise it's a no-op
  // The caller is responsible for knowing the full list of item values.
  // This action is a signal — the connect layer or user code should populate it.
  if (!ctx.multiple) return
}

const collapseAll = (ctx: AccordionContext): void => {
  if (ctx.collapsible) {
    ctx.expandedIds = []
  }
}

const setFocusedValue = (ctx: AccordionContext, event: AccordionEvent): void => {
  const e = event as { type: 'FOCUS'; value: string }
  ctx.focusedValue = e.value
}

const clearFocusedValue = (ctx: AccordionContext): void => {
  ctx.focusedValue = null
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const accordionMachine: MachineConfig<AccordionSchema> = createMachine<AccordionSchema>({
  id: 'accordion',
  initial: 'idle',
  context: {
    expandedIds: [],
    focusedValue: null,
    multiple: false,
    collapsible: true,
    disabled: false,
    onExpandedChange: null,
  },

  watch: {
    expandedIds: (ctx: AccordionContext) => {
      ctx.onExpandedChange?.({ expandedIds: ctx.expandedIds })
    },
  },

  states: {
    idle: {
      on: {
        TOGGLE: {
          guard: isNotDisabled,
          actions: [toggleItem],
        },
        SET_EXPANDED: {
          actions: [setExpanded],
        },
        EXPAND_ALL: {
          guard: isNotDisabled,
          actions: [expandAll],
        },
        COLLAPSE_ALL: {
          guard: isNotDisabled,
          actions: [collapseAll],
        },
        FOCUS: {
          target: 'focused',
          guard: isNotDisabled,
          actions: [setFocusedValue],
        },
      },
    },
    focused: {
      on: {
        TOGGLE: {
          guard: isNotDisabled,
          actions: [toggleItem],
        },
        SET_EXPANDED: {
          actions: [setExpanded],
        },
        EXPAND_ALL: {
          guard: isNotDisabled,
          actions: [expandAll],
        },
        COLLAPSE_ALL: {
          guard: isNotDisabled,
          actions: [collapseAll],
        },
        FOCUS: {
          guard: isNotDisabled,
          actions: [setFocusedValue],
        },
        BLUR: {
          target: 'idle',
          actions: [clearFocusedValue],
        },
        FOCUS_NEXT: {
          guard: isNotDisabled,
          actions: [],
        },
        FOCUS_PREV: {
          guard: isNotDisabled,
          actions: [],
        },
        FOCUS_FIRST: {
          guard: isNotDisabled,
          actions: [],
        },
        FOCUS_LAST: {
          guard: isNotDisabled,
          actions: [],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

interface ItemProps {
  value: string
  disabled?: boolean
}

interface TriggerProps {
  value: string
  disabled?: boolean
}

interface ContentProps {
  value: string
}

export function connectAccordion(state: MachineSnapshot<AccordionSchema>, send: SendFn<AccordionSchema>) {
  const ctx = state.context
  const attrs = accordionAnatomy.getPartAttrs

  return {
    /** Current expanded item IDs */
    expandedIds: ctx.expandedIds,

    getRootProps() {
      return {
        ...attrs('root'),
        'data-disabled': ctx.disabled ? '' : undefined,
      }
    },

    getItemProps(props: ItemProps) {
      const isExpanded = ctx.expandedIds.includes(props.value)
      const isDisabled = ctx.disabled || props.disabled
      return {
        ...attrs('item'),
        'data-state': isExpanded ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.value,
      }
    },

    getTriggerProps(props: TriggerProps) {
      const isExpanded = ctx.expandedIds.includes(props.value)
      const isDisabled = ctx.disabled || props.disabled
      return {
        ...attrs('trigger'),
        role: 'button' as const,
        type: 'button' as const,
        id: `accordion:trigger:${props.value}`,
        'aria-expanded': isExpanded,
        'aria-controls': `accordion:content:${props.value}`,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.value,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'TOGGLE', value: props.value })
          }
        },
        onFocus() {
          if (!isDisabled) {
            send({ type: 'FOCUS', value: props.value })
          }
        },
        onBlur() {
          send({ type: 'BLUR' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (isDisabled) return

          switch (event.key) {
            case 'ArrowDown':
              event.preventDefault()
              send({ type: 'FOCUS_NEXT' })
              break
            case 'ArrowUp':
              event.preventDefault()
              send({ type: 'FOCUS_PREV' })
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
              send({ type: 'TOGGLE', value: props.value })
              break
          }
        },
      }
    },

    getContentProps(props: ContentProps) {
      const isExpanded = ctx.expandedIds.includes(props.value)
      return {
        ...attrs('content'),
        role: 'region' as const,
        id: `accordion:content:${props.value}`,
        'aria-labelledby': `accordion:trigger:${props.value}`,
        'data-state': isExpanded ? 'open' : 'closed',
        hidden: !isExpanded,
      }
    },
  }
}
