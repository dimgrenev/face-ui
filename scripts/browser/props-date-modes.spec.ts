import { expect, test, type Page } from '@playwright/test'

const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderDate(props), props)
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
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})

for (const surface of ['popover', 'sheet']) {
  test(`${surface}: a birthday can start with a year and drill down without a views prop`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: surface === 'sheet' ? 375 : 1000,
      height: 850,
    })
    const props = {
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

  test(`${surface}: all minutes are reachable by keyboard and exact selection is submitted`, async ({
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

test('year paging preserves keyboard position, respects bounds, and never selects by navigation', async ({
  page,
}) => {
  await render(page, {
    mode: 'year',
    defaultValue: '2026-01-01',
    name: 'deadline',
    min: '2017-01-01',
    max: '2040-12-31',
  })
  await page.getByRole('combobox').click()
  await expect(page.locator('[data-part="viewSwitch"]')).toHaveCount(0)
  await expect(button(page, 'Previous 12 years')).toBeDisabled()
  await expect(button(page, '2026')).toBeFocused()
  await page.keyboard.press('PageDown')
  await expect(button(page, '2038')).toBeFocused()
  await expect(button(page, 'Next 12 years')).toBeDisabled()
  await page.keyboard.press('PageDown')
  await expect(button(page, '2038')).toBeFocused()
  await page.keyboard.press('PageUp')
  await expect(button(page, '2026')).toBeFocused()
  expect(await formValue(page)).toBe('2026-01-01')
  expect(await changes(page)).toEqual([])
})

test('mode changes replace an unsupported focused panel quietly', async ({
  page,
}) => {
  const props = { defaultValue: '2026-09-12T09:35', name: 'deadline' }
  await render(page, { ...props, mode: 'date' })
  await page.getByRole('combobox').click()
  await expect(page.locator('[data-date="2026-09-12"]')).toBeFocused()
  await render(page, { ...props, mode: 'time' })
  await expect(page.getByRole('grid')).toHaveCount(0)
  await expect(button(page, '00')).toBeFocused()
  await render(page, { ...props, mode: 'year' })
  await expect(button(page, '2026')).toBeFocused()
  expect(await formValue(page)).toBe('2026-09-12')
  expect(await changes(page)).toEqual([])
})

test('month range highlight follows value through year paging and controlled updates', async ({
  page,
}) => {
  const props = {
    mode: 'month',
    selection: 'range',
    value: { start: '2026-03-01', end: '2026-05-01' },
  }
  await render(page, props)
  await page.getByRole('combobox').click()
  for (const name of ['Mar', 'Apr', 'May'])
    await expect(button(page, name)).toHaveAttribute('aria-pressed', 'true')
  await expect(button(page, 'Feb')).toHaveAttribute('aria-pressed', 'false')
  await button(page, 'Next year').click()
  await expect(
    page
      .getByRole('group', { name: 'Month', exact: true })
      .locator('[aria-pressed="true"]'),
  ).toHaveCount(0)
  await render(page, {
    ...props,
    value: { start: '2027-08-01', end: '2027-09-01' },
  })
  for (const name of ['Aug', 'Sep'])
    await expect(button(page, name)).toHaveAttribute('aria-pressed', 'true')
  await button(page, 'Oct').click()
  await expect(button(page, 'Aug')).toHaveAttribute('aria-pressed', 'true')
  await expect(button(page, 'Oct')).toHaveAttribute('aria-pressed', 'false')
  expect(await changes(page)).toEqual([
    { type: 'value', value: { start: '2027-10-01', end: null } },
  ])
})

test('a focused minute remains in the picker when constraints disable it', async ({
  page,
}) => {
  const props = {
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

test('RTL arrows use the visual period columns and modifiers keep native behavior', async ({
  page,
}) => {
  await render(page, { mode: 'month', defaultValue: '2026-09-12', dir: 'rtl' })
  await page.getByRole('combobox').click()
  await expect(button(page, 'Sep')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(button(page, 'Aug')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(button(page, 'May')).toBeFocused()
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(button(page, 'May')).toBeFocused()
  expect(await changes(page)).toEqual([])
})

for (const theme of ['light', 'dark']) {
  test(`${theme}: period selection stays visible without hover and the full minute grid fits a compact sheet`, async ({
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
