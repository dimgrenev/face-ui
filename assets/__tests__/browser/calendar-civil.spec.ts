import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate: render } = hooks<Hooks>()

test.use({ timezoneId: 'America/Los_Angeles' })

const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const today = (page: Page) => page.locator('[data-date][data-today]')
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime('2026-09-12T01:30:00Z')
  await open(page, 'date')
})

for (const [timezone, date] of [
  ['UTC', '2026-09-12'],
  ['America/Los_Angeles', '2026-09-11'],
  ['Pacific/Kiritimati', '2026-09-12'],
]) {
  test(`${timezone}: an empty picker starts on its current civil day without selecting`, { tag: ['@intl', '@focus', '@css'] }, async ({
    page,
  }) => {
    await render(page, { timezone, name: 'deadline' })
    const submitted = () =>
      page
        .locator('#form')
        .evaluate((form) =>
          new FormData(form as HTMLFormElement).get('deadline'),
        )
    await expect.poll(submitted).toBeNull()
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(day(page, date)).toBeFocused()
    await expect(day(page, date)).toHaveCSS('outline-style', 'solid')
    await expect(today(page)).toHaveAttribute('data-date', date)
    await expect(today(page)).toHaveAttribute('aria-current', 'date')
    expect(
      await today(page)
        .locator('.uf-button__label')
        .evaluate((node) => Number(getComputedStyle(node).fontWeight)),
    ).toBeGreaterThan(
      await day(page, '2026-09-20')
        .locator('.uf-button__label')
        .evaluate((node) => Number(getComputedStyle(node).fontWeight)),
    )
    expect(await changes(page)).toEqual([])
    expect(await submitted()).toBeNull()
  })
}

test('the today marker follows timezone changes across a year boundary without selecting', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await page.clock.setFixedTime('2026-12-31T23:30:00Z')
  const props = { defaultValue: '2027-01-10', closeOnSelect: false }
  await render(page, { ...props, timezone: 'UTC' })
  await page.getByRole('combobox').click()
  await expect(today(page)).toHaveAttribute('data-date', '2026-12-31')
  await render(page, { ...props, timezone: 'Pacific/Kiritimati' })
  await expect(today(page)).toHaveAttribute('data-date', '2027-01-01')
  await expect(day(page, '2027-01-10')).toBeFocused()
  expect(await changes(page)).toEqual([])
})

test('an existing selection remains the initial keyboard position instead of today', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: '2026-09-20', timezone: 'UTC' })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Enter')
  await expect(day(page, '2026-09-20')).toBeFocused()
  await expect(today(page)).toHaveAttribute('data-date', '2026-09-12')
  await expect(page.locator('[data-date][tabindex="0"]')).toHaveCount(1)
  expect(await changes(page)).toEqual([])
})

test('an inline Calendar starts its single tab stop on browser-local today', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await render(page, {}, false, 'inline', true)
  await expect(page.locator('[data-date][tabindex="0"]')).toHaveCount(1)
  await expect(day(page, '2026-09-11')).toHaveAttribute('tabindex', '0')
  await expect(today(page)).toHaveAttribute('data-date', '2026-09-11')
  expect(await changes(page)).toEqual([])
})

test('an unavailable current day remains a spatial entry and cannot be selected', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await render(page, {
    timezone: 'UTC',
    disabledDates: ['2026-09-12'],
    closeOnSelect: false,
  })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Enter')
  await expect(day(page, '2026-09-12')).toBeFocused()
  await expect(day(page, '2026-09-12')).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Enter')
  expect(await changes(page)).toEqual([])
  await page.keyboard.press('ArrowRight')
  await expect(day(page, '2026-09-13')).toBeFocused()
  expect(await changes(page)).toEqual([])
  await page.keyboard.press('Enter')
  expect(await changes(page)).toEqual([{ type: 'value', value: '2026-09-13' }])
})

for (const [timezone, date] of [
  ['UTC', '2026-12-31'],
  ['Pacific/Kiritimati', '2027-01-01'],
]) {
  test(`${timezone}: empty initial focus respects the current year boundary`, { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await page.clock.setFixedTime('2026-12-31T23:30:00Z')
    await render(page, { timezone })
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(day(page, date)).toBeFocused()
    await expect(today(page)).toHaveAttribute('data-date', date)
    expect(await changes(page)).toEqual([])
  })
}

test('navigation after midnight refreshes today without moving selection', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await page.clock.setFixedTime('2026-09-12T23:59:00Z')
  await render(page, { timezone: 'UTC', defaultValue: '2026-09-20' })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Enter')
  await expect(today(page)).toHaveAttribute('data-date', '2026-09-12')
  await page.clock.setFixedTime('2026-09-13T00:01:00Z')
  await page.keyboard.press('ArrowRight')
  await expect(day(page, '2026-09-21')).toBeFocused()
  await expect(today(page)).toHaveAttribute('data-date', '2026-09-13')
  await expect(day(page, '2026-09-20')).toHaveAttribute('data-selected', 'true')
  expect(await changes(page)).toEqual([])
})

test('a completely unavailable month still permits spatial focus but no activation', { tag: ['@intl', '@focus'] }, async ({
  page,
}) => {
  await render(page, { timezone: 'UTC', min: '2026-10-01' })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Enter')
  await expect(day(page, '2026-09-12')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(day(page, '2026-09-13')).toBeFocused()
  await expect(day(page, '2026-09-13')).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await changes(page)).toEqual([])
})
