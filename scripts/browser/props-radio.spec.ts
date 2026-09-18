import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const errors = new WeakMap<Page, string[]>()
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([])
})
const options = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty' },
  { value: 'b', label: 'Beta' },
]
async function render(
  page: Page,
  props: Record<string, unknown> = {},
  controlled: boolean | 'change' = false,
  key = 'field',
) {
  await page.evaluate(
    ({ props, controlled, key }) =>
      (window as any).renderRadio(props, controlled, key),
    { props, controlled, key },
  )
}
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  await page.goto('/scripts/browser/radio.html')
  await page.waitForFunction(
    () => typeof (window as any).renderRadio === 'function',
  )
})
test('native group and option ARIA resolve external headings and descriptions', async ({
  page,
}) => {
  await page.evaluate(() =>
    document.body.insertAdjacentHTML(
      'beforeend',
      '<p id="group-title">Billing plan</p><p id="group-help">Choose one plan</p><p id="option-title">Enterprise plan</p><p id="option-help">Includes support</p>',
    ),
  )
  await render(page, {
    'aria-labelledby': 'group-title',
    'aria-describedby': 'group-help',
    options: [
      {
        value: 'enterprise',
        label: 'Enterprise',
        id: 'enterprise',
        'aria-labelledby': 'option-title',
        'aria-describedby': 'option-help',
      },
      { value: 'zero', label: 0 },
    ],
  })
  await expect(
    page.getByRole('radiogroup', { name: 'Billing plan' }),
  ).toHaveAccessibleDescription('Choose one plan')
  await expect(
    page.getByRole('radio', { name: 'Enterprise plan' }),
  ).toHaveAccessibleDescription('Includes support')
  await expect(
    page.getByRole('radio', { name: 'Enterprise plan' }),
  ).toHaveAttribute('id', 'enterprise')
  await expect(
    page.getByRole('radio', { name: '0', exact: true }),
  ).toBeAttached()
})
test('autoFocus, inherited direction and a narrow long label retain usable native controls', async ({
  page,
}) => {
  await page.evaluate(() => (document.documentElement.dir = 'rtl'))
  await render(page, {
    'aria-label': 'Choice',
    autoFocus: true,
    defaultValue: 'b',
    style: { width: 180 },
    options: [
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
  for (const orientation of ['vertical', 'horizontal'])
    for (const membrane of [true, false]) {
      await render(page, {
        'aria-label': 'Choice',
        orientation,
        membrane,
        style: { width: 180 },
        options: [{ value: 'a', label: 'Identifier'.repeat(20) }],
      })
      expect(await group.evaluate((n) => n.scrollWidth)).toBeLessThanOrEqual(
        180,
      )
    }
})
test('empty value participates in focus, selection, wrapping and form data', async ({
  page,
}) => {
  await render(page, {
    options,
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
test('root event handlers can cancel keyboard and pointer default selection', async ({
  page,
}) => {
  await page.evaluate(() =>
    (window as any).renderRadio({
      name: 'choice',
      defaultValue: 'a',
      'aria-label': 'Choice',
      onKeyDown: (e: any) => e.preventDefault(),
      onClick: (e: any) => e.preventDefault(),
    }),
  )
  const inputs = page.locator('[data-radio-fixture] input')
  await inputs.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  await expect(inputs.nth(0)).toBeChecked()
  await page.locator('[data-radio-fixture] label').nth(1).click()
  await expect(inputs.nth(0)).toBeChecked()
  expect(
    await page.evaluate(() =>
      (window as any).radioEvents.filter((e: any) => e.type === 'value'),
    ),
  ).toEqual([])
})
for (const dir of ['ltr', 'rtl'])
  test(`horizontal navigation follows visual reading direction in ${dir}`, async ({
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
test('native inputs remain visually hidden and disabled opacity is applied once', async ({
  page,
}) => {
  await render(page, { disabled: true, 'aria-label': 'Choice' })
  const label = page.locator('[data-radio-fixture] label').first(),
    input = page.locator('[data-radio-fixture] input').first()
  const opacity = await label.evaluate((node) => {
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
test('external form, required and form reset preserve uncontrolled selection', async ({
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
  test(`pointer, Space and arrows use native change once (${controlled})`, async ({
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

test('options and disabled changes preserve values silently and retain one tab stop', async ({
  page,
}) => {
  const base = {
    'aria-label': 'Choice',
    name: 'choice',
    defaultValue: '',
    options,
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
    options: [options[2], options[1], { ...options[0], disabled: true }],
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

test('required uses native named group validation; unnamed optional groups do not invent form data', async ({
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

test('a canceled reset preserves selection; changing form ownership moves reset handling', async ({
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
  test(`layout, names, focus and contrast (${theme})`, async ({ page }) => {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute('data-theme', theme),
      theme,
    )
    const props = {
      'aria-label': 'Choice',
      options: [
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
