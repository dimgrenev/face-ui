import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate } = hooks<Hooks>()
type Props = Parameters<typeof renderDate>[1]

const render = (page: Page, props: Props) =>
  renderDate(page, { name: 'deadline', format: 'yyyy-MM-dd HH:mm', ...props })
const trigger = (page: Page) => page.getByRole('combobox')
const day = (page: Page, iso: string) => page.locator(`[data-date="${iso}"]`)
const events = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const submitted = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('deadline'))
const valid = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => (form as HTMLFormElement).checkValidity())

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime('2026-09-12T12:00Z')
  await open(page, 'date')
})

for (const timezoneId of [
  'Pacific/Kiritimati',
  'America/Los_Angeles',
  'Pacific/Apia',
]) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId })
    test('civil values and explicit instants keep their own meaning through mode and timezone updates', { tag: ['@intl', '@focus'] }, async ({
      page,
    }) => {
      await render(page, { value: '2026-09-12', timezone: 'UTC' })
      expect(await submitted(page)).toBe('2026-09-12')
      await trigger(page).click()
      await expect(day(page, '2026-09-12')).toBeFocused()
      await page.keyboard.press('Escape')
      const props = { value: '2026-09-11T23:30Z', timezone: 'Asia/Tokyo' }
      await render(page, props)
      expect(await submitted(page)).toBe('2026-09-12')
      await render(page, { ...props, mode: 'time' })
      expect(await submitted(page)).toBe('2026-09-12T08:30')
      await expect(trigger(page)).toHaveText('2026-09-12 08:30')
      await render(page, { ...props, mode: 'time', timezone: 'UTC' })
      expect(await submitted(page)).toBe('2026-09-11T23:30')
      expect(await events(page)).toEqual([])
    })
  })
}

test('week drafts are incomplete form values until a whole week is selected', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, {
    mode: 'week',
    defaultValue: { start: '2026-09-12', end: null },
    weekStartsOn: 1,
    required: true,
    closeOnSelect: false,
  })
  expect(await submitted(page)).toBe(null)
  expect(await valid(page)).toBe(false)
  await trigger(page).click()
  await day(page, '2026-09-14').click()
  expect(await submitted(page)).toBe('2026-09-14/2026-09-20')
  expect(await valid(page)).toBe(true)
  await expect(page.getByRole('gridcell', { selected: true })).toHaveCount(7)
  await page
    .locator('#form')
    .evaluate((form) => (form as HTMLFormElement).reset())
  expect(await submitted(page)).toBe(null)
  expect(await valid(page)).toBe(false)
  expect(await events(page)).toEqual([
    { type: 'value', value: { start: '2026-09-14', end: '2026-09-20' } },
  ])
})

test('valueFormat=date emits both real instants while forms retain civil ISO minutes across DST', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(page, {
    mode: 'datetime',
    selection: 'range',
    valueFormat: 'date',
    timezone: 'America/New_York',
    defaultValue: { start: '2026-11-01T01:30', end: '2026-11-02T01:30' },
    openTo: 'hours',
  })
  await trigger(page).click()
  await page
    .getByRole('group', { name: 'Hour', exact: true })
    .getByRole('button', { name: '02', exact: true })
    .click()
  expect(await submitted(page)).toBe('2026-11-01T02:30/2026-11-02T01:30')
  expect(
    await page.evaluate(() => {
      const events = (window as any).dateEvents.filter(
        (event: any) => event.type === 'value',
      )
      return events.map(({ value }: any) => ({
        startDate: value.start instanceof Date,
        endDate: value.end instanceof Date,
        start: value.start.toISOString(),
        end: value.end.toISOString(),
      }))
    }),
  ).toEqual([
    {
      startDate: true,
      endDate: true,
      start: '2026-11-01T07:30:00.000Z',
      end: '2026-11-02T06:30:00.000Z',
    },
  ])
})
