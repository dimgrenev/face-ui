/**
 * Table — data table with sorting, row selection, and reference-matching features.
 *
 * `<Table columns={[...]} rows={[...]} />`
 * `<Table columns={[...]} rows={[...]} selectable />`
 * `<Table columns={[...]} rows={[...]} showRowNumbers stickyHeader />`
 */

import { forwardRef, useEffect, useMemo, useRef, useState, isValidElement, type ReactNode, type CSSProperties } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { tableMachine, connectTable } from '../assets/machines/table.machine'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableAlign = 'left' | 'center' | 'right'

export interface TableColumn<T = any> {
  /** Unique column identifier. */
  id: string
  /** Header content (face-ui-react native). */
  header?: ReactNode
  /** Header content alias (components API compatibility). */
  title?: ReactNode
  /** Data accessor — string key or function returning cell content. */
  accessor?: string | ((row: T) => ReactNode)
  /** Whether this column is sortable. */
  sortable?: boolean
  /** Column width. */
  width?: number | string
  /** Minimum column width in px. */
  minWidth?: number
  /** Maximum column width in px. */
  maxWidth?: number
  /** Text alignment inside cells. */
  align?: TableAlign
  /** Truncate cell text with ellipsis. */
  truncate?: boolean
  /** Custom render function for cell content. */
  render?: (value: unknown, row: T, ctx: { rowIndex: number; column: TableColumn<T> }) => ReactNode
}

export interface TableProps<T = any> {
  /** Column definitions. */
  columns?: TableColumn<T>[]
  /** Row data. */
  rows?: T[]
  /** Key field on each row, or a function returning a unique key. */
  rowKey?: string | ((row: T) => string)
  /** Controlled sort column. */
  sortColumn?: string
  /** Controlled sort direction. */
  sortDirection?: 'asc' | 'desc'
  /** Callback when sort changes. */
  onSortChange?: (details: { column: string; direction: 'asc' | 'desc' }) => void
  /** Controlled selected row IDs. */
  selectedRows?: string[]
  /** Callback when selection changes. */
  onSelectedRowsChange?: (details: { selectedRows: string[] }) => void
  /** Enable row selection. */
  selectable?: boolean
  /** Show row number column. */
  showRowNumbers?: boolean
  /** Make header sticky on scroll. */
  stickyHeader?: boolean
  /** Show divider lines between rows. */
  showDividers?: boolean
  /** Additional CSS class. */
  className?: string
  /** components API alias. */
  getRowId?: (row: T, index: number) => string
  /** components API compatibility: expose resize callback even for simple table machine mode. */
  onColumnResize?: (columnId: string, width: number) => void
  /** components API compatibility: included for parity, no-op for table machine mode. */
  resizable?: boolean
  /** components API compatibility: included for parity, handled via CSS sticky class. */
  stickyLastColumn?: boolean
  /** Callback when a row is clicked. */
  onRowClick?: (row: T, index: number) => void
  /** Callback when mouse enters a row. */
  onRowMouseEnter?: (row: T, index: number) => void
  /** Callback when mouse leaves a row. */
  onRowMouseLeave?: (row: T, index: number) => void
  /** Row ID to highlight as active (applies `data-active` attribute). */
  activeRowId?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRowId<T>(row: T, rowKey: string | ((row: T) => string) | undefined, index: number): string {
  if (typeof rowKey === 'function') return rowKey(row)
  if (typeof rowKey === 'string') {
    const val = (row as Record<string, unknown>)[rowKey]
    return val != null ? String(val) : String(index)
  }
  const asRecord = row as Record<string, unknown>
  if (asRecord['id'] != null) return String(asRecord['id'])
  return String(index)
}

function getCellValue<T>(row: T, accessor?: string | ((row: T) => ReactNode)): ReactNode {
  if (accessor == null) return undefined
  if (typeof accessor === 'function') return accessor(row)
  return (row as Record<string, unknown>)[accessor] as ReactNode
}

function getRawValue<T>(row: T, accessor?: string | ((row: T) => ReactNode)): unknown {
  if (accessor == null) return undefined
  if (typeof accessor === 'string') return (row as Record<string, unknown>)[accessor]
  return accessor(row)
}

function compareTableValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0
  if (left == null) return -1
  if (right == null) return 1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime()
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

function renderCellContent(content: ReactNode, align: TableAlign = 'left'): ReactNode {
  if (content == null) return null
  if (isValidElement(content) || Array.isArray(content)) return content
  if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    return (
      <Text as="div" fullWidth align={align} inset="none" membrane={false} className="uf-table__cellText">
        {String(content)}
      </Text>
    )
  }
  return content
}

function renderHeaderContent(content: ReactNode, align: TableAlign = 'left'): ReactNode {
  if (content == null) return null
  if (isValidElement(content) || Array.isArray(content)) return content
  if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    return (
      <Text as="div" fullWidth align={align} inset="none" membrane={false} className="uf-table__headerText">
        {String(content)}
      </Text>
    )
  }
  return content
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Table = forwardRef<HTMLTableElement, TableProps>(
  function Table(props, ref) {
    const {
      columns: rawColumns,
      rows: rawRows,
      rowKey,
      getRowId: getRowIdProp,
      sortColumn = null,
      sortDirection = 'asc',
      onSortChange,
      selectedRows = [],
      onSelectedRowsChange,
      selectable = false,
      showRowNumbers = false,
      stickyHeader = true,
      showDividers = true,
      stickyLastColumn = false,
      onColumnResize,
      resizable = false,
      className,
      onRowClick,
      onRowMouseEnter,
      onRowMouseLeave,
      activeRowId,
    } = props

    const columns = (Array.isArray(rawColumns) ? rawColumns : []).map((col) => {
      const c = col as TableColumn<any>
      const normalizedHeader = c.header ?? c.title ?? c.id
      const fallbackAccessor = (typeof (c as any).accessor === 'string' || typeof (c as any).accessor === 'function')
        ? (c as any).accessor
        : c.id
      return {
        ...c,
        header: normalizedHeader,
        accessor: fallbackAccessor,
      } as TableColumn<any>
    })
    const rows = Array.isArray(rawRows) ? rawRows : []

    const resolvedGetRowId = (row: any, i: number) => {
      if (typeof getRowIdProp === 'function') {
        try { return String(getRowIdProp(row, i)) } catch {}
      }
      return getRowId(row, rowKey, i)
    }

    const allRowIds = rows.map((row, i) => resolvedGetRowId(row, i))

    const { state, send } = useMachine(tableMachine, {
      sortColumn,
      sortDirection,
      selectedRows,
      selectable,
      rowKey: typeof rowKey === 'string' ? rowKey : 'id',
      onSortChange: onSortChange ?? null,
      onSelectedRowsChange: onSelectedRowsChange ?? null,
      rowCount: rows.length,
      allRowIds,
    })

    const api = connectTable(state, send)
    const [resizedWidths, setResizedWidths] = useState<Record<string, number>>({})
    const resizeStateRef = useRef<{
      id: string
      nextId: string | null
      startX: number
      startWidth: number
      startNextWidth: number
      minWidth: number
      maxWidth: number
      nextMinWidth: number
      nextMaxWidth: number
    } | null>(null)
    const displayRows = useMemo(() => {
      if (!api.sortColumn) return rows
      const sortColumnDef = columns.find((column) => column.id === api.sortColumn)
      if (!sortColumnDef || !sortColumnDef.accessor) return rows
      const sorted = [...rows]
      sorted.sort((leftRow, rightRow) => {
        const leftValue = getRawValue(leftRow, sortColumnDef.accessor)
        const rightValue = getRawValue(rightRow, sortColumnDef.accessor)
        const result = compareTableValues(leftValue, rightValue)
        return api.sortDirection === 'desc' ? result * -1 : result
      })
      return sorted
    }, [api.sortColumn, api.sortDirection, columns, rows])

    useEffect(() => {
      const onPointerMove = (event: PointerEvent) => {
        const drag = resizeStateRef.current
        if (!drag) return
        const delta = event.clientX - drag.startX
        let width = Math.round(drag.startWidth + delta)
        width = Math.max(drag.minWidth, Math.min(drag.maxWidth, width))

        if (drag.nextId) {
          const maxWidthByNext = drag.startWidth + (drag.startNextWidth - drag.nextMinWidth)
          width = Math.min(width, maxWidthByNext)
          let nextWidth = drag.startNextWidth - (width - drag.startWidth)
          nextWidth = Math.max(drag.nextMinWidth, Math.min(drag.nextMaxWidth, nextWidth))
          width = drag.startWidth + (drag.startNextWidth - nextWidth)

          setResizedWidths((prev) => ({
            ...prev,
            [drag.id]: width,
            [drag.nextId as string]: nextWidth,
          }))
          try { onColumnResize?.(drag.id, width) } catch {}
          try { onColumnResize?.(drag.nextId, nextWidth) } catch {}
          return
        }

        setResizedWidths((prev) => ({ ...prev, [drag.id]: width }))
        try { onColumnResize?.(drag.id, width) } catch {}
      }
      const onPointerUp = () => {
        resizeStateRef.current = null
      }
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      return () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
      }
    }, [onColumnResize])

    return (
      <table
        ref={ref}
        {...api.getRootProps()}
        data-sticky-header={stickyHeader || undefined}
        data-show-dividers={showDividers || undefined}
        className={cn('uf-table', className)}
        style={resizable ? { tableLayout: 'fixed' } : undefined}
      >
        <thead {...api.getHeaderProps()}>
          <tr {...api.getHeaderRowProps()}>
            {selectable && (
              <th role="columnheader">
                <input {...api.getSelectAllProps()} />
              </th>
            )}
            {showRowNumbers && (
                <th role="columnheader" className="uf-table__row-number-header">
                  <div className="uf-table__cellSlot" data-align="left">
                    {renderHeaderContent('#', 'left')}
                  </div>
                </th>
              )}
            {columns.map((col, index) => {
              const style: Record<string, unknown> = {}
              if (resizedWidths[col.id] != null) style.width = resizedWidths[col.id]
              else if (col.width != null) style.width = col.width
              if (col.minWidth != null) style.minWidth = col.minWidth
              if (col.maxWidth != null) style.maxWidth = col.maxWidth
              if (col.align) style.textAlign = col.align

              return (
                <th
                  key={col.id}
                  {...api.getHeaderCellProps(col.id, { sortable: col.sortable })}
                  style={Object.keys(style).length > 0 ? style as CSSProperties : undefined}
                >
                  <div className="uf-table__cellSlot" data-align={col.align ?? 'left'}>
                    {renderHeaderContent(col.header, col.align ?? 'left')}
                    {api.sortColumn === col.id && (
                      <span aria-hidden="true" className="uf-table__sort-icon">
                        <Icon name={api.sortDirection === 'asc' ? 'up' : 'down'} size={14} />
                      </span>
                    )}
                  </div>
                  {resizable && index < columns.length - 1 && (
                    <span
                      className="uf-table__resize-handle"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        const cell = event.currentTarget.parentElement as HTMLElement | null
                        const measuredWidth = resizedWidths[col.id] ?? cell?.getBoundingClientRect().width ?? 120
                        const nextColumn = columns[index + 1]
                        const nextCell = cell?.nextElementSibling as HTMLElement | null
                        const nextWidth = nextColumn
                          ? resizedWidths[nextColumn.id] ?? nextCell?.getBoundingClientRect().width ?? 120
                          : 0
                        resizeStateRef.current = {
                          id: col.id,
                          nextId: nextColumn?.id ?? null,
                          startX: event.clientX,
                          startWidth: measuredWidth,
                          startNextWidth: nextWidth,
                          minWidth: col.minWidth ?? 80,
                          maxWidth: typeof col.maxWidth === 'number' ? col.maxWidth : Number.MAX_SAFE_INTEGER,
                          nextMinWidth: nextColumn?.minWidth ?? 80,
                          nextMaxWidth: typeof nextColumn?.maxWidth === 'number' ? nextColumn.maxWidth : Number.MAX_SAFE_INTEGER,
                        }
                      }}
                    />
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody {...api.getBodyProps()}>
          {displayRows.map((row, rowIndex) => {
            const rowId = resolvedGetRowId(row, rowIndex)
            const isLastColumnSticky = stickyLastColumn
            const lastColumnId = columns.length > 0 ? String(columns[columns.length - 1]?.id || '') : ''
            return (
              <tr
                key={rowId}
                {...api.getRowProps(rowId)}
                data-active={activeRowId === rowId || undefined}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row, rowIndex) : undefined}
                onMouseLeave={onRowMouseLeave ? () => onRowMouseLeave(row, rowIndex) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {selectable && (
                  <td role="cell">
                    <input {...api.getRowSelectProps(rowId)} />
                  </td>
                )}
                {showRowNumbers && (
                  <td data-row-number="" role="cell">
                    <div className="uf-table__cellSlot" data-align="left">
                      {renderCellContent(rowIndex + 1, 'left')}
                    </div>
                  </td>
                )}
                {columns.map((col) => {
                  const cellStyle: Record<string, unknown> = {}
                  if (col.align) cellStyle.textAlign = col.align
                  if (col.maxWidth != null) cellStyle.maxWidth = col.maxWidth

                  // Resolve cell content: custom render > accessor
                  let content: ReactNode
                  if (col.render) {
                    const rawVal = getRawValue(row, col.accessor)
                    content = col.render(rawVal, row, { rowIndex, column: col })
                  } else {
                    content = getCellValue(row, col.accessor)
                  }
                  const renderedContent = renderCellContent(content, col.align ?? 'left')

                  return (
                    <td
                      key={col.id}
                      {...api.getCellProps(rowId, col.id)}
                      data-truncate={col.truncate || undefined}
                      data-sticky-right={isLastColumnSticky && lastColumnId && String(col.id) === lastColumnId ? '' : undefined}
                      style={Object.keys(cellStyle).length > 0 ? cellStyle as CSSProperties : undefined}
                      title={col.truncate && typeof content === 'string' ? content : undefined}
                    >
                      <div
                        className="uf-table__cellSlot"
                        data-align={col.align ?? 'left'}
                        data-truncate={col.truncate || undefined}
                      >
                        {renderedContent}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  },
)
