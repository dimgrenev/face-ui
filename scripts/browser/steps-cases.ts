import { test, expect, type Page } from '@playwright/test'
const render = (page: Page, props = {}, options = {}) =>
  page.evaluate(
    ({ props, options }) => (window as any).renderSteps(props, options),
    { props, options },
  )
const controls = (page: Page) =>
  page.locator('[data-scope="steps"][data-part="trigger"]')
const current = (page: Page) =>
  page.locator('[data-scope="steps"][aria-current="step"]')
const events = (page: Page) => page.evaluate(() => (window as any).stepsEvents)
export function registerStepsCases(route: string) {
  test.beforeEach(async ({ page }) => {
    await page.goto(route)
    await page.waitForFunction(
      () => typeof (window as any).renderSteps === 'function',
    )
  })
  test('native identity, class, style, ref and naming share one root', async ({
    page,
  }) => {
    await render(page, {
      id: 'wizard',
      'aria-label': 'Настройка',
      title: 'Setup',
      className: 'custom',
      style: { width: 310 },
      lang: 'ru',
      dir: 'rtl',
    })
    const root = page.getByRole('group', { name: 'Настройка', exact: true })
    await expect(root).toHaveId('wizard')
    await expect(root).toHaveClass(/custom/)
    await expect(root).toHaveCSS('width', '310px')
    await expect(root).toHaveAttribute('lang', 'ru')
    await expect(root).toHaveCSS('direction', 'rtl')
    await expect(root).toHaveAttribute('title', 'Setup')
    expect(
      await root.evaluate((node) => node === (window as any).stepsRoot),
    ).toBe(true)
  })
  test('accessible names exclude the decorative number and panels reference their button', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Account', exact: true }),
    ).toHaveAttribute('aria-current', 'step')
    await expect(page.getByRole('list')).toHaveCount(1)
    await expect(page.getByRole('listitem')).toHaveCount(3)
    const panel = page.getByRole('group', { name: 'Account', exact: true })
    await expect(panel).toBeVisible()
    expect(await panel.getAttribute('id')).toBe(
      await controls(page).nth(0).getAttribute('aria-controls'),
    )
    await expect(
      page.getByRole('group', { name: 'Profile', exact: true }),
    ).toHaveCount(0)
  })
  test('keyboard uses native Tab, Enter and Space without submitting the form', async ({
    page,
  }) => {
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(controls(page).nth(0)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(controls(page).nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(current(page)).toHaveAttribute('data-index', '1')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Space')
    await expect(current(page)).toHaveAttribute('data-index', '0')
    expect(await events(page)).toEqual([{ step: 1 }, { step: 0 }])
  })
  test('arrow keys do not silently implement tab selection', async ({
    page,
  }) => {
    await controls(page).nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(controls(page).nth(0)).toBeFocused()
    expect(await events(page)).toEqual([])
  })
  for (const cancel of ['cancelClick', 'cancelKey'])
    test(`${cancel} prevents selection`, async ({ page }) => {
      await render(page, {}, { [cancel]: true })
      await controls(page).nth(1).focus()
      if (cancel === 'cancelClick') await controls(page).nth(1).click()
      else await page.keyboard.press('Enter')
      await expect(current(page)).toHaveAttribute('data-index', '0')
      expect(await events(page)).toEqual([])
    })
  test('controlled parent can refuse repeated proposals and external changes stay quiet', async ({
    page,
  }) => {
    await render(page, { step: 0 })
    await controls(page).nth(1).click()
    await controls(page).nth(1).click()
    await expect(current(page)).toHaveAttribute('data-index', '0')
    expect(await events(page)).toEqual([{ step: 1 }, { step: 1 }])
    await render(page, { step: 2 })
    await expect(current(page)).toHaveAttribute('data-index', '2')
    expect(await events(page)).toEqual([{ step: 1 }, { step: 1 }])
  })
  test('linear allows only the next position, non-linear allows skipping', async ({
    page,
  }) => {
    await expect(controls(page).nth(2)).toBeDisabled()
    await controls(page).nth(1).click()
    await expect(controls(page).nth(2)).toBeEnabled()
    await controls(page).nth(0).click()
    await expect(controls(page).nth(2)).toBeDisabled()
    await render(page, { linear: false })
    await controls(page).nth(2).click()
    await expect(current(page)).toHaveAttribute('data-index', '2')
  })
  test('disabled navigation leaves nested Face controls usable and unaltered', async ({
    page,
  }) => {
    await render(page, { disabled: true }, { foreign: true })
    for (const control of await controls(page).all())
      await expect(control).toBeDisabled()
    const action = page.getByRole('button', { name: 'Action 0', exact: true }),
      ref = page.getByRole('button', { name: 'Action reference', exact: true })
    const measure = (locator: typeof action) =>
      locator.evaluate((node) => {
        const css = getComputedStyle(node)
        return {
          height: node.getBoundingClientRect().height,
          background: css.backgroundColor,
          padding: css.padding,
          opacity: css.opacity,
        }
      })
    expect(await measure(action)).toEqual(await measure(ref))
    await action.click()
    expect(await events(page)).toEqual(['panel-action'])
    const select = page.getByRole('combobox', {
      name: 'Project 0',
      exact: true,
    })
    await select.click()
    await page.getByRole('option', { name: 'Beta', exact: true }).click()
    await expect(select).toContainText('Beta')
    await expect(current(page)).toHaveAttribute('data-index', '0')
  })
  test('disabled navigation is skipped by Tab while panel fields remain reachable', async ({
    page,
  }) => {
    await render(page, { disabled: true }, { fields: true })
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('textbox', { name: 'Field 1', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#after')).toBeFocused()
  })
  test('hidden root removes all navigation and content from hit testing and tab order', async ({
    page,
  }) => {
    await render(page, { hidden: true }, { fields: true })
    await expect(page.locator('.uf-steps')).toBeHidden()
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#after')).toBeFocused()
  })
  test('shrinking commits a valid uncontrolled step and recovers removed field focus', async ({
    page,
  }) => {
    await render(page, { defaultStep: 2 }, { reset: true, fields: true })
    await page.getByRole('textbox', { name: 'Field 3' }).focus()
    await render(page, {}, { count: 2, fields: true })
    await expect(current(page)).toHaveAttribute('data-index', '1')
    await expect(current(page)).toBeFocused()
    await render(page, {}, { fields: true })
    await expect(current(page)).toHaveAttribute('data-index', '1')
    expect(await events(page)).toEqual([])
  })
  test('controlled bounds remain external when the list grows', async ({
    page,
  }) => {
    await render(page, { step: 2 }, { count: 2 })
    await expect(current(page)).toHaveAttribute('data-index', '1')
    await render(page, { step: 2 })
    await expect(current(page)).toHaveAttribute('data-index', '2')
    expect(await events(page)).toEqual([])
  })
  test('keyed panels retain edited values on reorder and numeric selection stays positional', async ({
    page,
  }) => {
    await render(page, { step: 0 }, { fields: true })
    await page.getByRole('textbox', { name: 'Field 1' }).fill('Edited')
    await render(page, { step: 2 }, { fields: true, reverse: true })
    await expect(page.getByRole('textbox', { name: 'Field 1' })).toHaveValue(
      'Edited',
    )
    await expect(current(page)).toHaveAccessibleName('Account')
  })
  test('inactive panels preserve data but are absent from Tab order', async ({
    page,
  }) => {
    await render(page, {}, { fields: true })
    await page.getByRole('textbox', { name: 'Field 1' }).fill('Edited')
    await controls(page).nth(1).click()
    await controls(page).nth(2).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: 'Field 2' })).toBeFocused()
    expect(
      await page
        .locator('#form')
        .evaluate((node) =>
          Object.fromEntries(new FormData(node as HTMLFormElement)),
        ),
    ).toEqual({
      'field-0': 'Edited',
      'field-1': 'Value 2',
      'field-2': 'Value 3',
    })
    await controls(page).nth(0).click()
    await expect(page.getByRole('textbox', { name: 'Field 1' })).toHaveValue(
      'Edited',
    )
  })
  test('external changes recover hidden focus without stealing focus already moved elsewhere', async ({
    page,
  }) => {
    await render(page, { step: 0 }, { fields: true })
    await page.getByRole('textbox', { name: 'Field 1' }).focus()
    await render(page, { step: 1 }, { fields: true })
    await expect(current(page)).toBeFocused()
    await page.locator('#after').focus()
    await render(page, { step: 2 }, { fields: true })
    await expect(page.locator('#after')).toBeFocused()
  })
  for (const membrane of [true, false])
    test(`membrane=${membrane} owns spacing and padding activation`, async ({
      page,
    }) => {
      await render(page, { membrane })
      const target = controls(page).nth(1),
        wrapper = target.locator('..')
      const geometry = await wrapper.evaluate((node) => {
        const box = node.getBoundingClientRect(),
          child = node.firstElementChild!.getBoundingClientRect()
        return {
          outer: box.width,
          inner: child.width,
          item: node.parentElement!.getBoundingClientRect().width,
          display: getComputedStyle(node).display,
          pad: parseFloat(getComputedStyle(node).paddingLeft),
          x: box.left + 0.5,
          y: box.top + box.height / 2,
        }
      })
      if (membrane) {
        expect(geometry.pad).toBeGreaterThan(0)
        expect(geometry.outer - geometry.inner).toBeCloseTo(geometry.pad * 2, 1)
        await page.mouse.click(geometry.x, geometry.y)
      } else {
        expect(geometry.display).toBe('contents')
        expect(geometry.pad).toBe(0)
        expect(geometry.item).toBeCloseTo(geometry.inner, 1)
        await target.click()
      }
      await expect(current(page)).toHaveAttribute('data-index', '1')
      expect(await events(page)).toEqual([{ step: 1 }])
    })
  test('disabled membrane padding cannot select a step', async ({ page }) => {
    await render(page, { disabled: true })
    const box = await controls(page).nth(1).locator('..').boundingBox()
    await page.mouse.click(box!.x + 0.5, box!.y + box!.height / 2)
    await expect(current(page)).toHaveAttribute('data-index', '0')
    expect(await events(page)).toEqual([])
  })
  for (const direction of ['ltr', 'rtl'])
    for (const zoom of [1, 2])
      test(`${direction} zoom ${zoom}: long labels wrap inside a narrow layout`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 800 })
        await render(
          page,
          {},
          { direction, width: 280 / zoom, zoom, long: true },
        )
        const geometry = await page.locator('.uf-steps').evaluate((node) => {
          const root = node.getBoundingClientRect()
          return {
            width: root.width,
            root: root.right,
            items: [...node.querySelectorAll('[data-part="trigger"]')].map(
              (item) => {
                const r = item.getBoundingClientRect()
                return {
                  left: r.left,
                  right: r.right,
                  width: r.width,
                  height: r.height,
                  scroll: item.scrollWidth,
                  client: item.clientWidth,
                }
              },
            ),
          }
        })
        for (const item of geometry.items) {
          expect(item.right).toBeLessThanOrEqual(geometry.root + 0.5)
          expect(item.width).toBeLessThanOrEqual(geometry.width + 0.5)
          expect(item.scroll).toBeLessThanOrEqual(item.client + 1)
          expect(item.height).toBeGreaterThan(32 * zoom)
        }
      })
  test('step numbers above twenty use the same border, font and size as earlier numbers', async ({
    page,
  }) => {
    await render(page, { linear: false }, { count: 21 })
    const read = (index: number) =>
      page
        .locator('[data-scope="steps"][data-part="indicator"]')
        .nth(index)
        .evaluate((node) => {
          const css = getComputedStyle(node)
          return {
            height: node.getBoundingClientRect().height,
            border: css.borderTopWidth,
            radius: css.borderRadius,
            font: css.fontSize,
          }
        })
    expect(await read(0)).toEqual(await read(20))
    expect((await read(20)).border).toBe('1px')
    await expect(controls(page).nth(20)).toHaveAccessibleName('Step 21')
  })
  test('root text alignment reaches primitive panels and RTL labels use logical start', async ({
    page,
  }) => {
    await render(page, { dir: 'rtl', style: { textAlign: 'right' } })
    await expect(
      page.locator(
        '[data-scope="steps"][data-part="content"]:not([hidden]) .uf-text',
      ),
    ).toHaveCSS('text-align', 'right')
    await expect(page.locator('.uf-steps-label').first()).toHaveCSS(
      'text-align',
      'start',
    )
  })
  test('keyboard focus has a visible ring', async ({ page }) => {
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    const css = await controls(page)
      .nth(0)
      .evaluate((node) => {
        const s = getComputedStyle(node)
        return { outline: s.outlineStyle, shadow: s.boxShadow }
      })
    expect(css.outline !== 'none' || css.shadow !== 'none').toBe(true)
  })
  for (const theme of ['light', 'dark'])
    for (const direction of ['ltr', 'rtl'])
      test(`${theme} ${direction}: accessible rendered navigation and fields`, async ({
        page,
      }) => {
        await render(
          page,
          { 'aria-label': 'Setup' },
          { theme, direction, fields: true },
        )
        await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
        const violations = await page.evaluate(
          async () =>
            (
              await (window as any).axe.run(document.querySelector('main'), {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
                },
              })
            ).violations,
        )
        expect(violations).toEqual([])
      })
  test('real gallery default is interactive', async ({ page }) => {
    await page.evaluate(() => (window as any).renderStepsGallery())
    await controls(page).nth(1).click()
    await expect(current(page)).toHaveAttribute('data-index', '1')
  })
}
