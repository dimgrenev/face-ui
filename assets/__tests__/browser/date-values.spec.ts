import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate: render } = hooks<Hooks>()

const value = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline'))
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const button = (page: Page, name: string) =>
  page.getByRole('dialog').getByRole('button', { name, exact: true })

test.beforeEach(async ({ page }) => {
  await open(page, 'date')
})

for (const surface of ['popover', 'sheet'] as const) {
  test(`${surface}: edits both clock endpoints using the keyboard and submits the actual interval`, { tag: ['@layout', '@focus'] }, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1000,
      height: 850,
    })
    await render(
      page,
      {
        mode: 'time',
        selection: 'range',
        surface,
        name: 'deadline',
        defaultValue: { start: '2026-09-12T09:35', end: '2026-09-12T16:45' },
        closeOnSelect: true,
      },
      true,
    )
    await page.getByRole('combobox').click()
    await expect(button(page, '09')).toHaveAttribute('aria-pressed', 'true')
    await button(page, '10').focus()
    await page.keyboard.press('Enter')
    await button(page, 'End').focus()
    await page.keyboard.press('Space')
    await expect(button(page, 'End')).toHaveAttribute('aria-pressed', 'true')
    await expect(button(page, '16')).toHaveAttribute('aria-pressed', 'true')
    await expect(button(page, '09')).toBeDisabled()
    await button(page, '17').click()
    await button(page, 'Minute').click()
    await expect(button(page, '45')).toHaveAttribute('aria-pressed', 'true')
    await button(page, '50').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('combobox')).toBeFocused()
    expect(await value(page)).toBe('2026-09-12T10:35/2026-09-12T17:50')
    expect(await changes(page)).toHaveLength(3)
  })
}

test('timezone conversion is shared by Calendar constraints and final selection', { tag: ['@intl'] }, async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: 'America/Los_Angeles',
  })
  const page = await context.newPage()
  await open(page, 'date')
  await render(page, {
    timezone: 'Asia/Tokyo',
    defaultValue: '2026-09-12',
    min: '2026-09-11T23:30Z',
    max: '2026-09-13T23:30Z',
    disabledDates: ['2026-09-12T23:30Z'],
    name: 'deadline',
  })
  await page.getByRole('combobox').click()
  await expect(page.locator('[data-date="2026-09-11"]')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(page.locator('[data-date="2026-09-13"]')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await page.locator('[data-date="2026-09-14"]').click()
  expect(await value(page)).toBe('2026-09-14')
  await context.close()
})

for (const theme of ['light', 'dark']) {
  test(`${theme}: selected clock controls remain visually distinct without hover or focus`, { tag: ['@layout', '@css'] }, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    await page
      .locator('html')
      .evaluate(
        (element, theme) => element.setAttribute('data-theme', theme),
        theme,
      )
    await render(page, {
      mode: 'time',
      selection: 'range',
      defaultValue: { start: '2026-09-12T09:35', end: '2026-09-12T16:45' },
    })
    await page.getByRole('combobox').click()
    await button(page, 'Clear').focus()
    await page.mouse.move(900, 0)
    const background = (name: string) =>
      button(page, name).evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      )
    for (const [selected, inactive] of [
      ['Start', 'End'],
      ['Hour', 'Minute'],
      ['09', '10'],
    ]) {
      expect(await background(selected)).not.toBe(await background(inactive))
    }
    await button(page, 'End').click()
    await button(page, 'Clear').focus()
    await page.mouse.move(900, 0)
    expect(await background('End')).not.toBe(await background('Start'))
    expect(await background('16')).not.toBe(await background('17'))
  })
}
