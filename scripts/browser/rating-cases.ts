import { test, expect, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const render = (page: Page, props = {}, options = {}) =>
  page.evaluate(
    ({ props, options }) => (window as any).renderRating(props, options),
    { props, options },
  )
const radios = (page: Page) => page.getByRole('radio')
const radio = (page: Page, value: number) =>
  page.getByRole('radio', {
    name: `${value} star${value === 1 ? '' : 's'}`,
    exact: true,
  })
const data = (page: Page, external = false) =>
  page.evaluate(
    (external) => (window as any).ratingFormData(external),
    external,
  )
const changes = (page: Page) =>
  page.evaluate(() => (window as any).ratingEvents)
const fills = (page: Page) => page.locator('.uf-rating__fill')
export function registerRatingCases(route: string) {
  test.beforeEach(async ({ page }) => {
    await page.goto(route)
    await page.waitForFunction(
      () => typeof (window as any).renderRating === 'function',
    )
  })
  test('native attrs, visible/empty/native/external names share the forwarded root', async ({
    page,
  }) => {
    await render(page, {
      id: 'score',
      className: 'custom',
      dir: 'rtl',
      title: 'Review',
      'aria-describedby': 'description',
    })
    const group = page.getByRole('radiogroup', {
      name: 'Your rating',
      exact: true,
    })
    await expect(group).toHaveId('score')
    await expect(group).toHaveClass(/custom/)
    await expect(group).toHaveCSS('direction', 'rtl')
    await expect(group).toHaveAccessibleDescription('Details')
    expect(
      await group.evaluate((node) => node === (window as any).ratingRoot),
    ).toBe(true)
    await render(page, { 'aria-label': 'Native' }, { empty: true })
    await expect(
      page.getByRole('radiogroup', { name: 'Native', exact: true }),
    ).toBeVisible()
    await expect(page.locator('[data-part="label"]')).toHaveCount(0)
    await render(page, {
      'aria-label': 'Native',
      'aria-labelledby': 'external',
    })
    await expect(
      page.getByRole('radiogroup', { name: 'External label', exact: true }),
    ).toBeVisible()
  })
  test('unrated native Tab/Space choose a score, one callback, no accidental submit', async ({
    page,
  }) => {
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(radio(page, 1)).toBeFocused()
    expect(await data(page)).toEqual([])
    await page.keyboard.press('Space')
    await expect(radio(page, 1)).toBeChecked()
    expect(await data(page)).toEqual([['score', '1']])
    expect(await changes(page)).toEqual([1])
    await page.keyboard.press('Tab')
    await expect(page.locator('#reset')).toBeFocused()
    expect(
      await page.evaluate(() => (window as any).ratingSubmitted),
    ).toBeUndefined()
  })
  test('reselecting a score preserves it without a second event', async ({
    page,
  }) => {
    await radio(page, 3).click()
    await radio(page, 3).click()
    await expect(radio(page, 3)).toBeChecked()
    expect(await changes(page)).toEqual([3])
  })
  test('controlled refusal separates accepted selection/form value from keyboard focus', async ({
    page,
  }) => {
    await render(page, { value: 2 })
    await radio(page, 2).focus()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 3)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 4)).toBeFocused()
    await expect(radio(page, 2)).toBeChecked()
    expect(await data(page)).toEqual([['score', '2']])
    expect(await changes(page)).toEqual([3, 4])
  })
  test('controlled acceptance and external changes remain aligned without stealing focus', async ({
    page,
  }) => {
    await render(page, { value: 2 }, { accept: true })
    await radio(page, 4).click()
    await expect(radio(page, 4)).toBeChecked()
    expect(await changes(page)).toEqual([4])
    await radio(page, 4).focus()
    await render(page, { value: 1 })
    await expect(radio(page, 1)).toBeChecked()
    await expect(radio(page, 4)).toBeFocused()
    expect(await changes(page)).toEqual([4])
  })
  for (const direction of ['ltr', 'rtl'])
    test(`${direction} keyboard follows visual direction, wraps and supports Home/End`, async ({
      page,
    }) => {
      await render(
        page,
        { allowHalf: true, defaultValue: 2.5 },
        { fresh: true, direction },
      )
      await radio(page, 2.5).focus()
      await page.keyboard.press('ArrowRight')
      await expect(radio(page, direction === 'rtl' ? 2 : 3)).toBeChecked()
      await page.keyboard.press('ArrowDown')
      await expect(radio(page, direction === 'rtl' ? 2.5 : 3.5)).toBeChecked()
      await page.keyboard.press('Home')
      await expect(radio(page, 0.5)).toBeChecked()
      await page.keyboard.press('ArrowUp')
      await expect(radio(page, 5)).toBeChecked()
      await page.keyboard.press('ArrowDown')
      await expect(radio(page, 0.5)).toBeChecked()
      await page.keyboard.press('End')
      await expect(radio(page, 5)).toBeChecked()
    })
  for (const options of [{ cancelClick: true }, { cancelCapture: true }])
    test(`${Object.keys(options)[0]} cancels native changes`, async ({
      page,
    }) => {
      await render(page, { defaultValue: 2 }, { fresh: true, ...options })
      await radio(page, 4).click()
      await expect(radio(page, 2)).toBeChecked()
      expect(await changes(page)).toEqual([])
      expect(await data(page)).toEqual([['score', '2']])
    })
  test('consumer can cancel keyboard behavior', async ({ page }) => {
    await render(page, { defaultValue: 2 }, { fresh: true, cancelKey: true })
    await radio(page, 2).focus()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 2)).toBeChecked()
    await expect(radio(page, 2)).toBeFocused()
    expect(await changes(page)).toEqual([])
  })
  test('hover previews all fills and never leaves the old selection painted beyond preview', async ({
    page,
  }) => {
    await render(page, { defaultValue: 4 }, { fresh: true })
    await radio(page, 2).hover()
    await expect(fills(page).nth(0)).toHaveCSS('width', '12.5px')
    await expect(fills(page).nth(1)).toHaveCSS('width', '12.5px')
    await expect(fills(page).nth(3)).toHaveCSS('width', '0px')
    await expect(radio(page, 4)).toBeChecked()
    expect(await changes(page)).toEqual([])
    await page.locator('#after').hover()
    await expect(fills(page).nth(3)).toHaveCSS('width', '12.5px')
    await expect(fills(page).nth(4)).toHaveCSS('width', '0px')
  })
  test('keyboard clears an unrelated mouse preview', async ({ page }) => {
    await render(page, { defaultValue: 4 }, { fresh: true })
    await radio(page, 1).hover()
    await radio(page, 4).focus()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 5)).toBeChecked()
    await expect(fills(page).nth(4)).toHaveCSS('width', '12.5px')
  })
  for (const direction of ['ltr', 'rtl'])
    test(`${direction} half choices have usable hit boxes and share one centered star`, async ({
      page,
    }) => {
      await render(
        page,
        { allowHalf: true, defaultValue: 2.5 },
        { fresh: true, direction },
      )
      await expect(radios(page)).toHaveCount(10)
      await expect(page.locator('.uf-rating__glyph')).toHaveCount(5)
      const boxes = await radios(page).evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect()
          return { x: r.x, y: r.y, w: r.width, h: r.height }
        }),
      )
      expect(boxes.every((b) => b.w >= 24 && b.h >= 24)).toBe(true)
      expect(
        direction === 'rtl' ? boxes[0].x > boxes[1].x : boxes[0].x < boxes[1].x,
      ).toBe(true)
      const star = (await page
          .locator('.uf-rating__star')
          .nth(2)
          .boundingBox())!,
        glyph = (await page.locator('.uf-rating__glyph').nth(2).boundingBox())!
      expect(glyph.x + glyph.width / 2).toBeCloseTo(star.x + star.width / 2, 1)
      expect(glyph.y + glyph.height / 2).toBeCloseTo(
        star.y + star.height / 2,
        1,
      )
      await expect(fills(page).nth(2)).toHaveCSS('width', '6.25px')
      const clip = (await fills(page).nth(2).boundingBox())!
      expect(
        direction === 'rtl'
          ? clip.x > glyph.x + glyph.width / 2 - 1
          : clip.x < glyph.x + glyph.width / 2,
      ).toBe(true)
      await radio(page, 3.5).click()
      await expect(radio(page, 3.5)).toBeChecked()
      expect(await data(page)).toEqual([['score', '3.5']])
      await render(
        page,
        { allowHalf: true, style: { '--uf-control-height': '16px' } },
        { direction },
      )
      const smallTargets = await radios(page).evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect()
          return { width: box.width, height: box.height }
        }),
      )
      expect(
        smallTargets.every((box) => box.width >= 24 && box.height >= 24),
      ).toBe(true)
    })
  test('touch selects half score without a stuck hover preview', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 360, height: 720 },
    })
    const page = await context.newPage()
    // Use the configured absolute fixture route for compiled consumer runs as well.
    const base = test.info().project.use.baseURL as string
    await page.goto(new URL(route, base).href)
    await page.waitForFunction(
      () => typeof (window as any).renderRating === 'function',
    )
    await render(page, { allowHalf: true }, { fresh: true })
    await radio(page, 2.5).tap()
    await expect(radio(page, 2.5)).toBeChecked()
    await expect(fills(page).nth(3)).toHaveCSS('width', '0px')
    expect(await changes(page)).toEqual([2.5])
    await context.close()
  })
  test('canonical membrane padding focuses and activates exactly once; toggling preserves controls', async ({
    page,
  }) => {
    await render(page, { defaultValue: 2 }, { fresh: true })
    const input = radio(page, 4)
    const membrane = input.locator('..').locator('..')
    const box = (await membrane.boundingBox())!
    await page.mouse.click(box.x + 0.5, box.y + box.height / 2)
    await expect(input).toBeChecked()
    await expect(input).toBeFocused()
    expect(await changes(page)).toEqual([4])
    await input.evaluate((node) =>
      Object.assign(window, { savedRatingInput: node }),
    )
    await render(page, { membrane: false })
    expect(
      await input.evaluate((node) => node === (window as any).savedRatingInput),
    ).toBe(true)
    await expect(input).toBeChecked()
    await expect(input).toBeFocused()
    await expect(page.locator('[data-membrane-interactive]')).toHaveCount(0)
  })
  test('disabled state excludes editing/form data and applies opacity once', async ({
    page,
  }) => {
    await render(
      page,
      { defaultValue: 2, disabled: true, required: true },
      { fresh: true },
    )
    await expect(radio(page, 2)).toBeDisabled()
    await radio(page, 4).evaluate((node: HTMLInputElement) => node.click())
    await expect(radio(page, 2)).toBeChecked()
    expect(await data(page)).toEqual([])
    expect(await changes(page)).toEqual([])
    const opacity = await page.getByRole('radiogroup').evaluate((node) => ({
      root: getComputedStyle(node).opacity,
      list: getComputedStyle(node.querySelector('.uf-rating__list')!).opacity,
      token: getComputedStyle(node)
        .getPropertyValue('--uf-color-disabled-opacity')
        .trim(),
    }))
    expect(Number(opacity.root)).toBe(Number(opacity.token))
    expect(opacity.list).toBe('1')
  })
  test('fieldset disabled state blocks native input and membrane activation', async ({
    page,
  }) => {
    await render(
      page,
      { defaultValue: 2, required: true },
      { fresh: true, fieldsetDisabled: true },
    )
    await expect(radio(page, 2)).toBeDisabled()
    const box = (await radio(page, 4)
      .locator('..')
      .locator('..')
      .boundingBox())!
    await page.mouse.click(box.x + 0.5, box.y + box.height / 2)
    await expect(radio(page, 2)).toBeChecked()
    expect(await data(page)).toEqual([])
    expect(await changes(page)).toEqual([])
  })
  test('required native validity, exact submission and original-default reset', async ({
    page,
  }) => {
    await render(page, { required: true }, { fresh: true })
    expect(
      await page
        .locator('#review')
        .evaluate((form: HTMLFormElement) => form.checkValidity()),
    ).toBe(false)
    await radio(page, 4).click()
    expect(await data(page)).toEqual([['score', '4']])
    expect(
      await page
        .locator('#review')
        .evaluate((form: HTMLFormElement) => form.checkValidity()),
    ).toBe(true)
    await render(page, { required: true, defaultValue: 3 })
    await page.locator('#reset').click()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    expect(await data(page)).toEqual([])
    expect(await changes(page)).toEqual([4])
  })
  test('canceled and controlled resets preserve accepted value', async ({
    page,
  }) => {
    await render(page, { defaultValue: 2 }, { fresh: true, cancelReset: true })
    await radio(page, 4).click()
    await page.locator('#reset').click()
    await expect(radio(page, 4)).toBeChecked()
    await render(page, { value: 3 })
    await page.locator('#reset').click()
    await expect(radio(page, 3)).toBeChecked()
    expect(await data(page)).toEqual([['score', '3']])
    expect(await changes(page)).toEqual([4])
  })
  test('external form rendered later owns validation, data and reset', async ({
    page,
  }) => {
    await render(page, { required: true }, { fresh: true, external: true })
    expect(
      await page
        .locator('#external-form')
        .evaluate((form: HTMLFormElement) => form.checkValidity()),
    ).toBe(false)
    await radio(page, 3).click()
    expect(await data(page)).toEqual([])
    expect(await data(page, true)).toEqual([['score', '3']])
    await page.locator('#external-reset').click()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    expect(await data(page, true)).toEqual([])
  })
  test('unnamed choices never leak a generated key into FormData', async ({
    page,
  }) => {
    await render(page, { defaultValue: 2 }, { fresh: true, unnamed: true })
    expect(await data(page)).toEqual([])
    await radio(page, 4).click()
    expect(await data(page)).toEqual([])
  })
  test('readOnly retains exact average and native form value without editing, dimming or required validation', async ({
    page,
  }) => {
    await render(page, { value: 4.2, readOnly: true, required: true })
    const meter = page.getByRole('meter', { name: 'Your rating', exact: true })
    await expect(meter).toHaveAttribute('aria-valuenow', '4.2')
    await expect(meter).toHaveAttribute('aria-valuetext', '4.2 stars')
    await expect(radios(page)).toHaveCount(0)
    expect(await data(page)).toEqual([['score', '4.2']])
    await expect(meter).toHaveCSS('opacity', '1')
    await expect(fills(page).nth(4)).toHaveCSS('width', '2.5px')
    await meter.hover()
    expect(await changes(page)).toEqual([])
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#reset')).toBeFocused()
    await render(page, { value: 0, readOnly: true, required: true })
    expect(await data(page)).toEqual([])
    expect(
      await page
        .locator('#review')
        .evaluate((form: HTMLFormElement) => form.checkValidity()),
    ).toBe(true)
  })
  test('localization names half options and exact readonly values', async ({
    page,
  }) => {
    await render(page, { allowHalf: true }, { format: true })
    await expect(
      page.getByRole('radio', { name: '0.5 из 5 звёзд', exact: true }),
    ).toBeVisible()
    await render(page, { value: 4.2, readOnly: true }, { format: true })
    await expect(page.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '4.2 из 5 звёзд',
    )
  })
  test('shrinking max recovers removed focus and does not resurrect the old score', async ({
    page,
  }) => {
    await render(page, { max: 10, defaultValue: 8 }, { fresh: true })
    await radio(page, 8).focus()
    await render(page, { max: 3 })
    await expect(radio(page, 3)).toBeFocused()
    await expect(radio(page, 3)).toBeChecked()
    await render(page, { max: 10 })
    await expect(radio(page, 3)).toBeChecked()
    expect(await changes(page)).toEqual([])
  })
  test('removing a half choice preserves whole controls and recovers removed focus', async ({
    page,
  }) => {
    await render(page, { allowHalf: true, defaultValue: 2.5 }, { fresh: true })
    await radio(page, 2).evaluate((node) =>
      Object.assign(window, { savedRatingInput: node }),
    )
    await radio(page, 2.5).focus()
    await render(page, { allowHalf: false })
    await expect(radio(page, 3)).toBeFocused()
    await expect(radio(page, 3)).toBeChecked()
    expect(
      await radio(page, 2).evaluate(
        (node) => node === (window as any).savedRatingInput,
      ),
    ).toBe(true)
    expect(await changes(page)).toEqual([])
  })
  test('autofocus is mount-only and does not override later user focus', async ({
    page,
  }) => {
    await render(page, { autoFocus: true, defaultValue: 2 }, { fresh: true })
    await expect(radio(page, 2)).toBeFocused()
    await page.locator('#after').focus()
    await render(page, { autoFocus: true, allowHalf: true })
    await expect(page.locator('#after')).toBeFocused()
  })
  for (const theme of ['light', 'dark'])
    test(`${theme} narrow/zoomed long labels and ten half stars wrap without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      await render(
        page,
        {
          max: 10,
          allowHalf: true,
          label:
            'Оченьдлиннаяподписьбезпробеловдляпроверкипереносовсодержимого',
        },
        { fresh: true, theme, width: 288 },
      )
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320)
      const stars = await page
        .locator('.uf-rating__star')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect()
            return { x: r.x, y: r.y, w: r.width, h: r.height }
          }),
        )
      expect(new Set(stars.map((s) => s.y)).size).toBeGreaterThan(1)
      const row = await page.locator('.uf-rating__list').boundingBox()
      expect(stars.every((s) => s.x + s.w <= row!.x + row!.width + 0.1)).toBe(
        true,
      )
      await render(
        page,
        { max: 5, allowHalf: true },
        { theme, width: 288, zoom: 2 },
      )
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320)
    })
  test('reduced motion keeps precise fill and a visible keyboard focus indicator', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await render(page, { allowHalf: true })
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    const control = radio(page, 0.5).locator('..')
    await expect(control).toHaveCSS('outline-style', 'solid')
    await expect(control).toHaveCSS('outline-width', '2px')
    await expect(fills(page).nth(0)).toHaveCSS('width', '6.25px')
  })
  test('forced colors preserves star ink and focus', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors')
    await page.emulateMedia({ forcedColors: 'active' })
    await render(page, { defaultValue: 3 }, { fresh: true })
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(radio(page, 3).locator('..')).toHaveCSS('outline-width', '2px')
    const paint = await fills(page)
      .nth(1)
      .locator('svg')
      .evaluate((node) => getComputedStyle(node).fill)
    expect(paint).not.toBe('none')
    expect(paint).not.toBe('rgba(0, 0, 0, 0)')
  })
  test('editable and readonly variants pass accessible-name/role checks', async ({
    page,
  }) => {
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    for (const props of [
      { allowHalf: true },
      { value: 4.2, readOnly: true },
      { disabled: true, value: 2 },
    ]) {
      await render(page, props)
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(
          document.querySelector('[data-scope="rating"][data-part="root"]'),
        )
        return result.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
        }))
      })
      expect(violations).toEqual([])
    }
  })
  test('generated gallery Rating remains a working input', async ({ page }) => {
    await page.evaluate(() => (window as any).renderRatingGallery())
    await expect(
      page.getByRole('radiogroup', { name: 'Your rating', exact: true }),
    ).toBeVisible()
    await radio(page, 4).click()
    await expect(radio(page, 4)).toBeChecked()
    await radio(page, 4).click()
    await expect(radio(page, 4)).toBeChecked()
  })

  test('releasing control continues from the last accepted score, not a rejected proposal', async ({
    page,
  }) => {
    await render(page, { value: 4, defaultValue: 1 }, { fresh: true })
    await radio(page, 2).click()
    await render(page)
    await expect(radio(page, 4)).toBeChecked()
    expect(await data(page)).toEqual([['score', '4']])
    await radio(page, 3).click()
    await expect(radio(page, 3)).toBeChecked()
    expect(await changes(page)).toEqual([2, 3])
  })
}
