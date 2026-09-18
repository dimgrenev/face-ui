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
import type {
  MachineSchema,
  MachineConfig,
  MachineSnapshot,
  SendFn,
} from '../types'

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
  /** Ordered enabled item values supplied by the adapter. */
  enabledValues: readonly string[]
  /** All rendered values, including disabled panels. Null permits standalone machine use. */
  itemValues: readonly string[] | null
  expandedIds: readonly string[]
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

/** Projection is shared by rendering and actions; missing sections cannot affect collapse limits. */
function getExpandedIds(ctx: AccordionContext): string[] {
  const available = ctx.itemValues === null ? null : new Set(ctx.itemValues)
  const values = [...new Set(ctx.expandedIds)].filter(
    (value) => !available || available.has(value),
  )
  return ctx.multiple ? values : values.slice(0, 1)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const toggleItem = (ctx: AccordionContext, event: AccordionEvent): void => {
  const e = event as { type: 'TOGGLE'; value: string }
  const value = e.value
  if (!ctx.enabledValues.includes(value)) return
  const expanded = getExpandedIds(ctx)
  const isExpanded = expanded.includes(value)

  if (isExpanded) {
    // Collapse: check if collapsible allows it
    if (ctx.collapsible || expanded.length > 1) {
      ctx.expandedIds = expanded.filter((id) => id !== value)
    }
  } else {
    // Expand
    if (ctx.multiple) {
      ctx.expandedIds = [...expanded, value]
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
  if (ctx.multiple) ctx.expandedIds = [...ctx.enabledValues]
}

const moveFocus =
  (direction: 'next' | 'prev' | 'first' | 'last') =>
  (ctx: AccordionContext): void => {
    const values = ctx.enabledValues
    if (!values.length) return
    const current = values.indexOf(ctx.focusedValue ?? '')
    const index =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? values.length - 1
          : direction === 'next'
            ? (current + 1) % values.length
            : current < 0
              ? values.length - 1
              : (current - 1 + values.length) % values.length
    ctx.focusedValue = values[index]
  }

const collapseAll = (ctx: AccordionContext): void => {
  if (ctx.collapsible) {
    ctx.expandedIds = []
  }
}

const setFocusedValue = (
  ctx: AccordionContext,
  event: AccordionEvent,
): void => {
  const e = event as { type: 'FOCUS'; value: string }
  ctx.focusedValue = e.value
}

const clearFocusedValue = (ctx: AccordionContext): void => {
  ctx.focusedValue = null
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const accordionMachine: MachineConfig<AccordionSchema> =
  createMachine<AccordionSchema>({
    id: 'accordion',
    initial: 'idle',
    context: {
      expandedIds: [],
      enabledValues: [],
      itemValues: null,
      focusedValue: null,
      multiple: true,
      collapsible: true,
      disabled: false,
      onExpandedChange: null,
    },

    watch: {
      expandedIds: (ctx: AccordionContext) => {
        ctx.onExpandedChange?.({ expandedIds: getExpandedIds(ctx) })
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
            actions: [moveFocus('next')],
          },
          FOCUS_PREV: {
            guard: isNotDisabled,
            actions: [moveFocus('prev')],
          },
          FOCUS_FIRST: {
            guard: isNotDisabled,
            actions: [moveFocus('first')],
          },
          FOCUS_LAST: {
            guard: isNotDisabled,
            actions: [moveFocus('last')],
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
}

interface TriggerProps {
  value: string
  disabled?: boolean
}

interface ContentProps {
  value: string
  region?: boolean
}

export function connectAccordion(
  state: MachineSnapshot<AccordionSchema>,
  send: SendFn<AccordionSchema>,
) {
  const ctx = state.context
  const attrs = accordionAnatomy.getPartAttrs
  const expandedIds = getExpandedIds(ctx)

  return {
    /** Current expanded item IDs */
    expandedIds,

    getRootProps() {
      return attrs('root')
    },

    getItemProps(props: ItemProps) {
      const isExpanded = expandedIds.includes(props.value)
      return {
        ...attrs('item'),
        'data-state': isExpanded ? 'open' : 'closed',
        'data-value': props.value,
      }
    },

    getTriggerProps(props: TriggerProps) {
      const isExpanded = expandedIds.includes(props.value)
      const isDisabled = ctx.disabled || props.disabled
      const cannotCollapse =
        isExpanded && !ctx.collapsible && expandedIds.length === 1
      return {
        ...attrs('trigger'),
        role: 'button' as const,
        type: 'button' as const,
        id: `accordion:trigger:${props.value}`,
        'aria-expanded': isExpanded,
        'aria-disabled': isDisabled || cannotCollapse ? true : undefined,
        'aria-controls': `accordion:content:${props.value}`,
        'data-state': isExpanded ? 'open' : 'closed',
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': props.value,
        disabled: isDisabled,
        tabIndex: isDisabled ? -1 : 0,
        onClick(event?: { defaultPrevented?: boolean }) {
          if (!isDisabled && !event?.defaultPrevented) {
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
        onKeyDown(event: {
          key: string
          preventDefault: () => void
          defaultPrevented?: boolean
          altKey?: boolean
          ctrlKey?: boolean
          metaKey?: boolean
        }) {
          if (
            isDisabled ||
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          )
            return

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
            // Enter and Space are handled by the native button click. Sending
            // TOGGLE here as well makes keyboard activation toggle twice.
          }
        },
      }
    },

    getContentProps(props: ContentProps) {
      const isExpanded = expandedIds.includes(props.value)
      return {
        ...attrs('content'),
        role: props.region ? ('region' as const) : undefined,
        id: `accordion:content:${props.value}`,
        'aria-labelledby': props.region
          ? `accordion:trigger:${props.value}`
          : undefined,
        'data-state': isExpanded ? 'open' : 'closed',
        hidden: !isExpanded,
      }
    },
  }
}
