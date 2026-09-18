import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/select.fixture'
import type { SelectSurface } from '../../../Select/Select'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const errors = new WeakMap<Page, string[]>()
const { renderSelect: render } = hooks<Hooks>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (e) => errors.get(page)!.push(e.message))
  await open(page, 'select')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

test('Tab leaves the open select and closes its popup without visiting every option', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { surface: 'popover' })
  const trigger = page.getByRole('combobox')
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }),
  ).toBeFocused()
  await expect(page.getByRole('listbox')).toHaveCount(0)
})
test('typing finds labels, cycles equal prefixes and skips disabled options', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { surface: 'popover' })
  await page.getByRole('combobox').focus()
  await page.keyboard.press('b')
  await expect(
    page.getByRole('option', { name: 'Beta', exact: true }),
  ).toHaveAttribute('data-highlighted')
  await page.keyboard.press('b')
  await expect(
    page.getByRole('option', { name: 'Blue', exact: true }),
  ).toHaveAttribute('data-highlighted')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('combobox')).toContainText('Blue')
})
test('an empty string option is selected, valid and submitted as an empty string', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, {
    surface: 'popover',
    name: 'plan',
    required: true,
    defaultValue: '',
  })
  const field = page.getByRole('combobox')
  await expect(field).toContainText('Empty value')
  await expect(field).not.toHaveAttribute('data-placeholder')
  expect(
    await page
      .locator('#form')
      .evaluate((n: HTMLFormElement) => n.checkValidity()),
  ).toBe(true)
  expect(
    await page
      .locator('#form')
      .evaluate((n: HTMLFormElement) => new FormData(n).get('plan')),
  ).toBe('')
  await field.click()
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('option', { name: 'Beta', exact: true }),
  ).toHaveAttribute('data-highlighted')
})
test('the single-value native proxy does not make a required multiple select invalid when an item is selected', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, {
    surface: 'popover',
    multiple: true,
    name: 'plan',
    form: 'external',
    required: true,
    defaultValue: [],
  })
  const valid = () =>
    page
      .locator('#external')
      .evaluate((form: HTMLFormElement) => form.checkValidity())
  expect(await valid()).toBe(false)
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  expect(await valid()).toBe(true)
  expect(
    await page
      .locator('#external')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('plan')),
  ).toEqual(['b'])
  await page.keyboard.press('Escape')
  await page
    .locator('#external')
    .evaluate((form: HTMLFormElement) => form.reset())
  await expect(page.getByRole('combobox')).toContainText('Select option')
  expect(await valid()).toBe(false)
})
test('sheet content has a named modal dialog and a separate, keyboard-operable listbox', { tag: ['@layout', '@focus'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await render(page, { surface: 'auto', surfaceTitle: 'Choose a plan' })
  await page.getByRole('combobox').click()
  const dialog = page.getByRole('dialog', { name: 'Choose a plan' }),
    list = page.getByRole('listbox')
  await expect(dialog).toBeVisible()
  await expect(list).toBeFocused()
  await page.keyboard.press('End')
  await expect(
    page.getByRole('option', { name: 'Blue', exact: true }),
  ).toHaveAttribute('data-highlighted')
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('combobox')).toBeFocused()
  await expect(page.getByRole('combobox')).toContainText('Blue')
})
test('native accessible names and disabled opacity remain consistent in both themes', { tag: ['@css', '@a11y'] }, async ({
  page,
}) => {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (t) => (document.documentElement.dataset.theme = t),
      theme,
    )
    await render(page, {
      surface: 'popover',
      'aria-label': 'Billing plan',
      disabled: true,
    })
    await expect(
      page.getByRole('combobox', { name: 'Billing plan', exact: true }),
    ).toBeDisabled()
    const opacity = await page
      .locator('[data-select-fixture]')
      .evaluate((host) => {
        const row = host.querySelector('.uf-select')!,
          field = row.querySelector('[role="combobox"]')!
        let actual = 1
        for (
          let n: Element | null = field;
          n && n !== host;
          n = n.parentElement
        )
          actual *= Number(getComputedStyle(n).opacity)
        return { actual, root: Number(getComputedStyle(row).opacity) }
      })
    expect(opacity.actual).toBe(opacity.root)
  }
})
test('side value stretching changes the physical position of the indicator', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { surface: 'side', stretchText: false })
  const indicator = page.locator('[data-part="indicator"]'),
    before = (await indicator.boundingBox())!.x
  await render(page, { surface: 'side', stretchText: true })
  expect((await indicator.boundingBox())!.x).toBeGreaterThan(before + 80)
})
test('the open sheet passes structure checks with its close control outside the listbox', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await render(page, { surface: 'sheet' })
  await page.getByRole('combobox').click()
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  expect(
    await page.evaluate(async () =>
      (await (window as any).axe.run('[data-select-fixture]')).violations.map(
        (v: any) => v.id,
      ),
    ),
  ).toEqual([])
})

test('contentMinWidth changes measured popover width and remains inside a narrow viewport', { tag: ['@layout'] }, async ({
  page,
}) => {
  for (const membrane of [true, false]) {
    await render(page, {
      iconOnly: true,
      fullWidth: false,
      surface: 'popover',
      displayValue: '{}',
      contentMinWidth: 280,
      membrane,
    })
    const trigger = page.getByRole('combobox')
    await trigger.click()
    const surface = page.locator('.uf-select__content')
    expect((await trigger.boundingBox())!.width).toBeLessThan(45)
    expect((await surface.boundingBox())!.width).toBeGreaterThanOrEqual(279)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 240, height: 720 })
    await trigger.click()
    await expect(surface).toBeInViewport()
    const box = (await surface.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(240)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1000, height: 720 })
  }
})

test('width, label orientation, display value and class hooks have independent visual effects', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, {
    surface: 'popover',
    fullWidth: false,
    defaultValue: 'b',
    triggerClassName: 'custom-trigger',
    valueClassName: 'custom-value',
    contentClassName: 'custom-content',
    style: { marginTop: 12 },
  })
  const field = page.getByRole('combobox'),
    root = page.locator('.uf-select')
  const compact = (await field.boundingBox())!.width
  await expect(field).toHaveClass('custom-trigger')
  await expect(root).toHaveCSS('margin-top', '12px')
  await render(page, {
    surface: 'popover',
    fullWidth: true,
    defaultValue: 'b',
    labelOrientation: 'horizontal',
    contentClassName: 'custom-content',
    displayValue: 'Custom display',
  })
  await expect(field).toContainText('Custom display')
  let label = await page
    .locator('[data-scope="select"] [data-part="label"]')
    .boundingBox()
  let box = (await field.boundingBox())!
  expect(box.x).toBeGreaterThan(label!.x + 20)
  expect(Math.abs(box.y - label!.y)).toBeLessThan(10)
  await render(page, {
    surface: 'popover',
    fullWidth: true,
    defaultValue: 'b',
    labelOrientation: 'vertical',
    contentClassName: 'custom-content',
    valueClassName: 'custom-value',
  })
  box = (await field.boundingBox())!
  label = await page
    .locator('[data-scope="select"] [data-part="label"]')
    .boundingBox()
  expect(box.width).toBeGreaterThan(compact + 60)
  expect(box.y).toBeGreaterThan(label!.y + 15)
  await expect(page.locator('.custom-value')).toContainText('Beta')
  await field.click()
  await expect(page.locator('.custom-content')).toBeVisible()
})

test('side hover and click keep the selected row aligned with the trigger', { tag: ['@layout', '@pointer'] }, async ({
  page,
}) => {
  const options = Array.from({ length: 14 }, (_, i) => ({
    value: String(i),
    label: `Option ${i}`,
  }))
  await render(page, { surface: 'side', options, defaultValue: '8' })
  const field = page.getByRole('combobox')
  await field.hover()
  await expect(page.getByRole('listbox')).toBeVisible()
  await field.click()
  await expect(page.getByRole('listbox')).toBeVisible()
  const row = page.getByRole('option', { name: 'Option 8', exact: true })
  await expect
    .poll(async () => {
      const a = (await field.boundingBox())!,
        b = (await row.boundingBox())!
      return Math.abs(a.y + a.height / 2 - b.y - b.height / 2)
    })
    .toBeLessThan(3)
  const panel = page.locator('.uf-select__contentPanel')
  const metrics = await panel.evaluate((node) => ({
    height: node.clientHeight,
    scroll: node.scrollHeight,
  }))
  expect(metrics.scroll).toBeGreaterThan(metrics.height * 2)
  await page.keyboard.press('End')
  await expect(
    page.getByRole('option', { name: 'Option 13', exact: true }),
  ).toHaveAttribute('data-highlighted')
  const bottom = (await page
      .getByRole('option', { name: 'Option 13', exact: true })
      .boundingBox())!,
    viewport = (await panel.boundingBox())!
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(
    viewport.y + viewport.height + 2,
  )
})

test('a low side trigger keeps the selected row visible on a wide viewport', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 720 })
  await render(page, {
    surface: 'side',
    style: { marginTop: 180 },
    defaultValue: '8',
    options: Array.from({ length: 16 }, (_, i) => ({
      value: String(i),
      label: `Option ${i}`,
    })),
  })
  const field = page.getByRole('combobox'),
    row = page.getByRole('option', { name: 'Option 8', exact: true })
  await field.focus()
  await field.press('Enter')
  await expect(row).toBeInViewport()
  await expect
    .poll(async () => {
      const a = (await field.boundingBox())!,
        b = (await row.boundingBox())!
      return Math.abs(a.y + a.height / 2 - b.y - b.height / 2)
    })
    .toBeLessThan(3)
  await field.press('Escape')
  await field.press('Enter')
  await expect(row).toBeInViewport()
})

test('a narrow side popup leaves its trigger exposed after mouse hover', { tag: ['@layout', '@pointer'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 720 })
  for (const marginTop of [180, 500]) {
    await render(
      page,
      {
        surface: 'side',
        style: { marginTop },
        defaultValue: '8',
        options: Array.from({ length: 16 }, (_, i) => ({
          value: String(i),
          label: `Option ${i}`,
        })),
      },
      false,
      String(marginTop),
    )
    const field = page.getByRole('combobox'),
      row = page.getByRole('option', { name: 'Option 8', exact: true })
    await field.hover()
    await expect(row).toBeInViewport()
    await field.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    const trigger = (await field.boundingBox())!,
      panel = (await page.locator('.uf-select__content').boundingBox())!
    expect(
      panel.y >= trigger.y + trigger.height ||
        panel.y + panel.height <= trigger.y,
    ).toBe(true)
    await page.getByRole('option', { name: 'Option 10', exact: true }).click()
    await expect(field).toContainText('Option 10')
    await field.press('Enter')
    await expect(
      page.getByRole('option', { name: 'Option 10', exact: true }),
    ).toBeInViewport()
    await field.press('Escape')
  }
})

test('popover and side placement follow RTL including inherited direction', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 1300, height: 800 })
  for (const surface of ['popover', 'side'] as const) {
    await render(page, {
      surface,
      defaultValue: 'b',
      stretchText: true,
      style: { marginLeft: 450, width: 200 },
      contentMinWidth: 300,
    })
    await page.evaluate(() => {
      const section = document.querySelector('section')!
      section.style.width = '1100px'
      section.dir = 'rtl'
      ;(window as unknown as Hooks).renderSelect({
        surface: (document.querySelector('.uf-select') as HTMLElement).dataset
          .surface as SelectSurface,
        defaultValue: 'b',
        stretchText: true,
        style: { marginLeft: 450, width: 200 },
        contentMinWidth: 300,
      })
    })
    const field = page.getByRole('combobox')
    await field.focus()
    await page.keyboard.press('Enter')
    const content = page.locator('.uf-select__content')
    await expect(content).toHaveCSS('direction', 'rtl')
    await expect
      .poll(() =>
        field.evaluate((node, surface) => {
          const trigger = node.getBoundingClientRect()
          const popup = document
            .querySelector('.uf-select__content')!
            .getBoundingClientRect()
          return (
            popup.x >= 0 &&
            popup.right <= innerWidth &&
            (surface === 'side'
              ? popup.right <= trigger.x
              : Math.abs(popup.right - trigger.right) < 3)
          )
        }, surface),
      )
      .toBe(true)
    const indicator = (await field
        .locator('[data-part="indicator"]')
        .boundingBox())!,
      value = (await field.locator('[data-part="value"]').boundingBox())!
    expect(indicator.x).toBeLessThan(value.x)
    await page.keyboard.press('Escape')
  }
})

test('long lists scroll the active option into view without moving document focus or scrolling the page', { tag: ['@layout', '@focus'] }, async ({
  page,
}) => {
  await render(page, {
    surface: 'popover',
    options: Array.from({ length: 60 }, (_, i) => ({
      value: String(i),
      label: `Choice ${i}`,
    })),
  })
  const field = page.getByRole('combobox')
  await field.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('End')
  const last = page.getByRole('option', { name: 'Choice 59', exact: true }),
    panel = page.locator('.uf-select__contentPanel')
  await expect(last).toHaveAttribute('data-highlighted')
  await expect(field).toBeFocused()
  const row = (await last.boundingBox())!,
    viewport = (await panel.boundingBox())!
  expect(row.y + row.height).toBeLessThanOrEqual(
    viewport.y + viewport.height + 2,
  )
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.keyboard.press('Enter')
  await expect(field).toContainText('Choice 59')
})

test('controlled refusal restores form data and reset cancellation preserves a user selection', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, { surface: 'popover', name: 'plan', value: 'a' })
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  await expect(page.getByRole('combobox')).toContainText('Alpha')
  expect(
    await page
      .locator('#form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('plan')),
  ).toBe('a')
  await render(
    page,
    { surface: 'popover', name: 'plan', defaultValue: 'a' },
    false,
    'uncontrolled',
  )
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  await page.locator('#form').evaluate((form: HTMLFormElement) => {
    form.addEventListener('reset', (e) => e.preventDefault(), { once: true })
    form.reset()
  })
  await expect(page.getByRole('combobox')).toContainText('Beta')
  await page.locator('#form').evaluate((form: HTMLFormElement) => form.reset())
  await expect(page.getByRole('combobox')).toContainText('Alpha')
})

test('surface breakpoint, sheet title and close label work across a live viewport change', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 720 })
  await render(page, {
    surface: 'auto',
    surfaceBreakpoint: 700,
    surfaceTitle: 'Команда',
    closeLabel: 'Закрыть',
  })
  await page.getByRole('combobox').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.setViewportSize({ width: 650, height: 720 })
  const dialog = page.getByRole('dialog', { name: 'Команда' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('listbox')).toBeFocused()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('combobox')).toBeFocused()
})

test('production CSS preserves logical layout, focus, popup width and long labels', { tag: ['@layout', '@css', '@focus'] }, async ({
  page,
}) => {
  for (const theme of ['light', 'dark'])
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      await render(page, {
        surface: 'popover',
        dir,
        stretchText: true,
        defaultValue: 'long',
        contentMinWidth: 380,
        options: [
          {
            value: 'long',
            label:
              'A very long enterprise workspace name that continues without fitting the compact trigger',
          },
          { value: 'b', label: 'Beta' },
        ],
      })
      const field = page.getByRole('combobox')
      await field.focus()
      await expect(field).toHaveCSS('outline-style', 'solid')
      expect(
        await field.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThan(2)
      const indicator = (await field
          .locator('[data-part="indicator"]')
          .boundingBox())!,
        value = (await field.locator('[data-part="value"]').boundingBox())!
      if (dir === 'rtl') expect(indicator.x).toBeLessThan(value.x)
      else expect(indicator.x).toBeGreaterThan(value.x)
      await page.keyboard.press('Enter')
      const panel = page.locator('.uf-select__content')
      await expect(panel).toBeInViewport()
      expect((await panel.boundingBox())!.width).toBeGreaterThanOrEqual(379)
      const option = page.getByRole('option', {
        name: 'A very long enterprise workspace name that continues without fitting the compact trigger',
        exact: true,
      })
      expect(
        await option.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThan(2)
      await page.keyboard.press('Escape')
    }
})

test('forced colors retain focus, highlight and the selected marker', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await render(page, { surface: 'popover', defaultValue: 'b' })
  const field = page.getByRole('combobox')
  await field.focus()
  await expect(field).toHaveCSS('outline-style', 'solid')
  await expect(field).toHaveCSS('outline-width', '2px')
  await page.keyboard.press('Enter')
  const selected = page.getByRole('option', { name: 'Beta', exact: true })
  await expect(selected.locator('.uf-select__check')).toHaveCSS(
    'visibility',
    'visible',
  )
  const colors = await selected.evaluate((node) => {
    const style = getComputedStyle(node)
    return { fg: style.color, bg: style.backgroundColor }
  })
  expect(colors.fg).not.toBe(colors.bg)
})

test('touch taps open the sheet and commit a choice without hover activation', { tag: ['@pointer', '@layout'] }, async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 375, height: 720 },
  })
  const mobile = await context.newPage(),
    mobileErrors: string[] = []
  mobile.on('pageerror', (error) => mobileErrors.push(error.message))
  try {
    await open(mobile, 'select')
    await render(mobile, { surface: 'auto' })
    const field = mobile.getByRole('combobox')
    await field.dispatchEvent('pointerenter', { pointerType: 'touch' })
    await expect(mobile.getByRole('dialog')).toHaveCount(0)
    await field.tap()
    await expect(mobile.getByRole('dialog')).toBeVisible()
    await mobile.getByRole('option', { name: 'Beta', exact: true }).tap()
    await expect(field).toContainText('Beta')
    await expect(mobile.getByRole('dialog')).toHaveCount(0)
    expect(mobileErrors).toEqual([])
  } finally {
    await context.close()
  }
})

test('required validation can focus a select while its options are unavailable', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  await render(page, { options: [], required: true, name: 'plan' })
  const field = page.getByRole('combobox')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(field).toBeFocused()
  await expect(field).not.toHaveAttribute('disabled')
  await expect(field).toHaveAttribute('aria-disabled', 'true')
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(field).toBeFocused()
  await field.press('Enter')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await render(page, {
    options: [{ value: 'ready', label: 'Ready' }],
    required: true,
    name: 'plan',
  })
  await field.click()
  await page.getByRole('option', { name: 'Ready', exact: true }).click()
  expect(
    await page.locator('#form').evaluate((form) => ({
      valid: (form as HTMLFormElement).checkValidity(),
      value: new FormData(form as HTMLFormElement).get('plan'),
    })),
  ).toEqual({ valid: true, value: 'ready' })
})

test.describe('§5 #4/#10: interactive validation reports a required select', () => {
  const submits = (page: Page) =>
    page.evaluate(() => (window as unknown as { submits: number }).submits)
  const form = (page: Page) => page.locator('#form')
  test.beforeEach(async ({ page }) => {
    await render(page, { surface: 'popover', name: 'plan', required: true })
    // A native required field after the select: the report must stay on the
    // first invalid control instead of the last one.
    await form(page).evaluate((node: HTMLFormElement) => {
      const counter = window as unknown as { submits: number }
      counter.submits = 0
      node.addEventListener('submit', () => counter.submits++)
      node.append(
        Object.assign(document.createElement('input'), {
          id: 'note',
          name: 'note',
          required: true,
        }),
      )
    })
  })
  for (const [name, submit] of [
    ['a submit click', (page: Page) => page.getByRole('button', { name: 'Submit', exact: true }).click()],
    ['requestSubmit()', (page: Page) => form(page).evaluate((node: HTMLFormElement) => node.requestSubmit())],
    ['reportValidity()', (page: Page) => form(page).evaluate((node: HTMLFormElement) => void node.reportValidity())],
    ['Enter in a text field', (page: Page) => page.locator('#note').press('Enter')],
  ] as const)
    test(`${name} focuses the select trigger, again on a repeated submit`, { tag: ['@native', '@focus'] }, async ({ page }) => {
      for (let round = 0; round < 2; round++) {
        await page.locator('#before').focus()
        await submit(page)
        await expect(page.getByRole('combobox')).toBeFocused()
      }
      expect(await submits(page)).toBe(0)
    })
  test('checkValidity() leaves focus in the field being edited', { tag: ['@native', '@focus'] }, async ({ page }) => {
    await page.locator('#note').focus()
    expect(await form(page).evaluate((node: HTMLFormElement) => node.checkValidity())).toBe(false)
    await page.evaluate(() => new Promise(requestAnimationFrame))
    await expect(page.locator('#note')).toBeFocused()
  })
  test('a chosen value passes the report on to the next invalid field, then the form submits', { tag: ['@native', '@focus'] }, async ({ page }) => {
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Beta', exact: true }).click()
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.locator('#note')).toBeFocused()
    await page.locator('#note').fill('Soon')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect.poll(() => submits(page)).toBe(1)
  })
  test('the proxy covers the select, so the browser anchors its bubble there', { tag: ['@layout'] }, async ({ page }) => {
    const [proxy, root] = await Promise.all([
      page.locator('#form select').boundingBox(),
      page.locator('.uf-select').boundingBox(),
    ])
    expect(proxy).toEqual(root)
  })
})
