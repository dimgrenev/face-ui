import { test, expect, type Locator, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/markdown.fixture'

const { renderMarkdown: render } = hooks<Hooks>()
const subject = (page: Page) => page.getByTestId('subject')
const box = (locator: Locator) =>
  locator.evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect)
/** Boxes of the lines of a node's first text, in order. */
const lines = (locator: Locator) =>
  locator.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    range.selectNodeContents(walker.nextNode()!)
    return [...range.getClientRects()].map((rect) => rect.toJSON() as DOMRect)
  })

test.beforeEach(async ({ page }) => {
  await open(page, 'markdown')
})

test('the block fills its column; membrane insets it by the spacing box and changes nothing else', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { children: 'A paragraph.' })
  const column = await box(page.getByTestId('column'))
  const plain = await box(subject(page))
  expect([plain.left, plain.width]).toEqual([column.left, column.width])
  await render(page, { children: 'A paragraph.', membrane: true })
  const spaced = await box(subject(page))
  const membrane = await subject(page).evaluate((node) =>
    parseFloat(getComputedStyle(node.parentElement!).paddingLeft),
  )
  expect(membrane).toBeGreaterThan(0)
  expect([spaced.left, spaced.width]).toEqual([column.left + membrane, column.width - 2 * membrane])
})

for (const direction of ['ltr', 'rtl'] as const)
  test(`${direction}: a task checkbox takes its bullet’s place, lists and quotes indent from the inline start, code reads left to right`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(
      page,
      {
        children: [
          '- Plain item',
          '- [ ] A task long enough to wrap onto a second line in this narrow column',
          '',
          '> Quoted',
          '',
          '```',
          'a -> b',
          '```',
        ].join('\n'),
      },
      { direction, width: 240 },
    )
    const start = (rect: DOMRect) => (direction === 'ltr' ? rect.left : rect.right)
    /** Distance from the column's inline start. */
    const inset = (rect: DOMRect) => Math.abs(start(rect) - start(column))
    const column = await box(page.getByTestId('column'))
    const items = subject(page).locator('li')
    const plain = await lines(items.nth(0))
    const task = await lines(items.nth(1).locator('label'))
    const checkbox = await box(items.nth(1).getByRole('checkbox'))
    const list = await box(subject(page).locator('ul'))

    expect(task.length).toBeGreaterThan(1)
    // Every line of the task starts where the plain item's text does.
    for (const line of task) expect(inset(line)).toBeCloseTo(inset(plain[0]!), 0)
    // The checkbox sits in the list's indent, before the text.
    expect(inset(checkbox)).toBeGreaterThanOrEqual(inset(list) - 0.5)
    const gap = direction === 'ltr' ? plain[0]!.left - checkbox.right : checkbox.left - plain[0]!.right
    expect(gap).toBeGreaterThan(0)
    expect(inset(plain[0]!)).toBeGreaterThan(inset(list))

    const quote = subject(page).locator('blockquote')
    const border = await quote.evaluate((node) => {
      const style = getComputedStyle(node)
      return { left: parseFloat(style.borderLeftWidth), right: parseFloat(style.borderRightWidth) }
    })
    expect(direction === 'ltr' ? [border.left > 0, border.right] : [border.right > 0, border.left]).toEqual([true, 0])
    const pre = subject(page).locator('pre')
    const code = await lines(pre)
    expect(await pre.evaluate((node) => getComputedStyle(node).direction)).toBe('ltr')
    expect(code[0]!.left - (await box(pre)).left).toBeLessThan(40)
  })

test('only a task checkbox takes its bullet’s place; a raw checkbox in running text stays in its line', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, { html: true, children: 'Accept <input type="checkbox"> the terms\n\n- [ ] A task' })
  const [before, after] = await subject(page).locator('p').evaluate((node) =>
    [node.firstChild!, node.lastChild!].map((text) => {
      const range = document.createRange()
      range.selectNodeContents(text)
      return range.getBoundingClientRect().toJSON() as DOMRect
    }),
  )
  const inline = await box(subject(page).locator('p').getByRole('checkbox'))
  expect(inline.left).toBeGreaterThanOrEqual(before!.right)
  expect(after!.left).toBeGreaterThanOrEqual(inline.right)
  const task = await box(subject(page).locator('li').getByRole('checkbox'))
  const text = await lines(subject(page).locator('li label'))
  expect(task.right).toBeLessThanOrEqual(text[0]!.left)
  expect(task.left).toBeLessThan((await box(subject(page).locator('li'))).left)
})

test('a source nested deeper than the engine can parse shows as text, and the page keeps rendering', { tag: ['@native'] }, async ({
  page,
}) => {
  const deep = `${'>'.repeat(20000)} deep`
  await render(page, { children: deep })
  await expect(subject(page)).toContainText('deep')
  await render(page, { children: '# Next' })
  await expect(subject(page).getByRole('heading', { name: 'Next' })).toBeVisible()
})

test('table columns follow their GFM alignment; unaligned cells start at the inline start', { tag: ['@layout'] }, async ({
  page,
}) => {
  const table = [
    '| Left column | Center column | Right column | Unaligned column |',
    '| :-- | :-: | --: | --- |',
    '| a | b | c | d |',
  ].join('\n')
  for (const direction of ['ltr', 'rtl'] as const) {
    await render(page, { children: table }, { direction, width: 640 })
    const cells = subject(page).locator('td')
    const place = async (index: number) => {
      const cell = cells.nth(index)
      const [outer, [text]] = [await box(cell), await lines(cell)]
      return { start: text!.left - outer.left, end: outer.right - text!.right }
    }
    const [left, center, right, unaligned] = [await place(0), await place(1), await place(2), await place(3)]
    expect(left.start).toBeLessThan(left.end)
    expect(center.start).toBeCloseTo(center.end, 0)
    expect(right.end).toBeLessThan(right.start)
    if (direction === 'ltr') expect(unaligned.start).toBeLessThan(unaligned.end)
    else expect(unaligned.end).toBeLessThan(unaligned.start)
  }
})

test('task checkboxes are named by their tasks, and a rendered document has no axe violations', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await render(page, {
    html: true,
    linkTarget: '_blank',
    children: [
      '## Release',
      '',
      '- [x] Ship **release**',
      '- [ ] Write tests',
      '',
      '| Metric | Value |',
      '| :-- | --: |',
      '| Build | 2m |',
      '',
      '> Quoted',
      '',
      '```ts',
      'const x = 1',
      '```',
      '',
      '<details><summary>More</summary>Press <kbd>Ctrl</kbd>.</details>',
      '',
      'Read the [guide](https://example.com/guide).',
    ].join('\n'),
  })
  await expect(page.getByRole('checkbox', { name: 'Ship release' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Write tests' })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Write tests' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'guide' })).toHaveAttribute('target', '_blank')
  expect(await axe(page)).toEqual([])
})
