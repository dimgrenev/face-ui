import { DateFormatter, getDayOfWeek, parseDate } from '@internationalized/date'

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

const sunday = parseDate('2000-01-02')

/** Explicit business-week overrides win; null restores the regional default. */
export function resolveWeekStartsOn(
  locale: string,
  override: number | null,
): number {
  if (override !== null) {
    if (!Number.isInteger(override) || override < 0 || override > 6)
      throw new RangeError(
        'weekStartsOn must be an integer from 0 (Sunday) to 6 (Saturday)',
      )
    return override
  }
  const resolvedLocale = createDateFormatter(locale).resolvedOptions().locale
  return (7 - getDayOfWeek(sunday, resolvedLocale)) % 7
}
