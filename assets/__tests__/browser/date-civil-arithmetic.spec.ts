import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate } = hooks<Hooks>()
type Props = Parameters<typeof renderDate>[1]

test.use({ timezoneId: 'Pacific/Apia' })
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime('2011-12-31T12:00Z')
  await open(page, 'date')
})
async function render(page: Page, props: Props, calendar = false) {
  await renderDate(page, props, false, calendar ? 'calendar' : 'field', calendar)
  if (!calendar && !(await page.getByRole('dialog').count()))
    await page.getByRole('combobox').click()
}
const day = (page: Page, iso: string) => page.locator(`[data-date="${iso}"]`)
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const submitted = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('schedule'))

for (const calendar of [false, true]) {
  test(`${calendar ? 'Calendar' : 'Date UTC'} visits, labels and selects the exact civil day missing from the browser timezone`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(
      page,
      { defaultValue: '2011-12-29', timezone: 'UTC', name: 'schedule' },
      calendar,
    )
    await day(page, '2011-12-29').focus()
    await page.keyboard.press('ArrowRight')
    await expect(day(page, '2011-12-30')).toBeFocused()
    await expect(day(page, '2011-12-30')).toHaveAttribute(
      'aria-label',
      'Friday, December 30, 2011',
    )
    expect(await changes(page)).toEqual([])
    await page.keyboard.press('Enter')
    expect(await changes(page)).toEqual([
      { type: 'value', value: '2011-12-30' },
    ])
    if (!calendar) expect(await submitted(page)).toBe('2011-12-30')
  })
}
test('Calendar min/max and disabledDates keep their civil meaning in a skipped day', { tag: ['@intl'] }, async ({
  page,
}) => {
  const props = {
    defaultValue: '2011-12-29',
    min: '2011-12-30',
    max: '2011-12-30',
  }
  await render(page, props, true)
  await expect(day(page, '2011-12-30')).not.toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(day(page, '2011-12-29')).toHaveAttribute('aria-disabled', 'true')
  await expect(day(page, '2011-12-31')).toHaveAttribute('aria-disabled', 'true')
  await render(page, { ...props, disabledDates: ['2011-12-30'] }, true)
  await expect(day(page, '2011-12-30')).toHaveAttribute('aria-disabled', 'true')
  await day(page, '2011-12-30').focus()
  await page.keyboard.press('Enter')
  expect(await changes(page)).toEqual([])
})
test('Calendar controlled ISO refusal and acceptance preserve the skipped day', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(page, { value: '2011-12-29' }, true)
  await day(page, '2011-12-30').click()
  expect(await changes(page)).toEqual([{ type: 'value', value: '2011-12-30' }])
  await expect(day(page, '2011-12-29')).toHaveAttribute('data-selected', 'true')
  await render(page, { value: '2011-12-30' }, true)
  await expect(day(page, '2011-12-30')).toHaveAttribute('data-selected', 'true')
  expect(await changes(page)).toHaveLength(1)
})
test('Calendar incomplete ISO ranges complete on the exact skipped day', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(
    page,
    { selection: 'range', defaultValue: { start: '2011-12-29', end: null } },
    true,
  )
  await day(page, '2011-12-30').click()
  expect(await changes(page)).toEqual([
    { type: 'value', value: { start: '2011-12-29', end: '2011-12-30' } },
  ])
  await expect(page.getByRole('gridcell', { selected: true })).toHaveCount(2)
})
test('Date validates every civil day of a week, including a locally nonexistent forbidden day', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(page, {
    mode: 'week',
    defaultValue: { start: '2011-12-29', end: null },
    weekStartsOn: 1,
    disabledDates: ['2011-12-30'],
    name: 'schedule',
  })
  for (const iso of ['2011-12-26', '2011-12-29', '2011-12-30', '2012-01-01'])
    await expect(day(page, iso)).toHaveAttribute('aria-disabled', 'true')
  await day(page, '2011-12-29').focus()
  await page.keyboard.press('Enter')
  expect(await changes(page)).toEqual([])
})
for (const mode of ['month', 'year'] as const) {
  test(`Date ${mode} finds the only permitted civil day without skipping it`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, {
      mode,
      defaultValue: '2011-12-01',
      min: '2011-12-01',
      max: '2011-12-30',
      disabledDates: Array.from(
        { length: 29 },
        (_, index) => `2011-12-${String(index + 1).padStart(2, '0')}`,
      ),
      name: 'schedule',
    })
    const choice = page.locator('.uf-date__grid').getByRole('button', {
      name: mode === 'month' ? 'Dec' : '2011',
      exact: true,
    })
    await expect(choice).toBeEnabled()
    await choice.click()
    expect(await submitted(page)).toBe('2011-12-30')
    expect(await changes(page)).toEqual([
      { type: 'value', value: '2011-12-30' },
    ])
  })
}
test('an explicit civil business preset preserves its day across a local timezone gap', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(page, {
    timezone: 'UTC',
    presets: [
      {
        id: 'reporting-cutoff',
        label: 'Reporting cutoff',
        value: '2011-12-30',
      },
    ],
    name: 'schedule',
  })
  await page
    .getByRole('button', { name: 'Reporting cutoff', exact: true })
    .click()
  expect(await submitted(page)).toBe('2011-12-30')
  expect(await changes(page)).toEqual([{ type: 'value', value: '2011-12-30' }])
})
for (const iso of ['0001-01-01', '9999-12-31']) {
  test(`Date rejects a partial week at ${iso} without committing an out-of-domain date`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, {
      mode: 'week',
      value: { start: iso, end: null },
      weekStartsOn: 0,
      name: 'schedule',
    })
    await expect(day(page, iso)).toHaveAttribute('aria-disabled', 'true')
    await day(page, iso).focus()
    await page.keyboard.press('Enter')
    expect(await changes(page)).toEqual([])
    expect(await submitted(page)).toBe(null)
  })
  test(`Calendar ${iso} has unique supported day buttons and bounded navigation`, { tag: ['@intl', '@layout'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: iso }, true)
    const dates = await page
      .locator('[data-date]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-date')!),
      )
    expect(new Set(dates).size).toBe(dates.length)
    const cells = page.locator('tbody [role="gridcell"]')
    await expect(cells).toHaveCount(42)
    const rowHeights = await page
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => row.getBoundingClientRect().height),
      )
    expect(Math.min(...rowHeights)).toBeGreaterThan(0)
    expect(Math.max(...rowHeights) - Math.min(...rowHeights)).toBeLessThan(1)
    const column = await day(page, iso).evaluate(
      (node) => node.closest('td')!.cellIndex,
    )
    expect(column).toBe(iso.startsWith('0001') ? 1 : 5)
    expect(
      dates.every(
        (date) =>
          date.length === 10 && date >= '0001-01-01' && date <= '9999-12-31',
      ),
    ).toBe(true)
    await day(page, iso).focus()
    await page.keyboard.press(
      iso.startsWith('0001') ? 'ArrowLeft' : 'ArrowRight',
    )
    await expect(day(page, iso)).toBeFocused()
    await expect(
      page.getByRole('button', {
        name: iso.startsWith('0001') ? 'Previous month' : 'Next month',
        exact: true,
      }),
    ).toBeDisabled()
  })
}
