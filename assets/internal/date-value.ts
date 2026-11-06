import { areContextValuesEqual } from '../create-machine'
import { invalidProp } from '../runtime/props'
import type { MachineConfig, MachineSchema, MachineSnapshot } from '../types'
import {
  isDateObject,
  normalizeISOValue,
  projectDateValue,
  type DateMode,
  type DateSelection,
  type DateValueISO,
} from '../date-utils'

type Read = (input: unknown, prop: string, outcome?: string) => string | null

/** `parse(input)`, or null: empty input is absent, silently; input `parse` cannot read is reported. */
function readWith(
  component: string,
  parse: (input: unknown) => DateValueISO,
): Read {
  return (input, prop, outcome = 'using no date') => {
    if (input == null || input === '') return null
    const value = parse(input)
    if (typeof value === 'string') return value
    invalidProp(component, prop, input, outcome)
    return null
  }
}

/** A Date civil ISO point in `timezone`: a date, a datetime, an explicit-offset instant or a `Date`. */
export const readPoint = (
  input: unknown,
  timezone: string,
  prop: string,
  outcome?: string,
) =>
  readWith('Date', (input) =>
    typeof input === 'string' || isDateObject(input)
      ? normalizeISOValue(input, timezone)
      : null,
  )(input, prop, outcome)

/** A Calendar `YYYY-MM-DD` Gregorian day. */
export const readCivilDay: Read = readWith('Calendar', (input) =>
  typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? normalizeISOValue(input)
    : null,
)

/** A point or a `{ start, end }` range, each endpoint read by `read`; the caller projects the shape. */
export function readDateShape(
  input: unknown,
  prop: string,
  read: Read,
): DateValueISO {
  if (!input || typeof input !== 'object' || isDateObject(input) || Array.isArray(input))
    return read(input, prop)
  const { start, end } = input as { start?: unknown; end?: unknown }
  return { start: read(start, `${prop}.start`), end: read(end, `${prop}.end`) }
}

/** A Date value in the shape of `mode` and `selection`: a range given for a point is projected, silently, and vice versa. */
export function readDateValue(
  input: unknown,
  mode: DateMode,
  selection: DateSelection,
  timezone: string,
  prop: string,
): DateValueISO {
  return projectDateValue(
    readDateShape(input, prop, (input, prop) => readPoint(input, timezone, prop)),
    mode,
    selection,
  )
}

/** Readable days of a list: a non-array is empty, and each unreadable entry is dropped; both are reported. */
export function readDateList(
  input: unknown,
  component: string,
  prop: string,
  read: Read,
): string[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) {
    invalidProp(component, prop, input, 'using no dates')
    return []
  }
  return Array.from(input, (entry, index) => {
    const at = `${prop}[${index}]`
    if (entry == null || entry === '') invalidProp(component, at, entry, 'dropping it')
    return read(entry, at, 'dropping it')?.slice(0, 10)
  }).filter((day): day is string => !!day)
}

/**
 * Presets are named business actions, not a second source of hidden defaults. A preset without an
 * object shape, a unique id, a label or a date to select is reported and dropped.
 */
export function readDatePresets(
  input: unknown,
  mode: DateMode,
  selection: DateSelection,
  timezone: string,
): Array<{ id: string; label: string; value: DateValueISO }> {
  if (input === undefined) return []
  if (!Array.isArray(input)) {
    invalidProp('Date', 'presets', input, 'showing no presets')
    return []
  }
  const ids = new Set<string>()
  return Array.from(input, (entry, index) => {
    const prop = `presets[${index}]`
    const { id, label, value } = (entry ?? {}) as Record<string, unknown>
    const date =
      typeof id === 'string' && id.trim() && !ids.has(id) && typeof label === 'string' && label.trim()
        ? readDateValue(value, mode, selection, timezone, `${prop}.value`)
        : null
    if (!date || (typeof date === 'object' && !date.start && !date.end)) {
      invalidProp('Date', prop, entry, 'dropping the preset')
      return []
    }
    ids.add(id as string)
    return [{ id: id as string, label: label as string, value: date }]
  }).flat()
}

/**
 * `state` with the context fields React owns and the computed values derived from them, so a render
 * never shows a machine proposal the parent has not accepted; the machine catches up after commit.
 */
export function withOwnedContext<S extends MachineSchema>(
  config: MachineConfig<S>,
  state: MachineSnapshot<S>,
  owned: Partial<S['context']>,
): MachineSnapshot<S> {
  const current = state.context as Record<string, unknown>
  if (Object.entries(owned).every(([key, value]) => areContextValuesEqual(current[key], value)))
    return state
  const context = { ...state.context, ...owned }
  const helpers = { matches: state.matches, hasTag: state.hasTag }
  const computed = Object.fromEntries(
    Object.entries(config.computed ?? {}).map(([key, compute]) => [
      key,
      compute(context, helpers),
    ]),
  )
  return { ...state, context, computed }
}
