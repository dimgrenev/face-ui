import { expect, test, type Page } from './test'
import { hooks, open, solidTextContrast } from './helpers'
import type { Hooks } from './fixtures/calendar.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const group = (page: Page) =>
  page.locator('[data-scope="calendar"][data-part="root"]')
const { renderCalendarDOM: render } = hooks<Hooks>()
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
