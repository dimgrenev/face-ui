/** A number, bigint or text to order by; `undefined` for empty values and values without an order. */
function rank(value: unknown): number | bigint | string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value
  if (typeof value === 'bigint') return value
  if (typeof value === 'boolean') return Number(value)
  if (value instanceof Date) return rank(value.getTime())
  return undefined
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/**
 * `rows` ordered by `value(row)`: numbers, dates and booleans by magnitude, text by the default
 * locale with digits compared as numbers. Empty values (`null`, `undefined`, blank text) and values
 * without an order (elements, plain objects) go last in either direction; ties keep their order.
 */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => unknown,
  direction: 'asc' | 'desc',
): T[] {
  const sign = direction === 'desc' ? -1 : 1
  return rows
    .map((row) => ({ row, rank: rank(value(row)) }))
    .sort(({ rank: a }, { rank: b }) => {
      if (a === undefined || b === undefined)
        return Number(a === undefined) - Number(b === undefined)
      if (typeof a === 'string' || typeof b === 'string')
        return sign * collator.compare(String(a), String(b))
      return sign * (a < b ? -1 : a > b ? 1 : 0)
    })
    .map(({ row }) => row)
}
