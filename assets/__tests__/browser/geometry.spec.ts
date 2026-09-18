import { test, expect } from './test'
import { open } from './helpers'

test.beforeEach(async ({ page }) => {
  await open(page, 'composition')
})

test('computed geometry, heading hierarchy, composition and compact width', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Face UI quality fixture' }),
  ).toHaveCSS('font-size', '24px')
  await expect(
    page.getByRole('heading', { name: 'Nested large heading' }),
  ).toHaveCSS('font-size', '18px')
  await expect(page.getByLabel('Native consumer input')).toHaveCSS(
    'border-top-width',
    '3px',
  )
  for (const membrane of [true, false]) {
    const section = page.locator(`[data-fixture="geometry-${membrane}"]`)
    const button = section.getByRole('button', { name: 'Button', exact: true })
    expect((await button.boundingBox())!.width).toBeLessThan(150)
    await expect(button).toHaveCSS('height', '32px')
    if (membrane) {
      const outer = await button.locator('..').boundingBox()
      const inner = await button.boundingBox()
      expect(outer!.height - inner!.height).toBe(2)
    }
  }
})

test('mobile viewport has no page overflow', { tag: ['@layout'] }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1)
})
