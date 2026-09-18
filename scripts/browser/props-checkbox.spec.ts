import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const errors = new WeakMap<Page, string[]>()
async function render(
  page: Page,
  props: Record<string, unknown> = {},
  controlled: boolean | 'change' = false,
  key = 'field',
) {
  await page.evaluate(
    ({ props, controlled, key }) =>
      (window as any).renderCheckbox(props, controlled, key),
    { props, controlled, key },
  )
}
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
  await page.goto('/scripts/browser/checkbox.html')
  await page.waitForFunction(
    () => typeof (window as any).renderCheckbox === 'function',
  )
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})
for (const controlled of [false, true, 'change'] as const)
  test(`pointer and Space notify native and value observers once (${controlled})`, async ({
    page,
  }) => {
    await render(page, { name: 'choice', value: 'yes' }, controlled)
    const input = page.getByRole('checkbox', { name: 'Choice' })
    await page.locator('[data-checkbox-fixture] label').click()
    await expect(input).toBeChecked()
    await input.focus()
    await page.keyboard.press('Space')
    await expect(input).not.toBeChecked()
    const events = await page.evaluate(() => (window as any).checkboxEvents)
    expect(
      events.filter((e: any) => e.type === 'change').map((e: any) => e.checked),
    ).toEqual([true, false])
    expect(
      events
        .filter((e: any) => e.type === 'checked')
        .map((e: any) => e.checked),
    ).toEqual([true, false])
  })
test('style, long labels, RTL and hidden act on the complete visual field', async ({
  page,
}) => {
  const props = {
    label: 'Permission'.repeat(24),
    style: { width: 180 },
    dir: 'rtl',
  }
  for (const membrane of [true, false]) {
    await render(page, { ...props, membrane })
    const label = page.locator('[data-checkbox-fixture] label')
    expect((await label.boundingBox())!.width).toBe(180)
    expect(await label.evaluate((n) => n.scrollWidth)).toBeLessThanOrEqual(180)
    expect(await label.evaluate((n) => getComputedStyle(n).direction)).toBe(
      'rtl',
    )
    const input = page.getByRole('checkbox')
    const box = (await input.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(1)
    expect(box.height).toBeLessThanOrEqual(1)
  }
  await render(page, { ...props, hidden: true })
  await expect(page.locator('[data-checkbox-fixture] label')).toBeHidden()
})
test('an explicit native accessible name overrides the visible label', async ({
  page,
}) => {
  await render(page, {
    label: 'Visible',
    'aria-label': 'Full permission label',
  })
  await expect(
    page.getByRole('checkbox', { name: 'Full permission label', exact: true }),
  ).toBeAttached()
})
test('canceling a native click preserves both the DOM and machine checked state', async ({
  page,
}) => {
  await page.evaluate(() =>
    (window as any).renderCheckbox({
      label: 'Choice',
      onClick: (event: any) => event.preventDefault(),
    }),
  )
  await page.locator('[data-checkbox-fixture] label').click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  expect(await page.evaluate(() => (window as any).checkboxEvents)).toEqual([])
})
test('required mixed state, external form submission and reset match the native checked value', async ({
  page,
}) => {
  await render(page, {
    checked: 'indeterminate',
    required: true,
    name: 'choice',
    value: 'edit',
    form: 'external',
  })
  const input = page.getByRole('checkbox')
  await expect(input).toBeChecked({ indeterminate: true })
  expect(
    await page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#external')!.checkValidity(),
    ),
  ).toBe(false)
  await input.focus()
  await page.keyboard.press('Space')
  await expect(input).toBeChecked({ indeterminate: true })
  await render(
    page,
    {
      defaultChecked: 'indeterminate',
      required: true,
      name: 'choice',
      value: 'edit',
      form: 'external',
    },
    false,
    'uncontrolled',
  )
  await page.locator('[data-checkbox-fixture] label').click()
  await expect(input).toBeChecked()
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#external')!).get(
        'choice',
      ),
    ),
  ).toBe('edit')
  expect(
    await page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#external')!.checkValidity(),
    ),
  ).toBe(true)
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#external')!.reset(),
  )
  await expect(input).toBeChecked({ indeterminate: true })
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#external')!).has(
        'choice',
      ),
    ),
  ).toBe(false)
})
test('fullWidth, membrane and tabIndex preserve a single native focus target', async ({
  page,
}) => {
  await render(page, { label: 'Choice', autoFocus: true, defaultChecked: true })
  const input = page.getByRole('checkbox'),
    label = page.locator('[data-checkbox-fixture] label')
  await expect(input).toBeFocused()
  await input.evaluate((n) => ((window as any).originalCheckbox = n))
  const compact = (await label.boundingBox())!.width
  for (const membrane of [true, false]) {
    await render(page, { label: 'Choice', fullWidth: true, membrane })
    await expect(input).toBeFocused()
    await expect(input).toBeChecked()
    expect(
      await input.evaluate((n) => n === (window as any).originalCheckbox),
    ).toBe(true)
    expect((await label.boundingBox())!.width).toBeGreaterThan(compact * 2)
    const token = await label.evaluate((n) =>
      parseFloat(getComputedStyle(n).getPropertyValue('--uf-membrane')),
    )
    expect((await label.boundingBox())!.width).toBeCloseTo(
      300 - (membrane ? token * 2 : 0),
      0,
    )
  }
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
  await render(page, { label: 'Choice', tabIndex: -1 })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
})
test('disabled, required and submission value update independently of checked state', async ({
  page,
}) => {
  const valid = () =>
    page.evaluate(() =>
      document.querySelector<HTMLFormElement>('#form')!.checkValidity(),
    )
  await render(page, { checked: true, name: 'choice', value: 'first' })
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#form')!).get(
        'choice',
      ),
    ),
  ).toBe('first')
  await render(page, {
    checked: true,
    name: 'choice',
    value: '',
    disabled: true,
    required: true,
  })
  const input = page.getByRole('checkbox')
  await expect(input).toBeDisabled()
  await expect(input).toBeChecked()
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#form')!).has(
        'choice',
      ),
    ),
  ).toBe(false)
  expect(await valid()).toBe(true)
  await render(page, { checked: false, required: true })
  expect(await valid()).toBe(false)
  await render(page, { checked: true, required: true })
  expect(await valid()).toBe(true)
  expect(await page.evaluate(() => (window as any).checkboxEvents)).toEqual([])
})
test('form ownership and canceled reset preserve current uncontrolled state', async ({
  page,
}) => {
  const props = { defaultChecked: 'indeterminate', name: 'choice' }
  await render(page, props)
  await page.locator('[data-checkbox-fixture] label').click()
  await page.evaluate(() => {
    const f = document.querySelector<HTMLFormElement>('#form')!
    f.addEventListener('reset', (e) => e.preventDefault(), { once: true })
    f.reset()
  })
  await expect(page.getByRole('checkbox')).toBeChecked()
  await render(page, { ...props, form: 'external' })
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#form')!.reset(),
  )
  await expect(page.getByRole('checkbox')).toBeChecked()
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#external')!.reset(),
  )
  await expect(page.getByRole('checkbox')).toBeChecked({ indeterminate: true })
  expect(await page.evaluate(() => (window as any).checkboxEvents.length)).toBe(
    2,
  )
})
for (const theme of ['light', 'dark'])
  test(`labels, descriptions, focus and contrast (${theme})`, async ({
    page,
  }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<p id="name">Export permission</p><p id="help">Allows downloading files</p>',
      ),
    )
    await render(page, {
      'aria-labelledby': 'name',
      'aria-describedby': 'help',
      label: 'Export files',
      defaultChecked: 'indeterminate',
    })
    const input = page.getByRole('checkbox', { name: 'Export permission' }),
      label = page.locator('[data-checkbox-fixture] label')
    await expect(input).toHaveAccessibleDescription('Allows downloading files')
    await page.locator('#before').focus()
    await page.keyboard.press('Tab')
    expect(
      await label.evaluate((n) => parseFloat(getComputedStyle(n).outlineWidth)),
    ).toBeGreaterThanOrEqual(2)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    expect(
      await page.evaluate(async () => {
        const result = await (window as any).axe.run('[data-checkbox-fixture]')
        return result.violations.map((v: any) => v.id)
      }),
    ).toEqual([])
    await render(page, { disabled: true, label: 'Export files' })
    const opacity = await label.evaluate((n) => {
      let opacity = 1,
        current: HTMLElement | null = n
      while (current) {
        opacity *= Number(getComputedStyle(current).opacity)
        current = current.parentElement
      }
      return opacity
    })
    expect(opacity).toBeCloseTo(
      await label.evaluate((n) =>
        Number(
          getComputedStyle(n).getPropertyValue('--uf-color-disabled-opacity'),
        ),
      ),
      3,
    )
  })
test('wrapped RTL labels align actual text lines to the reading start', async ({
  page,
}) => {
  await render(page, {
    dir: 'rtl',
    style: { width: 180 },
    label: 'Read and write access for a team account',
  })
  const edges = await page
    .locator('[data-part="label"] .uf-text__content')
    .evaluate((n) => {
      const range = document.createRange()
      range.selectNodeContents(n)
      return Array.from(range.getClientRects()).map((r) => r.right)
    })
  expect(edges.length).toBeGreaterThan(1)
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(1)
})
