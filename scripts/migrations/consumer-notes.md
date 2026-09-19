# Consumer notes

What `pnpm migrate` cannot find, for the people who migrate the products (W4-05).

The codemod reads one JSX usage at a time: it renames props and reports a `legacy`
pattern only when it can see the value **written at the usage**. Two things stay
invisible to it, and both are in the products today:

- **Columns passed as a variable.** `columns={userColumns}` gives the codemod the
  text `userColumns`, so nothing inside that array is ever matched.
- **A one-argument `render`.** The legacy patterns match a function with a *second*
  parameter, because a one-parameter function is also the new shape. `render: (v) => …`
  keeps compiling and silently receives `{ value, row, rowIndex, column }`.
- **Prop names written as data.** The app's live preview wires callbacks to props
  through a table of plain strings (`previewEventBridge.ts`), which is neither JSX
  nor typed against Face UI, so neither the codemod nor `tsc` can see that a name
  in it no longer exists. R34 and R35.

Every row below was read in the consumer source at the line given. Nothing here
was inferred from a grep alone. The products still build against the old
snapshot (`packages/face-ui-react/Table/Table.tsx:539` in site and app calls
`col.render(rawVal, row, …)`), so these call sites work today and break on the
update — none of them fails to compile.

## How to read a row

    <id> | <repo> | <path>:<line> | <kind> | <action>

`kind` is one of:

| kind | meaning |
|---|---|
| `render-arity` | a `render` written for the old positional arguments; the codemod cannot see it |
| `handler` | a callback, or the wiring that feeds one, written for the old payload or for a prop that no longer exists |
| `truncate` | the W3 wrap default changes this table; the cells need `truncate` to stay on one line |
| `min-width` | `minWidth` now holds, so the table has a minimum width it did not have |
| `scroll` | the table has no scrolling container and now needs one |
| `ok` | read and verified: nothing to change here |
| `note` | true, but not caused by this migration |

## Rows

| id | repo | path:line | kind | action |
|---|---|---|---|---|
| R01 | userface-site | `packages/userface-site-ui/Profile/AdminUsersSection.tsx:105` | render-arity | `render: (v) => String(v \|\| '—')` → `({ value }) => String(value \|\| '—')`. After the update the cell shows `[object Object]`. |
| R02 | userface-site | `packages/userface-site-ui/Profile/AdminUsersSection.tsx:106` | render-arity | `render: (v) => (v ? '✓' : '—')` → `({ value }) => (value ? '✓' : '—')`. After the update every row shows `✓`: the details object is always truthy. |
| R03 | userface-site | `packages/userface-site-ui/Profile/AdminUsersSection.tsx:107` | render-arity | `render: (v) => (v ? new Date(String(v)).toLocaleDateString() : '—')` → `({ value }) => …`. After the update every row shows `Invalid Date`. |
| R04 | userface-site | `packages/userface-site-ui/Profile/AdminUsersSection.tsx:114` | render-arity | `render: (_v, u) => {…}` → `({ row }) => {…}` (`u` becomes `row`). Two parameters, but inside the `userColumns` variable (`:102`), so the codemod never sees it. |
| R05 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:78` | render-arity | `render: (_value, font) => …` → `({ row }) => …`, in the `fontColumns` variable (`:74`). |
| R06 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:85` | render-arity | same, `font.slug`. |
| R07 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:90` | render-arity | same, `font.authorUsername`. |
| R08 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:95` | render-arity | same, `font.price_rub`. |
| R09 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:100` | render-arity | same, the actions cell (`font.slug`, `font.id`). |
| R10 | userface-site | `packages/userface-site-ui/ai-chat/MarkdownBody/MarkdownBody.tsx:145` | render-arity | `render: (value: unknown) => …String(value ?? '')` → `({ value }) => …`. After the update **every cell of every markdown table** shows `[object Object]`. The `accessor` above it (`:144`) is already the new shape. |
| R11 | userface-app | `packages/userface-app-ui/Chat/runtime/MarkdownBody/MarkdownBody.tsx:158` | render-arity | the same code in the app's chat renderer, same symptom. |
| R12 | userface-site | `apps/web/pages/docs/fonts-api.tsx:87` | render-arity | `render: (value) => <Text … text={String(value ?? '')} />` → `({ value }) => …`, in the `fontsApiParameterColumns` variable (`:81`). |
| R13 | userface-site | `packages/userface-site-ui/Profile/AdminLogsSection.tsx:140` | truncate | All 13 columns (`:140`–`:152`) have a `width` and none has `truncate`. Under the old fixed layout every cell was one line with an ellipsis; now each wraps inside its width, so `ua`, `items`, `missing` and `eula` turn one row into many lines. Add `truncate: true` to all 13. |
| R14 | userface-site | `packages/userface-site-ui/Profile/AdminLogsSection.module.css:39` | scroll | `.tableWrap { width: 100% }` — the 13 widths add up to ≈2 320 px (`--admin-logs-col-*`, `:2`–`:12`). The old table was `table-layout: fixed; max-width: 100%`, so they were only proportions and nothing overflowed; now they hold, and with nothing to scroll sideways the page does. `stickyLastColumn` (`AdminLogsSection.tsx:137`) also does nothing without a scrolling container. Add `overflow-x: auto` to `.tableWrap`, or wrap the table in `<Scroll orientation="horizontal">`. |
| R15 | userface-site | `packages/userface-site-ui/Profile/AdminUsersSection.tsx:206` | scroll | The table is a direct child of `.container` (`AdminUsersSection.module.css:1`), which has no overflow. Its widths add up to 1 030 px (180+260+140+110+120+220), and both `stickyHeader` (`:209`) and `stickyLastColumn` (`:210`) need a scrolling container. Wrap it. |
| R16 | userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.module.css:16` | scroll | `.table { overflow: hidden }` around the table (`AdminFontsSection.tsx:111`). No column has a width, so the table's minimum width is now set by its content — the actions cell holds two buttons — and anything past the container is clipped, with no way to scroll to it. Use `overflow-x: auto` (keep the radius on the same box). |
| R17 | userface-site | `apps/web/pages/docs/index.tsx:527` | min-width | `minWidth: 300` on `checks` (`:530`) now holds. |
| R18 | userface-site | `apps/web/pages/docs/index.tsx:667` | min-width | `mcpToolColumns` (`:557`–`:561`): 160+240+180 = 580 px minimum. |
| R19 | userface-site | `apps/web/pages/docs/index.tsx:687` | min-width | `faceSchemaColumns` (`:572`–`:577`): 140+120+200 = 460 px plus the `req` column. |
| R20 | userface-site | `apps/web/pages/docs/index.tsx:726` | min-width | inline columns (`:728`–`:730`): 80+200+200 = 480 px minimum. |
| R21 | userface-site | `apps/web/pages/docs/index.tsx:789` | min-width | `cliCommandColumns` (`:760`–`:764`): 140+240 = 380 px plus the `default` column. |
| R22 | userface-site | `apps/web/pages/docs/index.tsx:820` | min-width | `cliCommandColumns`, as R21. |
| R23 | userface-site | `apps/web/pages/docs/index.tsx:864` | min-width | `cliCommandColumns`, as R21. |
| R24 | userface-site | `apps/web/pages/docs/index.tsx:921` | min-width | `cliCommandColumns`, as R21. |
| R25 | userface-site | `apps/web/pages/docs/index.tsx:950` | min-width | `cliCommandColumns`, as R21. |
| R26 | userface-site | `apps/web/pages/docs/Docs.module.css:202` | scroll | The nine tables of R17–R25 sit directly in `.section`, which has no overflow, inside `.main { min-width: 0 }` (`:189`). Every one of them is now wider than a 360 px screen, so the docs page scrolls sideways as a whole. One `.tableWrap { overflow-x: auto }` in this file, used at the nine call sites, covers R17–R25. |
| R27 | userface-site | `apps/web/pages/docs/FontsApi.module.css:153` | scroll | Below 48 rem this makes the `<table>` itself `display: block; overflow-x: auto`. The rows are then laid out by an anonymous table inside that block box, so the library's `inline-size: 100%` and `table-layout: auto` land on the block, not on the table: the table inside sizes to its content and a table narrower than the screen no longer fills it. Replace with a wrapper `<div>` around `<Table>` (`fonts-api.tsx:276`) at every width, and check the page at 360 px with the widths of `fontsApiParameterColumns` (`fonts-api.tsx:81`). |
| R28 | userface-site | `packages/userface-site-ui/ai-chat/MarkdownBody/MarkdownBody.module.css:189` | ok | `.tableWrap { overflow-x: auto }` is already there; markdown tables have no widths, so their cells simply wrap now. Nothing to change beyond R10. |
| R29 | userface-app | `packages/userface-app-ui/Chat/runtime/MarkdownBody/MarkdownBody.module.css:232` | ok | Same wrapper, same conclusion. Nothing to change beyond R11. |
| R30 | userface-site | `packages/userface-site-ui/Profile/AdminAnalyticsSection.module.css:437` | ok | `.tableContainer { overflow-x: auto }` is already there, and the table (`AdminAnalyticsSection.tsx:1527`) has no widths. |
| R31 | userface-site | `packages/userface-site-ui/Profile/DashboardSection.tsx:56` | ok | The three tables here (`:56`, `:72`, `:86`) have no `width` and no `minWidth`, and two to four short columns; the first two already pass `truncate` on the metric column, the third on all four. No wrapper needed. |
| R32 | userface-app | `packages/engine/src/face-ui/patterns/crud-table.pattern.json` | note | Nine Table column lists across the `crud-table` (3), `list-detail` (3), `dashboard` (2) and `settings` (1) patterns write columns as `{ "key": …, "header": … }`. `TableColumn` reads `id`, in the old snapshot as well as the new one, so those cells have always rendered empty. Pre-existing, not part of this migration — for W4-06. |
| R33 | defrictor | — | ok | No Face UI Table outside `_archive/**` (not in `tsconfig.json` `include`) and `src/vendor/**` (excluded). Nothing to migrate. |
| R34 | userface-app | `packages/userface-app-ui/Renderer/previewEventBridge.ts:45` | handler | The live preview turns a missing callback into a state patch. `MULTI_PATCH_BRIDGE_RULES` (`:40`–`:51`) maps Table's `onSortChange` onto `sortColumn` (`valuePath: 'column'`, `:47`) and `sortDirection` (`valuePath: 'direction'`, `:48`). Both props are gone and the callback now carries `{ sort }` (`Table.tsx`: `onSortChange?: (details: { sort: TableSort \| null }) => void`), so after the update the guard at `:113` — `rule.patches.some(patch => hasOwnProperty(props, patch.targetProp))` — never matches a migrated Table and **sorting stops updating the preview, with no error**; on a document still carrying the old props the two `valuePath`s read `undefined`. Replace the multi-patch entry with one ordinary rule in `PREVIEW_BRIDGE_RULES` (`:24`–`:38`): `{ callbackProp: 'onSortChange', stateProp: 'sort', defaultProp: 'defaultSort', valuePath: 'sort' }` — the runtime resolver reads `details.sort` by that path (`packages/playground/src/node/dev-server/vitePreviewRuntimeScripts.ts:610`). `MULTI_PATCH_BRIDGE_RULES` then holds nothing: delete it with its loop (`:110`–`:117`). Also update `previewEventBridge.test.ts:58`–`:76`, which asserts the old two-patch payload against props it builds itself, so it passes either way and is not a safety net. The sibling rule at `:37` (`onSelectedRowsChange` → `selectedRows`) still matches the new API and stays. |
| R35 | userface-app | `packages/userface-app-ui/Renderer/previewEventBridge.ts:29` | handler | Beyond Table, the same table of strings is stale for four more components — listed here because nothing else in the toolchain will find them. `:29` `onExpandedChange`/`expandedIds`/`expandedIds`: Accordion and Tree now take `expanded`/`defaultExpanded` and emit `{ expanded }` (`Accordion.tsx:59`, `:63`, `:137`; `Tree.tsx:78`, `:82`, `:152`) → `stateProp: 'expanded', defaultProp: 'defaultExpanded', valuePath: 'expanded'`. `:35` `onCropChange`/`cropRange`, `valuePath: ''`: Slider renamed it `onCropRangeChange` and it emits `{ cropRange }` (`Slider.tsx:131`, `:267`) → `callbackProp: 'onCropRangeChange', valuePath: 'cropRange'`. `:30` (`onSelectedChange`/`selectedId`) and `:31` (`onActiveChange`/`activeId`, `valuePath: 'id'`): Panel, Tree, Navigation and Toc are all on `value`/`defaultValue`/`onValueChange` with `{ value }` (`Panel.tsx:72`, `Tree.tsx`, `Navigation.tsx:88`, `Toc.tsx:47`), which the rule at `:26` already covers — the two entries can no longer match any Face UI prop, so delete them. Command lost its bridge entirely: `value` → `search`, `onValueChange` → `onSearchChange` with `{ search }` (`Command.tsx:83`, `:87`, `:165`) → add `{ callbackProp: 'onSearchChange', stateProp: 'search', defaultProp: 'defaultSearch', valuePath: 'search' }`. Every other rule (`checked`, `value`, `open`, `collapsed`, `page`, `step`, `index`, `files`, `selectedRows`) was checked name by name against `migrations.json` and is unchanged. |

35 rows: 12 `render-arity`, 2 `handler`, 1 `truncate`, 5 `scroll`, 9 `min-width`,
5 `ok`, 1 `note`.

## What the codemod does report

Listed so nobody handles the same call site twice. From `pnpm migrate <repo>` at
this commit:

| repo | path:line | row |
|---|---|---|
| userface-site | `apps/web/pages/docs/fonts-api.tsx:276` | `Table ariaLabel → aria-label` (auto) |
| userface-site | `apps/web/pages/docs/index.tsx` ×9 | `Table showRowNumbers → rowNumbers` (auto) |
| userface-site | `packages/userface-site-ui/Profile/AdminFontsSection.tsx:112` | `ariaLabel`, `showRowNumbers` (auto) |
| userface-site | `packages/userface-site-ui/Profile/AdminLogsSection.tsx:134` | `ariaLabel → aria-label` (auto) |
| userface-site | `packages/userface-site-ui/Profile/AdminAnalyticsSection.tsx:1527` | `showRowNumbers` (auto) and `columns` type (manual): the four `(_value, format)` renders at `:1537`–`:1552` are written in the JSX, so they are found |
| userface-site | `packages/userface-site-ui/Profile/DashboardSection.tsx:56, :72, :86` | `columns` type (manual): `align: 'left'` ×8 → `'start'` |
| userface-site | `packages/userface-site-ui/ai-chat/MarkdownBody/MarkdownBody.tsx:155` | `ariaLabel → aria-label` (auto) |
| userface-app | `packages/userface-app-ui/Chat/runtime/MarkdownBody/MarkdownBody.tsx:168` | `ariaLabel → aria-label` (auto) |

`AdminUsersSection.tsx` produces **no findings at all**: its columns are a
variable, so R01–R04 are entirely on the reader.

## Should Table own a horizontal scroll container?

**No, not as a default.** Recommendation: keep the container with the consumer,
and compose `<Scroll orientation="horizontal">` (which already names the region
and makes it a tab stop) or an `overflow-x: auto` box of their own. Only the
consumer knows whether the page or a box around the table should scroll.

What the three libraries do, read from their published sources:

| library | what ships | source |
|---|---|---|
| Radix Themes 3.2.1 | `Table.Root` renders `<div class="rt-TableRoot"><ScrollArea><table>` — the scroll container is always there | `dist/cjs/components/table.js`; `.rt-TableRootTable { width: 100% }` in `styles.css` |
| MUI 6.4.0 | `<Table>` is a bare `<table>` (`display: table; width: 100%`). `<TableContainer>` (`width: 100%; overflowX: auto`) is a separate component the docs tell you to add | `Table/Table.js:23`, `TableContainer/TableContainer.js:20` |
| Mantine 7.15.2 | `<Table>` is a bare table. `Table.ScrollContainer` is an opt-in component with `minWidth` and `type: 'scrollarea' \| 'native'` | `esm/components/Table/TableScrollContainer.mjs` |

One of the three defaults to it; two ship an explicit container instead. What
decides it here is this codebase:

- `stickyHeader` and `stickyLastColumn` are defined against "the nearest
  scrolling container" (`Table.tsx:148`, `:152`). A container of our own would
  become that ancestor, and a header that used to stick to the page would stop.
  Measured in Chromium on the `table` fixture, page scrolled 600 px, header cell
  top in viewport coordinates: **0 px without a wrapper, −563 px with one** —
  `stickyHeader` silently stops working. `overflow-x: auto` is enough to cause
  this: with the other axis `visible`, it computes to `auto` too, so the wrapper
  is a scroll container in both directions.
- Three of the product tables already provide the container themselves (R28,
  R29, R30). A library default would put a second scroller inside theirs, and
  the sticky column would anchor to the inner one.
- W3 already changed the layout default once. Adding a second silent change of
  what the same JSX renders, in the wave that is supposed to land the first one,
  is the `silent-default-flips` finding again.

If it is ever wanted, the shape to copy is Mantine's: an explicit component or
prop, never a default — and it must then own `stickyHeader` too.
