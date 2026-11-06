import { expect, it } from 'vitest'
import { pageCount, pageRange } from '../runtime/pagination'

it('pageCount rounds up and keeps one page for an empty list', () => {
  expect(pageCount(0, 10)).toBe(1)
  expect(pageCount(1, 10)).toBe(1)
  expect(pageCount(10, 10)).toBe(1)
  expect(pageCount(11, 10)).toBe(2)
  expect(pageCount(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER)
})

it('shows every page while they fit in the 2·siblings + 5 slots', () => {
  expect(pageRange(1, 1, 1)).toEqual([1])
  expect(pageRange(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7])
  expect(pageRange(3, 5, 0)).toEqual([1, 2, 3, 4, 5])
})

it('fills the side without a gap so the bar keeps its length', () => {
  expect(pageRange(1, 100, 1)).toEqual([1, 2, 3, 4, 5, null, 100])
  expect(pageRange(3, 100, 1)).toEqual([1, 2, 3, 4, 5, null, 100])
  expect(pageRange(98, 100, 1)).toEqual([1, null, 96, 97, 98, 99, 100])
  expect(pageRange(100, 100, 0)).toEqual([1, null, 98, 99, 100])
})

it('puts gaps on both sides of a page in the middle', () => {
  expect(pageRange(50, 100, 1)).toEqual([1, null, 49, 50, 51, null, 100])
  expect(pageRange(50, 100, 0)).toEqual([1, null, 50, null, 100])
  expect(pageRange(4, 100, 1)).toEqual([1, null, 3, 4, 5, null, 100])
  expect(pageRange(97, 100, 1)).toEqual([1, null, 96, 97, 98, null, 100])
})

it.each([0, 1, 3, 20])(
  'siblings=%s: sorted, unique, both ends and the current page, never longer than its slots',
  (siblings) => {
    for (const page of [1, 2, 3, 24, 50, 97, 99, 100]) {
      const range = pageRange(page, 100, siblings)
      const pages = range.filter((item): item is number => item !== null)
      expect(pages).toEqual([...new Set(pages)].sort((a, b) => a - b))
      expect(pages).toEqual(expect.arrayContaining([1, page, 100]))
      expect(range.length).toBeLessThanOrEqual(2 * siblings + 5)
      expect(range.findIndex((item, index) => item === null && range[index + 1] === null)).toBe(-1)
    }
  },
)

it('stays exact at the largest safe page count', () => {
  const last = Number.MAX_SAFE_INTEGER
  expect(pageRange(last, last, 1)).toEqual([1, null, last - 4, last - 3, last - 2, last - 1, last])
})
