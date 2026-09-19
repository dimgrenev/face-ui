import { test, expect, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/rating.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { renderRating: render } = hooks<Hooks>()
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
test.beforeEach(async ({ page }) => {
  await open(page, 'rating')
})
test('unrated native Tab/Space choose a score, one callback, no accidental submit', { tag: ['@focus', '@native'] }, async ({
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
for (const direction of ['ltr', 'rtl'])
  test(`${direction} keyboard follows visual direction, wraps and supports Home/End`, { tag: ['@focus'] }, async ({
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
test('hover previews all fills and never leaves the old selection painted beyond preview', { tag: ['@css', '@pointer'] }, async ({
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
test('keyboard clears an unrelated mouse preview', { tag: ['@css', '@pointer'] }, async ({ page }) => {
  await render(page, { defaultValue: 4 }, { fresh: true })
  await radio(page, 1).hover()
  await radio(page, 4).focus()
  await page.keyboard.press('ArrowRight')
  await expect(radio(page, 5)).toBeChecked()
  await expect(fills(page).nth(4)).toHaveCSS('width', '12.5px')
})
for (const direction of ['ltr', 'rtl'])
  test(`${direction} half choices have usable hit boxes and share one centered star`, { tag: ['@layout', '@pointer'] }, async ({
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
test('touch selects half score without a stuck hover preview', { tag: ['@pointer', '@css'] }, async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 360, height: 720 },
  })
  const page = await context.newPage()
  await open(page, 'rating')
  await render(page, { allowHalf: true }, { fresh: true })
  await radio(page, 2.5).tap()
  await expect(radio(page, 2.5)).toBeChecked()
  await expect(fills(page).nth(3)).toHaveCSS('width', '0px')
  expect(await changes(page)).toEqual([2.5])
  await context.close()
})
test('canonical membrane padding focuses and activates exactly once; toggling preserves controls', { tag: ['@pointer', '@layout'] }, async ({
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
test('disabled state excludes editing/form data and applies opacity once', { tag: ['@css', '@native'] }, async ({
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
test('fieldset disabled state blocks native input and membrane activation', { tag: ['@native', '@pointer'] }, async ({
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
test('required native validity, exact submission and original-default reset', { tag: ['@native'] }, async ({
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
test('canceled and controlled resets preserve accepted value', { tag: ['@native'] }, async ({
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
test('external form rendered later owns validation, data and reset', { tag: ['@native'] }, async ({
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
test('readOnly retains exact average and native form value without editing, dimming or required validation', { tag: ['@css', '@native', '@focus'] }, async ({
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
test('shrinking max recovers removed focus; the stored score returns with the stars', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { max: 10, defaultValue: 8 }, { fresh: true })
  await radio(page, 8).focus()
  await render(page, { max: 3 })
  await expect(radio(page, 3)).toBeFocused()
  await expect(radio(page, 3)).toBeChecked()
  expect(await data(page)).toEqual([['score', '3']])
  await render(page, { max: 10 })
  await expect(radio(page, 8)).toBeChecked()
  expect(await changes(page)).toEqual([])
})
test('removing a half choice preserves whole controls and recovers removed focus', { tag: ['@focus'] }, async ({
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
for (const theme of ['light', 'dark'])
  test(`${theme} narrow/zoomed long labels and ten half stars wrap without horizontal overflow`, { tag: ['@layout'] }, async ({
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
test('reduced motion keeps precise fill and a visible keyboard focus indicator', { tag: ['@css', '@focus'] }, async ({
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
test('forced colors preserves star ink and focus', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
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
test('editable and readonly variants pass accessible-name/role checks', { tag: ['@a11y'] }, async ({
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

test('with a shared name the browser never moves the selection by itself', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  const checked = page.locator('.uf-rating input:checked')
  // A parent that refuses every change: arrows move focus, the selection stays.
  await render(page, { value: 1 }, { fresh: true })
  await radio(page, 1).focus()
  await page.keyboard.press('ArrowRight')
  await expect(radio(page, 2)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(radio(page, 3)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(checked).toHaveCount(1)
  await expect(radio(page, 1)).toBeChecked()
  expect(await data(page)).toEqual([['score', '1']])
  expect(await changes(page)).toEqual([2, 3, 3])
  // A canceled click cancels the keyboard choice as it cancels the pointer one.
  await render(page, { defaultValue: 1 }, { fresh: true, cancelCapture: true })
  await radio(page, 1).focus()
  await page.keyboard.press('ArrowUp')
  await expect(radio(page, 5)).toBeFocused()
  await radio(page, 2).locator('..').click()
  await expect(radio(page, 1)).toBeChecked()
  expect(await data(page)).toEqual([['score', '1']])
  // Accepted: exactly one step per arrow, never a second native one.
  await render(page, { defaultValue: 1 }, { fresh: true })
  await radio(page, 1).focus()
  await page.keyboard.press('ArrowDown')
  await expect(radio(page, 2)).toBeChecked()
  await page.keyboard.press('ArrowLeft')
  await expect(radio(page, 1)).toBeChecked()
  expect(await data(page)).toEqual([['score', '1']])
  expect(await changes(page)).toEqual([2, 3, 3, 2, 1])
})
for (const direction of ['ltr', 'rtl'])
  test(`${direction} field label, description and error name and describe the group`, { tag: ['@layout', '@a11y'] }, async ({
    page,
  }) => {
    await render(
      page,
      {
        required: true,
        label: 'Quality',
        description: 'Shared with the author',
        error: 'Choose a score',
        labelPosition: 'start',
      },
      { fresh: true, direction },
    )
    const group = page.getByRole('radiogroup', { name: 'Quality', exact: true })
    await expect(group).toHaveAccessibleDescription(
      'Shared with the author Choose a score',
    )
    await expect(group).toHaveAttribute('aria-invalid', 'true')
    for (const choice of await radios(page).all())
      await expect(choice).toHaveAccessibleDescription(
        'Shared with the author Choose a score',
      )
    const label = (await group
      .locator('[data-scope="field"][data-part="label"]')
      .boundingBox())!
    const list = (await page.locator('.uf-rating__list').boundingBox())!
    // Beside the stars at their inline start, centered on the first star's line.
    if (direction === 'ltr')
      expect(label.x + label.width).toBeLessThanOrEqual(list.x + 1)
    else expect(list.x + list.width).toBeLessThanOrEqual(label.x + 1)
    const first = (await radio(page, 1).locator('..').boundingBox())!
    expect(
      Math.abs(label.y + label.height / 2 - (first.y + first.height / 2)),
    ).toBeLessThanOrEqual(2)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(
        document.querySelector('[data-scope="rating"][data-part="root"]'),
      )
      return result.violations.map((v: any) => v.id)
    })
    expect(violations).toEqual([])
  })
