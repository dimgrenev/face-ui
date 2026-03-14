import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'
import {
  type DateMode,
  type DateSelection,
  type DateView,
  type DateValueFormat,
  type DateValueISO,
  type DateRangeISO,
  type DateValueExternal,
  endOfWeek,
  extractDatePart,
  formatTriggerValue,
  isDateDisabled,
  isTimeDisabled,
  mergeDateAndTime,
  normalizeRange,
  normalizeISOValue,
  parseDateLike,
  parseTimeFromISO,
  startOfWeek,
  toExternalValue,
  toISODate,
  toISODateTime,
  getDefaultViews,
} from '../date-utils'

export const dateAnatomy = createAnatomy('date').parts(
  'root',
  'label',
  'trigger',
  'value',
  'icon',
  'content',
  'toolbar',
  'viewSwitch',
  'panel',
  'footer',
)

function todayIsoDate(): string {
  return toISODate(new Date())
}

function toIsoOrNull(input: string | Date | null | undefined): string | null {
  const parsed = parseDateLike(input ?? null)
  return parsed ? toISODateTime(parsed) : null
}

function getEffectiveSelection(mode: DateMode, selection: DateSelection): DateSelection {
  return mode === 'week' ? 'range' : selection
}

export interface DateSchema extends MachineSchema {
  context: {
    open: boolean
    mode: DateMode
    selection: DateSelection
    views: DateView[]
    view: DateView
    valueFormat: DateValueFormat
    valueSingle: string | null
    valueRange: DateRangeISO
    rangeAnchor: string | null
    draftHour: number
    draftMinute: number
    locale: string
    timezone: string
    weekStartsOn: number
    min: string | null
    max: string | null
    disabledDates: string[]
    disabledTime: { hours?: number[]; minutes?: number[] } | null
    closeOnSelect: boolean
    disabled: boolean
    readOnly: boolean
    placeholder: string
    onValueChange?: ((details: { value: DateValueExternal }) => void) | null
    onOpenChange?: ((details: { open: boolean }) => void) | null
  }
  state: 'closed' | 'open'
  event:
    | { type: 'OPEN' }
    | { type: 'CLOSE' }
    | { type: 'TOGGLE' }
    | { type: 'SET_VIEW'; view: DateView }
    | { type: 'SELECT_DAY'; date: string }
    | { type: 'SELECT_MONTH'; month: number }
    | { type: 'SELECT_YEAR'; year: number }
    | { type: 'SELECT_HOUR'; hour: number }
    | { type: 'SELECT_MINUTE'; minute: number }
    | { type: 'SET_VALUE'; value: DateValueExternal }
    | { type: 'APPLY_PRESET'; value: DateValueExternal }
    | { type: 'SET_NOW' }
    | { type: 'CLEAR' }
}

function getIsoValue(ctx: DateSchema['context']): DateValueISO {
  return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
    ? (ctx.valueRange ?? { start: null, end: null })
    : ctx.valueSingle
}

function emitChange(ctx: DateSchema['context']) {
  const nextIso = getIsoValue(ctx)
  ctx.onValueChange?.({ value: toExternalValue(nextIso, ctx.valueFormat) })
}

function getSingleDatePart(ctx: DateSchema['context']): string {
  const source = ctx.valueSingle ? extractDatePart(ctx.valueSingle) : null
  return source || todayIsoDate()
}

function updateSingle(ctx: DateSchema['context'], dateIso: string, preserveTime = true) {
  if (ctx.mode === 'date' || ctx.mode === 'week' || ctx.mode === 'month' || ctx.mode === 'year') {
    ctx.valueSingle = dateIso
    emitChange(ctx)
    return
  }
  const baseline = preserveTime && ctx.valueSingle ? parseTimeFromISO(ctx.valueSingle) : { hour: ctx.draftHour, minute: ctx.draftMinute }
  const next = mergeDateAndTime(dateIso, baseline.hour, baseline.minute)
  ctx.valueSingle = next
  emitChange(ctx)
}

function updateRange(ctx: DateSchema['context'], range: DateRangeISO) {
  ctx.valueRange = range ? normalizeRange(range.start ?? null, range.end ?? null) : { start: null, end: null }
  emitChange(ctx)
}

function applyIncomingValue(ctx: DateSchema['context'], value: DateValueExternal) {
  const normalized = normalizeISOValue(value)
  if (normalized && typeof normalized === 'object' && 'start' in normalized) {
    ctx.valueRange = {
      start: normalized.start ? extractDatePart(normalized.start) : null,
      end: normalized.end ? extractDatePart(normalized.end) : null,
    }
    if (normalized.start) {
      const t = parseTimeFromISO(normalized.start)
      ctx.draftHour = t.hour
      ctx.draftMinute = t.minute
    }
    return
  }
  if (typeof normalized === 'string') {
    ctx.valueSingle = normalized
    const t = parseTimeFromISO(normalized)
    ctx.draftHour = t.hour
    ctx.draftMinute = t.minute
    return
  }
  ctx.valueSingle = null
  ctx.valueRange = { start: null, end: null }
}

export const dateMachine = createMachine<DateSchema>({
  id: 'date',
  initial: 'closed',
  context: {
    open: false,
    mode: 'date',
    selection: 'single',
    views: ['day'],
    view: 'day',
    valueFormat: 'iso',
    valueSingle: null,
    valueRange: { start: null, end: null },
    rangeAnchor: null,
    draftHour: 0,
    draftMinute: 0,
    locale: 'en-US',
    timezone: 'UTC',
    weekStartsOn: 1,
    min: null,
    max: null,
    disabledDates: [],
    disabledTime: null,
    closeOnSelect: true,
    disabled: false,
    readOnly: false,
    placeholder: 'Pick a date',
    onValueChange: null,
    onOpenChange: null,
  },
  watch: {
    open(ctx) {
      ctx.onOpenChange?.({ open: ctx.open })
    },
  },
  computed: {
    triggerLabel: (ctx) => formatTriggerValue(getIsoValue(ctx), {
      mode: ctx.mode,
      selection: getEffectiveSelection(ctx.mode, ctx.selection),
      locale: ctx.locale,
      timezone: ctx.timezone,
      placeholder: ctx.placeholder,
    }),
    effectiveSelection: (ctx) => getEffectiveSelection(ctx.mode, ctx.selection),
    effectiveViews: (ctx) => {
      const resolved = Array.isArray(ctx.views) && ctx.views.length > 0 ? ctx.views : getDefaultViews(ctx.mode)
      return resolved
    },
  },
  states: {
    closed: {
      entry: [
        (ctx) => {
          ctx.open = false
        },
      ],
      on: {
        OPEN: [{ guard: (ctx) => !ctx.disabled && !ctx.readOnly, target: 'open' }],
        TOGGLE: [{ guard: (ctx) => !ctx.disabled && !ctx.readOnly, target: 'open' }],
        SET_VALUE: {
          actions: [(ctx, ev) => applyIncomingValue(ctx, (ev as { type: 'SET_VALUE'; value: DateValueExternal }).value)],
        },
        APPLY_PRESET: {
          actions: [
            (ctx, ev) => {
              applyIncomingValue(ctx, (ev as { type: 'APPLY_PRESET'; value: DateValueExternal }).value)
              emitChange(ctx)
            },
          ],
        },
        CLEAR: {
          actions: [
            (ctx) => {
              ctx.valueSingle = null
              ctx.valueRange = { start: null, end: null }
              ctx.rangeAnchor = null
              emitChange(ctx)
            },
          ],
        },
      },
    },
    open: {
      entry: [
        (ctx) => {
          ctx.open = true
          if (!ctx.views || ctx.views.length === 0) {
            ctx.views = getDefaultViews(ctx.mode)
          }
          if (!ctx.views.includes(ctx.view)) {
            ctx.view = ctx.views[0] || 'day'
          }
        },
      ],
      on: {
        CLOSE: { target: 'closed' },
        TOGGLE: { target: 'closed' },
        SET_VIEW: {
          actions: [
            (ctx, ev) => {
              const view = (ev as { type: 'SET_VIEW'; view: DateView }).view
              if (ctx.views.includes(view)) ctx.view = view
            },
          ],
        },
        SET_VALUE: {
          actions: [(ctx, ev) => applyIncomingValue(ctx, (ev as { type: 'SET_VALUE'; value: DateValueExternal }).value)],
        },
        APPLY_PRESET: {
          actions: [
            (ctx, ev) => {
              applyIncomingValue(ctx, (ev as { type: 'APPLY_PRESET'; value: DateValueExternal }).value)
              emitChange(ctx)
              if (ctx.closeOnSelect) {
                ctx.open = false
              }
            },
          ],
          target: 'closed',
        },
        SET_NOW: {
          actions: [
            (ctx) => {
              const now = new Date()
              ctx.draftHour = now.getHours()
              ctx.draftMinute = now.getMinutes()
              const iso = toISODate(now)
              if (getEffectiveSelection(ctx.mode, ctx.selection) === 'range') {
                updateRange(ctx, { start: iso, end: iso })
              } else {
                updateSingle(ctx, iso, false)
              }
              if (ctx.closeOnSelect) ctx.open = false
            },
          ],
          target: 'closed',
        },
        CLEAR: {
          actions: [
            (ctx) => {
              ctx.valueSingle = null
              ctx.valueRange = { start: null, end: null }
              ctx.rangeAnchor = null
              emitChange(ctx)
            },
          ],
        },
        SELECT_DAY: {
          actions: [
            (ctx, ev) => {
              const dateIso = extractDatePart((ev as { type: 'SELECT_DAY'; date: string }).date)
              if (!dateIso) return
              if (isDateDisabled(dateIso, ctx.min, ctx.max, ctx.disabledDates)) return
              const effectiveSelection = getEffectiveSelection(ctx.mode, ctx.selection)
              if (ctx.mode === 'week') {
                const start = startOfWeek(dateIso, ctx.weekStartsOn)
                const end = endOfWeek(dateIso, ctx.weekStartsOn)
                updateRange(ctx, { start, end })
                if (ctx.closeOnSelect) ctx.open = false
                return
              }
              if (effectiveSelection === 'range') {
                if (!ctx.rangeAnchor || (ctx.valueRange?.start && ctx.valueRange?.end)) {
                  ctx.rangeAnchor = dateIso
                  updateRange(ctx, { start: dateIso, end: null })
                  return
                }
                const normalized = normalizeRange(ctx.rangeAnchor, dateIso)
                ctx.rangeAnchor = null
                updateRange(ctx, normalized)
                if (ctx.closeOnSelect) ctx.open = false
                return
              }
              updateSingle(ctx, dateIso, true)
              if (ctx.closeOnSelect) ctx.open = false
            },
          ],
          target: 'open',
        },
        SELECT_MONTH: {
          actions: [
            (ctx, ev) => {
              const month = Math.min(12, Math.max(1, Number((ev as { type: 'SELECT_MONTH'; month: number }).month) || 1))
              const base = parseDateLike(getSingleDatePart(ctx)) ?? new Date()
              base.setMonth(month - 1)
              const iso = toISODate(base)
              updateSingle(ctx, iso, true)
              if (ctx.views.includes('day')) {
                ctx.view = 'day'
              } else if (ctx.closeOnSelect) {
                ctx.open = false
              }
            },
          ],
        },
        SELECT_YEAR: {
          actions: [
            (ctx, ev) => {
              const year = Number((ev as { type: 'SELECT_YEAR'; year: number }).year) || new Date().getFullYear()
              const base = parseDateLike(getSingleDatePart(ctx)) ?? new Date()
              base.setFullYear(year)
              const iso = toISODate(base)
              updateSingle(ctx, iso, true)
              if (ctx.views.includes('month')) {
                ctx.view = 'month'
              } else if (ctx.views.includes('day')) {
                ctx.view = 'day'
              } else if (ctx.closeOnSelect) {
                ctx.open = false
              }
            },
          ],
        },
        SELECT_HOUR: {
          actions: [
            (ctx, ev) => {
              const hour = Math.min(23, Math.max(0, Number((ev as { type: 'SELECT_HOUR'; hour: number }).hour) || 0))
              if (isTimeDisabled(hour, ctx.draftMinute, ctx.disabledTime)) return
              ctx.draftHour = hour
              const baseDate = getSingleDatePart(ctx)
              updateSingle(ctx, baseDate, false)
            },
          ],
        },
        SELECT_MINUTE: {
          actions: [
            (ctx, ev) => {
              const minute = Math.min(59, Math.max(0, Number((ev as { type: 'SELECT_MINUTE'; minute: number }).minute) || 0))
              if (isTimeDisabled(ctx.draftHour, minute, ctx.disabledTime)) return
              ctx.draftMinute = minute
              const baseDate = getSingleDatePart(ctx)
              updateSingle(ctx, baseDate, false)
              if (ctx.closeOnSelect && (ctx.mode === 'time' || ctx.mode === 'datetime')) {
                ctx.open = false
              }
            },
          ],
        },
      },
    },
  },
})

export function connectDate(state: MachineSnapshot<DateSchema>, send: SendFn<DateSchema>) {
  const ctx = state.context
  const triggerLabel = String(state.computed['triggerLabel'] ?? ctx.placeholder)
  const effectiveViews = (state.computed['effectiveViews'] as DateView[]) || ['day']
  const effectiveSelection = (state.computed['effectiveSelection'] as DateSelection) || ctx.selection

  return {
    open: ctx.open,
    mode: ctx.mode,
    selection: effectiveSelection,
    views: effectiveViews,
    view: ctx.view,
    valueSingle: ctx.valueSingle,
    valueRange: ctx.valueRange,
    draftHour: ctx.draftHour,
    draftMinute: ctx.draftMinute,
    triggerLabel,
    getRootProps() {
      return {
        ...dateAnatomy.getPartAttrs('root'),
        'data-state': ctx.open ? 'open' : 'closed',
        'data-mode': ctx.mode,
        'data-selection': effectiveSelection,
      }
    },
    getTriggerProps() {
      return {
        ...dateAnatomy.getPartAttrs('trigger'),
        type: 'button' as const,
        role: 'combobox' as const,
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': ctx.open,
        'aria-disabled': ctx.disabled || undefined,
        onClick() {
          send({ type: 'TOGGLE' })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault()
            send({ type: 'OPEN' })
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            send({ type: 'CLOSE' })
          }
        },
      }
    },
    getContentProps() {
      return {
        ...dateAnatomy.getPartAttrs('content'),
        role: 'dialog' as const,
        'aria-label': 'Date picker',
        hidden: !ctx.open,
        'data-state': ctx.open ? 'open' : 'closed',
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          if (event.key === 'Escape') {
            event.preventDefault()
            send({ type: 'CLOSE' })
          }
        },
      }
    },
    getViewSwitchProps(view: DateView) {
      const selected = ctx.view === view
      return {
        ...dateAnatomy.getPartAttrs('viewSwitch'),
        type: 'button' as const,
        'aria-pressed': selected,
        'data-selected': selected || undefined,
        onClick() {
          send({ type: 'SET_VIEW', view })
        },
      }
    },
    getClearProps() {
      return {
        type: 'button' as const,
        onClick() {
          send({ type: 'CLEAR' })
        },
      }
    },
    getNowProps() {
      return {
        type: 'button' as const,
        onClick() {
          send({ type: 'SET_NOW' })
        },
      }
    },
    getPresetProps(value: DateValueExternal) {
      return {
        type: 'button' as const,
        onClick() {
          send({ type: 'APPLY_PRESET', value })
        },
      }
    },
  }
}

