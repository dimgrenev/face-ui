import { test, expect, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const render = (page: Page, kind: string, props = {}, options = {}) =>
  page.evaluate(
    ({ kind, props, options }) =>
      (window as any).renderRange(kind, props, options),
    { kind, props, options },
  )
export function registerProgressCases(route: string) {
  test.beforeEach(async ({ page }) => {
    await page.goto(route)
    await page.waitForFunction(
      () => typeof (window as any).renderRange === 'function',
    )
  })
  for (const kind of ['progress', 'meter']) {
    const role = kind === 'progress' ? 'progressbar' : 'meter'
    const node = (page: Page) => page.getByRole(role)
    const track = (page: Page) => page.locator('.uf-range-indicator__track')
    const fill = (page: Page) => page.locator('.uf-range-indicator__indicator')
    test(`${kind}: accessible visible, native and external names`, async ({
      page,
    }) => {
      await render(page, kind, { showValue: true })
      await expect(
        page.getByRole(role, { name: 'Transfer', exact: true }),
      ).toBeVisible()
      await render(page, kind, { 'aria-label': 'Native' }, { empty: true })
      await expect(
        page.getByRole(role, { name: 'Native', exact: true }),
      ).toBeVisible()
      await expect(page.locator('.uf-range-indicator__header')).toHaveCount(0)
      await render(page, kind, {
        'aria-label': 'Native',
        'aria-labelledby': 'external',
      })
      await expect(
        page.getByRole(role, { name: 'External label', exact: true }),
      ).toBeVisible()
    })
    test(`${kind}: exact fraction fills linear width including zero and both bounds`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const [value, max, pct] of [
        [0, 100, 0],
        [0.25, 100, 0.25],
        [28, 100, 28],
        [3, 7, 300 / 7],
        [99.99, 100, 99.99],
        [150, 100, 100],
        [-1, 100, 0],
      ]) {
        await render(page, kind, { value, max })
        const width = (await track(page).boundingBox())!.width
        expect(
          ((await fill(page).boundingBox())!.width / width) * 100,
        ).toBeCloseTo(pct, 1)
        await expect(node(page)).toHaveAttribute(
          'aria-valuenow',
          String(Math.max(0, Math.min(max, value))),
        )
      }
    })
    test(`${kind}: ring keeps diameter and transparent center while fraction changes`, async ({
      page,
    }) => {
      let diameter = 0
      for (const value of [0, 0.25, 28, 99.99, 100]) {
        await render(page, kind, { shape: 'circle', value, showValue: true })
        const outer = (await track(page).boundingBox())!,
          inner = (await fill(page).boundingBox())!
        expect(inner.width).toBeCloseTo(outer.width, 1)
        expect(outer.height).toBeCloseTo(outer.width, 1)
        if (diameter) expect(outer.width).toBe(diameter)
        diameter = outer.width
        const css = await fill(page).evaluate((el) => {
          const s = getComputedStyle(el)
          return { background: s.backgroundImage, mask: s.maskImage }
        })
        expect(css.background).toContain('conic-gradient')
        expect(parseFloat(css.background.match(/([\d.]+)%/)![1])).toBeCloseTo(
          value,
          3,
        )
        expect(css.mask).toContain('radial-gradient')
        await expect(track(page)).toHaveCSS(
          'background-color',
          'rgba(0, 0, 0, 0)',
        )
      }
    })
    test(`${kind}: showValue and formatter update visible and spoken values independently`, async ({
      page,
    }) => {
      await render(
        page,
        kind,
        { value: 7, max: 10, showValue: true },
        { format: true },
      )
      await expect(node(page)).toHaveAttribute(
        'aria-valuetext',
        '7 из 10 файлов',
      )
      await expect(page.locator('.uf-range-indicator__value')).toHaveText(
        '7 из 10 файлов',
      )
      await render(page, kind, { label: null, showValue: true })
      const valueBox = (await page
          .locator('.uf-range-indicator__value')
          .boundingBox())!,
        trackBox = (await track(page).boundingBox())!
      expect(valueBox.x + valueBox.width).toBeCloseTo(
        trackBox.x + trackBox.width,
        0,
      )
      await render(
        page,
        kind,
        { value: 7, max: 10, showValue: false },
        { format: true },
      )
      await expect(page.locator('.uf-range-indicator__value')).toHaveCount(0)
      await expect(node(page)).toHaveAttribute(
        'aria-valuetext',
        '7 из 10 файлов',
      )
      await render(page, kind, {
        value: 99.99,
        showValue: true,
        'aria-valuetext': 'Almost complete',
      })
      await expect(page.locator('.uf-range-indicator__value')).toHaveText('99%')
      await expect(node(page)).toHaveAttribute(
        'aria-valuetext',
        'Almost complete',
      )
    })
    for (const theme of ['light', 'dark'])
      test(`${kind}: independent tones affect both shapes in ${theme} theme`, async ({
        page,
      }) => {
        for (const shape of ['linear', 'circle']) {
          const colors = new Set<string>()
          for (const tone of [
            'neutral',
            'positive',
            'warning',
            'destructive',
          ]) {
            await render(page, kind, { shape, tone }, { theme })
            colors.add(
              await fill(page).evaluate((el) => {
                const s = getComputedStyle(el)
                return s.backgroundColor + s.backgroundImage
              }),
            )
            await expect(node(page)).toHaveAttribute('aria-valuenow', '28')
          }
          expect(colors.size).toBe(4)
        }
      })
    for (const direction of ['ltr', 'rtl'])
      test(`${kind}: long text wraps without overlap at narrow width, zoom and ${direction}`, async ({
        page,
      }) => {
        for (const shape of ['linear', 'circle']) {
          await render(
            page,
            kind,
            {
              shape,
              label: 'VeryLongUnbrokenLabel'.repeat(8),
              showValue: true,
            },
            { width: 240, zoom: 2, direction, format: true },
          )
          await expect(page.locator('.uf-range-indicator__title')).toHaveCSS(
            'text-align',
            'start',
          )
          await expect(page.locator('.uf-range-indicator__value')).toHaveCSS(
            'text-align',
            'end',
          )
          const overflow = await node(page).evaluate(
            (el) => el.scrollWidth - el.clientWidth,
          )
          expect(overflow).toBeLessThanOrEqual(1)
          const title = (await page
              .locator('.uf-range-indicator__title')
              .boundingBox())!,
            value = (await page
              .locator('.uf-range-indicator__value')
              .boundingBox())!
          const intersection =
            Math.max(
              0,
              Math.min(title.x + title.width, value.x + value.width) -
                Math.max(title.x, value.x),
            ) *
            Math.max(
              0,
              Math.min(title.y + title.height, value.y + value.height) -
                Math.max(title.y, value.y),
            )
          expect(intersection).toBe(0)
        }
      })
    test(`${kind}: membrane owns spacing and hidden removes the entire boundary`, async ({
      page,
    }) => {
      await render(page, kind, { label: null })
      const active = page.locator('#frame > .uf-membrane')
      const outer = (await active.boundingBox())!,
        inner = (await node(page).boundingBox())!
      expect(outer.width).toBeGreaterThan(inner.width)
      expect(inner.x).toBeGreaterThan(outer.x)
      await render(page, kind, { label: null, membrane: false })
      await expect(active).toHaveAttribute('data-membrane-disabled', '')
      const frame = (await page.locator('#frame').boundingBox())!
      expect((await node(page).boundingBox())!.width).toBeCloseTo(
        frame.width,
        1,
      )
      await render(page, kind, { hidden: true })
      await expect(active).toBeHidden()
      expect((await page.locator('#frame').boundingBox())!.height).toBe(0)
    })
    test(`${kind}: native root attributes/ref and default passive keyboard behavior`, async ({
      page,
    }) => {
      await render(page, kind, {
        id: 'owned',
        className: 'consumer',
        style: { opacity: 0.7 },
        dir: 'rtl',
        'aria-describedby': 'description',
        title: 'Help',
      })
      await expect(node(page)).toHaveId('owned')
      await expect(node(page)).toHaveClass(/consumer/)
      await expect(node(page)).toHaveCSS('opacity', '0.7')
      await expect(node(page)).toHaveCSS('direction', 'rtl')
      await expect(node(page)).toHaveAccessibleDescription('Details')
      expect(
        await node(page).evaluate((el) => el === (window as any).rangeRoot),
      ).toBe(true)
      await page.locator('#before').focus()
      await page.keyboard.press('Tab')
      await expect(page.locator('#after')).toBeFocused()
      await render(page, kind, { tabIndex: 0 })
      await page.locator('#before').focus()
      await page.keyboard.press('Tab')
      await expect(node(page)).toBeFocused()
    })
    test(`${kind}: foreign data-part labels keep their geometry and color`, async ({
      page,
    }) => {
      for (const shape of ['linear', 'circle']) {
        await render(page, kind, { shape }, { foreign: true })
        await expect(page.getByTestId('foreign')).toHaveCSS(
          'background-color',
          'rgb(123, 45, 67)',
        )
        await expect(page.getByTestId('foreign')).toHaveCSS('width', '77px')
        await expect(page.getByTestId('foreign')).toHaveCSS('height', '19px')
      }
    })
    test(`${kind}: forced colors retains linear and circular readings`, async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'WebKit does not emulate forced colors',
      )
      await page.emulateMedia({ forcedColors: 'active' })
      for (const shape of ['linear', 'circle']) {
        await render(page, kind, { shape, showValue: true })
        await expect(fill(page)).toHaveCSS('forced-color-adjust', 'none')
        await expect(node(page)).toBeVisible()
        const distinct = await fill(page).evaluate(
          (el) =>
            getComputedStyle(el).getPropertyValue('--uf-range-fill-bg') !==
            getComputedStyle(el).getPropertyValue('--uf-range-track-bg'),
        )
        expect(distinct).toBe(true)
      }
    })
    test(`${kind}: gallery defaults render a named real component`, async ({
      page,
    }) => {
      await page.evaluate(
        (kind) =>
          (window as any).renderRangeGallery(
            kind === 'meter' ? 'Meter' : 'Progress',
          ),
        kind,
      )
      await expect(node(page)).toHaveCount(1)
      await expect(node(page)).toHaveAccessibleName(
        kind === 'meter' ? 'Storage used' : 'Uploading assets',
      )
    })
    test(`${kind}: axe verifies named range semantics in both shapes`, async ({
      page,
    }) => {
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
      for (const shape of ['linear', 'circle']) {
        await render(page, kind, { shape, showValue: true })
        const violations = await page.evaluate(
          async () =>
            (
              await (window as any).axe.run('#frame', {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                },
              })
            ).violations,
        )
        expect(violations).toEqual([])
      }
    })
  }
  test('Meter negative/nonzero range determines fraction without task completion state', async ({
    page,
  }) => {
    await render(page, 'meter', {
      min: -20,
      max: 20,
      value: 0,
      showValue: true,
    })
    await expect(page.getByRole('meter')).toHaveAttribute(
      'aria-valuemin',
      '-20',
    )
    await expect(page.getByRole('meter')).toHaveAttribute(
      'data-state',
      'partial',
    )
    await expect(page.locator('.uf-range-indicator__value')).toHaveText('50%')
  })
  for (const direction of ['ltr', 'rtl'])
    test(`unknown task moves along ${direction} inline axis then becomes known`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await render(
        page,
        'progress',
        { indeterminate: true, showValue: true },
        { direction },
      )
      const fill = page.locator('.uf-range-indicator__indicator'),
        node = page.getByRole('progressbar')
      await expect(node).not.toHaveAttribute('aria-valuenow')
      await expect(page.locator('.uf-range-indicator__value')).toHaveCount(0)
      const positions = await fill.evaluate((el) => {
        const a = el.getAnimations().find((a) => 'animationName' in a)!
        a.pause()
        a.currentTime = 0
        const start = el.getBoundingClientRect().x
        a.currentTime = Number(a.effect!.getTiming().duration) * 0.999
        return [start, el.getBoundingClientRect().x]
      })
      expect(Math.sign(positions[1] - positions[0])).toBe(
        direction === 'ltr' ? 1 : -1,
      )
      await render(page, 'progress', { value: 70, showValue: true })
      await expect(node).toHaveAttribute('aria-valuenow', '70')
      await expect(fill).toHaveCSS('animation-name', 'none')
    })
  test('reduced motion keeps a static unknown segment visible in both shapes', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const shape of ['linear', 'circle']) {
      await render(page, 'progress', {
        shape,
        indeterminate: true,
        showValue: true,
      })
      await expect(page.locator('.uf-range-indicator__indicator')).toHaveCSS(
        'animation-name',
        'none',
      )
      await expect(page.locator('.uf-range-indicator__indicator')).toBeVisible()
      await expect(page.getByRole('progressbar')).not.toHaveAttribute(
        'aria-valuetext',
      )
    }
  })
}
