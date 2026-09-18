import {
  CalendarDate,
  getDayOfWeek,
  fromDate,
  getLocalTimeZone,
  today,
} from '@internationalized/date'
import { parseCivilDate, parseCivilDateTime } from './civil-date'
import { createDateFormatter, createDateNumberFormatter } from './date-locale'

export type DateMode = 'date' | 'datetime' | 'time' | 'week' | 'month' | 'year'
export type DateSelection = 'single' | 'range'
export function getEffectiveSelection(
  mode: DateMode,
  selection: DateSelection,
): DateSelection {
  return mode === 'week' ? 'range' : selection
}
export type DateView = 'day' | 'month' | 'year' | 'hours' | 'minutes'
export type DateValueFormat = 'iso' | 'date'

export interface DateRangeValue<T extends string | Date = string | Date> {
  /** First endpoint, or null while its date has not been chosen. */
  start: T | null
  /** Last endpoint, or null while its date has not been chosen. */
  end: T | null
}
export type DateRangeISO = DateRangeValue<string> | null
export type DateValueISO = string | DateRangeISO
export type DateValueExternal = string | Date | DateRangeValue | null

/** Native branding accepts Date objects from other windows without duck typing. */
export function isDateObject(value: unknown): value is Date {
  if (!value || typeof value !== 'object') return false
  try {
    Date.prototype.getTime.call(value)
    return true
  } catch {
    return false
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** A civil current day in the owner's zone, or the browser zone for inline calendars. */
export function getTodayISO(timezone = getLocalTimeZone()): string {
  return today(timezone).toString()
}

export function toISODate(input: Date): string {
  return `${String(input.getFullYear()).padStart(4, '0')}-${pad2(input.getMonth() + 1)}-${pad2(input.getDate())}`
}

export function toISODateTime(input: Date): string {
  return `${toISODate(input)}T${pad2(input.getHours())}:${pad2(input.getMinutes())}`
}

/** Parse calendar values locally; explicit offsets describe real instants. */
const civilDatePattern = /^\d{4}-\d{2}-\d{2}$/
const civilTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/
const instantPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:?\d{2})$/

function parseInstant(value: string): Date | null {
  const match = value.match(instantPattern)
  if (!match) return null
  // Validate the calendar and clock before native parsing can roll either over.
  parseCivilDateTime(match[1])
  const instant = new Date(value)
  return Number.isNaN(instant.getTime()) ? null : instant
}

export function parseDateLike(
  input: string | Date | null | undefined,
): Date | null {
  if (isDateObject(input)) {
    const timestamp = Date.prototype.getTime.call(input)
    return Number.isNaN(timestamp) ? null : new Date(timestamp)
  }
  if (typeof input !== 'string') return null
  try {
    if (civilDatePattern.test(input))
      return parseCivilDate(input).toDate(getLocalTimeZone())
    if (civilTimePattern.test(input))
      return parseCivilDateTime(input).toDate(getLocalTimeZone())
    return parseInstant(input)
  } catch {
    return null
  }
}

/** Civil ISO values stay civil. Date objects and offset ISO values are converted into timezone. */
export function normalizeISOValue(
  value: DateValueExternal,
  timezone = 'UTC',
): DateValueISO {
  const normalizePoint = (input: string | Date | null): string | null => {
    if (input == null) return null
    try {
      if (typeof input === 'string') {
        if (civilDatePattern.test(input))
          return parseCivilDate(input).toString()
        if (civilTimePattern.test(input))
          return parseCivilDateTime(input).toString().slice(0, 16)
      }
      const date =
        typeof input === 'string' ? parseInstant(input) : parseDateLike(input)
      if (!date) return null
      const zoned = fromDate(date, timezone)
      // Reject instants that the calendar library would clamp into the supported domain.
      if (zoned.era !== 'AD' || zoned.toDate().getTime() !== date.getTime())
        return null
      return `${String(zoned.year).padStart(4, '0')}-${pad2(zoned.month)}-${pad2(zoned.day)}T${pad2(zoned.hour)}:${pad2(zoned.minute)}`
    } catch {
      return null
    }
  }
  if (value != null && typeof value === 'object' && !isDateObject(value)) {
    if (Array.isArray(value) || !('start' in value) || !('end' in value))
      return null
    const start = normalizePoint(value.start),
      end = normalizePoint(value.end)
    if ((value.start !== null && !start) || (value.end !== null && !end))
      return null
    return { start, end }
  }
  return normalizePoint(value)
}

/** One value model for current mode, selection, form serialization and reset.
 * External props are shape-checked before this projection; uncontrolled mode
 * changes can adapt the previous value without retaining an inactive branch. */
export function projectDateValue(
  value: DateValueISO,
  mode: DateMode,
  selection: DateSelection,
): DateValueISO {
  const point = (value: string | null): string | null => {
    if (value === null) return null
    return mode === 'time' || mode === 'datetime'
      ? value.includes('T')
        ? value
        : `${value}T00:00`
      : value.slice(0, 10)
  }
  if (getEffectiveSelection(mode, selection) === 'range') {
    const range =
      typeof value === 'string' ? { start: value, end: null } : value
    return normalizeRange(
      point(range?.start ?? null),
      point(range?.end ?? null),
    )
  }
  return point(
    typeof value === 'string' ? value : (value?.start ?? value?.end ?? null),
  )
}

function civilToDate(value: string, timezone: string): Date | null {
  try {
    return value.includes('T')
      ? parseCivilDateTime(value).toDate(timezone, 'compatible')
      : parseCivilDate(value).toDate(timezone)
  } catch {
    return null
  }
}

export function extractDatePart(iso: string | null): string | null {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  if (/^\d{4}-\d{2}-\d{2}T/.test(iso)) return iso.slice(0, 10)
  const parsed = parseDateLike(iso)
  return parsed ? toISODate(parsed) : null
}

export function mergeDateAndTime(
  dateIso: string,
  hour: number,
  minute: number,
): string {
  return `${dateIso}T${pad2(hour)}:${pad2(minute)}`
}

export function parseTimeFromISO(iso: string | null): {
  hour: number
  minute: number
} {
  if (!iso) return { hour: 0, minute: 0 }
  const m = iso.match(/T(\d{2}):(\d{2})/)
  if (!m) return { hour: 0, minute: 0 }
  return { hour: Number(m[1]) || 0, minute: Number(m[2]) || 0 }
}

export function normalizeRange(
  start: string | null,
  end: string | null,
): { start: string | null; end: string | null } {
  if (start && end && start > end) return { start: end, end: start }
  return { start, end }
}

function weekBoundary(
  isoDate: string,
  weekStartsOn: number,
  last: boolean,
): string {
  try {
    const date = parseCivilDate(isoDate)
    const offset = (getDayOfWeek(date, 'en-US', 'sun') - weekStartsOn + 7) % 7
    return date.add({ days: (last ? 6 : 0) - offset }).toString()
  } catch {
    return isoDate
  }
}

export function startOfWeek(isoDate: string, weekStartsOn: number): string {
  return weekBoundary(isoDate, weekStartsOn, false)
}

export function endOfWeek(isoDate: string, weekStartsOn: number): string {
  return weekBoundary(isoDate, weekStartsOn, true)
}

export function formatTriggerValue(
  value: DateValueISO,
  opts: {
    mode: DateMode
    selection: DateSelection
    locale: string
    timezone: string
    placeholder: string
    format?: string | null
  },
): string {
  const { mode, selection, locale, placeholder, format } = opts
  const customFormat = typeof format === 'string' ? format.trim() : ''
  // Parse before looking at value: configuration errors must also surface on empty fields.
  const tokens =
    customFormat.match(/''|'(?:[^']|'')*'|([A-Za-z])\1*|[^A-Za-z']+|'/g) ?? []
  const supported = new Set([
    'y',
    'yy',
    'yyyy',
    'M',
    'MM',
    'MMM',
    'MMMM',
    'd',
    'dd',
    'H',
    'HH',
    'h',
    'hh',
    'm',
    'mm',
    'a',
    'EEE',
    'EEEE',
  ])
  for (const token of tokens) {
    if (token === "'") throw new RangeError('Unclosed quote in Date format')
    if (/^[A-Za-z]/.test(token) && !supported.has(token))
      throw new RangeError(
        `Unsupported Date format token: ${token}. Quote literal text with apostrophes.`,
      )
  }
  value = normalizeISOValue(value, opts.timezone)
  // The normalized fields already describe wall time in the requested zone.
  const timezone = 'UTC'
  if (value == null) return placeholder
  const numberFormatters = new Map<number, Intl.NumberFormat>()
  const number = (value: number, digits = 1): string => {
    if (!numberFormatters.has(digits))
      numberFormatters.set(digits, createDateNumberFormatter(locale, digits))
    return numberFormatters.get(digits)!.format(value)
  }
  const formatWithPattern = (date: Date): string => {
    const year = date.getUTCFullYear(),
      month = date.getUTCMonth() + 1,
      day = date.getUTCDate(),
      hour = date.getUTCHours(),
      minute = date.getUTCMinutes()
    const monthName = (month: 'short' | 'long') =>
      createDateFormatter(locale, {
        month,
        // Day context selects grammatical forms such as Russian «12 сентября».
        ...(tokens.some((token) => token === 'd' || token === 'dd')
          ? { day: 'numeric' as const }
          : {}),
        timeZone: timezone,
      })
        .formatToParts(date)
        .find((part) => part.type === 'month')?.value ?? ''
    return tokens
      .map((token) => {
        if (token === "''") return "'"
        if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'")
        switch (token) {
          case 'y':
            return number(year)
          case 'yy':
            return number(year % 100, 2)
          case 'yyyy':
            return number(year, 4)
          case 'M':
            return number(month)
          case 'MM':
            return number(month, 2)
          case 'MMM':
            return monthName('short')
          case 'MMMM':
            return monthName('long')
          case 'd':
            return number(day)
          case 'dd':
            return number(day, 2)
          case 'H':
            return number(hour)
          case 'HH':
            return number(hour, 2)
          case 'h':
            return number(hour % 12 || 12)
          case 'hh':
            return number(hour % 12 || 12, 2)
          case 'm':
            return number(minute)
          case 'mm':
            return number(minute, 2)
          case 'EEE':
          case 'EEEE':
            return createDateFormatter(locale, {
              weekday: token === 'EEE' ? 'short' : 'long',
              timeZone: timezone,
            }).format(date)
          case 'a':
            return (
              createDateFormatter(locale, {
                hour: 'numeric',
                hour12: true,
                timeZone: timezone,
              })
                .formatToParts(date)
                .find((part) => part.type === 'dayPeriod')?.value ?? ''
            )
          default:
            return token
        }
      })
      .join('')
  }
  const formatSingle = (iso: string | null): string => {
    if (!iso) return placeholder
    const date = civilToDate(iso, 'UTC')
    if (!date) return placeholder
    if (customFormat) return formatWithPattern(date)
    if (mode === 'time') {
      return createDateFormatter(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
      }).format(date)
    }
    if (mode === 'month') {
      return createDateFormatter(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: timezone,
      }).format(date)
    }
    if (mode === 'year') {
      return createDateFormatter(locale, {
        year: 'numeric',
        timeZone: timezone,
      }).format(date)
    }
    if (mode === 'datetime') {
      return createDateFormatter(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
      }).format(date)
    }
    return createDateFormatter(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
    }).format(date)
  }

  if (selection === 'range' && typeof value === 'object') {
    const start = formatSingle(value.start ?? null)
    const end = formatSingle(value.end ?? null)
    if (!value.start && !value.end) return placeholder
    if (value.start && !value.end) return `${start} - ...`
    return `${start} - ${end}`
  }

  if (typeof value === 'string') return formatSingle(value)
  return placeholder
}

export function toExternalValue(
  value: DateValueISO,
  format: DateValueFormat,
  timezone = 'UTC',
): DateValueExternal {
  if (format === 'iso') return value
  if (value == null) return null
  if (typeof value === 'string') return civilToDate(value, timezone)
  return {
    start: value.start ? civilToDate(value.start, timezone) : null,
    end: value.end ? civilToDate(value.end, timezone) : null,
  }
}

export function isDateDisabled(
  dateIso: string,
  min: string | null,
  max: string | null,
  disabledDates: readonly string[],
): boolean {
  const iso = extractDatePart(dateIso) ?? dateIso
  const floor = min ? extractDatePart(min) : null
  const ceil = max ? extractDatePart(max) : null
  if (floor && iso < floor) return true
  if (ceil && iso > ceil) return true
  return disabledDates.some((d) => extractDatePart(d) === iso)
}

export function isTimeDisabled(
  hour: number,
  minute: number,
  disabled: { hours?: number[]; minutes?: number[] } | null | undefined,
): boolean {
  if (!disabled) return false
  if (Array.isArray(disabled.hours) && disabled.hours.includes(hour))
    return true
  if (Array.isArray(disabled.minutes) && disabled.minutes.includes(minute))
    return true
  return false
}

export function getDefaultViews(mode: DateMode): DateView[] {
  switch (mode) {
    case 'datetime':
      return ['day', 'month', 'year', 'hours', 'minutes']
    case 'time':
      return ['hours', 'minutes']
    case 'month':
      return ['month', 'year']
    case 'year':
      return ['year']
    default:
      return ['day', 'month', 'year']
  }
}

export function getMonthGrid(
  locale: string,
): Array<{ value: number; label: string }> {
  const formatter = createDateFormatter(locale, {
    month: 'short',
    timeZone: 'UTC',
  })
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: formatter.format(new CalendarDate(2020, i + 1, 15).toDate('UTC')),
  }))
}

export function getYearGrid(year: number): number[] {
  const start =
    Math.floor((Math.min(9999, Math.max(1, year)) - 1) / 12) * 12 + 1
  return Array.from(
    { length: Math.min(12, 10000 - start) },
    (_, index) => start + index,
  )
}

export function getHourGrid(step = 1): number[] {
  const list: number[] = []
  for (let h = 0; h < 24; h += step) list.push(h)
  return list
}

export function getMinuteGrid(step = 5): number[] {
  const list: number[] = []
  for (let m = 0; m < 60; m += step) list.push(m)
  return list
}
