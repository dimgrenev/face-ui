// Declared here rather than taken from @types/node so the file compiles for
// consumers with `types: []`; bundlers replace the expression as they do for React.
declare const process: { env: { NODE_ENV?: string } }

const MAX_REPORTS = 500
const reported = new Set<string>()

/** Longest string a report prints; the rest is elided. A whole Markdown source is a value here. */
const SHOWN = 60

const show = (value: unknown) =>
  typeof value === 'string'
    ? JSON.stringify(value.length > SHOWN ? `${value.slice(0, SHOWN)}…` : value)
    : Array.isArray(value)
      ? 'array'
      : typeof value === 'function'
        ? 'function'
        : typeof value === 'object' && value !== null
          ? 'object'
          : String(value)

function production() {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return false // no bundler and no `process`: report as in development
  }
}

/**
 * Reports a prop Face UI had to normalize, in development only and once per distinct message:
 * `Face UI <Component>: invalid <prop> <value>; <outcome>.` (`undefined` reads `missing <prop>`).
 * A string value over 60 characters is shown elided, so a whole document never reaches the console.
 */
export function invalidProp(
  component: string,
  prop: string,
  value: unknown,
  outcome: string,
): void {
  if (production()) return
  const subject =
    value === undefined ? `missing ${prop}` : `invalid ${prop} ${show(value)}`
  const message = `Face UI ${component}: ${subject}; ${outcome}.`
  if (reported.has(message)) return
  if (reported.size >= MAX_REPORTS) reported.clear()
  reported.add(message)
  console.error(message)
}

/**
 * A finite number clamped into [min, max], truncated toward zero in integer domains; any other value
 * (NaN, Infinity, "50", null) becomes `fallback`. Strings are never coerced; `undefined` is silent,
 * every other change is reported.
 */
export function readNumber(
  component: string,
  prop: string,
  value: unknown,
  fallback: number,
  {
    integer = false,
    min = integer ? -Number.MAX_SAFE_INTEGER : -Infinity,
    max = integer ? Number.MAX_SAFE_INTEGER : Infinity,
  }: { integer?: boolean; min?: number; max?: number } = {},
): number {
  if (value === undefined) return fallback
  let result = fallback
  if (typeof value === 'number' && Number.isFinite(value))
    result = Math.min(max, Math.max(min, integer ? Math.trunc(value) : value))
  if (result !== value) invalidProp(component, prop, value, `using ${result}`)
  return result
}

/** @internal Test harness only: forgets which messages were already reported. */
export function resetInvalidPropReports(): void {
  reported.clear()
}
