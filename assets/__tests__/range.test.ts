import { expect, it } from 'vitest'
import { createRange } from '../runtime/range'
import { expectDevError } from './harness'

for (const [min, max, step, input, expected] of [
  [0, 1, 0.1, 0.3, 0.3],
  [-0.5, 0.5, 0.1, 0.3, 0.3],
  [1e14, 1e14 + 100, 1, 1e14 + 20, 1e14 + 20],
  [0, 1, 0.6, 1, 0.6],
  [0.1, 1, 0.2, 0.4, 0.5],
  [-1e308, 1e308, 1e307, 0, 0],
  [0, 1e-300, 1e-301, 3e-301, 3e-301],
  [42, 42, 1, 100, 42],
])
  it(`decimal grid ${min}..${max}/${step} normalizes ${input}`, () => {
    const grid = createRange(min, max, step)
    expect(grid.snap(input)).toBe(expected)
    expect(grid.snap(grid.snap(input))).toBe(expected)
    expect(Number.isFinite(grid.ratio(expected))).toBe(true)
  })

it('equal bounds are a legal single-value range', () => {
  const grid = createRange(5, 5, 1)
  expect([grid.min, grid.max, grid.snap(9), grid.ratio(5)]).toEqual([5, 5, 5, 0])
})

it.each([
  [NaN, 100, /invalid min NaN; using 0\.\.100/],
  [-Infinity, 100, /invalid min -Infinity; using 0\.\.100/],
  [0, Infinity, /invalid max Infinity; using 0\.\.100/],
  [10, 0, /invalid max 0; using 0\.\.100/],
  ['5', 10, /invalid min "5"; using 0\.\.100/],
])('bounds %j..%j become 0..100 and are reported', (min, max, message) => {
  const grid = expectDevError(
    () => createRange(min as number, max as number, 1),
    new RegExp(`^Face UI Slider: ${message.source}\\.$`),
  )
  expect([grid.min, grid.max, grid.snap(150)]).toEqual([0, 100, 100])
})

it.each([0, -1, Infinity, NaN])('step %s becomes 1 and is reported', (step) => {
  const grid = expectDevError(
    () => createRange(0, 10, step),
    new RegExp(`^Face UI Slider: invalid step ${step}; using 1\\.$`),
  )
  expect([grid.step, grid.move(4, 1)]).toEqual([1, 5])
})

it('non-finite values read as the nearest bound instead of failing', () => {
  const grid = createRange(0, 10, 1)
  expect([NaN, -Infinity, Infinity].map(grid.snap)).toEqual([0, 0, 10])
})

it('a step below float resolution renders as given and is only reported', () => {
  const grid = expectDevError(
    () => createRange(1e14, 1e14 + 100, 0.001),
    /^Face UI Slider: invalid step 0\.001; keeping it, though some steps cannot change the value\.$/,
  )
  expect(grid.step).toBe(0.001)
  expect(grid.snap(1e14 + 20)).toBe(1e14 + 20)
  expect(createRange(1e14, 1e14 + 100, 0.1).move(1e14 + 20, 1)).toBe(
    1e14 + 20.1,
  )
})
