import {
  getEffectiveSelection,
  isDateObject,
  normalizeISOValue,
  projectDateValue,
  type DateMode,
  type DateSelection,
  type DateValueISO,
} from '../date-utils'

function readPoint(input: unknown, timezone: string, prop: string): string {
  if (typeof input === 'string' || isDateObject(input)) {
    const value = normalizeISOValue(input, timezone)
    if (typeof value === 'string') return value
  }
  throw new RangeError(
    `Date ${prop} must be a valid Gregorian ISO date, datetime, explicit-offset instant or Date (years 0001–9999)`,
  )
}

export function readDateValue(
  input: unknown,
  mode: DateMode,
  selection: DateSelection,
  timezone: string,
  prop: string,
): DateValueISO {
  let value: DateValueISO = null
  if (input != null) {
    if (getEffectiveSelection(mode, selection) === 'single') {
      value = readPoint(input, timezone, prop)
    } else {
      if (
        typeof input !== 'object' ||
        isDateObject(input) ||
        Array.isArray(input) ||
        !('start' in input) ||
        !('end' in input)
      )
        throw new RangeError(
          `Date ${prop} must have start and end dates, each ISO, Date or null, for range selection`,
        )
      value = {
        start:
          input.start === null
            ? null
            : readPoint(input.start, timezone, `${prop}.start`),
        end:
          input.end === null
            ? null
            : readPoint(input.end, timezone, `${prop}.end`),
      }
    }
  }
  return projectDateValue(value, mode, selection)
}

export function readDateBound(
  input: unknown,
  timezone: string,
  prop: string,
): string | null {
  return input == null ? null : readPoint(input, timezone, prop)
}

export function readDisabledDates(input: unknown, timezone: string): string[] {
  if (input === undefined) return []
  if (!Array.isArray(input))
    throw new RangeError(
      'Date disabledDates must be an array of ISO dates or Date instants',
    )
  return Array.from(input, (value, index) =>
    readPoint(value, timezone, `disabledDates[${index}]`).slice(0, 10),
  )
}

export function readDisabledTime(
  input: { hours?: number[]; minutes?: number[] } | undefined,
) {
  if (input === undefined) return null
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new RangeError(
      'Date disabledTime must contain hours and/or minutes arrays',
    )
  for (const [key, max] of [
    ['hours', 23],
    ['minutes', 59],
  ] as const) {
    const values = input[key]
    if (
      values !== undefined &&
      (!Array.isArray(values) ||
        Array.from(values).some(
          (value) => !Number.isInteger(value) || value < 0 || value > max,
        ))
    )
      throw new RangeError(
        `Date disabledTime.${key} must be an array of integers from 0 to ${max}`,
      )
  }
  return input
}

/** Presets are named business actions, not a second source of hidden defaults. */
export function readDatePresets(
  input: unknown,
  mode: DateMode,
  selection: DateSelection,
  timezone: string,
): Array<{ id: string; label: string; value: DateValueISO }> {
  if (input === undefined) return []
  if (!Array.isArray(input))
    throw new RangeError(
      'Date presets must be an array of id, label and value actions',
    )
  const ids = new Set<string>()
  return Array.from(input, (entry, index) => {
    const prop = `presets[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new RangeError(`Date ${prop} must contain id, label and value`)
    if (typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id))
      throw new RangeError(
        `Date ${prop}.id must be a nonempty, unique action identifier`,
      )
    if (typeof entry.label !== 'string' || !entry.label.trim())
      throw new RangeError(`Date ${prop}.label must be a nonempty string`)
    const value = readDateValue(
      entry.value,
      mode,
      selection,
      timezone,
      `${prop}.value`,
    )
    if (
      value === null ||
      (typeof value === 'object' && !value.start && !value.end)
    )
      throw new RangeError(
        `Date ${prop}.value must select at least one date; use the clear action to clear selection`,
      )
    ids.add(entry.id)
    return { id: entry.id, label: entry.label, value }
  })
}
