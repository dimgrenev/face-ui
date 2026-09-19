import { createRef as createTableRef } from 'react'
import {
  Table as AuditedTable,
  type TableColumn,
  type TableLabels,
  type TableSort,
} from '../../../index'

interface Invoice {
  id: string
  total: number
}
const invoiceColumns: TableColumn<Invoice>[] = [
  { id: 'id', header: 'Invoice', sortable: true, width: 160, minWidth: 120, truncate: true },
  { id: 'total', align: 'end', accessor: (row) => row.total, render: ({ value, row, rowIndex, column }) => `${String(value)} ${row.id} ${rowIndex} ${column.id}` },
]
export const tableDictionary: Readonly<TableLabels> = { selectAll: 'Выбрать все', selectRow: 'Выбрать {name}', resizeColumn: 'Ширина столбца {name}', columnWidth: '{width} пикселей', rowNumber: '№' }
const byTotal: TableSort = { column: 'total', direction: 'desc' }
export const tableNative = <AuditedTable ref={createTableRef<HTMLTableElement>()} columns={invoiceColumns} rows={[{ id: 'a', total: 1 }]} rowKey={(row) => row.id} sort={byTotal} defaultSort={null} onSortChange={({ sort }) => sort?.direction} selectedRows={['a']} defaultSelectedRows={[]} onSelectedRowsChange={({ selectedRows }) => selectedRows.push('b')} selectable showRowNumbers stickyHeader showDividers={false} stickyLastColumn resizable onColumnResize={({ column, width }) => `${column}${width.toFixed()}`} onRowClick={({ row, index, event }) => event.preventDefault() ?? row ?? index} activeRow="a" membrane variant="tile" labels={tableDictionary} aria-label="Invoices" aria-labelledby="heading" id="invoices" className="invoices" style={{ maxWidth: 600 }} dir="rtl" data-table="yes" />
// @ts-expect-error The table builds its rows and cells from columns and rows.
export const tableInvalidChildren = <AuditedTable>rows</AuditedTable>
// @ts-expect-error The native aria-label names the table.
export const tableRemovedAriaLabel = <AuditedTable ariaLabel="Invoices" />
// @ts-expect-error One sort object replaces sortColumn and sortDirection.
export const tableRemovedSortColumn = <AuditedTable sortColumn="total" />
// @ts-expect-error One sort object replaces sortColumn and sortDirection.
export const tableRemovedSortDirection = <AuditedTable sortDirection="asc" />
// @ts-expect-error activeRow names the current row.
export const tableRemovedActiveRowId = <AuditedTable activeRowId="a" />
// @ts-expect-error variant styles the rows.
export const tableRemovedRowStyle = <AuditedTable rowStyle="tile" />
// @ts-expect-error Alignment follows text direction: start, center or end.
export const tableInvalidAlign = <AuditedTable columns={[{ id: 'a', align: 'right' }]} />
// @ts-expect-error render receives one details object.
export const tableInvalidRender = <AuditedTable columns={[{ id: 'a', render: (value: unknown, row: unknown) => String(value) + String(row) }]} />
// @ts-expect-error onSortChange reports { sort }, not the column and direction.
export const tableInvalidSortPayload = <AuditedTable onSortChange={({ column }) => column} />
// @ts-expect-error Directions are asc and desc.
export const tableInvalidDirection = <AuditedTable sort={{ column: 'a', direction: 'ascending' }} />
// @ts-expect-error Legacy presentational table attributes are not part of the API.
export const tableInvalidBorder = <AuditedTable border={1} />
// @ts-expect-error The ref points at the table element.
export const tableInvalidRef = <AuditedTable ref={createTableRef<HTMLDivElement>()} />
// @ts-expect-error Labels are text.
export const tableInvalidLabels = <AuditedTable labels={{ selectRow: () => 'Select' }} />
// @ts-expect-error maxWidth is gone: browsers ignore it on table cells.
export const tableRemovedMaxWidth = <AuditedTable columns={[{ id: 'a', maxWidth: 200 }]} />
// @ts-expect-error Row hover events are gone.
export const tableRemovedRowMouseEnter = <AuditedTable onRowMouseEnter={() => undefined} />
// @ts-expect-error Row hover events are gone.
export const tableRemovedRowMouseLeave = <AuditedTable onRowMouseLeave={() => undefined} />
// @ts-expect-error A row key is text: numbers are not converted.
export const tableInvalidRowKey = <AuditedTable rows={[{ n: 1 }]} rowKey={(row) => row.n as number} />
