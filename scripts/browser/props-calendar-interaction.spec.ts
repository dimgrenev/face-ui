import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { solidTextContrast } from './solid-text-contrast'
const require = createRequire(import.meta.url)
const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const group = (page: Page) =>
  page.locator('[data-scope="calendar"][data-part="root"]')
const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderCalendarDOM(props), props)
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
  await page.goto(
    '/.artifacts/browser-production/scripts/browser/calendar-dom.html',
  )
  await page.waitForFunction(
    () => typeof (window as any).renderCalendarDOM === 'function',
  )
})
for (const selection of ['single', 'range']) {
  for (const [dir, theme] of [
    ['ltr', 'light'],
    ['rtl', 'dark'],
  ]) {
    test(`readOnly ${selection} ${dir}/${theme}: browse without changing the value or dimming available dates`, async ({
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
  test(`disabled ${selection}: native Tab skips every control and live re-enabling preserves selection and outside focus`, async ({
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
    await day(page, '2026-09-13').evaluate((node) => node.click())
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
test('live readOnly and disabled changes preserve accepted controlled values and constraints', async ({
  page,
}) => {
  const props = {
    value: '2026-09-12',
    min: '2026-09-10',
    max: '2026-09-20',
    disabledDates: ['2026-09-15'],
  }
  await render(page, props)
  await day(page, '2026-09-12').focus()
  await render(page, { ...props, readOnly: true })
  await expect(day(page, '2026-09-12')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  expect(await events(page, 'value')).toEqual([])
  await render(page, { ...props, disabled: true, value: '2026-09-14' })
  await page.locator('#after').focus()
  await render(page, { ...props, value: '2026-09-14' })
  await expect(page.locator('#after')).toBeFocused()
  for (const iso of ['2026-09-09', '2026-09-15', '2026-09-21']) {
    await day(page, iso).focus()
    await page.keyboard.press('Enter')
    await expect(day(page, iso)).toHaveAttribute('aria-disabled', 'true')
  }
  expect(await events(page, 'value')).toEqual([])
  await day(page, '2026-09-16').click()
  expect(await events(page, 'value')).toEqual([
    { type: 'value', value: '2026-09-16' },
  ])
  await expect(
    day(page, '2026-09-14').locator('xpath=ancestor::td[1]'),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    day(page, '2026-09-16').locator('xpath=ancestor::td[1]'),
  ).toHaveAttribute('aria-selected', 'false')
})
