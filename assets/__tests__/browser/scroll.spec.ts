import { test, expect, type Locator, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/scroll.fixture'

const { renderScroll: render } = hooks<Hooks>()
const rows = (count: number, text = 'row') =>
  Array.from({ length: count }, (_, index) => `${text} ${index + 1}`).join('\n')
/** The scrolling viewport; native attributes such as data-testid land on it. */
const viewport = (page: Page) => page.getByTestId('subject')
const outer = (page: Page) => viewport(page).locator('xpath=..')
const box = (locator: Locator) =>
  locator.evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect)
const overflow = (locator: Locator) =>
  locator.evaluate((node) => ({
    x: node.scrollWidth - node.clientWidth,
    y: node.scrollHeight - node.clientHeight,
  }))

test.beforeEach(async ({ page }) => {
  await open(page, 'scroll')
})

test('the viewport is a named tab stop only while it can scroll', { tag: ['@focus'] }, async ({
  page,
  browserName,
}) => {
  /** Shift+Tab from the button after the box: the viewport when it is a tab stop. */
  const previousStop = async () => {
    await page.locator('#after').focus()
    await page.keyboard.press('Shift+Tab')
    return page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  }
  await render(page, { children: rows(3), height: 240 })
  await expect(viewport(page)).toHaveAttribute('tabindex', '-1')
  expect(await previousStop()).toBeNull()
  await expect(page.getByRole('region')).toHaveCount(0)

  await render(page, { children: rows(40), height: 240 })
  await expect(viewport(page)).toHaveAttribute('tabindex', '0')
  expect(await previousStop()).toBe('subject')
  await expect(page.getByRole('region', { name: 'Scrollable content' })).toBeFocused()

  await render(page, { children: rows(40), height: 240, 'aria-label': 'Build log' })
  await expect(page.getByRole('region', { name: 'Build log' })).toHaveAttribute('tabindex', '0')

  // Scroll owns the tab stop; Playwright's WebKit does not scroll a focused box with arrow keys.
  if (browserName === 'webkit') return
  await viewport(page).focus()
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => viewport(page).evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
})

test('a focused viewport whose content shrinks to fit keeps focus, and Tab continues after it', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { children: rows(40), height: 240 })
  await expect(viewport(page)).toHaveAttribute('tabindex', '0')
  await viewport(page).focus()
  await render(page, { children: rows(2), height: 240 }, { update: true })
  await expect(viewport(page)).toHaveAttribute('tabindex', '-1')
  await expect(viewport(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('#after')).toBeFocused()
})

test('content that grows past the box makes the viewport a tab stop', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { children: rows(2), height: 240 })
  await expect(viewport(page)).toHaveAttribute('tabindex', '-1')
  await render(page, { children: rows(40), height: 240 }, { update: true })
  await expect(viewport(page)).toHaveAttribute('tabindex', '0')
})

test('overflowing, named and fitting boxes pass axe, including scrollable-region-focusable', { tag: ['@a11y'] }, async ({
  page,
}) => {
  for (const props of [
    { children: rows(40), height: 120 },
    { children: rows(40), height: 120, 'aria-label': 'Build log' },
    { children: `${'wide '.repeat(60)}\n${rows(20)}`, height: 120, orientation: 'both' as const },
    { children: rows(2) },
  ]) {
    await render(page, props)
    if (props.height) await expect(viewport(page)).toHaveAttribute('tabindex', '0')
    expect(await axe(page), JSON.stringify(props).slice(0, 60)).toEqual([])
  }
})

test('height sizes the box and the viewport fills it and scrolls', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { children: rows(40), height: 200 })
  expect((await box(outer(page))).height).toBeCloseTo(200, 0)
  const border = await outer(page).evaluate((node) => parseFloat(getComputedStyle(node).borderTopWidth))
  expect((await box(viewport(page))).height).toBeCloseTo(200 - 2 * border, 0)
  expect((await overflow(viewport(page))).y).toBeGreaterThan(0)

  await render(page, { children: rows(2), height: '10rem' })
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  expect((await box(outer(page))).height).toBeCloseTo(10 * rem, 0)
})

test('without height the box is as tall as its content; style.maxHeight caps it and the rest scrolls', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { children: rows(3) })
  const natural = (await box(outer(page))).height
  expect((await overflow(viewport(page))).y).toBe(0)
  await render(page, { children: rows(4) })
  expect((await box(outer(page))).height).toBeGreaterThan(natural)

  await render(page, { children: rows(3), style: { maxHeight: 400 } })
  expect((await box(outer(page))).height).toBeCloseTo(natural, 0)
  await render(page, { children: rows(40), style: { maxHeight: 200 } })
  expect((await box(outer(page))).height).toBeCloseTo(200, 0)
  expect((await overflow(viewport(page))).y).toBeGreaterThan(0)
  await expect(viewport(page)).toHaveAttribute('tabindex', '0')
})

test('in a flex column the box fills the rest of the column and scrolls', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { children: rows(40), style: { flex: 1, minHeight: 0 } }, { column: true })
  // 300px column, 40px header.
  expect((await box(outer(page))).height).toBeCloseTo(260, 0)
  expect((await overflow(viewport(page))).y).toBeGreaterThan(0)
})

for (const direction of ['ltr', 'rtl'] as const)
  test(`text wraps in a vertical box and keeps each line whole where it scrolls sideways (${direction})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    const long = `${'word '.repeat(80).trim()}\nshort`
    const text = viewport(page).locator('.uf-text__content')
    const lineHeight = () =>
      text.evaluate((node) => parseFloat(getComputedStyle(node).lineHeight))

    await render(page, { children: long, height: 240 }, { direction })
    expect((await box(text)).height).toBeGreaterThan(3 * (await lineHeight()))
    expect((await overflow(viewport(page))).x).toBe(0)

    for (const orientation of ['horizontal', 'both'] as const) {
      await render(page, { children: long, orientation, height: 240 }, { direction })
      // Two source lines, two rendered lines.
      expect((await box(text)).height).toBeCloseTo(2 * (await lineHeight()), 0)
      expect((await overflow(viewport(page))).x).toBeGreaterThan(0)
      // Unscrolled, the view shows the start of each line, at the inline start.
      const [port, run] = [await box(viewport(page)), await box(text)]
      if (direction === 'ltr') {
        expect(run.left).toBeGreaterThan(port.left)
        expect(run.right).toBeGreaterThan(port.right)
      } else {
        expect(run.right).toBeLessThan(port.right)
        expect(run.left).toBeLessThan(port.left)
      }
    }
  })

for (const [orientation, scrolls] of [
  ['vertical', { x: false, y: true }],
  ['horizontal', { x: true, y: false }],
  ['both', { x: true, y: true }],
] as const)
  test(`the wheel scrolls a ${orientation} box only along its axes`, { tag: ['@pointer'] }, async ({
    page,
  }) => {
    // A block larger than the box along both axes, which nothing can wrap.
    await render(page, { children: 'rows', orientation, height: 160 }, { wide: true })
    const { x, y } = await overflow(viewport(page))
    expect(Math.min(x, y)).toBeGreaterThan(0)
    // What cannot scroll is clipped: the box keeps its height.
    expect((await box(outer(page))).height).toBeCloseTo(160, 0)
    const port = await box(viewport(page))
    await page.mouse.move(port.x + port.width / 2, port.y + port.height / 2)
    const position = () => viewport(page).evaluate((node) => ({ x: Math.abs(node.scrollLeft), y: node.scrollTop }))
    await page.mouse.wheel(0, 120)
    if (scrolls.y) await expect.poll(async () => (await position()).y).toBeGreaterThan(0)
    await page.mouse.wheel(120, 0)
    if (scrolls.x) await expect.poll(async () => (await position()).x).toBeGreaterThan(0)
    // Give a clipped axis the same time to move, then check it did not.
    await page.waitForTimeout(100)
    const at = await position()
    if (!scrolls.x) expect(at.x).toBe(0)
    if (!scrolls.y) expect(at.y).toBe(0)
  })
