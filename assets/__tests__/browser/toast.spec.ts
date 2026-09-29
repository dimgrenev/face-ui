import { test, expect, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/toast.fixture'

const { renderToaster, renderToasterInModal, showToast } = hooks<Hooks>()

test('toasts announced during a modal remain inside its live and focus boundary', { tag: ['@focus', '@a11y'] }, async ({ page }) => {
  await renderToasterInModal(page)
  await page.getByRole('button', { name: 'Open work' }).click()
  const dialog = page.getByRole('dialog', { name: 'Work' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.uf-toaster')).toHaveAttribute('aria-live', 'polite')
  await showToast(page, { title: 'Saved in modal', duration: 0 })
  const status = dialog.getByRole('status', { name: 'Saved in modal' })
  await expect(status).toBeVisible()
  expect(await status.evaluate((node) => !!node.closest('[inert]'))).toBe(false)
  await dialog.getByRole('button', { name: 'Continue work' }).focus()
  await page.keyboard.press('F8')
  await expect(dialog.locator('.uf-toaster')).toBeFocused()
  await status.focus()
  await page.keyboard.press('Escape')
  await expect(status).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Continue work' })).toBeFocused()
})
const region = (page: Page) => page.getByRole('region', { name: 'Notifications (F8)' })
const toasts = (page: Page) => page.locator('[data-scope="toast"][data-part="root"]')
const toast = (page: Page, title: string) => page.getByRole('status', { name: title, exact: true })
const box = async (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect)
/** The viewport inset the stack keeps, resolved from its token. */
const inset = (page: Page) =>
  page.locator('.uf-toaster').evaluate((node) => {
    const probe = node.appendChild(document.createElement('div'))
    probe.style.width = 'var(--uf-toast-viewport-inset)'
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  })

test.beforeEach(async ({ page }) => {
  await open(page, 'toast')
})

for (const direction of ['ltr', 'rtl'] as const)
  for (const placement of ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'] as const)
    test(`${direction} ${placement}: the stack sits at its edge, newest nearest it, without overlap`, { tag: ['@layout'] }, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1000, height: 700 })
      await renderToaster(page, { placement }, { direction })
      for (const title of ['First', 'Second', 'Third']) await showToast(page, { title, duration: 0 })
      const gap = await inset(page)
      const stack = await box(page, '.uf-toaster')
      const [vertical, side] = placement.split('-') as ['top' | 'bottom', 'start' | 'center' | 'end']
      if (vertical === 'top') expect(stack.top).toBeCloseTo(gap, 0)
      else expect(700 - stack.bottom).toBeCloseTo(gap, 0)
      const left = side === 'center' ? null : (side === 'start') === (direction === 'ltr')
      if (left === true) expect(stack.left).toBeCloseTo(gap, 0)
      else if (left === false) expect(1000 - stack.right).toBeCloseTo(gap, 0)
      else expect(stack.left).toBeCloseTo(1000 - stack.right, 0)
      const rects = await toasts(page).evaluateAll((nodes) =>
        nodes.map((node) => ({ title: node.querySelector('[data-part="title"]')!.textContent, ...node.getBoundingClientRect().toJSON() })),
      )
      for (let i = 1; i < rects.length; i++) expect(rects[i]!.top).toBeGreaterThan(rects[i - 1]!.bottom)
      const nearest = vertical === 'top' ? rects[0]! : rects.at(-1)!
      expect(nearest.title).toBe('Third')
      expect(vertical === 'top' ? nearest.top - stack.top : stack.bottom - nearest.bottom).toBeCloseTo(0, 0)
    })

test('at 360px the stack spans the viewport between the compact insets', { tag: ['@layout'] }, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await renderToaster(page, { placement: 'bottom-end' })
  await showToast(page, { title: 'Saved', description: 'A long description that wraps onto several lines at this width.', duration: 0 })
  const gap = await inset(page)
  const stack = await box(page, '.uf-toaster')
  expect(gap).toBeLessThan(10)
  expect(stack.left).toBeCloseTo(gap, 0)
  expect(360 - stack.right).toBeCloseTo(gap, 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
})

test('safe-area insets keep the stack clear of notches and the home indicator', { tag: ['@layout'] }, async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 800, height: 600 })
  const safe = { top: 0, bottom: 0, left: 0, right: 0 }
  if (browserName === 'chromium') {
    // Only Chromium can emulate a display cutout; elsewhere env() is 0 and the plain inset applies.
    Object.assign(safe, { top: 30, bottom: 34, left: 12, right: 44 })
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: safe })
    await page.evaluate(() =>
      document.querySelector('meta[name="viewport"]')!.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover'),
    )
  }
  for (const placement of ['bottom-start', 'top-end'] as const) {
    await renderToaster(page, { placement })
    await showToast(page, { title: 'Saved', duration: 0 })
    const gap = await inset(page)
    const stack = await box(page, '.uf-toaster')
    const x = Math.max(safe.left, safe.right)
    if (placement === 'bottom-start') {
      expect(600 - stack.bottom).toBeCloseTo(gap + safe.bottom, 0)
      expect(stack.left).toBeCloseTo(gap + x, 0)
    } else {
      expect(stack.top).toBeCloseTo(gap + safe.top, 0)
      expect(800 - stack.right).toBeCloseTo(gap + x, 0)
    }
  }
})

test('only the toasts take the pointer: the page stays clickable between and around them', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await renderToaster(page, { placement: 'bottom-center' })
  await showToast(page, { title: 'First', duration: 0 })
  await showToast(page, { title: 'Second', duration: 0 })
  const [first, second] = await toasts(page).evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect))
  await page.mouse.click(first!.left + 20, (first!.bottom + second!.top) / 2)
  await page.mouse.click(first!.left + 20, second!.bottom + 2)
  expect(await page.evaluate(() => (window as any).toastClicks)).toEqual(['page', 'page'])
  await toast(page, 'First').click({ position: { x: 20, y: 10 } })
  expect(await page.evaluate(() => (window as any).toastClicks)).toEqual(['page', 'page'])
})

test('tones color the border with the feedback tokens', { tag: ['@css'] }, async ({ page }) => {
  await renderToaster(page, {}, { maxVisible: 4 })
  for (const tone of ['neutral', 'positive', 'warning', 'destructive'] as const)
    await showToast(page, { title: tone, tone, duration: 0 })
  const colors = await toasts(page).evaluateAll((nodes) =>
    nodes.map((node) => {
      const probe = document.body.appendChild(document.createElement('i'))
      const token = { neutral: 'overlay-surface-border', positive: 'color-success', warning: 'color-warning', destructive: 'color-destructive' }[
        (node as HTMLElement).dataset.tone as 'neutral'
      ]
      probe.style.color = `var(--uf-${token})`
      const expected = getComputedStyle(probe).color
      probe.remove()
      return [getComputedStyle(node).borderTopColor, expected]
    }),
  )
  expect(new Set(colors.map(([actual]) => actual)).size).toBe(4)
  for (const [actual, expected] of colors) expect(actual).toBe(expected)
})

test.describe('timing', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: 0 })
    await open(page, 'toast')
    await page.clock.pauseAt(1000)
    await renderToaster(page)
  })

  test('each toast closes after its own duration; hovering pauses them all and leaving resumes with the time left', { tag: ['@pointer'] }, async ({
    page,
  }) => {
    await showToast(page, { title: 'First', duration: 1000 })
    await page.clock.runFor(300)
    await showToast(page, { title: 'Second', duration: 1000 })
    await page.clock.runFor(700)
    await expect(toast(page, 'First')).toBeHidden()
    await expect(toast(page, 'Second')).toBeVisible()
    await showToast(page, { title: 'Third', duration: 1000 })
    await toast(page, 'Third').hover()
    await page.clock.runFor(5000)
    await expect(toast(page, 'Second')).toBeVisible()
    await expect(toast(page, 'Third')).toBeVisible()
    await page.mouse.move(5, 5)
    await page.clock.runFor(299)
    await expect(toast(page, 'Second')).toBeVisible()
    await page.clock.runFor(1)
    await expect(toast(page, 'Second')).toBeHidden()
    await page.clock.runFor(700)
    await expect(toasts(page)).toHaveCount(0)
  })

  test('F8 reaches the toasts from the keyboard; focus pauses them, Escape closes and hands focus back', { tag: ['@focus'] }, async ({
    page,
  }) => {
    await showToast(page, { title: 'First', duration: 1000 })
    await showToast(page, { title: 'Second', duration: 1000 })
    await page.locator('#page').focus()
    await page.keyboard.press('F8')
    await expect(region(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(toast(page, 'First')).toBeFocused()
    await page.clock.runFor(5000)
    await expect(toasts(page)).toHaveCount(2)
    await page.keyboard.press('Escape')
    await expect(toast(page, 'First')).toBeHidden()
    await expect(toast(page, 'Second')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(toasts(page)).toHaveCount(0)
    await expect(page.locator('#page')).toBeFocused()
  })

  test('closing a toast with the pointer leaves focus alone and the others resume', { tag: ['@pointer'] }, async ({ page }) => {
    await showToast(page, { title: 'First', duration: 0 })
    await showToast(page, { title: 'Second', duration: 1000 })
    await toast(page, 'First').getByRole('button', { name: 'Close notification' }).click()
    await expect(toast(page, 'First')).toBeHidden()
    await page.mouse.move(5, 5)
    await page.clock.runFor(1000)
    await expect(toasts(page)).toHaveCount(0)
  })
})

test('the entrance animation shrinks to the reduced-motion duration', { tag: ['@css'] }, async ({ page }) => {
  const animation = () =>
    toasts(page).first().evaluate((node) => {
      const style = getComputedStyle(node)
      return [style.animationName, style.animationDuration]
    })
  await renderToaster(page, {}, { animated: true })
  await showToast(page, { title: 'Saved', duration: 0 })
  expect(await animation()).toEqual(['uf-slide-up-fade', '0.3s'])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const [name, duration] = await animation()
  expect(name).toBe('uf-slide-up-fade')
  expect(parseFloat(duration!)).toBeLessThan(0.001)
})

test('region, toasts and their controls pass axe', { tag: ['@a11y'] }, async ({ page }) => {
  await renderToaster(page, { placement: 'bottom-end' })
  await showToast(page, { title: 'Saved', description: 'Visible to collaborators.', tone: 'positive', action: { label: 'Undo' }, duration: 0 })
  await showToast(page, { title: 'Failed', tone: 'destructive', duration: 0 })
  expect(await axe(page, '.uf-toaster')).toEqual([])
  await expect(toast(page, 'Saved')).toHaveAccessibleDescription('Visible to collaborators.')
})
