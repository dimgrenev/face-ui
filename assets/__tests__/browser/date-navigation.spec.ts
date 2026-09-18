import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate } = hooks<Hooks>()
type Props = Parameters<typeof renderDate>[1]
const errors = new WeakMap<Page, string[]>()
const render = (page: Page, props: Props, controlled = false, calendar = false) =>
  renderDate(page, props, controlled, 'field', calendar)
const events = (page: Page, type = 'value') =>
  page.evaluate(
    (type) =>
      (window as any).dateEvents.filter((event: any) => event.type === type),
    type,
  )
const formValue = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline'))
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await open(page, 'date')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

for (const surface of ['popover', 'sheet'] as const) {
  test(`${surface}: drilldown changes the viewed calendar and preserves value until a day is picked`, { tag: ['@layout', '@focus'] }, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1100,
      height: 800,
    })
    await render(page, {
      defaultValue: '2026-01-31',
      name: 'deadline',
      openTo: 'year',
      surface,
    })
    const trigger = page.getByRole('combobox')
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '2025', exact: true }).click()
    await dialog.getByRole('button', { name: 'Feb', exact: true }).click()
    await expect(dialog.getByRole('grid')).toHaveAttribute(
      'aria-label',
      'February 2025',
    )
    expect(await events(page)).toEqual([])
    expect(await formValue(page)).toBe('2026-01-31')
    const day = dialog.locator('[data-date="2025-02-17"]')
    await day.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(await events(page)).toEqual([{ type: 'value', value: '2025-02-17' }])
    expect(await formValue(page)).toBe('2025-02-17')
  })
}
test('month range has two endpoints, remains open during selection, and submits a complete interval', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(
    page,
    {
      mode: 'month',
      selection: 'range',
      defaultValue: { start: '2026-01-01', end: '2026-06-01' },
      name: 'deadline',
      required: true,
      closeOnSelect: true,
    },
    true,
  )
  await page.getByRole('combobox').click()
  await page.getByRole('button', { name: 'Feb', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await formValue(page)).toBe(null)
  await page.getByRole('button', { name: 'Apr', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await formValue(page)).toBe('2026-02-01/2026-04-01')
  expect(await events(page)).toEqual([
    { type: 'value', value: { start: '2026-02-01', end: null } },
    { type: 'value', value: { start: '2026-02-01', end: '2026-04-01' } },
  ])
})
test('Calendar PageDown and Shift+PageUp preserve focus and never select a value', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: '2026-01-31' }, false, true)
  await page.locator('[data-date="2026-01-31"]').focus()
  await page.keyboard.press('PageDown')
  await expect(page.locator('[data-date="2026-02-28"]')).toBeFocused()
  await page.keyboard.press('Shift+PageUp')
  await expect(page.locator('[data-date="2025-02-28"]')).toBeFocused()
  expect(await events(page)).toEqual([])
  expect(await events(page, 'view')).toHaveLength(2)
  await expect(page.locator('[data-part="day"][tabindex="0"]')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
})
test('Calendar civil string hydration and keyboard dates remain correct in a negative-offset timezone', { tag: ['@intl'] }, async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: 'America/Los_Angeles',
  })
  const page = await context.newPage()
  await open(page, 'date')
  await render(page, { defaultValue: '0042-02-10' }, false, true)
  await page.locator('[data-date="0042-02-10"]').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-date="0042-02-11"]')).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => (window as any).dateEvents[0].value)).toBe(
    '0042-02-11',
  )
  await context.close()
})
test('RTL arrow keys follow the visible Calendar direction', { tag: ['@css', '@focus'] }, async ({
  page,
}) => {
  await page
    .locator('html')
    .evaluate((element) => element.setAttribute('dir', 'rtl'))
  await render(page, { defaultValue: '2026-01-15' }, false, true)
  await page.locator('[data-date="2026-01-15"]').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('[data-date="2026-01-16"]')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-date="2026-01-15"]')).toBeFocused()
})

test('clicking an adjacent-month date commits the button under the pointer exactly once', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await render(
    page,
    { defaultValue: '2026-02-15', weekStartsOn: 1 },
    false,
    true,
  )
  await page.locator('[data-date="2026-01-31"]').click()
  await expect(page.getByRole('grid')).toHaveAttribute(
    'aria-label',
    'January 2026',
  )
  expect(await events(page)).toHaveLength(1)
  expect(
    await page.evaluate(() => {
      const value = (window as any).dateEvents.find(
        (event: any) => event.type === 'value',
      ).value
      return value
    }),
  ).toBe('2026-01-31')
  expect(await events(page, 'view')).toHaveLength(1)
})

test('range keyboard selection of an adjacent-month day navigates only after confirmation', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(
    page,
    { selection: 'range', defaultViewDate: '2026-02-01', weekStartsOn: 1 },
    false,
    true,
  )
  await page.locator('[data-date="2026-01-31"]').focus()
  await expect(page.getByRole('grid')).toHaveAttribute(
    'aria-label',
    'February 2026',
  )
  await page.keyboard.press('Control+ArrowRight')
  expect(await events(page)).toEqual([])
  await expect(page.locator('[data-date="2026-01-31"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('grid')).toHaveAttribute(
    'aria-label',
    'January 2026',
  )
  await expect(page.locator('[data-date="2026-01-31"]')).toBeFocused()
  expect(await events(page)).toHaveLength(1)
  expect(await events(page, 'view')).toHaveLength(1)
})

test('Date popover stays inside the viewport and starts at its trigger', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await render(page, {
    defaultValue: '2026-01-31',
    openTo: 'year',
    surface: 'popover',
  })
  const trigger = page.getByRole('combobox')
  await trigger.click()
  await page.getByRole('button', { name: '2025', exact: true }).click()
  await page.getByRole('button', { name: 'Feb', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox(),
        anchor = await trigger.boundingBox()
      return (
        !!box &&
        !!anchor &&
        box.x >= 8 &&
        box.x + box.width <= 992 &&
        Math.abs(box.x - anchor.x) <= 1
      )
    })
    .toBe(true)
})
