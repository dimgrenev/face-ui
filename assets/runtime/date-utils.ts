export type DateMode = 'date' | 'datetime' | 'time' | 'week' | 'month' | 'year'
export type DateSelection = 'single' | 'range'
export type DateView = 'day' | 'month' | 'year' | 'hours' | 'minutes'
export type DateValueFormat = 'iso' | 'date'

export type DateRangeISO = { start: string | null; end: string | null } | null
export type DateValueISO = string | DateRangeISO | null
export type DateValueExternal = string | Date | { start: string | Date | null; end: string | Date | null } | null

const DEFAULT_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(input: Date): string {
  return `${input.getFullYear()}-${pad2(input.getMonth() + 1)}-${pad2(input.getDate())}`
}

export function toISODateTime(input: Date): string {
  return `${toISODate(input)}T${pad2(input.getHours())}:${pad2(input.getMinutes())}`
}

export function parseDateLike(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }
  const value = String(input).trim()
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    const result = new Date(y, m - 1, d)
    return Number.isNaN(result.getTime()) ? null : result
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const [datePart, timePart = '00:00'] = value.split('T')
    const [y, m, d] = datePart.split('-').map(Number)
    const [hh, mm] = timePart.slice(0, 5).split(':').map(Number)
    const result = new Date(y, m - 1, d, hh, mm)
    return Number.isNaN(result.getTime()) ? null : result
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function normalizeISOValue(value: DateValueExternal): DateValueISO {
  if (value == null) return null
  if (typeof value === 'object' && !(value instanceof Date) && ('start' in value || 'end' in value)) {
    const start = parseDateLike((value as { start?: string | Date | null }).start ?? null)
    const end = parseDateLike((value as { end?: string | Date | null }).end ?? null)
    return {
      start: start ? toISODateTime(start) : null,
      end: end ? toISODateTime(end) : null,
    }
  }
  const d = parseDateLike(value as string | Date | null)
  return d ? toISODateTime(d) : null
}

export function extractDatePart(iso: string | null): string | null {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  if (/^\d{4}-\d{2}-\d{2}T/.test(iso)) return iso.slice(0, 10)
  const parsed = parseDateLike(iso)
  return parsed ? toISODate(parsed) : null
}

export function mergeDateAndTime(dateIso: string, hour: number, minute: number): string {
  return `${dateIso}T${pad2(hour)}:${pad2(minute)}`
}

export function parseTimeFromISO(iso: string | null): { hour: number; minute: number } {
  if (!iso) return { hour: 0, minute: 0 }
  const m = iso.match(/T(\d{2}):(\d{2})/)
  if (!m) return { hour: 0, minute: 0 }
  return { hour: Number(m[1]) || 0, minute: Number(m[2]) || 0 }
}

export function normalizeRange(start: string | null, end: string | null): { start: string | null; end: string | null } {
  if (start && end && start > end) return { start: end, end: start }
  return { start, end }
}

export function startOfWeek(isoDate: string, weekStartsOn: number): string {
  const d = parseDateLike(isoDate)
  if (!d) return isoDate
  const dow = d.getDay()
  const diff = (dow - weekStartsOn + 7) % 7
  const result = new Date(d)
  result.setDate(d.getDate() - diff)
  return toISODate(result)
}

export function endOfWeek(isoDate: string, weekStartsOn: number): string {
  const start = parseDateLike(startOfWeek(isoDate, weekStartsOn))
  if (!start) return isoDate
  start.setDate(start.getDate() + 6)
  return toISODate(start)
}

export function formatTriggerValue(
  value: DateValueISO,
  opts: {
    mode: DateMode
    selection: DateSelection
    locale: string
    timezone: string
    placeholder: string
  },
): string {
  const { mode, selection, locale, timezone, placeholder } = opts
  if (value == null) return placeholder
  const formatSingle = (iso: string | null): string => {
    if (!iso) return placeholder
    const date = parseDateLike(iso)
    if (!date) return placeholder
    if (mode === 'time') {
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }).format(date)
    }
    if (mode === 'month') {
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: timezone }).format(date)
    }
    if (mode === 'year') {
      return new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: timezone }).format(date)
    }
    if (mode === 'datetime') {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
      }).format(date)
    }
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone }).format(date)
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

export function toExternalValue(value: DateValueISO, format: DateValueFormat): DateValueExternal {
  if (format === 'iso') return value
  if (value == null) return null
  if (typeof value === 'string') return parseDateLike(value)
  return {
    start: value.start ? parseDateLike(value.start) : null,
    end: value.end ? parseDateLike(value.end) : null,
  }
}

export function isDateDisabled(
  dateIso: string,
  min: string | null,
  max: string | null,
  disabledDates: string[],
): boolean {
  const iso = extractDatePart(dateIso) ?? dateIso
  const floor = min ? extractDatePart(min) : null
  const ceil = max ? extractDatePart(max) : null
  if (floor && iso < floor) return true
  if (ceil && iso > ceil) return true
  return disabledDates.some((d) => extractDatePart(d) === iso)
}

export function isTimeDisabled(hour: number, minute: number, disabled: { hours?: number[]; minutes?: number[] } | null | undefined): boolean {
  if (!disabled) return false
  if (Array.isArray(disabled.hours) && disabled.hours.includes(hour)) return true
  if (Array.isArray(disabled.minutes) && disabled.minutes.includes(minute)) return true
  return false
}

export function getDefaultViews(mode: DateMode): DateView[] {
  switch (mode) {
    case 'datetime':
      return ['day', 'hours', 'minutes']
    case 'time':
      return ['hours', 'minutes']
    case 'month':
      return ['month', 'year']
    case 'year':
      return ['year']
    default:
      return ['day']
  }
}

export function getMonthGrid(locale: string): Array<{ value: number; label: string }> {
  return Array.from({ length: 12 }, (_, i) => {
    try {
      const d = new Date(2020, i, 1)
      return { value: i + 1, label: d.toLocaleDateString(locale, { month: 'short' }) }
    } catch {
      return { value: i + 1, label: DEFAULT_MONTH_NAMES[i].slice(0, 3) }
    }
  })
}

export function getYearGrid(centerYear: number, radius = 6): number[] {
  const list: number[] = []
  for (let y = centerYear - radius; y <= centerYear + radius; y += 1) list.push(y)
  return list
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

