import { afterEach, expect, it, vi } from 'vitest'
import { acquireBodyScrollLock } from '../adapters/react/use-body-scroll-lock'

afterEach(() => document.body.removeAttribute('style'))

it('keeps a nested surface locked when its parent releases first', () => {
  document.body.style.setProperty('overflow', 'auto', 'important')
  document.body.style.paddingRight = '12px'
  const priority = document.body.style.getPropertyPriority('overflow')
  const releaseParent = acquireBodyScrollLock(document)
  const lockedPadding = document.body.style.paddingRight
  const releaseChild = acquireBodyScrollLock(document)
  expect(document.body.style.paddingRight).toBe(lockedPadding)
  releaseParent()
  expect(document.body.style.overflow).toBe('hidden')
  releaseParent()
  releaseChild()
  expect(document.body.style.overflow).toBe('auto')
  expect(document.body.style.getPropertyPriority('overflow')).toBe(priority)
  expect(document.body.style.paddingRight).toBe('12px')
})

it('does not disable touch scrolling within the surface', () => {
  document.body.style.touchAction = 'pan-y'
  const release = acquireBodyScrollLock(document)
  expect(document.body.style.touchAction).toBe('pan-y')
  release()
})

it('pads the removed scrollbar on the side it occupied', () => {
  const root = document.documentElement
  // jsdom has no layout: a 15px scrollbar, on the right or (RTL) the left.
  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: window.innerWidth - 15,
  })
  try {
    for (const [left, padded, kept] of [
      [0, 'paddingRight', 'paddingLeft'],
      [15, 'paddingLeft', 'paddingRight'],
    ] as const) {
      vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
        left,
      } as DOMRect)
      document.body.style.padding = '0 4px'
      const release = acquireBodyScrollLock(document)
      expect([document.body.style[padded], document.body.style[kept]]).toEqual([
        '19px',
        '4px',
      ])
      release()
      expect(document.body.style.padding).toBe('0px 4px')
      vi.restoreAllMocks()
    }
  } finally {
    delete (root as { clientWidth?: number }).clientWidth
  }
})
