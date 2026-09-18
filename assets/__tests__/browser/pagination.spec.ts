import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/pagination.fixture'
import axe from 'axe-core'
const { renderPagination: render } = hooks<Hooks>()
const current = (page: Page) =>
  page.locator('.uf-pagination-page[aria-current="page"]')
const events = (page: Page) =>
  page.evaluate(() => (window as any).paginationEvents)
const assertTextFits = async (page: Page) => {
  const failures = await page.locator('nav').evaluate((nav) => {
    const lines: Array<{ label: string; rect: DOMRect }> = [],
      failures: string[] = []
    for (const label of nav.querySelectorAll('.uf-button__label')) {
      const button = label.closest('button')!.getBoundingClientRect()
      if (!button.width || !button.height) continue
      const range = document.createRange()
      range.selectNodeContents(label)
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue
        if (rect.left < button.left - 1 || rect.right > button.right + 1)
          failures.push(`outside button: ${label.textContent}`)
        lines.push({ label: label.textContent || '', rect })
      }
    }
    for (let a = 0; a < lines.length; a++)
      for (let b = a + 1; b < lines.length; b++) {
        if (lines[a].label === lines[b].label) continue
        const x = lines[a].rect,
          y = lines[b].rect
        if (
          Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
          Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1
        )
          failures.push(`overlap: ${lines[a].label} / ${lines[b].label}`)
      }
    return failures
  })
  expect(failures).toEqual([])
}
test.beforeEach(async ({ page }) => {
  await open(page, 'pagination')
})

test('disabled navigation has the same effective opacity as an independent Button', { tag: ['@css'] }, async ({
  page,
}) => {
  await render(page, { disabled: true })
  const opacity = async (selector: string) =>
    page.locator(selector).evaluate((node) => {
      let result = 1,
        element: Element | null = node
      while (element) {
        result *= Number(getComputedStyle(element).opacity)
        element = element.parentElement
      }
      return result
    })
  expect(await opacity('.uf-pagination-navNext')).toBe(
    await opacity('#reference button'),
  )
})

test('navigation controls inherit the shared Button typography and geometry', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  const measure = async (selector: string) =>
    page.locator(selector).evaluate((node) => {
      const s = getComputedStyle(node)
      return {
        font: s.font,
        padding: s.padding,
        height: node.getBoundingClientRect().height,
      }
    })
  expect(await measure('.uf-pagination-navNext')).toEqual(
    await measure('#reference button'),
  )
})

test('360px navigation stays inside its container and keeps a visible page indication', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await render(page, { defaultPage: 50 }, { reset: true })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360)
  const bounds = await page.locator('nav').boundingBox()
  const next = await page.locator('.uf-pagination-navNext').boundingBox()
  expect(next!.x + next!.width).toBeLessThanOrEqual(
    bounds!.x + bounds!.width + 1,
  )
  await assertTextFits(page)
})

test('current-page colors stay aligned while the membrane is hovered', { tag: ['@css', '@pointer'] }, async ({
  page,
}) => {
  const node = current(page)
  const color = () =>
    node.evaluate((n) => ({
      bg: getComputedStyle(n).backgroundColor,
      fg: getComputedStyle(n).color,
    }))
  const reference = page.locator('#selected-reference button')
  await reference.locator('..').hover({ position: { x: 1, y: 1 } })
  const expected = await reference.evaluate((n) => ({
    bg: getComputedStyle(n).backgroundColor,
    fg: getComputedStyle(n).color,
  }))
  await node.locator('..').hover({ position: { x: 1, y: 1 } })
  expect(await color()).toEqual(expected)
})

test('native keyboard, capture cancellation and membrane use one navigation action', { tag: ['@native', '@focus', '@pointer'] }, async ({
  page,
}) => {
  await render(page, { defaultPage: 2 }, { reset: true })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('.uf-pagination-navPrev')).toBeFocused()
  expect(
    await page
      .locator('.uf-pagination-navPrev')
      .evaluate((n) => getComputedStyle(n).boxShadow),
  ).not.toBe('none')
  await page.keyboard.press('Space')
  await expect(current(page)).toHaveText('1')
  expect(await events(page)).toEqual([{ page: 1 }])
  const next = page.locator('.uf-pagination-navNext')
  await render(page, {}, { cancelClick: true })
  await next.click()
  expect(await events(page)).toHaveLength(1)
  await render(page)
  await next.locator('..').click({ position: { x: 1, y: 1 } })
  await expect(next).toBeFocused()
  await expect(current(page)).toHaveText('2')
  expect(await events(page)).toEqual([{ page: 1 }, { page: 2 }])
})

test('membrane toggling and container resizing preserve the focused page button and state', { tag: ['@layout', '@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultPage: 50 }, { reset: true })
  await current(page).focus()
  await current(page).evaluate(
    (n) => ((window as any).rememberedPageButton = n),
  )
  for (const [width, membrane] of [
    [328, false],
    [700, true],
  ] as const) {
    await render(page, { style: { width }, membrane })
    await expect(current(page)).toBeFocused()
    expect(
      await current(page).evaluate(
        (n) => n === (window as any).rememberedPageButton,
      ),
    ).toBe(true)
    await assertTextFits(page)
  }
  expect(await events(page)).toEqual([])
})

test('picker validates input, uses Enter once and restores focus without submitting the parent form', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Choose page', exact: true }).click()
  const input = page.getByRole('spinbutton', { name: 'Page number' }),
    go = page.getByRole('button', { name: 'Go to page', exact: true })
  for (const value of ['', '0', '2.5', '101']) {
    await input.fill(value)
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(go).toBeDisabled()
    await input.press('Enter')
  }
  expect(await events(page)).toEqual([])
  await input.fill('27')
  await expect(go).toBeEnabled()
  await input.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Choose page', exact: true }),
  ).toBeFocused()
  await expect(current(page)).toHaveText('27')
  expect(await events(page)).toEqual([{ page: 27 }])
  await page.getByRole('button', { name: 'Choose page', exact: true }).click()
  await expect(input).toHaveValue('27')
  await page.keyboard.press('Escape')
})

test('picker input, submit and close participate in native Tab navigation', { tag: ['@focus'] }, async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Choose page', exact: true }).click()
  await page.getByRole('spinbutton').focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Go to page', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused()
})

test('live bounds and disabled update picker validity while close stays available', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Choose page', exact: true }).click()
  const input = page.getByRole('spinbutton'),
    go = page.getByRole('button', { name: 'Go to page', exact: true })
  await input.fill('50')
  await render(page, { total: 50 })
  await expect(input).toHaveAttribute('max', '5')
  await expect(input).toHaveValue('50')
  await expect(go).toBeDisabled()
  await render(page, { disabled: true })
  await expect(input).toBeDisabled()
  await expect(go).toBeDisabled()
  await page
    .getByRole('button', { name: 'Close', exact: true })
    .locator('..')
    .click({ position: { x: 1, y: 1 } })
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await events(page)).toEqual([])
})

for (const theme of ['light', 'dark'])
  for (const dir of ['ltr', 'rtl']) {
    test(`${theme}/${dir}: long localized labels, narrow container, page range and accessible picker`, { tag: ['@layout', '@a11y'] }, async ({
      page,
    }) => {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      const labels = {
        previousPage: 'Предыдущая страница журнала',
        nextPage: 'Следующая страница журнала',
        page: 'Страница {page}',
        choosePage: 'Выбрать страницу',
        pageNumber: 'Номер страницы',
        goToPage: 'Перейти',
        close: 'Закрыть',
      }
      for (const width of [1000, 360]) {
        await page.setViewportSize({ width, height: 850 })
        await render(
          page,
          {
            dir,
            lang: 'ru',
            labels,
            defaultPage: 50,
            style: { maxWidth: 480 },
            'aria-label': 'Страницы журнала',
            surfaceTitle: 'Переход по журналу',
          },
          { reset: true },
        )
        await expect(
          page.getByRole('navigation', { name: 'Страницы журнала' }),
        ).toBeVisible()
        await assertTextFits(page)
        // Compare the same layout after resize, not two browser frames.
        const heights = await page.locator('nav').evaluate((nav) =>
          ['.uf-pagination-navPrev', '.uf-pagination-navNext'].map(
            selector => nav.querySelector(selector)!.getBoundingClientRect().height,
          ),
        )
        expect(heights[0]).toBeCloseTo(heights[1], 0)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width)
        await page
          .getByRole('button', { name: 'Выбрать страницу', exact: true })
          .click()
        const dialog = page.getByRole('dialog', { name: 'Переход по журналу' })
        await expect(dialog).toBeVisible()
        await expect(dialog).toHaveAttribute('dir', dir)
        await expect(dialog.locator('bdi[dir="ltr"]')).toHaveText('1–100')
        await expect(
          page.getByRole('spinbutton', { name: 'Номер страницы' }),
        ).toHaveValue('50')
        await page.addScriptTag({ content: axe.source })
        const issues = await page.evaluate(
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
        expect(issues).toEqual([])
        await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
      }
    })
  }
