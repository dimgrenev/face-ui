import { expect, test, type Page } from './test'
import { hooks, open, solidTextContrast } from './helpers'
import type { Hooks as CalendarHooks } from './fixtures/calendar.fixture'
import type { Hooks as DateHooks } from './fixtures/date.fixture'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test.describe('DOM', () => {
  const group = (page: Page) =>
    page.locator('[data-scope="calendar"][data-part="root"]')
  const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
  const { renderCalendarDOM: render } = hooks<CalendarHooks>()
  const events = (page: Page, type?: string) =>
    page.evaluate(
      (type) =>
        (window as any).calendarDomEvents.filter(
          (e: any) => !type || e.type === type,
        ),
      type,
    )
  test.beforeEach(async ({ page }) => {
    await open(page, 'calendar')
  })
  for (const dir of ['ltr', 'rtl'])
    for (const theme of ['light', 'dark']) {
      test(`${dir}/${theme}: native root identity, dimensions, naming and visibility update without replacing the calendar`, { tag: ['@layout', '@css', '@a11y', '@focus'] }, async ({
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
          id: 'release-calendar',
          className: 'custom-calendar',
          dir,
          lang: 'en-GB',
          title: 'Choose release days',
          style: { width: 280 },
          defaultValue: '2026-09-12',
          'aria-label': 'Release schedule',
          'aria-describedby': 'external-help',
          'data-owner': 'release',
        }
        await render(page, props)
        await expect(group(page)).toHaveAttribute('id', 'release-calendar')
        await expect(group(page)).toHaveClass(/custom-calendar/)
        await expect(group(page)).toHaveCSS('width', '280px')
        await expect(group(page)).toHaveCSS('direction', dir)
        await expect(group(page)).toHaveAttribute('lang', 'en-GB')
        await expect(group(page)).toHaveAttribute('title', 'Choose release days')
        await expect(group(page)).toHaveAttribute('data-owner', 'release')
        await expect(group(page)).toHaveAccessibleName('Release schedule')
        await expect(group(page)).toHaveAccessibleDescription(
          'Only available days can be selected.',
        )
        await expect(page.getByRole('grid')).toHaveAccessibleName(
          'September 2026',
        )
        expect(
          await group(page).evaluate(
            (node) => node === (window as any).calendarRoot,
          ),
        ).toBe(true)
        await day(page, '2026-09-12').focus()
        await render(
          page,
          {
            ...props,
            style: { width: 300 },
            'aria-labelledby': 'external-label',
          },
          { label: 'Deployment window' },
        )
        await expect(group(page)).toHaveAccessibleName('Deployment window')
        await expect(day(page, '2026-09-12')).toBeFocused()
        await expect(group(page)).toHaveCSS('width', '300px')
        await page.keyboard.press('ArrowRight')
        await expect(
          day(page, dir === 'rtl' ? '2026-09-11' : '2026-09-13'),
        ).toBeFocused()
        await render(page, { ...props, hidden: true })
        await expect(group(page)).toBeHidden()
        await expect(page.getByRole('grid')).toHaveCount(0)
        await page.locator('#before').focus()
        await page.keyboard.press('Tab')
        await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused()
        await render(page, props)
        await expect(group(page)).toBeVisible()
        expect(
          await day(page, '2026-09-14')
            .locator('.uf-button__label')
            .evaluate(solidTextContrast),
        ).toBeGreaterThanOrEqual(4.5)
        await expect(day(page, '2026-09-12')).toHaveAttribute(
          'data-selected',
          'true',
        )
        expect(await events(page, 'value')).toEqual([])
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
        expect(
          await page.evaluate(async () =>
            (
              await (window as any).axe.run(document, {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                },
              })
            ).violations.map((v: any) => v.id),
          ),
        ).toEqual([])
      })
    }
  test('focus observers cannot replace tracking, and root ref/tabIndex support explicit group focus', { tag: ['@focus'] }, async ({
    page,
  }) => {
    const props = { defaultValue: '2026-09-30', tabIndex: -1 }
    await render(page, props, { preventFocus: true })
    await page.evaluate(() => (window as any).calendarRoot.focus())
    await expect(group(page)).toBeFocused()
    await day(page, '2026-09-30').focus()
    await page.keyboard.press('ArrowRight')
    await expect(day(page, '2026-10-01')).toBeFocused()
    await page.locator('#after').focus()
    await render(
      page,
      { ...props, viewDate: '2026-11-01' },
      { preventFocus: true },
    )
    await expect(page.locator('#after')).toBeFocused()
    for (const name of [
      'focus',
      'focus-capture',
      'blur',
      'blur-capture',
      'key',
    ]) {
      const recorded = await events(page, name)
      expect(recorded.length).toBeGreaterThan(0)
      expect(recorded.every((event: any) => event.target === 'root')).toBe(true)
    }
    expect(await events(page, 'value')).toEqual([])
  })
  test('native disabled fieldset blocks all activation and Calendar adds no hidden form field', { tag: ['@native', '@focus'] }, async ({
    page,
  }) => {
    const props = { defaultValue: '2026-09-12' }
    await render(page, props, { fieldsetDisabled: true })
    await expect(day(page, '2026-09-13')).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Next month', exact: true }),
    ).toBeDisabled()
    await day(page, '2026-09-13').evaluate((node: HTMLElement) => node.click())
    expect(await events(page, 'value')).toEqual([])
    expect(
      await page
        .locator('#form')
        .evaluate((form) => [...new FormData(form as HTMLFormElement)]),
    ).toEqual([])
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused()
    await render(page, props)
    await day(page, '2026-09-13').focus()
    await page.keyboard.press('Enter')
    expect(await events(page, 'value')).toEqual([
      { type: 'value', value: '2026-09-13' },
    ])
  })
})

test.describe('interaction', () => {
  const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
  const group = (page: Page) =>
    page.locator('[data-scope="calendar"][data-part="root"]')
  const { renderCalendarDOM: render } = hooks<CalendarHooks>()
  const events = (page: Page, type: string) =>
    page.evaluate(
      (type) =>
        (window as any).calendarDomEvents.filter(
          (event: any) => event.type === type,
        ),
      type,
    )
  const initial = (selection: string) =>
    selection === 'single' ? '2026-09-12' : { start: '2026-09-12', end: null }
  test.beforeEach(async ({ page }) => {
    await open(page, 'calendar')
  })
  for (const selection of ['single', 'range'] as const) {
    for (const [dir, theme] of [
      ['ltr', 'light'],
      ['rtl', 'dark'],
    ]) {
      test(`readOnly ${selection} ${dir}/${theme}: browse without changing the value or dimming available dates`, { tag: ['@a11y', '@focus', '@layout'] }, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 800 })
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme
        }, theme)
        const props = {
          selection,
          defaultValue: initial(selection),
          readOnly: true,
          dir,
        }
        await render(page, props)
        await expect(page.getByRole('grid')).toHaveAttribute(
          'aria-readonly',
          'true',
        )
        // Force bypasses Playwright's ARIA actionability check; the browser still
        // receives a real pointer sequence on the focusable read-only day button.
        await day(page, '2026-09-13').click({ force: true })
        await day(page, '2026-09-12').focus()
        await page.keyboard.press(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft')
        await expect(day(page, '2026-09-13')).toBeFocused()
        await page.keyboard.press('Enter')
        await page.keyboard.press('Space')
        expect(await events(page, 'value')).toEqual([])
        await expect(
          day(page, '2026-09-12').locator('xpath=ancestor::td[1]'),
        ).toHaveAttribute('aria-selected', 'true')
        expect(
          await day(page, '2026-09-13').evaluate(
            (node) => (node as HTMLButtonElement).disabled,
          ),
        ).toBe(false)
        await expect(day(page, '2026-09-13')).toHaveAttribute(
          'aria-disabled',
          'true',
        )
        await expect(day(page, '2026-09-13')).not.toHaveAttribute('data-disabled')
        expect(
          await day(page, '2026-09-13')
            .locator('.uf-button__label')
            .evaluate(solidTextContrast),
        ).toBeGreaterThanOrEqual(4.5)
        await page.keyboard.press('PageDown')
        await expect(day(page, '2026-10-13')).toBeFocused()
        expect(await events(page, 'view')).toEqual([
          { type: 'view', viewDate: '2026-10-01' },
        ])
        await page
          .getByRole('button', { name: 'Previous month', exact: true })
          .click()
        await expect(page.getByRole('grid')).toHaveAccessibleName(
          'September 2026',
        )
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
        expect(
          await page.evaluate(async () =>
            (
              await (window as any).axe.run(document, {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                },
              })
            ).violations.map((item: any) => item.id),
          ),
        ).toEqual([])
        await render(page, { ...props, readOnly: false })
        await day(page, '2026-09-14').click()
        expect(await events(page, 'value')).toEqual([
          {
            type: 'value',
            value:
              selection === 'single'
                ? '2026-09-14'
                : { start: '2026-09-12', end: '2026-09-14' },
          },
        ])
      })
    }
    test(`disabled ${selection}: native Tab skips every control and live re-enabling preserves selection and outside focus`, { tag: ['@css', '@focus'] }, async ({
      page,
    }) => {
      const props = {
        selection,
        defaultValue: initial(selection),
        disabled: true,
        readOnly: true,
        style: { '--uf-color-disabled-opacity': '0.5' },
      }
      await render(page, props)
      await expect(group(page)).toHaveAttribute('aria-disabled', 'true')
      const opacity = await group(page).evaluate((root) => {
        const effective = (node: Element | null) => {
          let value = 1
          while (node && root.contains(node)) {
            value *= Number(getComputedStyle(node).opacity)
            node = node.parentElement
          }
          return value
        }
        return {
          token: Number(
            getComputedStyle(root).getPropertyValue(
              '--uf-color-disabled-opacity',
            ),
          ),
          day: effective(root.querySelector('[data-date="2026-09-13"]')),
          navigation: effective(root.querySelector('[data-part="nextButton"]')),
          title: effective(root.querySelector('[data-part="title"]')),
        }
      })
      expect(opacity.token).toBe(0.5)
      for (const part of [opacity.day, opacity.navigation, opacity.title])
        expect(part).toBeCloseTo(opacity.token, 5)
      expect(
        await group(page)
          .locator('button')
          .evaluateAll((nodes) =>
            nodes.every((node) => (node as HTMLButtonElement).disabled),
          ),
      ).toBe(true)
      await day(page, '2026-09-13').evaluate((node: HTMLElement) => node.click())
      await page.locator('#before').focus()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused()
      expect(await events(page, 'value')).toEqual([])
      expect(await events(page, 'view')).toEqual([])
      await page.locator('#after').focus()
      await render(page, { ...props, disabled: false, viewDate: '2026-10-01' })
      await expect(page.locator('#after')).toBeFocused()
      await expect(page.getByRole('grid')).toHaveAccessibleName('October 2026')
      await day(page, '2026-10-13').focus()
      await page.keyboard.press('Enter')
      expect(await events(page, 'value')).toEqual([])
      await render(page, {
        ...props,
        disabled: false,
        readOnly: false,
        viewDate: '2026-09-01',
      })
      await day(page, '2026-09-15').click()
      expect(await events(page, 'value')).toEqual([
        {
          type: 'value',
          value:
            selection === 'single'
              ? '2026-09-15'
              : { start: '2026-09-12', end: '2026-09-15' },
        },
      ])
    })
  }
})

test.describe('civil', () => {
  const { renderDate: render } = hooks<DateHooks>()

  test.use({ timezoneId: 'America/Los_Angeles' })

  const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
  const today = (page: Page) => page.locator('[data-date][data-today]')
  const changes = (page: Page) =>
    page.evaluate(() =>
      (window as any).dateEvents.filter((event: any) => event.type === 'value'),
    )

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime('2026-09-12T01:30:00Z')
    await open(page, 'date')
  })

  for (const [timezone, date] of [
    ['UTC', '2026-09-12'],
    ['America/Los_Angeles', '2026-09-11'],
    ['Pacific/Kiritimati', '2026-09-12'],
  ]) {
    test(`${timezone}: an empty picker starts on its current civil day without selecting`, { tag: ['@intl', '@focus', '@css'] }, async ({
      page,
    }) => {
      await render(page, { timezone, name: 'deadline' })
      const submitted = () =>
        page
          .locator('#form')
          .evaluate((form) =>
            new FormData(form as HTMLFormElement).get('deadline'),
          )
      await expect.poll(submitted).toBeNull()
      await page.getByRole('combobox').focus()
      await page.keyboard.press('Enter')
      await expect(day(page, date)).toBeFocused()
      await expect(day(page, date)).toHaveCSS('outline-style', 'solid')
      await expect(today(page)).toHaveAttribute('data-date', date)
      await expect(today(page)).toHaveAttribute('aria-current', 'date')
      expect(
        await today(page)
          .locator('.uf-button__label')
          .evaluate((node) => Number(getComputedStyle(node).fontWeight)),
      ).toBeGreaterThan(
        await day(page, '2026-09-20')
          .locator('.uf-button__label')
          .evaluate((node) => Number(getComputedStyle(node).fontWeight)),
      )
      expect(await changes(page)).toEqual([])
      expect(await submitted()).toBeNull()
    })
  }

  test('the today marker follows timezone changes across a year boundary without selecting', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await page.clock.setFixedTime('2026-12-31T23:30:00Z')
    const props = { defaultValue: '2027-01-10', closeOnSelect: false }
    await render(page, { ...props, timezone: 'UTC' })
    await page.getByRole('combobox').click()
    await expect(today(page)).toHaveAttribute('data-date', '2026-12-31')
    await render(page, { ...props, timezone: 'Pacific/Kiritimati' })
    await expect(today(page)).toHaveAttribute('data-date', '2027-01-01')
    await expect(day(page, '2027-01-10')).toBeFocused()
    expect(await changes(page)).toEqual([])
  })

  test('an existing selection remains the initial keyboard position instead of today', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: '2026-09-20', timezone: 'UTC' })
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(day(page, '2026-09-20')).toBeFocused()
    await expect(today(page)).toHaveAttribute('data-date', '2026-09-12')
    await expect(page.locator('[data-date][tabindex="0"]')).toHaveCount(1)
    expect(await changes(page)).toEqual([])
  })

  test('an inline Calendar starts its single tab stop on browser-local today', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await render(page, {}, false, 'inline', true)
    await expect(page.locator('[data-date][tabindex="0"]')).toHaveCount(1)
    await expect(day(page, '2026-09-11')).toHaveAttribute('tabindex', '0')
    await expect(today(page)).toHaveAttribute('data-date', '2026-09-11')
    expect(await changes(page)).toEqual([])
  })

  test('an unavailable current day remains a spatial entry and cannot be selected', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await render(page, {
      timezone: 'UTC',
      disabledDates: ['2026-09-12'],
      closeOnSelect: false,
    })
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(day(page, '2026-09-12')).toBeFocused()
    await expect(day(page, '2026-09-12')).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Enter')
    expect(await changes(page)).toEqual([])
    await page.keyboard.press('ArrowRight')
    await expect(day(page, '2026-09-13')).toBeFocused()
    expect(await changes(page)).toEqual([])
    await page.keyboard.press('Enter')
    expect(await changes(page)).toEqual([{ type: 'value', value: '2026-09-13' }])
  })

  for (const [timezone, date] of [
    ['UTC', '2026-12-31'],
    ['Pacific/Kiritimati', '2027-01-01'],
  ]) {
    test(`${timezone}: empty initial focus respects the current year boundary`, { tag: ['@intl', '@focus'] }, async ({
      page,
    }) => {
      await page.clock.setFixedTime('2026-12-31T23:30:00Z')
      await render(page, { timezone })
      await page.getByRole('combobox').focus()
      await page.keyboard.press('Enter')
      await expect(day(page, date)).toBeFocused()
      await expect(today(page)).toHaveAttribute('data-date', date)
      expect(await changes(page)).toEqual([])
    })
  }

  test('navigation after midnight refreshes today without moving selection', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    await page.clock.setFixedTime('2026-09-12T23:59:00Z')
    await render(page, { timezone: 'UTC', defaultValue: '2026-09-20' })
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(today(page)).toHaveAttribute('data-date', '2026-09-12')
    await page.clock.setFixedTime('2026-09-13T00:01:00Z')
    await page.keyboard.press('ArrowRight')
    await expect(day(page, '2026-09-21')).toBeFocused()
    await expect(today(page)).toHaveAttribute('data-date', '2026-09-13')
    await expect(day(page, '2026-09-20')).toHaveAttribute('data-selected', 'true')
    expect(await changes(page)).toEqual([])
  })

  test('a completely unavailable month still permits spatial focus but no activation', { tag: ['@intl', '@focus'] }, async ({
    page,
  }) => {
    // Empty bounded pickers open in their permitted month. Keep September
    // displayed and make every day unavailable to exercise spatial focus.
    await render(page, {
      timezone: 'UTC',
      disabledDates: Array.from(
        { length: 30 },
        (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`,
      ),
    })
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    await expect(day(page, '2026-09-12')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day(page, '2026-09-13')).toBeFocused()
    await expect(day(page, '2026-09-13')).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await changes(page)).toEqual([])
  })
})
