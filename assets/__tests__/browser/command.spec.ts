import { expect, test, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/command.fixture'

const { renderCommand: render } = hooks<Hooks>()
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await open(page, 'command')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

const field = (page: Page) => page.getByRole('combobox', { name: 'Commands' })
const list = (page: Page) => page.getByRole('listbox', { name: 'Commands' })
const highlighted = (page: Page) => list(page).locator('[role="option"][aria-selected="true"]')
const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { commandEvents: unknown[] }).commandEvents)

/** The highlighted option lies inside the list's visible box. */
async function expectInView(page: Page) {
  const [option, box] = await Promise.all([
    highlighted(page).boundingBox(),
    list(page).boundingBox(),
  ])
  expect(option!.y).toBeGreaterThanOrEqual(box!.y - 1)
  expect(option!.y + option!.height).toBeLessThanOrEqual(box!.y + box!.height + 1)
}

test('arrow keys keep the highlighted item in view inside the list, without scrolling the page', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { surface: 'inline' })
  await field(page).click()
  // Down past the fold, over a group heading and a disabled item.
  for (let step = 0; step < 16; step += 1) await page.keyboard.press('ArrowDown')
  await expect(highlighted(page)).toHaveAttribute('data-value', 'view-5')
  await expect(field(page)).toHaveAttribute('aria-activedescendant', (await highlighted(page).getAttribute('id'))!)
  expect(await list(page).evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
  await expectInView(page)
  // Wrapping to the first item scrolls back up; to the last, down to the end.
  for (let step = 0; step < 8; step += 1) await page.keyboard.press('ArrowDown')
  await expect(highlighted(page)).toHaveAttribute('data-value', 'file-1')
  await expectInView(page)
  await page.keyboard.press('ArrowUp')
  await expect(highlighted(page)).toHaveAttribute('data-value', 'view-12')
  await expectInView(page)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  // A new search shows its results from the top.
  await page.keyboard.type('view')
  await expect(highlighted(page)).toHaveAttribute('data-value', 'view-1')
  expect(await list(page).evaluate((node) => node.scrollTop)).toBe(0)
})

test('pressing an item picks it and leaves the keyboard in the search field', { tag: ['@focus', '@pointer'] }, async ({
  page,
}) => {
  await render(page, { surface: 'inline' })
  await field(page).click()
  await list(page).getByRole('option', { name: 'Open file 3', exact: true }).click()
  await expect(field(page)).toBeFocused()
  await page.getByRole('option', { name: 'Open file 5', exact: true }).hover()
  await expect(highlighted(page)).toHaveAttribute('data-value', 'file-5')
  // A group heading is no target, and a press on it keeps focus too.
  await list(page).getByText('Views', { exact: true }).click()
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await events(page)).toEqual([
    { type: 'select', value: 'file-3' },
    { type: 'select', value: 'file-5' },
  ])
})

test('the dialog traps focus in the layer and returns it to its trigger', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { surface: 'dialog' })
  const trigger = page.getByRole('button', { name: 'Commands' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Commands' })
  await expect(dialog).toBeVisible()
  await expect(field(page)).toBeFocused()
  // Everything outside the dialog is inert, and Tab cycles inside it.
  await expect(page.locator('#before')).toHaveAttribute('inert', '')
  await page.keyboard.press('Tab')
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(field(page)).toBeFocused()
  await page.keyboard.type('view 7')
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('view 7')
  // Escape closes it the same way, and a press on the backdrop too.
  await page.keyboard.press('Enter')
  await expect(field(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(field(page)).toBeFocused()
  await page.mouse.click(4, 4)
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('#before')).not.toHaveAttribute('inert')
  expect(await events(page)).toEqual([
    { type: 'open', open: true },
    { type: 'select', value: 'view-7' },
    { type: 'open', open: false },
    { type: 'open', open: true },
    { type: 'open', open: false },
    { type: 'open', open: true },
    { type: 'open', open: false },
  ])
})

test('groups, a disabled item, the empty text and the dialog are accessible markup', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await render(page, { surface: 'inline' })
  expect(await axe(page)).toEqual([])
  await expect(list(page).getByRole('group', { name: 'Views' })).toBeVisible()
  await field(page).fill('nothing matches this')
  await expect(page.getByText('No results found.')).toBeVisible()
  expect(await axe(page)).toEqual([])
  await render(page, { surface: 'dialog' })
  await page.getByRole('button', { name: 'Commands' }).click()
  await expect(page.getByRole('dialog', { name: 'Commands' })).toBeVisible()
  expect(await axe(page)).toEqual([])
})
