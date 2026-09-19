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
import { readCollection, readKeys } from '../assets/runtime/collection'
import { readDirection, stepIntent } from '../assets/runtime/keyboard'
import { formatLabel, resolveLabels } from '../assets/runtime/labels'
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
  /** Width in px or a CSS length such as `25%`; content wraps or is cut inside, and a full-width table spreads spare room over the columns. A keyword or negative width is reported and ignored. */
  width?: number | string
  /** Least width in px: a column without `width` never narrows below it, and a resize stops at it (48 px when unset). */
  minWidth?: number
  /** Inline alignment of the header and the cells, following text direction; `end` suits numbers. */
  align?: 'start' | 'center' | 'end'
  /** Keeps the cells on one line, cut with an ellipsis, so the column can narrow to its header. Any content is kept whole: an element with a layout of its own, a link or a Badge, shrinks with the cell and the text inside it carries the ellipsis. A text cell shows its full text as a tooltip. */
  truncate?: boolean
  /** Cell content built from the value; without it a text or number value shows as text, and any other value (a date, a boolean) needs `render`. */
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
  /** Name of a row checkbox; `{name}` is the row's value in the first column, or its position when that value is not text. */
  selectRow: string
  /** Name of a column's resize handle; `{name}` is the column header, or its `id` when the header is not text. */
  resizeColumn: string
  /** What a resize handle announces as its value; `{width}` is the column width in px. */
  columnWidth: string
  /** Header of the row-number column. */
  rowNumber: string
}

const defaultLabels: TableLabels = Object.freeze({
  selectAll: 'Select all rows',
  selectRow: 'Select {name}',
  resizeColumn: 'Resize {name}',
  columnWidth: '{width} pixels',
  rowNumber: '#',
})

/** What `onRowClick` reports. */
export interface TableRowDetails<T = any> {
  /** The row object from `rows`. */
  row: T
  /** Position of the row as shown, from 0. */
  index: number
  /** The click on the row; Enter on a focused row arrives as its click. */
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
  /** Row data, one object per row; a row that is not an object, or repeats a key, is dropped. */
  rows?: readonly T[]
  /** Row key: a row field name or a function of the row, `id` by default. A row whose key is not text is keyed `#<position in rows>`. */
  rowKey?: string | ((row: T) => string)
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
  /** Adds a leading column, headed by `labels.rowNumber`, that numbers the rows 1, 2, 3 in the order shown. */
  rowNumbers?: boolean
  /** Keeps the header row at the top of the nearest scrolling container. */
  stickyHeader?: boolean
  /** Draws a line under the header and under every row. */
  showDividers?: boolean
  /** Keeps the last column at the inline end of the nearest scrolling container while rows scroll sideways. */
  stickyLastColumn?: boolean
  /** Adds a handle to each header cell that resizes its column by pointer or arrow keys; a resize fixes every column, so the table grows or shrinks. Turning it off restores the columns. */
  resizable?: boolean
  /** Called when the user finishes resizing a column: on pointer release, or per key press. */
  onColumnResize?: (details: { column: string; width: number }) => void
  /** Called when a row is clicked or Enter is pressed on it; clicks on controls inside the row do not count. Rows become focusable, arrows move between them. */
  onRowClick?: (details: TableRowDetails<T>) => void
  /** Key of the row marked as the current one (`aria-current`), such as the row open in a detail view. */
  activeRow?: string | null
  /** Outer membrane spacing around the table. */
  membrane?: boolean
  /** `tile` shows each row as one rounded surface, under the pointer and when selected or current, with its content inset; `plain` keeps full-width rows. */
  variant?: 'plain' | 'tile'
  /** Names and text of the table's own controls; the table takes a native aria-label or aria-labelledby. */
  labels?: Partial<TableLabels>
}

const none: readonly never[] = []
const noWidths: Readonly<Record<string, number>> = Object.freeze({})
/** Resizing never makes a column narrower than this unless `minWidth` says so. */
const MIN_WIDTH = 48
/** Pixels per arrow key on a resize handle; Page Up and Page Down move ten steps. */
const STEP = 10
/** Clicks on these inside a row, native controls and ARIA widgets alike, and on the selection cell do not activate the row. */
const CONTROL = [
  'a[href], button, input, select, textarea, label, summary, [tabindex], [data-select]',
  '[contenteditable]:not([contenteditable="false"])',
  ...'button link checkbox radio switch tab option menuitem menuitemcheckbox menuitemradio textbox searchbox combobox slider spinbutton'
    .split(' ')
    .map((role) => `[role="${role}"]`),
].join()
/** A CSS length or function: `120px`, `.5em`, `25%`, `0`, `calc(…)`, `var(--w)`; not a keyword or a negative value. */
const LENGTH = /^\s*(?:(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)|0|[a-z-]+\(.+\))\s*$/i

const isRecord = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Rows with their keys, read as a display list: a row that is not an object, or repeats a key, is
 * dropped with a report, and a row without a text key takes `#<position in rows>`. Each row is
 * wrapped so that a data field such as `type: 'group'` is not read as collection structure.
 */
function readRows<T>(rows: unknown, rowKey: TableProps<T>['rowKey']) {
  const list = Array.isArray(rows)
    ? rows.map((row: unknown) => (isRecord(row) ? { row: row as T } : row))
    : rows
  return readCollection<{ row: T }>(list, {
    component: 'Table',
    prop: 'rows',
    positional: true,
    key: ({ row }) =>
      typeof rowKey === 'function'
        ? rowKey(row)
        : (row as Record<string, unknown>)[rowKey ?? 'id'],
  }).entries.map(({ key, item }) => ({ key, row: item.row }))
}

/**
 * A column's `width` and `minWidth` as the table applies them. A width that is not a length ≥ 0
 * (`auto`, `fit-content`, `-5`) would let the column's contained cells collapse, so it is reported
 * and left out; an empty one is left out silently. `minWidth` is clamped to 0 or more.
 */
function readSize({ id, width, minWidth }: TableColumn) {
  const valid =
    typeof width === 'number' ? Number.isFinite(width) && width >= 0 : LENGTH.test(width ?? '')
  if (!valid && width !== undefined && width !== '')
    invalidProp('Table', `columns.${id} width`, width, 'sizing the column to its content')
  return {
    width: valid ? width : undefined,
    minWidth:
      minWidth === undefined
        ? undefined
        : readNumber('Table', `columns.${id} minWidth`, minWidth, 0, { min: 0 }),
  }
}

interface ResizeHandleProps {
  /** Name of the handle. */
  label: string
  /** What the handle announces for a width in px. */
  valueText: (width: number) => string
  /** The width a resize fixed; until then the handle measures its header cell. */
  width: number | undefined
  /** Least width a resize reaches, unless the column is already narrower. */
  minWidth: number
  /** A new width: while dragging with `done` false, then `done` true when the drag or key press ends. */
  onResize: (width: number, done: boolean) => void
}

/**
 * A column's resize handle, by pointer or arrow keys. It measures its own header cell, so a resize
 * of the table re-renders the handles and not the rows. Until measured (so in server HTML) it is
 * hidden and has no value.
 */
function ResizeHandle({ label, valueText, width, minWidth, onResize }: ResizeHandleProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [measured, setMeasured] = useState<number>()
  const drag = useRef<{ x: number; sign: number; start: number; width: number; least: number } | null>(
    null,
  )
  useIsomorphicLayoutEffect(() => {
    const cell = ref.current?.parentElement
    if (!cell) return
    const measure = () => setMeasured(Math.round(cell.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(cell)
    return () => observer.disconnect()
  }, [])
  const now = width ?? measured
  if (now === undefined) return <span ref={ref} hidden />
  // A column already narrower than its minimum is not widened by the handle.
  const least = Math.min(minWidth, now)
  const end = () => {
    const done = drag.current
    drag.current = null
    if (done && done.width !== done.start) onResize(done.width, true)
  }
  return (
    <span
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={least}
      // No upper bound: the table grows and scrolls.
      aria-valuemax={Number.MAX_SAFE_INTEGER}
      aria-valuetext={valueText(now)}
      data-scope="table"
      data-part="resizeHandle"
      className="uf-table__resize-handle"
      onPointerDown={(event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        const sign = readDirection(event.currentTarget) === 'ltr' ? 1 : -1
        drag.current = { x: event.clientX, sign, start: now, width: now, least }
      }}
      onPointerMove={(event: PointerEvent<HTMLElement>) => {
        const current = drag.current
        if (!current) return
        const next = Math.max(
          current.least,
          Math.round(current.start + (event.clientX - current.x) * current.sign),
        )
        if (next === current.width) return
        current.width = next
        onResize(next, false)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        const intent = stepIntent(event, 'horizontal', readDirection(event.currentTarget))
        // End has no width to go to.
        if (!intent || ('to' in intent && intent.to === 'max')) return
        event.preventDefault()
        const next = 'step' in intent ? Math.max(least, now + intent.step * STEP) : least
        if (next !== now) onResize(next, true)
      }}
    />
  )
}

function cellValue<T>(row: T, column: TableColumn<T>): unknown {
  const accessor = column.accessor ?? column.id
  return typeof accessor === 'function'
    ? accessor(row)
    : (row as Record<string, unknown>)[accessor]
}

const isText = (value: unknown): value is string | number | bigint =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
const isNode = (value: unknown): boolean =>
  value == null ||
  typeof value === 'boolean' ||
  isText(value) ||
  isValidElement(value) ||
  (Array.isArray(value) && value.every(isNode))
/** Plain text of a value for a `{name}` placeholder, else `fallback`. */
const nameOf = (value: unknown, fallback: string | number) =>
  isText(value) && String(value).trim() ? String(value) : String(fallback)

/**
 * Cell or header content: text and numbers through `Text`, elements as they are; anything else
 * (a date, a boolean, a plain object) is reported as `where` and left out.
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
  if (typeof value !== 'boolean' && isNode(value)) return value as ReactNode
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
    rowNumbers = false,
    stickyHeader = false,
    showDividers = true,
    stickyLastColumn = false,
    resizable = false,
    onColumnResize,
    onRowClick,
    activeRow,
    membrane = false,
    variant = 'plain',
    labels,
    className,
    ...rest
  } = props
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
  const sizes = useMemo(
    () => new Map(columnList.map((column) => [column.id, readSize(column)])),
    [columnList],
  )
  const entries = useMemo(() => readRows(rows, rowKey), [rows, rowKey])
  const baseId = useId()

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

  // Resizing: the widths a resize fixed. The first one fixes every column at its rendered width,
  // so only the resized column changes and the table takes the sum.
  const [widths, setWidths] = useState(noWidths)
  // Turning resizing off returns every column to its own width.
  if (!resizable && widths !== noWidths) setWidths(noWidths)
  const headRow = useRef<HTMLTableRowElement>(null)
  const resize = (column: string, width: number, done: boolean) => {
    const rendered: Record<string, number> = {}
    for (const cell of headRow.current?.querySelectorAll<HTMLElement>('th[data-column]') ?? [])
      rendered[cell.dataset.column!] = Math.round(cell.getBoundingClientRect().width)
    setWidths((fixed) =>
      fixed[column] === width ? fixed : { ...rendered, ...fixed, [column]: width },
    )
    if (done) onColumnResize?.({ column, width })
  }

  const firstColumn = columnList[0]
  /** The width a column keeps: the user's resize, else its `width`; `undefined` sizes it to its content. */
  const widthOf = (column: TableColumn) => widths[column.id] ?? sizes.get(column.id)!.width
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
      data-resized={widths !== noWidths || undefined}
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
          {rowNumbers && (
            <th {...cell('headerCell')} data-row-number="">
              <div className="uf-table__cellSlot">
                {content(text.rowNumber, 'labels.rowNumber', { variant: 'muted' })}
              </div>
            </th>
          )}
          {columnList.map((column, position) => {
            const width = widthOf(column)
            const { minWidth } = sizes.get(column.id)!
            const style: CSSProperties = { width, minWidth: width ?? minWidth }
            // The header is named by its label alone, not by the resize handle inside it.
            const labelId = `${baseId}${position}`
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
                aria-labelledby={labelId}
                style={style}
              >
                <div
                  id={labelId}
                  className="uf-table__cellSlot"
                  data-align={column.align}
                  data-sized={width !== undefined || undefined}
                >
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
                {resizable && (
                  <ResizeHandle
                    label={formatLabel(text.resizeColumn, { name: nameOf(column.header, column.id) })}
                    valueText={(now) => formatLabel(text.columnWidth, { width: now })}
                    width={widths[column.id]}
                    minWidth={minWidth ?? MIN_WIDTH}
                    onResize={(next, done) => resize(column.id, next, done)}
                  />
                )}
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
          const isActive = activeRow != null && key === activeRow
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
                  onRowClick({ row, index, event })
                })
              }
            >
              {selectable && (
                <td {...cell('cell')} data-select="">
                  <div className="uf-table__cellSlot">
                    <Checkbox
                      membrane={false}
                      aria-label={formatLabel(text.selectRow, {
                        name: nameOf(firstColumn && cellValue(row, firstColumn), index + 1),
                      })}
                      checked={selected.has(key)}
                      onCheckedChange={({ checked }) => selectRow(key, checked === true)}
                    />
                  </div>
                </td>
              )}
              {rowNumbers && (
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
                    data-column={column.id}
                    title={
                      column.truncate && isText(shownValue) ? String(shownValue) : undefined
                    }
                  >
                    <div
                      className="uf-table__cellSlot"
                      data-align={column.align}
                      data-truncate={column.truncate || undefined}
                      data-sized={widthOf(column) !== undefined || undefined}
                    >
                      {content(
                        // `render` may return a boolean, as React allows, for nothing.
                        column.render && typeof shownValue === 'boolean' ? null : shownValue,
                        `columns.${column.id} cell`,
                        { align: column.align, truncate: column.truncate },
                      )}
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
