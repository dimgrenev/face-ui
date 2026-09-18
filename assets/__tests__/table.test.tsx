import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Table } from '../../Table/Table'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Table wraps primitive headers and aligned cells through Text', async () => {
    await act(async () => {
      root.render(
        <Table
          ariaLabel="Price list"
          showRowNumbers
          columns={[
            { id: 'name', header: 'Name', accessor: 'name' },
            { id: 'price', header: 'Price', accessor: 'price', align: 'right' },
          ]}
          rows={[{ id: 'r1', name: 'Akt', price: 'RUB 2 990' }]}
        />,
      )
    })

    const rowNumberHeader = container.querySelector(
      '.uf-table__row-number-header [data-scope="text"][data-align="left"]',
    ) as HTMLElement | null
    expect(rowNumberHeader?.textContent).toContain('#')
    const table = container.querySelector(
      '.uf-table[data-scope="table"]',
    ) as HTMLTableElement | null
    expect(table?.getAttribute('aria-label')).toBe('Price list')
    const componentStyles = libraryCss()
    expect(componentStyles).toContain('inline-size: 100%;')
    expect(componentStyles).toContain('max-inline-size: 100%;')

    const rowNumberCell = container.querySelector(
      'td[data-row-number] [data-scope="text"][data-align="left"]',
    ) as HTMLElement | null
    expect(rowNumberCell?.textContent).toContain('1')

    const rightAlignedCells = Array.from(
      container.querySelectorAll<HTMLElement>(
        'td [data-scope="text"][data-align="right"]',
      ),
    )
    expect(
      rightAlignedCells.some((node) => node.textContent?.includes('RUB 2 990')),
    ).toBe(true)
  })

  it('Table falls back to row indexes when a rowKey function returns an empty value', async () => {
    await act(async () => {
      root.render(
        <Table
          ariaLabel="People"
          columns={[{ id: 'name', header: 'Name', accessor: 'name' }]}
          rows={[{ name: 'Ada' }, { name: 'Grace' }]}
          rowKey={() => undefined as unknown as string}
        />,
      )
    })

    const rows = Array.from(
      container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-id]'),
    )
    expect(rows.map((row) => row.getAttribute('data-row-id'))).toEqual([
      '0',
      '1',
    ])
  })
})

describe('data and feedback a11y characterization', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('keeps Table native table semantics, labels, sortable header button, and row selection contract', async () => {
    const handleSortChange = vi.fn()
    const handleSelectedRowsChange = vi.fn()

    function ControlledTable() {
      const [sortColumn, setSortColumn] = React.useState<string | undefined>()
      const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
        'asc',
      )
      const [selectedRows, setSelectedRows] = React.useState<string[]>([])

      return (
        <Table
          ariaLabel="Project status"
          selectable
          rowKey="id"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          selectedRows={selectedRows}
          columns={[
            { id: 'name', header: 'Name', accessor: 'name', sortable: true },
            { id: 'status', header: 'Status', accessor: 'status' },
          ]}
          rows={[
            { id: 'alpha', name: 'Alpha', status: 'Ready' },
            { id: 'beta', name: 'Beta', status: 'Blocked' },
          ]}
          onSortChange={(details) => {
            handleSortChange(details)
            setSortColumn(details.column)
            setSortDirection(details.direction)
          }}
          onSelectedRowsChange={(details) => {
            handleSelectedRowsChange(details)
            setSelectedRows(details.selectedRows)
          }}
        />
      )
    }

    await act(async () => {
      root.render(<ControlledTable />)
    })

    const table = container.querySelector<HTMLTableElement>('table.uf-table')
    expect(table).not.toBeNull()
    expect(table?.getAttribute('role')).toBe('table')
    expect(table?.getAttribute('aria-label')).toBe('Project status')
    expect(container.querySelector('thead')?.getAttribute('role')).toBe(
      'rowgroup',
    )
    expect(container.querySelector('tbody')?.getAttribute('role')).toBe(
      'rowgroup',
    )

    const nameHeader = container.querySelector<HTMLTableCellElement>(
      'th[data-column="name"]',
    )
    expect(nameHeader).not.toBeNull()
    expect(nameHeader?.getAttribute('role')).toBe('columnheader')
    expect(nameHeader?.getAttribute('aria-sort')).toBe('none')

    const sortButton = nameHeader?.querySelector<HTMLButtonElement>(
      'button.uf-table__sort-button',
    )
    expect(sortButton).not.toBeNull()
    expect(sortButton?.getAttribute('type')).toBe('button')
    expect(sortButton?.textContent).toBe('Name')

    await act(async () => {
      sortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      direction: 'asc',
    })
    expect(
      container
        .querySelector<HTMLTableCellElement>('th[data-column="name"]')
        ?.getAttribute('aria-sort'),
    ).toBe('ascending')

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'th[data-column="name"] button.uf-table__sort-button',
        )
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      direction: 'desc',
    })
    expect(
      container
        .querySelector<HTMLTableCellElement>('th[data-column="name"]')
        ?.getAttribute('aria-sort'),
    ).toBe('descending')

    const selectAll = container.querySelector<HTMLInputElement>(
      'thead input[type="checkbox"]',
    )
    expect(selectAll).not.toBeNull()
    expect(selectAll?.getAttribute('aria-label')).toBe('Select all rows')

    const alphaRow = container.querySelector<HTMLTableRowElement>(
      'tr[data-row-id="alpha"]',
    )
    expect(alphaRow).not.toBeNull()
    expect(alphaRow?.getAttribute('role')).toBe('row')
    expect(alphaRow?.getAttribute('aria-selected')).toBe('false')

    const alphaCheckbox = alphaRow?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )
    expect(alphaCheckbox).not.toBeNull()
    expect(alphaCheckbox?.getAttribute('aria-label')).toBe('Select row alpha')
    expect(alphaCheckbox?.checked).toBe(false)

    await act(async () => {
      alphaCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelectedRowsChange).toHaveBeenLastCalledWith({
      selectedRows: ['alpha'],
    })
    expect(
      container
        .querySelector<HTMLTableRowElement>('tr[data-row-id="alpha"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true')
    expect(
      container.querySelector<HTMLInputElement>(
        'tr[data-row-id="alpha"] input[type="checkbox"]',
      )?.checked,
    ).toBe(true)
  })
})
