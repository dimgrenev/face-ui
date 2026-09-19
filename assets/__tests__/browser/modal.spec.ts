import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/modal.fixture'

const { renderModal } = hooks<Hooks>()
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

test('the surface fades in, and on close stays inert until it has faded out, then unmounts', { tag: ['@css', '@react'] }, async ({ page }) => {
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
