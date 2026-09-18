import { expect, test, type Page } from '@playwright/test'

for (const change of [
  'remove-preset',
  'disable-preset',
  'hide-now',
  'hide-clear',
  'clear-value',
]) {
  test(`Date recovers focus after ${change} without another key press`, async ({
    page,
  }) => {
    await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
    await page.waitForFunction(
      () => typeof (window as any).renderDate === 'function',
    )
    const props = {
      open: true,
      value: '2026-09-12',
      presets: [{ id: 'release', label: 'Release', value: '2026-09-13' }],
    }
    await page.evaluate((props) => (window as any).renderDate(props), props)
    const name =
      change === 'hide-now'
        ? 'Now'
        : change === 'hide-clear' || change === 'clear-value'
          ? 'Clear'
          : 'Release'
    await page.getByRole('button', { name, exact: true }).focus()
    const update =
      change === 'remove-preset'
        ? { presets: [] }
        : change === 'disable-preset'
          ? { min: '2026-09-14' }
          : change === 'hide-now'
            ? { showNow: false }
            : change === 'hide-clear'
              ? { showClear: false }
              : { value: null }
    await page.evaluate((props) => (window as any).renderDate(props), {
      ...props,
      ...update,
    })
    await expect
      .poll(() =>
        page.getByRole('dialog').evaluate((dialog) => {
          const active = document.activeElement
          return (
            !!active && dialog.contains(active) && !active.matches(':disabled')
          )
        }),
      )
      .toBe(true)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
}

const renderLayers = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderLayers(props), props)
const modal = (page: Page) =>
  page.getByRole('dialog', { name: 'Parent', exact: true })
test.describe('shared modal focus boundary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      '/.artifacts/browser-production/scripts/browser/layer-focus.html',
    )
    await page.waitForFunction(
      () => typeof (window as any).renderLayers === 'function',
    )
  })
  for (const state of [
    'removed',
    'disabled',
    'fieldset',
    'hidden',
    'aria-hidden',
    'class',
    'style',
  ]) {
    test(`recovers when focused content becomes ${state}`, async ({ page }) => {
      await renderLayers(page, { open: true })
      await modal(page)
        .getByRole('button', { name: 'Target', exact: true })
        .focus()
      await renderLayers(page, { open: true, state })
      await expect(
        modal(page).getByRole('button', { name: 'Close modal', exact: true }),
      ).toBeFocused()
    })
  }
  test('uses the surface when all interactive content disappears', async ({
    page,
  }) => {
    await renderLayers(page, { open: true })
    await modal(page)
      .getByRole('button', { name: 'Target', exact: true })
      .focus()
    await renderLayers(page, { open: true, empty: true })
    await expect(modal(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(modal(page)).toBeFocused()
  })
  test('preserves a live control and a programmatically focused heading', async ({
    page,
  }) => {
    await renderLayers(page, { open: true })
    const survivor = modal(page).getByRole('button', {
      name: 'Survivor',
      exact: true,
    })
    await survivor.focus()
    await renderLayers(page, { open: true, state: 'removed' })
    await expect(survivor).toBeFocused()
    const heading = page.locator('[data-heading=""]')
    await heading.focus()
    await renderLayers(page, { open: true, state: 'hidden' })
    await expect(heading).toBeFocused()
    await page.evaluate(() => {
      ;(window as any).renderLayers({ open: true, state: 'removed' })
      document.querySelector<HTMLElement>('[data-heading=""]')!.focus()
    })
    await expect(heading).toBeFocused()
  })
  test('does not activate autofocus=false on updates, but recovers after the user enters', async ({
    page,
  }) => {
    await renderLayers(page, { open: false, autoFocus: false })
    await page.locator('#outside').focus()
    await renderLayers(page, { open: true, autoFocus: false })
    await renderLayers(page, { open: true, autoFocus: false, state: 'removed' })
    expect(
      await modal(page).evaluate((node) =>
        node.contains(document.activeElement),
      ),
    ).toBe(false)
    await renderLayers(page, { open: true, autoFocus: false })
    await modal(page)
      .getByRole('button', { name: 'Target', exact: true })
      .focus()
    await renderLayers(page, { open: true, autoFocus: false, state: 'removed' })
    await expect(
      modal(page).getByRole('button', { name: 'Close modal', exact: true }),
    ).toBeFocused()
  })
  test('recovers in the top modal and preserves its normal close and parent return', async ({
    page,
  }) => {
    await renderLayers(page, {})
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    await page.getByRole('button', { name: 'Open child', exact: true }).click()
    const child = page.getByRole('dialog', { name: 'Child', exact: true })
    await child
      .getByRole('button', { name: 'Child Target', exact: true })
      .focus()
    await renderLayers(page, { childState: 'removed' })
    await expect(
      child.getByRole('button', { name: 'Close modal', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(child).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Open child', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(modal(page)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Open parent', exact: true }),
    ).toBeFocused()
    await expect(page.locator('[inert]')).toHaveCount(0)
  })
  test('a nested nonmodal portal stays in the boundary and survives live updates', async ({
    page,
  }) => {
    await renderLayers(page, {})
    await page.getByRole('button', { name: 'Open parent', exact: true }).click()
    const trigger = page.getByRole('button', {
      name: 'Open popover',
      exact: true,
    })
    await trigger.click()
    const target = page.getByRole('button', {
      name: 'Popover Target',
      exact: true,
    })
    await expect(target).toBeFocused()
    await renderLayers(page, { state: 'removed' })
    await expect(target).toBeFocused()
    await renderLayers(page, { state: 'removed', popoverState: 'removed' })
    await expect(
      page.getByRole('button', { name: 'Popover Survivor', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(target).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Open parent', exact: true }),
    ).toBeFocused()
  })
  test('remembers a child that focused itself before the layer registered', async ({
    page,
  }) => {
    const props = { open: true, autoFocus: false, childAutoFocus: true }
    await renderLayers(page, props)
    await expect(
      modal(page).getByRole('button', { name: 'Target', exact: true }),
    ).toBeFocused()
    await renderLayers(page, { ...props, state: 'removed' })
    await expect(
      modal(page).getByRole('button', { name: 'Close modal', exact: true }),
    ).toBeFocused()
  })
  test('respects an explicit replacement focus and a deliberate blur of a surviving control', async ({
    page,
  }) => {
    await renderLayers(page, { open: true })
    await modal(page)
      .getByRole('button', { name: 'Target', exact: true })
      .focus()
    await page.evaluate(() => {
      ;(window as any).renderLayers({ open: true, state: 'removed' })
      document.querySelector<HTMLElement>('[data-heading=""]')!.focus()
    })
    await expect(page.locator('[data-heading=""]')).toBeFocused()
    const survivor = modal(page).getByRole('button', {
      name: 'Survivor',
      exact: true,
    })
    await survivor.focus()
    await survivor.evaluate((node) => node.blur())
    await renderLayers(page, { open: true })
    await expect(page.locator('body')).toBeFocused()
  })
})
