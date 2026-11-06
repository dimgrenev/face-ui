import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/switcher.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const errors = new WeakMap<Page, string[]>()
const { renderSwitcher: render } = hooks<Hooks>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
  await open(page, 'switcher')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))
test('production CSS preserves logical thumb movement and inherited glyph size', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const dir of ['ltr', 'rtl']) {
    await page
      .locator('#root')
      .evaluate((n) =>
        n.style.setProperty('--uf-switcher-control-size', '40px'),
      )
    await render(page, { dir, checked: false })
    const track = page.locator('[data-switcher-fixture] [data-part="track"]'),
      thumb = page.locator('[data-part="thumb"]')
    expect((await track.boundingBox())!.width).toBeCloseTo(40, 1)
    await expect(track).toHaveCSS('direction', dir)
    await expect(track).toHaveAttribute('data-state', 'unchecked')
    await expect(thumb).toHaveCSS('inset-inline-start', '4px')
    // Measure both boxes in one frame, after the logical position has settled.
    const thumbOffset = () =>
      thumb.evaluate(
        (node) =>
          node.getBoundingClientRect().x -
          node.parentElement!.getBoundingClientRect().x,
      )
    await expect
      .poll(async () => Math.round(await thumbOffset()))
      .toBe(dir === 'ltr' ? 4 : 16)
    const before = await thumbOffset()
    await render(page, { dir, checked: true })
    await expect
      .poll(async () => Math.round((await thumbOffset()) - before))
      .toBe(dir === 'ltr' ? 12 : -12)
  }
})
for (const controlled of [false, true, 'change'] as const)
  test(`label and Space notify the native control once (${controlled})`, { tag: ['@native', '@pointer'] }, async ({
    page,
  }) => {
    await render(page, {}, controlled)
    const input = page.getByRole('switch', { name: 'Setting' })
    await page.locator('[data-switcher-fixture] [data-part="label"]').click()
    await expect(input).toBeChecked()
    await input.focus()
    await page.keyboard.press('Space')
    await expect(input).not.toBeChecked()
    const events = await page.evaluate(() => (window as any).switcherEvents)
    expect(
      events.filter((e: any) => e.type === 'change').map((e: any) => e.checked),
    ).toEqual([true, false])
    expect(
      events
        .filter((e: any) => e.type === 'checked')
        .map((e: any) => e.checked),
    ).toEqual([true, false])
    expect(events.filter((e: any) => e.type === 'click')).toHaveLength(2)
  })
test('external form required/value/reset follows the native input', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, {
    form: 'external',
    name: 'feature',
    value: '',
    required: true,
    defaultChecked: false,
  })
  const input = page.getByRole('switch')
  expect(await input.evaluate((n: HTMLInputElement) => n.form?.id)).toBe(
    'external',
  )
  expect(
    await page
      .locator('#external')
      .evaluate((n: HTMLFormElement) => n.checkValidity()),
  ).toBe(false)
  await page.locator('[data-switcher-fixture] [data-part="label"]').click()
  expect(
    await page
      .locator('#external')
      .evaluate((n: HTMLFormElement) => new FormData(n).get('feature')),
  ).toBe('')
  expect(
    await page
      .locator('#external')
      .evaluate((n: HTMLFormElement) => n.checkValidity()),
  ).toBe(true)
  await page.locator('#external').evaluate((n: HTMLFormElement) => n.reset())
  await expect(input).not.toBeChecked()
  expect(
    await page.evaluate(
      () =>
        (window as any).switcherEvents.filter((e: any) => e.type === 'checked')
          .length,
    ),
  ).toBe(1)
})
test('truncate changes actual wrapping without overflowing a narrow container', { tag: ['@layout'] }, async ({
  page,
}) => {
  const label = 'Permission'.repeat(35),
    props = { label, style: { width: 180 } }
  await render(page, { ...props, truncate: true })
  const row = page.locator('.uf-switcher')
  const compact = (await row.boundingBox())!.height
  await render(page, { ...props, truncate: false })
  expect((await row.boundingBox())!.height).toBeGreaterThan(compact)
  expect(await row.evaluate((n) => n.scrollWidth)).toBeLessThanOrEqual(180)
})
test('RTL mirrors thumb travel and keeps the scaled thumb centered', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl']) {
    await render(page, {
      dir,
      checked: false,
      style: { '--uf-switcher-control-size': '40px' },
    })
    const thumb = page.locator('[data-part="thumb"]'),
      track = page.locator('[data-switcher-fixture] [data-part="track"]')
    const before = (await thumb.boundingBox())!,
      box = (await track.boundingBox())!
    expect(before.y + before.height / 2).toBeCloseTo(box.y + box.height / 2, 0)
    await render(page, {
      dir,
      checked: true,
      style: { '--uf-switcher-control-size': '40px' },
    })
    await expect
      .poll(async () => Math.sign((await thumb.boundingBox())!.x - before.x))
      .toBe(dir === 'ltr' ? 1 : -1)
  }
})
test('fullWidth, membrane, autoFocus and tabIndex preserve one native field', { tag: ['@layout', '@focus', '@native'] }, async ({
  page,
}) => {
  await render(page, { autoFocus: true, defaultChecked: true })
  const input = page.getByRole('switch'),
    row = page.locator('.uf-switcher')
  await expect(input).toBeFocused()
  await input.evaluate((n) => {
    ;(window as any).originalSwitch = n
  })
  const compact = (await row.boundingBox())!.width
  for (const membrane of [true, false]) {
    await render(page, { fullWidth: true, membrane })
    await expect(input).toBeFocused()
    await expect(input).toBeChecked()
    expect(
      await input.evaluate((n) => n === (window as any).originalSwitch),
    ).toBe(true)
    const token = await row.evaluate((n) =>
      parseFloat(getComputedStyle(n).getPropertyValue('--uf-membrane')),
    )
    expect((await row.boundingBox())!.width).toBeCloseTo(
      300 - (membrane ? token * 2 : 0),
      0,
    )
    expect((await row.boundingBox())!.width).toBeGreaterThan(compact * 2)
  }
  await render(page, { label: null, 'aria-label': 'Compact setting' })
  expect((await row.boundingBox())!.width).toBeCloseTo(
    (await row.boundingBox())!.height,
    0,
  )
  await render(page, { tabIndex: -1 })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
  await render(page, { hidden: true })
  await expect(row).toBeHidden()
})
test('disabled, required, name and value retain their separate native meanings', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  const formData = () =>
    page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => [...new FormData(form)])
  const valid = () =>
    page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => form.checkValidity())
  await render(page, { checked: true, name: 'setting' })
  expect(await formData()).toEqual([['setting', 'on']])
  await render(page, { checked: true, name: 'renamed', value: '' })
  expect(await formData()).toEqual([['renamed', '']])
  await render(page, {
    checked: true,
    name: 'setting',
    disabled: true,
    required: true,
  })
  expect(await formData()).toEqual([])
  expect(await valid()).toBe(true)
  const input = page.getByRole('switch')
  await expect(input).toBeDisabled()
  const disabledBox = (await page.locator('.uf-switcher').boundingBox())!
  await page.mouse.click(
    disabledBox.x + disabledBox.width / 2,
    disabledBox.y + disabledBox.height / 2,
  )
  await expect(input).toBeChecked()
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
  await render(page, { checked: false, required: true })
  expect(await valid()).toBe(false)
  await render(page, { checked: true, required: true })
  expect(await valid()).toBe(true)
  expect(await formData()).toEqual([])
  expect(await page.evaluate(() => (window as any).switcherEvents)).toEqual([])
})
test('controlled refusal and form reset keep the current value without extra notifications', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, { checked: false, defaultChecked: true })
  const input = page.getByRole('switch')
  await input.focus()
  await page.keyboard.press('Space')
  await expect(input).not.toBeChecked()
  await expect(input).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(input).not.toBeChecked()
  await render(page, { checked: true, defaultChecked: false })
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(input).toBeChecked()
  expect(
    await page.evaluate(() =>
      (window as any).switcherEvents.filter((e: any) => e.type === 'checked'),
    ),
  ).toEqual([{ type: 'checked', checked: true }])
})
test('links in a rich label activate independently and Enter keeps native form behavior', { tag: ['@native', '@pointer'] }, async ({
  page,
}) => {
  await page.evaluate(() => {
    const w = window as any
    w.renderSwitcher({
      label: w.React.createElement(
        'span',
        null,
        'Read ',
        w.React.createElement('a', { href: '#details' }, 'setting details'),
      ),
    })
  })
  const input = page.getByRole('switch')
  await page.getByRole('link', { name: 'setting details' }).click()
  await expect(input).not.toBeChecked()
  expect(await page.evaluate(() => (window as any).switcherEvents)).toEqual([])
  await input.focus()
  await page.keyboard.press('Enter')
  await expect(input).not.toBeChecked()
  expect(
    await page.evaluate(() =>
      (window as any).switcherEvents.filter((e: any) => e.type === 'checked'),
    ),
  ).toEqual([])
})
test('outer membrane spacing cannot deform the track or multiply disabled opacity', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const spacing of ['0px', '12px']) {
    await render(page, {
      fullWidth: true,
      disabled: true,
      style: { '--uf-membrane': spacing },
    })
    const geometry = await page
      .locator('[data-switcher-fixture]')
      .evaluate((host) => {
        const row = host.querySelector('.uf-switcher')!,
          track = row.querySelector('[data-part="track"]')!,
          thumb = row.querySelector('[data-part="thumb"]')!
        const t = track.getBoundingClientRect(),
          h = thumb.getBoundingClientRect()
        let opacity = 1
        for (
          let n: Element | null = thumb;
          n && n !== host;
          n = n.parentElement
        )
          opacity *= Number(getComputedStyle(n).opacity)
        return {
          size: t.width,
          height: t.height,
          thumb: h.width,
          offset: h.y - t.y,
          opacity,
          rowOpacity: Number(getComputedStyle(row).opacity),
        }
      })
    expect(geometry.height).toBeCloseTo(geometry.size, 1)
    expect(geometry.thumb).toBeCloseTo(geometry.size / 2, 1)
    expect(geometry.offset).toBeCloseTo(geometry.size / 4, 1)
    expect(geometry.rowOpacity).toBeLessThan(1)
    expect(geometry.opacity).toBe(geometry.rowOpacity)
  }
})
test('system high contrast colors preserve the off/on indicator', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  for (const checked of [false, true]) {
    await render(page, { checked })
    const colors = await page
      .locator('[data-switcher-fixture] [data-part="track"]')
      .evaluate((track) => {
        const probe = document.createElement('span')
        probe.style.color = 'ButtonText'
        probe.style.backgroundColor = 'Canvas'
        track.append(probe)
        const result = {
          track: getComputedStyle(track, '::before').backgroundColor,
          thumb: getComputedStyle(track.querySelector('[data-part="thumb"]')!)
            .backgroundColor,
          text: getComputedStyle(probe).color,
          canvas: getComputedStyle(probe).backgroundColor,
        }
        probe.remove()
        return result
      })
    expect(colors.track).toBe(colors.text)
    expect(colors.thumb).toBe(colors.canvas)
    expect(colors.track).not.toBe(colors.thumb)
  }
})
for (const theme of ['light', 'dark'])
  test(`actual off/on glyph contrast (${theme})`, { tag: ['@css', '@a11y'] }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(
      (t) => document.documentElement.setAttribute('data-theme', t),
      theme,
    )
    for (const checked of [false, true]) {
      await render(page, { checked })
      const ratio = await page
        .locator('[data-switcher-fixture] [data-part="track"]')
        .evaluate((track) => {
          const ctx = document.createElement('canvas').getContext('2d')!
          const rgb = (color: string) => {
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = color
            ctx.fillRect(0, 0, 1, 1)
            return [...ctx.getImageData(0, 0, 1, 1).data]
          }
          const luminance = (c: number[]) =>
            c
              .slice(0, 3)
              .map((v) => {
                v /= 255
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
              })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
          const background = rgb(
            getComputedStyle(track.querySelector('[data-part="thumb"]')!)
              .backgroundColor,
          )
          const foreground = rgb(
            getComputedStyle(track, '::before').backgroundColor,
          )
          let opacity = 1
          for (let n: Element | null = track; n; n = n.parentElement)
            opacity *= Number(getComputedStyle(n).opacity)
          const alpha = (foreground[3] / 255) * opacity
          const a = luminance(
              foreground
                .slice(0, 3)
                .map((v, i) => v * alpha + background[i] * (1 - alpha)),
            ),
            b = luminance(background)
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        })
      expect(ratio).toBeGreaterThanOrEqual(3)
    }
  })
for (const theme of ['light', 'dark'])
  test(`single focus target, readable states and reduced motion (${theme})`, { tag: ['@css', '@a11y', '@focus'] }, async ({
    page,
  }) => {
    await page.evaluate(
      (t) => document.documentElement.setAttribute('data-theme', t),
      theme,
    )
    await render(page, { label: 'Enable workspace synchronization' })
    const input = page.getByRole('switch')
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
    expect(
      await page
        .locator('.uf-switcher')
        .evaluate((n) => parseFloat(getComputedStyle(n).outlineWidth)),
    ).toBeGreaterThanOrEqual(2)
    await expect(page.locator('.uf-switcher')).toHaveCSS(
      'outline-style',
      'solid',
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    expect(
      await page.evaluate(async () =>
        (
          await (window as any).axe.run('[data-switcher-fixture]')
        ).violations.map((v: any) => v.id),
      ),
    ).toEqual([])
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await page
        .locator('[data-part="thumb"]')
        .evaluate((n) => parseFloat(getComputedStyle(n).transitionDuration)),
    ).toBeLessThanOrEqual(0.001)
  })
for (const controlled of [false, true] as const)
  test(`a canceled or refused activation leaves the setting and the next one reports (${controlled ? 'controlled' : 'uncontrolled'})`, { tag: ['@native', '@pointer'] }, async ({
    page,
  }) => {
    const input = page.getByRole('switch', { name: 'Setting' })
    const reported = () =>
      page.evaluate(() =>
        (window as any).switcherEvents
          .filter((event: any) => event.type === 'checked')
          .map((event: any) => event.checked),
      )
    const attempts = [
      ['click', controlled],
      ['change', controlled],
      [null, 'refuse'],
    ] as const
    for (const [cancel, mode] of attempts) {
      await render(page, {}, mode, `${cancel}-${mode}`)
      await page.evaluate((cancel) => ((window as any).switcherCancel.current = cancel), cancel)
      const before = (await reported()).length
      await input.focus()
      await page.keyboard.press('Space')
      await expect(input).not.toBeChecked()
      await expect(input).toHaveAttribute('aria-checked', 'false')
      expect((await reported()).slice(before)).toEqual(mode === 'refuse' ? [true] : [])
      if (mode === 'refuse') continue
      await page.evaluate(() => ((window as any).switcherCancel.current = null))
      await page.keyboard.press('Space')
      await expect(input).toBeChecked()
      expect((await reported()).slice(before)).toEqual([true])
    }
  })
