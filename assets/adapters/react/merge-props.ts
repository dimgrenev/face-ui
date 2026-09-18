/**
 * mergeProps — merge multiple prop objects with handler composition
 *
 * Event handlers (on*) are chained; preventDefault cancels subsequent handlers.
 * className values are concatenated.
 * style objects are merged (later wins).
 * Everything else: later value wins.
 */

type AnyProps = Record<string, unknown>

/** Runs the consumer's handler first; its `preventDefault()` skips the built-in `internal` one. */
export function composeHandlers<E extends { defaultPrevented: boolean }>(
  consumer: ((event: E) => void) | undefined,
  internal: (event: E) => void,
): (event: E) => void {
  if (!consumer) return internal
  return (event) => {
    consumer(event)
    if (!event.defaultPrevented) internal(event)
  }
}

export function mergeProps<T extends AnyProps>(
  ...sources: (T | undefined)[]
): T {
  const result: AnyProps = {}

  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue

      const existing = result[key]

      // Chain event handlers
      if (
        key.startsWith('on') &&
        typeof value === 'function' &&
        typeof existing === 'function'
      ) {
        const prev = existing as (...args: unknown[]) => void
        const next = value as (...args: unknown[]) => void
        result[key] = (...args: unknown[]) => {
          prev(...args)
          if (
            !(args[0] as { defaultPrevented?: boolean } | undefined)
              ?.defaultPrevented
          )
            next(...args)
        }
        continue
      }

      // Merge className
      if (
        key === 'className' &&
        typeof existing === 'string' &&
        typeof value === 'string'
      ) {
        result[key] = `${existing} ${value}`.trim()
        continue
      }

      // Merge style objects
      if (
        key === 'style' &&
        typeof existing === 'object' &&
        typeof value === 'object'
      ) {
        result[key] = { ...(existing as object), ...(value as object) }
        continue
      }

      // Default: override
      result[key] = value
    }
  }

  return result as T
}
