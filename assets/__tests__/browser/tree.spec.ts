import { expect, test, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/tree.fixture'

const { renderTree: render } = hooks<Hooks>()

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.get(page)!.push(message.text())
  })
  await open(page, 'tree')
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

const item = (page: Page, value: string) =>
  page.locator(`[role="treeitem"][data-value="${value}"]`)
const focused = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement
    return active?.getAttribute('data-value') ?? (active?.id || active?.localName)
  })
const events = (page: Page) => page.evaluate(() => (window as any).treeEvents)
const expanded = (page: Page) =>
  page
    .locator('[role="treeitem"][aria-expanded="true"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-value')))
const selected = (page: Page) =>
  page
    .locator('[role="treeitem"][aria-selected="true"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-value')))

/**
 * Tab, or Option+Tab where macOS WebKit keeps plain Tab for text fields: a native button
 * right after #before tells which one reaches buttons.
 */
async function tabKey(page: Page) {
  await page.locator('#before').evaluate((before: HTMLElement) => {
    before.after(Object.assign(document.createElement('button'), { id: 'tab-probe' }))
    before.focus()
  })
  await page.keyboard.press('Tab')
  return page.locator('#tab-probe').evaluate((probe) => {
    const key = probe === document.activeElement ? 'Tab' : 'Alt+Tab'
    probe.remove()
    return key
  })
}

test('APG tree keys: Right expands then enters, Left collapses then leaves, Up/Down/Home/End stay on visible enabled items', { tag: ['@focus'] }, async ({
  page,
}) => {
  await item(page, 'src').focus()
  await page.keyboard.press('ArrowRight')
  expect(await expanded(page)).toEqual(['src'])
  expect(await focused(page)).toBe('src')
  await page.keyboard.press('ArrowRight')
  expect(await focused(page)).toBe('components')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  expect(await focused(page)).toBe('button')
  // A leaf never expands.
  await page.keyboard.press('ArrowRight')
  expect(await focused(page)).toBe('button')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  expect(await focused(page)).toBe('index')
  await page.keyboard.press('ArrowLeft')
  expect(await focused(page)).toBe('src')
  await page.keyboard.press('ArrowLeft')
  expect(await expanded(page)).toEqual([])
  expect(await focused(page)).toBe('src')
  // The disabled docs branch is skipped; the ends do not wrap.
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  expect(await focused(page)).toBe('new-file')
  await page.keyboard.press('End')
  expect(await focused(page)).toBe('readme')
  expect(
    await item(page, 'readme').evaluate((node) => getComputedStyle(node).outlineStyle),
  ).not.toBe('none')
  await page.keyboard.press('ArrowDown')
  expect(await focused(page)).toBe('readme')
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowUp')
  expect(await focused(page)).toBe('src')
  expect(await selected(page)).toEqual([])
  expect(await events(page)).toEqual([
    { expanded: ['src'] },
    { expanded: ['src', 'components'] },
    { expanded: ['components'] },
  ])
})

test('Enter and Space select and toggle; * expands the enabled sibling branches; typeahead takes spaces', { tag: ['@focus'] }, async ({
  page,
}) => {
  await item(page, 'readme').focus()
  await page.keyboard.press('Enter')
  expect(await selected(page)).toEqual(['readme'])
  await item(page, 'assets').focus()
  await page.keyboard.press('Space')
  expect(await selected(page)).toEqual(['assets'])
  expect(await expanded(page)).toEqual(['assets'])
  await page.keyboard.press('Enter')
  expect(await expanded(page)).toEqual([])
  await page.keyboard.press('*')
  expect(await focused(page)).toBe('assets')
  expect(await expanded(page)).toEqual(['src', 'assets'])
  expect(await events(page)).toEqual([
    { value: 'readme' },
    { value: 'assets' },
    { expanded: ['assets'] },
    { expanded: [] },
    { expanded: ['src', 'assets'] },
  ])
  // "new f" then "o": the space belongs to the query and activates nothing.
  await page.keyboard.type('new fo')
  expect(await focused(page)).toBe('new-folder')
  expect(await selected(page)).toEqual(['assets'])
  expect(await events(page)).toHaveLength(5)
})

test('Tab enters at the selection, or the collapsed item holding it, and leaves in one step; RTL swaps Right and Left', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { defaultValue: 'tile' })
  const tab = await tabKey(page)
  await page.locator('#before').focus()
  await page.keyboard.press(tab)
  expect(await focused(page)).toBe('src')
  await page.keyboard.press(tab)
  expect(await focused(page)).toBe('after')
  await page.keyboard.press(`Shift+${tab}`)
  expect(await focused(page)).toBe('src')

  await render(page, { dir: 'rtl', defaultExpanded: ['src'], defaultValue: 'index' })
  await page.locator('#before').focus()
  await page.keyboard.press(tab)
  expect(await focused(page)).toBe('index')
  await page.keyboard.press('ArrowRight')
  expect(await focused(page)).toBe('src')
  await page.keyboard.press('ArrowRight')
  expect(await expanded(page)).toEqual([])
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  expect(await focused(page)).toBe('components')
})

test('a click selects and toggles; a click on the arrow only toggles; the membrane edge and disabled rows behave', { tag: ['@pointer'] }, async ({
  page,
}) => {
  await item(page, 'src').click()
  expect(await selected(page)).toEqual(['src'])
  expect(await expanded(page)).toEqual(['src'])
  // WebKit does not focus a clicked button; the tree does, so the tab stop follows the pointer.
  expect(await focused(page)).toBe('src')
  await item(page, 'components').locator('[data-part="indicator"]').click()
  expect(await expanded(page)).toEqual(['src', 'components'])
  expect(await selected(page)).toEqual(['src'])
  expect(await focused(page)).toBe('components')
  await item(page, 'docs').click({ force: true })
  expect(await expanded(page)).toEqual(['src', 'components'])
  // The 1px membrane around a row forwards to it.
  const row = (await item(page, 'readme').boundingBox())!
  await page.mouse.click(row.x + row.width / 2, row.y - 0.5)
  expect(await selected(page)).toEqual(['readme'])
  expect(await events(page)).toEqual([
    { value: 'src' },
    { expanded: ['src'] },
    { expanded: ['src', 'components'] },
    { value: 'readme' },
  ])
})

test('selection is marked apart from hover; the arrow turns; levels and leaves align', { tag: ['@css'] }, async ({
  page,
}) => {
  await render(page, { defaultExpanded: ['src', 'components'], defaultValue: 'index' })
  await item(page, 'button').hover()
  const look = (value: string) =>
    item(page, value).evaluate((node) => {
      const style = getComputedStyle(node)
      return { background: style.backgroundColor, weight: style.fontWeight }
    })
  const chosen = await look('index')
  const hovered = await look('button')
  expect(chosen.background).not.toBe(hovered.background)
  expect(Number(chosen.weight)).toBeGreaterThan(Number(hovered.weight))
  const turn = (value: string) =>
    item(page, value)
      .locator('.uf-tree-indicator')
      .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).b)
  // sin(90°) = 1 when expanded; 0 when collapsed.
  await expect.poll(() => turn('src')).toBeCloseTo(1)
  await render(page, {})
  await expect.poll(() => turn('src')).toBeCloseTo(0)
  // components stays collapsed, so its arrow box is not rotated.
  await render(page, { defaultExpanded: ['src'] })
  const box = (value: string, part: string) =>
    item(page, value).locator(`[data-part="${part}"]`).boundingBox()
  // A child's arrow sits under its parent's icon; a leaf's label lines up with a branch's.
  const parentIcon = (await box('src', 'icon'))!
  const childArrow = (await box('components', 'indicator'))!
  expect(Math.abs(childArrow.x - parentIcon.x)).toBeLessThanOrEqual(1)
  const branchLabel = (await box('components', 'label'))!
  const leafLabel = (await box('index', 'label'))!
  expect(leafLabel.x).toBeCloseTo(branchLabel.x, 0)
})

test('variant lines draws a guide under the parent arrow down its nested items, in both directions', { tag: ['@css'] }, async ({
  page,
}) => {
  for (const dir of ['ltr', 'rtl'] as const) {
    await render(page, { variant: 'lines', dir, defaultExpanded: ['src'] })
    const guide = await page.locator('.uf-tree-group').first().evaluate((group) => {
      const line = getComputedStyle(group, '::before')
      const box = group.getBoundingClientRect()
      return {
        width: parseFloat(line.borderInlineStartWidth),
        height: parseFloat(line.height),
        start: parseFloat(line.insetInlineStart),
        groupHeight: box.height,
        edge: box.left,
        right: box.right,
      }
    })
    const arrow = (await item(page, 'src').locator('[data-part="indicator"]').boundingBox())!
    const center = arrow.x + arrow.width / 2
    const x = dir === 'ltr' ? guide.edge + guide.start : guide.right - guide.start
    expect(guide.width).toBeGreaterThan(0)
    expect(guide.height).toBeCloseTo(guide.groupHeight, 0)
    expect(Math.abs(x - center)).toBeLessThanOrEqual(1.5)
  }
  await render(page, { defaultExpanded: ['src'] })
  expect(
    await page
      .locator('.uf-tree-group')
      .first()
      .evaluate((group) => getComputedStyle(group, '::before').content),
  ).toBe('none')
})

test('forced colors keep the selected item in Highlight', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await render(page, { defaultValue: 'readme' })
  const highlight = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.forcedColorAdjust = 'none'
    probe.style.backgroundColor = 'Highlight'
    probe.style.color = 'HighlightText'
    const style = getComputedStyle(probe)
    const colors = { background: style.backgroundColor, color: style.color }
    probe.remove()
    return colors
  })
  const style = (value: string) =>
    item(page, value).evaluate((node) => {
      const computed = getComputedStyle(node)
      return { background: computed.backgroundColor, color: computed.color }
    })
  expect(await style('readme')).toEqual(highlight)
  expect((await style('src')).background).not.toBe(highlight.background)
})

test('the tree and its states pass axe', { tag: ['@a11y'] }, async ({ page }) => {
  await render(page, { defaultExpanded: ['src', 'docs'], defaultValue: 'index', variant: 'lines' })
  expect(await axe(page)).toEqual([])
})
