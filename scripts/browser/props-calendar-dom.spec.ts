import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import { solidTextContrast } from './solid-text-contrast'
const require = createRequire(import.meta.url)
const group = (page: Page) =>
  page.locator('[data-scope="calendar"][data-part="root"]')
const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const render = (
  page: Page,
  props: Record<string, unknown>,
  options: Record<string, unknown> = {},
) =>
  page.evaluate(
    ({ props, options }) => (window as any).renderCalendarDOM(props, options),
    { props, options },
  )
const events = (page: Page, type?: string) =>
  page.evaluate(
    (type) =>
      (window as any).calendarDomEvents.filter(
        (e: any) => !type || e.type === type,
      ),
    type,
  )
test.beforeEach(async ({ page }) => {
  await page.goto(
    '/.artifacts/browser-production/scripts/browser/calendar-dom.html',
  )
  await page.waitForFunction(
    () => typeof (window as any).renderCalendarDOM === 'function',
  )
})
for (const dir of ['ltr', 'rtl'])
  for (const theme of ['light', 'dark']) {
    test(`${dir}/${theme}: native root identity, dimensions, naming and visibility update without replacing the calendar`, async ({
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
test('capture veto applies before day selection and month navigation, with live handler updates', async ({
  page,
}) => {
  const props = { defaultValue: '2026-09-12' }
  await render(page, props, { cancelClick: true, cancelKey: true })
  await day(page, '2026-09-13').click()
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await day(page, '2026-09-12').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('Enter')
  await expect(day(page, '2026-09-12')).toBeFocused()
  expect(await events(page, 'value')).toEqual([])
  expect(await events(page, 'view')).toEqual([])
  expect(await events(page, 'click-capture')).toHaveLength(2)
  await render(page, props)
  await day(page, '2026-09-13').click()
  expect(await events(page, 'value')).toEqual([
    { type: 'value', value: '2026-09-13' },
  ])
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  expect(await events(page, 'view')).toEqual([
    { type: 'view', viewDate: '2026-10-01' },
  ])
})
test('focus observers cannot replace tracking, and root ref/tabIndex support explicit group focus', async ({
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
test('native disabled fieldset blocks all activation and Calendar adds no hidden form field', async ({
  page,
}) => {
  const props = { defaultValue: '2026-09-12' }
  await render(page, props, { fieldsetDisabled: true })
  await expect(day(page, '2026-09-13')).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Next month', exact: true }),
  ).toBeDisabled()
  await day(page, '2026-09-13').evaluate((node) => node.click())
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
