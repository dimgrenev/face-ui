import { expect, test, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/table.fixture'

const { renderTable: render } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).tableEvents)
const people = {
  columns: [
    { id: 'name', header: 'Name', sortable: true },
    { id: 'status', header: 'Status' },
    { id: 'score', header: 'Score', align: 'end' as const },
  ],
  rows: [
    { id: 'b', name: 'Beta', status: 'Blocked', score: 10 },
    { id: 'a', name: 'Alpha', status: 'Ready', score: 2 },
  ],
}
/** The scroller's client box (scrollbars excluded) in viewport coordinates. */
const clientBox = (page: Page) =>
  page.locator('#scroller').evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const left = rect.left + node.clientLeft
    const top = rect.top + node.clientTop
    return { left, top, right: left + node.clientWidth, bottom: top + node.clientHeight }
  })
/** Whether the topmost element at the centre of `selector` belongs to it. */
const onTop = (page: Page, selector: string) =>
  page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return !!hit && node.contains(hit)
  })

test.beforeEach(async ({ page }) => {
  await open(page, 'table')
  await page.setViewportSize({ width: 360, height: 640 })
})

for (const stickyHeader of [true, false])
  test(`stickyHeader=${stickyHeader} keeps the header at the top of the scrolling container at 360px`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, { stickyHeader }, { wide: true, box: { width: 328, height: 240 }, fresh: true })
    await page.locator('#scroller').evaluate((node) => (node.scrollTop = 400))
    const box = await clientBox(page)
    const head = await page.locator('thead th').first().boundingBox()
    if (stickyHeader) {
      expect(Math.abs(head!.y - box.top)).toBeLessThanOrEqual(1)
      expect(await onTop(page, 'thead th:first-child')).toBe(true)
    } else expect(head!.y + head!.height).toBeLessThan(box.top)
  })

for (const direction of ['ltr', 'rtl'])
  for (const stickyLastColumn of [true, false])
    test(`stickyLastColumn=${stickyLastColumn} keeps the last column at the inline end at 360px (${direction})`, { tag: ['@layout'] }, async ({
      page,
    }) => {
      await render(
        page,
        { stickyLastColumn, stickyHeader: true },
        { wide: true, box: { width: 328, height: 240 }, direction, fresh: true },
      )
      await page.locator('#scroller').evaluate((node) => (node.scrollTop = 200))
      // px widths hold, so ten 120 px columns overflow the 328 px container.
      expect(Math.abs((await page.locator('thead th').first().boundingBox())!.width - 120)).toBeLessThanOrEqual(1)
      const box = await clientBox(page)
      for (const selector of ['thead th:last-child', 'tbody tr:nth-child(8) > td:last-child']) {
        const cell = (await page.locator(selector).boundingBox())!
        const inside = direction === 'ltr' ? cell.x + cell.width - box.right : box.left - cell.x
        if (stickyLastColumn) {
          expect(Math.abs(inside)).toBeLessThanOrEqual(1)
          expect(await onTop(page, selector)).toBe(true)
        } else expect(inside).toBeGreaterThan(100)
      }
    })

test('columns size to content at 360px: minWidth and maxWidth hold, truncate cuts one line, other text wraps', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, {
    columns: [
      { id: 'name', header: 'Name', truncate: true },
      { id: 'note', header: 'Note' },
      { id: 'code', header: 'Code', minWidth: 90 },
      { id: 'n', header: 'N', maxWidth: 48 },
    ],
    rows: [
      {
        id: 'a',
        name: 'A very long name that cannot fit on a phone screen at all',
        note: 'A note long enough to wrap onto several lines of this cell',
        code: 'X',
        n: '7',
      },
    ],
  }, { fresh: true })
  const width = async (selector: string) => (await page.locator(selector).boundingBox())!.width
  expect(await width('table')).toBeLessThanOrEqual(328)
  expect(await width('th[data-column="code"]')).toBeGreaterThanOrEqual(90)
  expect(await width('th[data-column="n"]')).toBeLessThanOrEqual(48)
  const cut = await page
    .locator('td[data-column="name"] .uf-text__content')
    .evaluate((node) => node.scrollWidth > node.clientWidth && getComputedStyle(node).textOverflow)
  expect(cut).toBe('ellipsis')
  const lines = (selector: string) =>
    page.locator(selector).evaluate((node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
    })
  expect(await lines('td[data-column="name"] .uf-text__content')).toBe(1)
  expect(await lines('td[data-column="note"] .uf-text__content')).toBeGreaterThan(1)
})

test('dividers, tile rows and the tints of selected and current rows', { tag: ['@css'] }, async ({ page }) => {
  const style = (selector: string) =>
    page.locator(selector).evaluate((node) => {
      const s = getComputedStyle(node)
      return { divider: s.borderBottomWidth, radius: s.borderStartStartRadius, tint: s.boxShadow }
    })
  await render(page, { ...people, selectable: true, defaultSelectedRows: ['b'], activeRow: 'a' }, { fresh: true })
  const selected = await style('tr[data-row-id="b"] td[data-column="name"]')
  const current = await style('tr[data-row-id="a"] td[data-column="name"]')
  expect(selected.divider).not.toBe('0px')
  expect(selected.radius).toBe('0px')
  expect(selected.tint).not.toBe(current.tint)
  await render(page, { ...people, showDividers: false, variant: 'tile' }, { fresh: true })
  const tile = await style('tr[data-row-id="b"] td:first-child')
  expect(tile.divider).toBe('0px')
  expect(tile.radius).not.toBe('0px')
  expect(tile.tint).not.toBe(selected.tint)
})

for (const direction of ['ltr', 'rtl'])
  test(`a pointer drag resizes only its column and reports once (${direction})`, { tag: ['@pointer', '@layout'] }, async ({
    page,
  }) => {
    await render(page, { ...people, resizable: true }, { direction, fresh: true })
    const header = page.locator('th[data-column="name"]')
    const before = (await header.boundingBox())!
    const handle = (await header.locator('[role="separator"]').boundingBox())!
    const sign = direction === 'ltr' ? 1 : -1
    const x = handle.x + handle.width / 2
    const y = handle.y + handle.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 20 * sign, y, { steps: 2 })
    await page.mouse.move(x + 40 * sign, y, { steps: 2 })
    await page.mouse.up()
    const after = (await header.boundingBox())!
    expect(Math.abs(after.width - before.width - 40)).toBeLessThanOrEqual(1)
    const edge = direction === 'ltr' ? after.x + after.width : after.x
    const start = direction === 'ltr' ? before.x + before.width : before.x
    expect(Math.abs(edge - start - 40 * sign)).toBeLessThanOrEqual(1)
    expect(await events(page)).toEqual([{ column: 'name', width: Math.round(before.width) + 40 }])
  })

test('keyboard: Enter and Space sort from the header, Space selects a row, arrows resize a column', { tag: ['@focus', '@native'] }, async ({
  page,
}) => {
  await render(page, { ...people, selectable: true, resizable: true }, { fresh: true })
  const header = page.locator('th[data-column="name"]')
  await header.getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await page.keyboard.press('Space')
  await expect(header).toHaveAttribute('aria-sort', 'descending')
  await page.getByRole('checkbox', { name: 'Select Alpha' }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox', { name: 'Select Alpha' })).toBeChecked()
  const before = (await header.boundingBox())!.width
  await header.getByRole('separator').focus()
  await page.keyboard.press('ArrowRight')
  expect(Math.abs((await header.boundingBox())!.width - before - 10)).toBeLessThanOrEqual(1)
  expect(await events(page)).toEqual([
    { sort: { column: 'name', direction: 'asc' } },
    { sort: { column: 'name', direction: 'desc' } },
    { selectedRows: ['a'] },
    { column: 'name', width: Math.round(before) + 10 },
  ])
})

test('with onRowClick the rows are one tab stop with a focus ring; arrows move and Enter activates', { tag: ['@focus'] }, async ({
  page,
}) => {
  await render(page, { columns: [{ id: 'name', header: 'Name' }], rows: people.rows }, { rowClick: true, fresh: true })
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  const focused = () => page.evaluate(() => (document.activeElement as HTMLElement).dataset.rowId)
  expect(await focused()).toBe('b')
  const ring = await page
    .locator('tr[data-row-id="b"]')
    .evaluate((node) => getComputedStyle(node).outlineStyle)
  expect(ring).not.toBe('none')
  await page.keyboard.press('ArrowDown')
  expect(await focused()).toBe('a')
  await page.keyboard.press('Enter')
  expect(await events(page)).toEqual([{ row: 'a', index: 1 }])
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement!.id)).toBe('after')
})

test('a full table passes axe and names its table, checkboxes and resize handles', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await render(
    page,
    { ...people, selectable: true, resizable: true, showRowNumbers: true, defaultSort: { column: 'name', direction: 'asc' } },
    { fresh: true },
  )
  expect(await axe(page)).toEqual([])
  await expect(page.getByRole('table', { name: 'People' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select Alpha' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select all rows' })).toBeVisible()
  await expect(page.getByRole('separator', { name: 'Resize Name' })).toHaveAttribute('aria-valuenow', /^\d+$/)
})
