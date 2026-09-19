import type { Migration } from './types'

const sort = 'One `sort={{ column, direction }}` (controlled) or `defaultSort` (uncontrolled); `null` is unsorted'
// Handlers written for the positional arguments `(row, index)` or `(columnId, width)`.
const positional = String.raw`^\s*(\(\s*[A-Za-z_$][\w$]*\s*[,)]|[A-Za-z_$][\w$]*\s*=>)`
const rowEvent = {
  before: '`(row, index)`',
  after: '`({ row, index, event })`; `index` is the position shown',
  codemod: 'manual',
  legacy: positional,
} as const

export default [
  { kind: 'rename-prop', component: 'Table', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Table', from: 'activeRowId', to: 'activeRow', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Table', from: 'rowStyle', to: 'variant', codemod: 'auto' },
  { kind: 'remove-prop', component: 'Table', prop: 'sortColumn', use: sort, codemod: 'manual' },
  { kind: 'remove-prop', component: 'Table', prop: 'sortDirection', use: sort, codemod: 'manual' },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'onSortChange',
    before: '`{ column, direction }`',
    after: '`{ sort }`, with `sort` as `{ column, direction }` or `null`',
    codemod: 'manual',
    legacy: String.raw`\{\s*(column|direction)\b`,
  },
  { kind: 'retype-prop', component: 'Table', prop: 'onRowClick', ...rowEvent },
  { kind: 'retype-prop', component: 'Table', prop: 'onRowMouseEnter', ...rowEvent },
  { kind: 'retype-prop', component: 'Table', prop: 'onRowMouseLeave', ...rowEvent },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'onColumnResize',
    before: '`(columnId, width)` on every pointer move, for the column and its neighbour',
    after: '`({ column, width })` once per finished resize of that column',
    codemod: 'manual',
    legacy: positional,
  },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'columns',
    before: '`align: "left" | "center" | "right"`',
    after: '`align: "start" | "center" | "end"`, following text direction',
    codemod: 'manual',
    legacy: String.raw`align:\s*['"](left|right)['"]`,
  },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'columns',
    before: '`render(value, row, { rowIndex, column })`',
    after: '`render({ value, row, rowIndex, column })`; a one-argument `render: (value) =>` still compiles, so check every column',
    codemod: 'manual',
    legacy: String.raw`render:\s*(\(\s*[A-Za-z_$][\w$]*\s*[,)]|[A-Za-z_$][\w$]*\s*=>)`,
  },
  { kind: 'export', from: 'Table/Table#TableAlign', to: "`TableColumn['align']`", codemod: 'manual' },
  {
    kind: 'behavior',
    component: 'Table',
    before: '`membrane` styled rows as tiles',
    after: '`variant="tile"` styles rows; `membrane` adds outer spacing only',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'The header stuck to the top of the scrolling container by default',
    after: '`stickyHeader` is off by default; pass it where the table scrolls inside its own container',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'Fixed layout: every cell stayed on one line with an ellipsis, `minWidth` and `maxWidth` had no effect, and resizing a column resized its neighbour',
    after: 'Columns size to their content: text wraps unless the column has `truncate`, `minWidth` and `maxWidth` hold, and a resize changes only its own column',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'Without `sortColumn`/`selectedRows` sorting and selection did nothing, while their callbacks still fired',
    after: 'Both work uncontrolled; a third click on a sorted header returns to the order of `rows`',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'A row without a key was keyed by its position on screen (`"0"`), and repeated keys rendered twice',
    after: 'It is keyed by its position in `rows` (`"#0"`), which sorting does not change; numeric keys become text and a repeated key drops the row with a report',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: '`onRowClick` also fired for clicks on the row checkbox or a control in a cell, and only a mouse could trigger it',
    after: 'Clicks on controls and on the selection cell do not activate the row; rows become one tab stop, arrows move between them and Enter activates',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'Row checkboxes were named `Select row <key>`, the select-all box never showed a partial selection, and rows carried `aria-selected`',
    after: 'Row checkboxes are named by `labels.selectRow` plus the row first cell, select-all shows a mixed state, and `aria-selected` is gone (the checkbox carries the state)',
  },
] satisfies Migration[]
