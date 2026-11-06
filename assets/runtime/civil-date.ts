import { parseDate, parseDateTime } from '@internationalized/date'

function assertSupportedYear(value: string) {
  if (!/^(?!0000)\d{4}-/.test(value))
    throw new RangeError('Civil dates must use Gregorian years 0001–9999')
}

/** The picker domain is narrower than the underlying calendar's era support. */
export function parseCivilDate(value: string) {
  assertSupportedYear(value)
  return parseDate(value)
}

export function parseCivilDateTime(value: string) {
  assertSupportedYear(value)
  return parseDateTime(value)
}
