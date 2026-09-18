import { expect, test, type Page } from '@playwright/test'

const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate(
    (props) =>
      (window as any).renderDate({
        name: 'deadline',
        format: 'yyyy-MM-dd HH:mm',
        ...props,
      }),
    props,
  )
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
const nativeChange = (page: Page, candidate: string) =>
  page.locator('select[name="deadline"]').evaluate((select, candidate) => {
    const control = select as HTMLSelectElement
    control.add(new Option(candidate, candidate))
    control.value = candidate
    control.dispatchEvent(new Event('change', { bubbles: true }))
  }, candidate)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime('2026-09-12T12:00Z')
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})

test('accepts a real Date from an iframe as an instant in the owning timezone', async ({
  page,
}) => {
  const foreign = await page.evaluate(() => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const FrameDate = (frame.contentWindow as any).Date
    const value = new FrameDate('2026-09-11T23:30Z')
    const foreign = !(value instanceof Date)
    ;(window as any).renderDate({
      name: 'deadline',
      value,
      timezone: 'Asia/Tokyo',
    })
    frame.remove()
    return foreign
  })
  expect(foreign).toBe(true)
  expect(await submitted(page)).toBe('2026-09-12')
  await trigger(page).click()
  await expect(day(page, '2026-09-12')).toBeFocused()
  expect(await events(page)).toEqual([])
})

for (const timezoneId of [
  'Pacific/Kiritimati',
  'America/Los_Angeles',
  'Pacific/Apia',
]) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId })
    test('civil values and explicit instants keep their own meaning through mode and timezone updates', async ({
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
    test('malformed props fail explicitly instead of shifting dates or removing constraints', async ({
      page,
    }) => {
      for (const [props, prop] of [
        [{ value: ' 2026-09-12 ' }, 'value'],
        [{ value: '09/12/2026' }, 'value'],
        [{ mode: 'week', value: '2026-09-12' }, 'value'],
        [{ min: '2026-02-30' }, 'min'],
        [{ disabledDates: ['2026-02-30'] }, 'disabledDates[0]'],
        [{ disabledTime: { hours: [24] } }, 'disabledTime.hours'],
      ] as const) {
        await page.evaluate(
          (props) => (window as any).renderDateValidation(props),
          props,
        )
        await expect(
          page.locator('[data-date-error="RangeError"]'),
        ).toContainText(prop)
      }
    })
  })
}

test('uncontrolled precision changes discard obsolete clocks and reset uses the current mode', async ({
  page,
}) => {
  const props = {
    defaultValue: '2026-09-12T09:35',
    mode: 'datetime',
    closeOnSelect: false,
  }
  await render(page, props)
  await trigger(page).click()
  await render(page, { mode: 'date', closeOnSelect: false })
  expect(await submitted(page)).toBe('2026-09-12')
  await day(page, '2026-09-13').click()
  expect(await submitted(page)).toBe('2026-09-13')
  await page
    .locator('#form')
    .evaluate((form) => (form as HTMLFormElement).reset())
  expect(await submitted(page)).toBe('2026-09-12')
  // The native form resets before the deferred composite-control reset.
  // Wait for the selected day before changing the mode for the next action.
  await expect(
    day(page, '2026-09-12').locator('xpath=ancestor::td[1]'),
  ).toHaveAttribute('aria-selected', 'true')
  await render(page, { mode: 'time' })
  expect(await submitted(page)).toBe('2026-09-12T00:00')
  await expect(
    page
      .getByRole('group', { name: 'Hour', exact: true })
      .getByRole('button', { name: '00', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(await events(page)).toEqual([{ type: 'value', value: '2026-09-13' }])
})

test('selection transitions preserve the known date and cannot resurrect a discarded range end', async ({
  page,
}) => {
  await render(page, { defaultValue: '2026-09-12', closeOnSelect: false })
  await trigger(page).click()
  await day(page, '2026-09-13').click()
  await render(page, { selection: 'range', closeOnSelect: false })
  expect(await submitted(page)).toBe(null)
  await day(page, '2026-09-14').click()
  expect(await submitted(page)).toBe('2026-09-13/2026-09-14')
  await render(page, { selection: 'single', closeOnSelect: false })
  expect(await submitted(page)).toBe('2026-09-13')
  await render(page, { selection: 'range', closeOnSelect: false })
  await day(page, '2026-09-15').click()
  expect(await submitted(page)).toBe('2026-09-13/2026-09-15')
  expect(await events(page)).toHaveLength(3)
})

test('week drafts are incomplete form values until a whole week is selected', async ({
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

test('controlled defaults are ignored and releasing ownership retains the accepted value', async ({
  page,
}) => {
  await render(page, { value: '2026-09-12', defaultValue: 'ignored' })
  await render(page, { value: '2026-09-13', defaultValue: 'ignored' })
  await render(page, { defaultValue: 'ignored', required: true })
  expect(await submitted(page)).toBe('2026-09-13')
  expect(await valid(page)).toBe(true)
  await page
    .locator('#form')
    .evaluate((form) => (form as HTMLFormElement).reset())
  expect(await submitted(page)).toBe(null)
  expect(await valid(page)).toBe(false)
  expect(await events(page)).toEqual([])
})

test('a rejected native candidate cannot leak into FormData or truncate an interval', async ({
  page,
}) => {
  await render(page, {
    defaultValue: '2026-09-12',
    disabledDates: ['2026-09-14'],
  })
  for (const candidate of [' 2026-09-12 ', '2026-09-14']) {
    await nativeChange(page, candidate)
    expect(await submitted(page)).toBe('2026-09-12')
    expect(await events(page)).toEqual([])
  }
  await render(page, {
    selection: 'range',
    value: { start: '2026-09-12', end: '2026-09-13' },
  })
  await nativeChange(page, '2026-09-14/2026-09-15/ignored')
  expect(await submitted(page)).toBe('2026-09-12/2026-09-13')
  expect(await events(page)).toEqual([])
})

test('valueFormat=date emits both real instants while forms retain civil ISO minutes across DST', async ({
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
