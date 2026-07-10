# Audit 06 — Navigation, Layout & Pattern Components

Scope: `face-ui/` React library. Components: Breadcrumb, Pagination, Navigation, Panel (aliases Sidebar), Tree, Toc, Bar, Scroll, Carousel, Table, Upload.
Method: read `.tsx` + `.json` in full; grep `uf-*` classes + `data-*` in `assets/styles/components.css`; cross-check `component-registry.json`. No code changed.

## Cross-cutting findings (read first)

### Item-shape / data-model consistency across nav components
Nav components do **NOT** share a single item contract. Divergences:

| Component | Key field | Children field | icon | disabled | Notes |
|---|---|---|---|---|---|
| BreadcrumbItem | *(none — uses array index as React key)* | — | no | no | `{label, href?, onClick?}` + internal `__overflow` marker item |
| NavigationItem | `id` | `items` | **no** | yes | `{id,label,href?,onClick?,items?,disabled?}` |
| PanelItem | `id` | `items` | **yes** | yes | `{id,label,icon?,href?,onClick?,items?,disabled?}` |
| TreeNode | `id` | **`children`** | yes | yes | richest: `kind`, `icon`, `rightText`, `actions`, `content`, `render` |
| TocItem | `id` | — (flat + `level`) | no | yes | `{id,label,level?,disabled?}` (defined in `toc.machine.ts`) |
| Menu (used by Breadcrumb/Pagination overflow) | **`value`** | — | — | yes | `{value,label}` |
| TableColumn | `id` | — | — | — | `header`/`title` dual + `accessor` |

Key inconsistencies:
- **Children key drift**: Navigation & Panel use `items`; Tree uses `children`. A caller cannot reuse one tree of data across all three.
- **Key field drift**: everything uses `id` except Menu (`value`) and Breadcrumb (no id — indexed keys, fragile for reordering/collapse).
- **Icon support drift**: Panel and Tree items carry `icon`; NavigationItem does **not** (a primary top-level nav can't render item icons through data), yet the compact sheet fallback trigger hard-codes an icon.
- Panel and Navigation item shapes are ~identical (Panel = Navigation + `icon`) but are separate types with no shared base — prime candidate for a shared `NavItemBase`.

### Governance snapshot (from component-registry.json)
| Component | category | status | a11yReviewed | mobileReviewed | aliases / replacedBy | responsiveSurface |
|---|---|---|---|---|---|---|
| Breadcrumb | navigation | stable | true | true | — | — |
| Pagination | navigation | stable | true | true | — | — |
| Navigation | navigation | **beta** | true | true | — | auto->sheet |
| Panel | navigation | stable | true | true | aliases: Sidebar | auto->drawer |
| Tree | navigation | **beta** | true | true | — | — |
| Toc | navigation | **beta** | true | true | — | — |
| Bar | layout | stable | true | true | — | — |
| Scroll | layout | stable | true | true | — | — |
| Carousel | pattern | **beta** | true | true | — | — |
| Table | pattern | **beta** | true | **false** | — | — |
| Upload | pattern | **beta** | true | true | — | — |

### Widespread `.json` prop-type drift (systemic)
`ReactNode`/union props are declared as primitive `"string"` in the contracts, and `children` slots as `"string"`:
- `trigger` + `surfaceTitle`: declared `string`, actually `ReactNode` — **Navigation** and **Panel**.
- `children`: declared `string` — **Bar** (actually ReactNode array/descriptors), **Scroll** (ReactNode), **Carousel** (declared `array`, actually ReactNode|ReactNode[]).
- `width`/`collapsedWidth`: declared `number`, actually `number|string` — **Panel**.
- `height`: declared `number`, actually `number|string` — **Scroll**.
Contract generators using these will mistype the surfaces.

---

## Breadcrumb

**Governance**: navigation / stable / a11y ✓ / mobile ✓. No alias, no responsiveSurface.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | BreadcrumbItem[] | — | no | trail root→current |
| separator | ReactNode | `'/'` | no | between items; `'/'` swaps to `<Icon name="slash">` |
| membrane | boolean | true | no | wrap links in `.uf-membrane` spacing |
| allowNavigation | boolean | false | no | allow native anchor navigation (default off for sandbox) |
| className | string | — | no | root class |
| collapseAfter | number | 4 | no | collapse middle crumbs when `>collapseAfter` (only if `>=3`) |

**Axes**: none (no size/variant/orientation).
**States / a11y**: `<nav aria-label="Breadcrumb">`; current item `aria-current="page"`; separators `aria-hidden`; overflow trigger `aria-label="Show path"`. No `data-*` state attributes.
**Anatomy**: createAnatomy parts `root, list, item, link, separator, current`. Sub-components: none exported; overflow uses **Menu** + **Button**.
**Tokens**: component `--uf-breadcrumb-separator-w/-h`, `--uf-icon-only-size`; fallbacks membrane/control/radius/color. 19 CSS matches.

**Contract drift**:
- `.json` composition lists parts `root,list,item,link,separator` but **omits `current`** which the anatomy and tsx use.
- `separator` typed `string` in json, but tsx accepts and renders `ReactNode`.
- `keyboard: {}` — no keyboard contract (breadcrumb is anchor-based, acceptable).

**Legacy/cleanup**:
- **Duplicated overflow branch**: the entire `<Menu><Button/></Menu>` block is copy-pasted for `membrane` true/false, differing only by `membrane` on the Button — should be one branch with a variable.
- Items have **no stable key** — `key={index}`; combined with collapse logic (which injects a synthetic `More` item) reordering is fragile.
- `collapseAfter >= 3` magic guard; overflow slice math `slice(1, len-(collapseAfter-2))` is dense and undocumented.
- Overflow `window.location.assign` only fires when `allowNavigation` — otherwise overflow item hrefs silently do nothing.

## Pagination

**Governance**: navigation / stable / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| page | number | — | no | controlled current page (1-idx) |
| defaultPage | number | 1 | no | uncontrolled initial |
| total | number | 0 | no | total items |
| pageSize | number | 10 | no | items/page |
| siblingCount | number | 1 | no | siblings around current *(passed to machine; see drift)* |
| disabled | boolean | false | no | disable all |
| onPageChange | fn | — | no | `{page}` |
| className | string | — | no | — |
| membrane | boolean | true | no | membrane wrapper per button |
| surfaceTitle | string | 'Choose page' | no | title for compact page-picker sheet |

**Axes**: none.
**States / a11y**: `<nav aria-label="Pagination">` (via machine root props); current-page `Text` has `aria-current="page"`; prev/next native buttons; picker trigger `aria-label="Choose page"`.
**Anatomy**: no createAnatomy — uses `paginationMachine`/`connectPagination`. Sub-components: **Button** ×2, **Text**, **Menu**.
**Tokens**: `--uf-icon-only-size`; fallbacks control/color/primary. 16 CSS matches.

**Contract drift (significant)**:
- **Stale docstring**: header comment says "Renders prev/next buttons and **numbered page buttons with ellipsis**. Range items with value -1 are rendered as ellipsis spans." The implementation renders **prev + single current-page Text + a Menu picker** — no numbered buttons, no ellipsis, no `-1` range items. Docstring describes a previous/other implementation.
- `siblingCount` prop is declared/forwarded to the machine but the render has no page-number list, so it has **no visible effect**.
- `.json` composition parts (`prevButton,nextButton,currentPage,pagePicker,pagePickerMenuItems`) are descriptive slot names, not anatomy `data-part`s in the DOM.
- `.json` keyboard declares ArrowLeft/ArrowRight → prev/next, but tsx has **no keyboard handler**; depends on machine (unverified here).

**Legacy/cleanup**: NaN-protection block (`Number(x)||default`) flagged in-code as "face.json may deliver wrong types." `defaultPage:6` with `total:120` in the Default state.

## Navigation

**Governance**: navigation / **beta** / a11y ✓ / mobile ✓ / responsiveSurface auto->sheet.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | NavigationItem[] | — | no | items (nested dropdowns via `items`) |
| activeId | string | — | no | controlled active |
| defaultActiveId | string\|null | null | no | uncontrolled active |
| onActiveChange | fn | — | no | `{id}` |
| orientation | enum `horizontal\|vertical` | horizontal | no | bar direction |
| className | string | — | no | — |
| surface | enum `auto\|inline\|sheet` | auto | no | compact surface behavior |
| surfaceBreakpoint | number | DEFAULT_OVERLAY_SURFACE_BREAKPOINT | no | auto→sheet breakpoint |
| open / defaultOpen / onOpenChange | boolean/boolean/fn | —/false/— | no | compact sheet state |
| trigger | ReactNode | icon Button | no | compact trigger |
| surfaceTitle | ReactNode | 'Navigation' | no | sheet header title |

**Axes**: orientation (horizontal/vertical); surface (auto/inline/sheet).
**States / a11y**: root/list/item/trigger/content props from `connectNavigation`; active variant via Button `variant`; roving focus effect refocuses `[role="menuitem"][data-value]`. `.json` declares full arrow-key/Home/End keyboard map.
**Anatomy**: machine-based. Sub-component: internal `DropdownItemRenderer`; uses **Button**, **Card** (floating dropdown / dialog sheet), **Text**, **ResponsiveSheetHeader**.
**Tokens**: `--uf-navigation-content-min-width`, `--uf-navigation-sheet-viewport-gap`, `--uf-navigation-nested-inset`; overlay/z fallbacks. 21 CSS matches.

**Contract drift**:
- `trigger` and `surfaceTitle` typed `string` in json, actually `ReactNode`.
- `surfaceBreakpoint` has no default in json; tsx defaults to shared constant.

**Legacy/cleanup (notable)**:
- **`orientation="vertical"` has no CSS.** There is no `.uf-navigation[data-orientation="vertical"]` rule in components.css, yet the prop exists, is threaded to the machine (keyboard), AND ships as a documented `.json` "Vertical" state. Vertical is functionally unstyled → visual gap for a beta component.
- NavigationItem lacks `icon` (see cross-cutting) while the sheet fallback trigger hard-codes `icon="layout-sidebar-left"`.
- Manual `ref` merge callback (repeated pattern with Tree/Panel) instead of a shared util.
- Dropdown link vs button branches duplicate onClick/active logic.

## Panel (alias: Sidebar)

**Governance**: navigation / stable / a11y ✓ / mobile ✓ / aliases: Sidebar / responsiveSurface auto->drawer.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | PanelItem[] | — | no | items (nested groups via `items`) |
| collapsed / defaultCollapsed / onCollapsedChange | boolean/boolean/fn | —/false/— | no | collapse state |
| selectedId / defaultSelectedId / onSelectedChange | string/string/fn | — | no | selection |
| width | number\|string | 260 | no | expanded width |
| collapsedWidth | number\|string | 60 | no | collapsed width |
| className | string | — | no | — |
| previewPreset | enum `workspace` | — | no | **showcase-only** built-in demo layout |
| surface | enum `auto\|inline\|sheet` | auto | no | compact behavior |
| surfaceBreakpoint | number | shared const | no | breakpoint |
| open/defaultOpen/onOpenChange | boolean/boolean/fn | —/false/— | no | drawer state |
| trigger | ReactNode | icon Button | no | drawer trigger |
| surfaceTitle | ReactNode | 'Panel' | no | drawer header |

**Axes**: surface (auto/inline/sheet); collapsed (bool); previewPreset (workspace).
**States / a11y**: `<nav>` root via `getRootProps`; `data-selected` on preview items; group buttons carry `data-state=open/closed` (read for selector). Toggle button `aria-label` toggles Expand/Collapse. Root aria role `complementary` per json. `keyboard: {}` in json (no documented keys despite groups being expandable).
**Anatomy**: machine `sidebarMachine`/`connectSidebar`; DOM uses **`data-scope="sidebar"`** and **`.uf-sidebar*`** classes (NOT `uf-panel`). Sub-components: internal `PanelItemRenderer`; uses **Bar, Button, Card, Icon, Text, Tree**.
**Tokens**: rich sidebar set (`--uf-sidebar-bg/-fg/-muted/-hover-bg/-active-bg/-row-radius/-section-gap`, `--uf-sidebar-preview-*`, `--face-runtime-sidebar-sheet-w`, `--uf-sidebar-sheet-w-default`, `--uf-resizable-handle-size`). **104 `uf-sidebar` CSS matches; 0 `uf-panel` matches.**

**Contract drift**:
- Whole component renders under the **`uf-sidebar` / `data-scope="sidebar"`** namespace — the name "Panel" exists only at the API layer; all styling/tokens are "sidebar". Naming split is a latent trap.
- `width`/`collapsedWidth` typed `number` in json, actually `number|string`.
- `trigger`/`surfaceTitle` typed `string`, actually `ReactNode`.
- All 3 `.json` states use `previewPreset:"workspace"` with `items:[]` — the contract only exercises the showcase preset, never the real `items` rendering path.
- json tokenMapping references `--uf-resizable-handle-size` / "resizable machine" but Panel.tsx exposes **no resize prop or handle** — stale/aspirational.

**Legacy/cleanup**:
- **`previewPreset="workspace"` is production dead weight**: ~120 lines of hard-coded demo sections/tree (`renderWorkspacePreview`) live in the shipped component purely for the gallery. Should move to fixtures/story.
- `Sidebar = Panel` alias + `SidebarProps`/`SidebarItem` are exported from Panel.tsx but **`index.ts` does not re-export `Sidebar`** — registry says `aliases:["Sidebar"]` but consumers importing from the package root can't get `Sidebar`. Alias governance gap.
- Heavy prop-destructuring shims stripping `data-scope`/`data-part`/`onClick` off machine props (repeated 3×) — brittle.
- `useControllableMachineProp(selectedId, defaultSelectedId ?? null)` selection is never marked controlled/uncontrolled explicitly (unlike Tree which guards it).

## Tree

**Governance**: navigation / **beta** / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | TreeNode[] | built-in demo tree | no | recursive nodes (via `children`) |
| expandedIds / defaultExpandedIds | string[] | — / [] | no | expansion |
| selectedId / defaultSelectedId | string | — | no | selection |
| onExpandedChange / onSelectedChange | fn | — | no | callbacks |
| renderNode | fn(TreeRenderNodeDetails) | — | no | global row override |
| className | string | — | no | — |

TreeNode fields: `id,label,children?,disabled?,kind('button'|'tile'|'custom'),icon?,rightText?,actions?,content?,render?`.

**Axes**: node `kind` = button | tile | custom.
**States / a11y**: `role="tree"`; `aria-level` per node; `aria-selected`, `data-selected`, `data-focused`, `data-disabled`, **`data-active-path`** (ancestors of selected), `data-tree-node-id`, `data-kind="custom"`. Full keyboard contract (arrows, Home/End, Enter/Space, `*` expand-siblings), roving focus + typeahead per json.
**Anatomy**: machine `treeMachine`/`connectTree`; classes `uf-tree`, `uf-tree-branch(-button/-content)`, `uf-tree-item-button`, `uf-tree-custom-node`. Sub-components: internal recursive `TreeNodeRenderer`; uses **Button** and **Tile** (tile kind). 38 CSS matches.
**Tokens**: `--uf-tree-branch-indicator-size`; control/color fallbacks.

**Contract drift**:
- `.json` composition parts are `root,branch,item,itemIndicator,itemText`, but the DOM actually uses `uf-tree-branch`, `uf-tree-branch-button`, `uf-tree-item-button`, `uf-tree-custom-node` and `data-tree-node-id` — anatomy names and real DOM parts don't line up.
- `renderNode`/per-node `render`/`content`/`kind:'custom'` are rich TSX features under-described in the contract (json mentions them only in the `items` description string).

**Legacy/cleanup**:
- Extensive `as any` + manual delete of `data-scope`/`data-part`/`onClick`/`onFocus`/`onBlur` from branch props, then hand-reassembling props for `renderDefaultRow` — very fragile prop plumbing.
- Branch click merges `branchTriggerOnClick` (toggle) and `branchSelectProps.onClick` (select) in a try/catch pair — clicking a branch both toggles and selects; interaction contract not documented.
- Default demo tree (`defaultTreeItems`) shipped inside component as fallback when `items` missing.

## Toc

**Governance**: navigation / **beta** / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | TocItem[] | [] | no | sections (`{id,label,level?,disabled?}`) |
| activeId | string | — | no | controlled active |
| defaultActiveId | string | first item id | no | uncontrolled active |
| withLine | boolean | true | no | show indicator line + rail |
| lineSide | enum `left\|right` | left | no | rail/indicator side |
| onActiveChange | fn | — | no | `{id}` |
| className | string | — | no | — |

**Axes**: lineSide (left/right); withLine (bool); item `level` drives indent (`level(1)→level prop 0`).
**States / a11y**: `<nav aria-label>` (root props); `data-with-line`, `data-line-side` on root; active item exposes `data-active` (read by indicator animation). json keyboard: ArrowUp/Down focus.
**Anatomy**: machine `tocMachine`/`connectToc`; classes `uf-toc`, `uf-toc-list`, `uf-toc-slot`, `uf-toc-item`, `uf-toc-indicator`. Sub-component: **Button** rows. 29 CSS matches; indicator positioned via inline `transform`/`height` in an effect.
**Tokens**: `--uf-toc-line-inset`, `--uf-toc-line-gap`, `--uf-toc-rail-w`, `--uf-toc-indicator-w`; motion + color fallbacks.

**Contract drift**:
- `.json` composition parts `root,item,indicator` vs actual DOM adding `uf-toc-list`/`uf-toc-slot` wrappers.
- `TocItem` type is defined in `toc.machine.ts` (re-exported), not in Toc.tsx — contract/type source is indirect.

**Legacy/cleanup (explicit legacy shim present)**:
- **`TocLegacyProps.onChange?(id)`** — a legacy callback bridged inside the machine handler (`legacyProps.onChange?.(details.id)`). Deprecated compat shim; not in `.json`, not in `TocProps`, silently supported. Candidate for removal.
- Indicator effect queries `.uf-toc-item[data-active]` via DOM + `forEach` picking last match — imperative; no reduced-motion guard on the transform animation.

## Bar

**Governance**: layout / stable / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| children | ReactNode | — | no | typically slot elements / Feld descriptors |
| orientation | enum `horizontal\|vertical` | horizontal | no | layout direction |
| ...HTMLAttributes | — | — | no | spread onto root |

BarSection props: `align: 'start'|'end'` (default start), children, ...HTMLAttributes.

**Axes**: orientation (horizontal/vertical); BarSection align (start/end).
**States / a11y**: `role="toolbar"`, `aria-orientation`, `data-orientation`. BarSection `data-align`.
**Anatomy**: createAnatomy `bar` parts `root, section`. **Compound components**: `Bar.LeftEllipsis`, `Bar.LeftOverlap`, `Bar.Right` (render-null marker components consumed via child scanning). Also exported `BarSection`. Uses Text/Icon/Button for slot normalization. 21 CSS matches; vertical orientation **is** styled (`.uf-bar[data-orientation="vertical"]`).
**Tokens**: none component-specific; control-height/pad fallbacks only.

**Contract drift (significant)**:
- **Two parallel layout models coexist.** The real render path uses `Bar.LeftEllipsis/LeftOverlap/Right` slots → `.uf-bar__left` / `.uf-bar__right` with `uf-bar--ellipsis`/`--overlap` modes. But the exported **`BarSection` (align start/end)** and the `.json` composition parts `start`/`end` describe a *different* section model that the main branch never renders (BarSection only appears if passed as raw children through the fallback `{children}` path). The anatomy parts (`root,section`) match neither the left/right slots nor json's start/end.
- `children` typed `string` in json; actually ReactNode / array / Feld descriptor objects.
- `orientation` has **no default in json** (tsx defaults horizontal).
- `Bar.LeftEllipsis/Right` etc. compound API is undocumented in `.json` (only Feld `__componentName__` descriptor form shows in states).

**Legacy/cleanup**:
- **Empty-Bar auto-fallback**: when both slots null it injects a hard-coded "Bar" label + a "Close" button — surprising production behavior (renders phantom UI for an empty Bar).
- Dual child-parsing: React element scanning AND `__componentName__` descriptor scanning (playground JSON compat) — two code paths for the same slots.
- `renderSlot` re-instantiates Text/Icon/Button from descriptor objects — a mini component registry embedded in a layout primitive.

## Scroll

**Governance**: layout / stable / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| children | ReactNode | Chekhov demo text | no | scrollable content |
| type | enum `auto\|always\|hover\|scroll` | auto | no | **legacy** visibility hint (no effect — native scrollbars) |
| orientation | enum `vertical\|horizontal\|both` | vertical | no | scroll axes |
| className | string | — | no | — |
| height | number\|string | 240 | no | viewport height |
| ariaLabel | string | 'Scrollable text' | no | region label |

**Axes**: orientation (vertical/horizontal/both); type (auto/always/hover/scroll — inert).
**States / a11y**: viewport is `role="region"`, `tabIndex=0`, `aria-label`. Root `data-type`, `data-orientation`.
**Anatomy**: createAnatomy `scroll` parts `root, viewport`. Wraps in **Card** (variant code). 7 CSS matches (`data-orientation` horizontal/both switch text `white-space`).
**Tokens**: none component-specific; control-pad fallbacks.

**Contract drift**: `children` typed `string`, actually ReactNode; `height` typed `number`, actually `number|string`.

**Legacy/cleanup**:
- **`type` prop is explicitly legacy/inert** — code + JSON both say "Native scrollbar rendering is browser-owned"; the 4-value enum has no behavioral or styling effect. Dead API surface kept for compat.
- **Hard-coded multi-paragraph Russian Chekhov placeholder text** (`DEFAULT_SCROLL_TEXT`) shipped as the default children inside the production component; also duplicated verbatim in `.json` states. Should be fixture-only.

## Carousel

**Governance**: pattern / **beta** / a11y ✓ / mobile ✓. Note: 0 usages in app.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| children | ReactNode\|ReactNode[] | fallback office images | no | slides |
| loop | boolean | false | no | infinite loop |
| autoPlay | boolean | false | no | auto-advance |
| autoPlayInterval | number | 3000 | no | ms between |
| orientation | enum `horizontal\|vertical` | horizontal | no | axis |
| slidesPerView | number | 1 | no | visible slides (clamped `max(1,floor)`) |
| index / defaultIndex | number | — / 0 | no | controlled / uncontrolled |
| onIndexChange | fn | — | no | `{index}` |
| className | string | — | no | — |

**Axes**: orientation (horizontal/vertical); slidesPerView (numeric).
**States / a11y**: root/viewport/slide/indicator props from `connectCarousel`; nav Buttons icon-only. json requires `aria-roledescription` + `aria-label` and full arrow/Home/End keyboard. Active indicator via `radio-on/off` icon swap.
**Anatomy**: machine `carouselMachine`; classes `uf-carousel`, `-track`, `-viewport`, `-controls`, `-navSlot(--prev/--next)`, `-indicators`, `-indicatorButton`, `-slideMedia`. Sub: **Button** (nav/indicators), **Media** (fallback slides). 19 CSS matches.
**Tokens**: `--uf-carousel-viewport-pad`, `--uf-carousel-controls-inset`, `--face-runtime-carousel-slides-per-view`; motion/accent fallbacks.

**Contract drift**:
- `children` typed `array` in json, actually ReactNode|ReactNode[].
- `.json` composition parts `prevButton/nextButton/indicators` are descriptive, not DOM `data-part`s (DOM uses navSlot wrappers).
- CSS references `uf-carousel-slideCard/-slideCardBody/-slideTitle` classes that the current tsx does **not** emit — stale/orphan styles from a prior card-slide variant.

**Legacy/cleanup**:
- Hard-coded `fallbackSlides` pointing at `/assets/media/examples/office-core/*.webp` shipped inside component as default children.
- `preserveButtonScope` helper strips `data-scope` from every machine button (repeat of the strip pattern seen in Tree/Upload).
- Track transform uses `translateX/Y(-index*stepPercent%)`; with `loop` the machine index handling + transform interplay is untested here (0 app usages → low real-world coverage).

## Table

**Governance**: pattern / **beta** / a11y ✓ / **mobileReviewed FALSE**.

**Props** (large surface)
| name | type | default | req | purpose |
|---|---|---|---|---|
| columns | TableColumn[] | [] | no | column defs |
| rows | T[] | [] | no | data |
| rowKey | string\|fn | (falls back to `id`/index) | no | row id source |
| getRowId | fn(row,i) | — | no | **legacy** alias for rowKey |
| sortColumn | string | null | no | controlled sort col |
| sortDirection | enum `asc\|desc` | asc | no | controlled dir |
| onSortChange | fn | — | no | `{column,direction}` |
| selectedRows | string[] | [] | no | controlled selection |
| onSelectedRowsChange | fn | — | no | `{selectedRows}` |
| selectable | boolean | false | no | checkbox column |
| showRowNumbers | boolean | false | no | `#` column |
| stickyHeader | boolean | true | no | sticky thead |
| showDividers | boolean | true | no | row dividers |
| resizable | boolean | false | no | column resize + fixed layout |
| onColumnResize | fn(id,width) | — | no | resize callback |
| stickyLastColumn | boolean | false | no | sticky last col |
| onRowClick / onRowMouseEnter / onRowMouseLeave | fn | — | no | row events |
| activeRowId | string | — | no | `data-active` highlight |
| membrane | boolean | false | no | tile-like rows |
| className | string | — | no | — |
| ariaLabel | string | — | no | table label |

TableColumn: `id, header?, title?(alias), accessor?(string|fn), sortable?, width?, minWidth?, maxWidth?, align('left'|'center'|'right'), truncate?, render?`.

**Axes**: column align (left/center/right); sortDirection (asc/desc); booleans (selectable, resizable, membrane, sticky*, dividers, rowNumbers).
**States / a11y**: root `data-sticky-header`, `data-show-dividers`, `data-membrane`; row `data-active`; cell `data-truncate`, `data-sticky-right`; header cell `data-sortable` (via machine). Sort icon `aria-hidden`. `role="table"`, `aria-label`. Keyboard (arrows, Space-select) declared in json.
**Anatomy**: machine `tableMachine`; classes `uf-table`, `__cellSlot`, `__cellText`, `__headerText`, `__sort-button`, `__sort-icon`, `__resize-handle`, `__row-number-header`. Sub: **Icon**, **Text**. 68 CSS matches (membrane rows fully styled).
**Tokens**: `--uf-table-row-number-width`, `-resize-hit-width`, `-resize-line-offset-x`, `-resize-line-inset-y`, `-divider-width`, `-membrane-cell-pad-x`, `-sort-icon-gap`; control/color/motion fallbacks.

**Contract drift (severe)**:
- **Phantom required prop in `.json`**: `"direction": { "type": "function", "required": true, "description": "direction prop" }`. No such prop exists in TableProps. It is `required:true` and typed `function` — will break contract validation / codegen and demand a nonexistent prop. **Highest-priority fix in this batch.**
- `header`/`title` dual-accessor and `getRowId` legacy alias are TS-only; json documents `getRowId` but not `title`.
- `.json` composition slot names (`headerCell,sortIndicator`) don't map to emitted classes.

**Legacy/cleanup**:
- `getRowId` prop is an explicit **legacy components-API alias** for `rowKey` (both supported; resolsolution prefers `getRowId`).
- Column resize uses **global document pointer listeners** + a mutable `resizeStateRef`; magic fallback widths `?? 120` and `?? 80` (min) scattered; `Number.MAX_SAFE_INTEGER` as max.
- `mobileReviewed:false` while the component has sticky/resizable/horizontal-heavy features — a real responsive gap flagged by governance.
- Row-number and select `<th>`/`<td>` don't run through the machine cell props consistently.

## Upload

**Governance**: pattern / **beta** / a11y ✓ / mobile ✓.

**Props**
| name | type | default | req | purpose |
|---|---|---|---|---|
| accept | string | '' | no | accepted types |
| multiple | boolean | false | no | multi-select |
| maxSize | number | 0 | no | max bytes (0=∞) |
| maxFiles | number | 0 | no | max count (0=∞) |
| disabled | boolean | false | no | disabled |
| files | UploadFile[] | — | no | controlled list |
| onFilesChange | fn | — | no | `{files}` |
| onReject | fn | — | no | `{files,reason}` |
| className | string | — | no | — |

**Axes**: none (all boolean/scalar).
**States / a11y**: dropzone `data-dragging` (via machine `isDragging`); `role="button"` + `aria-label` required per json; Enter/Space open picker. Hidden native `<input>`.
**Anatomy**: machine `uploadMachine`; classes `uf-upload`, `-dropHint`, `-trigger`. Sub: **Text** (hint/name/size), **Button** (choose/remove). 6 CSS matches (lightest CSS footprint).
**Tokens**: none component-specific; radius/color fallbacks.

**Contract drift**: minimal — props/enums align well. `.json` composition `label` slot vs tsx `uf-upload-dropHint` naming difference.

**Legacy/cleanup**:
- `data-scope`/`data-part` stripped off trigger + `as any` casts on machine props (same strip pattern as Tree/Carousel/Toc — a shared adapter helper would remove ~5 copies across this batch).
- Remove button rendered per file without confirm; fine for beta.
- No visible surfacing of `onReject` reason to the user (silent rejection UX).

---

## Priority cleanup list (this batch)
1. **Table.json phantom `direction` (required:true) prop** — remove; breaks contracts/codegen.
2. **Pagination stale docstring** — describes numbered/ellipsis paging that no longer exists; `siblingCount` is a no-op.
3. **Navigation vertical orientation unstyled** — prop + json state ship with no CSS.
4. **Panel `Sidebar` alias not exported from index.ts** despite registry `aliases:["Sidebar"]`; Panel styled entirely as `uf-sidebar` (name split).
5. **Bar dual layout models** — BarSection(start/end)+json parts vs Left/Right slot render path; anatomy parts match neither. Empty-Bar phantom UI fallback.
6. **Shipped placeholder content in production components** — Scroll Chekhov text, Carousel office images, Panel workspace preset (~120 lines), Tree default tree.
7. **Toc `onChange` legacy shim** and **Scroll `type` inert enum** — documented-dead APIs to schedule for removal.
8. **Item-shape unification** — Tree(`children`) vs Nav/Panel(`items`); Menu(`value`) vs `id`; Breadcrumb no id; NavigationItem missing `icon`. Introduce shared base.
9. **Systemic json type drift** — ReactNode props typed `string`; `children` typed `string`; `number|string` typed `number`.
10. **Repeated `as any` + data-scope/part strip plumbing** across Tree/Toc/Carousel/Upload/Panel — extract a shared adapter util.
