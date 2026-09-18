import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/layers.fixture'

// Headless Chromium hides scrollbars; the scroll-lock gutter needs real ones.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })
const { renderLayers, renderStack } = hooks<Hooks>()
const modal = (page: Page) =>
  page.getByRole('dialog', { name: 'Parent', exact: true })
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true })
// Focus recovery runs in React commits, so it is checked on both React majors.
test.describe('shared modal focus boundary', { tag: ['@focus', '@react'] }, () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'layers')
  })
  for (const state of [
    'removed',
    'disabled',
    'fieldset',
    'hidden',
    'aria-hidden',
    'class',
    'style',
  ] as const) {
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
      ;(window as unknown as Hooks).renderLayers({ open: true, state: 'removed' })
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
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
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
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
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
      ;(window as unknown as Hooks).renderLayers({ open: true, state: 'removed' })
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

test.describe('layer stack', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'layers')
  })
  test('Escape closes only the top layer and focus steps down the stack', { tag: ['@focus', '@react'] }, async ({ page }) => {
    await renderStack(page, { scene: 'modal' })
    await button(page, 'Open modal').click()
    await button(page, 'More').click()
    await expect(button(page, 'Nested action')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(button(page, 'Nested action')).toBeHidden()
    await expect(button(page, 'More')).toBeFocused()
    await button(page, 'Copy').focus()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toBeHidden()
    await expect(modal(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal(page)).toHaveCount(0)
    await expect(button(page, 'Open modal')).toBeFocused()
  })
  test('an outside press closes a popover through its focus-opened tooltip and leaves focus where it landed', { tag: ['@pointer', '@focus'] }, async ({ page }) => {
    await renderStack(page, { scene: 'popover' })
    await button(page, 'Share').click()
    // Opening focuses the first control, whose tooltip opens on focus.
    await expect(button(page, 'Copy')).toBeFocused()
    await expect(page.getByRole('tooltip')).toBeVisible()
    const field = page.getByLabel('Outside field')
    await field.click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('tooltip')).toBeHidden()
    await expect(field).toBeFocused()
  })
  test('a press inside a parent closes only the layers above it', { tag: ['@pointer', '@focus'] }, async ({ page }) => {
    await renderStack(page, { scene: 'popover' })
    await button(page, 'Share').click()
    await button(page, 'More').click()
    await expect(button(page, 'Nested action')).toBeFocused()
    await page.getByText('Popover text').click()
    await expect(button(page, 'Nested action')).toBeHidden()
    await expect(button(page, 'Copy')).toBeVisible()
    // Non-modal: the outside press forfeits the focus return.
    await page.getByText('Page text').click()
    await expect(button(page, 'Copy')).toBeHidden()
    await expect(page.locator('body')).toBeFocused()
  })
  test('a backdrop press closes the modal above a focus-opened tooltip and returns focus', { tag: ['@pointer', '@focus'] }, async ({ page }) => {
    await renderStack(page, { scene: 'modal' })
    await button(page, 'Open modal').click()
    await button(page, 'Copy').focus()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(modal(page)).toHaveCount(0)
    await expect(page.getByRole('tooltip')).toBeHidden()
    await expect(button(page, 'Open modal')).toBeFocused()
  })
  test('a hover card that never held focus does not take it on close', { tag: ['@pointer', '@focus'] }, async ({ page }) => {
    await renderStack(page, { scene: 'hover-card' })
    await button(page, 'Profile').hover()
    await expect(button(page, 'Card action')).toBeVisible()
    await page.mouse.move(600, 600)
    await expect(button(page, 'Card action')).toBeHidden()
    // Returning focus to the trigger would also reopen the card.
    await expect(page.locator('body')).toBeFocused()
    await expect(button(page, 'Card action')).toBeHidden()
  })
})

test.describe('body scroll lock', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'layers')
  })
  for (const dir of ['ltr', 'rtl'] as const)
    test(`nested modals lock and unlock without a layout shift (${dir})`, { tag: ['@layout'] }, async ({ page, browserName }) => {
      await page.addStyleTag({
        content:
          '::-webkit-scrollbar { width: 15px } ::-webkit-scrollbar-thumb { background: gray }',
      })
      await renderStack(page, { scene: 'modal', dir, tall: true })
      const body = page.locator('body')
      const edge = page.locator('.stack-edge')
      // Client rects: WebKit's boundingBox() adds an RTL scroll-origin offset.
      const box = () =>
        edge.evaluate((node) => JSON.stringify(node.getBoundingClientRect()))
      const before = await box()
      const gutter = await page.evaluate(
        () => innerWidth - document.documentElement.clientWidth,
      )
      // Firefox draws overlay scrollbars here: nothing to compensate.
      if (browserName !== 'firefox') expect(gutter).toBeGreaterThan(0)
      await button(page, 'Open modal').click()
      await expect(body).toHaveCSS('overflow', 'hidden')
      expect(await box()).toBe(before)
      await button(page, 'Open child').click()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Child' })).toHaveCount(0)
      await expect(body).toHaveCSS('overflow', 'hidden')
      expect(await box()).toBe(before)
      await page.keyboard.press('Escape')
      await expect(modal(page)).toHaveCount(0)
      await expect(body).not.toHaveCSS('overflow', 'hidden')
      expect(await body.getAttribute('style')).toBeFalsy()
      expect(await box()).toBe(before)
    })
})

test.describe('touch', () => {
  test.use({ hasTouch: true })
  test.beforeEach(async ({ page }) => {
    await open(page, 'layers')
  })
  test('a scroll gesture outside keeps the popover; a tap outside closes it', { tag: ['@pointer'] }, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP touch gestures are Chromium-only')
    await renderStack(page, { scene: 'popover', tall: true })
    await button(page, 'Share').tap()
    await expect(button(page, 'Copy')).toBeVisible()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.synthesizeScrollGesture', {
      x: 640,
      y: 600,
      yDistance: -300,
      gestureSourceType: 'touch',
    })
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
    await expect(button(page, 'Copy')).toBeVisible()
    await page.getByText('Page text').tap()
    await expect(button(page, 'Copy')).toBeHidden()
  })
})
