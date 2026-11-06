import type { Migration } from './types'

const sort = 'One `sort={{ column, direction }}` (controlled) or `defaultSort` (uncontrolled); `null` is unsorted'
// The legacy patterns match only code that cannot be the new form, so migrated code is never
// reported. A function whose first parameter is followed by a second was written for positional
// arguments, `(row, index)`, `(columnId, width)` or `render(value, row)`; one parameter, a function
// passed by name and columns passed as a variable are left to the type checker and the reader.
const second = String.raw`\(\s*[A-Za-z_$][\w$]*\s*(?::[^,()<]*)?,`
const fn = String.raw`(?:async\s+)?(?:function\b\s*[\w$]*\s*)?`
const positional = String.raw`^\s*${fn}${second}`
const legacyRender = String.raw`\brender\s*(?::\s*${fn})?${second}`
const noHover = 'No replacement: put pointer handlers on the content `render` returns'

export default [
  { kind: 'rename-prop', component: 'Table', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Table', from: 'activeRowId', to: 'activeRow', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Table', from: 'rowStyle', to: 'variant', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Table', from: 'showRowNumbers', to: 'rowNumbers', codemod: 'auto' },
  { kind: 'remove-prop', component: 'Table', prop: 'sortColumn', use: sort, codemod: 'manual' },
  { kind: 'remove-prop', component: 'Table', prop: 'sortDirection', use: sort, codemod: 'manual' },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'onSortChange',
    before: '`{ column, direction }`',
    after: '`{ sort }`, with `sort` as `{ column, direction }` or `null`',
    codemod: 'manual',
    // The one parameter destructures `column` or `direction` of the old details.
    legacy: String.raw`^\s*${fn}\(\s*\{\s*(?:column|direction)\b`,
  },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'onRowClick',
    before: '`(row, index)`',
    after: '`({ row, index, event })`; `index` is the position shown',
    codemod: 'manual',
    legacy: positional,
  },
  { kind: 'remove-prop', component: 'Table', prop: 'onRowMouseEnter', use: noHover, codemod: 'manual' },
  { kind: 'remove-prop', component: 'Table', prop: 'onRowMouseLeave', use: noHover, codemod: 'manual' },
  {
    kind: 'remove-prop',
    component: 'Table',
    prop: 'columns[].maxWidth',
    use: 'Browsers ignore a maximum width on table cells; give the column a `width`, which its content can no longer widen',
    codemod: 'manual',
  },
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
    // A key in code or in JSON (`"align": "left"`).
    legacy: String.raw`\balign['"]?\s*:\s*['"](?:left|right)['"]`,
  },
  {
    kind: 'retype-prop',
    component: 'Table',
    prop: 'columns',
    before: '`render(value, row, { rowIndex, column })`',
    after:
      '`render({ value, row, rowIndex, column })`. A render with two or more parameters is reported where the columns are written in the JSX; one written for the value alone, such as `render: (value) => String(value)`, still compiles and shows `[object Object]`, so search for `render:` and check each one by hand, in columns passed as a variable too',
    codemod: 'manual',
    legacy: legacyRender,
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
    before: 'Fixed layout: every cell stayed on one line with an ellipsis, `minWidth` had no effect, and resizing a column resized its neighbour',
    after:
      'A column without `width` sizes to its content and its text wraps; a column with `width` keeps it and wraps its content inside. Add `truncate` for one line with an ellipsis. `minWidth` holds. The first resize fixes every column at its width, so a resize changes only its own column and the table grows or shrinks. Content that cannot wrap, such as an email or a URL, no longer gets squeezed: in a column without `width` or `truncate` it makes the table as wide as it needs, wider than a narrow screen and the page with it. Give such columns `truncate` or a `width`, or put the table in a container with `overflow-x: auto`',
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
    before: 'A row without a key was keyed by its position on screen (`"0"`), a numeric key became text, and repeated keys rendered twice',
    after:
      'A row without a text key is keyed by its position in `rows` (`"#0"`), which sorting does not change; a key that is not text is reported (pass `rowKey={(row) => String(row.id)}`), and a repeated key drops the row with a report',
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
    after:
      'Row checkboxes are named by `labels.selectRow` (`Select {name}`, `{name}` being the row value in the first column), select-all shows a mixed state, and `aria-selected` is gone (the checkbox carries the state)',
  },
  {
    kind: 'behavior',
    component: 'Table',
    before: 'A boolean cell value showed as `true` or `false`, and a date as `String(date)`',
    after: 'Only text and numbers show as text; a boolean or a date needs `render` and is otherwise left out with a report',
  },
] satisfies Migration[]
