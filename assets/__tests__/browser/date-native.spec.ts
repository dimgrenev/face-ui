import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate: render } = hooks<Hooks>()
type Props = Parameters<typeof render>[1]

const events = (page: Page) => page.evaluate(() => (window as any).dateEvents)
const day = (page: Page, date = '2026-09-12') =>
  page.locator(`[data-date="${date}"]`)

test.beforeEach(async ({ page }) => {
  await open(page, 'date')
})

for (const surface of ['popover', 'sheet'] as const) {
  test(`${surface}: native activation focuses the selected day and unchanged selection closes exactly once`, { tag: ['@native', '@focus', '@layout'] }, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1000,
      height: 850,
    })
    await render(page, {
      id: 'date-trigger',
      surface,
      defaultValue: '2026-09-12',
      required: true,
    })
    const trigger = page.locator('#date-trigger')
    await expect(trigger).toHaveAccessibleName('Deadline')
    for (const activation of ['Enter', 'Space', 'click']) {
      await trigger.focus()
      if (activation === 'click') await trigger.click()
      else await page.keyboard.press(activation)
      await expect(day(page)).toBeFocused()
      await expect(page.getByRole('dialog')).toHaveAccessibleName('Deadline')
      if (activation === 'click') await day(page).click()
      else await page.keyboard.press(activation)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(trigger).not.toHaveAttribute('aria-controls')
    }
    expect(await events(page)).toEqual(
      Array.from({ length: 3 }, () => [
        { type: 'open', open: true },
        { type: 'open', open: false },
      ]).flat(),
    )
  })
}

test('modified ArrowDown is native and inherited direction/language reach the portal', { tag: ['@css', '@focus'] }, async ({
  page,
}) => {
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
    ;(window as unknown as Hooks).renderDate({ defaultValue: '2026-09-12' })
  })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('dialog')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('dialog')).toHaveAttribute('lang', 'ar')
  await expect(day(page)).toBeFocused()
})

test('controlled opening focuses the selected day and a controlled close returns focus to the trigger', { tag: ['@focus'] }, async ({
  page,
}) => {
  const props = { id: 'date-trigger', open: false, defaultValue: '2026-09-12' }
  await render(page, props)
  await page.locator('#date-trigger').click()
  await render(page, { ...props, open: true })
  await expect(day(page)).toBeFocused()
  await day(page, '2026-09-13').focus()
  await render(page, props)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#date-trigger')).toBeFocused()
})

test('external form serializes and resets a range; native change obeys the controlled value', { tag: ['@native'] }, async ({
  page,
}) => {
  const initial = { start: '2026-09-12', end: '2026-09-15' }
  const props: Props = {
    selection: 'range',
    name: 'deadline',
    form: 'external',
    defaultValue: initial,
  }
  await render(page, props)
  const formValue = () =>
    page
      .locator('#external')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline'))
  expect(await formValue()).toBe('2026-09-12/2026-09-15')
  expect(
    await page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline')),
  ).toBeNull()
  await page.getByRole('combobox').click()
  await day(page, '2026-09-20').click()
  await day(page, '2026-09-22').click()
  expect(await formValue()).toBe('2026-09-20/2026-09-22')
  await page
    .locator('#external')
    .evaluate((form: HTMLFormElement) => form.reset())
  await expect.poll(formValue).toBe('2026-09-12/2026-09-15')
  await page.keyboard.press('Escape')
  await render(page, { ...props, value: initial })
  await page
    .locator('select[name="deadline"]')
    .evaluate((select: HTMLSelectElement) => {
      select.add(new Option('2026-09-20/2026-09-22', '2026-09-20/2026-09-22'))
      select.value = '2026-09-20/2026-09-22'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  await expect.poll(formValue).toBe('2026-09-12/2026-09-15')
  expect(
    (await events(page)).filter((event: any) => event.type === 'value').at(-1),
  ).toEqual({
    type: 'value',
    value: { start: '2026-09-20', end: '2026-09-22' },
  })
  await render(page, { ...props, required: true, readOnly: true })
  expect(
    await page
      .locator('#external')
      .evaluate((form: HTMLFormElement) => form.checkValidity()),
  ).toBe(true)
  expect(await formValue()).toBe('2026-09-12/2026-09-15')
  await render(page, { ...props, disabled: true })
  expect(await formValue()).toBeNull()
})
