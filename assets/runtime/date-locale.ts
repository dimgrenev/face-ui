import { DateFormatter, getDayOfWeek, parseDate } from '@internationalized/date'
import { invalidProp } from './props'

/** Labels and arithmetic must describe the same Gregorian civil date. */
export function createDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): DateFormatter {
  return new DateFormatter(locale, { ...options, calendar: 'gregory' })
}

export function createDateNumberFormatter(
  locale: string,
  minimumIntegerDigits = 1,
) {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumIntegerDigits,
  })
}

/**
 * The locale and zone Intl resolves for the requested ones. A locale or zone Intl rejects is
 * reported and replaced by `'en-US'` or `'UTC'`; an empty string means the default, silently.
 */
export function resolveDateLocale(
  component: string,
  locale: unknown,
  timeZone: unknown = 'UTC',
): { locale: string; timeZone: string } {
  const resolve = (locale: unknown, timeZone?: unknown) =>
    createDateFormatter(
      locale as string,
      timeZone === undefined ? {} : { timeZone: timeZone as string },
    ).resolvedOptions()
  let resolved = 'en-US'
  try {
    if (locale !== '') resolved = resolve(locale).locale
  } catch {
    invalidProp(component, 'locale', locale, 'using "en-US"')
  }
  try {
    return { locale: resolved, timeZone: resolve(resolved, timeZone || 'UTC').timeZone }
  } catch {
    invalidProp(component, 'timezone', timeZone, 'using "UTC"')
    return { locale: resolved, timeZone: 'UTC' }
  }
}

const isWeekday = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6

/** A first weekday from 0 (Sunday) to 6, or null for the locale's own; anything else is reported. */
export function readWeekStartsOn(component: string, value: unknown): number | null {
  if (value == null) return null
  if (isWeekday(value)) return value
  invalidProp(component, 'weekStartsOn', value, "using the locale's first weekday")
  return null
}

const sunday = parseDate('2000-01-02')

/** Explicit business-week overrides win; null, or a value outside 0–6, uses the regional default. */
export function resolveWeekStartsOn(
  locale: string,
  override: number | null,
): number {
  if (isWeekday(override)) return override
  const resolvedLocale = createDateFormatter(locale).resolvedOptions().locale
  return (7 - getDayOfWeek(sunday, resolvedLocale)) % 7
}
