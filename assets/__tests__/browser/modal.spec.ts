import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/modal.fixture'

const { renderModal, renderScopedModal } = hooks<Hooks>()
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true })
const dialog = (page: Page, name = 'Dialog') =>
  page.getByRole('dialog', { name, exact: true })
const events = (page: Page) => page.evaluate(() => (window as any).modalEvents)
/** The element's box once the entry transitions have settled. */
const rect = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate(async (node) => {
      await Promise.allSettled(document.getAnimations().map((animation) => animation.finished))
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect()
      return { left, right, top, bottom, width, height }
    })

test.beforeEach(async ({ page }) => {
  await open(page, 'modal')
})

test('a scoped modal covers only its instance and leaves its sibling interactive', { tag: ['@layout', '@pointer', '@focus'] }, async ({ page }) => {
  await renderScopedModal(page)
  await button(page, 'Open scoped dialog').click()
  const scoped = dialog(page, 'Scoped dialog')
  await expect(scoped).toBeVisible()
  await expect(scoped).not.toHaveAttribute('aria-modal')
  await expect(page.locator('[data-instance="A"]')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  const bounds = await page.locator('[data-instance="A"]').boundingBox()
  expect(bounds).not.toBeNull()
  for (const part of ['backdrop', 'positioner']) {
    const frame = await page.locator(`[data-scope="modal"][data-part="${part}"]`).boundingBox()
    expect(frame).not.toBeNull()
    expect(frame!.x).toBeCloseTo(bounds!.x, 0)
    expect(frame!.y).toBeCloseTo(bounds!.y, 0)
    expect(frame!.width).toBeCloseTo(bounds!.width, 0)
    expect(frame!.height).toBeCloseTo(bounds!.height, 0)
  }
  await button(page, 'B action').click()
  await expect(page.locator('[data-b-clicks]')).toHaveText('1')
  // WebKit does not focus a button on mouse click.
  await button(page, 'B action').focus()
  await expect(button(page, 'B action')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(scoped).toBeVisible()
  await button(page, 'A inside').focus()
  await page.keyboard.press('Escape')
  await expect(scoped).toHaveCount(0)
  await button(page, 'Open scoped dialog').click()
  await page.mouse.click(bounds!.x + 8, bounds!.y + bounds!.height - 8)
  await expect(scoped).toHaveCount(0)
})

for (const variant of ['transformed', 'externalPortal'] as const)
  test(`a scoped modal stays usable with a ${variant} portal geometry`, { tag: ['@layout', '@pointer'] }, async ({ page }) => {
    await renderScopedModal(page, { [variant]: true })
    await button(page, 'Open scoped dialog').click()
    const dialog = page.getByRole('dialog', { name: 'Scoped dialog' })
    await expect(dialog).toBeVisible()
    await expect(page.locator('[data-instance="A"] [role="dialog"]')).toHaveCount(1)
    const root = await page.locator('[data-instance="A"]').boundingBox()
    const positioner = await page.locator('[data-part="positioner"][data-scope="modal"]').boundingBox()
    expect(root).not.toBeNull()
    expect(positioner).not.toBeNull()
    expect(Math.abs(positioner!.x - root!.x)).toBeLessThan(2)
    expect(Math.abs(positioner!.y - root!.y)).toBeLessThan(2)
    expect(Math.abs(positioner!.width - root!.width)).toBeLessThan(2)
    expect(Math.abs(positioner!.height - root!.height)).toBeLessThan(2)
    await button(page, 'B action').click()
    await expect(page.locator('[data-b-clicks]')).toHaveText('1')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('[data-instance="A"]')).not.toHaveCSS('position', 'relative')
  })

test.describe('layer contract (T1–T5)', () => {
  test('T1: Escape closes only the top dialog, and focus steps back down', { tag: ['@focus', '@react'] }, async ({ page }) => {
    await renderModal(page, { nested: true })
    await button(page, 'Open dialog').click()
    await button(page, 'Open child').click()
    await expect(dialog(page, 'Child')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page, 'Child')).toHaveCount(0)
    await expect(dialog(page)).toBeVisible()
    await expect(button(page, 'Open child')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(button(page, 'Open dialog')).toBeFocused()
  })

  test('T2: a backdrop press closes the dialog unless closeOnBackdropClick or closable is false', { tag: ['@pointer'] }, async ({ page }) => {
    await renderModal(page)
    await button(page, 'Open dialog').click()
    await page.mouse.click(4, 4)
    await expect(dialog(page)).toHaveCount(0)
    expect(await events(page)).toEqual([{ open: true }, { open: false }])

    await renderModal(page, { props: { closeOnBackdropClick: false } })
    await button(page, 'Open dialog').click()
    await page.mouse.click(4, 4)
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)

    await renderModal(page, { props: { closable: false } })
    await button(page, 'Open dialog').click()
    await page.mouse.click(4, 4)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toBeVisible()
    await expect(button(page, 'Close')).toHaveCount(0)
    expect(await events(page)).toEqual([{ open: true }])
  })

  test('T3: focus returns to what opened the dialog; an in-place preview never takes it', { tag: ['@focus'] }, async ({ page }) => {
    await renderModal(page)
    await button(page, 'Open dialog').click()
    await button(page, 'Close').click()
    await expect(button(page, 'Open dialog')).toBeFocused()

    await open(page, 'modal')
    await renderModal(page, { external: true })
    // Keyboard activation: WebKit does not focus a clicked button.
    await button(page, 'Show dialog').focus()
    await page.keyboard.press('Enter')
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(button(page, 'Show dialog')).toBeFocused()

    await open(page, 'modal')
    await renderModal(page, { props: { portal: false } })
    await button(page, 'Open dialog').focus()
    await page.keyboard.press('Enter')
    await expect(dialog(page)).toBeVisible()
    await expect(button(page, 'Open dialog')).toBeFocused()
    // The page around the preview stays live: nothing is inert.
    await button(page, 'Before').focus()
    await expect(button(page, 'Before')).toBeFocused()
    await expect(page.locator('[inert]')).toHaveCount(0)
  })

  test('T4: initial focus: a child that focused itself, then [data-autofocus], then the first control', { tag: ['@focus', '@react'] }, async ({ page }) => {
    await renderModal(page, { body: 'self-focus' })
    await button(page, 'Open dialog').click()
    await expect(page.getByLabel('Branch name')).toBeFocused()

    await open(page, 'modal')
    await renderModal(page, { body: 'data-autofocus' })
    await button(page, 'Open dialog').click()
    await expect(page.getByLabel('Email')).toBeFocused()

    await open(page, 'modal')
    await renderModal(page, { body: 'controls' })
    await button(page, 'Open dialog').click()
    await expect(button(page, 'Close')).toBeFocused()
  })

  test('T5: scroll lock is opt-in: the page scrolls behind a default dialog, not behind scrollLock', { tag: ['@layout'] }, async ({ page }) => {
    await renderModal(page, { tall: true })
    await button(page, 'Open dialog').click()
    await expect(dialog(page)).toBeVisible()
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    await page.mouse.move(8, 400)
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
    await page.keyboard.press('Escape')

    await page.evaluate(() => scrollTo(0, 0))
    await renderModal(page, { tall: true, props: { scrollLock: true } })
    await button(page, 'Open dialog').click()
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
    await page.mouse.move(8, 400)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  })
})

test.describe('geometry', () => {
  for (const dir of ['ltr', 'rtl'] as const)
    test(`start and end placements follow the direction (${dir})`, { tag: ['@layout'] }, async ({ page }) => {
      const width = await page.evaluate(() => document.documentElement.clientWidth)
      for (const placement of ['start', 'end'] as const) {
        await renderModal(page, { dir, props: { defaultOpen: true, placement, edge: 'flush' } })
        const box = await rect(page, '.uf-modal')
        const atLeft = (placement === 'start') === (dir === 'ltr')
        if (atLeft) expect(Math.round(box.left)).toBe(0)
        else expect(Math.round(box.right)).toBe(width)
      }
    })

  test('dir on the Modal sets its own start side in a left-to-right page', { tag: ['@layout'] }, async ({ page }) => {
    const width = await page.evaluate(() => document.documentElement.clientWidth)
    await renderModal(page, { props: { defaultOpen: true, placement: 'start', edge: 'flush', dir: 'rtl' } })
    expect(Math.round((await rect(page, '.uf-modal')).right)).toBe(width)
  })

  test('edge: inset keeps a gap from the edge, flush touches it', { tag: ['@layout'] }, async ({ page }) => {
    await renderModal(page, { props: { defaultOpen: true, placement: 'bottom', edge: 'inset' } })
    const viewport = page.viewportSize()!
    const inset = await rect(page, '.uf-modal')
    expect(inset.bottom).toBeLessThan(viewport.height)
    await renderModal(page, { props: { defaultOpen: true, placement: 'bottom', edge: 'flush' } })
    expect(Math.round((await rect(page, '.uf-modal')).bottom)).toBe(viewport.height)
  })

  test('width and height size the surface in pixels, capped by the viewport', { tag: ['@layout'] }, async ({ page }) => {
    await renderModal(page, { props: { defaultOpen: true, width: 420, height: 300 } })
    const box = await rect(page, '.uf-modal')
    expect(Math.round(box.width)).toBe(420)
    expect(Math.round(box.height)).toBe(300)
    await renderModal(page, { props: { defaultOpen: true, width: 5000 } })
    const viewport = page.viewportSize()!
    expect((await rect(page, '.uf-modal')).width).toBeLessThan(viewport.width)
  })
})

test('with motion opted in, the surface fades in and stays inert through its exit', { tag: ['@css', '@react'] }, async ({ page }) => {
  await page.evaluate(() => document.documentElement.classList.add('uf-animated'))
  await renderModal(page)
  const entering = await page.evaluate(async () => {
    document.querySelector<HTMLElement>('[data-part="trigger"]')!.click()
    await new Promise(requestAnimationFrame)
    return {
      supported: 'CSSStartingStyleRule' in window,
      running: document.querySelector('.uf-modal-positioner')!.getAnimations().length,
    }
  })
  if (entering.supported) expect(entering.running).toBeGreaterThan(0)
  await expect(page.locator('.uf-modal')).toHaveAttribute('data-state', 'open')
  const closing = await page.evaluate(async () => {
    document.querySelector<HTMLElement>('[data-part="close"]')!.click()
    await new Promise(requestAnimationFrame)
    const surface = document.querySelector('.uf-modal')
    return {
      mounted: !!surface,
      state: surface?.getAttribute('data-state'),
      inert: !!surface?.closest('[inert]'),
    }
  })
  expect(closing).toEqual({ mounted: true, state: 'closed', inert: true })
  await expect(page.locator('.uf-modal')).toHaveCount(0)
})
