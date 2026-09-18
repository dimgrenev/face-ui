import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

test.beforeEach(async ({ page }) => {
  await page.goto('/scripts/browser/')
})

test('computed geometry, heading hierarchy, composition and compact width', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Face UI quality fixture' }),
  ).toHaveCSS('font-size', '24px')
  await expect(
    page.getByRole('heading', { name: 'Nested large heading' }),
  ).toHaveCSS('font-size', '18px')
  await expect(page.getByLabel('Native consumer input')).toHaveCSS(
    'border-top-width',
    '3px',
  )
  for (const membrane of [true, false]) {
    const section = page.locator(`[data-fixture="geometry-${membrane}"]`)
    const button = section.getByRole('button', { name: 'Button', exact: true })
    expect((await button.boundingBox())!.width).toBeLessThan(150)
    await expect(button).toHaveCSS('height', '32px')
    if (membrane) {
      const outer = await button.locator('..').boundingBox()
      const inner = await button.boundingBox()
      expect(outer!.height - inner!.height).toBe(2)
    }
  }
})

test('nested layers dismiss only the top layer and restore focus and scrolling', async ({
  page,
}) => {
  const initialInertCount = await page.locator('[inert]').count()
  await page.getByRole('button', { name: 'Open parent', exact: true }).click()
  const parent = page.getByRole('dialog', { name: 'Parent', exact: true })
  await expect(parent).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await parent.getByRole('button', { name: 'Open child', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Child', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Child', exact: true }),
  ).toHaveCount(0)
  await expect(parent).toBeVisible()
  await expect(
    parent.getByRole('button', { name: 'Open child', exact: true }),
  ).toBeFocused()
  await parent.getByRole('button', { name: 'Open popover' }).click()
  await expect(
    page.getByRole('button', { name: 'Popover action' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(parent).toBeVisible()
  await expect(
    parent.getByRole('button', { name: 'Open popover' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(parent).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Open parent', exact: true }),
  ).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await expect(page.locator('[inert]')).toHaveCount(initialInertCount)
})

test('advanced range and crop work with keyboard in both orientations', async ({
  page,
}) => {
  const range = page.getByRole('slider', { name: 'Range 1', exact: true })
  await range.focus()
  await page.keyboard.press('ArrowRight')
  await expect(range).toHaveValue('21')
  const vertical = page.getByRole('slider', { name: 'Vertical', exact: true })
  await vertical.focus()
  await page.keyboard.press('ArrowUp')
  await expect(vertical).toHaveValue('41')
  await expect(vertical).toHaveAttribute('aria-orientation', 'vertical')
  const crop = page
    .getByRole('slider', { name: 'Vertical Crop start', exact: true })
    .last()
  await crop.focus()
  await page.keyboard.press('ArrowUp')
  await expect(crop).toHaveValue('1')
})

for (const mode of ['light', 'dark'] as const) {
  test(`accessible rendered fixture in ${mode} theme`, async ({ page }) => {
    await page
      .locator('html')
      .evaluate((el, mode) => el.setAttribute('data-theme', mode), mode)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(
      async () =>
        (
          await (window as any).axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations,
    )
    expect(
      violations.map((v: any) => ({
        id: v.id,
        nodes: v.nodes.map((n: any) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([])
  })
}

test('mobile viewport has no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1)
})

test('calendar moves actual focus and selects a range with keyboard', async ({
  page,
}) => {
  await page.goto('/scripts/browser/gallery.html?component=Calendar&range=true')
  const first = page.locator('[data-date="2026-03-06"]')
  await first.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-date="2026-03-07"]')).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect(page.locator('[data-range-start]')).toHaveAttribute(
    'data-date',
    '2026-03-07',
  )
  await expect(page.locator('[data-range-end]')).toHaveAttribute(
    'data-date',
    '2026-03-08',
  )
})

test('native form controls preserve reset, validation and a single change per action', async ({
  page,
}) => {
  const form = page.locator('[data-fixture="native-form"]')
  const checkbox = form.getByRole('checkbox', { name: 'Terms' })
  await checkbox.focus()
  await page.keyboard.press('Space')
  await expect(checkbox).not.toBeChecked()
  expect(await form.evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(
    false,
  )
  await form.getByRole('switch', { name: 'Notifications' }).focus()
  await page.keyboard.press('Space')
  await form.getByRole('textbox', { name: 'Owner' }).fill('Grace')
  await form.getByRole('radio', { name: 'Beta' }).focus()
  await page.keyboard.press('Space')
  await form.getByRole('button', { name: 'Reset native form' }).click()
  await expect(checkbox).toBeChecked()
  await expect(
    form.getByRole('switch', { name: 'Notifications' }),
  ).toBeChecked()
  await expect(form.getByRole('textbox', { name: 'Owner' })).toHaveValue('Ada')
  await expect(form.getByRole('radio', { name: 'Alpha' })).toBeChecked()
  expect(
    await form.evaluate((el: HTMLFormElement) =>
      Object.fromEntries(new FormData(el)),
    ),
  ).toEqual({
    terms: 'on',
    notifications: 'on',
    owner: 'Ada',
    frequency: 'a',
    choice: 'a',
    date: '2026-09-11',
  })
})

test('server markup hydrates without recovery and remains interactive', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/scripts/browser/hydration')
  await expect(page.getByRole('checkbox', { name: 'Partial selection', exact: true })).toBeChecked({indeterminate:true})
  const serverSwitch = page.getByRole('switch', { name: 'Notifications', exact: true })
  await expect(serverSwitch).toBeChecked()
  await serverSwitch.focus()
  await page.keyboard.press('Space')
  await expect(serverSwitch).not.toBeChecked()
  await expect(page.getByRole('radio', { name: 'Standard', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Standard', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Professional', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Details trigger' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Details', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open dialog' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Dialog', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('native navigation activation and modal sheets share keyboard behavior', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Run panel', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Navigation actions')).toHaveText('1')
  await page
    .getByRole('menuitem', { name: 'Run navigation', exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Navigation actions')).toHaveText('2')
  await page
    .getByRole('menuitem', { name: 'Navigation group', exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('menuitem', { name: 'Child action', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('menuitem', { name: 'Navigation group', exact: true }),
  ).toBeFocused()
  for (const [trigger, title] of [
    ['Open panel', 'Project panel'],
    ['Open navigation', 'Project navigation'],
  ]) {
    await page.getByRole('button', { name: trigger, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: title, exact: true })
    await expect(dialog).toBeVisible()
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole('button', { name: trigger, exact: true }),
    ).toBeFocused()
  }
})

test('date views, closeOnSelect and reopening follow the public contract', async ({
  page,
}) => {
  const trigger = page.getByRole('combobox', { name: 'Deadline', exact: true })
  await trigger.click()
  let dialog = page.getByRole('dialog', { name: 'Deadline', exact: true })
  await dialog.getByRole('button', { name: 'Month', exact: true }).click()
  await expect(
    dialog.getByRole('button', { name: 'Sep', exact: true }),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Day', exact: true }).click()
  await dialog.getByRole('button', { name: /September 15, 2026/ }).click()
  await expect(dialog).toBeHidden()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Stay open', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Stay open', exact: true })
  await dialog.getByRole('button', { name: /September 15, 2026/ }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Now', exact: true }).click()
  await expect(dialog).toBeVisible()
})

test('half ratings retain a selected radio and carousel excludes offscreen controls', async ({
  page,
}) => {
  const rating = page.getByRole('radiogroup', { name: 'Quality', exact: true })
  const half = rating.getByRole('radio', { name: '2.5 stars', exact: true })
  await expect(half).toBeChecked()
  await half.focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    rating.getByRole('radio', { name: '3 stars', exact: true }),
  ).toBeFocused()
  await rating.getByRole('radio', { name: '1.5 stars', exact: true }).click()
  await expect(
    rating.getByRole('radio', { name: '1.5 stars', exact: true }),
  ).toBeChecked()
  const carousel = page.getByRole('region', {
    name: 'Multiple slides',
    exact: true,
  })
  await expect(
    carousel.getByRole('button', { name: 'Slide three', exact: true }),
  ).toHaveCount(0)
  await carousel
    .getByRole('button', { name: 'Next slide', exact: true })
    .click()
  await expect(
    carousel.getByRole('button', { name: 'Next slide', exact: true }),
  ).toBeDisabled()
  await expect(
    carousel.getByRole('button', { name: 'Slide one', exact: true }),
  ).toHaveCount(0)
})

test('custom fields submit values, validate and reset through their native form', async ({
  page,
}) => {
  const form = page.locator('[data-fixture="native-form"]')
  const entries = () =>
    form.evaluate((node) =>
      Object.fromEntries(new FormData(node as HTMLFormElement)),
    )
  expect(await entries()).toMatchObject({ choice: 'a', date: '2026-09-11' })
  await form.getByRole('combobox', { name: 'Form choice', exact: true }).click()
  await page.getByRole('option', { name: 'Beta', exact: true }).click()
  expect(await entries()).toMatchObject({ choice: 'b' })
  await form.getByRole('combobox', { name: 'Form date', exact: false }).click()
  await page
    .getByRole('dialog', { name: 'Form date', exact: true })
    .getByRole('button', { name: 'Clear', exact: true })
    .click()
  await page.keyboard.press('Escape')
  expect(
    await form.evaluate((node) => (node as HTMLFormElement).checkValidity()),
  ).toBe(false)
  await form.getByRole('button', { name: 'Reset native form' }).click()
  await expect.poll(entries).toMatchObject({ choice: 'a', date: '2026-09-11' })
  expect(
    await form.evaluate((node) => (node as HTMLFormElement).checkValidity()),
  ).toBe(true)
})

test('hover preserves control geometry and membranes have one boundary', async ({
  page,
}) => {
  const button = page
    .locator('[data-fixture="geometry-true"]')
    .getByRole('button', { name: 'Button', exact: true })
  const before = await button.boundingBox()
  await button.hover()
  const after = await button.boundingBox()
  expect(after?.width).toBeCloseTo(before!.width, 1)
  expect(after?.height).toBeCloseTo(before!.height, 1)
  await page.getByRole('button', { name: 'Open parent', exact: true }).click()
  const trigger = page
    .getByRole('dialog', { name: 'Parent', exact: true })
    .getByRole('button', { name: 'Open popover' })
  expect(
    await trigger.evaluate((node) => {
      let count = 0
      for (
        let parent = node.parentElement;
        parent && !parent.matches('[role="dialog"]');
        parent = parent.parentElement
      )
        if (parent.matches('.uf-membrane:not([data-membrane-disabled])')) count++
      return count
    }),
  ).toBe(1)
})

test('reverse date range retains both endpoints and closes on completion', async ({
  page,
}) => {
  const trigger = page.getByRole('combobox', { name: 'Period', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Period', exact: true })
  await dialog.getByRole('button', { name: /September 8, 2026/ }).click()
  await expect(dialog).toBeHidden()
  await trigger.click()
  await expect(
    dialog
      .getByRole('button', { name: /September 8, 2026/ })
      .locator('xpath=ancestor::td'),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    dialog
      .getByRole('button', { name: /September 11, 2026/ })
      .locator('xpath=ancestor::td'),
  ).toHaveAttribute('aria-selected', 'true')
})

test('page jump stays bounded for a million pages', async ({ page }) => {
  const pagination = page.locator('[data-fixture="pagination"]')
  expect(await pagination.locator('*').count()).toBeLessThan(150)
  await pagination
    .getByRole('button', { name: 'Choose page', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Choose page', exact: true })
  await dialog.getByRole('spinbutton', { name: 'Page number' }).fill('1000000')
  await dialog.getByRole('button', { name: 'Go to page' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    pagination.getByRole('button', { name: 'Next page', exact: true }),
  ).toBeDisabled()
})

test('accordion arrows skip disabled sections and move actual focus', async ({
  page,
}) => {
  const first = page.getByRole('button', {
    name: 'Accordion first',
    exact: true,
  })
  const last = page.getByRole('button', { name: 'Accordion last', exact: true })
  await first.focus()
  await page.keyboard.press('ArrowDown')
  await expect(last).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(last).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Home')
  await expect(first).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(last).toBeFocused()
})
