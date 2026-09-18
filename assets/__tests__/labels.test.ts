import { describe, expect, it } from 'vitest'
import { formatLabel, resolveLabel, resolveLabels } from '../runtime/labels'
import { expectDevError } from './harness'

describe('resolveLabel', () => {
  it.each([
    ['  Close  ', 'Close'],
    ['', 'Default'],
    [' \n ', 'Default'],
    [undefined, 'Default'],
  ])('reads %j silently as %j', (value, expected) => {
    expect(resolveLabel(value, 'Default', 'Modal', 'closeLabel')).toBe(expected)
  })

  it.each([
    [false, 'false'],
    [12, '12'],
    [null, 'null'],
    [['Close'], 'array'],
  ])('replaces non-string %j with the fallback and reports it', (value, shown) => {
    expect(
      expectDevError(
        () => resolveLabel(value, 'Close modal', 'Modal', 'closeLabel'),
        new RegExp(
          `^Face UI Modal: invalid closeLabel ${shown}; using "Close modal"\\.$`,
        ),
      ),
    ).toBe('Close modal')
  })

  it('without a fallback reports that the value is ignored', () => {
    expect(
      expectDevError(
        () => resolveLabel(0, '', 'Rating', 'aria-label'),
        /^Face UI Rating: invalid aria-label 0; ignoring it\.$/,
      ),
    ).toBe('')
  })
})

describe('resolveLabels', () => {
  const defaults: { previous: string; next: string } = Object.freeze({
    previous: 'Previous',
    next: 'Next',
  })

  it('overlays own known entries on a fresh copy without touching either dictionary', () => {
    const labels = Object.freeze({ next: ' Дальше ', extra: 'ignored' })
    const resolved = resolveLabels(defaults, labels, 'Pagination')
    expect(resolved).toEqual({ previous: 'Previous', next: 'Дальше' })
    expect(resolved).not.toBe(defaults)
    expect(resolveLabels(defaults, undefined, 'Pagination')).toEqual(defaults)
    const inherited = Object.create({ next: 'Inherited' })
    expect(resolveLabels(defaults, inherited, 'Pagination')).toEqual(defaults)
  })

  it('treats blank and undefined entries as absent, silently', () => {
    expect(
      resolveLabels(defaults, { previous: '', next: undefined }, 'Pagination'),
    ).toEqual(defaults)
  })

  it.each([
    [null, 'null'],
    [false, 'false'],
    ['wrong', '"wrong"'],
    [[], 'array'],
  ])('ignores the non-object dictionary %j and reports it', (labels, shown) => {
    expect(
      expectDevError(
        () => resolveLabels(defaults, labels as never, 'Pagination'),
        new RegExp(
          `^Face UI Pagination: invalid labels ${shown}; using defaults\\.$`,
        ),
      ),
    ).toEqual(defaults)
  })

  it('reports a non-string entry by its key and keeps the valid ones', () => {
    expect(
      expectDevError(
        () =>
          resolveLabels(
            defaults,
            { previous: 42, next: 'Onward' } as never,
            'Pagination',
          ),
        /^Face UI Pagination: invalid labels\.previous 42; using "Previous"\.$/,
      ),
    ).toEqual({ previous: 'Previous', next: 'Onward' })
  })
})

describe('formatLabel', () => {
  it.each([
    ['Page {page}', { page: 3 }, 'Page 3'],
    ['{page}ページ', { page: 3 }, '3ページ'],
    ['{page} of {page}', { page: 3 }, '3 of 3'],
    ['Страница', { page: 3 }, 'Страница 3'],
    ['{index} of {count}', { index: 2, count: 5 }, '2 of 5'],
    ['Slide', { index: 2, count: 5 }, 'Slide 2 5'],
    ['Remove {name}', { name: '$& $1' }, 'Remove $& $1'],
  ])('%j with %j reads %j', (template, values, expected) => {
    expect(formatLabel(template, values)).toBe(expected)
  })
})
