import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Table, type TableProps } from '../../../../Table/Table'

const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
let generation = 0

/** Ten wide columns, the last one an action column, and 30 rows. */
const wideColumns = Array.from({ length: 10 }, (_, index) => ({
  id: `c${index}`,
  header: index === 9 ? 'Actions' : `Column ${index}`,
  width: 120,
}))
const wideRows = Array.from({ length: 30 }, (_, row) =>
  Object.fromEntries([
    ['id', `r${row}`],
    ...wideColumns.map(({ id }, index) => [id, index === 9 ? `Open ${row}` : `R${row} C${index}`]),
  ]),
)

type Options = {
  fresh?: boolean
  direction?: string
  /** Size of the scrolling container around the table; none without it. */
  box?: { width: number; height?: number }
  wide?: boolean
  rowClick?: boolean
  /** Ids of the columns whose `render` shows the value as a link. */
  links?: string[]
}

function renderTable(props: Omit<TableProps, 'ref'> = {}, options: Options = {}) {
  if (options.fresh) {
    generation++
    events.length = 0
  }
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '16px',
    background: 'var(--uf-color-bg)',
    color: 'var(--uf-color-fg)',
  })
  const table = (
    <Table
      key={generation}
      aria-label="People"
      {...(options.wide ? { columns: wideColumns, rows: wideRows } : {})}
      {...props}
      columns={(props.columns ?? (options.wide ? wideColumns : undefined))?.map((column) =>
        options.links?.includes(column.id)
          ? { ...column, render: ({ value }) => <a href="#">{String(value)}</a> }
          : column,
      )}
      onSortChange={(details) => events.push(details)}
      onSelectedRowsChange={(details) => events.push(details)}
      onColumnResize={(details) => events.push(details)}
      onRowClick={
        options.rowClick
          ? ({ row, index }) => events.push({ row: (row as { id: string }).id, index })
          : undefined
      }
    />
  )
  flushSync(() =>
    root.render(
      <StrictMode>
        <button id="before" tabIndex={0}>
          Before
        </button>
        {options.box ? (
          <div
            id="scroller"
            style={{ width: options.box.width, height: options.box.height, overflow: 'auto' }}
          >
            {table}
          </div>
        ) : (
          table
        )}
        <button id="after" tabIndex={0}>
          After
        </button>
      </StrictMode>,
    ),
  )
}

Object.assign(window, { renderTable, tableEvents: events })
export type Hooks = { renderTable: typeof renderTable }
