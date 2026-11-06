import {
  type DateRangeValue,
  extractDatePart,
  isDateDisabled,
  normalizeRange,
} from './date-utils'

type Range = DateRangeValue<string>
interface DateRangeConstraints {
  min: string | null
  max: string | null
  disabledDates: readonly string[]
  excludeDisabledDates: boolean
}

/** Whole-day constraints apply to both endpoints and, by default, the interval.
 * Inspect the unavailable dates, never enumerate an arbitrarily long range. */
export function isDateRangeDisabled(
  range: Range,
  { min, max, disabledDates, excludeDisabledDates }: DateRangeConstraints,
): boolean {
  if (
    (range.start && isDateDisabled(range.start, min, max, disabledDates)) ||
    (range.end && isDateDisabled(range.end, min, max, disabledDates))
  )
    return true
  if (!excludeDisabledDates || !range.start || !range.end) return false
  const start = extractDatePart(range.start)!,
    end = extractDatePart(range.end)!
  return disabledDates.some((value) => {
    const day = extractDatePart(value)!
    return day >= start && day <= end
  })
}

/** A forbidden completion starts a new draft at the activated point. This also
 * lets the user leave an anchor made unavailable by a live constraint update. */
export function getNextDateRange(
  current: Range,
  point: string,
  isDisabled: (range: Range) => boolean,
): Range {
  if ((current.start === null) !== (current.end === null)) {
    const candidate = normalizeRange(
      current.start ?? point,
      current.end ?? point,
    )
    if (!isDisabled(candidate)) return candidate
  }
  return { start: point, end: null }
}
