import { test, expect, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const render = (page: Page, props = {}, options = {}) =>
  page.evaluate(
    ({ props, options }) => (window as any).renderTabs(props, options),
    { props, options },
  )
const tabs = (page: Page) => page.getByRole('tab')
const events = (page: Page) => page.evaluate(() => (window as any).tabsEvents)
export function registerTabsCases(route: string) {
  test.beforeEach(async ({ page }) => {
    await page.goto(route)
    await page.waitForFunction(
      () => typeof (window as any).renderTabs === 'function',
    )
  })
  for (const orientation of ['horizontal', 'vertical'])
    for (const variant of ['pill', 'underline'])
      for (const direction of ['ltr', 'rtl'])
        for (const theme of ['light', 'dark'])
          test(`tab geometry ${orientation}/${variant}/${direction}/${theme}`, async ({
            page,
            browserName,
          }) => {
            await page.setViewportSize({ width: 360, height: 800 })
            await render(
              page,
              {
                orientation,
                variant,
                defaultValue: 'a',
                items: [
                  {
                    value: '',
                    label: 'Administration settings',
                    content: 'First',
                  },
                  {
                    value: 'a',
                    label: 'UnbreakableConfigurationName',
                    content: 'Selected content',
                  },
                  { value: 'b', label: 'C', content: 'Last' },
                ],
              },
              { direction, theme },
            )
            const metrics = await tabs(page).evaluateAll((nodes) =>
              nodes.map((n) => {
                const r = n.getBoundingClientRect()
                return { x: r.x, y: r.y, width: r.width, height: r.height }
              }),
            )
            for (const r of metrics) {
              expect(r.width).toBeGreaterThanOrEqual(24)
              expect(r.height).toBeGreaterThanOrEqual(24)
            }
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth),
            ).toBeLessThanOrEqual(360)
            if (orientation === 'vertical') {
              expect(metrics[1].y).toBeGreaterThan(metrics[0].y)
              expect(Math.abs(metrics[1].x - metrics[0].x)).toBeLessThan(1)
            } else expect(Math.abs(metrics[1].y - metrics[0].y)).toBeLessThan(1)
            if (variant === 'underline') {
              const borders = await page
                .locator('.uf-tabs-tabSlot')
                .evaluateAll(
                  (nodes, orientation) =>
                    nodes.map((n) => {
                      const s = getComputedStyle(n)
                      return orientation === 'vertical'
                        ? [s.borderInlineEndColor, s.borderInlineEndWidth]
                        : [s.borderBottomColor, s.borderBottomWidth]
                    }),
                  orientation,
                )
              expect(borders[1][0]).not.toBe('rgba(0, 0, 0, 0)')
              expect(parseFloat(borders[1][1])).toBeGreaterThan(0)
              expect(borders[0][0]).toBe('rgba(0, 0, 0, 0)')
            }
            if (browserName === 'chromium' && direction === 'ltr')
              await page.screenshot({
                path: `.artifacts/tabs-${orientation}-${variant}-${theme}.png`,
                fullPage: true,
              })
          })
  for (const membrane of [true, false])
    test(`density16 targets and wrapped long titles membrane=${membrane}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 700 })
      await page.evaluate(() =>
        document.documentElement.style.setProperty(
          '--uf-control-height',
          '16px',
        ),
      )
      await render(page, {
        wrap: true,
        membrane,
        variant: 'underline',
        items: [
          { value: 'a', label: 'A'.repeat(100) },
          { value: 'b', label: 'Long configuration' },
          { value: 'c', label: 'Other settings' },
        ],
      })
      const buttons = tabs(page)
      for (const button of await buttons.all()) {
        const r = (await button.boundingBox())!
        expect(r.width).toBeGreaterThanOrEqual(24)
        expect(r.height).toBeGreaterThanOrEqual(24)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.x + r.width).toBeLessThanOrEqual(320)
      }
      expect((await buttons.nth(1).boundingBox())!.y).toBeGreaterThan(
        (await buttons.first().boundingBox())!.y,
      )
    })
  for (const activationMode of ['automatic', 'manual'])
    test(`real keyboard, disabled skip and empty key ${activationMode}`, async ({
      page,
    }) => {
      await render(page, {
        activationMode,
        defaultValue: 'a',
        items: [
          { value: '', label: 'Empty', content: 'Zero' },
          { value: 'a', label: 'Alpha', content: 'A' },
          { value: 'disabled', label: 'Disabled', disabled: true },
          { value: 'b', label: 'Beta', content: 'B' },
        ],
      })
      await tabs(page).nth(1).focus()
      await page.keyboard.press('ArrowRight')
      await expect(tabs(page).nth(3)).toBeFocused()
      await expect(
        tabs(page).nth(activationMode === 'automatic' ? 3 : 1),
      ).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Space')
      await expect(tabs(page).nth(3)).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Home')
      await expect(tabs(page).first()).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true')
      expect(await events(page)).toEqual([{ value: 'b' }, { value: '' }])
    })
  test('direction uses inherited computed CSS and ignores the other axis/modifiers', async ({
    page,
  }) => {
    await page.addStyleTag({ content: 'main { direction: rtl; }' })
    await render(page, { defaultValue: 'a' })
    await tabs(page).nth(1).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs(page).first()).toBeFocused()
    // WebKit maps Control+ArrowLeft to browser Back; dispatch just the DOM event
    // to verify the component leaves modified navigation unhandled.
    const allowed = await tabs(page)
      .first()
      .evaluate((node) =>
        node.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        ),
      )
    expect(allowed).toBe(true)
    await page.keyboard.press('ArrowDown')
    await expect(tabs(page).first()).toBeFocused()
    expect(await events(page)).toEqual([{ value: '' }])
  })
  test('controlled refusal separates focused tab from accepted panel, release keeps accepted value', async ({
    page,
  }) => {
    await render(page, { value: 'a' })
    await tabs(page).nth(1).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs(page).nth(2)).toBeFocused()
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toHaveText('Activity content')
    await render(page)
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true')
  })
  test('pointer capture cancellation happens before automatic focus can activate', async ({
    page,
  }) => {
    await render(page, { defaultValue: 'a' }, { cancelClick: true })
    await tabs(page).nth(2).click()
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    expect(await events(page)).toEqual([])
  })
  test('root key capture cancels arrow navigation', async ({ page }) => {
    await render(page, { defaultValue: 'a' }, { cancelKeys: true })
    await tabs(page).nth(1).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs(page).nth(1)).toBeFocused()
    expect(await events(page)).toEqual([])
  })
  test('panel drafts survive switching and no hidden panel keeps focus', async ({
    page,
  }) => {
    await render(page, { value: 'a' }, { inputs: true, accept: true })
    const input = page.getByRole('textbox', { name: 'Draft a', exact: true })
    await input.fill('Unsaved draft')
    await render(page, { value: 'b' }, { inputs: true, accept: true })
    await expect(tabs(page).nth(2)).toBeFocused()
    await tabs(page).nth(1).click()
    await expect(input).toHaveValue('Unsaved draft')
    expect(await events(page)).toEqual([{ value: 'a' }])
  })
  test('removing selected focused tab recovers nearest successor without a user callback', async ({
    page,
  }) => {
    await render(page, { defaultValue: 'a' })
    await tabs(page).nth(1).focus()
    await render(page, {
      items: [
        { value: '', label: 'Overview' },
        { value: 'b', label: 'Billing' },
      ],
    })
    await expect(tabs(page).nth(1)).toBeFocused()
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    expect(await events(page)).toEqual([])
  })
  test('changes preserve outside focus and membrane toggle preserves native node', async ({
    page,
  }) => {
    await render(page, { defaultValue: 'a' })
    await tabs(page).nth(1).focus()
    await page.evaluate(
      () => ((window as any).savedTab = document.activeElement),
    )
    await render(page, { membrane: false })
    expect(
      await page.evaluate(
        () => (window as any).savedTab === document.activeElement,
      ),
    ).toBe(true)
    await page.locator('#after').focus()
    await render(page, { items: [{ value: 'b', label: 'B' }] })
    await expect(page.locator('#after')).toBeFocused()
  })
  test('native header actions are named, outside tablist and disabled with the root', async ({
    page,
  }) => {
    await render(page, { defaultValue: 'a' }, { actions: true })
    const action = page.getByRole('button', { name: 'Close selected' })
    await action.click()
    expect(await events(page)).toEqual(['action'])
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(
      async () =>
        (
          await (window as any).axe.run(document.querySelector('.uf-tabs'), {
            runOnly: {
              type: 'rule',
              values: [
                'aria-required-children',
                'aria-required-parent',
                'aria-allowed-attr',
                'aria-valid-attr-value',
                'nested-interactive',
              ],
            },
          })
        ).violations,
    )
    expect(violations).toEqual([])
    await render(page, { disabled: true }, { actions: true })
    await expect(action).toBeDisabled()
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tabpanel')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#after')).toBeFocused()
  })
  test('keyboard reveals clipped tabs instantly without scrolling the page', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 360, height: 800 })
    await render(page, {
      items: Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: `Long tab title ${i}`,
        content: `Panel ${i}`,
      })),
    })
    await tabs(page).first().focus()
    await page.keyboard.press('End')
    await expect(tabs(page).last()).toBeFocused()
    const r = (await tabs(page).last().boundingBox())!
    expect(r.x).toBeGreaterThanOrEqual(15)
    expect(r.x + r.width).toBeLessThanOrEqual(345)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.getByRole('tablist')).toHaveCSS('scroll-behavior', 'auto')
  })
  for (const variant of ['pill', 'underline']) {
    test(`forced colors keeps ${variant} selection visible apart from focus`, async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'WebKit does not emulate forced colors',
      )
      await page.emulateMedia({ forcedColors: 'active' })
      await render(page, {
        variant,
        defaultValue: 'a',
        activationMode: 'manual',
      })
      await tabs(page).first().focus()
      const states = await tabs(page).evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node)
          return {
            background: style.backgroundColor,
            color: style.color,
            decoration: style.textDecorationLine,
            border: getComputedStyle(node.closest('.uf-tabs-tabSlot')!)
              .borderBottomColor,
          }
        }),
      )
      expect(states[1]).not.toEqual(states[2])
      await expect(tabs(page).first()).toHaveCSS('outline-style', 'solid')
    })
  }
  test('header actions leave usable tab targets on a narrow screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await render(
      page,
      {},
      {
        actions: ['Create new record', 'Close selected record', 'More actions'],
      },
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320)
    const list = (await page.getByRole('tablist').boundingBox())!
    expect(list.width).toBeGreaterThanOrEqual(24)
    await tabs(page).first().focus()
    await page.keyboard.press('End')
    const target = (await tabs(page).last().boundingBox())!
    expect(target.width).toBeGreaterThanOrEqual(24)
    expect(target.x).toBeGreaterThanOrEqual(list.x - 1)
    expect(target.x + target.width).toBeLessThanOrEqual(list.x + list.width + 1)
  })
  test('external panel IDs are real links and internal panel DOM is absent', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const panel = document.createElement('div')
      panel.id = 'external-panel'
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-label', 'External content')
      panel.textContent = 'External'
      document.body.append(panel)
    })
    await render(page, {
      renderPanels: false,
      items: [
        {
          value: 'a',
          id: 'external-tab',
          label: 'External',
          panelId: 'external-panel',
        },
      ],
    })
    await expect(tabs(page).first()).toHaveAttribute(
      'aria-controls',
      'external-panel',
    )
    await expect(page.locator('.uf-tabs [role="tabpanel"]')).toHaveCount(0)
  })
  for (const theme of ['light', 'dark'])
    test(`contrast, native names and selected state in ${theme}`, async ({
      page,
    }) => {
      await render(
        page,
        {
          variant: 'underline',
          'aria-labelledby': 'heading',
          'aria-describedby': 'description',
        },
        { theme, actions: true },
      )
      await expect(
        page.getByRole('tablist', { name: 'Record sections' }),
      ).toBeVisible()
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
      const violations = await page.evaluate(
        async () =>
          (
            await (window as any).axe.run(document.querySelector('.uf-tabs'), {
              runOnly: {
                type: 'rule',
                values: [
                  'color-contrast',
                  'aria-required-children',
                  'aria-required-parent',
                  'aria-allowed-attr',
                ],
              },
            })
          ).violations,
      )
      expect(violations).toEqual([])
    })
}
