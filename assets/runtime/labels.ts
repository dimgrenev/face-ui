import { invalidProp } from './props'

/**
 * Key names shared by every component's `labels` dictionary: an `XLabels`
 * reuses the key that names its action and adds its own only where none fits.
 */
export interface CommonLabels {
  /** Name of the control that closes a surface. */
  close: string
  /** Name of the control that clears the current value. */
  clear: string
  /** Name of the control that opens a surface or picker. */
  open: string
  /** Name of the control that expands a collapsed region. */
  expand: string
  /** Name of the control that collapses an expanded region. */
  collapse: string
  /** Name of the control that moves to the previous item or page. */
  previous: string
  /** Name of the control that moves to the next item or page. */
  next: string
  /** Name of the control that removes an item. */
  remove: string
  /** Name of the control that copies content. */
  copy: string
  /** Name of the control that reveals hidden or overflowing items. */
  more: string
  /** Text shown in place of an empty list or result. */
  empty: string
}

/**
 * A trimmed label, or `fallback` when the text is blank (silently, so blank
 * text cannot erase a name) or not a string (reported as `<component> <prop>`).
 */
export function resolveLabel(
  value: unknown,
  fallback: string,
  component: string,
  prop: string,
): string {
  if (typeof value === 'string') return value.trim() || fallback
  if (value !== undefined)
    invalidProp(
      component,
      prop,
      value,
      fallback ? `using ${JSON.stringify(fallback)}` : 'ignoring it',
    )
  return fallback
}

/**
 * A fresh copy of `defaults` overlaid with the caller's own known entries, each
 * read by `resolveLabel`; a dictionary that is not an object is reported and
 * ignored.
 */
export function resolveLabels<T extends Record<keyof T, string>>(
  defaults: T,
  labels: Partial<T> | undefined,
  component: string,
): T {
  const resolved = { ...defaults }
  if (labels === undefined) return resolved
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    invalidProp(component, 'labels', labels, 'using defaults')
    return resolved
  }
  for (const key of Object.keys(defaults) as Array<keyof T>)
    if (Object.prototype.hasOwnProperty.call(labels, key))
      resolved[key] = resolveLabel(
        labels[key],
        defaults[key],
        component,
        `labels.${String(key)}`,
      ) as T[keyof T]
  return resolved
}

/**
 * Replaces every `{name}` placeholder with its value; a value whose placeholder
 * the template lacks is appended after a space, so it is never lost.
 */
export function formatLabel(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  let text = template
  for (const [name, value] of Object.entries(values)) {
    const placeholder = `{${name}}`
    text = text.includes(placeholder)
      ? text.split(placeholder).join(String(value))
      : `${text} ${value}`
  }
  return text
}
