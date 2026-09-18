import axe from 'axe-core'
import { test, expect, type Page } from '@playwright/test'
const render = (page: Page, options = {}) =>
  page.evaluate((options) => (window as any).renderBreadcrumb(options), options)
const events = (page: Page) =>
  page.evaluate(() => (window as any).breadcrumbEvents)
test.beforeEach(async ({ page }) => {
  await page.goto(
    '/.artifacts/browser-production/scripts/browser/breadcrumb.html',
  )
  await page.waitForFunction(
    () => typeof (window as any).renderBreadcrumb === 'function',
  )
})
test('normal destination navigates without an opt-in prop', async ({
  page,
}) => {
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL(/#home$/)
})
test('current item without a destination is not exposed as a link', async ({
  page,
}) => {
  await expect(page.locator('[aria-current="page"]')).toHaveText('Current')
  await expect(
    page.getByRole('link', { name: 'Current', exact: true }),
  ).toHaveCount(0)
})
test('moving ancestors into the portal preserves design-system typography', async ({
  page,
}) => {
  const typography = (node: Element) => {
    const style = getComputedStyle(node)
    return {
      family: style.fontFamily,
      size: style.fontSize,
      weight: style.fontWeight,
      lineHeight: style.lineHeight,
      spacing: style.letterSpacing,
    }
  }
  await render(page, { maxItems: null })
  const inline = await page
    .getByRole('link', { name: 'Library', exact: true })
    .evaluate(typography)
  await render(page, { maxItems: 4 })
  await page.getByRole('button', { name: 'Show path', exact: true }).click()
  const popup = await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Library', exact: true })
    .evaluate(typography)
  expect(popup).toEqual(inline)
})
test('router-handled item behaves identically in the line and overflow', async ({
  page,
}) => {
  await render(page, { callbacks: true, maxItems: 99 })
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  expect(await events(page)).toHaveLength(1)
  expect(new URL(page.url()).hash).toBe('')
  await render(page, { callbacks: true, maxItems: 4 })
  await page.getByRole('button', { name: 'Show path', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Library', exact: true })
    .click()
  expect(await events(page)).toHaveLength(1)
  expect(new URL(page.url()).hash).toBe('')
})
test('capture cancellation cancels client navigation as well', async ({
  page,
}) => {
  await render(page, { callbacks: true, cancelCapture: true })
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  expect(await events(page)).toEqual([])
})
test('shared membrane padding can activate a real link', async ({ page }) => {
  await render(page, {})
  await page
    .getByRole('link', { name: 'Home', exact: true })
    .locator('..')
    .click({ position: { x: 1, y: 1 } })
  await expect(page).toHaveURL(/#home$/)
})
test('separators are hidden from the accessibility tree', async ({ page }) => {
  const separators = page.locator(
    '[data-part="separator"][data-scope="breadcrumb"]',
  )
  await expect(separators).toHaveCount(3)
  for (const separator of await separators.all())
    await expect(separator).toHaveAttribute('aria-hidden', 'true')
})

test('link hover has the same appearance on its body and membrane padding', async ({
  page,
}) => {
  const link = page.getByRole('link', { name: 'Home', exact: true })
  const colors = () =>
    link.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
    }))
  await link.hover()
  const expected = await colors()
  await link.locator('..').hover({ position: { x: 1, y: 1 } })
  expect(await colors()).toEqual(expected)
})

test('native Tab opens the overflow, focuses its links and Escape returns to its trigger', async ({
  page,
}) => {
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Home', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  const trigger = page.getByRole('button', { name: 'Show path', exact: true })
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: 'Library', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('dialog')).toBeHidden()
})
test('actions without href activate with Space and do not submit a parent form', async ({
  page,
}) => {
  await render(page, { actions: true, callbacks: true, maxItems: null })
  const action = page.getByRole('button', { name: 'Home', exact: true })
  await action.focus()
  await page.keyboard.press('Space')
  expect(await events(page)).toEqual([
    { label: 'Home', target: 'BUTTON', type: 'click' },
  ])
})
test('live maxItems keeps focus on retained ancestors and redirects a newly hidden ancestor to overflow', async ({
  page,
}) => {
  await render(page, { maxItems: null })
  await page.getByRole('link', { name: 'Home', exact: true }).focus()
  await render(page, { maxItems: 3 })
  await expect(
    page.getByRole('link', { name: 'Home', exact: true }),
  ).toBeFocused()
  await render(page, { maxItems: null })
  await page.getByRole('link', { name: 'Library', exact: true }).focus()
  await render(page, { maxItems: 3 })
  await expect(
    page.getByRole('button', { name: 'Show path', exact: true }),
  ).toBeFocused()
})
test('expanding the full trail moves focus from the closing popup to the same visible location', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show path', exact: true }).click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: 'Library', exact: true }),
  ).toBeFocused()
  await render(page, { maxItems: null })
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(
    page.getByRole('link', { name: 'Library', exact: true }),
  ).toBeFocused()
})
test('hidden closes the portal and reveal keeps it closed', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show path', exact: true }).click()
  await render(page, { props: { hidden: true } })
  await expect(page.locator('nav')).toBeHidden()
  await expect(page.getByRole('dialog')).toBeHidden()
  await render(page)
  await expect(page.locator('nav')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
})
for (const theme of ['light', 'dark'])
  for (const dir of ['ltr', 'rtl']) {
    test(`${theme}/${dir}: localized long paths wrap in a narrow container and the popup remains accessible`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme
      }, theme)
      await render(page, {
        props: {
          dir,
          lang: 'ru',
          overflowLabel: 'Все разделы',
          'aria-label': 'Путь документа',
          items: Array.from({ length: 12 }, (_, i) => ({
            key: i,
            label: `Очень длинное имя раздела документа номер ${i}`,
            href: i < 11 ? `#section-${i}` : undefined,
          })),
        },
      })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(360)
      const outside = await page.locator('nav').evaluate((nav) => {
        const bounds = nav.getBoundingClientRect()
        return Array.from(nav.querySelectorAll('.uf-breadcrumb-label')).flatMap(
          (label) => {
            const range = document.createRange()
            range.selectNodeContents(label)
            return Array.from(range.getClientRects())
              .filter(
                (rect) =>
                  rect.left < bounds.left - 1 || rect.right > bounds.right + 1,
              )
              .map(() => label.textContent)
          },
        )
      })
      expect(outside).toEqual([])
      await page
        .getByRole('button', { name: 'Все разделы', exact: true })
        .click()
      const dialog = page.getByRole('dialog', { name: 'Все разделы' })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('dir', dir)
      await expect(async () => {
        const bounds = await dialog.boundingBox()
        expect(bounds!.x).toBeGreaterThanOrEqual(-1)
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(361)
      }).toPass()
      await page.addScriptTag({ content: axe.source })
      const violations = await page.evaluate(
        async () =>
          (
            await (window as any).axe.run(document, {
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
              },
            })
          ).violations,
      )
      expect(violations).toEqual([])
    })
  }

for (const target of ['link', 'membrane', 'overflow'] as const) {
  test(`native modified activation opens a new tab from ${target}`, async ({
    page,
    context,
  }) => {
    let link = page.getByRole('link', { name: 'Home', exact: true })
    if (target === 'overflow') {
      await page.getByRole('button', { name: 'Show path', exact: true }).click()
      link = page
        .getByRole('dialog')
        .getByRole('link', { name: 'Library', exact: true })
    }
    const newTab = context.waitForEvent('page')
    if (target === 'membrane')
      await link
        .locator('..')
        .click({ modifiers: ['ControlOrMeta'], position: { x: 1, y: 1 } })
    else await link.click({ modifiers: ['ControlOrMeta'] })
    const tab = await newTab
    await tab.waitForFunction(
      () => typeof (window as any).renderBreadcrumb === 'function',
    )
    await expect(tab).toHaveURL(target === 'overflow' ? /#library$/ : /#home$/)
    expect(new URL(page.url()).hash).toBe('')
    await tab.close()
  })
}

test('a disabled ancestor blocks native link membrane padding and enabling restores it', async ({
  page,
}) => {
  await render(page, { callbacks: true, props: { 'aria-disabled': true } })
  const wrapper = page
    .getByRole('link', { name: 'Home', exact: true })
    .locator('..')
  let bounds = await wrapper.boundingBox()
  await page.mouse.click(bounds!.x + 1, bounds!.y + 1)
  expect(await events(page)).toEqual([])
  await render(page, { callbacks: true })
  bounds = await wrapper.boundingBox()
  await page.mouse.click(bounds!.x + 1, bounds!.y + 1)
  expect(await events(page)).toEqual([
    { label: 'Home', target: 'A', type: 'click' },
  ])
})
test('disabling membrane removes the extra native link hit area without replacing the anchor', async ({
  page,
}) => {
  await page
    .getByRole('link', { name: 'Home', exact: true })
    .evaluate((node) => {
      ;(window as any).savedCrumb = node
    })
  await render(page, { callbacks: true, props: { membrane: false } })
  const link = page.getByRole('link', { name: 'Home', exact: true })
  expect(
    await link.evaluate((node) => node === (window as any).savedCrumb),
  ).toBe(true)
  expect(
    await link.evaluate((node) => getComputedStyle(node, '::before').content),
  ).toBe('none')
  const bounds = await link.boundingBox()
  await page.mouse.click(bounds!.x - 1, bounds!.y + 1)
  expect(await events(page)).toEqual([])
  await link.click()
  expect(await events(page)).toHaveLength(1)
})
