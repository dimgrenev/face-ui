// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { acquireBodyScrollLock } from './use-body-scroll-lock'

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
