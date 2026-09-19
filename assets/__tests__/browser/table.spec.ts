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
  test(`stickyHeader=${stickyHeader} ${stickyHeader ? 'keeps the header at the top of' : 'lets the header scroll away with'} the scrolling container at 360px`, { tag: ['@layout'] }, async ({
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
    test(`stickyLastColumn=${stickyLastColumn} ${stickyLastColumn ? 'keeps the last column at the inline end' : 'lets the last column scroll with the rows'} at 360px (${direction})`, { tag: ['@layout'] }, async ({
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

const email = 'someone.with.a.long.address@example-company.com'
const widthOf = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!.width
/** Number of lines the text of `selector` takes. */
const lines = (page: Page, selector: string) =>
  page.locator(selector).evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
  })

test('at 360px a width holds and wraps its content, minWidth holds, truncate cuts one line, other text wraps', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(page, {
    columns: [
      { id: 'name', header: 'Name', truncate: true },
      { id: 'note', header: 'Note' },
      { id: 'code', header: 'Code', minWidth: 80 },
      { id: 'email', header: 'Email', width: 100 },
    ],
    rows: [
      {
        id: 'a',
        name: 'A very long name that cannot fit on a phone screen at all',
        note: 'A note long enough to wrap onto several lines of this cell',
        code: 'X',
        email,
      },
    ],
  }, { fresh: true })
  expect(await widthOf(page, 'table')).toBeLessThanOrEqual(328)
  // 'Code' and 'X' alone need about 50 px.
  expect(await widthOf(page, 'th[data-column="code"]')).toBeGreaterThanOrEqual(80)
  expect(Math.abs((await widthOf(page, 'th[data-column="email"]')) - 100)).toBeLessThanOrEqual(1)
  expect(await lines(page, 'td[data-column="email"] .uf-text__content')).toBeGreaterThan(1)
  const cut = await page
    .locator('td[data-column="name"] .uf-text__content')
    .evaluate((node) => node.scrollWidth > node.clientWidth && getComputedStyle(node).textOverflow)
  expect(cut).toBe('ellipsis')
  expect(await lines(page, 'td[data-column="name"] .uf-text__content')).toBe(1)
  expect(await lines(page, 'td[data-column="note"] .uf-text__content')).toBeGreaterThan(1)
})

test('truncate keeps element content on one line too, cut with an ellipsis, at 360px', { tag: ['@layout'] }, async ({
  page,
}) => {
  const long = 'A very long link text that cannot fit on a phone screen at all'
  await render(page, {
    columns: [
      { id: 'name', header: 'Name', truncate: true },
      { id: 'note', header: 'Note' },
    ],
    rows: [{ id: 'a', name: long, note: 'Short note' }],
  }, { fresh: true, links: ['name'] })
  expect(await widthOf(page, 'table')).toBeLessThanOrEqual(328)
  const link = 'td[data-column="name"] a'
  expect(await lines(page, link)).toBe(1)
  const cut = await page
    .locator(link)
    .evaluate((node) => node.scrollWidth > node.clientWidth && getComputedStyle(node).textOverflow)
  expect(cut).toBe('ellipsis')
})

for (const direction of ['ltr', 'rtl'])
  test(`align end and center place the header and the cells at the inline end and in the middle (${direction})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, {
      columns: [
        { id: 'name', header: 'Name' },
        { id: 'score', header: 'Score', align: 'end', sortable: true, width: 120 },
        { id: 'status', header: 'Status', align: 'center', width: 120 },
      ],
      rows: people.rows,
    }, { direction, fresh: true })
    /** Space between the content of `selector` and the start and end of its cell's content box. */
    const gaps = (selector: string) =>
      page.locator(selector).evaluate((node, rtl) => {
        const slot = node.closest('.uf-table__cellSlot')!
        const box = slot.getBoundingClientRect()
        const style = getComputedStyle(slot)
        const range = document.createRange()
        range.selectNodeContents(node)
        const content = range.getBoundingClientRect()
        const left = content.left - box.left - parseFloat(style.paddingLeft)
        const right = box.right - parseFloat(style.paddingRight) - content.right
        return rtl ? { start: right, end: left } : { start: left, end: right }
      }, direction === 'rtl')
    for (const selector of ['th[data-column="score"] button', 'tbody tr:first-child td[data-column="score"] .uf-text__content']) {
      const { start, end } = await gaps(selector)
      expect(Math.abs(end)).toBeLessThanOrEqual(1)
      expect(start).toBeGreaterThan(40)
    }
    for (const selector of ['th[data-column="status"] .uf-text__content', 'tbody tr:first-child td[data-column="status"] .uf-text__content']) {
      const { start, end } = await gaps(selector)
      expect(Math.abs(start - end)).toBeLessThanOrEqual(1)
      expect(start).toBeGreaterThan(20)
    }
    const { start } = await gaps('tbody tr:first-child td[data-column="name"] .uf-text__content')
    expect(Math.abs(start)).toBeLessThanOrEqual(1)
  })

test('in a wide table a column keeps its width and the columns without one take the room; when every column has one, they share it', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 640 })
  const long = 'Long text that would take the whole row on its own if nothing held it back'
  await render(page, {
    columns: [
      { id: 'n', header: 'N', width: 60 },
      { id: 'note', header: 'Note' },
    ],
    rows: [{ id: 'a', n: long, note: long }],
  }, { fresh: true })
  const table = await widthOf(page, 'table')
  expect(Math.abs((await widthOf(page, 'th[data-column="n"]')) - 60)).toBeLessThanOrEqual(1)
  expect(Math.abs((await widthOf(page, 'th[data-column="note"]')) - (table - 60))).toBeLessThanOrEqual(1)
  await render(page, {
    columns: [
      { id: 'a', header: 'A', width: 150 },
      { id: 'b', header: 'B', width: 200 },
    ],
    rows: [{ id: 'r', a: 'x', b: 'y' }],
  }, { fresh: true })
  const [a, b] = [await widthOf(page, 'th[data-column="a"]'), await widthOf(page, 'th[data-column="b"]')]
  expect(Math.abs(a + b - (await widthOf(page, 'table')))).toBeLessThanOrEqual(1)
  expect(a).toBeGreaterThan(150)
  expect(b).toBeGreaterThan(a)
})

test('dividers, tile rows and the tints of selected, current and hovered rows', { tag: ['@css', '@pointer'] }, async ({ page }) => {
  const style = (selector: string) =>
    page.locator(selector).evaluate((node) => {
      const s = getComputedStyle(node)
      return { divider: s.borderBottomWidth, radius: s.borderStartStartRadius, tint: s.boxShadow }
    })
  const textStart = (selector: string) =>
    page.locator(selector).evaluate((node) => node.getBoundingClientRect().left)
  const first = 'tr[data-row-id="b"] td:first-child'
  await render(page, { ...people, selectable: true, defaultSelectedRows: ['b'], activeRow: 'a' }, { fresh: true, rowClick: true })
  const selected = await style('tr[data-row-id="b"] td[data-column="name"]')
  const current = await style('tr[data-row-id="a"] td[data-column="name"]')
  expect(selected.divider).not.toBe('0px')
  expect(selected.radius).toBe('0px')
  expect(selected.tint).not.toBe(current.tint)
  // The pointer over a clickable current row keeps its own tint.
  await page.hover('tr[data-row-id="a"] td[data-column="status"]')
  expect((await style('tr[data-row-id="a"] td[data-column="name"]')).tint).toBe(current.tint)
  // A plain row is tinted by the pointer only when clicking it does something.
  await render(page, { ...people }, { fresh: true })
  const rest = await style(first)
  await page.hover(first)
  expect((await style(first)).tint).toBe(rest.tint)
  await render(page, { ...people }, { fresh: true, rowClick: true })
  await page.mouse.move(0, 0)
  await page.hover(first)
  expect((await style(first)).tint).toBe(selected.tint)

  await render(page, { ...people, showDividers: false, variant: 'tile' }, { fresh: true })
  await page.mouse.move(0, 0)
  const tile = await style(first)
  expect(tile.divider).toBe('0px')
  expect(tile.radius).not.toBe('0px')
  expect(await textStart('thead th:first-child .uf-text__content')).toBeCloseTo(
    await textStart(`${first} .uf-text__content`),
    0,
  )
  // A tile row shows its surface under the pointer even when it does nothing.
  await page.hover(first)
  expect((await style(first)).tint).toBe(selected.tint)
})

test('forced colors draw the rows under the pointer, selected and current as lines, in both variants, without moving the rows', { tag: ['@forced-colors', '@css', '@pointer'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  /** The lines drawn over the first cell of a row, and the row's height. */
  const lines = (row: string) =>
    page.locator(`tr[data-row-id="${row}"]`).evaluate((node) => {
      const line = getComputedStyle(node.querySelector('td[data-column="name"]')!, '::after')
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style.color = 'Highlight'
      const highlight = getComputedStyle(probe).color
      probe.remove()
      return {
        drawn: line.content !== 'none' && line.borderTopStyle === 'solid' && line.borderBottomStyle === 'solid',
        width: parseFloat(line.borderTopWidth),
        highlight: line.borderTopColor === highlight,
        height: node.getBoundingClientRect().height,
      }
    })
  const rows = {
    ...people,
    rows: [...people.rows, { id: 'c', name: 'Gamma', status: 'Active', score: 33 }],
    selectable: true,
    defaultSelectedRows: ['b'],
    activeRow: 'a',
  }
  for (const variant of ['plain', 'tile'] as const) {
    await render(page, { ...rows, variant }, { fresh: true, rowClick: variant === 'plain' })
    await page.mouse.move(0, 0)
    const selected = await lines('b')
    const current = await lines('a')
    const rest = await lines('c')
    expect(selected).toMatchObject({ drawn: true, highlight: true })
    expect(current).toMatchObject({ drawn: true, highlight: false })
    expect(current.width).toBeGreaterThan(selected.width)
    expect(rest.drawn).toBe(false)
    await page.hover('tr[data-row-id="c"] td[data-column="status"]')
    const hovered = await lines('c')
    expect(hovered).toMatchObject({ drawn: true, highlight: false, width: selected.width, height: rest.height })
  }
})

for (const direction of ['ltr', 'rtl'])
  test(`a pointer drag widens only its column, the table grows, and the report is the rendered width (${direction})`, { tag: ['@pointer', '@layout'] }, async ({
    page,
  }) => {
    await render(page, { ...people, resizable: true }, { direction, fresh: true })
    const header = page.locator('th[data-column="name"]')
    const cells = ['name', 'status', 'score'].map((id) => page.locator(`th[data-column="${id}"]`))
    const before = await Promise.all(cells.map(async (cell) => (await cell.boundingBox())!))
    const table = await widthOf(page, 'table')
    const handle = (await header.locator('[role="separator"]').boundingBox())!
    const sign = direction === 'ltr' ? 1 : -1
    const x = handle.x + handle.width / 2
    const y = handle.y + handle.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 20 * sign, y, { steps: 2 })
    await page.mouse.move(x + 40 * sign, y, { steps: 2 })
    await page.mouse.up()
    const after = await Promise.all(cells.map(async (cell) => (await cell.boundingBox())!))
    const width = Math.round(before[0].width) + 40
    expect(Math.abs(after[0].width - width)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(after[1].width - before[1].width)).toBeLessThanOrEqual(1)
    expect(Math.abs(after[2].width - before[2].width)).toBeLessThanOrEqual(1)
    expect(Math.abs((await widthOf(page, 'table')) - table - 40)).toBeLessThanOrEqual(2)
    const edge = direction === 'ltr' ? after[0].x + after[0].width : after[0].x
    const start = direction === 'ltr' ? before[0].x + before[0].width : before[0].x
    expect(Math.abs(edge - start - 40 * sign)).toBeLessThanOrEqual(1)
    expect(await events(page)).toEqual([{ column: 'name', width }])
    await expect(header.getByRole('separator')).toHaveAttribute('aria-valuenow', String(width))
  })

test('a column narrows below its content: the drag, the report and aria-valuenow agree, and the text wraps', { tag: ['@pointer', '@layout'] }, async ({
  page,
}) => {
  await render(page, {
    resizable: true,
    columns: [
      { id: 'name', header: 'Name' },
      { id: 'email', header: 'Email' },
    ],
    rows: [{ id: 'a', name: 'Ada', email }],
  }, { fresh: true })
  const header = page.locator('th[data-column="email"]')
  const start = Math.round((await header.boundingBox())!.width)
  expect(start).toBeGreaterThan(250)
  const handle = (await header.locator('[role="separator"]').boundingBox())!
  const x = handle.x + handle.width / 2
  const y = handle.y + handle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 200, y, { steps: 4 })
  await page.mouse.up()
  const width = start - 200
  expect(Math.abs((await header.boundingBox())!.width - width)).toBeLessThanOrEqual(0.5)
  expect(await events(page)).toEqual([{ column: 'email', width }])
  await expect(header.getByRole('separator')).toHaveAttribute('aria-valuenow', String(width))
  expect(await lines(page, 'td[data-column="email"] .uf-text__content')).toBeGreaterThan(1)
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
  const before = Math.round((await header.boundingBox())!.width)
  await header.getByRole('separator').focus()
  await page.keyboard.press('ArrowRight')
  expect(Math.abs((await header.boundingBox())!.width - before - 10)).toBeLessThanOrEqual(0.5)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  expect(Math.abs((await header.boundingBox())!.width - before + 10)).toBeLessThanOrEqual(0.5)
  expect(await events(page)).toEqual([
    { sort: { column: 'name', direction: 'asc' } },
    { sort: { column: 'name', direction: 'desc' } },
    { selectedRows: ['a'] },
    { column: 'name', width: before + 10 },
    { column: 'name', width: before },
    { column: 'name', width: before - 10 },
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

test('a full table passes axe and names its table, column headers, checkboxes and resize handles', { tag: ['@a11y'] }, async ({
  page,
  browserName,
}) => {
  await render(
    page,
    { ...people, selectable: true, resizable: true, rowNumbers: true, defaultSort: { column: 'name', direction: 'asc' } },
    { fresh: true },
  )
  expect(await axe(page)).toEqual([])
  await expect(page.getByRole('table', { name: 'People' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select Alpha' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select all rows' })).toBeVisible()
  // A header is named by its label alone, not by the resize handle inside it.
  for (const name of ['Name', 'Status', 'Score'])
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible()
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const headers = nodes
      .filter((node: any) => node.role?.value === 'columnheader')
      .map((node: any) => node.name?.value)
    expect(headers).toEqual(['Select all rows', '#', 'Name', 'Status', 'Score'])
  }
  const separator = page.getByRole('separator', { name: 'Resize Name' })
  const width = String(Math.round((await page.locator('th[data-column="name"]').boundingBox())!.width))
  await expect(separator).toHaveAttribute('aria-valuenow', width)
  await expect(separator).toHaveAttribute('aria-valuetext', `${width} pixels`)
})
