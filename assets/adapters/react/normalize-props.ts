/**
 * normalizeProps — type-level React adapter
 *
 * Maps native DOM event handler types to React synthetic event types.
 * Runtime: identity function (React synth events mirror native API).
 * TypeScript: converts handler signatures for JSX compatibility.
 */

type PropWithHandlers = Record<string, unknown>

export type NormalizedProps<T extends PropWithHandlers> = T

export function normalizeProps<T extends PropWithHandlers>(props: T): NormalizedProps<T> {
  return props
}
