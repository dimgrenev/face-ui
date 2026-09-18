import { test, expect, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const render = (page: Page, props = {}, options = {}) =>
  page.evaluate(
    ({ props, options }) => {
      const fresh = !(window as any).segmentedCaseRendered
      ;(window as any).segmentedCaseRendered = true
      ;(window as any).renderSegmented(props, { fresh, ...options })
    },
    { props, options },
  )
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
export function registerSegmentedCases(route: string) {
  test.beforeEach(async ({ page }) => {
    await page.goto(route)
    await page.waitForFunction(
      () => typeof (window as any).renderSegmented === 'function',
    )
  })
  for (const orientation of ['horizontal', 'vertical'])
    for (const direction of ['ltr', 'rtl'])
      for (const membrane of [true, false])
        for (const theme of ['light', 'dark'])
          test(`layout, targets and names ${orientation}/${direction}/${membrane}/${theme}`, async ({
            page,
            browserName,
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
            if (browserName === 'chromium' && direction === 'ltr' && membrane)
              await page
                .locator('#frame')
                .screenshot({
                  path: `.artifacts/segmented-visual-${test.info().project.name}-${orientation}-${theme}.png`,
                })
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
  test('selection never moves adjacent targets, including proportional fonts', async ({
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
    test(`single keyboard empty keys, both arrows and reselect ${direction}`, async ({
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
  test('multiple native Space/Enter toggle and arrows only move focus', async ({
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
  test('Tab enters at selected radio and leaves the group', async ({
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
  test('controlled refusal keeps DOM/form and tab re-entry on accepted value', async ({
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
  test('controlled acceptance and release retain the accepted choice', async ({
    page,
  }) => {
    await render(page, { value: 'grid' }, { accept: true })
    await buttons(page).nth(2).click()
    await expect(selected(page)).toHaveText('List')
    await render(page)
    await expect(selected(page)).toHaveText('List')
    expect(await events(page)).toEqual(['list'])
  })
  for (const option of ['cancelCapture', 'cancelClick', 'cancelKey'])
    test(`consumer ${option} cancels the corresponding user action`, async ({
      page,
    }) => {
      await render(page, { defaultValue: 'grid' }, { [option]: true })
      await buttons(page).nth(1).focus()
      if (option === 'cancelClick') await buttons(page).nth(2).click()
      else await page.keyboard.press('ArrowRight')
      await expect(selected(page)).toHaveText('Grid')
      expect(await events(page)).toEqual([])
    })
  test('membrane padding activates once and toggling retains nodes/focus/state', async ({
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
  test('native null and empty-string remain distinct form values', async ({
    page,
  }) => {
    await render(page, { value: null })
    expect(await data(page)).toEqual([])
    await render(page, { value: '' })
    expect(await data(page)).toEqual([['view', '']])
  })
  test('multiple form order excludes disabled choices and callback mutation', async ({
    page,
  }) => {
    await render(
      page,
      { multiple: true, defaultValue: ['grid', 'board'] },
      { mutate: true },
    )
    expect(await data(page)).toEqual([['view', 'grid']])
    await buttons(page).nth(0).click()
    await expect(selected(page)).toHaveText(['None', 'Grid', 'Board'])
    expect(await data(page)).toEqual([
      ['view', ''],
      ['view', 'grid'],
    ])
  })
  for (const external of [false, true])
    test(`native reset restores mount default silently external=${external}`, async ({
      page,
    }) => {
      await render(page, { defaultValue: 'grid' }, { external })
      await buttons(page).nth(2).click()
      await render(page, { defaultValue: '' }, { external })
      await page.locator(external ? '#external-reset' : '#reset').click()
      await expect(selected(page)).toHaveText('Grid')
      expect(await data(page, external)).toEqual([['view', 'grid']])
      expect(await events(page)).toEqual(['list'])
    })
  test('prevented reset preserves user selection', async ({ page }) => {
    await render(page, { defaultValue: 'grid' }, { cancelReset: true })
    await buttons(page).nth(2).click()
    await page.locator('#reset').click()
    await expect(selected(page)).toHaveText('List')
  })
  test('fieldset disables keyboard, pointer and FormData with one opacity application', async ({
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
  test('root disabled does not multiply opacity or submit', async ({
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
  test('focus recovers from removed or disabled choices without restoring stale values', async ({
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
    await expect(buttons(page).nth(0)).toBeFocused()
    await expect(selected(page)).toHaveCount(0)
    await render(page)
    await expect(selected(page)).toHaveCount(0)
  })
  test('native root/item naming, descriptions and styles are observable', async ({
    page,
  }) => {
    await render(page, {
      'aria-labelledby': 'external',
      id: 'modes',
      title: 'Choose mode',
      style: { width: '100%' },
      items: [
        {
          value: 'a',
          label: 'A',
          'aria-label': 'Alpha',
          id: 'alpha',
          title: 'First',
        },
      ],
    })
    await expect(
      page.getByRole('radiogroup', { name: 'View mode' }),
    ).toHaveAttribute('id', 'modes')
    await expect(page.getByRole('radio', { name: 'Alpha' })).toHaveAttribute(
      'id',
      'alpha',
    )
    expect((await page.locator('#modes').boundingBox())!.width).toBeCloseTo(
      (await page.locator('#frame').boundingBox())!.width,
      0,
    )
  })
  test('autoFocus stays mount-only across later owner updates', async ({
    page,
  }) => {
    await render(page, { defaultValue: 'grid', autoFocus: true })
    await expect(buttons(page).nth(1)).toBeFocused()
    await page.locator('#after').focus()
    await render(page, { autoFocus: true, defaultValue: 'list' })
    await expect(page.locator('#after')).toBeFocused()
    await expect(selected(page)).toHaveText('Grid')
  })
  test('forced colors preserves selected border and keyboard focus', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors')
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
}
