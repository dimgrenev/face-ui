/**
 * Calendar Machine
 *
 * States: idle | focused
 * Standalone date grid for date selection.
 * All dates stored as ISO strings (YYYY-MM-DD) for serializability.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import { getTodayISO } from '../date-utils'
import {
  defaultCalendarLabels,
  type CalendarLabels,
} from '../runtime/date-labels'
import {
  CalendarDate,
  getDayOfWeek as civilWeekday,
} from '@internationalized/date'
import { parseCivilDate as parseDate } from '../runtime/civil-date'
import { keyToMove, readDirection } from '../runtime/keyboard'
import {
  createDateFormatter,
  createDateNumberFormatter,
  resolveWeekStartsOn,
} from '../runtime/date-locale'
import type {
  MachineSchema,
  MachineSnapshot,
  SendFn,
  EventHandler,
} from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const calendarAnatomy = createAnatomy('calendar').parts(
  'root',
  'header',
  'prevButton',
  'nextButton',
  'title',
  'grid',
  'weekday',
  'day',
)

// ---------------------------------------------------------------------------
// Day object (computed)
// ---------------------------------------------------------------------------

export interface CalendarDay {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
  isFocused: boolean
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface CalendarSchema extends MachineSchema {
  context: {
    /** Selected date as ISO string, or null if no selection */
    value: string | null
    /** Currently focused date as ISO string */
    focusedDate: string
    /** Currently displayed month (ISO string of the 1st of the month) */
    viewDate: string
    /** Min selectable date as ISO string */
    min: string | null
    /** Max selectable date as ISO string */
    max: string | null
    /** Disabled dates as ISO strings */
    disabledDates: string[]
    /** Suspend selection and navigation. */
    disabled: boolean
    /** Permit browsing while keeping the selected value immutable. */
    readOnly: boolean
    /** 0=Sunday, 1=Monday, ... 6=Saturday */
    weekStartsOn: number | null
    /** Locale for month/day names */
    locale: string
    labels: CalendarLabels
    /** Zone used for the current-day marker; null uses the browser's zone. */
    timezone: string | null
    /** Callback when value changes */
    onValueChange: ((details: { value: string }) => void) | null
    /** User navigation only; external synchronization remains quiet. */
    onViewDateChange: ((details: { viewDate: string }) => void) | null
  }
  state: 'idle' | 'focused'
  event:
    | { type: 'SELECT_DATE'; date: string }
    | { type: 'FOCUS_DATE'; date: string }
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'PREV_MONTH' }
    | { type: 'NEXT_MONTH' }
    | { type: 'PREV_YEAR' }
    | { type: 'NEXT_YEAR' }
    | { type: 'KEY_DOWN'; key: string; shiftKey?: boolean }
}

// ---------------------------------------------------------------------------
// Date helpers (ISO string based)
// ---------------------------------------------------------------------------

const firstSupportedDate = parseDate('0001-01-01')

function addMonths(iso: string, count: number): string | null {
  const base = parseDate(iso).set({ day: 1 })
  const next = base.add({ months: count }).set({ day: 1 })
  // CalendarDate clamps at year 9999; a clamped month is not a navigation step.
  return next.era === 'AD' &&
    (next.year - base.year) * 12 + next.month - base.month === count
    ? next.toString()
    : null
}

function addDays(iso: string, count: number): string {
  return parseDate(iso).add({ days: count }).toString()
}

function getDayOfWeek(iso: string): number {
  return civilWeekday(parseDate(iso), 'en-US', 'sun')
}

function gridStart(viewDate: string, weekStartsOn: number): CalendarDate {
  const month = parseDate(viewDate).set({ day: 1 })
  const leading = (civilWeekday(month, 'en-US', 'sun') - weekStartsOn + 7) % 7
  return month.subtract({ days: leading })
}

function isDateDisabled(
  iso: string,
  min: string | null,
  max: string | null,
  disabledDates: string[],
): boolean {
  if (iso < '0001-01-01' || iso > '9999-12-31' || iso.length !== 10) return true
  if (min && iso < min) return true
  if (max && iso > max) return true
  return disabledDates.includes(iso)
}

function buildDaysGrid(
  viewDate: string,
  value: string | null,
  focusedDate: string,
  min: string | null,
  max: string | null,
  disabledDates: string[],
  weekStartsOn: number,
  today: string,
): CalendarDay[] {
  const month = viewDate.slice(0, 7)
  const first = gridStart(viewDate, weekStartsOn)
  const days: CalendarDay[] = []
  for (let index = 0; index < 42; index++) {
    const day = first.add({ days: index })
    if (day.compare(first) !== index) break
    if (day.compare(firstSupportedDate) < 0) continue
    const iso = day.toString()
    days.push({
      date: iso,
      dayOfMonth: day.day,
      isCurrentMonth: iso.slice(0, 7) === month,
      isToday: iso === today,
      isSelected: iso === value,
      isDisabled: isDateDisabled(iso, min, max, disabledDates),
      isFocused: iso === focusedDate,
    })
  }
  return days
}

function getMonthLabel(viewDate: string, locale: string): string {
  return createDateFormatter(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDate(viewDate).toDate('UTC'))
}

function formatDayLabel(iso: string, locale: string): string {
  return createDateFormatter(locale, {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(parseDate(iso).toDate('UTC'))
}

function getWeekdayLabels(
  weekStartsOn: number,
  locale: string,
  weekday: 'narrow' | 'long',
): string[] {
  const formatter = createDateFormatter(locale, { weekday, timeZone: 'UTC' })
  const sunday = new CalendarDate(1970, 1, 4)
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(
      sunday.add({ days: (weekStartsOn + index) % 7 }).toDate('UTC'),
    ),
  )
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

function focusedDate(ctx: CalendarSchema['context']): string {
  if (ctx.focusedDate.slice(0, 7) === ctx.viewDate.slice(0, 7))
    return ctx.focusedDate
  const first = gridStart(
    ctx.viewDate,
    resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
  )
  const focused = parseDate(ctx.focusedDate)
  if (
    focused.compare(first) >= 0 &&
    focused.compare(first.add({ days: 41 })) <= 0
  )
    return ctx.focusedDate
  if (ctx.value?.slice(0, 7) === ctx.viewDate.slice(0, 7)) return ctx.value
  return parseDate(ctx.viewDate).set({ day: focused.day }).toString()
}

function canNavigate(ctx: CalendarSchema['context'], months: number): boolean {
  const next = addMonths(ctx.viewDate, months)
  return (
    !ctx.disabled &&
    next !== null &&
    (months > 0 || !ctx.min || next.slice(0, 7) >= ctx.min.slice(0, 7)) &&
    (months < 0 || !ctx.max || next.slice(0, 7) <= ctx.max.slice(0, 7))
  )
}

function isDateSelectable(
  ctx: CalendarSchema['context'],
  date: string,
): boolean {
  return (
    !ctx.disabled &&
    !ctx.readOnly &&
    !isDateDisabled(date, ctx.min, ctx.max, ctx.disabledDates)
  )
}

function moveMonth(ctx: CalendarSchema['context'], months: number) {
  if (!canNavigate(ctx, months)) return
  const day = parseDate(focusedDate(ctx)).day
  ctx.viewDate = addMonths(ctx.viewDate, months)!
  ctx.focusedDate = parseDate(ctx.viewDate).set({ day }).toString()
}

// Mouse navigation and keyboard navigation share the same viewed-month owner.
const navigation: Partial<
  Record<CalendarSchema['event']['type'], EventHandler<CalendarSchema>>
> = {
  SELECT_DATE: {
    actions: [
      (ctx, event) => {
        if (event.type !== 'SELECT_DATE' || !isDateSelectable(ctx, event.date))
          return
        ctx.value = event.date
        ctx.focusedDate = event.date
        ctx.viewDate = event.date.slice(0, 7) + '-01'
      },
    ],
  },
  FOCUS_DATE: {
    actions: [
      (ctx, event) => {
        if (ctx.disabled || event.type !== 'FOCUS_DATE') return
        // A visible adjacent-month button must stay under the pointer between
        // pointerdown/focus and click. Selection or arrow navigation changes month.
        ctx.focusedDate = event.date
      },
    ],
  },
  PREV_MONTH: { actions: [(ctx) => moveMonth(ctx, -1)] },
  NEXT_MONTH: { actions: [(ctx) => moveMonth(ctx, 1)] },
  PREV_YEAR: { actions: [(ctx) => moveMonth(ctx, -12)] },
  NEXT_YEAR: { actions: [(ctx) => moveMonth(ctx, 12)] },
  KEY_DOWN: {
    actions: [
      (ctx, event) => {
        if (ctx.disabled || event.type !== 'KEY_DOWN') return
        const current = focusedDate(ctx)
        let next = current
        switch (event.key) {
          case 'ArrowRight':
            next = addDays(current, 1)
            break
          case 'ArrowLeft':
            next = addDays(current, -1)
            break
          case 'ArrowDown':
            next = addDays(current, 7)
            break
          case 'ArrowUp':
            next = addDays(current, -7)
            break
          case 'Home':
            next = addDays(
              current,
              -(
                (getDayOfWeek(current) -
                  resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn) +
                  7) %
                7
              ),
            )
            break
          case 'End':
            next = addDays(
              current,
              6 -
                ((getDayOfWeek(current) -
                  resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn) +
                  7) %
                  7),
            )
            break
          case 'PageUp':
            moveMonth(ctx, event.shiftKey ? -12 : -1)
            return
          case 'PageDown':
            moveMonth(ctx, event.shiftKey ? 12 : 1)
            return
          case 'Enter':
          case ' ':
            if (isDateSelectable(ctx, current)) ctx.value = current
            return
          default:
            return
        }
        if (next.length !== 10 || next < '0001-01-01' || next > '9999-12-31')
          return
        ctx.focusedDate = next
        ctx.viewDate = next.slice(0, 7) + '-01'
      },
    ],
  },
}

const initialToday = getTodayISO()
export const calendarMachine = createMachine<CalendarSchema>({
  id: 'calendar',
  initial: 'idle',
  context: {
    value: null,
    focusedDate: initialToday,
    viewDate: initialToday.slice(0, 7) + '-01',
    min: null,
    max: null,
    disabledDates: [],
    disabled: false,
    readOnly: false,
    weekStartsOn: null,
    locale: 'en-US',
    labels: defaultCalendarLabels,
    timezone: null,
    onValueChange: null,
    onViewDateChange: null,
  },
  watch: {
    value(ctx) {
      if (ctx.value) ctx.onValueChange?.({ value: ctx.value })
    },
    viewDate(ctx) {
      ctx.onViewDateChange?.({ viewDate: ctx.viewDate })
    },
  },
  computed: {
    days: (ctx) =>
      buildDaysGrid(
        ctx.viewDate,
        ctx.value,
        focusedDate(ctx),
        ctx.min,
        ctx.max,
        ctx.disabledDates,
        resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
        getTodayISO(ctx.timezone ?? undefined),
      ),
    leadingEmptyDays: (ctx) =>
      Math.max(
        0,
        firstSupportedDate.compare(
          gridStart(
            ctx.viewDate,
            resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
          ),
        ),
      ),
    focusedDate,
    monthLabel: (ctx) => getMonthLabel(ctx.viewDate, ctx.locale),
    yearLabel: (ctx) =>
      createDateNumberFormatter(ctx.locale).format(
        parseDate(ctx.viewDate).year,
      ),
    weekdayLabels: (ctx) =>
      getWeekdayLabels(
        resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
        ctx.locale,
        'narrow',
      ),
    weekdayNames: (ctx) =>
      getWeekdayLabels(
        resolveWeekStartsOn(ctx.locale, ctx.weekStartsOn),
        ctx.locale,
        'long',
      ),
  },
  states: {
    idle: { on: { ...navigation, FOCUS: { target: 'focused' } } },
    focused: { on: { ...navigation, BLUR: { target: 'idle' } } },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectCalendar(
  state: MachineSnapshot<CalendarSchema>,
  send: SendFn<CalendarSchema>,
) {
  const ctx = state.context
  const isFocused = state.matches('focused')
  const days = state.computed['days'] as CalendarDay[]
  const monthLabel = state.computed['monthLabel'] as string
  const weekdayLabels = state.computed['weekdayLabels'] as string[]

  return {
    /** Computed accessors */
    days,
    leadingEmptyDays: state.computed['leadingEmptyDays'] as number,
    monthLabel,
    weekdayLabels,
    value: ctx.value,
    focusedDate: focusedDate(ctx),
    isFocused,
    isDateSelectable: (date: string) => isDateSelectable(ctx, date),

    getRootProps() {
      return {
        ...calendarAnatomy.getPartAttrs('root'),
        role: 'group' as const,
        'aria-label': 'Calendar',
        'aria-disabled': ctx.disabled || undefined,
        'data-disabled': ctx.disabled || undefined,
        'data-readonly': ctx.readOnly || undefined,
        onFocus() {
          send({ type: 'FOCUS' })
        },
        onBlur(event: {
          currentTarget: HTMLElement
          relatedTarget: EventTarget | null
        }) {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            send({ type: 'BLUR' })
        },
      }
    },

    getHeaderProps() {
      return {
        ...calendarAnatomy.getPartAttrs('header'),
      }
    },

    getPrevMonthProps() {
      return {
        ...calendarAnatomy.getPartAttrs('prevButton'),
        type: 'button' as const,
        'aria-label': ctx.labels.previousMonth,
        disabled: !canNavigate(ctx, -1),
        onClick(event?: { defaultPrevented?: boolean }) {
          if (event?.defaultPrevented) return
          send({ type: 'PREV_MONTH' })
        },
      }
    },

    getNextMonthProps() {
      return {
        ...calendarAnatomy.getPartAttrs('nextButton'),
        type: 'button' as const,
        'aria-label': ctx.labels.nextMonth,
        disabled: !canNavigate(ctx, 1),
        onClick(event?: { defaultPrevented?: boolean }) {
          if (event?.defaultPrevented) return
          send({ type: 'NEXT_MONTH' })
        },
      }
    },

    getTitleProps() {
      return {
        ...calendarAnatomy.getPartAttrs('title'),
        'aria-live': 'polite' as const,
      }
    },

    getGridProps() {
      return {
        ...calendarAnatomy.getPartAttrs('grid'),
        role: 'grid' as const,
        'aria-label': monthLabel,
        'aria-readonly': ctx.readOnly || undefined,
        onKeyDown(event: {
          key: string
          shiftKey?: boolean
          altKey?: boolean
          ctrlKey?: boolean
          metaKey?: boolean
          defaultPrevented?: boolean
          nativeEvent?: { isComposing?: boolean }
          currentTarget?: HTMLElement
          preventDefault: () => void
        }) {
          if (
            ctx.disabled ||
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.nativeEvent?.isComposing
          )
            return
          const handledKeys = [
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'Enter',
            ' ',
            'PageUp',
            'PageDown',
          ]
          if (handledKeys.includes(event.key)) {
            event.preventDefault()
            // The next day lies at the inline end: on the left in RTL.
            const move = /^Arrow(Left|Right)$/.test(event.key)
              ? keyToMove(event, 'horizontal', readDirection(event.currentTarget))
              : null
            const key = move
              ? move === 'next'
                ? 'ArrowRight'
                : 'ArrowLeft'
              : event.key
            send({ type: 'KEY_DOWN', key, shiftKey: event.shiftKey })
          }
        },
      }
    },

    getWeekdayProps(index: number) {
      return {
        ...calendarAnatomy.getPartAttrs('weekday'),
        'aria-label': (state.computed['weekdayNames'] as string[])[index],
        role: 'columnheader' as const,
      }
    },

    getDayProps(day: CalendarDay) {
      return {
        ...calendarAnatomy.getPartAttrs('day'),
        type: 'button' as const,
        'aria-label': formatDayLabel(day.date, ctx.locale),

        tabIndex: !ctx.disabled && day.isFocused ? 0 : -1,
        disabled: ctx.disabled,

        'aria-disabled':
          ctx.disabled || ctx.readOnly || day.isDisabled || undefined,
        'aria-current': day.isToday ? ('date' as const) : undefined,
        'data-selected': day.isSelected || undefined,
        'data-today': day.isToday || undefined,
        'data-disabled': day.isDisabled || undefined,
        'data-outside': !day.isCurrentMonth || undefined,
        'data-focused': day.isFocused || undefined,
        'data-date': day.date,
        onClick(event?: { defaultPrevented?: boolean }) {
          if (
            !event?.defaultPrevented &&
            !day.isDisabled &&
            isDateSelectable(ctx, day.date)
          ) {
            send({ type: 'SELECT_DATE', date: day.date })
          }
        },
        onFocus() {
          send({ type: 'FOCUS_DATE', date: day.date })
        },
      }
    },
  }
}
