import { createMachine, areContextValuesEqual } from '../create-machine'
import { createAnatomy } from '../anatomy'
import { endOfMonth, endOfYear } from '@internationalized/date'
import {
  parseCivilDate as parseDate,
  parseCivilDateTime as parseDateTime,
} from '../runtime/civil-date'
import { resolveWeekStartsOn } from '../runtime/date-locale'
import { getNextDateRange, isDateRangeDisabled } from '../runtime/date-range'
import { defaultDateLabels, type DateLabels } from '../runtime/date-labels'
import type {
  MachineSchema,
  MachineSnapshot,
  SendFn,
  ActionFn,
  EventHandler,
} from '../types'
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
  isDateObject,
  projectDateValue,
  getEffectiveSelection,
  parseTimeFromISO,
  startOfWeek,
  toExternalValue,
  getDefaultViews,
  getTodayISO,
  getYearGrid,
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
  'grid',
  'footer',
)

export interface DateSchema extends MachineSchema {
  context: {
    open: boolean
    mode: DateMode
    selection: DateSelection
    view: DateView
    /** Viewed month, independent of the selected value. */
    viewDate: string | null
    valueFormat: DateValueFormat
    value: DateValueISO
    rangePart: 'start' | 'end'
    locale: string
    labels: DateLabels
    timezone: string
    triggerFormat: string | null
    weekStartsOn: number | null
    min: string | null
    max: string | null
    disabledDates: string[]
    excludeDisabledDates: boolean
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
    | { type: 'SET_VIEW_DATE'; date: string }
    | { type: 'PAGE_VIEW'; direction: -1 | 1 }
    | { type: 'SET_RANGE_PART'; part: 'start' | 'end' }
    | { type: 'SELECT_DAY'; date: string }
    | { type: 'SELECT_RANGE'; value: DateRangeISO }
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
  return projectDateValue(ctx.value, ctx.mode, ctx.selection)
}

function getRange(ctx: DateSchema['context']): NonNullable<DateRangeISO> {
  const value = getIsoValue(ctx)
  return typeof value === 'object' && value !== null
    ? value
    : { start: value, end: null }
}

function getSingleValue(ctx: DateSchema['context']): string | null {
  const value = getIsoValue(ctx)
  return typeof value === 'string'
    ? value
    : (value?.start ?? value?.end ?? null)
}

function incompleteRange(ctx: DateSchema['context']): boolean {
  const range = getRange(ctx)
  return (range.start === null) !== (range.end === null)
}

function isTimed(ctx: DateSchema['context']): boolean {
  return ctx.mode === 'time' || ctx.mode === 'datetime'
}

function getActivePoint(ctx: DateSchema['context']): string | null {
  return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
    ? (getRange(ctx)?.[ctx.rangePart] ?? null)
    : getSingleValue(ctx)
}

function getSelectedDatePart(ctx: DateSchema['context']): string | null {
  const value = getIsoValue(ctx)
  return extractDatePart(
    getActivePoint(ctx) ??
      (typeof value === 'object'
        ? (value?.start ?? value?.end ?? null)
        : value),
  )
}

function getSingleDatePart(ctx: DateSchema['context']): string {
  return getSelectedDatePart(ctx) ?? getTodayISO(ctx.timezone)
}

function getViewedDate(ctx: DateSchema['context']): string {
  if (ctx.viewDate) return ctx.viewDate
  const selected = getSelectedDatePart(ctx)
  let date = selected ?? getTodayISO(ctx.timezone)
  // An empty picker opens in its permitted period without selecting a value.
  // Selected values and an explicitly navigated month remain their own anchors.
  if (!selected && ctx.mode !== 'time') {
    const min = extractDatePart(ctx.min), max = extractDatePart(ctx.max)
    if (!min || !max || min <= max) {
      if (min && date < min) date = min
      if (max && date > max) date = max
    }
  }
  return date.slice(0, 7) + '-01'
}

function getView(ctx: DateSchema['context']): DateView {
  const views = getDefaultViews(ctx.mode)
  return views.includes(ctx.view) ? ctx.view : views[0]
}

function getPageDate(
  ctx: DateSchema['context'],
  direction: -1 | 1,
): string | null {
  const view = getView(ctx)
  if (
    (view !== 'month' && view !== 'year') ||
    (direction !== -1 && direction !== 1)
  )
    return null
  const date = getViewedDate(ctx),
    year = Number(date.slice(0, 4))
  const nextYear = Math.min(
    9999,
    Math.max(1, year + direction * (view === 'year' ? 12 : 1)),
  )
  const currentPage = view === 'year' ? getYearGrid(year) : [year]
  const nextPage = view === 'year' ? getYearGrid(nextYear) : [nextYear]
  if (nextPage[0] === currentPage[0]) return null
  const minYear = ctx.min ? Number(ctx.min.slice(0, 4)) : 1
  const maxYear = ctx.max ? Number(ctx.max.slice(0, 4)) : 9999
  if (direction < 0 && nextPage[nextPage.length - 1] < minYear) return null
  if (direction > 0 && nextPage[0] > maxYear) return null
  return `${String(nextYear).padStart(4, '0')}${date.slice(4)}`
}

function isPeriodSelected(
  ctx: DateSchema['context'],
  view: 'month' | 'year',
  number: number,
): boolean {
  const length = view === 'month' ? 7 : 4
  const period =
    view === 'month'
      ? `${getViewedDate(ctx).slice(0, 4)}-${String(number).padStart(2, '0')}`
      : String(number).padStart(4, '0')
  const value = getIsoValue(ctx)
  if (typeof value === 'string') return value.slice(0, length) === period
  const start = value?.start?.slice(0, length),
    end = value?.end?.slice(0, length)
  if (start && end)
    return (
      period >= (start < end ? start : end) &&
      period <= (start > end ? start : end)
    )
  return period === (start ?? end)
}

function isCivilPoint(point: string | null): boolean {
  if (!point) return false
  try {
    if (point.includes('T')) parseDateTime(point)
    else parseDate(point)
    return true
  } catch {
    return false
  }
}

function pointAllowed(ctx: DateSchema['context'], point: string): boolean {
  if (
    !isCivilPoint(point) ||
    isDateDisabled(point, ctx.min, ctx.max, ctx.disabledDates)
  )
    return false
  if (!isTimed(ctx)) return true
  return timeAllowed(ctx, point)
}
function timeAllowed(ctx: DateSchema['context'], point: string): boolean {
  const time = parseTimeFromISO(point)
  return (
    !isTimeDisabled(time.hour, time.minute, ctx.disabledTime) &&
    (!ctx.min?.includes('T') || point >= ctx.min) &&
    (!ctx.max?.includes('T') || point <= ctx.max)
  )
}

function orderedActivePoint(
  ctx: DateSchema['context'],
  point: string,
): boolean {
  if (getEffectiveSelection(ctx.mode, ctx.selection) !== 'range') return true
  const other = getRange(ctx)?.[ctx.rangePart === 'start' ? 'end' : 'start']
  if (!other) return true
  const boundary = other.includes('T') ? other : `${other}T00:00`
  return ctx.rangePart === 'start' ? point <= boundary : point >= boundary
}

/** Preserve the requested clock when possible; otherwise choose the nearest
 * available minute within the day/hour the user actually selected. */
function resolveDay(
  ctx: DateSchema['context'],
  date: string,
  source: string | null,
  hour?: number,
  active = false,
): string | null {
  if (
    !isCivilPoint(date) ||
    isDateDisabled(date, ctx.min, ctx.max, ctx.disabledDates)
  )
    return null
  if (!isTimed(ctx)) return date
  const clock = parseTimeFromISO(source)
  const preferred = (hour ?? clock.hour) * 60 + clock.minute
  const first = hour === undefined ? 0 : hour * 60
  const last = hour === undefined ? 1439 : first + 59
  let nearest: string | null = null,
    distance = Infinity
  for (let minute = first; minute <= last; minute++) {
    const point = mergeDateAndTime(date, Math.floor(minute / 60), minute % 60)
    const delta = Math.abs(minute - preferred)
    if (
      delta < distance &&
      timeAllowed(ctx, point) &&
      (!active || orderedActivePoint(ctx, point))
    ) {
      nearest = point
      distance = delta
      if (delta === 0) break
    }
  }
  return nearest
}

function replaceActivePoint(
  ctx: DateSchema['context'],
  point: string,
): DateValueISO | undefined {
  if (!pointAllowed(ctx, point) || !orderedActivePoint(ctx, point))
    return undefined
  return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
    ? {
        start: getRange(ctx)?.start ?? null,
        end: getRange(ctx)?.end ?? null,
        [ctx.rangePart]: point,
      }
    : point
}

function rangeDisabled(
  ctx: DateSchema['context'],
  range: NonNullable<DateRangeISO>,
): boolean {
  return (
    isDateRangeDisabled(range, {
      ...ctx,
      excludeDisabledDates: ctx.mode === 'week' || ctx.excludeDisabledDates,
    }) ||
    (isTimed(ctx) &&
      [range.start, range.end].some(
        (point) => point !== null && !timeAllowed(ctx, point),
      ))
  )
}

function weekCandidate(
  ctx: DateSchema['context'],
  date: string,
): DateRangeISO | undefined {
  const weekStartsOn = resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn)
  const start = startOfWeek(date, weekStartsOn),
    end = endOfWeek(date, weekStartsOn)
  if (!isCivilPoint(start) || !isCivilPoint(end)) return undefined
  const first = parseDate(start)
  if (parseDate(end).compare(first) !== 6) return undefined
  const range = { start, end }
  return rangeDisabled(ctx, range) ? undefined : range
}

function dayCandidate(
  ctx: DateSchema['context'],
  date: string,
): DateValueISO | undefined {
  const day = extractDatePart(date)
  if (!day || !isCivilPoint(day)) return undefined
  if (ctx.mode === 'week') return weekCandidate(ctx, day)
  if (getEffectiveSelection(ctx.mode, ctx.selection) !== 'range') {
    return resolveDay(ctx, day, getSingleValue(ctx)) ?? undefined
  }
  const range = getRange(ctx)
  const completing = incompleteRange(ctx)
  const point = resolveDay(ctx, day, completing ? null : range.start)
  if (!point) return undefined
  const next = getNextDateRange(range, point, (candidate) =>
    rangeDisabled(ctx, candidate),
  )
  if (completing && !next.end) {
    // A restarted draft has the same clock preference as a newly started range.
    const start = resolveDay(ctx, day, range.start ?? range.end)
    return start ? { start, end: null } : undefined
  }
  return next
}

/** Every user-selection route shares this candidate and validation contract. */
function selectionCandidate(
  ctx: DateSchema['context'],
  event: DateSchema['event'],
): DateValueISO | undefined {
  const candidate = rawSelectionCandidate(ctx, event)
  if (candidate && typeof candidate === 'object') {
    if (rangeDisabled(ctx, candidate)) return undefined
    if (ctx.mode === 'week' && (candidate.start || candidate.end)) {
      const week = candidate.start ? weekCandidate(ctx, candidate.start) : null
      if (!week || week.start !== candidate.start || week.end !== candidate.end)
        return undefined
    }
  }
  return candidate
}

function rawSelectionCandidate(
  ctx: DateSchema['context'],
  event: DateSchema['event'],
): DateValueISO | undefined {
  switch (event.type) {
    case 'CLEAR':
      return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
        ? { start: null, end: null }
        : null
    case 'SELECT_DAY':
      return dayCandidate(ctx, event.date)
    case 'SELECT_MONTH':
    case 'SELECT_YEAR': {
      const date = getPeriodSelection(ctx, event)
      return date ? dayCandidate(ctx, date) : undefined
    }
    case 'SELECT_RANGE': {
      if (
        getEffectiveSelection(ctx.mode, ctx.selection) !== 'range' ||
        !event.value?.start ||
        !isCivilPoint(event.value.start) ||
        (event.value.end && !isCivilPoint(event.value.end))
      )
        return undefined
      const range = normalizeRange(
        extractDatePart(event.value.start),
        extractDatePart(event.value.end),
      )
      if (!range.start) return undefined
      const source = (date: string, part: 'start' | 'end') => {
        for (const point of [getRange(ctx)?.start, getRange(ctx)?.end]) {
          if (point && extractDatePart(point) === date) return point
        }
        if (range.end && getRange(ctx)?.start && !getRange(ctx).end) return null
        return getRange(ctx)?.[part] ?? null
      }
      const start = resolveDay(ctx, range.start, source(range.start, 'start'))
      const end = range.end
        ? resolveDay(ctx, range.end, source(range.end, 'end'))
        : null
      if (!start || (range.end && !end)) return undefined
      return normalizeRange(start, end)
    }
    case 'SELECT_HOUR': {
      if (
        !isTimed(ctx) ||
        !Number.isInteger(event.hour) ||
        event.hour < 0 ||
        event.hour > 23
      )
        return undefined
      const point = resolveDay(
        ctx,
        getSingleDatePart(ctx),
        getActivePoint(ctx),
        event.hour,
        true,
      )
      return point ? replaceActivePoint(ctx, point) : undefined
    }
    case 'SELECT_MINUTE': {
      if (
        !isTimed(ctx) ||
        !Number.isInteger(event.minute) ||
        event.minute < 0 ||
        event.minute > 59
      )
        return undefined
      const { hour } = parseTimeFromISO(getActivePoint(ctx))
      return replaceActivePoint(
        ctx,
        mergeDateAndTime(getSingleDatePart(ctx), hour, event.minute),
      )
    }
    case 'SET_NOW': {
      const now = normalizeISOValue(new Date(), ctx.timezone) as string
      if (!isTimed(ctx)) return dayCandidate(ctx, now)
      const point =
        ctx.mode === 'time' ? getSingleDatePart(ctx) + now.slice(10) : now
      return replaceActivePoint(ctx, point)
    }
    case 'SET_VALUE':
    case 'APPLY_PRESET': {
      if (event.type === 'SET_VALUE' && event.value === null)
        return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
          ? { start: null, end: null }
          : null
      const value = normalizeISOValue(event.value, ctx.timezone)
      if (
        event.value &&
        typeof event.value === 'object' &&
        !isDateObject(event.value)
      ) {
        if (
          !value ||
          typeof value === 'string' ||
          (event.value.start != null && !value.start) ||
          (event.value.end != null && !value.end)
        )
          return undefined
      }
      const range = getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
      const point = (value: string) =>
        isTimed(ctx)
          ? value.includes('T')
            ? value
            : value + 'T00:00'
          : extractDatePart(value)!
      if (typeof value === 'string') {
        const candidate = point(value)
        return !range && pointAllowed(ctx, candidate) ? candidate : undefined
      }
      if (!range || !value || (!value.start && !value.end)) return undefined
      const candidate = normalizeRange(
        value.start ? point(value.start) : null,
        value.end ? point(value.end) : null,
      )
      return candidate
    }
    default:
      return undefined
  }
}

function commitValue(ctx: DateSchema['context'], value: DateValueISO) {
  const previous = getIsoValue(ctx)
  if (areContextValuesEqual(previous, value)) return
  ctx.value = value
  ctx.onValueChange?.({
    value: toExternalValue(value, ctx.valueFormat, ctx.timezone),
  })
}

const selectValue: ActionFn<DateSchema> = (ctx, event) => {
  const value = selectionCandidate(ctx, event)
  if (value === undefined) return
  commitValue(ctx, value)
  if (event.type === 'CLEAR') {
    ctx.rangePart = 'start'
  }
  if (event.type === 'SELECT_DAY' || event.type === 'SELECT_RANGE') {
    ctx.rangePart = typeof value === 'object' && value?.end ? 'end' : 'start'
  }
}
const selectDay = selectValue

function getPeriodSelection(
  ctx: DateSchema['context'],
  event: Extract<DateSchema['event'], { type: 'SELECT_MONTH' | 'SELECT_YEAR' }>,
): string | null {
  const base = parseDate(getViewedDate(ctx))
  const year = event.type === 'SELECT_YEAR' ? event.year : base.year
  const month = event.type === 'SELECT_MONTH' ? event.month : base.month
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    return null
  const start = base.set({
    year,
    month: event.type === 'SELECT_YEAR' ? 1 : month,
    day: 1,
  })
  const end =
    event.type === 'SELECT_YEAR' ? endOfYear(start) : endOfMonth(start)
  const floor =
    ctx.min && extractDatePart(ctx.min)! > start.toString()
      ? extractDatePart(ctx.min)!
      : start.toString()
  const ceiling =
    ctx.max && extractDatePart(ctx.max)! < end.toString()
      ? extractDatePart(ctx.max)!
      : end.toString()
  if (floor > ceiling) return null
  let candidate = base
    .set({ year, month: ctx.mode === 'year' ? 1 : month, day: 1 })
    .toString()
  if (candidate < floor) candidate = floor
  if (candidate > ceiling) candidate = ceiling
  if (!isDateDisabled(candidate, ctx.min, ctx.max, ctx.disabledDates))
    return candidate
  // Search only within the permitted period, visiting every civil day. Stop
  // before adding beyond the last day: CalendarDate clamps at year 9999.
  for (let cursor = parseDate(floor); ; cursor = cursor.add({ days: 1 })) {
    const date = cursor.toString()
    if (!isDateDisabled(date, ctx.min, ctx.max, ctx.disabledDates)) return date
    if (date === ceiling) return null
  }
}

const selectMonth: ActionFn<DateSchema> = (ctx, event) => {
  if (event.type !== 'SELECT_MONTH') return
  const date = getPeriodSelection(ctx, event)
  if (!date) return
  ctx.viewDate = date.slice(0, 7) + '-01'
  if (ctx.mode === 'month') selectDay(ctx, { type: 'SELECT_DAY', date })
  else if (getDefaultViews(ctx.mode).includes('day')) ctx.view = 'day'
}
const selectYear: ActionFn<DateSchema> = (ctx, event) => {
  if (event.type !== 'SELECT_YEAR') return
  const date = getPeriodSelection(ctx, event)
  if (!date) return
  ctx.viewDate = date.slice(0, 7) + '-01'
  if (ctx.mode === 'year') selectDay(ctx, { type: 'SELECT_DAY', date })
  else if (getDefaultViews(ctx.mode).includes('month')) ctx.view = 'month'
  else if (getDefaultViews(ctx.mode).includes('day')) ctx.view = 'day'
}

const canEdit = (ctx: DateSchema['context']) => !ctx.disabled && !ctx.readOnly
function isSelectionAllowed(
  ctx: DateSchema['context'],
  event: DateSchema['event'],
): boolean {
  if (event.type === 'SELECT_MONTH' || event.type === 'SELECT_YEAR')
    if (ctx.mode !== (event.type === 'SELECT_MONTH' ? 'month' : 'year'))
      return getPeriodSelection(ctx, event) !== null
  return selectionCandidate(ctx, event) !== undefined
}
function selectionIsComplete(
  ctx: DateSchema['context'],
  event: DateSchema['event'],
): boolean {
  const value = selectionCandidate(ctx, event)
  return typeof value === 'string' || Boolean(value?.start && value.end)
}
function selecting(
  action: ActionFn<DateSchema>,
  closes: (
    ctx: DateSchema['context'],
    event: DateSchema['event'],
  ) => boolean = () => false,
) {
  const valid = (ctx: DateSchema['context'], event: DateSchema['event']) =>
    canEdit(ctx) && isSelectionAllowed(ctx, event)
  return [
    {
      guard: (ctx: DateSchema['context'], event: DateSchema['event']) =>
        valid(ctx, event) && ctx.closeOnSelect && closes(ctx, event),
      target: 'closed' as const,
      actions: [action],
    },
    { guard: valid, actions: [action] },
  ]
}
const toggle: EventHandler<DateSchema> = [
  { guard: (ctx) => ctx.open, target: 'closed' },
  { guard: canEdit, target: 'open' },
]

export const dateMachine = createMachine<DateSchema>({
  id: 'date',
  initial: 'closed',
  context: {
    open: false,
    mode: 'date',
    selection: 'single',
    view: 'day',
    viewDate: null,
    valueFormat: 'iso',
    value: null,
    rangePart: 'start',
    locale: 'en-US',
    labels: defaultDateLabels,
    timezone: 'UTC',
    triggerFormat: null,
    weekStartsOn: null,
    min: null,
    max: null,
    disabledDates: [],
    excludeDisabledDates: true,
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
    weekStartsOn: (ctx) => resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
    triggerLabel: (ctx) =>
      formatTriggerValue(getIsoValue(ctx), {
        mode: ctx.mode,
        selection: getEffectiveSelection(ctx.mode, ctx.selection),
        locale: ctx.locale,
        timezone: ctx.timezone,
        placeholder: ctx.placeholder,
        format: ctx.triggerFormat,
      }),
    effectiveSelection: (ctx) => getEffectiveSelection(ctx.mode, ctx.selection),
  },
  states: {
    closed: {
      entry: [
        (ctx) => {
          ctx.open = false
        },
      ],
      on: {
        OPEN: { guard: canEdit, target: 'open' },
        TOGGLE: toggle,
        SET_VALUE: selecting(selectValue),
        CLEAR: selecting(selectValue),
        APPLY_PRESET: selecting(selectValue),
      },
    },
    open: {
      entry: [
        (ctx) => {
          ctx.open = true
          ctx.view = getView(ctx)
        },
      ],
      on: {
        CLOSE: { target: 'closed' },
        TOGGLE: toggle,
        SET_VIEW_DATE: {
          actions: [
            (ctx, event) => {
              if (event.type !== 'SET_VIEW_DATE') return
              const date = extractDatePart(event.date)
              if (date && isCivilPoint(date))
                ctx.viewDate = date.slice(0, 7) + '-01'
            },
          ],
        },
        PAGE_VIEW: {
          actions: [
            (ctx, event) => {
              if (event.type !== 'PAGE_VIEW') return
              const date = getPageDate(ctx, event.direction)
              if (date) ctx.viewDate = date
            },
          ],
        },
        SET_RANGE_PART: {
          guard: (ctx, event) =>
            canEdit(ctx) &&
            isTimed(ctx) &&
            getEffectiveSelection(ctx.mode, ctx.selection) === 'range' &&
            event.type === 'SET_RANGE_PART' &&
            (event.part === 'start' || event.part === 'end'),
          actions: [
            (ctx, event) => {
              if (event.type === 'SET_RANGE_PART') ctx.rangePart = event.part
            },
          ],
        },
        SET_VIEW: {
          actions: [
            (ctx, ev) => {
              const view = (ev as { view: DateView }).view
              if (getDefaultViews(ctx.mode).includes(view)) ctx.view = view
            },
          ],
        },
        SET_VALUE: selecting(selectValue),
        CLEAR: selecting(selectValue),
        APPLY_PRESET: selecting(selectValue, selectionIsComplete),
        SET_NOW: selecting(selectValue, selectionIsComplete),
        SELECT_RANGE: selecting(selectValue, selectionIsComplete),
        SELECT_DAY: selecting(selectDay, selectionIsComplete),
        SELECT_MONTH: selecting(
          selectMonth,
          (ctx, event) =>
            ctx.mode === 'month' && selectionIsComplete(ctx, event),
        ),
        SELECT_YEAR: selecting(
          selectYear,
          (ctx, event) =>
            ctx.mode === 'year' && selectionIsComplete(ctx, event),
        ),
        SELECT_HOUR: selecting(selectValue),
        SELECT_MINUTE: selecting(selectValue, selectionIsComplete),
      },
    },
  },
})

export function connectDate(
  state: MachineSnapshot<DateSchema>,
  send: SendFn<DateSchema>,
) {
  const ctx = state.context
  const triggerLabel = String(state.computed['triggerLabel'] ?? ctx.placeholder)
  const effectiveViews = getDefaultViews(ctx.mode)
  const view = getView(ctx)
  const effectiveSelection =
    (state.computed['effectiveSelection'] as DateSelection) || ctx.selection

  return {
    open: ctx.open,
    weekStartsOn: state.computed['weekStartsOn'] as number,
    mode: ctx.mode,
    selection: effectiveSelection,
    views: effectiveViews,
    view,
    viewDate: getViewedDate(ctx),
    value: getIsoValue(ctx),
    rangePart: ctx.rangePart,
    hasTime: Boolean(getActivePoint(ctx)?.includes('T')),
    hour: parseTimeFromISO(getActivePoint(ctx)).hour,
    minute: parseTimeFromISO(getActivePoint(ctx)).minute,
    isPeriodSelected: (view: 'month' | 'year', value: number) =>
      isPeriodSelected(ctx, view, value),
    getPageProps(direction: -1 | 1) {
      const previous =
        view === 'month' ? ctx.labels.previousYear : ctx.labels.previousYearPage
      const next =
        view === 'month' ? ctx.labels.nextYear : ctx.labels.nextYearPage
      return {
        disabled: getPageDate(ctx, direction) === null,
        'aria-label': direction < 0 ? previous : next,
        onClick: () => send({ type: 'PAGE_VIEW', direction }),
      }
    },
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
        onKeyDown(event: {
          key: string
          preventDefault: () => void
          altKey?: boolean
          ctrlKey?: boolean
          metaKey?: boolean
          shiftKey?: boolean
          defaultPrevented?: boolean
          nativeEvent?: { isComposing?: boolean }
        }) {
          if (
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.nativeEvent?.isComposing
          )
            return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            send({ type: 'OPEN' })
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
      }
    },
    getViewSwitchProps(view: DateView) {
      const selected = getView(ctx) === view
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
    isSelectionDisabled(event: DateSchema['event']) {
      return !canEdit(ctx) || !isSelectionAllowed(ctx, event)
    },
    getClearProps() {
      const value = getIsoValue(ctx)
      const empty =
        value === null ||
        (typeof value === 'object' && !value.start && !value.end)
      return {
        disabled: !canEdit(ctx) || empty,
        type: 'button' as const,
        onClick() {
          send({ type: 'CLEAR' })
        },
      }
    },
    getNowProps() {
      return {
        disabled:
          !canEdit(ctx) || !isSelectionAllowed(ctx, { type: 'SET_NOW' }),
        type: 'button' as const,
        onClick() {
          send({ type: 'SET_NOW' })
        },
      }
    },
    getPresetProps(value: DateValueExternal) {
      return {
        disabled:
          !canEdit(ctx) ||
          !isSelectionAllowed(ctx, { type: 'APPLY_PRESET', value }),
        type: 'button' as const,
        onClick() {
          send({ type: 'APPLY_PRESET', value })
        },
      }
    },
  }
}
