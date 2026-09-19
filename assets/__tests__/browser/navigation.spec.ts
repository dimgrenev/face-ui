import { expect, test, type Locator, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/navigation.fixture'

const { renderNavigation, renderPanel } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).navigationEvents)
const item = (page: Page, name: string) =>
  page.locator('[data-scope="navigation"]:is([data-part="link"], [data-part="trigger"])', {
    hasText: new RegExp(`^${name}$`),
  })
const row = (page: Page, name: string) =>
  page.locator('[data-scope="sidebar"]:is([data-part="link"], [data-part="trigger"])', {
    hasText: new RegExp(`^${name}$`),
  })
/** The box once its entry transitions have ended. */
const settled = async (locator: Locator) => {
  await locator.evaluate((node) =>
    Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  )
  return (await locator.boundingBox())!
}

test.beforeEach(async ({ page }) => {
  await open(page, 'navigation')
})

test('Navigation follows APG disclosure navigation from the keyboard, arrows mirrored in RTL', { tag: ['@focus'] }, async ({
  page,
}) => {
  const products = item(page, 'Products')
  await item(page, 'Home').focus()
  await page.keyboard.press('ArrowRight')
  await expect(products).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(item(page, 'Docs')).toBeFocused()
  await page.keyboard.press('End')
  await expect(item(page, 'About')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(item(page, 'Home')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(item(page, 'Home')).toBeFocused()

  // Enter and Space toggle a dropdown and keep focus on its button.
  await products.focus()
  await page.keyboard.press('Enter')
  await expect(products).toHaveAttribute('aria-expanded', 'true')
  await expect(item(page, 'Fonts')).toBeVisible()
  await expect(products).toBeFocused()
  await page.keyboard.press(' ')
  await expect(products).toHaveAttribute('aria-expanded', 'false')
  await expect(item(page, 'Fonts')).toBeHidden()

  // Down opens at the first link; arrows skip the disabled link and stop at the ends.
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Fonts')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Hosting')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Support')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Support')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(item(page, 'Fonts')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(products).toHaveAttribute('aria-expanded', 'false')
  await expect(products).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(item(page, 'Support')).toBeFocused()

  // Enter on a link follows it, makes it current and closes the dropdown.
  await page.keyboard.press('ArrowUp')
  await expect(item(page, 'Hosting')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#hosting$/)
  await expect(products).toHaveAttribute('aria-expanded', 'false')
  await expect(item(page, 'Hosting')).toHaveAttribute('aria-current', 'page')
  expect(await events(page)).toEqual([{ value: 'hosting' }])

  await renderNavigation(page, {}, { dir: 'rtl' })
  await item(page, 'Home').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(item(page, 'Products')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(item(page, 'Home')).toBeFocused()
})

test('Tab reaches every enabled item and the open dropdown\'s links; leaving the item closes it', { tag: ['@focus'] }, async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', "WebKit's Tab skips buttons and links by default")
  await page.locator('#before').focus()
  const order: string[] = []
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => document.activeElement?.textContent ?? ''))
  }
  expect(order).toEqual(['Home', 'Products', 'Docs', 'About'])
  await item(page, 'Products').focus()
  await page.keyboard.press('Enter')
  const visited: string[] = []
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    visited.push(await page.evaluate(() => document.activeElement?.textContent ?? ''))
  }
  expect(visited).toEqual(['Fonts', 'Hosting', 'Support', 'Docs'])
  await expect(item(page, 'Products')).toHaveAttribute('aria-expanded', 'false')
})

test('a dropdown opens under its item from the inline start, in both directions', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl'] as const) {
    await renderNavigation(page, {}, { dir })
    await item(page, 'Products').click()
    const anchor = await settled(page.locator('[data-part="item"][data-value="products"]'))
    const surface = await settled(page.locator('[data-part="content"]:not([hidden])'))
    expect(Math.abs(surface.y - (anchor.y + anchor.height))).toBeLessThan(2)
    if (dir === 'ltr') expect(Math.abs(surface.x - anchor.x)).toBeLessThan(2)
    else expect(Math.abs(surface.x + surface.width - (anchor.x + anchor.width))).toBeLessThan(2)
    expect(surface.width).toBeGreaterThanOrEqual(anchor.width)
  }
})

test('hover opens a dropdown after a pause, a click keeps it, crossing onto it keeps it, leaving closes it', { tag: ['@pointer'] }, async ({
  page,
}) => {
  const products = item(page, 'Products')
  const trigger = await products.boundingBox()
  await page.mouse.move(trigger!.x + trigger!.width / 2, trigger!.y + trigger!.height / 2)
  await expect(products).toHaveAttribute('aria-expanded', 'true')
  await page.mouse.down()
  await page.mouse.up()
  await expect(products).toHaveAttribute('aria-expanded', 'true')
  const fonts = await item(page, 'Fonts').boundingBox()
  await page.mouse.move(fonts!.x + 8, fonts!.y + fonts!.height / 2, { steps: 5 })
  await page.waitForTimeout(400)
  await expect(products).toHaveAttribute('aria-expanded', 'true')
  await page.mouse.move(2, 700)
  await expect(products).toHaveAttribute('aria-expanded', 'false')
})

test('at 360px both components become sheets inside the viewport: a bottom sheet and a start drawer', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 })
  for (const dir of ['ltr', 'rtl'] as const) {
    await renderNavigation(page, { surface: 'auto' }, { dir })
    const openNavigation = page.getByRole('button', { name: 'Open navigation' })
    await openNavigation.click()
    const sheet = page.getByRole('dialog', { name: 'Main' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Fonts' })).toBeVisible()
    const bottom = await settled(sheet)
    expect(bottom.x).toBeGreaterThanOrEqual(0)
    expect(bottom.x + bottom.width).toBeLessThanOrEqual(360.5)
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(740)
    expect(bottom.y + bottom.height).toBeGreaterThan(700)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(openNavigation).toBeFocused()

    await renderPanel(page, { surface: 'auto' }, { dir })
    await page.getByRole('button', { name: 'Open panel' }).click()
    const drawer = page.getByRole('dialog', { name: 'Workspace' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'Overview' })).toBeVisible()
    const side = await settled(drawer)
    expect(side.width).toBeLessThanOrEqual(360.5)
    if (dir === 'ltr') expect(side.x).toBeLessThan(1)
    else expect(Math.abs(side.x + side.width - 360)).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  }
})

test('Panel rows follow vertical disclosure navigation; a group shows its rows only while expanded', { tag: ['@focus'] }, async ({
  page,
}) => {
  await renderPanel(page)
  const settings = row(page, 'Settings')
  await row(page, 'Overview').focus()
  await page.keyboard.press('ArrowDown')
  await expect(settings).toBeFocused()
  await expect(row(page, 'Profile')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(settings).toHaveAttribute('aria-expanded', 'true')
  await expect(row(page, 'Profile')).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(row(page, 'Profile')).toBeFocused()
  await page.keyboard.press('End')
  await expect(row(page, 'Files')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(row(page, 'Files')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(row(page, 'Overview')).toBeFocused()
  await settings.focus()
  await page.keyboard.press(' ')
  await expect(row(page, 'Profile')).toHaveCount(0)
  expect(await events(page)).toEqual([{ expanded: ['settings'] }, { expanded: [] }])
})

test('the Panel rail keeps every row named and sized by collapsedWidth', { tag: ['@layout'] }, async ({
  page,
}) => {
  await renderPanel(page, { defaultCollapsed: true, collapsedWidth: 56 })
  const nav = page.getByRole('navigation', { name: 'Workspace' })
  expect((await nav.boundingBox())!.width).toBeCloseTo(56, 0)
  await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'false')
  const link = (await nav.getByRole('link', { name: 'Overview' }).boundingBox())!
  expect(link.x + link.width).toBeLessThanOrEqual(56.5)
  await nav.getByRole('button', { name: 'Expand panel' }).click()
  expect((await nav.boundingBox())!.width).toBeCloseTo(260, 0)
})
