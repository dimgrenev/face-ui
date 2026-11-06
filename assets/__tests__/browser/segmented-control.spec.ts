import { test, expect, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/segmented-control.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { renderSegmented: render } = hooks<Hooks>()
const buttons = (page: Page) => page.locator('.uf-toggle-item')
const selected = (page: Page) =>
  page.locator('.uf-toggle-item[data-state="on"]')
const events = (page: Page) =>
  page.evaluate(() => (window as any).segmentedEvents)
const data = (page: Page, external = false) =>
  page.evaluate(
    (external) => (window as any).segmentedFormData(external),
    external,
  )
test.beforeEach(async ({ page }) => {
  await open(page, 'segmented-control')
})
for (const orientation of ['horizontal', 'vertical'] as const)
  for (const direction of ['ltr', 'rtl'])
    for (const membrane of [true, false])
      for (const theme of ['light', 'dark'])
        test(`layout, targets and names ${orientation}/${direction}/${membrane}/${theme}`, { tag: ['@layout', '@a11y'] }, async ({
          page,
        }) => {
          await page.setViewportSize({ width: 360, height: 720 })
          await render(
            page,
            {
              orientation,
              membrane,
              defaultValue: 'a',
              items: [
                { value: 'a', label: 'Administration settings' },
                { value: 'b', label: 'UnbreakableConfigurationName' },
                { value: 'c', label: 'C' },
              ],
            },
            { direction, theme, density: 16, width: 280 },
          )
          const rects = await buttons(page).evaluateAll((ns) =>
            ns.map((n) => {
              const r = n.getBoundingClientRect()
              return {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                scroll: n.scrollWidth,
                client: n.clientWidth,
              }
            }),
          )
          const frame = (await page.locator('#frame').boundingBox())!
          // The bordered strip keeps its natural width inside the field root.
          const list = (await page.locator('.uf-toggle-list').boundingBox())!
          expect(list.x).toBeGreaterThanOrEqual(frame.x - 1)
          expect(list.x + list.width).toBeLessThanOrEqual(frame.x + frame.width + 1)
          for (const r of rects) {
            expect(r.width).toBeGreaterThanOrEqual(24)
            expect(r.height).toBeGreaterThanOrEqual(24)
            expect(r.x).toBeGreaterThanOrEqual(frame.x)
            expect(r.x + r.width).toBeLessThanOrEqual(
              frame.x + frame.width + 1,
            )
            expect(r.scroll).toBeLessThanOrEqual(r.client + 1)
          }
          if (orientation === 'vertical') {
            expect(rects[1].y).toBeGreaterThanOrEqual(
              rects[0].y + rects[0].height,
            )
            expect(rects[1].x).toBeCloseTo(rects[0].x, 1)
            expect(rects[1].width).toBeCloseTo(rects[0].width, 1)
          } else {
            expect(rects[1].y).toBeCloseTo(rects[0].y, 1)
            expect(rects[1].height).toBeCloseTo(rects[0].height, 1)
          }
          await page.addScriptTag({
            path: require.resolve('axe-core/axe.min.js'),
          })
          const violations = await page.evaluate(async () => {
            const r = await (window as any).axe.run(
              document.querySelector('main'),
            )
            return r.violations.map((v: any) => ({
              id: v.id,
              targets: v.nodes.map((n: any) => n.target),
            }))
          })
          expect(violations).toEqual([])
        })
test('selection never moves adjacent targets, including proportional fonts', { tag: ['@layout', '@css', '@pointer'] }, async ({
  page,
}) => {
  await render(page, { style: { fontFamily: 'Georgia' } })
  const before = await buttons(page).evaluateAll((ns) =>
    ns.map((n) => {
      const r = n.getBoundingClientRect()
      return [r.x, r.y, r.width, r.height]
    }),
  )
  await buttons(page).nth(1).click()
  await expect(buttons(page).nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(buttons(page).nth(1)).toHaveCSS('transition-duration', '0s')
  const after = await buttons(page).evaluateAll((ns) =>
    ns.map((n) => {
      const r = n.getBoundingClientRect()
      return [r.x, r.y, r.width, r.height]
    }),
  )
  expect(after).toEqual(before)
})
for (const direction of ['ltr', 'rtl'])
  test(`single keyboard empty keys, both arrows and reselect ${direction}`, { tag: ['@focus'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: 'grid' }, { direction })
    await buttons(page).nth(1).focus()
    await page.keyboard.press(
      direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft',
    )
    await expect(buttons(page).nth(0)).toBeFocused()
    await expect(buttons(page).nth(0)).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(buttons(page).nth(1)).toBeFocused()
    await page.keyboard.press('End')
    await expect(buttons(page).nth(2)).toBeFocused()
    await page.keyboard.press('Space')
    await page.keyboard.press('Enter')
    expect(await events(page)).toEqual(['', 'grid', 'list'])
  })
test('multiple native Space/Enter toggle and arrows only move focus', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  await render(page, { multiple: true, defaultValue: ['grid'] })
  await buttons(page).nth(1).focus()
  await page.keyboard.press('ArrowRight')
  await expect(buttons(page).nth(2)).toBeFocused()
  expect(await events(page)).toEqual([])
  await page.keyboard.press('Space')
  await page.keyboard.press('Enter')
  expect(await events(page)).toEqual([['grid', 'list'], ['grid']])
  await expect(buttons(page).nth(2)).toHaveAttribute('aria-pressed', 'false')
})
test('Tab enters at selected radio and leaves the group', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 'grid' })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(buttons(page).nth(1)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('#reset')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(buttons(page).nth(1)).toBeFocused()
})
test('controlled refusal keeps DOM/form and tab re-entry on accepted value', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { value: 'grid' })
  await buttons(page).nth(1).focus()
  await page.keyboard.press('ArrowRight')
  await expect(buttons(page).nth(2)).toBeFocused()
  await expect(selected(page)).toHaveText('Grid')
  expect(await data(page)).toEqual([['view', 'grid']])
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(buttons(page).nth(1)).toBeFocused()
  expect(await events(page)).toEqual(['list'])
})
test('membrane padding activates once and toggling retains nodes/focus/state', { tag: ['@layout', '@pointer', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 'grid' })
  const membrane = buttons(page).nth(2).locator('..')
  const rect = (await membrane.boundingBox())!
  await page.mouse.click(rect.x + 1, rect.y + rect.height / 2)
  await expect(selected(page)).toHaveText('List')
  expect(await events(page)).toEqual(['list'])
  await buttons(page)
    .nth(2)
    .evaluate((n) => ((window as any).savedSegment = n))
  await render(page, { membrane: false })
  expect(
    await buttons(page)
      .nth(2)
      .evaluate((n) => n === (window as any).savedSegment),
  ).toBe(true)
  await expect(buttons(page).nth(2)).toBeFocused()
  await expect(selected(page)).toHaveText('List')
  await expect(buttons(page).nth(2).locator('..')).toHaveCSS(
    'display',
    'contents',
  )
})
test('fieldset disables keyboard, pointer and FormData with one opacity application', { tag: ['@native', '@css', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 'grid' }, { fieldsetDisabled: true })
  expect(await data(page)).toEqual([])
  for (const b of await buttons(page).all()) await expect(b).toBeDisabled()
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#reset')).toBeFocused()
  const op = await buttons(page)
    .nth(1)
    .evaluate((n) => {
      let product = 1
      for (let e: Element | null = n; e; e = e.parentElement)
        product *= Number(getComputedStyle(e).opacity)
      return [
        product,
        Number(
          getComputedStyle(n).getPropertyValue('--uf-color-disabled-opacity'),
        ),
      ]
    })
  expect(op[0]).toBeCloseTo(op[1], 4)
})
test('root disabled does not multiply opacity or submit', { tag: ['@css'] }, async ({
  page,
}) => {
  await render(page, { disabled: true, value: 'grid' })
  expect(await data(page)).toEqual([])
  const op = await buttons(page)
    .nth(1)
    .evaluate((n) => {
      let product = 1
      for (let e: Element | null = n; e; e = e.parentElement)
        product *= Number(getComputedStyle(e).opacity)
      return [
        product,
        Number(
          getComputedStyle(n).getPropertyValue('--uf-color-disabled-opacity'),
        ),
      ]
    })
  expect(op[0]).toBeCloseTo(op[1], 4)
})
test('focus recovers from a removed choice, whose selection returns with it', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 'grid' })
  await buttons(page).nth(1).focus()
  await render(page, {
    items: [
      { value: '', label: 'None' },
      { value: 'list', label: 'List' },
    ],
  })
  // The choice now at the removed one's place takes focus.
  await expect(buttons(page).nth(1)).toBeFocused()
  await expect(selected(page)).toHaveCount(0)
  await render(page)
  await expect(selected(page)).toHaveText('Grid')
  expect(await events(page)).toEqual([])
})
for (const multiple of [false, true])
  test(`required ${multiple ? 'multiple' : 'single'}: interactive validation shows the browser message and focuses the group`, { tag: ['@native', '@focus'] }, async ({
    page,
  }) => {
    await render(page, { multiple, required: true, label: 'View' })
    const field = page.locator('.uf-toggle')
    const error = field.locator('[data-part="error"]')
    await expect(field).toHaveAccessibleName('View')
    // Only a radiogroup supports aria-required; the proxy validates both modes.
    if (multiple) await expect(field).not.toHaveAttribute('aria-required')
    else await expect(field).toHaveAttribute('aria-required', 'true')
    await expect(error).toHaveCount(0)
    await page.locator('#edit').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(error).not.toBeEmpty()
    await expect(buttons(page).nth(0)).toBeFocused()
    await expect(buttons(page).nth(0)).toHaveAccessibleDescription(
      (await error.textContent())!,
    )
    if (!multiple) await expect(field).toHaveAttribute('aria-invalid', 'true')
    await buttons(page).nth(1).click()
    expect(await data(page)).toEqual([['view', 'grid']])
    await page.locator('#edit').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(error).toHaveCount(0)
  })
test('a root width sizes the field; the strip fills it only with inline-size: 100%', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, { style: { inlineSize: '320px' } })
  const width = (selector: string) =>
    page.locator(selector).evaluate((n) => n.getBoundingClientRect().width)
  expect(await width('.uf-toggle')).toBeCloseTo(320, 0)
  expect(await width('.uf-toggle-list')).toBeLessThan(320)
  await page.addStyleTag({ content: '.uf-toggle-list { inline-size: 100% }' })
  expect(await width('.uf-toggle-list')).toBeCloseTo(320, 0)
})
test('forced colors preserves selected border and keyboard focus', { tag: ['@forced-colors', '@css', '@focus'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await render(page, { defaultValue: 'grid' })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(buttons(page).nth(1)).toBeFocused()
  await expect(buttons(page).nth(1)).toHaveCSS('outline-width', '2px')
  const colors = await buttons(page).evaluateAll((ns) =>
    ns.map((n) => getComputedStyle(n).borderColor),
  )
  expect(colors[1]).not.toBe(colors[0])
  expect(colors[1]).not.toBe('rgba(0, 0, 0, 0)')
})
