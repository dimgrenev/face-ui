/**
 * Table Machine
 *
 * States: idle
 * Manages sort column/direction and row selection state.
 * Row data and column definitions live in the React component (not machine context)
 * since they may contain ReactNode content.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const tableAnatomy = createAnatomy('table').parts(
  'root',
  'header',
  'headerRow',
  'headerCell',
  'body',
  'row',
  'cell',
  'footer',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface TableSchema extends MachineSchema {
  context: {
    sortColumn: string | null
    sortDirection: 'asc' | 'desc'
    selectedRows: string[]
    selectable: boolean
    rowKey: string
    onSortChange: ((details: { column: string; direction: 'asc' | 'desc' }) => void) | null
    onSelectedRowsChange: ((details: { selectedRows: string[] }) => void) | null
    /** Total row count — needed for SELECT_ALL to know if all are selected */
    rowCount: number
    /** All row IDs — needed for SELECT_ALL */
    allRowIds: string[]
  }
  state: 'idle'
  event:
    | { type: 'SORT'; column: string }
    | { type: 'SELECT_ROW'; id: string }
    | { type: 'DESELECT_ROW'; id: string }
    | { type: 'SELECT_ALL' }
    | { type: 'DESELECT_ALL' }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const tableMachine = createMachine<TableSchema>({
  id: 'table',
  initial: 'idle',

  context: {
    sortColumn: null,
    sortDirection: 'asc',
    selectedRows: [],
    selectable: false,
    rowKey: 'id',
    onSortChange: null,
    onSelectedRowsChange: null,
    rowCount: 0,
    allRowIds: [],
  },

  watch: {
    selectedRows(ctx) {
      ctx.onSelectedRowsChange?.({ selectedRows: ctx.selectedRows })
    },
  },

  computed: {
    sortedColumn: (ctx) => ctx.sortColumn,
    sortedDirection: (ctx) => ctx.sortDirection,
    allSelected: (ctx) =>
      ctx.allRowIds.length > 0 && ctx.selectedRows.length === ctx.allRowIds.length,
    someSelected: (ctx) =>
      ctx.selectedRows.length > 0 && ctx.selectedRows.length < ctx.allRowIds.length,
  },

  states: {
    idle: {
      on: {
        SORT: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'SORT'; column: string }
              if (ctx.sortColumn === e.column) {
                // Toggle direction
                ctx.sortDirection = ctx.sortDirection === 'asc' ? 'desc' : 'asc'
              } else {
                ctx.sortColumn = e.column
                ctx.sortDirection = 'asc'
              }
              ctx.onSortChange?.({ column: ctx.sortColumn, direction: ctx.sortDirection })
            },
          ],
        },
        SELECT_ROW: [
          {
            guard: (ctx) => ctx.selectable,
            actions: [
              (ctx, event) => {
                const e = event as { type: 'SELECT_ROW'; id: string }
                if (!ctx.selectedRows.includes(e.id)) {
                  ctx.selectedRows = [...ctx.selectedRows, e.id]
                }
              },
            ],
          },
        ],
        DESELECT_ROW: [
          {
            guard: (ctx) => ctx.selectable,
            actions: [
              (ctx, event) => {
                const e = event as { type: 'DESELECT_ROW'; id: string }
                ctx.selectedRows = ctx.selectedRows.filter((id) => id !== e.id)
              },
            ],
          },
        ],
        SELECT_ALL: [
          {
            guard: (ctx) => ctx.selectable,
            actions: [
              (ctx) => {
                ctx.selectedRows = [...ctx.allRowIds]
              },
            ],
          },
        ],
        DESELECT_ALL: [
          {
            guard: (ctx) => ctx.selectable,
            actions: [
              (ctx) => {
                ctx.selectedRows = []
              },
            ],
          },
        ],
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectTable(
  state: MachineSnapshot<TableSchema>,
  send: SendFn<TableSchema>,
) {
  const { sortColumn, sortDirection, selectedRows, selectable } = state.context
  const allSelected = state.computed['allSelected'] as boolean
  const someSelected = state.computed['someSelected'] as boolean

  return {
    /** Computed accessors */
    sortColumn,
    sortDirection,
    selectedRows,
    allSelected,
    someSelected,

    getRootProps() {
      return {
        ...tableAnatomy.getPartAttrs('root'),
        role: 'table' as const,
      }
    },

    getHeaderProps() {
      return {
        ...tableAnatomy.getPartAttrs('header'),
        role: 'rowgroup' as const,
      }
    },

    getHeaderRowProps() {
      return {
        ...tableAnatomy.getPartAttrs('headerRow'),
        role: 'row' as const,
      }
    },

    getHeaderCellProps(columnId: string, options?: { sortable?: boolean }) {
      const isSorted = sortColumn === columnId
      const sortable = options?.sortable ?? false

      return {
        ...tableAnatomy.getPartAttrs('headerCell'),
        role: 'columnheader' as const,
        'data-column': columnId,
        'data-sorted': isSorted || undefined,
        'data-sort-direction': isSorted ? sortDirection : undefined,
        'aria-sort': isSorted
          ? (sortDirection === 'asc' ? 'ascending' : 'descending') as 'ascending' | 'descending'
          : ('none' as const),
        ...(sortable
          ? {
              style: { cursor: 'pointer' },
              onClick() {
                send({ type: 'SORT', column: columnId })
              },
              onKeyDown(event: { key: string; preventDefault: () => void }) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  send({ type: 'SORT', column: columnId })
                }
              },
              tabIndex: 0,
            }
          : {}),
      }
    },

    getSelectAllProps() {
      return {
        type: 'checkbox' as const,
        checked: allSelected,
        'aria-label': 'Select all rows',
        // indeterminate must be set via ref in React
        onChange() {
          if (allSelected) {
            send({ type: 'DESELECT_ALL' })
          } else {
            send({ type: 'SELECT_ALL' })
          }
        },
      }
    },

    getBodyProps() {
      return {
        ...tableAnatomy.getPartAttrs('body'),
        role: 'rowgroup' as const,
      }
    },

    getRowProps(rowId: string) {
      const isSelected = selectedRows.includes(rowId)

      return {
        ...tableAnatomy.getPartAttrs('row'),
        role: 'row' as const,
        'data-row-id': rowId,
        'data-selected': isSelected || undefined,
        'aria-selected': selectable ? isSelected : undefined,
      }
    },

    getRowSelectProps(rowId: string) {
      const isSelected = selectedRows.includes(rowId)
      return {
        type: 'checkbox' as const,
        checked: isSelected,
        'aria-label': `Select row ${rowId}`,
        onChange() {
          if (isSelected) {
            send({ type: 'DESELECT_ROW', id: rowId })
          } else {
            send({ type: 'SELECT_ROW', id: rowId })
          }
        },
      }
    },

    getCellProps(rowId: string, columnId: string) {
      return {
        ...tableAnatomy.getPartAttrs('cell'),
        role: 'cell' as const,
        'data-row-id': rowId,
        'data-column': columnId,
      }
    },

    getFooterProps() {
      return {
        ...tableAnatomy.getPartAttrs('footer'),
        role: 'rowgroup' as const,
      }
    },
  }
}
