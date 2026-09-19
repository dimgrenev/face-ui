/** Number of pages `total` items fill at `pageSize` per page; an empty list still has page 1. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

const run = (from: number, length: number) =>
  Array.from({ length }, (_, offset) => from + offset)

/**
 * The page buttons of a pagination bar, `null` marking each gap: the first and last pages, and
 * `page` with `siblings` pages on each side. Once pages outnumber its 2·siblings + 5 slots the bar
 * keeps that length, filling the side without a gap with more pages. Expects integers,
 * 1 ≤ page ≤ pages and siblings ≥ 0.
 */
export function pageRange(
  page: number,
  pages: number,
  siblings: number,
): (number | null)[] {
  const slots = 2 * siblings + 5
  if (pages <= slots) return run(1, pages)
  const start = Math.max(page - siblings, 1)
  const end = Math.min(page + siblings, pages)
  if (start <= 2) return [...run(1, slots - 2), null, pages]
  if (end >= pages - 1) return [1, null, ...run(pages - slots + 3, slots - 2)]
  return [1, null, ...run(start, end - start + 1), null, pages]
}
