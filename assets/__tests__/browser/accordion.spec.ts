import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/accordion.fixture'
import axe from 'axe-core'
const { renderAccordion: render } = hooks<Hooks>()
const first = (page: Page) =>
  page.getByRole('button', { name: 'First section', exact: true })
const last = (page: Page) =>
  page.getByRole('button', { name: 'Last section', exact: true })
const root = (page: Page) =>
  page.locator('#form > [data-scope="accordion"][data-part="root"]')
const events = (page: Page) =>
  page.evaluate(() => (window as any).accordionEvents)
test.beforeEach(async ({ page }) => {
  await open(page, 'accordion')
})

test('keyboard, Tab, disabled skip, cancellation, focus ring and membrane use one native activation', { tag: ['@focus', '@css', '@pointer'] }, async ({
  page,
}) => {
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(first(page)).toBeFocused()
  expect(
    await first(page).evaluate((node) => getComputedStyle(node).outlineStyle),
  ).not.toBe('none')
  // APG accordion: every enabled trigger is a Tab stop; arrows wrap past the disabled one.
  await page.keyboard.press('Tab')
  await expect(last(page)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(first(page)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(last(page)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(first(page)).toBeFocused()
  await page.keyboard.press('End')
  await expect(last(page)).toBeFocused()
  await page.keyboard.press('Home')
  await expect(first(page)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(last(page)).toBeFocused()
  await page.keyboard.press('Home')
  await page.keyboard.press('Space')
  await expect(first(page)).toHaveAttribute('aria-expanded', 'true')
  expect(await events(page)).toEqual([{ expanded: ['first'] }])
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'Panel input' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(last(page)).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await events(page)).toEqual([
    { expanded: ['first'] },
    { expanded: ['first', 'last'] },
  ])
  await render(page, {}, { cancelClick: true, cancelKey: true })
  await first(page).focus()
  await page.keyboard.press('End')
  await expect(first(page)).toBeFocused()
  await first(page).click()
  expect(await events(page)).toHaveLength(2)
  await render(page)
  const membrane = first(page).locator('..')
  await membrane.click({ position: { x: 1, y: 1 } })
  await expect(first(page)).toBeFocused()
  expect(await events(page)).toHaveLength(3)
  await expect(first(page)).toHaveAttribute('aria-expanded', 'false')
})

test('focused section removal and disabling recover focus without changing expansion or stealing it later', { tag: ['@focus'] }, async ({
  page,
}) => {
  await first(page).focus()
  await render(page, {
    items: [{ value: 'last', label: 'Last section', content: 'Remaining' }],
  })
  await expect(last(page)).toBeFocused()
  await render(page, {
    items: [
      { value: 'first', label: 'First section', content: 'First' },
      { value: 'last', label: 'Last section', content: 'Last', disabled: true },
    ],
  })
  await expect(first(page)).toBeFocused()
  expect(await events(page)).toEqual([])
  await page.locator('#after').focus()
  await render(page, {
    items: [{ value: 'last', label: 'Last section', content: 'Remaining' }],
  })
  await expect(page.locator('#after')).toBeFocused()
  await last(page).focus()
  await render(page, { items: [] })
  await page.locator('#after').focus()
  await render(page)
  await expect(page.locator('#after')).toBeFocused()
})

test('keyed panel content retains focus, node identity and form input across reorders and collapse', { tag: ['@native', '@react'] }, async ({
  page,
}) => {
  await render(
    page,
    { defaultExpanded: ['first'] },
    { scenario: 'keys', reset: true },
  )
  const input = page.getByRole('textbox', { name: 'First input' })
  await input.fill('edited')
  await input.evaluate((node) => {
    ;(window as any).savedInput = node
  })
  await render(page, { icon: 'folder' }, { scenario: 'keys', reverse: true })
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('edited')
  expect(
    await input.evaluate((node) => node === (window as any).savedInput),
  ).toBe(true)
  await first(page).click()
  await expect(input).toBeHidden()
  await first(page).click()
  await expect(input).toHaveValue('edited')
  expect(
    await page
      .locator('#form')
      .evaluate((node) =>
        new FormData(node as HTMLFormElement).get('First input'),
      ),
  ).toBe('edited')
  await page.locator('#reset').click()
  await expect(input).toHaveValue('First input')
  await expect(first(page)).toHaveAttribute('aria-expanded', 'true')
})

test('nested foreign controls keep their own geometry and content semantics', { tag: ['@css'] }, async ({
  page,
}) => {
  await render(
    page,
    { defaultExpanded: ['first'] },
    { scenario: 'foreign', reset: true },
  )
  const controls = [
    page.getByRole('combobox', { name: 'Project' }),
    page.getByRole('combobox', { name: 'Reference' }),
  ]
  const styles = await Promise.all(
    controls.map((control) =>
      control.evaluate((node) => {
        const s = getComputedStyle(node)
        return [
          s.display,
          s.paddingInlineStart,
          s.paddingInlineEnd,
          s.borderRadius,
          s.gap,
          s.fontFamily,
          s.minHeight,
        ]
      }),
    ),
  )
  expect(styles[0]).toEqual(styles[1])
  await controls[0].click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  await expect(controls[0]).toContainText('Beta')
  await expect(first(page)).toHaveAttribute('aria-expanded', 'true')
})

for (const level of ['root', 'item'])
  test(`disabled ${level} disclosure preserves independent panel action membrane and focus`, { tag: ['@pointer'] }, async ({
    page,
  }) => {
    await render(
      page,
      { disabled: level === 'root', defaultExpanded: ['first'] },
      { scenario: 'action', disableFirst: level === 'item', reset: true },
    )
    const button = page.getByRole('button', {
      name: 'Panel action',
      exact: true,
    })
    await expect(first(page)).toBeDisabled()
    await expect(button).toBeEnabled()
    await button.locator('..').click({ position: { x: 0.5, y: 0.5 } })
    expect(await events(page)).toEqual(['panel-action'])
    await expect(button).toBeFocused()
    await expect(first(page)).toHaveAttribute('aria-expanded', 'true')
    await button.click()
    expect(await events(page)).toEqual(['panel-action', 'panel-action'])
  })

for (const theme of ['light', 'dark'])
  for (const dir of ['ltr', 'rtl']) {
    test(`${theme}/${dir}: 360px long labels, logical icon/arrow alignment, nested arrows and disabled contents`, { tag: ['@layout', '@css'] }, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 850 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      await render(
        page,
        { dir, defaultExpanded: ['first'], icon: 'folder' },
        { scenario: 'nested', reset: true },
      )
      const child = page.getByRole('button', {
        name: 'Child section',
        exact: true,
      })
      const arrow = child.locator('.uf-accordion-arrow')
      await expect
        .poll(() =>
          arrow.evaluate(
            (node) => new DOMMatrix(getComputedStyle(node).transform).a,
          ),
        )
        .toBeCloseTo(dir === 'rtl' ? -1 : 1, 5)
      await child.click()
      await expect
        .poll(() =>
          arrow.evaluate(
            (node) => new DOMMatrix(getComputedStyle(node).transform).b,
          ),
        )
        .toBeCloseTo(1, 5)
      const long =
        'A long section title that must remain readable when the panel is narrow '.repeat(
          3,
        )
      await render(page, {
        dir,
        icon: 'folder',
        items: [{ value: 'first', label: long, content: 'Body' }],
      })
      const trigger = root(page).locator('button[data-scope="accordion"]')
      const label = trigger.locator('.uf-accordion-label'),
        icon = trigger.locator('.uf-accordion-icon'),
        end = trigger.locator('.uf-accordion-arrow')
      const [l, i, e] = await Promise.all([
        label.boundingBox(),
        icon.boundingBox(),
        end.boundingBox(),
      ])
      expect(l!.height).toBeGreaterThan(45)
      if (dir === 'rtl') {
        expect(i!.x).toBeGreaterThan(l!.x + l!.width - 1)
        expect(e!.x + e!.width).toBeLessThanOrEqual(l!.x + 1)
      } else {
        expect(i!.x + i!.width).toBeLessThanOrEqual(l!.x + 1)
        expect(e!.x).toBeGreaterThanOrEqual(l!.x + l!.width - 1)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await render(
        page,
        { dir, disabled: true, defaultExpanded: ['first'] },
        { reset: true },
      )
      await expect(first(page)).toBeDisabled()
      const input = page.getByRole('textbox', { name: 'Panel input' })
      await input.fill('still editable')
      await expect(input).toBeFocused()
      expect(
        await input.evaluate(
          (node) =>
            getComputedStyle(node.closest('[data-part="content"]')!).opacity,
        ),
      ).toBe('1')
      const opacity = await first(page).evaluate((node) =>
        Number(getComputedStyle(node).opacity),
      )
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThan(1)
      expect(
        await root(page).evaluate((node) => getComputedStyle(node).opacity),
      ).toBe('1')
    })
    test(`${theme}/${dir}: 1000px and 360px axe, contrast and invisible panels`, { tag: ['@css', '@a11y'] }, async ({
      page,
    }) => {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      for (const width of [1000, 360]) {
        await page.setViewportSize({ width, height: 850 })
        await render(
          page,
          { dir, defaultExpanded: ['first'] },
          { reset: true },
        )
        await page.addScriptTag({ content: axe.source })
        const result = await page.evaluate(
          async () =>
            await (window as any).axe.run(document.getElementById('form'), {
              rules: { region: { enabled: false } },
            }),
        )
        expect(
          result.violations.map((v: any) => ({
            id: v.id,
            nodes: v.nodes.map((n: any) => n.failureSummary),
          })),
        ).toEqual([])
        await first(page).click()
        await expect(
          page.getByRole('textbox', { name: 'Panel input' }),
        ).toBeHidden()
        await expect(page.getByRole('heading')).toHaveCount(3)
      }
    })
  }
