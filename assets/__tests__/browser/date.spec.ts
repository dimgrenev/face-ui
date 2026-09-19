import { expect, test, type Locator, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'

test.describe('native', () => {
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
})

test.describe('values', () => {
  const { renderDate: render } = hooks<Hooks>()

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
    await open(page, 'date')
  })

  for (const surface of ['popover', 'sheet'] as const) {
    test(`${surface}: edits both clock endpoints using the keyboard and submits the actual interval`, { tag: ['@layout', '@focus'] }, async ({
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

  test('timezone conversion is shared by Calendar constraints and final selection', { tag: ['@intl'] }, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/Los_Angeles',
    })
    const page = await context.newPage()
    await open(page, 'date')
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

  for (const theme of ['light', 'dark']) {
    test(`${theme}: selected clock controls remain visually distinct without hover or focus`, { tag: ['@layout', '@css'] }, async ({
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
})

test.describe('value boundary', () => {
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
})

test.describe('actions', () => {
  const { renderDate: render } = hooks<Hooks>()
  type Props = Parameters<typeof render>[1]
  test.beforeEach(async ({ page }) => {
    await open(page, 'date')
  })
  for (const dir of ['ltr', 'rtl'])
    for (const theme of ['light', 'dark']) {
      test(`${dir}/${theme}: a narrow date range truncates its text through Text without clipping the icon or losing its value`, { tag: ['@layout', '@css', '@focus'] }, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 800 })
        await page
          .locator('html')
          .evaluate(
            (node, theme) => node.setAttribute('data-theme', theme),
            theme,
          )
        const props: Props = {
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

  test('a completed preset emits Date instants, submits civil ISO and returns focus on close', { tag: ['@intl', '@focus', '@native'] }, async ({
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

  test('a partial range preset remains a draft until the calendar completes it', { tag: ['@native'] }, async ({
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

  test('localized clear/now actions preserve native form behavior and empty clear is unavailable', { tag: ['@native'] }, async ({
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

  for (const surface of ['popover', 'sheet'] as const) {
    test(`${surface}: long localized preset actions stay inside a narrow surface`, { tag: ['@layout', '@css'] }, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      const label =
        'Последний полностью завершённый финансовый квартал с учётом локального календаря'
      const props: Props = {
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
})

test.describe('modes', () => {
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
})

test.describe('navigation', () => {
  const { renderDate } = hooks<Hooks>()
  type Props = Parameters<typeof renderDate>[1]
  const errors = new WeakMap<Page, string[]>()
  const render = (page: Page, props: Props, controlled = false, calendar = false) =>
    renderDate(page, props, controlled, 'field', calendar)
  const events = (page: Page, type = 'value') =>
    page.evaluate(
      (type) =>
        (window as any).dateEvents.filter((event: any) => event.type === type),
      type,
    )
  const formValue = (page: Page) =>
    page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('deadline'))
  test.beforeEach(async ({ page }) => {
    errors.set(page, [])
    page.on('pageerror', (error) => errors.get(page)!.push(error.message))
    await open(page, 'date')
  })
  test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

  for (const surface of ['popover', 'sheet'] as const) {
    test(`${surface}: drilldown changes the viewed calendar and preserves value until a day is picked`, { tag: ['@layout', '@focus'] }, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: surface === 'sheet' ? 375 : 1100,
        height: 800,
      })
      await render(page, {
        defaultValue: '2026-01-31',
        name: 'deadline',
        openTo: 'year',
        surface,
      })
      const trigger = page.getByRole('combobox')
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: '2025', exact: true }).click()
      await dialog.getByRole('button', { name: 'Feb', exact: true }).click()
      await expect(dialog.getByRole('grid')).toHaveAttribute(
        'aria-label',
        'February 2025',
      )
      expect(await events(page)).toEqual([])
      expect(await formValue(page)).toBe('2026-01-31')
      const day = dialog.locator('[data-date="2025-02-17"]')
      await day.focus()
      await page.keyboard.press('Enter')
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
      expect(await events(page)).toEqual([{ type: 'value', value: '2025-02-17' }])
      expect(await formValue(page)).toBe('2025-02-17')
    })
  }
  test('month range has two endpoints, remains open during selection, and submits a complete interval', { tag: ['@native'] }, async ({
    page,
  }) => {
    await render(
      page,
      {
        mode: 'month',
        selection: 'range',
        defaultValue: { start: '2026-01-01', end: '2026-06-01' },
        name: 'deadline',
        required: true,
        closeOnSelect: true,
      },
      true,
    )
    await page.getByRole('combobox').click()
    await page.getByRole('button', { name: 'Feb', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await formValue(page)).toBe(null)
    await page.getByRole('button', { name: 'Apr', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    expect(await formValue(page)).toBe('2026-02-01/2026-04-01')
    expect(await events(page)).toEqual([
      { type: 'value', value: { start: '2026-02-01', end: null } },
      { type: 'value', value: { start: '2026-02-01', end: '2026-04-01' } },
    ])
  })
  test('Calendar PageDown and Shift+PageUp preserve focus and never select a value', { tag: ['@focus'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: '2026-01-31' }, false, true)
    await page.locator('[data-date="2026-01-31"]').focus()
    await page.keyboard.press('PageDown')
    await expect(page.locator('[data-date="2026-02-28"]')).toBeFocused()
    await page.keyboard.press('Shift+PageUp')
    await expect(page.locator('[data-date="2025-02-28"]')).toBeFocused()
    expect(await events(page)).toEqual([])
    expect(await events(page, 'view')).toHaveLength(2)
    await expect(page.locator('[data-part="day"][tabindex="0"]')).toHaveCount(1)
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Reset', exact: true }),
    ).toBeFocused()
  })
  test('Calendar civil string hydration and keyboard dates remain correct in a negative-offset timezone', { tag: ['@intl'] }, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/Los_Angeles',
    })
    const page = await context.newPage()
    await open(page, 'date')
    await render(page, { defaultValue: '0042-02-10' }, false, true)
    await page.locator('[data-date="0042-02-10"]').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-date="0042-02-11"]')).toBeFocused()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => (window as any).dateEvents[0].value)).toBe(
      '0042-02-11',
    )
    await context.close()
  })
  test('RTL arrow keys follow the visible Calendar direction', { tag: ['@css', '@focus'] }, async ({
    page,
  }) => {
    await page
      .locator('html')
      .evaluate((element) => element.setAttribute('dir', 'rtl'))
    await render(page, { defaultValue: '2026-01-15' }, false, true)
    await page.locator('[data-date="2026-01-15"]').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[data-date="2026-01-16"]')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-date="2026-01-15"]')).toBeFocused()
  })

  test('clicking an adjacent-month date commits the button under the pointer exactly once', { tag: ['@pointer'] }, async ({
    page,
  }) => {
    await render(
      page,
      { defaultValue: '2026-02-15', weekStartsOn: 1 },
      false,
      true,
    )
    await page.locator('[data-date="2026-01-31"]').click()
    await expect(page.getByRole('grid')).toHaveAttribute(
      'aria-label',
      'January 2026',
    )
    expect(await events(page)).toHaveLength(1)
    expect(
      await page.evaluate(() => {
        const value = (window as any).dateEvents.find(
          (event: any) => event.type === 'value',
        ).value
        return value
      }),
    ).toBe('2026-01-31')
    expect(await events(page, 'view')).toHaveLength(1)
  })

  test('range keyboard selection of an adjacent-month day navigates only after confirmation', { tag: ['@focus'] }, async ({
    page,
  }) => {
    await render(
      page,
      { selection: 'range', defaultViewDate: '2026-02-01', weekStartsOn: 1 },
      false,
      true,
    )
    await page.locator('[data-date="2026-01-31"]').focus()
    await expect(page.getByRole('grid')).toHaveAttribute(
      'aria-label',
      'February 2026',
    )
    await page.keyboard.press('Control+ArrowRight')
    expect(await events(page)).toEqual([])
    await expect(page.locator('[data-date="2026-01-31"]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('grid')).toHaveAttribute(
      'aria-label',
      'January 2026',
    )
    await expect(page.locator('[data-date="2026-01-31"]')).toBeFocused()
    expect(await events(page)).toHaveLength(1)
    expect(await events(page, 'view')).toHaveLength(1)
  })

  test('Date popover stays inside the viewport and starts at its trigger', { tag: ['@layout'] }, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    await render(page, {
      defaultValue: '2026-01-31',
      openTo: 'year',
      surface: 'popover',
    })
    const trigger = page.getByRole('combobox')
    await trigger.click()
    await page.getByRole('button', { name: '2025', exact: true }).click()
    await page.getByRole('button', { name: 'Feb', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox(),
          anchor = await trigger.boundingBox()
        return (
          !!box &&
          !!anchor &&
          box.x >= 8 &&
          box.x + box.width <= 992 &&
          Math.abs(box.x - anchor.x) <= 1
        )
      })
      .toBe(true)
  })
})

test.describe('range availability', () => {
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
})

test.describe('labels', () => {
  const { renderDate } = hooks<Hooks>()
  type Props = Parameters<typeof renderDate>[1]
  const render = (page: Page, props: Props, calendar = false) =>
    renderDate(page, props, false, 'field', calendar)
  const changes = (page: Page) =>
    page.evaluate(() =>
      (window as any).dateEvents.filter((event: any) => event.type === 'value'),
    )
  const formValue = (page: Page) =>
    page
      .locator('#form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('deadline'))
  const dictionaries = [
    {
      locale: 'ru-RU',
      lang: 'ru',
      dir: 'ltr',
      theme: 'light',
      width: 1000,
      field: 'Срок',
      placeholder: 'Выберите дату',
      labels: {
        previousMonth: 'Предыдущий месяц',
        nextMonth: 'Следующий месяц',
        previousYear: 'Предыдущий год',
        nextYear: 'Следующий год',
        previousYearPage: 'Предыдущие 12 лет',
        nextYearPage: 'Следующие 12 лет',
        calendar: 'Календарь',
        day: 'День',
        month: 'Месяц',
        year: 'Год',
        hours: 'Час',
        minutes: 'Минута',
        start: 'Начало',
        end: 'Конец',
        rangeEndpoint: 'Граница диапазона',
        clear: 'Очистить',
        now: 'Сейчас',
        close: 'Закрыть',
      },
    },
    {
      locale: 'ar-EG',
      lang: 'ar',
      dir: 'rtl',
      theme: 'dark',
      width: 360,
      field: 'الموعد',
      placeholder: 'اختر التاريخ',
      labels: {
        previousMonth: 'الشهر السابق',
        nextMonth: 'الشهر التالي',
        previousYear: 'السنة السابقة',
        nextYear: 'السنة التالية',
        previousYearPage: 'السنوات الـ12 السابقة',
        nextYearPage: 'السنوات الـ12 التالية',
        calendar: 'التقويم',
        day: 'اليوم',
        month: 'الشهر',
        year: 'السنة',
        hours: 'الساعة',
        minutes: 'الدقيقة',
        start: 'بداية',
        end: 'نهاية',
        rangeEndpoint: 'طرف النطاق',
        clear: 'مسح',
        now: 'الآن',
        close: 'إغلاق',
      },
    },
  ]
  test.beforeEach(async ({ page }) => {
    await open(page, 'date')
  })
  for (const config of dictionaries) {
    test(`Calendar ${config.locale}: shared navigation labels, live identity and native group naming`, { tag: ['@intl', '@layout', '@focus'] }, async ({
      page,
    }) => {
      await page.setViewportSize({ width: config.width, height: 850 })
      const labels = config.labels
      const props = {
        locale: config.locale,
        dir: config.dir,
        lang: config.lang,
        'aria-label': config.field,
        defaultValue: '2026-09-12',
        labels,
      }
      await render(page, props, true)
      await expect(
        page.getByRole('group', { name: config.field, exact: true }),
      ).toBeVisible()
      const previous = page.getByRole('button', {
        name: labels.previousMonth,
        exact: true,
      })
      await previous.click()
      await expect(page.locator('[data-part="title"]')).toContainText(
        '2026'.replace(/./g, (digit) =>
          new Intl.NumberFormat(config.locale, { useGrouping: false }).format(
            Number(digit),
          ),
        ),
      )
      await page
        .getByRole('button', { name: labels.nextMonth, exact: true })
        .click()
      expect(await changes(page)).toEqual([])
      await previous.focus()
      await previous.evaluate((node) => {
        ;(window as any).savedNavigation = node
      })
      await render(
        page,
        {
          ...props,
          labels: { ...labels, previousMonth: `${labels.previousMonth} (2)` },
        },
        true,
      )
      const updated = page.getByRole('button', {
        name: `${labels.previousMonth} (2)`,
        exact: true,
      })
      await expect(updated).toBeFocused()
      expect(
        await updated.evaluate(
          (node) => node === (window as any).savedNavigation,
        ),
      ).toBe(true)
      await page.keyboard.press('Enter')
      expect(await changes(page)).toEqual([])
    })
    test(`Date ${config.locale}: every internal label reaches working controls and live translation is quiet`, { tag: ['@intl', '@layout', '@focus'] }, async ({
      page,
    }) => {
      await page.setViewportSize({ width: config.width, height: 850 })
      await page.clock.install({ time: new Date('2026-09-13T12:30:00Z') })
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme
      }, config.theme)
      const labels = config.labels
      const props: Props = {
        mode: 'datetime',
        selection: 'range',
        name: 'deadline',
        defaultValue: { start: '2026-09-12T09:35', end: '2026-09-15T10:00' },
        closeOnSelect: false,
        locale: config.locale,
        dir: config.dir,
        lang: config.lang,
        label: config.field,
        placeholder: config.placeholder,
        labels,
        surface: config.width === 360 ? 'sheet' : 'popover',
      }
      await render(page, props)
      await page.getByRole('combobox', { name: config.field }).click()
      const dialog = page.getByRole('dialog', { name: config.field, exact: true })
      await expect(dialog).toBeVisible()
      await expect(
        dialog.getByRole('group', { name: labels.calendar, exact: true }),
      ).toBeVisible()
      const button = (name: string) =>
        dialog.getByRole('button', { name, exact: true })
      await button(labels.previousMonth).click()
      await button(labels.nextMonth).click()
      const day = page.locator('[data-date="2026-09-12"]')
      await day.focus()
      await day.evaluate((node) => {
        ;(window as any).savedDay = node
      })
      await render(page, {
        ...props,
        labels: { ...labels, clear: `${labels.clear} (2)` },
      })
      await expect(day).toBeFocused()
      expect(
        await day.evaluate((node) => node === (window as any).savedDay),
      ).toBe(true)
      expect(await changes(page)).toEqual([])
      expect(await formValue(page)).toBe('2026-09-12T09:35/2026-09-15T10:00')
      await button(labels.month).click()
      await expect(
        dialog.getByRole('group', { name: labels.month, exact: true }),
      ).toBeVisible()
      await button(labels.previousYear).click()
      await button(labels.nextYear).click()
      await button(labels.year).click()
      await expect(
        dialog.getByRole('group', { name: labels.year, exact: true }),
      ).toBeVisible()
      await button(labels.previousYearPage).click()
      await button(labels.nextYearPage).click()
      await button(labels.hours).click()
      await expect(
        dialog.getByRole('group', { name: labels.hours, exact: true }),
      ).toBeVisible()
      await expect(
        dialog.getByRole('group', { name: labels.rangeEndpoint, exact: true }),
      ).toBeVisible()
      await expect(button(labels.start)).toHaveAttribute('aria-pressed', 'true')
      await button(labels.end).click()
      await expect(button(labels.end)).toHaveAttribute('aria-pressed', 'true')
      await button(labels.minutes).click()
      await expect(
        dialog.getByRole('group', { name: labels.minutes, exact: true }),
      ).toBeVisible()
      expect(await changes(page)).toEqual([])
      await button(labels.now).click()
      expect(await changes(page)).toEqual([
        {
          type: 'value',
          value: { start: '2026-09-12T09:35', end: '2026-09-13T12:30' },
        },
      ])
      await button(`${labels.clear} (2)`).click()
      expect(await formValue(page)).toBeNull()
      await expect(button(`${labels.clear} (2)`)).toBeDisabled()
      await expect(page.getByRole('combobox')).toHaveText(config.placeholder)
      await button(labels.day).click()
      if (config.width === 360) await button(labels.close).click()
      else await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole('combobox')).toBeFocused()
    })
  }
})

test.describe('locale', () => {
  const { renderDate } = hooks<Hooks>()
  type Props = Parameters<typeof renderDate>[1]

  test.use({ timezoneId: 'Pacific/Kiritimati' })

  async function render(page: Page, props: Props, calendar = false) {
    await renderDate(page, props, false, calendar ? 'inline' : 'field', calendar)
    if (!calendar && !(await page.getByRole('dialog').count()))
      await page.getByRole('combobox').click()
  }
  const changes = (page: Page) =>
    page.evaluate(() =>
      (window as any).dateEvents.filter((event: any) => event.type === 'value'),
    )
  const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
  const nativeLabel = (
    page: Page,
    locale: string,
    options: Intl.DateTimeFormatOptions,
    iso = '2026-09-12',
  ) =>
    page.evaluate(
      ({ locale, options, iso }) =>
        new Intl.DateTimeFormat(locale, {
          ...options,
          calendar: 'gregory',
          timeZone: 'UTC',
        }).format(new Date(`${iso}T12:00Z`)),
      { locale, options, iso },
    )

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime('2026-09-12T05:00:00Z')
    await open(page, 'date')
  })

  for (const locale of ['th-TH', 'en-US-u-ca-hebrew', 'fa-IR']) {
    test(`${locale}: field, title, day number and accessible label describe the same Gregorian date`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(page, { locale, value: '2026-09-12' })
      await expect(page.getByRole('combobox')).toHaveText(
        await nativeLabel(page, locale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      )
      await expect(
        page.locator('[data-scope="calendar"][data-part="title"]'),
      ).toHaveText(
        await nativeLabel(page, locale, { month: 'long', year: 'numeric' }),
      )
      await expect(day(page, '2026-09-12')).toHaveAttribute(
        'aria-label',
        await nativeLabel(page, locale, { dateStyle: 'full' }),
      )
      await expect(day(page, '2026-09-12')).toHaveText(
        await page.evaluate(
          (locale) =>
            new Intl.NumberFormat(locale, { useGrouping: false }).format(12),
          locale,
        ),
      )
      expect(await changes(page)).toEqual([])
    })
    test(`${locale}: all twelve month choices use Gregorian standalone names`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(page, { mode: 'month', locale, value: '2026-09-01' })
      const names = await page.evaluate(
        (locale) =>
          Array.from({ length: 12 }, (_, index) =>
            new Intl.DateTimeFormat(locale, {
              month: 'short',
              calendar: 'gregory',
              timeZone: 'UTC',
            }).format(new Date(Date.UTC(2026, index, 15))),
          ),
        locale,
      )
      await expect(page.locator('.uf-date__grid--month button')).toHaveText(names)
      expect(await changes(page)).toEqual([])
    })
  }

  for (const calendar of [false, true]) {
    for (const locale of ['zh-CN', 'ar-EG']) {
      test(`${calendar ? 'Calendar' : 'Date'} ${locale}: narrow weekday names are distinct and accessible names are complete`, { tag: ['@intl'] }, async ({
        page,
      }) => {
        await render(
          page,
          { locale, value: '2026-09-12', weekStartsOn: 0 },
          calendar,
        )
        const labels = await page.evaluate((locale) => {
          const days = Array.from(
            { length: 7 },
            (_, index) => new Date(Date.UTC(2026, 8, 6 + index, 12)),
          )
          return {
            narrow: days.map((date) =>
              new Intl.DateTimeFormat(locale, {
                weekday: 'narrow',
                calendar: 'gregory',
                timeZone: 'UTC',
              }).format(date),
            ),
            full: days.map((date) =>
              new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                calendar: 'gregory',
                timeZone: 'UTC',
              }).format(date),
            ),
          }
        }, locale)
        const headers = page.getByRole('columnheader')
        await expect(headers).toHaveText(labels.narrow)
        for (let index = 0; index < 7; index++)
          await expect(headers.nth(index)).toHaveAttribute(
            'aria-label',
            labels.full[index],
          )
        expect(await changes(page)).toEqual([])
      })
    }
    for (const [locale, firstDate] of [
      ['en-US', '2026-09-06'],
      ['ru-RU', '2026-09-07'],
      ['ar-EG', '2026-09-12'],
    ]) {
      test(`${calendar ? 'Calendar' : 'Date'} ${locale}: default week start controls both headers and Home`, { tag: ['@intl'] }, async ({
        page,
      }) => {
        await render(page, { locale, value: '2026-09-12' }, calendar)
        await expect(page.getByRole('columnheader').first()).toHaveAttribute(
          'aria-label',
          await nativeLabel(page, locale, { weekday: 'long' }, firstDate),
        )
        await day(page, '2026-09-12').focus()
        await page.keyboard.press('Home')
        await expect(day(page, firstDate)).toBeFocused()
        expect(await changes(page)).toEqual([])
      })
    }
    test(`${calendar ? 'Calendar' : 'Date'}: an explicit week start overrides locale and removing it restores the locale default`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      const props = { locale: 'ru-RU', value: '2026-09-12' }
      await render(page, { ...props, weekStartsOn: 0 }, calendar)
      await day(page, '2026-09-12').focus()
      await page.keyboard.press('Home')
      await expect(day(page, '2026-09-06')).toBeFocused()
      await render(page, props, calendar)
      await day(page, '2026-09-12').focus()
      await page.keyboard.press('Home')
      await expect(day(page, '2026-09-07')).toBeFocused()
      await render(page, { ...props, locale: 'en-US' }, calendar)
      await day(page, '2026-09-12').focus()
      await page.keyboard.press('Home')
      await expect(day(page, '2026-09-06')).toBeFocused()
      expect(await changes(page)).toEqual([])
    })
  }

  for (const [locale, start, end] of [
    ['en-US', '2026-09-06', '2026-09-12'],
    ['ru-RU', '2026-09-07', '2026-09-13'],
    ['ar-EG', '2026-09-12', '2026-09-18'],
  ]) {
    test(`${locale}: week selection submits the displayed regional week`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(page, {
        mode: 'week',
        locale,
        defaultValue: { start: '2026-09-12', end: null },
        name: 'schedule',
      })
      await day(page, '2026-09-12').click()
      expect(await changes(page)).toEqual([
        { type: 'value', value: { start, end } },
      ])
      expect(
        await page
          .locator('#form')
          .evaluate((form) =>
            new FormData(form as HTMLFormElement).get('schedule'),
          ),
      ).toBe(`${start}/${end}`)
    })
  }

  for (const [locale, nine, ten, thirtyFive, fiftyNine] of [
    ['ar-EG', '٠٩', '١٠', '٣٥', '٥٩'],
    ['fa-IR', '۰۹', '۱۰', '۳۵', '۵۹'],
  ]) {
    test(`${locale}: localized clock labels retain numeric keyboard navigation and ISO submission`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(page, {
        mode: 'time',
        openTo: 'hours',
        locale,
        defaultValue: '2026-09-12T09:35',
        name: 'schedule',
        closeOnSelect: false,
      })
      const choice = (name: string) =>
        page.locator('.uf-date__grid').getByRole('button', { name, exact: true })
      await expect(choice(nine)).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(choice(ten)).toBeFocused()
      expect(await changes(page)).toEqual([])
      await page.keyboard.press('Enter')
      await page.getByRole('button', { name: 'Minute', exact: true }).click()
      await page.keyboard.press('Tab')
      await expect(choice(thirtyFive)).toBeFocused()
      await page.keyboard.press('Control+End')
      await expect(choice(fiftyNine)).toBeFocused()
      await page.keyboard.press('Enter')
      expect(
        await page
          .locator('#form')
          .evaluate((form) =>
            new FormData(form as HTMLFormElement).get('schedule'),
          ),
      ).toBe('2026-09-12T10:59')
      expect(await changes(page)).toHaveLength(2)
    })
  }

  test('Persian year choices and page title use the same ungrouped Gregorian numbers', { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, { mode: 'year', locale: 'fa-IR', value: '2026-01-01' })
    const years = page.locator('.uf-date__grid--year')
    await expect(
      years.getByRole('button', { name: '۲۰۲۶', exact: true }),
    ).toBeFocused()
    await expect(
      page.getByRole('dialog').locator('[aria-live="polite"]'),
    ).toHaveText('۲۰۱۷–۲۰۲۸')
    await page.keyboard.press('PageDown')
    await expect(
      years.getByRole('button', { name: '۲۰۳۸', exact: true }),
    ).toBeFocused()
    expect(await changes(page)).toEqual([])
  })
})

test.describe('civil arithmetic', () => {
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
})

test.describe('focus', () => {
  const { renderDate: render } = hooks<Hooks>()
  type Props = Parameters<typeof render>[1]

  const button = (page: Page, name: string) =>
    page.getByRole('dialog').getByRole('button', { name, exact: true })
  const changes = (page: Page) =>
    page.evaluate(() =>
      (window as any).dateEvents.filter((event: any) => event.type === 'value'),
    )
  async function visibleFocus(node: Locator) {
    await expect(node).toBeFocused()
    await expect(node).toHaveCSS('outline-style', 'solid')
    await expect(node).toHaveCSS('outline-width', '2px')
  }

  // Match native button navigation. macOS WebKit can reserve plain Tab for text
  // controls and use Option+Tab for all controls; probe instead of assuming an OS.
  async function nativeButtonTabKey(page: Page) {
    await page.locator('#before').evaluate((before) => {
      const probe = document.createElement('button')
      probe.id = 'native-tab-probe'
      probe.textContent = 'Native tab probe'
      before.after(probe)
      ;(before as HTMLElement).focus()
    })
    await page.keyboard.press('Tab')
    return page.locator('#native-tab-probe').evaluate((probe) => {
      const key = probe === document.activeElement ? 'Tab' : 'Alt+Tab'
      probe.remove()
      return key
    })
  }

  test.beforeEach(async ({ page }) => {
    await open(page, 'date')
  })

  const grids = [
    {
      mode: 'month',
      openTo: 'month',
      value: '2026-09-01',
      start: 'Sep',
      end: 'Dec',
      first: 'Jan',
    },
    {
      mode: 'year',
      openTo: 'year',
      value: '2026-01-01',
      start: '2026',
      end: '2028',
      first: '2017',
    },
    {
      mode: 'time',
      openTo: 'hours',
      value: '2026-09-12T09:35',
      start: '09',
      end: '23',
      first: '00',
    },
    {
      mode: 'time',
      openTo: 'minutes',
      value: '2026-09-12T09:35',
      start: '35',
      end: '59',
      first: '00',
    },
  ] as const
  for (const theme of ['light', 'dark']) {
    for (const grid of grids) {
      test(`${theme} ${grid.openTo}: modifier navigation after pointer selection has a visible focus without selecting`, { tag: ['@focus', '@css'] }, async ({
        page,
      }) => {
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        )
        await render(page, {
          mode: grid.mode,
          openTo: grid.openTo,
          defaultValue: grid.value,
          closeOnSelect: false,
        })
        await page.getByRole('combobox').click()
        await button(page, grid.start).click()
        const before = await changes(page)
        const size = await button(page, grid.end).boundingBox()
        await page.keyboard.press('Control+End')
        await visibleFocus(button(page, grid.end))
        expect(await button(page, grid.end).boundingBox()).toEqual(size)
        expect(
          await button(page, grid.end).evaluate(
            (node) => getComputedStyle(node).outlineColor,
          ),
        ).toBe(
          await button(page, grid.end).evaluate(
            (node) => getComputedStyle(node).color,
          ),
        )
        await page.keyboard.press('Control+End')
        await visibleFocus(button(page, grid.end))
        await page.keyboard.press('Control+Home')
        await visibleFocus(button(page, grid.first))
        expect(await changes(page)).toEqual(before)
      })
    }
    test(`${theme}: a fully unavailable choice grid retains a named visible keyboard entry`, { tag: ['@focus', '@css'] }, async ({
      page,
    }) => {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      await render(page, {
        mode: 'time',
        openTo: 'minutes',
        defaultValue: '2026-09-12T09:35',
        disabledTime: { minutes: Array.from({ length: 60 }, (_, i) => i) },
      })
      const tabKey = await nativeButtonTabKey(page)
      await page.getByRole('combobox').focus()
      await page.keyboard.press('Enter')
      const grid = page.getByRole('group', { name: 'Minute', exact: true })
      await visibleFocus(grid)
      await expect(grid.locator('button:enabled')).toHaveCount(0)
      await page.keyboard.press(tabKey)
      await expect(button(page, 'Clear')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('combobox')).toBeFocused()
      expect(await changes(page)).toEqual([])
    })
  }

  test('keyboard indication survives changed constraints and resets on pointer use and leaving the grid', { tag: ['@focus', '@css'] }, async ({
    page,
  }) => {
    const props: Props = {
      mode: 'time',
      openTo: 'minutes',
      defaultValue: '2026-09-12T09:35',
      closeOnSelect: false,
    }
    await render(page, props)
    const tabKey = await nativeButtonTabKey(page)
    await page.getByRole('combobox').click()
    await button(page, '35').click()
    await page.keyboard.press('Control+End')
    await visibleFocus(button(page, '59'))
    await render(page, { ...props, disabledTime: { minutes: [59] } })
    await visibleFocus(button(page, '00'))
    await button(page, '35').click()
    const choices = page.getByRole('dialog')
    await expect(choices).not.toHaveAttribute('data-keyboard-focus')
    if (
      !(await button(page, '35').evaluate((node) =>
        node.matches(':focus-visible'),
      ))
    )
      await expect(button(page, '35')).toHaveCSS('outline-style', 'none')
    await page.keyboard.press('Control+a')
    await expect(choices).not.toHaveAttribute('data-keyboard-focus')
    await expect(button(page, '35')).toBeFocused()
    await page.keyboard.press('Control+End')
    await visibleFocus(button(page, '58'))
    await page.keyboard.press(tabKey)
    await visibleFocus(button(page, 'Clear'))
    await page.keyboard.press(`Shift+${tabKey}`)
    await visibleFocus(button(page, '58'))
    await page.keyboard.press('Escape')
    await visibleFocus(page.getByRole('combobox'))
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-keyboard-focus]')).toHaveCount(0)
  })

  test('period paging retains the visible keyboard position without committing', { tag: ['@focus', '@css'] }, async ({
    page,
  }) => {
    await render(page, {
      mode: 'year',
      defaultValue: '2026-01-01',
      closeOnSelect: false,
    })
    await page.getByRole('combobox').click()
    await button(page, '2026').click()
    await page.keyboard.press('Control+End')
    await visibleFocus(button(page, '2028'))
    await page.keyboard.press('PageDown')
    await visibleFocus(button(page, '2040'))
    await page.keyboard.press('PageUp')
    await visibleFocus(button(page, '2028'))
    expect(await changes(page)).toEqual([])
  })

  test('explicit keyboard focus remains visible with forced colors', { tag: ['@forced-colors', '@css', '@focus'] }, async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true)
    await render(page, {
      mode: 'time',
      openTo: 'minutes',
      defaultValue: '2026-09-12T09:35',
      closeOnSelect: false,
    })
    await page.getByRole('combobox').click()
    await button(page, '35').click()
    await page.keyboard.press('Control+End')
    await visibleFocus(button(page, '59'))
  })

  for (const entry of [
    { mode: 'date', openTo: 'day' },
    ...grids.map(({ mode, openTo }) => ({ mode, openTo })),
    {
      mode: 'time',
      openTo: 'minutes',
      disabledTime: { minutes: Array.from({ length: 60 }, (_, i) => i) },
    },
  ] as const) {
    test(`${entry.openTo}${'disabledTime' in entry ? ' unavailable' : ''}: keyboard reopening after pointer use shows the initial focus`, { tag: ['@focus', '@css'] }, async ({
      page,
    }) => {
      await render(page, {
        ...entry,
        defaultValue: '2026-09-12T09:35',
        closeOnSelect: false,
      })
      await page.getByRole('combobox').click()
      const initialFocus = () =>
        page.getByRole('dialog').locator('[tabindex="0"]')
      await expect(initialFocus()).toBeFocused()
      for (const key of ['Enter', 'Space', 'ArrowDown']) {
        await page.keyboard.press('Escape')
        await visibleFocus(page.getByRole('combobox'))
        await page.keyboard.press(key)
        await visibleFocus(initialFocus())
      }
      expect(await changes(page)).toEqual([])
    })
  }

  for (const change of [
    'remove-preset',
    'disable-preset',
    'hide-now',
    'hide-clear',
    'clear-value',
  ]) {
    test(`Date recovers focus after ${change} without another key press`, { tag: ['@focus', '@react'] }, async ({
      page,
    }) => {
      const props = {
        open: true,
        value: '2026-09-12',
        presets: [{ id: 'release', label: 'Release', value: '2026-09-13' }],
      }
      await render(page, props)
      const name =
        change === 'hide-now'
          ? 'Now'
          : change === 'hide-clear' || change === 'clear-value'
            ? 'Clear'
            : 'Release'
      await page.getByRole('button', { name, exact: true }).focus()
      const update =
        change === 'remove-preset'
          ? { presets: [] }
          : change === 'disable-preset'
            ? { min: '2026-09-14' }
            : change === 'hide-now'
              ? { showNow: false }
              : change === 'hide-clear'
                ? { clearable: false }
                : { value: null }
      await render(page, { ...props, ...update })
      await expect
        .poll(() =>
          page.getByRole('dialog').evaluate((dialog) => {
            const active = document.activeElement
            return (
              !!active && dialog.contains(active) && !active.matches(':disabled')
            )
          }),
        )
        .toBe(true)
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  }
})
