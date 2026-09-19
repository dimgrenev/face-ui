import { expect, test, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/menu.fixture'

const { renderMenu: render } = hooks<Hooks>()
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await open(page, 'menu')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

const menu = (page: Page) => page.getByRole('menu')
const item = (page: Page, name: string) =>
  menu(page).getByRole('menuitem', { name, exact: true })
const box = async (page: Page, selector: string) =>
  (await page.locator(selector).boundingBox())!
/** The surface's box once it has been placed (it starts off-screen). */
const surfaceBox = async (page: Page) => {
  await expect(page.locator('.uf-menu-content')).not.toHaveCSS('top', '-9999px')
  return box(page, '.uf-menu-content')
}
const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { menuEvents: unknown[] }).menuEvents)

test('a click menu opens below its trigger and flips above it at the bottom edge of the viewport', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { align: 'start' })
  await page.locator('#trigger').click()
  const trigger = await box(page, '#trigger')
  let surface = await surfaceBox(page)
  expect(surface.y).toBeGreaterThanOrEqual(trigger.y + trigger.height)
  expect(Math.abs(surface.x - trigger.x)).toBeLessThanOrEqual(1)
  await page.keyboard.press('Escape')
  await render(page, { align: 'start' }, { bottom: true })
  await page.locator('#trigger').click()
  const low = await box(page, '#trigger')
  await expect(page.locator('.uf-menu-content')).toHaveAttribute('data-side', 'top')
  surface = await surfaceBox(page)
  expect(surface.y + surface.height).toBeLessThanOrEqual(low.y + 1)
  expect(surface.y).toBeGreaterThanOrEqual(0)
})

test('side places a click menu beside its trigger', { tag: ['@layout'] }, async ({ page }) => {
  await render(page, { side: 'right', align: 'start', sideOffset: 8 })
  await page.locator('#trigger').click()
  const trigger = await box(page, '#trigger')
  const surface = await surfaceBox(page)
  expect(Math.abs(surface.x - (trigger.x + trigger.width) - 8)).toBeLessThanOrEqual(1)
  expect(Math.abs(surface.y - trigger.y)).toBeLessThanOrEqual(1)
})

test('a context menu opens at the pointer and flips above it near the bottom edge', { tag: ['@layout', '@pointer'] }, async ({
  page,
}) => {
  await render(page, { openOn: 'context' })
  const canvas = await box(page, '#canvas')
  await page.mouse.click(canvas.x + 120, canvas.y + 60, { button: 'right' })
  await expect(menu(page)).toBeVisible()
  let surface = await surfaceBox(page)
  expect(Math.abs(surface.x - (canvas.x + 120))).toBeLessThanOrEqual(1)
  expect(Math.abs(surface.y - (canvas.y + 60))).toBeLessThanOrEqual(1)
  // Another right-click closes the menu with its press and opens it at the new point, keyboard in it.
  await page.mouse.click(canvas.x + 200, canvas.y + 20, { button: 'right' })
  await expect
    .poll(async () => Math.abs((await box(page, '.uf-menu-content')).x - canvas.x - 200) <= 1)
    .toBe(true)
  await expect(menu(page)).toBeFocused()
  expect(await events(page)).toEqual([
    { type: 'open', open: true },
    { type: 'open', open: false },
    { type: 'open', open: true },
  ])
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Copy')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
  await render(page, { openOn: 'context' }, { bottom: true })
  const low = await box(page, '#canvas')
  const y = low.y + low.height - 10
  await page.mouse.click(low.x + 40, y, { button: 'right' })
  await expect(page.locator('.uf-menu-content')).toHaveAttribute('data-side', 'top')
  surface = await surfaceBox(page)
  expect(Math.abs(surface.y + surface.height - y)).toBeLessThanOrEqual(1)
})

test('a context menu without room right of the pointer opens left of it instead of covering it', { tag: ['@layout', '@pointer'] }, async ({
  page,
}) => {
  await render(page, { openOn: 'context' }, { right: true })
  const canvas = await box(page, '#canvas')
  const x = canvas.x + canvas.width - 10
  await page.mouse.click(x, canvas.y + 60, { button: 'right' })
  const surface = await surfaceBox(page)
  expect(Math.abs(surface.x + surface.width - x)).toBeLessThanOrEqual(1)
  expect(Math.abs(surface.y - (canvas.y + 60))).toBeLessThanOrEqual(1)
})

test('a press in the context area outside the menu closes it, as any outside press does', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await render(page, { openOn: 'context' })
  const canvas = await box(page, '#canvas')
  await page.mouse.click(canvas.x + 120, canvas.y + 60, { button: 'right' })
  await expect(menu(page)).toBeVisible()
  // Left of the menu, inside the area.
  await page.mouse.click(canvas.x + 20, canvas.y + 200)
  await expect(menu(page)).toHaveCount(0)
  expect(await events(page)).toEqual([
    { type: 'open', open: true },
    { type: 'open', open: false },
  ])
})

test('a link item follows its href; with a modifier key the browser opens it elsewhere and the page stays', { tag: ['@native'] }, async ({
  page,
  context,
  browserName,
}) => {
  await render(page)
  await page.locator('#trigger').click()
  const popup = browserName === 'webkit' ? null : context.waitForEvent('page')
  await item(page, 'Documentation').click({ modifiers: ['ControlOrMeta'] })
  if (popup) expect((await popup).url()).toMatch(/#docs$/)
  expect(new URL(page.url()).hash).toBe('')
  await expect(menu(page)).toHaveCount(0)
  expect(await events(page)).toEqual([
    { type: 'open', open: true },
    { type: 'select', value: 'docs', modified: true },
    { type: 'open', open: false },
  ])
  // Enter on the focused link follows it in this page.
  await page.locator('#trigger').focus()
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowUp')
  await expect(item(page, 'Documentation')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect.poll(() => new URL(page.url()).hash).toBe('#docs')
})

test('keyboard: arrows skip disabled items, letters find labels, Escape returns focus to the trigger', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page)
  await page.locator('#trigger').focus()
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Copy')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Print')).toBeFocused()
  await page.keyboard.press('p')
  await expect(item(page, 'Preview')).toBeFocused()
  // The same letter again cycles through the items starting with it, skipping disabled Paste.
  await page.keyboard.press('p')
  await expect(item(page, 'Print')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
  await expect(page.locator('#trigger')).toBeFocused()
})

test('Tab closes the menu and moves focus past the trigger; Shift+Tab before it', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page)
  await page.locator('#trigger').focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await expect(menu(page)).toHaveCount(0)
  await expect(page.locator('#after')).toBeFocused()
  await page.locator('#trigger').focus()
  await page.keyboard.press('ArrowUp')
  await expect(item(page, 'Delete')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(menu(page)).toHaveCount(0)
  await expect(page.locator('#before')).toBeFocused()
})

test('a pointer open focuses the menu without highlighting; hover highlights and the keyboard continues from it', { tag: ['@pointer', '@focus'] }, async ({
  page,
}) => {
  await render(page)
  await page.locator('#trigger').click()
  await expect(menu(page)).toBeFocused()
  await expect(menu(page).locator('[data-highlighted]')).toHaveCount(0)
  // Letters typed on the list and then on the items form one search.
  await page.keyboard.type('pre')
  await expect(item(page, 'Preview')).toBeFocused()
  await item(page, 'Print').hover()
  await expect(item(page, 'Print')).toHaveAttribute('data-highlighted')
  await page.keyboard.press('ArrowDown')
  await expect(item(page, 'Preview')).toBeFocused()
  await expect(menu(page).locator('[data-highlighted]')).toHaveCount(1)
})

test('an outside press closes the menu through the layer stack and the pressed control keeps focus', { tag: ['@pointer', '@focus'] }, async ({
  page,
}) => {
  await render(page)
  await page.locator('#trigger').click()
  await expect(menu(page)).toBeVisible()
  await page.locator('#before').click()
  await expect(menu(page)).toHaveCount(0)
  await expect(page.locator('#before')).toBeFocused()
  expect((await events(page)).at(-1)).toEqual({ type: 'open', open: false })
})

test('a pointer open shows no focus ring around the menu list, in a popover or a sheet', { tag: ['@css', '@focus'] }, async ({
  page,
}) => {
  for (const surface of ['popover', 'sheet'] as const) {
    await render(page, { surface })
    await page.locator('#trigger').click()
    await expect(menu(page)).toBeFocused()
    await expect(menu(page)).toHaveCSS('outline-style', 'none')
    await page.keyboard.press('Escape')
    await expect(menu(page)).toHaveCount(0)
  }
})

for (const theme of ['light', 'dark']) {
  test(`a destructive item's label takes the destructive color a host palette supplies in ${theme}`, { tag: ['@css'] }, async ({
    page,
  }) => {
    // The authored monochrome palette aliases destructive to the foreground in light mode.
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
      document.documentElement.style.setProperty('--uf-color-destructive', 'rgb(184, 32, 48)')
    }, theme)
    await render(page)
    await page.locator('#trigger').click()
    const label = (name: string) =>
      item(page, name)
        .locator('.uf-menu-itemLabel')
        .evaluate((node) => getComputedStyle(node).color)
    expect(await label('Delete')).toBe('rgb(184, 32, 48)')
    expect(await label('Print')).not.toBe('rgb(184, 32, 48)')
  })
}

test('the open menu, its groups and checkbox items pass axe', { tag: ['@a11y'] }, async ({ page }) => {
  await render(page, { 'aria-label': 'Canvas actions' })
  await page.locator('#trigger').click()
  await expect(menu(page)).toBeVisible()
  expect(await axe(page, '.uf-menu-content')).toEqual([])
  await expect(menu(page).getByRole('group', { name: 'View' })).toBeVisible()
  await expect(menu(page).getByRole('menuitemcheckbox', { name: 'Snap to grid' })).toBeChecked()
})
