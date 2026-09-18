import { expect, test, type Page } from '@playwright/test'

const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderDate(props), props)
const events = (page: Page) => page.evaluate(() => (window as any).dateEvents)
const day = (page: Page, date = '2026-09-12') =>
  page.locator(`[data-date="${date}"]`)

test.beforeEach(async ({ page }) => {
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})

for (const surface of ['popover', 'sheet']) {
  test(`${surface}: native activation focuses the selected day and unchanged selection closes exactly once`, async ({
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

  test(`${surface}: rich labels mount once and title and close names remain accessible`, async ({
    page,
  }) => {
    await page.evaluate((surface) => {
      const w = window as any
      w.renderDate({
        surface,
        label: w.React.createElement(
          'span',
          { id: 'rich-label' },
          'Dispatch date',
        ),
        defaultValue: '2026-09-12',
      })
    }, surface)
    await page
      .getByRole('combobox', { name: 'Dispatch date', exact: true })
      .click()
    await expect(page.locator('#rich-label')).toHaveCount(1)
    await expect(page.getByRole('dialog')).toHaveAccessibleName(
      'Dispatch date Choose date',
    )
    await page.keyboard.press('Escape')
    await page.evaluate((surface) => {
      const w = window as any
      w.renderDate({
        surface,
        surfaceTitle: w.React.createElement(
          'strong',
          { id: 'rich-title' },
          'Дата отправки',
        ),
        labels: { close: 'Закрыть календарь' },
        defaultValue: '2026-09-12',
      })
    }, surface)
    await page.getByRole('combobox').click()
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Дата отправки')
    await expect(page.locator('#rich-title')).toHaveCount(1)
    if (surface === 'sheet')
      await page
        .getByRole('button', { name: 'Закрыть календарь', exact: true })
        .click()
    else await page.keyboard.press('Escape')
    await expect(page.getByRole('combobox')).toBeFocused()
  })
}

test('controlled visibility respects refusal without losing focus or emitting external updates', async ({
  page,
}) => {
  const props = { id: 'date-trigger', open: false, defaultValue: '2026-09-12' }
  await render(page, props)
  await page.locator('#date-trigger').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await render(page, { ...props, open: true })
  await expect(day(page)).toBeFocused()
  await day(page, '2026-09-13').focus()
  await page.keyboard.press('Escape')
  await expect(day(page, '2026-09-13')).toBeFocused()
  await day(page).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await render(page, props)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#date-trigger')).toBeFocused()
  expect(await events(page)).toEqual([
    { type: 'open', open: true },
    { type: 'open', open: false },
    { type: 'open', open: false },
  ])
})

test('defaultOpen is initial only and availability suppresses a controlled layer', async ({
  page,
}) => {
  await render(page, { defaultOpen: true, defaultValue: '2026-09-12' })
  await expect(day(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await render(page, { defaultOpen: true, defaultValue: '2026-09-12' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const unavailable of ['disabled', 'readOnly', 'hidden']) {
    await render(page, { open: true, defaultValue: '2026-09-12' })
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await render(page, {
      open: true,
      defaultValue: '2026-09-12',
      [unavailable]: true,
    })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (unavailable === 'hidden')
      await expect(
        page.locator('[data-scope="date"][data-part="root"]'),
      ).toBeHidden()
    else
      await expect(
        page.locator('[data-scope="date"][data-part="root"]'),
      ).toBeVisible()
  }
  expect(await events(page)).toEqual([{ type: 'open', open: false }])
})

test('native ref and cancellable events target the actual button', async ({
  page,
}) => {
  await page.evaluate(() => {
    const w = window as any
    w.nativeEvents = []
    w.renderDate({
      id: 'date-trigger',
      form: 'external',
      defaultValue: '2026-09-12',
      style: { width: 240 },
      ref: (node: HTMLButtonElement | null) => {
        w.dateRef = node
      },
      onFocus: (event: any) => w.nativeEvents.push(event.currentTarget.id),
      onClick: (event: any) => event.preventDefault(),
      onKeyDown: (event: any) => event.preventDefault(),
      'data-native': 'yes',
      'aria-label': 'Custom date',
    })
  })
  const trigger = page.locator('#date-trigger')
  await expect(trigger).toHaveAccessibleName('Custom date')
  await expect(trigger).toHaveAttribute('data-native', 'yes')
  expect(
    await page.evaluate(() => {
      const w = window as any
      w.dateRef.focus()
      return [
        w.dateRef.tagName,
        w.dateRef.form.id,
        w.dateRef === document.activeElement,
      ]
    }),
  ).toEqual(['BUTTON', 'external', true])
  await expect(page.locator('[data-scope="date"][data-part="root"]')).toHaveCSS(
    'width',
    '240px',
  )
  await trigger.click()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  expect(await events(page)).toEqual([])
  expect(await page.evaluate(() => (window as any).nativeEvents)).toContain(
    'date-trigger',
  )
})

test('modified ArrowDown is native and inherited direction/language reach the portal', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
    ;(window as any).renderDate({ defaultValue: '2026-09-12' })
  })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('dialog')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('dialog')).toHaveAttribute('lang', 'ar')
  await expect(day(page)).toBeFocused()
})

test('external form serializes and resets a range; native change obeys the controlled value', async ({
  page,
}) => {
  const initial = { start: '2026-09-12', end: '2026-09-15' }
  const props = {
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

test('week selection highlights all seven days and blocks an entire unavailable week', async ({
  page,
}) => {
  await render(page, {
    mode: 'week',
    weekStartsOn: 1,
    defaultValue: { start: '2026-09-07', end: '2026-09-13' },
    disabledDates: ['2026-09-16'],
  })
  await page.getByRole('combobox').click()
  await expect(page.getByRole('gridcell', { selected: true })).toHaveCount(7)
  for (const date of ['2026-09-14', '2026-09-16', '2026-09-20'])
    await expect(day(page, date)).toHaveAttribute('aria-disabled', 'true')
  await day(page, '2026-09-21').click()
  await expect(page.getByRole('gridcell', { selected: true })).toHaveCount(7)
  expect(
    (await events(page)).filter((event: any) => event.type === 'value'),
  ).toEqual([
    { type: 'value', value: { start: '2026-09-21', end: '2026-09-27' } },
  ])
})

test('days with no permitted time are visibly unavailable and cannot activate', async ({
  page,
}) => {
  await render(page, {
    mode: 'datetime',
    defaultValue: '2026-09-12T09:00',
    disabledTime: { hours: Array.from({ length: 24 }, (_, hour) => hour) },
  })
  await page.getByRole('combobox').click()
  await expect(day(page)).toHaveAttribute('aria-disabled', 'true')
  await day(page).focus()
  await page.keyboard.press('Enter')
  expect(
    (await events(page)).filter((event: any) => event.type === 'value'),
  ).toEqual([])
})

test('standalone Calendar suppresses duplicate selection and preserves parent refusal', async ({
  page,
}) => {
  await page.evaluate(() =>
    (window as any).renderDate(
      { value: '2026-09-12' },
      false,
      'calendar',
      true,
    ),
  )
  await day(page).click()
  expect(await events(page)).toEqual([])
  await day(page, '2026-09-13').click()
  await expect(day(page)).toHaveAttribute('data-selected', 'true')
  await expect(day(page, '2026-09-13')).not.toHaveAttribute('data-selected')
  expect(
    (await events(page)).filter((event: any) => event.type === 'value'),
  ).toHaveLength(1)
})
