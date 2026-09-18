import { expect, test, type Page } from '@playwright/test'

const render = (
  page: Page,
  props: Record<string, unknown>,
  controlled = false,
) =>
  page.evaluate(
    ({ props, controlled }) => (window as any).renderDate(props, controlled),
    { props, controlled },
  )
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
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})

for (const surface of ['popover', 'sheet']) {
  test(`${surface}: edits both clock endpoints using the keyboard and submits the actual interval`, async ({
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

test('controlled updates and parent refusal restore the selected clock without extra events', async ({
  page,
}) => {
  const props = {
    mode: 'datetime',
    value: '2026-09-12T09:35',
    openTo: 'hours',
    name: 'deadline',
  }
  await render(page, props)
  await page.getByRole('combobox').click()
  await render(page, { ...props, value: '2026-09-12T16:47' })
  await expect(button(page, '16')).toHaveAttribute('aria-pressed', 'true')
  await button(page, '17').click()
  await expect(button(page, '16')).toHaveAttribute('aria-pressed', 'true')
  expect(await value(page)).toBe('2026-09-12T16:47')
  expect(await changes(page)).toEqual([
    { type: 'value', value: '2026-09-12T17:47' },
  ])
  await button(page, 'Minute').click()
  await expect(button(page, '47')).toHaveAttribute('aria-pressed', 'true')
})

test('datetime day and clock availability respect exact bounds and disabled minutes', async ({
  page,
}) => {
  await render(page, {
    mode: 'datetime',
    defaultValue: '2026-09-11T00:00',
    min: '2026-09-12T09:32',
    max: '2026-09-12T10:20',
    disabledTime: { minutes: [32] },
    name: 'deadline',
  })
  await page.getByRole('combobox').click()
  await page.locator('[data-date="2026-09-12"]').click()
  expect(await value(page)).toBe('2026-09-12T09:33')
  await button(page, 'Minute').click()
  await expect(button(page, '33')).toHaveAttribute('aria-pressed', 'true')
  await expect(button(page, '30')).toBeDisabled()
  await button(page, 'Hour').click()
  await expect(button(page, '08')).toBeDisabled()
  await button(page, '10').click()
  expect(await value(page)).toBe('2026-09-12T10:20')
  await button(page, 'Minute').click()
  await expect(button(page, '25')).toBeDisabled()
  await expect(button(page, '20')).toHaveAttribute('aria-pressed', 'true')
})

test('a partial time range stays open and cannot submit as a complete required interval', async ({
  page,
}) => {
  await render(page, {
    mode: 'time',
    selection: 'range',
    name: 'deadline',
    required: true,
    closeOnSelect: true,
  })
  await page.getByRole('combobox').click()
  await button(page, '09').click()
  await button(page, 'Minute').click()
  await button(page, '35').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await value(page)).toBeNull()
  expect(
    await page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => form.checkValidity()),
  ).toBe(false)
  await button(page, 'End').click()
  await button(page, 'Hour').click()
  await button(page, '10').click()
  await button(page, 'Minute').click()
  await button(page, '45').click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await value(page)).toMatch(/T09:35\/\d{4}-\d{2}-\d{2}T10:45$/)
  expect(
    await page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => form.checkValidity()),
  ).toBe(true)
})

test('timezone conversion is shared by Calendar constraints and final selection', async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: 'America/Los_Angeles',
  })
  const page = await context.newPage()
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
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

test('clock reset is quiet and unavailable presets cannot close the picker', async ({
  page,
}) => {
  await render(page, {
    mode: 'datetime',
    defaultValue: '2026-09-12T09:35',
    openTo: 'hours',
    presets: [
      { id: 'too-early', label: 'Too early', value: '2026-09-12T08:00' },
    ],
    min: '2026-09-12T09:00',
    name: 'deadline',
  })
  await page.getByRole('combobox').click()
  await expect(button(page, 'Too early')).toBeDisabled()
  await button(page, '12').click()
  await page.locator('#form').evaluate((form: HTMLFormElement) => form.reset())
  await expect(button(page, '09')).toHaveAttribute('aria-pressed', 'true')
  expect(await value(page)).toBe('2026-09-12T09:35')
  expect(await changes(page)).toHaveLength(1)
})

test('date-only range endpoints compare as midnight in the time panel', async ({
  page,
}) => {
  await render(page, {
    mode: 'time',
    selection: 'range',
    defaultValue: { start: '2026-09-12', end: '2026-09-12' },
    name: 'deadline',
  })
  await page.getByRole('combobox').click()
  await expect(button(page, '00')).toBeEnabled()
  expect(await value(page)).toBe('2026-09-12T00:00/2026-09-12T00:00')
  await button(page, '00').click()
  await expect(button(page, '00')).toHaveAttribute('aria-pressed', 'true')
  expect(await value(page)).toBe('2026-09-12T00:00/2026-09-12T00:00')
  expect(await changes(page)).toEqual([])
})

for (const theme of ['light', 'dark']) {
  test(`${theme}: selected clock controls remain visually distinct without hover or focus`, async ({
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
