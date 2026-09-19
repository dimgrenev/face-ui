import { act, createRef, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Table,
  type TableColumn,
  type TableProps,
  type TableSort,
} from '../../Table/Table'
import { Button } from '../../Button/Button'
import { sortRows } from '../runtime/table'
import { allowConsoleError, expectDevError, libraryCss, mount } from './harness'
import { describeControlled } from './harness/controlled'

const people = [
  { id: 'b', name: 'Beta', status: 'Blocked', score: 10 },
  { id: 'a', name: 'Alpha', status: 'Ready', score: 2 },
  { id: 'c', name: 'Gamma', status: 'Active', score: 33 },
]
const columns: TableColumn[] = [
  { id: 'name', header: 'Name', sortable: true },
  { id: 'status', header: 'Status', sortable: true },
  { id: 'score', header: 'Score' },
]

const sortButton = (host: HTMLElement, column: string) =>
  host.querySelector<HTMLButtonElement>(`th[data-column="${column}"] button`)!
const readSort = (host: HTMLElement): TableSort | null => {
  const th = host.querySelector<HTMLElement>(
    'th[aria-sort="ascending"], th[aria-sort="descending"]',
  )
  return th
    ? {
        column: th.dataset.column!,
        direction: th.getAttribute('aria-sort') === 'ascending' ? 'asc' : 'desc',
      }
    : null
}
const rowsOf = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLTableRowElement>('tbody tr'),
]
const order = (host: HTMLElement) => rowsOf(host).map((row) => row.dataset.rowId)
const checkboxOf = (host: HTMLElement, key: string) =>
  host.querySelector<HTMLInputElement>(`tr[data-row-id="${key}"] input[type="checkbox"]`)!
const checkedRows = (host: HTMLElement) =>
  rowsOf(host)
    .filter((row) => row.querySelector<HTMLInputElement>('input')?.checked)
    .map((row) => row.dataset.rowId!)

describeControlled<TableSort | null>({
  name: 'Table',
  prop: 'sort',
  values: [
    { column: 'name', direction: 'asc' },
    { column: 'status', direction: 'asc' },
  ],
  render: (props) => <Table columns={columns} rows={people} {...props} />,
  change: (host, to) => sortButton(host, to!.column).click(),
  read: readSort,
  normalizes: [{ column: 'missing', direction: 'asc' }, null],
})

describeControlled<string[]>({
  name: 'Table',
  prop: 'selectedRows',
  values: [[], ['a']],
  render: (props) => <Table selectable columns={columns} rows={people} {...props} />,
  change: (host) => checkboxOf(host, 'a').click(),
  read: checkedRows,
  normalizes: [['gone'], []],
})

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: TableProps = {}) =>
  act(async () => root.render(<Table columns={columns} rows={people} {...props} />))
const click = (node: Element | null) => act(async () => (node as HTMLElement).click())
const key = (node: Element, name: string) =>
  act(async () => {
    node.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))
  })
const header = (column: string) =>
  host.querySelector<HTMLTableCellElement>(`th[data-column="${column}"]`)!
const cellText = (column: string) =>
  [...host.querySelectorAll(`td[data-column="${column}"]`)].map((cell) => cell.textContent)

describe('sort', () => {
  it('an uncontrolled header click orders the rows ascending, then descending, then as given', async () => {
    const change = vi.fn()
    await render({ onSortChange: change })
    expect(order(host)).toEqual(['b', 'a', 'c'])
    await click(sortButton(host, 'name'))
    expect(header('name').getAttribute('aria-sort')).toBe('ascending')
    expect(order(host)).toEqual(['a', 'b', 'c'])
    await click(sortButton(host, 'name'))
    expect(header('name').getAttribute('aria-sort')).toBe('descending')
    expect(order(host)).toEqual(['c', 'b', 'a'])
    await click(sortButton(host, 'name'))
    expect(header('name').getAttribute('aria-sort')).toBe('none')
    expect(order(host)).toEqual(['b', 'a', 'c'])
    expect(change.mock.calls.map(([details]) => details)).toEqual([
      { sort: { column: 'name', direction: 'asc' } },
      { sort: { column: 'name', direction: 'desc' } },
      { sort: null },
    ])
  })

  it('defaultSort orders the rows on mount and marks the header with its direction icon', async () => {
    await render({ defaultSort: { column: 'status', direction: 'desc' } })
    expect(cellText('status')).toEqual(['Ready', 'Blocked', 'Active'])
    expect(header('status').querySelector('[data-part="sortIndicator"]')).not.toBeNull()
    expect(header('name').querySelector('[data-part="sortIndicator"]')).toBeNull()
  })

  it('sort orders by any column, but only a sortable column header is a button with aria-sort', async () => {
    await render({ sort: { column: 'score', direction: 'desc' } })
    expect(cellText('score')).toEqual(['33', '10', '2'])
    expect(header('score').getAttribute('aria-sort')).toBe('descending')
    expect(header('score').querySelector('button')).toBeNull()
    await render({ sort: null })
    expect(header('score').hasAttribute('aria-sort')).toBe(false)
    expect(header('name').getAttribute('aria-sort')).toBe('none')
    expect(sortButton(host, 'name').type).toBe('button')
  })

  it('sortRows compares numbers by value, text by locale with numeric runs, and puts empty values last', () => {
    const value = (row: { v: unknown }) => row.v
    const rows = [{ v: 'item 10' }, { v: null }, { v: 'item 2' }, { v: '' }, { v: 'Item 1' }]
    expect(sortRows(rows, value, 'asc').map(value)).toEqual(['Item 1', 'item 2', 'item 10', null, ''])
    expect(sortRows(rows, value, 'desc').map(value)).toEqual(['item 10', 'item 2', 'Item 1', null, ''])
    const numbers = [{ v: 10 }, { v: 9 }, { v: new Date(5) }, { v: true }]
    expect(sortRows(numbers, value, 'asc').map(value)).toEqual([true, new Date(5), 9, 10])
  })

  it('sorting compares the accessor value, not what render shows, and keeps element values in place', async () => {
    const element = (text: string) => <b>{text}</b>
    await render({
      columns: [
        {
          id: 'score',
          header: 'Score',
          sortable: true,
          accessor: (row: (typeof people)[number]) => row.score,
          render: ({ value }) => `${value} pts`,
        },
        { id: 'badge', header: 'Badge', sortable: true, accessor: (row) => element(row.name) },
      ],
      defaultSort: { column: 'score', direction: 'asc' },
    })
    expect(cellText('score')).toEqual(['2 pts', '10 pts', '33 pts'])
    await click(sortButton(host, 'badge'))
    expect(order(host)).toEqual(['b', 'a', 'c'])
  })
})

describe('selection', () => {
  it('an uncontrolled checkbox click keeps the row selected and reports it once', async () => {
    const change = vi.fn()
    await render({ selectable: true, onSelectedRowsChange: change })
    await click(checkboxOf(host, 'a'))
    expect(checkboxOf(host, 'a').checked).toBe(true)
    expect(host.querySelector('tr[data-row-id="a"]')!.hasAttribute('data-selected')).toBe(true)
    expect(change).toHaveBeenCalledExactlyOnceWith({ selectedRows: ['a'] })
  })

  it('selectable adds a leading checkbox column; without it there is none', async () => {
    await render()
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    await render({ selectable: true })
    expect(rowsOf(host).every((row) => row.cells[0].querySelector('input[type="checkbox"]'))).toBe(true)
    expect(host.querySelector('thead th input[type="checkbox"]')).not.toBeNull()
  })

  it('select-all shows some rows as mixed, selects every row, and clears only the rows of this table', async () => {
    const change = vi.fn()
    await render({ selectable: true, defaultSelectedRows: ['a', 'elsewhere'], onSelectedRowsChange: change })
    const all = () => host.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!
    expect(all().getAttribute('aria-checked')).toBe('mixed')
    await click(all())
    expect(checkedRows(host)).toEqual(['b', 'a', 'c'])
    expect(all().getAttribute('aria-checked')).toBe('true')
    await click(all())
    expect(checkedRows(host)).toEqual([])
    expect(change.mock.calls.map(([details]) => details)).toEqual([
      { selectedRows: ['a', 'elsewhere', 'b', 'c'] },
      { selectedRows: ['elsewhere'] },
    ])
  })

  it('select-all is unchecked when a selected key has no row, and disabled without rows', async () => {
    await render({ selectable: true, selectedRows: ['a', 'b', 'gone'] })
    const all = host.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!
    expect(all.getAttribute('aria-checked')).toBe('mixed')
    await render({ selectable: true, selectedRows: [], rows: [] })
    expect(host.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!.disabled).toBe(true)
  })

  it('rows without a key are selected by their place in rows, so sorting keeps the selection on them', async () => {
    const change = vi.fn()
    await render({
      selectable: true,
      rows: [{ name: 'Zed' }, { name: 'Ada' }],
      columns: [{ id: 'name', header: 'Name', sortable: true }],
      onSelectedRowsChange: change,
    })
    await click(checkboxOf(host, '#0'))
    await click(sortButton(host, 'name'))
    expect(cellText('name')).toEqual(['Ada', 'Zed'])
    expect(checkedRows(host)).toEqual(['#0'])
    expect(change).toHaveBeenCalledExactlyOnceWith({ selectedRows: ['#0'] })
  })
})

describe('row events', () => {
  it('onRowClick reports the row, its shown index and the event; clicks on controls in the row do not', async () => {
    const rowClick = vi.fn()
    await render({
      selectable: true,
      defaultSort: { column: 'name', direction: 'asc' },
      onRowClick: rowClick,
      columns: [
        ...columns,
        { id: 'action', header: 'Action', render: () => <Button>Open</Button> },
      ],
    })
    await click(checkboxOf(host, 'b'))
    await click(host.querySelector('tr[data-row-id="b"] [data-select]'))
    await click(host.querySelector('tr[data-row-id="b"] button'))
    expect(rowClick).not.toHaveBeenCalled()
    await click(host.querySelector('tr[data-row-id="b"] td[data-column="status"]'))
    expect(rowClick).toHaveBeenCalledOnce()
    const [{ row, index, event }] = rowClick.mock.calls[0]
    expect(row).toBe(people[0])
    expect(index).toBe(1)
    expect(event.type).toBe('click')
  })

  it('with onRowClick rows form one tab stop: arrows, Home and End move focus, Enter activates', async () => {
    const rowClick = vi.fn()
    await render({ onRowClick: rowClick, activeRow: 'a' })
    const [b, a, c] = rowsOf(host)
    expect([b, a, c].map((row) => row.tabIndex)).toEqual([-1, 0, -1])
    await act(async () => a.focus())
    await key(a, 'ArrowDown')
    expect(document.activeElement).toBe(c)
    await key(c, 'ArrowDown')
    expect(document.activeElement).toBe(c)
    await key(c, 'Home')
    expect(document.activeElement).toBe(b)
    await key(b, 'End')
    expect(document.activeElement).toBe(c)
    await key(c, 'Enter')
    expect(rowClick).toHaveBeenCalledOnce()
    expect(rowClick.mock.calls[0][0].row).toBe(people[2])
  })

  it('without onRowClick rows are not focusable or clickable', async () => {
    await render()
    expect(rowsOf(host).some((row) => row.hasAttribute('tabindex') || row.hasAttribute('data-interactive'))).toBe(false)
  })

  it('onRowMouseEnter and onRowMouseLeave report the row and its shown index', async () => {
    const enter = vi.fn()
    const leave = vi.fn()
    await render({ onRowMouseEnter: enter, onRowMouseLeave: leave })
    const row = host.querySelector('tr[data-row-id="c"]')!
    await act(async () => {
      row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
      row.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
    })
    expect(enter.mock.calls[0][0]).toMatchObject({ row: people[2], index: 2 })
    expect(leave.mock.calls[0][0]).toMatchObject({ row: people[2], index: 2 })
  })

  it('activeRow marks one row as current, apart from selection', async () => {
    await render({ activeRow: 'c', selectable: true, selectedRows: ['a'] })
    const current = host.querySelectorAll('tr[aria-current="true"]')
    expect([...current].map((row) => (row as HTMLElement).dataset.rowId)).toEqual(['c'])
    expect(host.querySelector('tr[data-row-id="c"]')!.hasAttribute('data-selected')).toBe(false)
  })
})

describe('columns', () => {
  it('accessor reads a field or a function of the row, and the column id without one', async () => {
    await render({
      columns: [
        { id: 'name', header: 'Name' },
        { id: 'label', header: 'Label', accessor: 'status' },
        { id: 'double', header: 'Double', accessor: (row) => row.score * 2 },
      ],
    })
    expect(cellText('name')).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect(cellText('label')).toEqual(['Blocked', 'Ready', 'Active'])
    expect(cellText('double')).toEqual(['20', '4', '66'])
  })

  it('render receives the value, the row, its shown index and the column', async () => {
    const renderCell = vi.fn(({ value }: { value: unknown }): ReactNode => `#${value}`)
    const column: TableColumn = { id: 'name', header: 'Name', render: renderCell }
    await render({ columns: [column], sort: { column: 'name', direction: 'asc' } })
    expect(cellText('name')).toEqual(['#Alpha', '#Beta', '#Gamma'])
    expect(renderCell).toHaveBeenCalledWith({ value: 'Alpha', row: people[1], rowIndex: 0, column })
  })

  it('header shows its content, and the column id when it has none', async () => {
    await render({ columns: [{ id: 'name' }, { id: 'status', header: <em>State</em> }] })
    expect(header('name').textContent).toBe('name')
    expect(header('status').querySelector('em')?.textContent).toBe('State')
  })

  it('align sets the inline alignment of the header and the cells', async () => {
    await render({ columns: [{ id: 'score', header: 'Score', align: 'end' }] })
    for (const slot of host.querySelectorAll('[data-column="score"] .uf-table__cellSlot'))
      expect(slot.getAttribute('data-align')).toBe('end')
    expect(host.querySelector('td[data-column="score"] [data-scope="text"]')!.getAttribute('data-align')).toBe('end')
  })

  it('truncate keeps a column on one line and gives text cells their full text as a tooltip', async () => {
    await render({ columns: [{ id: 'name', header: 'Name', truncate: true }, { id: 'status' }] })
    const cell = host.querySelector<HTMLElement>('td[data-column="name"]')!
    expect(cell.title).toBe('Beta')
    expect(cell.querySelector('[data-truncate]')).not.toBeNull()
    expect(host.querySelector('td[data-column="status"]')!.hasAttribute('title')).toBe(false)
    expect(host.querySelector('td[data-column="status"] [data-truncate]')).toBeNull()
  })

  it('width, minWidth and maxWidth size the header cell of their column; a px width is also its least width', async () => {
    await render({
      columns: [
        { id: 'name', width: 160 },
        { id: 'status', width: '25%', minWidth: 80, maxWidth: 240 },
      ],
    })
    expect(header('name').style.cssText).toBe('width: 160px; min-width: 160px;')
    expect(header('status').style.cssText).toBe('width: 25%; min-width: 80px; max-width: 240px;')
  })

  it('a column without a unique string id is dropped with a report', async () => {
    allowConsoleError(/^Face UI Table: missing columns\[2\] key; dropping the item\.$/)
    await expectDevError(
      () => render({ columns: [{ id: 'name' }, { id: 'name' }, { header: 'No id' } as TableColumn] }),
      /^Face UI Table: invalid columns\[1\] key "name"; dropping the duplicate\.$/,
    )
    expect(host.querySelectorAll('thead th')).toHaveLength(1)
  })
})

describe('rows and rowKey', () => {
  it('rowKey names the key field or computes it; numbers become text and id is the default', async () => {
    const data = [{ id: 7, code: 'x1', name: 'Seven' }]
    await render({ rows: data })
    expect(order(host)).toEqual(['7'])
    await render({ rows: data, rowKey: 'code' })
    expect(order(host)).toEqual(['x1'])
    await render({ rows: data, rowKey: (row) => `${row.code}-${row.id}` })
    expect(order(host)).toEqual(['x1-7'])
  })

  it('rows that are not objects or repeat a key are dropped with a report; a cell value that is not content is left out', async () => {
    allowConsoleError(/^Face UI Table: invalid rows\[2\] key "b"; dropping the duplicate\.$/)
    await expectDevError(
      () => render({ rows: [people[0], null, people[0]] }),
      /^Face UI Table: invalid rows\[1\] null; dropping the row\.$/,
    )
    expect(order(host)).toEqual(['b'])
    await expectDevError(
      () => render({ rows: [{ id: 'x', name: { first: 'Ada' } }], columns: [{ id: 'name' }] }),
      /^Face UI Table: invalid columns\.name cell object; leaving the cell empty\.$/,
    )
    expect(cellText('name')).toEqual([''])
  })

  it('booleans, numbers and dates show as text', async () => {
    await render({ rows: [{ id: 'x', ok: false, n: 0, at: new Date(0) }], columns: [{ id: 'ok' }, { id: 'n' }, { id: 'at' }] })
    expect([...cellText('ok'), ...cellText('n')]).toEqual(['false', '0'])
    expect(cellText('at')[0]).toBe(String(new Date(0)))
  })
})

describe('layout props', () => {
  it('showRowNumbers numbers the rows in the order shown under the rowNumber label', async () => {
    await render({ showRowNumbers: true, defaultSort: { column: 'name', direction: 'desc' }, labels: { rowNumber: '№' } })
    const numbers = rowsOf(host).map((row) => row.querySelector('[data-row-number]')!.textContent)
    expect(numbers).toEqual(['1', '2', '3'])
    expect(host.querySelector('th[data-row-number]')!.textContent).toBe('№')
    await render()
    expect(host.querySelector('[data-row-number]')).toBeNull()
  })

  it('stickyHeader, stickyLastColumn and showDividers switch their styles; header stickiness is opt-in', async () => {
    const table = () => host.querySelector('table')!
    await render()
    expect(table().hasAttribute('data-sticky-header')).toBe(false)
    expect(table().hasAttribute('data-sticky-last-column')).toBe(false)
    expect(table().hasAttribute('data-show-dividers')).toBe(true)
    await render({ stickyHeader: true, stickyLastColumn: true, showDividers: false })
    expect(table().hasAttribute('data-sticky-header')).toBe(true)
    expect(table().hasAttribute('data-sticky-last-column')).toBe(true)
    expect(table().hasAttribute('data-show-dividers')).toBe(false)
    const css = libraryCss()
    expect(css).toContain('.uf-table[data-scope][data-sticky-header] thead th')
    expect(css).toContain('.uf-table[data-scope][data-sticky-last-column] tr > :last-child')
  })

  it('variant tile rounds the rows; plain is the default', async () => {
    await render()
    expect(host.querySelector('table')!.dataset.variant).toBe('plain')
    await render({ variant: 'tile' })
    expect(host.querySelector('table')!.dataset.variant).toBe('tile')
    expect(libraryCss()).toContain('.uf-table[data-scope][data-variant="tile"] tbody td:first-child')
  })

  it('membrane adds the outer spacing box around the same table', async () => {
    await render()
    const table = host.querySelector('table')!
    expect(table.parentElement!.hasAttribute('data-membrane-disabled')).toBe(true)
    await render({ membrane: true })
    expect(host.querySelector('table')).toBe(table)
    expect(table.parentElement!.hasAttribute('data-membrane-disabled')).toBe(false)
  })
})

describe('resizing', () => {
  let width = 120
  beforeEach(() => {
    width = 120
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, this.tagName === 'TH' ? width : 0, 0)
    })
  })
  afterEach(() => vi.restoreAllMocks())
  const handle = (column: string) =>
    host.querySelector<HTMLElement>(`th[data-column="${column}"] [role="separator"]`)!
  const pointer = (node: Element, type: string, clientX: number) =>
    act(async () => {
      node.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, button: 0, pointerId: 1 }))
    })

  it('resizable adds a named, focusable separator per column; without it there is none', async () => {
    await render()
    expect(host.querySelector('[role="separator"]')).toBeNull()
    await render({ resizable: true, labels: { resizeColumn: 'Change width of' } })
    const separator = handle('name')
    expect(separator.tabIndex).toBe(0)
    expect(separator.getAttribute('aria-orientation')).toBe('vertical')
    expect(separator.getAttribute('aria-label')).toBe('Change width of')
    expect(separator.getAttribute('aria-labelledby')).toBe(`${separator.id} ${header('name').id}`)
    expect(separator.getAttribute('aria-valuemin')).toBe('48')
  })

  it('a drag sets the width and reports it once, when the pointer is released', async () => {
    const resized = vi.fn()
    await render({ resizable: true, onColumnResize: resized })
    await pointer(handle('name'), 'pointerdown', 100)
    await pointer(handle('name'), 'pointermove', 130)
    await pointer(handle('name'), 'pointermove', 160)
    expect(header('name').style.cssText).toBe('width: 180px; min-width: 180px; max-width: 180px;')
    expect(handle('name').getAttribute('aria-valuenow')).toBe('180')
    expect(resized).not.toHaveBeenCalled()
    await pointer(handle('name'), 'pointerup', 160)
    expect(resized).toHaveBeenCalledExactlyOnceWith({ column: 'name', width: 180 })
  })

  it('in right-to-left text a drag toward the start widens the column', async () => {
    await act(async () =>
      root.render(
        <div dir="rtl">
          <Table columns={columns} rows={people} resizable />
        </div>,
      ),
    )
    await pointer(handle('name'), 'pointerdown', 100)
    await pointer(handle('name'), 'pointermove', 70)
    expect(header('name').style.width).toBe('150px')
  })

  it('arrow keys step by 10 px, Home goes to minWidth and End to maxWidth, each reported', async () => {
    const resized = vi.fn()
    await render({
      resizable: true,
      onColumnResize: resized,
      columns: [{ id: 'name', minWidth: 60, maxWidth: 200 }],
    })
    await key(handle('name'), 'ArrowRight')
    width = 130
    await key(handle('name'), 'ArrowLeft')
    await key(handle('name'), 'Home')
    await key(handle('name'), 'End')
    expect(resized.mock.calls.map(([details]) => details.width)).toEqual([130, 120, 60, 200])
    expect(header('name').style.width).toBe('200px')
  })

  it('a drag stops at minWidth, or at 48 px without one', async () => {
    await render({ resizable: true, columns: [{ id: 'name' }, { id: 'status', minWidth: 100 }] })
    for (const column of ['name', 'status']) {
      await pointer(handle(column), 'pointerdown', 100)
      await pointer(handle(column), 'pointermove', -500)
      await pointer(handle(column), 'pointerup', -500)
    }
    expect([header('name').style.width, header('status').style.width]).toEqual(['48px', '100px'])
  })
})

describe('labels and native attributes', () => {
  it('row checkboxes are named by labels.selectRow and the row first column; select-all by labels.selectAll', async () => {
    await render({ selectable: true, labels: { selectAll: 'Alle', selectRow: 'Wählen' } })
    const box = checkboxOf(host, 'a')
    const [self, cell] = box.getAttribute('aria-labelledby')!.split(' ')
    expect(self).toBe(box.id)
    expect(box.getAttribute('aria-label')).toBe('Wählen')
    expect(document.getElementById(cell)!.textContent).toBe('Alpha')
    expect(host.querySelector('thead input')!.getAttribute('aria-label')).toBe('Alle')
  })

  it('native attributes, className and ref belong to the table element', async () => {
    const ref = createRef<HTMLTableElement>()
    await act(async () =>
      root.render(
        <Table
          ref={ref}
          columns={columns}
          rows={people}
          aria-label="People"
          aria-labelledby="heading"
          id="people"
          data-testid="people"
          className="mine"
          style={{ maxWidth: 400 }}
        />,
      ),
    )
    const table = host.querySelector('table')!
    expect(ref.current).toBe(table)
    expect(table.getAttribute('aria-label')).toBe('People')
    expect(table.getAttribute('aria-labelledby')).toBe('heading')
    expect(table.id).toBe('people')
    expect(table.dataset.testid).toBe('people')
    expect(table.className).toBe('uf-table mine')
    expect(table.style.maxWidth).toBe('400px')
    expect(table.getAttribute('role')).toBe('table')
  })
})
