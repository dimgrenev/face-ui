import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/radio.fixture'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const errors = new WeakMap<Page, string[]>()
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([])
})
const items = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty' },
  { value: 'b', label: 'Beta' },
]
const { renderRadio: render } = hooks<Hooks>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await open(page, 'radio')
})
test('autoFocus, inherited direction and a narrow long label retain usable native controls', { tag: ['@layout', '@focus'] }, async ({
  page,
}) => {
  await page.evaluate(() => (document.documentElement.dir = 'rtl'))
  await render(page, {
    'aria-label': 'Choice',
    autoFocus: true,
    defaultValue: 'b',
    style: { width: 180 },
    items: [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Identifier'.repeat(20) },
      { value: 'c', label: 'Gamma' },
    ],
  })
  const inputs = page.locator('[data-radio-fixture] input'),
    group = page.getByRole('radiogroup', { name: 'Choice' })
  await expect(inputs.nth(1)).toBeFocused()
  expect(
    await group.evaluate((n) => ({
      scroll: n.scrollWidth,
      width: n.clientWidth,
    })),
  ).toEqual(expect.objectContaining({ scroll: 180, width: 180 }))
  await page.keyboard.press('ArrowRight')
  await expect(inputs.nth(0)).toBeChecked()
  await page.keyboard.press('ArrowDown')
  await expect(inputs.nth(1)).toBeChecked()
  for (const orientation of ['vertical', 'horizontal'] as const)
    for (const membrane of [true, false]) {
      await render(page, {
        'aria-label': 'Choice',
        orientation,
        membrane,
        style: { width: 180 },
        items: [{ value: 'a', label: 'Identifier'.repeat(20) }],
      })
      expect(await group.evaluate((n) => n.scrollWidth)).toBeLessThanOrEqual(
        180,
      )
    }
})
test('empty value participates in focus, selection, wrapping and form data', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  await render(page, {
    items,
    name: 'choice',
    defaultValue: 'a',
    'aria-label': 'Choice',
  })
  const radios = page.locator('[data-radio-fixture] input')
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  await expect(radios.nth(1)).toBeChecked()
  await expect(radios.nth(1)).toBeFocused()
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#form')!).get(
        'choice',
      ),
    ),
  ).toBe('')
  await page.keyboard.press('ArrowDown')
  await expect(radios.nth(2)).toBeFocused()
  await expect(radios.nth(2)).toBeChecked()
  await page.keyboard.press('ArrowDown')
  await expect(radios.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(radios.nth(2)).toBeFocused()
})
for (const dir of ['ltr', 'rtl'])
  test(`horizontal navigation follows visual reading direction in ${dir}`, { tag: ['@focus'] }, async ({
    page,
  }) => {
    await render(page, {
      dir,
      orientation: 'horizontal',
      defaultValue: 'a',
      'aria-label': 'Choice',
    })
    const native = page.locator('[data-native] input'),
      face = page.locator('[data-radio-fixture] input')
    await native.nth(0).check()
    await native.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    // Native Chromium/Firefox reverse RTL arrows; WebKit does not. Face uses
    // the same physical-direction rule in all supported browsers.
    const expected = dir === 'rtl' ? 'c' : 'b'
    await face.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.locator('[data-radio-fixture] input:checked'),
    ).toHaveValue(expected)
    await page.keyboard.press('ArrowLeft')
    await expect(face.nth(0)).toBeChecked()
  })
test('native inputs remain visually hidden and disabled opacity is applied once', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, { disabled: true, 'aria-label': 'Choice' })
  const label = page.locator('[data-radio-fixture] label').first(),
    input = page.locator('[data-radio-fixture] input').first()
  const opacity = await label.evaluate((node: HTMLElement) => {
    let opacity = 1,
      current: HTMLElement | null = node
    while (current) {
      opacity *= Number(getComputedStyle(current).opacity)
      if (current.matches('[data-radio-fixture]')) break
      current = current.parentElement
    }
    return opacity
  })
  const expected = await label.evaluate((node) =>
    Number(
      getComputedStyle(node).getPropertyValue('--uf-color-disabled-opacity'),
    ),
  )
  expect(opacity).toBeCloseTo(expected, 3)
  const box = (await input.boundingBox())!
  expect(box.width).toBeLessThanOrEqual(1)
  expect(box.height).toBeLessThanOrEqual(1)
  await expect(input).toBeDisabled()
})
test('external form, required and form reset preserve uncontrolled selection', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, {
    form: 'external',
    name: 'choice',
    required: true,
    defaultValue: 'a',
    'aria-label': 'Choice',
  })
  const radios = page.locator('[data-radio-fixture] input')
  expect(
    await radios.nth(0).evaluate((n) => (n as HTMLInputElement).form?.id),
  ).toBe('external')
  await page.locator('[data-radio-fixture] label').nth(1).click()
  await expect(radios.nth(1)).toBeChecked()
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#external')!).get(
        'choice',
      ),
    ),
  ).toBe('b')
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#external')!.reset(),
  )
  await expect(radios.nth(0)).toBeChecked()
  await render(
    page,
    {
      form: 'external',
      name: 'choice',
      required: true,
      'aria-label': 'Choice',
    },
    false,
    'empty',
  )
  expect(
    await page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#external')!.checkValidity(),
    ),
  ).toBe(false)
})

for (const controlled of [false, true, 'change'] as const)
  test(`pointer, Space and arrows use native change once (${controlled})`, { tag: ['@native', '@pointer', '@focus'] }, async ({
    page,
  }) => {
    await render(page, { name: 'choice', 'aria-label': 'Choice' }, controlled)
    const radios = page.locator('[data-radio-fixture] input'),
      labels = page.locator('[data-radio-fixture] label')
    await labels.nth(1).click()
    await expect(radios.nth(1)).toBeChecked()
    await radios.nth(1).focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await expect(radios.nth(2)).toBeChecked()
    await expect(radios.nth(2)).toBeFocused()
    expect(await page.evaluate(() => (window as any).radioEvents)).toEqual([
      { type: 'value', value: 'b' },
      { type: 'change', value: 'b' },
      { type: 'value', value: 'c' },
      { type: 'change', value: 'c' },
    ])
    await page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#form')!.reset(),
    )
    await expect(radios.nth(2)).toBeChecked({ checked: !!controlled })
    expect(await page.evaluate(() => (window as any).radioEvents.length)).toBe(
      4,
    )
  })

test('items and disabled changes preserve values silently and retain one tab stop', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  const base = {
    'aria-label': 'Choice',
    name: 'choice',
    defaultValue: '',
    items,
  }
  await render(page, base)
  const inputs = page.locator('[data-radio-fixture] input')
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(inputs.nth(1)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(inputs.nth(1)).toBeFocused()
  await render(page, {
    ...base,
    items: [items[2], items[1], { ...items[0], disabled: true }],
  })
  await expect(inputs.nth(1)).toBeFocused()
  await expect(inputs.nth(1)).toBeChecked()
  await page.keyboard.press('ArrowDown')
  await expect(inputs.nth(0)).toBeChecked()
  await expect(inputs.nth(0)).toBeFocused()
  await render(page, { ...base, value: 'a', disabled: true })
  await expect(inputs.nth(0)).toBeChecked()
  expect(
    await page.evaluate(() =>
      Array.from(
        new FormData(
          document.querySelector<HTMLFormElement>('#form')!,
        ).entries(),
      ),
    ),
  ).toEqual([])
  await render(page, { ...base, value: 'missing' })
  expect(
    await inputs.evaluateAll(
      (nodes) => nodes.filter((n) => (n as HTMLInputElement).checked).length,
    ),
  ).toBe(0)
  expect(
    await inputs.evaluateAll(
      (nodes) =>
        nodes.filter((n) => (n as HTMLInputElement).tabIndex === 0).length,
    ),
  ).toBe(1)
  expect(
    await page.evaluate(() =>
      (window as any).radioEvents.filter((e: any) => e.type === 'value'),
    ),
  ).toEqual([{ type: 'value', value: 'b' }])
})

test('required uses native named group validation; unnamed optional groups do not invent form data', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, { name: 'choice', required: true, 'aria-label': 'Choice' })
  const valid = () =>
    page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#form')!.checkValidity(),
    )
  expect(await valid()).toBe(false)
  await page.locator('[data-radio-fixture] label').nth(1).click()
  expect(await valid()).toBe(true)
  await render(page, { 'aria-label': 'Choice' })
  expect(
    await page.evaluate(() =>
      Array.from(
        new FormData(
          document.querySelector<HTMLFormElement>('#form')!,
        ).entries(),
      ),
    ),
  ).toEqual([])
})

test('a canceled reset preserves selection; changing form ownership moves reset handling', { tag: ['@native'] }, async ({
  page,
}) => {
  const props = { name: 'choice', defaultValue: 'a', 'aria-label': 'Choice' }
  await render(page, props)
  await page.locator('[data-radio-fixture] label').nth(1).click()
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('#form')!
    form.addEventListener('reset', (e) => e.preventDefault(), { once: true })
    form.reset()
  })
  await expect(page.locator('[data-radio-fixture] input:checked')).toHaveValue(
    'b',
  )
  await render(page, { ...props, form: 'external' })
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#form')!.reset(),
  )
  await expect(page.locator('[data-radio-fixture] input:checked')).toHaveValue(
    'b',
  )
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#external')!.reset(),
  )
  await expect(page.locator('[data-radio-fixture] input:checked')).toHaveValue(
    'a',
  )
  expect(await page.evaluate(() => (window as any).radioEvents.length)).toBe(2)
})

for (const theme of ['light', 'dark'])
  test(`layout, names, focus and contrast (${theme})`, { tag: ['@layout', '@css', '@a11y', '@focus'] }, async ({ page }) => {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute('data-theme', theme),
      theme,
    )
    const props = {
      'aria-label': 'Choice',
      items: [
        { value: 'a', label: 'Alpha choice' },
        { value: 'b', label: 'A longer choice that wraps on a narrow surface' },
        { value: 'c', label: 'Unavailable choice', disabled: true },
      ],
      style: { width: 260 },
      defaultValue: 'a',
    }
    await render(page, props)
    const group = page.getByRole('radiogroup', { name: 'Choice' }),
      labels = page.locator('[data-radio-fixture] label')
    await expect(
      page.getByRole('radio', { name: 'Alpha choice' }),
    ).toBeChecked()
    const first = (await labels.nth(0).boundingBox())!,
      second = (await labels.nth(1).boundingBox())!
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    expect(second.x).toBeCloseTo(first.x, 0)
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    expect(
      await labels
        .nth(0)
        .evaluate((n) => parseFloat(getComputedStyle(n).outlineWidth)),
    ).toBeGreaterThanOrEqual(2)
    await render(page, {
      ...props,
      orientation: 'horizontal',
      style: { width: 1000 },
    })
    const horizontal = await labels.evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().y),
    )
    expect(
      Math.max(...horizontal) - Math.min(...horizontal),
    ).toBeLessThanOrEqual(1)
    await render(page, { ...props, membrane: false })
    await expect(
      page.getByRole('radio', { name: 'Alpha choice' }),
    ).toBeFocused()
    expect(await group.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run('[data-radio-fixture]')
      return result.violations.map((v: any) => ({
        id: v.id,
        nodes: v.nodes.map((n: any) => n.target),
      }))
    })
    expect(violations).toEqual([])
    await render(page, { ...props, hidden: true })
    await expect(group).toBeHidden()
  })

test('with a shared name the browser never moves the selection by itself', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  const radios = page.locator('[data-radio-fixture] input'),
    checked = page.locator('[data-radio-fixture] input:checked'),
    submitted = () =>
      page.evaluate(() =>
        new FormData(document.querySelector<HTMLFormElement>('#form')!).get(
          'choice',
        ),
      ),
    values = () =>
      page.evaluate(() =>
        (window as any).radioEvents
          .filter((e: any) => e.type === 'value')
          .map((e: any) => e.value),
      )
  // A parent that refuses every change: arrows move focus, the selection stays.
  await render(
    page,
    { name: 'choice', defaultValue: 'a', 'aria-label': 'Choice' },
    'refuse',
  )
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  await expect(radios.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(radios.nth(2)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(checked).toHaveCount(1)
  await expect(checked).toHaveValue('a')
  expect(await submitted()).toBe('a')
  expect(await values()).toEqual(['b', 'c', 'c'])
  // A canceled click cancels the keyboard selection as it cancels the pointer one.
  await render(page, { name: 'choice', defaultValue: 'a', 'aria-label': 'Choice' }, false, 'canceled')
  await page.evaluate(() =>
    document
      .querySelector('[data-radio-fixture]')!
      .addEventListener('click', (event) => event.preventDefault(), true),
  )
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowUp')
  await expect(radios.nth(2)).toBeFocused()
  await page.locator('[data-radio-fixture] label').nth(1).click()
  await expect(checked).toHaveValue('a')
  expect(await submitted()).toBe('a')
  // Accepted: exactly one step per arrow, never a second native one.
  await render(page, { name: 'choice', defaultValue: 'a', 'aria-label': 'Choice' }, false, 'accepted')
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  await expect(checked).toHaveValue('b')
  await page.keyboard.press('ArrowLeft')
  await expect(checked).toHaveValue('a')
  expect(await submitted()).toBe('a')
})

test('submit sends the selection, required blocks an empty group, reset restores the default', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, { name: 'choice', required: true, 'aria-label': 'Choice' })
  const submits = () =>
    page.evaluate(() =>
      (window as any).radioEvents
        .filter((e: any) => e.type === 'submit')
        .map((e: any) => e.value),
    )
  const submit = () =>
    page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#form')!.requestSubmit(),
    )
  await submit()
  expect(await submits()).toEqual([])
  // Firefox's validation bubble for the focused first radio covers the second
  // option and swallows clicks there until that radio blurs.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.locator('[data-radio-fixture] label').nth(1).click()
  await submit()
  expect(await submits()).toEqual(['choice=b'])
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.locator('[data-radio-fixture] input:checked')).toHaveCount(0)
  await submit()
  expect(await submits()).toEqual(['choice=b'])
})

for (const dir of ['ltr', 'rtl'] as const)
  test(`field label, description and error name and describe the group (${dir})`, { tag: ['@layout', '@a11y'] }, async ({
    page,
  }) => {
    await render(page, {
      dir,
      name: 'plan',
      required: true,
      label: 'Plan',
      description: 'Billed monthly',
      error: 'Choose a plan',
      labelPosition: 'start',
    })
    const group = page.getByRole('radiogroup', { name: 'Plan' })
    await expect(group).toHaveAccessibleDescription('Billed monthly Choose a plan')
    await expect(group).toHaveAttribute('aria-invalid', 'true')
    for (const radio of await group.getByRole('radio').all())
      await expect(radio).toHaveAccessibleDescription(
        'Billed monthly Choose a plan',
      )
    const label = (await group
      .locator('[data-scope="field"][data-part="label"]')
      .boundingBox())!
    const list = (await group
      .locator('[data-scope="radio"][data-part="list"]')
      .boundingBox())!
    // Beside the list, at its inline start, centered on the first item's line.
    if (dir === 'ltr') expect(label.x + label.width).toBeLessThanOrEqual(list.x + 1)
    else expect(list.x + list.width).toBeLessThanOrEqual(label.x + 1)
    const first = (await page.locator('[data-radio-fixture] label').first().boundingBox())!
    expect(
      Math.abs(label.y + label.height / 2 - (first.y + first.height / 2)),
    ).toBeLessThanOrEqual(2)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run('[data-radio-fixture]')
      return result.violations.map((v: any) => v.id)
    })
    expect(violations).toEqual([])
  })
