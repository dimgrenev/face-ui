import { test, expect, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/slider.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { renderSlider: render } = hooks<Hooks>()
const controls = (page: Page, kind = 'value') =>
  page.locator(`input[data-kind="${kind}"]`)
const values = (page: Page, kind = 'value') =>
  controls(page, kind).evaluateAll((nodes) =>
    nodes.map((node) => Number((node as HTMLInputElement).value)),
  )
const events = (page: Page, key = 'sliderEvents') =>
  page.evaluate((key) => (window as any)[key], key)
const data = (page: Page, external = false) =>
  page.evaluate(
    (external) => (window as any).sliderFormData(external),
    external,
  )
const point = (page: Page, ratio: number, vertical = false, rtl = false) =>
  page.locator('[data-part="track"]').evaluate(
    (node, { ratio, vertical, rtl }) => {
      const rect = node.getBoundingClientRect()
      return {
        x: vertical
          ? rect.left
          : rtl
            ? rect.right - rect.width * ratio
            : rect.left + rect.width * ratio,
        y: vertical ? rect.bottom - rect.height * ratio : rect.top,
      }
    },
    { ratio, vertical, rtl },
  )
const click = async (
  page: Page,
  ratio: number,
  vertical = false,
  rtl = false,
) => {
  const p = await point(page, ratio, vertical, rtl)
  await page.mouse.click(p.x, p.y)
}
test.beforeEach(async ({ page }) => {
  await open(page, 'slider')
})
for (const orientation of ['horizontal', 'vertical'] as const)
  for (const direction of ['ltr', 'rtl'])
    for (const showValue of [false, true])
      test(`crop hit targets stay separate from an independent playhead ${orientation}/${direction}/${showValue}`, { tag: ['@layout', '@pointer'] }, async ({
        page,
      }) => {
        await render(
          page,
          {
            orientation,
            showValue,
            defaultValue: 40,
            crop: true,
            defaultCropRange: { start: 60, end: 80 },
            clampToCrop: false,
          },
          { width: 240, direction },
        )
        const primary = (await controls(page).boundingBox())!
        for (const handle of await controls(page, 'crop').all()) {
          const box = (await handle.boundingBox())!
          const overlap =
            Math.max(
              0,
              Math.min(primary.x + primary.width, box.x + box.width) -
                Math.max(primary.x, box.x),
            ) *
            Math.max(
              0,
              Math.min(primary.y + primary.height, box.y + box.height) -
                Math.max(primary.y, box.y),
            )
          expect(overlap).toBe(0)
        }
        const markers = page.locator('.uf-slider__marker')
        for (const [index, ratio] of [0.6, 0.8].entries()) {
          const vertical = orientation === 'vertical',
            rtl = direction === 'rtl'
          const p = await point(page, ratio, vertical, rtl)
          const box = (await markers.nth(index).boundingBox())!
          const edge = vertical
            ? index === 0
              ? box.y
              : box.y + box.height
            : (index === 0) === rtl
              ? box.x
              : box.x + box.width
          expect(Math.abs(edge - (vertical ? p.y : p.x))).toBeLessThanOrEqual(
            1.1,
          )
        }
        const rail = page.locator('[data-slider-crop-track]')
        const railBox = (await rail.boundingBox())!
        await rail.click({
          position:
            orientation === 'vertical'
              ? { x: railBox.width / 2, y: railBox.height * 0.9 }
              : {
                  x: railBox.width * (direction === 'rtl' ? 0.9 : 0.1),
                  y: railBox.height / 2,
                },
        })
        await expect(controls(page)).toHaveValue('40')
        const nextCrop = await values(page, 'crop')
        expect(nextCrop[0]).toBeLessThan(60)
        expect(nextCrop[1]).toBe(80)
        expect(await events(page)).toEqual([])
        expect(await events(page, 'sliderCropEvents')).toHaveLength(1)
        expect(await events(page, 'sliderCropCommits')).toHaveLength(1)
      })
for (const showValue of [false, true])
  for (const orientation of ['horizontal', 'vertical'] as const)
    for (const direction of ['ltr', 'rtl']) {
      test(`keyboard and pointer share geometry ${showValue}/${orientation}/${direction}`, { tag: ['@layout', '@pointer', '@focus'] }, async ({
        page,
      }) => {
        const vertical = orientation === 'vertical',
          rtl = direction === 'rtl'
        await render(
          page,
          { showValue, orientation, defaultValue: 40 },
          { direction },
        )
        const input = controls(page)
        await expect
          .poll(async () => {
            const position = await point(page, 0.4, vertical, rtl),
              box = (await input.boundingBox())!
            return Math.abs(
              vertical
                ? box.y + box.height / 2 - position.y
                : box.x + box.width / 2 - position.x,
            )
          })
          .toBeLessThan(1)
        await input.focus()
        await page.keyboard.press('ArrowUp')
        await expect(input).toHaveValue('41')
        // Left and Right swap only on a horizontal RTL track.
        await page.keyboard.press(rtl && !vertical ? 'ArrowLeft' : 'ArrowRight')
        await expect(input).toHaveValue('42')
        await page.keyboard.press('PageUp')
        await expect(input).toHaveValue('52')
        await page.keyboard.press('End')
        await expect(input).toHaveValue('100')
        await page.keyboard.press('Home')
        await expect(input).toHaveValue('0')
        await click(page, 0.7, vertical, rtl)
        await expect(input).toHaveValue('70')
        // A number value commits numbers.
        expect(await events(page, 'sliderCommits')).toEqual([
          41, 42, 52, 100, 0, 70,
        ])
      })
    }
for (const showValue of [false, true]) {
  test(`stable identity across value presentation and membrane ${showValue}`, { tag: ['@focus', '@react'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: 40, showValue })
    await controls(page).focus()
    await page.keyboard.press('ArrowUp')
    await page.evaluate(() => {
      Object.assign(window, {
        previousRoot: (window as any).sliderRoot,
        previousInput: document.activeElement,
      })
    })
    await render(page, {
      defaultValue: 10,
      showValue: !showValue,
      membrane: false,
    })
    expect(
      await page.evaluate(
        () =>
          (window as any).previousRoot === (window as any).sliderRoot &&
          (window as any).previousInput === document.activeElement,
      ),
    ).toBe(true)
    await expect(controls(page)).toHaveValue('41')
  })
  test(`multi-thumb sorting, bounds, native tab order and coincidence ${showValue}`, { tag: ['@focus', '@pointer'] }, async ({
    page,
  }) => {
    await render(page, { defaultValue: [80, 20], showValue })
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(controls(page).nth(0)).toBeFocused()
    await page.keyboard.press('End')
    expect(await values(page)).toEqual([80, 80])
    await page.keyboard.press('Tab')
    await expect(controls(page).nth(1)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    expect(await values(page)).toEqual([80, 80])
    await click(page, 0.9)
    expect(await values(page)).toEqual([80, 90])
    await click(page, 0.1)
    expect(await values(page)).toEqual([10, 90])
  })
  test(`crop exists independently and refusal cannot alter the primary value ${showValue}`, { tag: ['@focus', '@native'] }, async ({
    page,
  }) => {
    await render(page, {
      showValue,
      crop: true,
      cropRange: { start: 20, end: 80 },
      defaultValue: 40,
    })
    await controls(page, 'crop').nth(0).focus()
    await page.keyboard.press('End')
    expect(await values(page)).toEqual([40])
    expect(await values(page, 'crop')).toEqual([20, 80])
    expect(await events(page)).toEqual([])
    expect(await events(page, 'sliderCropCommits')).toEqual([])
    expect(await events(page, 'sliderCropEvents')).toEqual([
      { start: 80, end: 80 },
    ])
  })
  test(`independent crop playhead and accepted clamp ${showValue}`, { tag: ['@focus', '@native'] }, async ({
    page,
  }) => {
    await render(page, {
      showValue,
      crop: true,
      clampToCrop: false,
      defaultCropRange: { start: 20, end: 80 },
      defaultValue: 10,
    })
    await controls(page, 'crop').nth(0).focus()
    await page.keyboard.press('ArrowUp')
    expect(await values(page)).toEqual([10])
    expect(await values(page, 'crop')).toEqual([21, 80])
    await render(page, { showValue, crop: true, clampToCrop: true })
    expect(await values(page)).toEqual([21])
    expect(await events(page)).toEqual([])
  })
}
test('accepted controlled changes commit once; rejected proposals keep the native value', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  await render(page, { value: 40 })
  await controls(page).focus()
  await page.keyboard.press('ArrowUp')
  await expect(controls(page)).toHaveValue('40')
  expect(await events(page, 'sliderCommits')).toEqual([])
  await render(page, { value: 40 }, { accept: true })
  await page.keyboard.press('ArrowUp')
  await expect(controls(page)).toHaveValue('41')
  expect(await events(page, 'sliderCommits')).toEqual([41])
  await render(page, {})
  await expect(controls(page)).toHaveValue('41')
})
test('an array value commits arrays; a press that moves nothing commits nothing', { tag: ['@pointer', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: [40] })
  const input = controls(page),
    box = (await input.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('40')
  expect(await events(page)).toEqual([])
  expect(await events(page, 'sliderCommits')).toEqual([])
  await page.keyboard.press('Home')
  await page.keyboard.press('End')
  expect(await events(page)).toEqual([[0], [100]])
  expect(await events(page, 'sliderCommits')).toEqual([[0], [100]])
})
test('value text and track geometry update in the same layout commit', { tag: ['@layout'] }, async ({
  page,
}) => {
  const sizes = await page.evaluate(() => {
    const api = (window as unknown as Hooks).renderSlider
    api({ showValue: true, value: 100 }, { fresh: true })
    api({ showValue: true, value: 0 })
    const root = (window as any).sliderRoot as HTMLElement
    const control = root.querySelector(
      '[data-part="thumb"] .uf-slider__control',
    )!
    return {
      rendered: Number.parseFloat(
        root.style.getPropertyValue('--uf-slider-thumb-inline'),
      ),
      actual: control.parentElement!.getBoundingClientRect().width,
    }
  })
  expect(sizes.rendered).toBeCloseTo(sizes.actual, 5)
})
test('native form names, crop keys, reset and external ownership', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(
    page,
    {
      defaultValue: [20, 80],
      crop: true,
      defaultCropRange: { start: 10, end: 90 },
    },
    { external: true },
  )
  expect(await data(page)).toEqual([])
  expect(await data(page, true)).toEqual([
    ['value', '20'],
    ['value', '80'],
    ['clip', '10'],
    ['clip', '90'],
  ])
  await controls(page).nth(0).focus()
  await page.keyboard.press('ArrowUp')
  await controls(page, 'crop').nth(0).focus()
  await page.keyboard.press('ArrowUp')
  await page.locator('#external-reset').click()
  await expect(controls(page).nth(0)).toHaveValue('20')
  await expect(controls(page, 'crop').nth(0)).toHaveValue('10')
  expect(await events(page)).toEqual([[21, 80]])
})
test('native fieldset disables keyboard, pointer and FormData', { tag: ['@native', '@pointer'] }, async ({
  page,
}) => {
  await render(
    page,
    { defaultValue: 40, crop: true },
    { fieldsetDisabled: true },
  )
  await expect(controls(page)).toBeDisabled()
  expect(await data(page)).toEqual([])
  await click(page, 0.8)
  expect(await values(page)).toEqual([40])
  expect(await events(page)).toEqual([])
})
test('event cancellation at root and capture prevents keyboard/pointer proposals', { tag: ['@focus', '@pointer'] }, async ({
  page,
}) => {
  await render(
    page,
    { defaultValue: 40 },
    { cancelPointer: true, cancelKey: true },
  )
  await controls(page).focus()
  await page.keyboard.press('ArrowUp')
  await click(page, 0.8)
  expect(await values(page)).toEqual([40])
  expect(await events(page)).toEqual([])
  await render(page, {}, { cancelCapture: true })
  await click(page, 0.9)
  expect(await values(page)).toEqual([40])
})
test('grab offset does not jump and pointer cancel never commits', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 40, showValue: true })
  const input = controls(page),
    box = (await input.boundingBox())!
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2)
  await page.mouse.down()
  await expect(input).toHaveValue('40')
  await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2)
  expect((await values(page))[0]).toBeGreaterThan(40)
  await input.evaluate((node) =>
    node.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: (window as any).sliderPointerId,
        bubbles: true,
      }),
    ),
  )
  const before = await values(page)
  await page.mouse.move(box.x, box.y)
  await page.mouse.up()
  expect(await values(page)).toEqual(before)
  expect(await events(page, 'sliderCommits')).toEqual([])
})
test('disable during drag removes live document interactions', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 40 })
  const p = await point(page, 0.7)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await expect(controls(page)).toHaveValue('70')
  await render(page, { disabled: true })
  await page.mouse.move(p.x + 30, p.y)
  await page.mouse.up()
  await expect(controls(page)).toHaveValue('70')
  expect(await events(page, 'sliderCommits')).toEqual([])
})
for (const [min, max, step, value, end] of [
  [0, 1, 0.1, 0.3, 1],
  [-0.5, 0.5, 0.1, 0.3, 0.5],
  [1e14, 1e14 + 100, 1, 1e14 + 20, 1e14 + 100],
  [0.1, 1, 0.2, 0.3, 0.9],
  [0, 1, 0.6, 0.6, 0.6],
  [0, 1e-300, 1e-301, 3e-301, 1e-300],
  [-1e308, 1e308, 1e307, 0, 1e308],
  [42, 42, 1, 42, 42],
])
  test(`native decimal grid ${min}/${max}/${step}`, { tag: ['@native'] }, async ({ page }) => {
    await render(page, { min, max, step, defaultValue: value })
    expect(await values(page)).toEqual([value])
    await controls(page).focus()
    await page.keyboard.press('End')
    expect(await values(page)).toEqual([end])
    expect(
      await controls(page).evaluate(
        (node) => (node as HTMLInputElement).validity.stepMismatch,
      ),
    ).toBe(false)
  })
for (const theme of ['light', 'dark'])
  for (const density of [16, 32, 48]) {
    test(`targets, crop bounds, alignment and accessibility ${theme}/${density}`, { tag: ['@layout', '@a11y'] }, async ({
      page,
    }) => {
      await render(
        page,
        { defaultValue: 50, showValue: true, crop: true },
        { theme, density, width: 240 },
      )
      const frame = (await page.locator('#frame').boundingBox())!
      const boxes = await page.getByRole('slider').evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }),
      )
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24)
        expect(box.height).toBeGreaterThanOrEqual(24)
        expect(box.x).toBeGreaterThanOrEqual(frame.x - 1)
        expect(box.x + box.width).toBeLessThanOrEqual(
          frame.x + frame.width + 1,
        )
      }
      const mainTrack = (await page
        .locator('[data-part="track"]')
        .boundingBox())!
      const cropTrack = (await page
        .locator('[data-slider-crop-track]')
        .boundingBox())!
      expect(
        Math.abs(boxes[0].y + boxes[0].height / 2 - mainTrack.y),
      ).toBeLessThan(1)
      for (const box of boxes.slice(1)) {
        expect(
          Math.abs(
            box.y + box.height / 2 - (cropTrack.y + cropTrack.height / 2),
          ),
        ).toBeLessThan(1)
        expect(box.y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height)
        expect(box.y + box.height).toBeLessThanOrEqual(
          frame.y + frame.height + 1,
        )
      }
      await page.addScriptTag({
        path: require.resolve('axe-core/axe.min.js'),
      })
      const violations = await page.evaluate(
        async () =>
          (
            await (window as any).axe.run(document.querySelector('main'), {
              rules: { 'color-contrast': { enabled: false } },
            })
          ).violations,
      )
      expect(violations).toEqual([])
    })
  }
for (const orientation of ['horizontal', 'vertical'] as const)
  for (const direction of ['ltr', 'rtl']) {
    test(`crop pointer geometry and commits ${orientation}/${direction}`, { tag: ['@layout', '@pointer'] }, async ({
      page,
    }) => {
      const vertical = orientation === 'vertical',
        rtl = direction === 'rtl'
      await render(
        page,
        {
          crop: true,
          orientation,
          showValue: true,
          clampToCrop: false,
          defaultValue: 10,
          defaultCropRange: { start: 20, end: 80 },
        },
        { direction },
      )
      const start = controls(page, 'crop').nth(0),
        box = (await start.boundingBox())!
      const a = await point(page, 0.2, vertical, rtl),
        b = await point(page, 0.3, vertical, rtl)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      expect(await values(page, 'crop')).toEqual([20, 80])
      await page.mouse.move(
        box.x + box.width / 2 + b.x - a.x,
        box.y + box.height / 2 + b.y - a.y,
      )
      await page.mouse.up()
      expect(await values(page, 'crop')).toEqual([30, 80])
      expect(await values(page)).toEqual([10])
      expect(await events(page, 'sliderCropCommits')).toEqual([
        { start: 30, end: 80 },
      ])
    })
  }
test('losing pointer capture cancels the gesture', { tag: ['@pointer'] }, async ({ page }) => {
  await render(page, { defaultValue: 40 })
  const p = await point(page, 0.6)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await expect(controls(page)).toHaveValue('60')
  await controls(page).evaluate((node) =>
    node.releasePointerCapture((window as any).sliderPointerId),
  )
  await page.mouse.move(p.x + 50, p.y)
  await page.mouse.up()
  await expect(controls(page)).toHaveValue('60')
  expect(await events(page, 'sliderCommits')).toEqual([])
})
test('resizing during a drag uses current track geometry', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 40 })
  const p = await point(page, 0.6)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await render(page, {}, { width: 250 })
  const next = await point(page, 0.8)
  await page.mouse.move(next.x, next.y)
  await page.mouse.up()
  await expect(controls(page)).toHaveValue('80')
})
test('new accepted crop bounds constrain an already active value drag', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await render(page, {
    crop: true,
    defaultValue: 40,
    cropRange: { start: 20, end: 80 },
  })
  const p = await point(page, 0.5)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await render(page, { crop: true, cropRange: { start: 50, end: 60 } })
  const next = await point(page, 0.9)
  await page.mouse.move(next.x, next.y)
  await page.mouse.up()
  await expect(controls(page)).toHaveValue('60')
})
for (const width of [140, 240])
  test(`long formatted values stay inside a narrow crop editor ${width}`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(
      page,
      { crop: true, showValue: true, defaultValue: 50 },
      { width, longFormat: true },
    )
    await expect(controls(page)).toHaveAttribute(
      'aria-valuetext',
      '50 very long localized units',
    )
    await expect(controls(page)).toHaveAttribute(
      'title',
      '50 very long localized units',
    )
    await expect
      .poll(async () =>
        page
          .locator('#frame')
          .evaluate((node) => node.scrollWidth - node.clientWidth),
      )
      .toBeLessThanOrEqual(1)
    const p = await point(page, 0.5),
      frame = (await page.locator('#frame').boundingBox())!
    expect(p.x).toBeGreaterThan(frame.x)
    expect(p.x).toBeLessThan(frame.x + width)
  })
test('trusted touch tap edits the same native control', { tag: ['@pointer', '@layout'] }, async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 700 },
  })
  const page = await context.newPage()
  try {
    await open(page, 'slider')
    await render(page, { defaultValue: 20 })
    const p = await point(page, 0.7)
    await page.touchscreen.tap(p.x, p.y)
    await expect(controls(page)).toHaveValue('70')
    expect(await events(page, 'sliderCommits')).toEqual([70])
  } finally {
    await context.close()
  }
})
test('CSS text direction aligns the visible thumb without relying on page language', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 25, style: { direction: 'rtl' } })
  const p = await point(page, 0.25, false, true),
    box = (await controls(page).boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - p.x)).toBeLessThan(1)
  await click(page, 0.8, false, true)
  await expect(controls(page)).toHaveValue('80')
})
for (const fieldsetDisabled of [false, true])
  test(`disabled opacity applies once (${fieldsetDisabled})`, { tag: ['@css'] }, async ({
    page,
  }) => {
    await render(
      page,
      { disabled: !fieldsetDisabled, defaultValue: 40, showValue: true },
      { fieldsetDisabled },
    )
    const result = await page
      .locator('.uf-slider__number')
      .evaluate((node) => {
        let opacity = 1,
          parent: Element | null = node
        while (parent) {
          opacity *= Number(getComputedStyle(parent).opacity)
          parent = parent.parentElement
        }
        return {
          opacity,
          expected: Number(
            getComputedStyle(node).getPropertyValue(
              '--uf-color-disabled-opacity',
            ),
          ),
        }
      })
    expect(result.opacity).toBeCloseTo(result.expected)
  })
test('vertical background rail spans the full available range', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, { orientation: 'vertical', defaultValue: 40 })
  const result = await page
    .locator('[data-part="track"]')
    .evaluate((node) => ({
      available: node.getBoundingClientRect().height,
      painted: parseFloat(getComputedStyle(node, '::before').height),
    }))
  expect(result.available).toBeGreaterThan(100)
  expect(result.painted).toBeCloseTo(result.available, 0)
})
test('canonical membrane padding focuses the same input without a duplicate proposal', { tag: ['@layout', '@pointer', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 40, crop: true, showValue: true })
  const input = controls(page),
    membrane = input.locator('xpath=../..')
  const inputBox = (await input.boundingBox())!,
    box = (await membrane.boundingBox())!
  expect(box.width).toBeGreaterThan(inputBox.width)
  await page.mouse.click(Math.ceil(box.x), box.y + box.height / 2)
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('40')
  expect(await events(page)).toEqual([])
  expect(await events(page, 'sliderCommits')).toEqual([])
  const crop = controls(page, 'crop').first(),
    cropBox = (await crop.locator('xpath=../..').boundingBox())!
  await page.mouse.click(Math.ceil(cropBox.x), cropBox.y + cropBox.height / 2)
  await expect(crop).toBeFocused()
  await expect(crop).toHaveValue('0')
  expect(await events(page, 'sliderCropEvents')).toEqual([])
})
