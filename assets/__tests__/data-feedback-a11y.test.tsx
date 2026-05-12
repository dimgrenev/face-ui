// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Table } from '../../Table/Table.tsx'
import { Toggle } from '../../Toggle/Toggle.tsx'
import { Progress } from '../../Progress/Progress.tsx'
import { createToastContext } from '../../Toast/Toast.tsx'

describe('data and feedback a11y characterization', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('links Progress visible labels to the progressbar root', async () => {
    await act(async () => {
      root.render(<Progress value={75} max={100} label="Uploading assets" />)
    })

    const progress = container.querySelector<HTMLElement>('[data-scope="progress"][data-part="root"]')
    const label = container.querySelector<HTMLElement>('[data-scope="progress"][data-part="label"]')

    expect(progress).not.toBeNull()
    expect(label).not.toBeNull()
    expect(progress?.getAttribute('role')).toBe('progressbar')
    expect(progress?.getAttribute('aria-valuenow')).toBe('75')
    expect(progress?.getAttribute('aria-valuetext')).toBe('75%')
    expect(label?.textContent).toBe('Uploading assets')
    expect(label?.id).toBeTruthy()
    expect(progress?.getAttribute('aria-labelledby')).toBe(label?.id)

    await act(async () => {
      root.render(<Progress value={-1} aria-label="Loading assets" />)
    })

    const labelledProgress = container.querySelector<HTMLElement>('[data-scope="progress"][data-part="root"]')
    expect(labelledProgress?.getAttribute('aria-label')).toBe('Loading assets')
    expect(labelledProgress?.getAttribute('aria-labelledby')).toBeNull()
    expect(labelledProgress?.getAttribute('aria-valuenow')).toBeNull()
  })

  it('exposes Toast live region, status item, title, description, action, and close semantics', async () => {
    const toastContext = createToastContext({ defaultDuration: 0 })
    const handleAction = vi.fn()

    await act(async () => {
      root.render(<toastContext.Toaster />)
    })

    await act(async () => {
      toastContext.toaster.toast({
        title: 'Saved',
        description: 'Changes are available to collaborators.',
        action: {
          label: 'Undo',
          onClick: handleAction,
        },
        duration: 0,
      })
    })

    const group = container.querySelector<HTMLElement>('[data-scope="toast"][data-part="root"][role="region"]')
    expect(group).not.toBeNull()
    expect(group?.getAttribute('aria-label')).toBe('Notifications')
    expect(group?.getAttribute('aria-live')).toBe('polite')
    expect(group?.getAttribute('data-count')).toBe('1')

    const toast = container.querySelector<HTMLElement>('.uf-toast')
    expect(toast).not.toBeNull()
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')

    expect(toast?.querySelector('[data-scope="toast"][data-part="title"]')?.textContent).toBe('Saved')
    expect(toast?.querySelector('[data-scope="toast"][data-part="description"]')?.textContent)
      .toBe('Changes are available to collaborators.')

    const action = toast?.querySelector<HTMLButtonElement>('[data-scope="toast"][data-part="action"]')
    expect(action).not.toBeNull()
    expect(action?.tagName).toBe('BUTTON')
    expect(action?.getAttribute('type')).toBe('button')
    expect(action?.textContent).toBe('Undo')

    const close = toast?.querySelector<HTMLButtonElement>('[data-scope="toast"][data-part="close"]')
    expect(close).not.toBeNull()
    expect(close?.tagName).toBe('BUTTON')
    expect(close?.getAttribute('type')).toBe('button')
    expect(close?.getAttribute('aria-label')).toBe('Close notification')

    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.uf-toast')).toBeNull()
  })

  it('keeps Toast error variants non-blocking polite status messages', async () => {
    const toastContext = createToastContext({ defaultDuration: 0 })

    await act(async () => {
      root.render(<toastContext.Toaster />)
    })

    await act(async () => {
      toastContext.toaster.toast({
        title: 'Render failed',
        description: 'The preview kept the last stable frame.',
        variant: 'error',
        duration: 0,
      })
    })

    const group = container.querySelector<HTMLElement>('[data-scope="toast"][data-part="root"][role="region"]')
    const toast = container.querySelector<HTMLElement>('.uf-toast')

    expect(group?.getAttribute('aria-live')).toBe('polite')
    expect(toast).not.toBeNull()
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')
    expect(toast?.getAttribute('data-variant')).toBe('error')
    expect(toast?.textContent).toContain('Render failed')
    expect(toast?.textContent).toContain('The preview kept the last stable frame.')
  })

  it('keeps Table native table semantics, labels, sortable header button, and row selection contract', async () => {
    const handleSortChange = vi.fn()
    const handleSelectedRowsChange = vi.fn()

    function ControlledTable() {
      const [sortColumn, setSortColumn] = React.useState<string | undefined>()
      const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
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
    expect(container.querySelector('thead')?.getAttribute('role')).toBe('rowgroup')
    expect(container.querySelector('tbody')?.getAttribute('role')).toBe('rowgroup')

    const nameHeader = container.querySelector<HTMLTableCellElement>('th[data-column="name"]')
    expect(nameHeader).not.toBeNull()
    expect(nameHeader?.getAttribute('role')).toBe('columnheader')
    expect(nameHeader?.getAttribute('aria-sort')).toBe('none')

    const sortButton = nameHeader?.querySelector<HTMLButtonElement>('button.uf-table__sort-button')
    expect(sortButton).not.toBeNull()
    expect(sortButton?.getAttribute('type')).toBe('button')
    expect(sortButton?.textContent).toBe('Name')

    await act(async () => {
      sortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'asc' })
    expect(container.querySelector<HTMLTableCellElement>('th[data-column="name"]')?.getAttribute('aria-sort'))
      .toBe('ascending')

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('th[data-column="name"] button.uf-table__sort-button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'desc' })
    expect(container.querySelector<HTMLTableCellElement>('th[data-column="name"]')?.getAttribute('aria-sort'))
      .toBe('descending')

    const selectAll = container.querySelector<HTMLInputElement>('thead input[type="checkbox"]')
    expect(selectAll).not.toBeNull()
    expect(selectAll?.getAttribute('aria-label')).toBe('Select all rows')

    const alphaRow = container.querySelector<HTMLTableRowElement>('tr[data-row-id="alpha"]')
    expect(alphaRow).not.toBeNull()
    expect(alphaRow?.getAttribute('role')).toBe('row')
    expect(alphaRow?.getAttribute('aria-selected')).toBe('false')

    const alphaCheckbox = alphaRow?.querySelector<HTMLInputElement>('input[type="checkbox"]')
    expect(alphaCheckbox).not.toBeNull()
    expect(alphaCheckbox?.getAttribute('aria-label')).toBe('Select row alpha')
    expect(alphaCheckbox?.checked).toBe(false)

    await act(async () => {
      alphaCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelectedRowsChange).toHaveBeenLastCalledWith({ selectedRows: ['alpha'] })
    expect(container.querySelector<HTMLTableRowElement>('tr[data-row-id="alpha"]')?.getAttribute('aria-selected'))
      .toBe('true')
    expect(container.querySelector<HTMLInputElement>('tr[data-row-id="alpha"] input[type="checkbox"]')?.checked)
      .toBe(true)
  })

  it('keeps Toggle group and item pressed, disabled, orientation, and onValueChange semantics', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Toggle
          type="multiple"
          orientation="vertical"
          defaultValue={['bold']}
          onValueChange={handleValueChange}
          items={[
            { value: 'bold', label: 'Bold' },
            { value: 'italic', label: 'Italic' },
            { value: 'strike', label: 'Strike', disabled: true },
          ]}
        />,
      )
    })

    const group = container.querySelector<HTMLElement>('[data-scope="toggle"][data-part="root"]')
    expect(group).not.toBeNull()
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-orientation')).toBe('vertical')
    expect(group?.getAttribute('data-type')).toBe('multiple')

    const items = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-scope="toggle"][data-part="item"]'))
    expect(items).toHaveLength(3)
    expect(items[0]?.getAttribute('role')).toBe('checkbox')
    expect(items[0]?.getAttribute('aria-checked')).toBe('true')
    expect(items[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(items[0]?.getAttribute('data-orientation')).toBe('vertical')

    expect(items[1]?.getAttribute('aria-checked')).toBe('false')
    expect(items[1]?.getAttribute('aria-pressed')).toBe('false')

    expect(items[2]?.getAttribute('aria-disabled')).toBe('true')
    expect(items[2]?.tabIndex).toBe(-1)

    await act(async () => {
      items[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenLastCalledWith({ value: ['bold', 'italic'] })
    expect(items[1]?.getAttribute('aria-checked')).toBe('true')
    expect(items[1]?.getAttribute('aria-pressed')).toBe('true')
  })
})
