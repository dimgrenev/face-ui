/** Table — data table with sortable columns, row selection, and resizable, sticky columns. */
import {
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type TableHTMLAttributes,
} from 'react'
import { Checkbox } from '../Checkbox/Checkbox'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { domId, readCollection, readKeys } from '../assets/runtime/collection'
import { readDirection, stepIntent } from '../assets/runtime/keyboard'
import { resolveLabels } from '../assets/runtime/labels'
import { invalidProp, readNumber } from '../assets/runtime/props'
import { sortRows } from '../assets/runtime/table'
import { cn } from '../assets/utils'

/** The order of the rows: a column and a direction. */
export interface TableSort {
  /** `id` of the column whose values order the rows. */
  column: string
  /** `asc` puts the smallest values, earliest dates and A first; `desc` the reverse. */
  direction: 'asc' | 'desc'
}

export interface TableColumn<T = any> {
  /** Unique key of the column: `sort.column` names it, it reads `row[id]` without `accessor` and is the header without `header`. */
  id: string
  /** Content of the header cell. */
  header?: ReactNode
  /** Cell value: a row field name or a function of the row; sorting compares it and `render` receives it. */
  accessor?: string | ((row: T) => unknown)
  /** The header becomes a button that sorts by this column: ascending, then descending, then the order of `rows`. */
  sortable?: boolean
  /** Column width, in px or any CSS length; a px width holds when the table is narrow, and a user's resize replaces it. */
  width?: number | string
  /** Narrowest width in px, for layout and for resizing; resizing stops at 48 px when unset. */
  minWidth?: number
  /** Widest width in px, for layout and for resizing. */
  maxWidth?: number
  /** Inline alignment of the header and the cells, following text direction; `end` suits numbers. */
  align?: 'start' | 'center' | 'end'
  /** Keeps the cells on one line, cut with an ellipsis, so the column can narrow to its header; a text cell shows its full text as a tooltip. */
  truncate?: boolean
  /** Cell content built from the value; without it the value shows as text. */
  render?: (details: TableCellDetails<T>) => ReactNode
}

/** What `render` receives for one cell. */
export interface TableCellDetails<T = any> {
  /** The cell value read by `accessor`. */
  value: unknown
  /** The row object from `rows`. */
  row: T
  /** Position of the row as shown, from 0. */
  rowIndex: number
  /** The column being rendered. */
  column: TableColumn<T>
}

/** Names and text of the table's own controls. */
export interface TableLabels {
  /** Name of the header checkbox that selects or clears every row. */
  selectAll: string
  /** Name of a row checkbox, followed by the text of the row's first column. */
  selectRow: string
  /** Name of a column's resize handle, followed by the column's header. */
  resizeColumn: string
  /** Header of the row-number column. */
  rowNumber: string
}

const defaultLabels: TableLabels = Object.freeze({
  selectAll: 'Select all rows',
  selectRow: 'Select',
  resizeColumn: 'Resize',
  rowNumber: '#',
})

/** What a row event reports. */
export interface TableRowDetails<T = any> {
  /** The row object from `rows`. */
  row: T
  /** Position of the row as shown, from 0. */
  index: number
  /** The mouse event on the row; Enter on a focused row arrives as its click. */
  event: MouseEvent<HTMLTableRowElement>
}

export interface TableProps<T = any>
  extends Omit<
    TableHTMLAttributes<HTMLTableElement>,
    | 'children'
    | 'dangerouslySetInnerHTML'
    | 'defaultValue'
    | 'defaultChecked'
    | 'contentEditable'
    | 'suppressContentEditableWarning'
    | 'align'
    | 'bgcolor'
    | 'border'
    | 'cellPadding'
    | 'cellSpacing'
    | 'frame'
    | 'rules'
    | 'summary'
    | 'width'
  > {
  /** Names the table when no visible heading does. */
  'aria-label'?: string
  /** Ids of the elements that name the table, such as the heading above it. */
  'aria-labelledby'?: string
  /** Columns in display order; a column without a unique string `id` is dropped. */
  columns?: readonly TableColumn<T>[]
  /** Row data, one object per row. */
  rows?: readonly T[]
  /** Row key: a row field name or a function of the row returning text or a number; `id` by default, else `#<position in rows>`. */
  rowKey?: string | ((row: T) => string | number)
  /** Controlled order of the rows: a sortable or any other column and a direction; `null` keeps the order of `rows`. */
  sort?: TableSort | null
  /** Order of the rows on mount (uncontrolled); read once. */
  defaultSort?: TableSort | null
  /** Called once per user change of the order; `sort` updates from the parent never call it. */
  onSortChange?: (details: { sort: TableSort | null }) => void
  /** Keys of the selected rows (controlled); keys without a row are kept and not shown. */
  selectedRows?: readonly string[]
  /** Keys of the rows selected on mount (uncontrolled); read once. */
  defaultSelectedRows?: readonly string[]
  /** Called once per user change of the selection; `selectedRows` updates from the parent never call it. */
  onSelectedRowsChange?: (details: { selectedRows: string[] }) => void
  /** Adds a leading checkbox column: one checkbox per row and a select-all checkbox in the header. */
  selectable?: boolean
  /** Adds a leading column numbering the rows 1, 2, 3 in the order shown. */
  showRowNumbers?: boolean
  /** Keeps the header row at the top of the nearest scrolling container. */
  stickyHeader?: boolean
  /** Draws a line under the header and under every row. */
  showDividers?: boolean
  /** Keeps the last column at the inline end of the nearest scrolling container while rows scroll sideways. */
  stickyLastColumn?: boolean
  /** Adds a handle at the inline end of every header cell that resizes its column by pointer or arrow keys. */
  resizable?: boolean
  /** Called when the user finishes resizing a column: on pointer release, or per key press. */
  onColumnResize?: (details: { column: string; width: number }) => void
  /** Called when a row is clicked or Enter is pressed on it; clicks on controls inside the row do not count. Rows become focusable, arrows move between them. */
  onRowClick?: (details: TableRowDetails<T>) => void
  /** Called when the pointer enters a row. */
  onRowMouseEnter?: (details: TableRowDetails<T>) => void
  /** Called when the pointer leaves a row. */
  onRowMouseLeave?: (details: TableRowDetails<T>) => void
  /** Key of the row marked as the current one (`aria-current`), such as the row open in a detail view. */
  activeRow?: string | null
  /** Outer membrane spacing around the table. */
  membrane?: boolean
  /** `tile` rounds every row into its own surface; `plain` keeps a flat grid. */
  variant?: 'plain' | 'tile'
  /** Names and text of the table's own controls; the table takes a native aria-label or aria-labelledby. */
  labels?: Partial<TableLabels>
}

const none: readonly never[] = []
/** Resizing never makes a column narrower than this unless `minWidth` says so. */
const MIN_WIDTH = 48
/** Pixels per arrow key on a resize handle; Page Up and Page Down move ten steps. */
const STEP = 10
/** Clicks on these inside a row, and on the selection cell, do not activate the row. */
const CONTROL = 'a[href], button, input, select, textarea, label, [tabindex], [data-select]'

interface RowEntry<T> {
  key: string
  row: T
}

/** Rows with their keys; a row that is not an object, or repeats a key, is dropped with a report. */
function readRows<T>(rows: unknown, rowKey: TableProps<T>['rowKey']): RowEntry<T>[] {
  if (rows === undefined) return []
  if (!Array.isArray(rows)) {
    invalidProp('Table', 'rows', rows, 'using []')
    return []
  }
  const seen = new Set<string>()
  const entries: RowEntry<T>[] = []
  rows.forEach((row: unknown, index) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row))
      return invalidProp('Table', `rows[${index}]`, row, 'dropping the row')
    const raw =
      typeof rowKey === 'function'
        ? rowKey(row as T)
        : (row as Record<string, unknown>)[rowKey ?? 'id']
    let key = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : raw
    if (typeof key !== 'string') {
      key = `#${index}`
      if (raw !== undefined) invalidProp('Table', `rows[${index}] key`, raw, `using "${key}"`)
    }
    if (seen.has(key as string))
      return invalidProp('Table', `rows[${index}] key`, key, 'dropping the duplicate')
    seen.add(key as string)
    entries.push({ key: key as string, row: row as T })
  })
  return entries
}

function cellValue<T>(row: T, column: TableColumn<T>): unknown {
  const accessor = column.accessor ?? column.id
  return typeof accessor === 'function'
    ? accessor(row)
    : (row as Record<string, unknown>)[accessor]
}

const isText = (value: unknown) =>
  ['string', 'number', 'bigint', 'boolean'].includes(typeof value) ||
  value instanceof Date
const isNode = (value: unknown): boolean =>
  value == null ||
  (isText(value) && !(value instanceof Date)) ||
  isValidElement(value) ||
  (Array.isArray(value) && value.every(isNode))

/**
 * Cell or header content: text through `Text`, elements as they are; anything else is reported
 * as `where` and left out.
 */
function content(
  value: unknown,
  where: string,
  text: { align?: TableColumn['align']; truncate?: boolean; variant?: 'muted' } = {},
): ReactNode {
  if (value == null || value === '') return null
  if (isText(value))
    return (
      <Text as="span" fullWidth inset="none" membrane={false} {...text}>
        {String(value)}
      </Text>
    )
  if (isNode(value)) return value as ReactNode
  invalidProp('Table', where, value, 'leaving the cell empty')
  return null
}

const sameSort = (a: TableSort | null, b: TableSort | null) =>
  a === b || (!!a && !!b && a.column === b.column && a.direction === b.direction)

/** A data table: sortable columns, row selection, row actions, and resizable, sticky columns. */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(props, ref) {
  const {
    columns,
    rows,
    rowKey,
    sort,
    defaultSort = null,
    onSortChange,
    selectedRows,
    defaultSelectedRows,
    onSelectedRowsChange,
    selectable = false,
    showRowNumbers = false,
    stickyHeader = false,
    showDividers = true,
    stickyLastColumn = false,
    resizable = false,
    onColumnResize,
    onRowClick,
    onRowMouseEnter,
    onRowMouseLeave,
    activeRow,
    membrane = false,
    variant = 'plain',
    labels,
    className,
    ...rest
  } = props
  const base = useId()
  const text = resolveLabels(defaultLabels, labels, 'Table')
  const columnList = useMemo(
    () =>
      readCollection<TableColumn>(columns, {
        component: 'Table',
        prop: 'columns',
        key: (column) => column.id,
      }).entries.map(({ item }) => item),
    [columns],
  )
  const entries = useMemo(() => readRows(rows, rowKey), [rows, rowKey])

  const [order, setOrder] = useControllableState<TableSort | null>({
    value: sort,
    defaultValue: defaultSort,
    onChange: (next) => onSortChange?.({ sort: next }),
    equal: sameSort,
    name: ['Table', 'sort'],
  })
  const sorted = columnList.find((column) => column.id === order?.column)
  const direction = order?.direction === 'desc' ? 'desc' : 'asc'
  const shown = useMemo(
    () =>
      sorted
        ? sortRows(entries, ({ row }) => cellValue(row, sorted), direction)
        : entries,
    [entries, sorted, direction],
  )
  const cycle = (column: string) =>
    setOrder((current) =>
      current?.column !== column
        ? { column, direction: 'asc' }
        : current.direction === 'desc'
          ? null
          : { column, direction: 'desc' },
    )

  const [chosen, setChosen] = useControllableState<readonly string[]>({
    value:
      selectedRows === undefined
        ? undefined
        : readKeys(selectedRows, 'Table', 'selectedRows'),
    // Read only while uncontrolled: an unused default reports nothing.
    defaultValue: () =>
      selectedRows === undefined
        ? readKeys(defaultSelectedRows, 'Table', 'defaultSelectedRows')
        : none,
    onChange: (next) => onSelectedRowsChange?.({ selectedRows: next as string[] }),
    name: ['Table', 'selectedRows'],
  })
  const selected = new Set(chosen)
  const keys = entries.map(({ key }) => key)
  const all = keys.length > 0 && keys.every((key) => selected.has(key))
  const some = keys.some((key) => selected.has(key))
  const selectRow = (key: string, on: boolean) =>
    setChosen((current) =>
      on
        ? current.includes(key)
          ? current
          : [...current, key]
        : current.filter((other) => other !== key),
    )
  const selectAll = (on: boolean) =>
    setChosen((current) => {
      const own = new Set(keys)
      return on
        ? [...current, ...keys.filter((key) => !current.includes(key))]
        : current.filter((key) => !own.has(key))
    })

  const roving = useRovingFocus({
    keys: shown.map(({ key }) => key),
    active: activeRow,
    orientation: 'vertical',
    loop: false,
  })
  const onBodyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    roving.root.onKeyDown(event)
    if (event.key !== 'Enter' || event.defaultPrevented) return
    if (roving.keyOf(event.target) === null) return
    event.preventDefault()
    ;(event.target as HTMLElement).click()
  }

  // Resizing: widths the user set, and the rendered widths the handles announce.
  const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
  const [measured, setMeasured] = useState<Readonly<Record<string, number>>>({})
  const headRow = useRef<HTMLTableRowElement>(null)
  const drag = useRef<{
    column: string
    x: number
    sign: number
    start: number
    width: number
  } | null>(null)
  const columnKey = columnList.map((column) => column.id).join('\n')
  useIsomorphicLayoutEffect(() => {
    const row = headRow.current
    if (!resizable || !row || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() =>
      setMeasured((previous) => {
        const next: Record<string, number> = {}
        let changed = false
        for (const cell of row.querySelectorAll<HTMLElement>('th[data-column]')) {
          const width = Math.round(cell.getBoundingClientRect().width)
          next[cell.dataset.column!] = width
          changed ||= previous[cell.dataset.column!] !== width
        }
        return changed ? next : previous
      }),
    )
    for (const cell of row.cells) observer.observe(cell)
    return () => observer.disconnect()
  }, [resizable, columnKey])
  const bounds = (column: TableColumn) => {
    const min = readNumber('Table', 'columns[].minWidth', column.minWidth, MIN_WIDTH, {
      min: 0,
    })
    const max = readNumber('Table', 'columns[].maxWidth', column.maxWidth, Infinity, { min })
    return [min, max] as const
  }
  const resize = (column: TableColumn, width: number) => {
    const [min, max] = bounds(column)
    const next = Math.round(Math.min(max, Math.max(min, width)))
    setWidths((current) =>
      current[column.id] === next ? current : { ...current, [column.id]: next },
    )
    return next
  }
  const endDrag = () => {
    const done = drag.current
    drag.current = null
    if (done && done.width !== done.start)
      onColumnResize?.({ column: done.column, width: done.width })
  }
  const handleProps = (column: TableColumn, headerId: string) => {
    const [min, max] = bounds(column)
    const id = domId(base, 'resize', column.id)
    const cellOf = (handle: HTMLElement) => handle.parentElement!
    return {
      id,
      role: 'separator',
      tabIndex: 0,
      'aria-orientation': 'vertical',
      'aria-label': text.resizeColumn,
      'aria-labelledby': `${id} ${headerId}`,
      'aria-valuenow': widths[column.id] ?? measured[column.id],
      'aria-valuemin': min,
      'aria-valuemax': Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER,
      'data-scope': 'table',
      'data-part': 'resizeHandle',
      className: 'uf-table__resize-handle',
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        const cell = cellOf(event.currentTarget)
        const start = Math.round(cell.getBoundingClientRect().width)
        const sign = readDirection(cell) === 'ltr' ? 1 : -1
        drag.current = { column: column.id, x: event.clientX, sign, start, width: start }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = drag.current
        if (current?.column !== column.id) return
        current.width = resize(column, current.start + (event.clientX - current.x) * current.sign)
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const cell = cellOf(event.currentTarget)
        const intent = stepIntent(event, 'horizontal', readDirection(cell))
        if (!intent) return
        event.preventDefault()
        const start = Math.round(cell.getBoundingClientRect().width)
        const target =
          'step' in intent ? start + intent.step * STEP : intent.to === 'min' ? min : max
        if (!Number.isFinite(target)) return
        const width = resize(column, target)
        if (width !== start) onColumnResize?.({ column: column.id, width })
      },
    } as const
  }

  const firstColumn = columnList[0]
  const cell = (part: 'headerCell' | 'cell') =>
    ({ 'data-scope': 'table', 'data-part': part, role: part === 'cell' ? 'cell' : 'columnheader' }) as const

  const table = (
    <table
      {...rest}
      ref={ref}
      role="table"
      data-scope="table"
      data-part="root"
      data-variant={variant}
      data-sticky-header={stickyHeader || undefined}
      data-sticky-last-column={stickyLastColumn || undefined}
      data-show-dividers={showDividers || undefined}
      className={cn('uf-table', className)}
    >
      <thead data-scope="table" data-part="header" role="rowgroup">
        <tr ref={headRow} data-scope="table" data-part="headerRow" role="row">
          {selectable && (
            <th {...cell('headerCell')} data-select="">
              <div className="uf-table__cellSlot">
                <Checkbox
                  membrane={false}
                  aria-label={text.selectAll}
                  checked={all ? true : some ? 'indeterminate' : false}
                  disabled={!keys.length}
                  onCheckedChange={({ checked }) => selectAll(checked === true)}
                />
              </div>
            </th>
          )}
          {showRowNumbers && (
            <th {...cell('headerCell')} data-row-number="">
              <div className="uf-table__cellSlot">
                {content(text.rowNumber, 'labels.rowNumber', { variant: 'muted' })}
              </div>
            </th>
          )}
          {columnList.map((column) => {
            const headerId = domId(base, 'column', column.id)
            // A resize fixes the width; a px width is also the least the column narrows to.
            const width = widths[column.id]
            const style: CSSProperties =
              width === undefined
                ? {
                    width: column.width,
                    minWidth:
                      column.minWidth ??
                      (typeof column.width === 'number' ? column.width : undefined),
                    maxWidth: column.maxWidth,
                  }
                : { width, minWidth: width, maxWidth: width }
            const isSorted = column === sorted
            const label = (
              <>
                {content(column.header ?? column.id, `columns.${column.id} header`, {
                  align: column.align,
                })}
                {isSorted && (
                  <span
                    aria-hidden="true"
                    data-scope="table"
                    data-part="sortIndicator"
                    className="uf-table__sort-icon"
                  >
                    <Icon name={direction === 'asc' ? 'arrow-up' : 'arrow-down'} />
                  </span>
                )}
              </>
            )
            return (
              <th
                key={column.id}
                {...cell('headerCell')}
                id={headerId}
                data-column={column.id}
                aria-sort={
                  isSorted
                    ? direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : column.sortable
                      ? 'none'
                      : undefined
                }
                style={style}
              >
                <div className="uf-table__cellSlot" data-align={column.align}>
                  {column.sortable ? (
                    <button
                      type="button"
                      // Explicit, so WebKit's Tab order includes the button.
                      tabIndex={0}
                      data-scope="table"
                      data-part="sortButton"
                      className="uf-table__sort-button"
                      onClick={() => cycle(column.id)}
                    >
                      {label}
                    </button>
                  ) : (
                    label
                  )}
                </div>
                {resizable && <span {...handleProps(column, headerId)} />}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody
        data-scope="table"
        data-part="body"
        role="rowgroup"
        {...(onRowClick && { ...roving.root, onKeyDown: onBodyKeyDown })}
      >
        {shown.map(({ key, row }, index) => {
          const details = (event: MouseEvent<HTMLTableRowElement>) => ({ row, index, event })
          const isActive = activeRow != null && key === activeRow
          const labelId = domId(base, 'cell', key)
          const checkboxId = domId(base, 'select', key)
          return (
            <tr
              key={key}
              data-scope="table"
              data-part="row"
              role="row"
              data-row-id={key}
              data-selected={selected.has(key) || undefined}
              data-active={isActive || undefined}
              aria-current={isActive || undefined}
              data-interactive={onRowClick ? '' : undefined}
              {...(onRowClick && roving.item(key))}
              onClick={
                onRowClick &&
                ((event) => {
                  const control = (event.target as Element).closest(CONTROL)
                  if (control && control !== event.currentTarget) return
                  onRowClick(details(event))
                })
              }
              onMouseEnter={onRowMouseEnter && ((event) => onRowMouseEnter(details(event)))}
              onMouseLeave={onRowMouseLeave && ((event) => onRowMouseLeave(details(event)))}
            >
              {selectable && (
                <td {...cell('cell')} data-select="">
                  <div className="uf-table__cellSlot">
                    <Checkbox
                      membrane={false}
                      id={checkboxId}
                      aria-label={text.selectRow}
                      aria-labelledby={firstColumn && `${checkboxId} ${labelId}`}
                      checked={selected.has(key)}
                      onCheckedChange={({ checked }) => selectRow(key, checked === true)}
                    />
                  </div>
                </td>
              )}
              {showRowNumbers && (
                <td {...cell('cell')} data-row-number="">
                  <div className="uf-table__cellSlot">
                    {content(index + 1, 'row number', { variant: 'muted' })}
                  </div>
                </td>
              )}
              {columnList.map((column) => {
                const value = cellValue(row, column)
                const shownValue = column.render
                  ? column.render({ value, row, rowIndex: index, column })
                  : value
                return (
                  <td
                    key={column.id}
                    {...cell('cell')}
                    id={column === firstColumn ? labelId : undefined}
                    data-column={column.id}
                    title={
                      column.truncate && isText(shownValue) ? String(shownValue) : undefined
                    }
                  >
                    <div
                      className="uf-table__cellSlot"
                      data-align={column.align}
                      data-truncate={column.truncate || undefined}
                    >
                      {content(shownValue, `columns.${column.id} cell`, {
                        align: column.align,
                        truncate: column.truncate,
                      })}
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
  return (
    <Membrane enabled={membrane} as="div" fullWidth>
      {table}
    </Membrane>
  )
})
