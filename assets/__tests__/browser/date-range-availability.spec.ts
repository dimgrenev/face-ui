import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate } = hooks<Hooks>()
type Props = Parameters<typeof renderDate>[1]

const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const formValue = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('deadline'))
const render = (page: Page, props: Props, calendar = false, controlled = false) =>
  renderDate(page, props, controlled, 'field', calendar)

test.beforeEach(async ({ page }) => {
  await open(page, 'date')
})

for (const calendar of [true, false])
  for (const [dir, theme] of [
    ['ltr', 'light'],
    ['rtl', 'dark'],
  ])
    for (const controlled of [false, true]) {
      test(`${calendar ? 'Calendar' : 'Date'} ${dir}/${theme} controlled=${controlled}: pointer restarts across a gap, keyboard completes the new range`, { tag: ['@layout', '@focus', '@pointer'] }, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 800 })
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme
        }, theme)
        await render(
          page,
          {
            selection: 'range',
            defaultValue: { start: '2026-09-12', end: null },
            disabledDates: ['2026-09-14'],
            dir,
            ...(calendar ? {} : { name: 'deadline', closeOnSelect: true }),
          },
          calendar,
          controlled,
        )
        if (!calendar) await page.getByRole('combobox').click()
        await day(page, '2026-09-16').click()
        expect(await changes(page)).toEqual([
          { type: 'value', value: { start: '2026-09-16', end: null } },
        ])
        await expect(page.getByRole('grid')).toHaveAttribute(
          'aria-multiselectable',
          'true',
        )
        await expect(
          day(page, '2026-09-14').locator('xpath=ancestor::td[1]'),
        ).toHaveAttribute('aria-selected', 'false')
        if (!calendar) expect(await formValue(page)).toBeNull()
        await expect(day(page, '2026-09-16')).toBeFocused()
        await page.keyboard.press(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft')
        await expect(day(page, '2026-09-17')).toBeFocused()
        await page.keyboard.press('Enter')
        expect(await changes(page)).toEqual([
          { type: 'value', value: { start: '2026-09-16', end: null } },
          { type: 'value', value: { start: '2026-09-16', end: '2026-09-17' } },
        ])
        if (!calendar) {
          await expect(page.getByRole('dialog')).toHaveCount(0)
          await expect(page.getByRole('combobox')).toBeFocused()
          expect(await formValue(page)).toBe('2026-09-16/2026-09-17')
        }
      })
    }

test('Date live endpoint policy enables the same preset, preserves its identity and does not silently repair historical values', { tag: ['@native'] }, async ({
  page,
}) => {
  const value = { start: '2026-09-12', end: '2026-09-16' }
  const props: Props = {
    selection: 'range',
    name: 'deadline',
    disabledDates: ['2026-09-14'],
    defaultValue: value,
    showNow: false,
    closeOnSelect: false,
    presets: [
      {
        id: 'report',
        label: 'Report period',
        value: { ...value, end: '2026-09-17' },
      },
    ],
  }
  await render(page, props)
  expect(await formValue(page)).toBe('2026-09-12/2026-09-16')
  expect(await changes(page)).toEqual([])
  await page.getByRole('combobox').click()
  const preset = page.getByRole('button', {
    name: 'Report period',
    exact: true,
  })
  await expect(preset).toBeDisabled()
  await preset.evaluate((node: HTMLElement) => {
    ;(window as any).savedPreset = node
    node.click()
  })
  expect(await changes(page)).toEqual([])
  await render(page, { ...props, excludeDisabledDates: false })
  await expect(preset).toBeEnabled()
  expect(
    await preset.evaluate((node) => node === (window as any).savedPreset),
  ).toBe(true)
  await preset.click()
  expect(await formValue(page)).toBe('2026-09-12/2026-09-17')
  await render(page, props)
  expect(await changes(page)).toHaveLength(1)
  expect(await formValue(page)).toBe('2026-09-12/2026-09-17')
  await page
    .locator('#form')
    .evaluate((form) => (form as HTMLFormElement).reset())
  await expect.poll(() => formValue(page)).toBe('2026-09-12/2026-09-16')
  expect(await changes(page)).toHaveLength(1)
})
