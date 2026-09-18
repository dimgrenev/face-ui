/** Selection, highlighting and keyboard navigation for the Select adapter. */
import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

export const selectAnatomy = createAnatomy('select').parts(
  'root',
  'label',
  'trigger',
  'value',
  'indicator',
  'content',
  'listbox',
  'option',
)
export type SelectValue = string | readonly string[] | null
export interface SelectSchema extends MachineSchema {
  context: {
    value: SelectValue
    open: boolean
    highlightedValue: string | null
    optionOrder: readonly string[]
    optionLabels: Record<string, string>
    disabledValues: readonly string[]
    disabled: boolean
    multiple: boolean
    searchQuery: string
    searchAt: number
    onValueChange?: (details: { value: SelectValue }) => void
    onOpenChange?: (details: { open: boolean }) => void
  }
  state: 'closed' | 'open'
  event:
    | {
        type:
          | 'OPEN'
          | 'OPEN_FIRST'
          | 'OPEN_LAST'
          | 'CLOSE'
          | 'TOGGLE'
          | 'ESCAPE'
      }
    | { type: 'SELECT'; value: string }
    | { type: 'SELECT_HIGHLIGHTED' }
    | { type: 'TYPEAHEAD'; key: string; now: number }
    | { type: 'HIGHLIGHT'; value: string | null }
    | {
        type:
          | 'HIGHLIGHT_NEXT'
          | 'HIGHLIGHT_PREV'
          | 'HIGHLIGHT_FIRST'
          | 'HIGHLIGHT_LAST'
      }
    | { type: 'SET_VALUE'; value: SelectValue }
}
type Context = SelectSchema['context']
const enabledValues = (ctx: Context) =>
  ctx.disabled
    ? []
    : ctx.optionOrder.filter((v) => !ctx.disabledValues.includes(v))
const isEnabled = (ctx: Context, value: string | null): value is string =>
  value !== null && enabledValues(ctx).includes(value)
export function getSelectInitialHighlight(ctx: Context): string | null {
  const selected =
    typeof ctx.value === 'string' ? [ctx.value] : (ctx.value ?? [])
  return (
    selected.find((v) => isEnabled(ctx, v)) ?? enabledValues(ctx)[0] ?? null
  )
}
const highlightInitial = (ctx: Context) => {
  ctx.highlightedValue = getSelectInitialHighlight(ctx)
}
const highlightFirst = (ctx: Context) => {
  ctx.highlightedValue = enabledValues(ctx)[0] ?? null
}
const highlightLast = (ctx: Context) => {
  ctx.highlightedValue = enabledValues(ctx).at(-1) ?? null
}
function highlightOffset(ctx: Context, delta: 1 | -1) {
  const values = enabledValues(ctx)
  const current =
    ctx.highlightedValue === null ? -1 : values.indexOf(ctx.highlightedValue)
  const next =
    current < 0
      ? delta > 0
        ? 0
        : values.length - 1
      : (current + delta + values.length) % values.length
  ctx.highlightedValue = values[next] ?? null
}
function selectValue(ctx: Context, value: string) {
  if (!isEnabled(ctx, value)) return
  if (ctx.multiple) {
    const values = Array.isArray(ctx.value) ? ctx.value : []
    ctx.value = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value]
  } else ctx.value = value
}
function typeahead(ctx: Context, event: SelectSchema['event']) {
  if (event.type !== 'TYPEAHEAD') return
  const previous = event.now - ctx.searchAt <= 700 ? ctx.searchQuery : ''
  const query = (previous + event.key).toLocaleLowerCase()
  ctx.searchQuery = query
  ctx.searchAt = event.now
  const characters = Array.from(query)
  const repeating = characters.every((char) => char === characters[0])
  const search = repeating ? characters[0] : query
  const values = enabledValues(ctx)
  const current =
    ctx.highlightedValue === null ? -1 : values.indexOf(ctx.highlightedValue)
  const start = Math.max(0, current + (repeating ? 1 : 0))
  for (let offset = 0; offset < values.length; offset++) {
    const value = values[(start + offset) % values.length]
    if (
      (ctx.optionLabels[value] ?? value)
        .trim()
        .toLocaleLowerCase()
        .startsWith(search)
    ) {
      ctx.highlightedValue = value
      return
    }
  }
}
const canOpen = (ctx: Context) => enabledValues(ctx).length > 0
const setValue = (ctx: Context, event: SelectSchema['event']) => {
  if (event.type === 'SET_VALUE') ctx.value = event.value
}
export const selectMachine = createMachine<SelectSchema>({
  id: 'select',
  initial: 'closed',
  context: {
    value: null,
    open: false,
    highlightedValue: null,
    optionOrder: [],
    optionLabels: {},
    disabledValues: [],
    disabled: false,
    multiple: false,
    searchQuery: '',
    searchAt: 0,
  },
  watch: {
    value: (ctx) => ctx.onValueChange?.({ value: ctx.value }),
    open: (ctx) => ctx.onOpenChange?.({ open: ctx.open }),
  },
  states: {
    closed: {
      entry: [
        (ctx) => {
          ctx.open = false
          ctx.highlightedValue = null
          ctx.searchQuery = ''
          ctx.searchAt = 0
        },
      ],
      on: {
        OPEN: [{ guard: canOpen, target: 'open', actions: [highlightInitial] }],
        TOGGLE: [
          { guard: canOpen, target: 'open', actions: [highlightInitial] },
        ],
        OPEN_FIRST: [
          { guard: canOpen, target: 'open', actions: [highlightFirst] },
        ],
        OPEN_LAST: [
          { guard: canOpen, target: 'open', actions: [highlightLast] },
        ],
        TYPEAHEAD: [{ guard: canOpen, target: 'open', actions: [typeahead] }],
        SET_VALUE: { actions: [setValue] },
      },
    },
    open: {
      entry: [
        (ctx) => {
          ctx.open = true
          if (!isEnabled(ctx, ctx.highlightedValue)) highlightInitial(ctx)
        },
      ],
      on: {
        CLOSE: { target: 'closed' },
        TOGGLE: { target: 'closed' },
        ESCAPE: { target: 'closed' },
        OPEN: { actions: [highlightInitial] },
        OPEN_FIRST: { actions: [highlightFirst] },
        OPEN_LAST: { actions: [highlightLast] },
        SELECT: [
          {
            guard: (ctx, e) =>
              e.type === 'SELECT' && ctx.multiple && isEnabled(ctx, e.value),
            actions: [
              (ctx, e) => {
                if (e.type === 'SELECT') selectValue(ctx, e.value)
              },
            ],
          },
          {
            guard: (ctx, e) =>
              e.type === 'SELECT' && !ctx.multiple && isEnabled(ctx, e.value),
            target: 'closed',
            actions: [
              (ctx, e) => {
                if (e.type === 'SELECT') selectValue(ctx, e.value)
              },
            ],
          },
        ],
        SELECT_HIGHLIGHTED: [
          {
            guard: (ctx) =>
              ctx.multiple && isEnabled(ctx, ctx.highlightedValue),
            actions: [(ctx) => selectValue(ctx, ctx.highlightedValue!)],
          },
          {
            guard: (ctx) =>
              !ctx.multiple && isEnabled(ctx, ctx.highlightedValue),
            target: 'closed',
            actions: [(ctx) => selectValue(ctx, ctx.highlightedValue!)],
          },
        ],
        TYPEAHEAD: { actions: [typeahead] },
        HIGHLIGHT: {
          actions: [
            (ctx, e) => {
              if (e.type === 'HIGHLIGHT')
                ctx.highlightedValue = isEnabled(ctx, e.value) ? e.value : null
            },
          ],
        },
        HIGHLIGHT_NEXT: { actions: [(ctx) => highlightOffset(ctx, 1)] },
        HIGHLIGHT_PREV: { actions: [(ctx) => highlightOffset(ctx, -1)] },
        HIGHLIGHT_FIRST: { actions: [highlightFirst] },
        HIGHLIGHT_LAST: { actions: [highlightLast] },
        SET_VALUE: { actions: [setValue] },
      },
    },
  },
})
interface KeyEvent {
  key: string
  defaultPrevented?: boolean
  isComposing?: boolean
  nativeEvent?: { isComposing?: boolean }
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  preventDefault: () => void
}
interface NameProps {
  id?: string
  labelId?: string
  ariaLabel?: string
  activeDescendantId?: string
}
export function connectSelect(
  state: MachineSnapshot<SelectSchema>,
  send: SendFn<SelectSchema>,
) {
  const { value, disabled, multiple, highlightedValue } = state.context
  const isOpen = state.matches('open')
  function onKeyDown(event: KeyEvent, modal = false) {
    if (
      disabled ||
      event.defaultPrevented ||
      event.isComposing ||
      event.nativeEvent?.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return
    let type: SelectSchema['event']['type'] | undefined
    switch (event.key) {
      case 'Enter':
        type = isOpen ? 'SELECT_HIGHLIGHTED' : 'OPEN'
        break
      case ' ':
        type =
          state.context.searchQuery &&
          Date.now() - state.context.searchAt <= 700
            ? undefined
            : isOpen
              ? 'SELECT_HIGHLIGHTED'
              : 'OPEN'
        break
      case 'ArrowDown':
        type = isOpen ? 'HIGHLIGHT_NEXT' : 'OPEN'
        break
      case 'ArrowUp':
        type = isOpen ? 'HIGHLIGHT_PREV' : 'OPEN_LAST'
        break
      case 'Home':
        if (isOpen) type = 'HIGHLIGHT_FIRST'
        break
      case 'End':
        if (isOpen) type = 'HIGHLIGHT_LAST'
        break
      case 'Escape':
        if (isOpen) type = 'ESCAPE'
        break
      case 'Tab':
        if (isOpen && !modal) send({ type: 'CLOSE' })
        return
    }
    if (type) {
      event.preventDefault()
      send({ type } as SelectSchema['event'])
    } else if (Array.from(event.key).length === 1) {
      event.preventDefault()
      send({ type: 'TYPEAHEAD', key: event.key, now: Date.now() })
    }
  }
  return {
    getRootProps: () => ({
      ...selectAnatomy.getPartAttrs('root'),
      'data-state': isOpen ? 'open' : 'closed',
      'data-disabled': disabled || undefined,
      'data-multiple': multiple || undefined,
    }),
    getTriggerProps(props: NameProps & { contentId?: string } = {}) {
      return {
        ...selectAnatomy.getPartAttrs('trigger'),
        id: props.id,
        role: 'combobox' as const,
        'aria-expanded': isOpen,
        'aria-haspopup': 'listbox' as const,
        'aria-controls': isOpen ? props.contentId : undefined,
        'aria-labelledby': props.labelId,
        'aria-label': props.ariaLabel,
        'aria-activedescendant': isOpen ? props.activeDescendantId : undefined,
        'aria-disabled': disabled || undefined,
        'data-state': isOpen ? 'open' : 'closed',
        'data-disabled': disabled || undefined,
        'data-placeholder':
          value === null ||
          (Array.isArray(value) && value.length === 0) ||
          undefined,
        tabIndex: disabled ? -1 : 0,
        onClick: () => send({ type: 'TOGGLE' }),
        onKeyDown: (event: KeyEvent) => onKeyDown(event),
      }
    },
    getContentProps: () => ({
      ...selectAnatomy.getPartAttrs('content'),
      'data-state': isOpen ? 'open' : 'closed',
      hidden: !isOpen,
    }),
    getListboxProps(props: NameProps & { modal?: boolean } = {}) {
      return {
        ...selectAnatomy.getPartAttrs('listbox'),
        id: props.id,
        role: 'listbox' as const,
        'aria-labelledby': props.labelId,
        'aria-label': props.ariaLabel,
        'aria-activedescendant': props.modal
          ? props.activeDescendantId
          : undefined,
        'aria-multiselectable': multiple || undefined,
        tabIndex: props.modal ? 0 : -1,
        onKeyDown: (event: KeyEvent) => onKeyDown(event, props.modal),
      }
    },
    getOptionProps(props: { value: string; disabled?: boolean; id?: string }) {
      const optionDisabled = disabled || props.disabled
      const selected = Array.isArray(value)
        ? value.includes(props.value)
        : value === props.value
      return {
        ...selectAnatomy.getPartAttrs('option'),
        id: props.id,
        role: 'option' as const,
        'aria-selected': selected,
        'aria-disabled': optionDisabled || undefined,
        'data-state': selected ? 'selected' : undefined,
        'data-highlighted':
          (highlightedValue === props.value && !optionDisabled) || undefined,
        'data-disabled': optionDisabled || undefined,
        'data-value': props.value,
        onClick: () => {
          if (!optionDisabled) send({ type: 'SELECT', value: props.value })
        },
        onPointerMove: (event: { pointerType: string }) => {
          if (
            !optionDisabled &&
            event.pointerType !== 'touch' &&
            highlightedValue !== props.value
          )
            send({ type: 'HIGHLIGHT', value: props.value })
        },
        onMouseDown: (event: { preventDefault: () => void }) =>
          event.preventDefault(),
      }
    },
  }
}
