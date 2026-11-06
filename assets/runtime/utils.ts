/** Concatenate class names, filtering out falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return [
    ...new Set(
      classes
        .filter((value): value is string => typeof value === 'string')
        .flatMap((value) => value.split(/\s+/))
        .filter(Boolean),
    ),
  ].join(' ')
}
