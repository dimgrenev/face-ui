/** Resolve a label without allowing empty text to erase an accessible name. */
export function resolveLabel(
  value: unknown,
  fallback: string,
  name: string,
): string {
  if (value !== undefined && typeof value !== 'string')
    throw new RangeError(`${name} must be a string`)
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

/** Resolve the owner's labels without mutating a shared application dictionary.
 * Read only known own properties; empty entries cannot erase a control's name. */
export function resolveLabels<T extends Record<keyof T, string>>(
  defaults: T,
  labels: Partial<T> | undefined,
  component: string,
): T {
  const resolved = { ...defaults }
  if (labels === undefined) return resolved
  if (!labels || typeof labels !== 'object' || Array.isArray(labels))
    throw new RangeError(`${component} labels must be an object`)
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    if (!Object.prototype.hasOwnProperty.call(labels, key)) continue
    const value = labels[key]
    resolved[key] = resolveLabel(
      value,
      defaults[key],
      `${component} labels.${String(key)}`,
    ) as T[typeof key]
  }
  return resolved
}
