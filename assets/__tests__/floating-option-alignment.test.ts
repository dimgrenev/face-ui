import { expect, it } from 'vitest'
import { alignFloatingOption } from '../adapters/react/floating-option-alignment'

const layout = { contentHeight: 232, minimumTop: 8, maximumTop: 560, optionCenterOffsets: [20, 51, 89, 126, 164, 210] }
it('faces the first real row near the viewport top, including asymmetric padding', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 70 })).toBe(50)
})
it('faces the last real row near the viewport bottom', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 765 })).toBe(555)
})
it('faces the measured central row when centered placement fits', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 380 })).toBe(254)
})
it('keeps fractional row geometry instead of rounding the line away', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 70.25, optionCenterOffsets: [20.5, 51] })).toBe(49.75)
})
it('chooses the first feasible row when the first one cannot fit at an extreme edge', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 22, optionCenterOffsets: [20, 12, 50] })).toBe(10)
})
it('falls back to centered clamping for continuous content and invalid selectors', () => {
  expect(alignFloatingOption({ ...layout, triggerCenter: 70, optionCenterOffsets: [] })).toBe(8)
  expect(alignFloatingOption({ ...layout, triggerCenter: 765, optionCenterOffsets: [NaN, Infinity] })).toBe(560)
})
