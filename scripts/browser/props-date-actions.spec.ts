import { expect, test, type Page } from '@playwright/test'
const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderDate(props), props)
test.beforeEach(async ({ page }) => {
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})
for (const dir of ['ltr', 'rtl'])
  for (const theme of ['light', 'dark']) {
    test(`${dir}/${theme}: a narrow date range truncates its text through Text without clipping the icon or losing its value`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await page
        .locator('html')
        .evaluate(
          (node, theme) => node.setAttribute('data-theme', theme),
          theme,
        )
      const props = {
        dir,
        style: { width: 260 },
        mode: 'datetime',
        selection: 'range',
        value: { start: '2026-11-01T02:30', end: '2026-11-02T01:30' },
        format: 'yyyy-MM-dd HH:mm',
        name: 'deadline',
      }
      const trigger = page.getByRole('combobox')
      const content = trigger.locator('.uf-text__content')
      for (const membrane of [true, false]) {
        await render(page, { ...props, membrane })
        await expect(trigger).toHaveText('2026-11-01 02:30 - 2026-11-02 01:30')
        await expect(content).toHaveCSS('text-overflow', 'ellipsis')
        await expect(content).toHaveCSS('overflow', 'hidden')
        const geometry = await trigger.evaluate((trigger) => {
          const text = trigger.querySelector<HTMLElement>('.uf-text__content')!
          const icon = trigger.querySelector<HTMLElement>('.uf-date__icon')!
          const textBox = text.getBoundingClientRect(),
            iconBox = icon.getBoundingClientRect(),
            root = trigger.getBoundingClientRect()
          return {
            text: { left: textBox.left, right: textBox.right },
            icon: { left: iconBox.left, right: iconBox.right },
            root: { left: root.left, right: root.right },
            overflow: text.scrollWidth > text.clientWidth,
          }
        })
        expect(geometry.overflow).toBe(true)
        expect(geometry.icon.left).toBeGreaterThanOrEqual(geometry.root.left)
        expect(geometry.icon.right).toBeLessThanOrEqual(geometry.root.right)
        if (dir === 'ltr')
          expect(geometry.text.right).toBeLessThanOrEqual(geometry.icon.left)
        else
          expect(geometry.text.left).toBeGreaterThanOrEqual(geometry.icon.right)
        expect(
          await page
            .locator('#form')
            .evaluate((form) =>
              new FormData(form as HTMLFormElement).get('deadline'),
            ),
        ).toBe('2026-11-01T02:30/2026-11-02T01:30')
      }
      await trigger.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
    })
  }

const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const formValue = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('deadline'))

test('preset identity survives live localization, value updates and reordering with keyboard focus intact', async ({
  page,
}) => {
  const props = {
    name: 'deadline',
    closeOnSelect: false,
    showNow: false,
    showClear: false,
    presets: [
      { id: 'release', label: 'Release', value: '2026-09-12' },
      { id: 'review', label: 'Review', value: '2026-09-13' },
    ],
  }
  await render(page, props)
  await page.getByRole('combobox').click()
  await page.getByRole('button', { name: 'Release', exact: true }).focus()
  await page.evaluate(() => {
    ;(window as any).savedAction = document.activeElement
  })
  await render(page, {
    ...props,
    presets: [
      { id: 'review', label: 'Проверка', value: '2026-09-13' },
      { id: 'release', label: 'Релиз', value: '2026-09-14' },
    ],
  })
  await expect(
    page.getByRole('button', { name: 'Релиз', exact: true }),
  ).toBeFocused()
  expect(
    await page.evaluate(
      () => document.activeElement === (window as any).savedAction,
    ),
  ).toBe(true)
  expect(await changes(page)).toEqual([])
  await page.keyboard.press('Enter')
  expect(await formValue(page)).toBe('2026-09-14')
  expect(await changes(page)).toEqual([{ type: 'value', value: '2026-09-14' }])
  await render(page, { ...props, presets: [] })
  await expect(
    page.getByRole('button', { name: 'Release', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Today', exact: true }),
  ).toHaveCount(0)
})

test('preset availability follows bounds and a controlled parent can refuse then accept it', async ({
  page,
}) => {
  const props = {
    name: 'deadline',
    open: true,
    closeOnSelect: true,
    value: '2026-09-12',
    min: '2026-09-14',
    presets: [{ id: 'release', label: 'Release', value: '2026-09-13' }],
  }
  await render(page, props)
  const action = page.getByRole('button', { name: 'Release', exact: true })
  await expect(action).toBeDisabled()
  await render(page, { ...props, min: '2026-09-12' })
  await expect(action).toBeEnabled()
  await action.click()
  expect(await changes(page)).toEqual([{ type: 'value', value: '2026-09-13' }])
  expect(await formValue(page)).toBe('2026-09-12')
  await expect(page.getByRole('dialog')).toBeVisible()
  await render(page, { ...props, min: '2026-09-12', value: '2026-09-13' })
  expect(await formValue(page)).toBe('2026-09-13')
  expect(await changes(page)).toHaveLength(1)
})

test('a completed preset emits Date instants, submits civil ISO and returns focus on close', async ({
  page,
}) => {
  await render(page, {
    mode: 'datetime',
    selection: 'range',
    valueFormat: 'date',
    timezone: 'America/New_York',
    name: 'deadline',
    closeOnSelect: true,
    presets: [
      {
        id: 'dst-release',
        label: 'Release window',
        value: { start: '2026-11-01T01:30', end: '2026-11-02T01:30' },
      },
    ],
  })
  const trigger = page.getByRole('combobox')
  await trigger.click()
  await page
    .getByRole('button', { name: 'Release window', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(await formValue(page)).toBe('2026-11-01T01:30/2026-11-02T01:30')
  expect(
    await page.evaluate(() =>
      (window as any).dateEvents
        .filter((event: any) => event.type === 'value')
        .map(({ value }: any) => ({
          startDate: value.start instanceof Date,
          endDate: value.end instanceof Date,
          start: value.start.toISOString(),
          end: value.end.toISOString(),
        })),
    ),
  ).toEqual([
    {
      startDate: true,
      endDate: true,
      start: '2026-11-01T05:30:00.000Z',
      end: '2026-11-02T06:30:00.000Z',
    },
  ])
})

test('a partial range preset remains a draft until the calendar completes it', async ({
  page,
}) => {
  await render(page, {
    selection: 'range',
    required: true,
    name: 'deadline',
    closeOnSelect: true,
    presets: [
      {
        id: 'since-release',
        label: 'Since release',
        value: { start: '2026-09-12', end: null },
      },
    ],
  })
  await page.getByRole('combobox').click()
  await page.getByRole('button', { name: 'Since release', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await formValue(page)).toBeNull()
  expect(
    await page
      .locator('#form')
      .evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(false)
  await page.locator('[data-date="2026-09-14"]').click()
  expect(await formValue(page)).toBe('2026-09-12/2026-09-14')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await changes(page)).toEqual([
    { type: 'value', value: { start: '2026-09-12', end: null } },
    { type: 'value', value: { start: '2026-09-12', end: '2026-09-14' } },
  ])
})

test('localized clear/now actions preserve native form behavior and empty clear is unavailable', async ({
  page,
}) => {
  await page.clock.setFixedTime('2026-09-12T12:30Z')
  await render(page, {
    name: 'deadline',
    closeOnSelect: false,
    labels: { clear: 'Очистить', now: 'Сейчас' },
  })
  await page.getByRole('combobox').click()
  const clear = page.getByRole('button', { name: 'Очистить', exact: true })
  await expect(clear).toBeDisabled()
  await page.getByRole('button', { name: 'Сейчас', exact: true }).click()
  expect(await formValue(page)).toBe('2026-09-12')
  await expect(clear).toBeEnabled()
  await clear.click()
  expect(await formValue(page)).toBeNull()
  await expect(clear).toBeDisabled()
  expect(await changes(page)).toEqual([
    { type: 'value', value: '2026-09-12' },
    { type: 'value', value: null },
  ])
})

test('malformed action configuration and sparse Calendar constraints report their owning props', async ({
  page,
}) => {
  for (const [props, prop] of [
    [
      { presets: [{ id: 'release', label: 'Release', value: 'bad' }] },
      'presets[0].value',
    ],
    [
      {
        presets: [
          {
            id: 'release',
            label: 'Release',
            value: { start: '2026-09-12', end: '2026-09-13' },
          },
        ],
      },
      'presets[0].value',
    ],
    [
      {
        presets: [
          { id: 'release', label: 'Release', value: '2026-09-12' },
          { id: 'release', label: 'Review', value: '2026-09-13' },
        ],
      },
      'presets[1].id',
    ],
  ] as const) {
    await page.evaluate(
      (props) => (window as any).renderDateValidation(props),
      props,
    )
    await expect(page.locator('[data-date-error="RangeError"]')).toContainText(
      prop,
    )
  }
  await page.evaluate(() =>
    (window as any).renderDateValidation({ disabledDates: new Array(1) }, true),
  )
  await expect(page.locator('[data-date-error="RangeError"]')).toContainText(
    'Calendar disabledDates[0]',
  )
})

for (const surface of ['popover', 'sheet']) {
  test(`${surface}: long localized preset actions stay inside a narrow surface`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    const label =
      'Последний полностью завершённый финансовый квартал с учётом локального календаря'
    const props = {
      surface,
      selection: 'range',
      defaultValue: { start: '2026-07-01', end: '2026-09-30' },
      presets: [
        {
          id: 'fiscal-quarter',
          label,
          value: { start: '2026-04-01', end: '2026-06-30' },
        },
      ],
    }
    await render(page, props)
    await page.getByRole('combobox').click()
    const action = page.getByRole('button', { name: label, exact: true })
    for (const membrane of [true, false]) {
      await render(page, { ...props, membrane })
      await expect(action).toBeVisible()
      await expect(page.locator('.uf-date__contentPanel')).toHaveCSS(
        'opacity',
        '1',
      )
      const bounds = await action.evaluate((button) => {
        const action = button.getBoundingClientRect(),
          surface = button.closest('[role="dialog"]')!.getBoundingClientRect()
        return {
          action: { left: action.left, right: action.right },
          surface: { left: surface.left, right: surface.right },
          width: button.clientWidth,
          scrollWidth: button.scrollWidth,
        }
      })
      expect(bounds.surface.left).toBeGreaterThanOrEqual(0)
      expect(bounds.surface.right).toBeLessThanOrEqual(320)
      expect(bounds.action.left).toBeGreaterThanOrEqual(bounds.surface.left)
      expect(bounds.action.right).toBeLessThanOrEqual(bounds.surface.right)
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1)
    }
    await action.click()
    expect(await changes(page)).toEqual([
      { type: 'value', value: { start: '2026-04-01', end: '2026-06-30' } },
    ])
  })
}
