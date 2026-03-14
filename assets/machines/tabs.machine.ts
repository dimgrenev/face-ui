/**
 * @face-ui/core — Tabs Machine
 *
 * Framework-agnostic FSM for tabbed navigation.
 * Supports horizontal/vertical orientation and automatic/manual activation modes.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineConfig, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const tabsAnatomy = createAnatomy('tabs').parts(
  'root',
  'list',
  'trigger',
  'content',
  'indicator',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface TabsContext {
  [key: string]: unknown
  value: string
  focusedValue: string | null
  itemOrder: string[]
  disabledValues: string[]
  disabled: boolean
  orientation: 'horizontal' | 'vertical'
  activationMode: 'automatic' | 'manual'
  onValueChange: ((details: { value: string }) => void) | null
}

type TabsState = 'idle' | 'focused'

type TabsEvent =
  | { type: 'SELECT'; value: string }
  | { type: 'FOCUS'; value: string }
  | { type: 'BLUR' }
  | { type: 'FOCUS_NEXT' }
  | { type: 'FOCUS_PREV' }
  | { type: 'FOCUS_FIRST' }
  | { type: 'FOCUS_LAST' }
  | { type: 'SET_VALUE'; value: string }

export interface TabsSchema extends MachineSchema {
  context: TabsContext
  state: TabsState
  event: TabsEvent
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: TabsContext): boolean => !ctx.disabled

const isAutomatic = (ctx: TabsContext): boolean =>
  ctx.activationMode === 'automatic'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const setValue = (ctx: TabsContext, event: TabsEvent): void => {
  const e = event as { type: 'SELECT' | 'SET_VALUE'; value: string }
  ctx.value = e.value
}

const setFocusedValue = (ctx: TabsContext, event: TabsEvent): void => {
  const e = event as { type: 'FOCUS'; value: string }
  ctx.focusedValue = e.value
}

const clearFocusedValue = (ctx: TabsContext): void => {
  ctx.focusedValue = null
}

const getEnabledValues = (ctx: TabsContext): string[] =>
  ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value))

const focusFirstValue = (ctx: TabsContext): void => {
  const first = getEnabledValues(ctx)[0]
  if (!first) return
  ctx.focusedValue = first
  selectOnFocus(ctx)
}

const focusLastValue = (ctx: TabsContext): void => {
  const values = getEnabledValues(ctx)
  const last = values[values.length - 1]
  if (!last) return
  ctx.focusedValue = last
  selectOnFocus(ctx)
}

const focusOffset = (ctx: TabsContext, delta: 1 | -1): void => {
  const values = getEnabledValues(ctx)
  if (values.length === 0) return
  const current = ctx.focusedValue ?? ctx.value
  const currentIndex = current ? values.indexOf(current) : -1
  const nextIndex = currentIndex < 0
    ? (delta > 0 ? 0 : values.length - 1)
    : (currentIndex + delta + values.length) % values.length
  ctx.focusedValue = values[nextIndex]
  selectOnFocus(ctx)
}

const selectOnFocus = (ctx: TabsContext): void => {
  if (ctx.activationMode === 'automatic' && ctx.focusedValue != null) {
    ctx.value = ctx.focusedValue
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const tabsMachine: MachineConfig<TabsSchema> = createMachine<TabsSchema>({
  id: 'tabs',
  initial: 'idle',
  context: {
    value: '',
    focusedValue: null,
    itemOrder: [],
    disabledValues: [],
    disabled: false,
    orientation: 'horizontal',
    activationMode: 'automatic',
    onValueChange: null,
  },

  watch: {
    value: (ctx: TabsContext) => {
      ctx.onValueChange?.({ value: ctx.value })
    },
  },

  states: {
    idle: {
      on: {
        SELECT: {
          guard: isNotDisabled,
          actions: [setValue],
        },
        SET_VALUE: {
          actions: [setValue],
        },
        FOCUS: {
          target: 'focused',
          guard: isNotDisabled,
          actions: [setFocusedValue, selectOnFocus],
        },
      },
    },
    focused: {
      on: {
        SELECT: {
          guard: isNotDisabled,
          actions: [setValue],
        },
        SET_VALUE: {
          actions: [setValue],
        },
        FOCUS: {
          guard: isNotDisabled,
          actions: [setFocusedValue, selectOnFocus],
        },
        BLUR: {
          target: 'idle',
          actions: [clearFocusedValue],
        },
        FOCUS_NEXT: {
          guard: isNotDisabled,
          actions: [(ctx) => focusOffset(ctx, 1)],
        },
        FOCUS_PREV: {
          guard: isNotDisabled,
          actions: [(ctx) => focusOffset(ctx, -1)],
        },
        FOCUS_FIRST: {
          guard: isNotDisabled,
          actions: [focusFirstValue],
        },
        FOCUS_LAST: {
          guard: isNotDisabled,
          actions: [focusLastValue],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

interface TriggerProps {
  value: string
  disabled?: boolean
}

interface ContentProps {
  value: string
}

export function connectTabs(state: MachineSnapshot<TabsSchema>, send: SendFn<TabsSchema>) {
  const ctx = state.context
  const attrs = tabsAnatomy.getPartAttrs
  const firstEnabledValue = ctx.itemOrder.find((value) => !ctx.disabledValues.includes(value))
  const tabStopValue = ctx.focusedValue ?? ctx.value ?? firstEnabledValue

  return {
    getRootProps() {
      return {
        ...attrs('root'),
        'data-orientation': ctx.orientation,
        'data-disabled': ctx.disabled ? '' : undefined,
        dir: 'ltr' as const,
      }
    },

    getListProps() {
      return {
        ...attrs('list'),
        role: 'tablist' as const,
        'aria-orientation': ctx.orientation,
        'data-orientation': ctx.orientation,
      }
    },

    getTriggerProps(props: TriggerProps) {
      const isSelected = ctx.value === props.value
      const isDisabled = ctx.disabled || props.disabled
      const isTabStop = tabStopValue === props.value
      return {
        ...attrs('trigger'),
        role: 'tab' as const,
        type: 'button' as const,
        id: `tabs:${ctx.value !== '' ? '' : ''}trigger:${props.value}`,
        tabIndex: isTabStop ? 0 : -1,
        'aria-selected': isSelected,
        'aria-controls': `tabs:content:${props.value}`,
        'data-state': isSelected ? 'active' : 'inactive',
        'data-orientation': ctx.orientation,
        'data-value': props.value,
        'data-disabled': isDisabled ? '' : undefined,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SELECT', value: props.value })
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
          const isHorizontal = ctx.orientation === 'horizontal'
          const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
          const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

          switch (event.key) {
            case nextKey:
              event.preventDefault()
              send({ type: 'FOCUS_NEXT' })
              break
            case prevKey:
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
              if (ctx.activationMode === 'manual') {
                event.preventDefault()
                send({ type: 'SELECT', value: props.value })
              }
              break
          }
        },
      }
    },

    getContentProps(props: ContentProps) {
      const isSelected = ctx.value === props.value
      return {
        ...attrs('content'),
        role: 'tabpanel' as const,
        id: `tabs:content:${props.value}`,
        'aria-labelledby': `tabs:trigger:${props.value}`,
        'data-state': isSelected ? 'active' : 'inactive',
        'data-orientation': ctx.orientation,
        hidden: !isSelected,
        tabIndex: 0,
      }
    },

    getIndicatorProps() {
      return {
        ...attrs('indicator'),
        'data-orientation': ctx.orientation,
        'data-value': ctx.value,
      }
    },
  }
}
