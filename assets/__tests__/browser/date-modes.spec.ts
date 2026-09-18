import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate: render } = hooks<Hooks>()
type Props = Parameters<typeof render>[1]

const button = (page: Page, name: string) =>
  page.getByRole('dialog').getByRole('button', { name, exact: true })
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const formValue = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline'))

test.beforeEach(async ({ page }) => {
  await open(page, 'date')
})

for (const surface of ['popover', 'sheet'] as const) {
  test(`${surface}: a birthday can start with a year and drill down without a views prop`, { tag: ['@layout', '@focus'] }, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1000,
      height: 850,
    })
    const props: Props = {
      surface,
      defaultValue: '1998-02-12',
      openTo: 'year',
      name: 'deadline',
    }
    await render(page, props)
    await page.getByRole('combobox').click()
    await expect(button(page, '1998')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(button(page, '1999')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('group', { name: 'Month', exact: true }),
    ).toBeVisible()
    await button(page, 'May').click()
    await expect(page.getByRole('grid', { name: 'May 1999' })).toBeVisible()
    await expect(page.locator('[data-date="1999-05-12"]')).toBeFocused()
    expect(await changes(page)).toEqual([])
    expect(await formValue(page)).toBe('1998-02-12')
    await render(page, { ...props, openTo: 'month' })
    await expect(page.getByRole('grid', { name: 'May 1999' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toBeFocused()
    expect(await formValue(page)).toBe('1999-05-12')
    expect(await changes(page)).toEqual([
      { type: 'value', value: '1999-05-12' },
    ])
  })

  test(`${surface}: all minutes are reachable by keyboard and exact selection is submitted`, { tag: ['@layout', '@focus'] }, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1000,
      height: 850,
    })
    await render(page, {
      surface,
      mode: 'time',
      defaultValue: '2026-09-12T09:35',
      openTo: 'minutes',
      name: 'deadline',
      closeOnSelect: true,
      disabledTime: { minutes: [41] },
    })
    await page.getByRole('combobox').click()
    const minutes = page.getByRole('group', { name: 'Minute', exact: true })
    await expect(minutes.getByRole('button')).toHaveCount(60)
    await expect(minutes.locator('button[tabindex="0"]')).toHaveCount(1)
    await expect(button(page, '35')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(button(page, '47')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(button(page, '42')).toBeFocused()
    await page.keyboard.press('Control+End')
    await expect(button(page, '59')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toBeFocused()
    expect(await formValue(page)).toBe('2026-09-12T09:59')
    expect(await changes(page)).toEqual([
      { type: 'value', value: '2026-09-12T09:59' },
    ])
  })
}

test('a focused minute remains in the picker when constraints disable it', { tag: ['@focus'] }, async ({
  page,
}) => {
  const props: Props = {
    mode: 'time',
    defaultValue: '2026-09-12T09:35',
    openTo: 'minutes',
  }
  await render(page, props)
  await page.getByRole('combobox').click()
  await expect(button(page, '35')).toBeFocused()
  await render(page, { ...props, disabledTime: { minutes: [35] } })
  await expect(button(page, '35')).toBeDisabled()
  await expect(button(page, '00')).toBeFocused()
  await expect(
    page
      .getByRole('group', { name: 'Minute', exact: true })
      .locator('button[tabindex="0"]'),
  ).toHaveCount(1)
  expect(await changes(page)).toEqual([])
})

for (const theme of ['light', 'dark']) {
  test(`${theme}: period selection stays visible without hover and the full minute grid fits a compact sheet`, { tag: ['@layout', '@css'] }, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.evaluate(
      (theme) => document.documentElement.setAttribute('data-theme', theme),
      theme,
    )
    await render(page, { mode: 'month', defaultValue: '2026-09-12' })
    await page.getByRole('combobox').click()
    await button(page, 'Clear').focus()
    await page.mouse.move(358, 0)
    const background = (name: string) =>
      button(page, name).evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      )
    expect(await background('Sep')).not.toBe(await background('Aug'))
    await render(page, {
      mode: 'time',
      value: '2026-09-12T09:35',
      openTo: 'minutes',
    })
    await button(page, 'Minute').click()
    await expect(button(page, '59')).toBeVisible()
    await expect
      .poll(async () => {
        const box = await page.getByRole('dialog').boundingBox()
        return Boolean(
          box &&
          box.x >= 0 &&
          box.x + box.width <= 360 &&
          box.y >= 0 &&
          box.y + box.height <= 801,
        )
      })
      .toBe(true)
    const grid = page.getByRole('group', { name: 'Minute', exact: true })
    expect(
      await grid.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
  })
}
