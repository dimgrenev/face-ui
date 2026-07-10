# Face UI — Overlay Family Audit (04)

Components audited: **Select, Date, Calendar, Tooltip, Popover, Overlay (deprecated), Menu, Command**.
Source: `/Users/grenev/Documents/workspace/face-ui/`. No code changed — read-only audit.

## Cross-cutting summary (read first)

There are **four different floating-position implementations** and **three different open-state
APIs** across this family. The registry claims responsive-sheet behavior for components that do
not implement it, and several `.json` `usage`/prop blocks are copy-paste stale.

### Positioning implementations (NOT unified)
| Impl | Used by | Flip / collision? | Notes |
|---|---|---|---|
| `assets/adapters/react/use-floating-position.ts` (shared) | Select (popover surface), Menu | Yes — `resolveSide()` flips + clamps + maxHeight | The intended shared adapter |
| `useSelectSidePosition` (bespoke, in Select.tsx) | Select `variant="side"` only | Partial (left/right flip) | Duplicate positioning engine, magic numbers |
| `Overlay.updateFloatingPosition` (bespoke, in Overlay.tsx) | Overlay, Tooltip, Popover | **No flip** — clamps only | Duplicates the shared adapter minus collision flipping |
| CSS only (no JS) | Date popover | No | Date does no JS positioning at all |
| n/a | Command (centered dialog / inline flow), Calendar (static grid) | — | |

So the shared `use-floating-position` adapter is **not** shared by the deprecated Overlay family
(Tooltip/Popover) nor by Date. Tooltip/Popover do not flip when space runs out; Select/Menu do.

### Open-state / control API (NOT unified)
- **Select, Date, Menu**: machine-driven (`send OPEN/CLOSE/DISMISS`), expose only `onOpenChange({open})`. **No controlled `open` prop, no `defaultOpen`.** (Menu exposes neither.)
- **Overlay, Tooltip, Popover**: controlled `open` prop + `onOpenChange({open})` via `overlayMachine`.
- **Command**: `open` + `defaultOpen` + `onOpenChange({open})` via `useControllableOpenState`.

`onOpenChange` signature `({ open })` is at least consistent everywhere. Select additionally keeps a
legacy `onChange(value)` alias.

### Dismiss / escape / responsive
- **Dismiss-outside**: `useDismissOutside` (Select, Menu); inline `mousedown` handler (Date); machine-internal (Overlay/Tooltip/Popover); backdrop click (Command). Four styles.
- **Escape**: own `document` keydown listener (Menu, Command); machine (Overlay family); machine (Select/Date via json contract).
- **Responsive sheet**: Select, Date, Menu render `ResponsiveSheetHeader` + `.uf-responsive-overlay-backdrop` via `useResponsiveOverlaySurface` (`auto`→`sheet`, breakpoint 900). Command uses its own dialog/backdrop (not `ResponsiveSheetHeader`). **Overlay/Tooltip/Popover have no responsive surface at all** despite the registry saying otherwise (see Popover).

### Focus management gaps
- **Popover** (`role=dialog` per json, claims `returnFocusOnClose`, `focusTrap`, `autoFocusOnOpen: first-focusable`) — **none of this is implemented** in Overlay. No focus trap, no autofocus, no focus return.
- **Command** dialog: autofocuses the input, but **no focus trap** for a modal dialog surface.
- **Menu**: manually focuses the highlighted `menuitem`; no focus trap, no focus return.
- No component in this family implements a real focus trap.

---

## Select

### 1. Governance
- category `overlay-form`, status **stable**, a11yReviewed ✔, mobileReviewed ✔, responsiveSurface **auto->sheet**, related: Menu, Command, Date, Popover. No aliases/replacedBy.

### 2. Props
| Prop | Type (enum) | Default | Req | Purpose / notes |
|---|---|---|---|---|
| variant | `default \| side \| iconOnly` | `default` | no | `side` swaps to bespoke side positioning + hover open |
| options | `SelectOption[]` | `[]` | no | `{value,label,disabled}` |
| value | `string \| string[] \| null` | — | no | **json says type "array"** (drift) |
| defaultValue | `string \| string[] \| null` | `null`/`[]` | no | **json says "array"** (drift) |
| placeholder | string | `Select option` | no | |
| disabled | boolean | `false` | no | |
| type | `select \| multiselect` | `select` | no | selection mode |
| label | ReactNode | — | no | |
| labelOrientation | `vertical \| horizontal` | `vertical` | no | |
| ariaLabel | string | — | no | |
| displayValue | ReactNode | — | no | **json says "string"** (drift) |
| stretchText | boolean | `false` | no | pins arrow to right edge |
| onValueChange | `({value})=>void` | — | no | |
| **onChange** | `(value)=>void` | — | no | **LEGACY alias — present in TSX (L80,415), MISSING from .json** |
| onOpenChange | `({open})=>void` | — | no | |
| surface | `auto \| popover \| sheet` | `auto` | no | overridden to `side` when `variant="side"` |
| surfaceBreakpoint | number | `900` | no | |
| surfaceTitle | ReactNode | — | no | sheet header title |
| contentMinWidth | number\|string | — | no | |
| membrane | boolean | `true` | no | |
| triggerClassName / valueClassName / contentClassName | string | — | no | |
| className | string | — | no | |

### 3. Axes
- variant: default / side / iconOnly. surface: auto / popover / sheet (+ implicit `side`). type: select / multiselect. labelOrientation: vertical / horizontal. Indicator icon: chevron-down/up (popover) or chevron-right (side).

### 4. States / a11y
- Root `data-variant`, `data-label-orientation`, `data-state=open|closed` (via machine, scope `select`). Content `data-surface=popover|sheet|side`, `data-select-variant`, `data-uf-select-side-boundary/panel`. Option `data-part=option`, `data-state=selected`, `aria-selected`, `data-highlighted`.
- aria (json): `role=combobox`, `labelledBy=select-label`; content is listbox, `aria-activedescendant` wired. Trigger is a `<button>`.
- Sheet: backdrop `.uf-responsive-overlay-backdrop[data-state]`, body scroll lock, `ResponsiveSheetHeader`. Popover: `createPortal` to body; sheet renders in place.
- Focus: json `autoFocusOnOpen: first-focusable`, roving focus, typeahead.

### 5. Anatomy
root → trigger(→indicator) / content → item(s) / group / label. Uses shared `useFloatingPosition` (popover) but a **separate** `useSelectSidePosition` for `side`.

### 6. Tokens
Component: `--uf-select-sheet-inset/gap`, `--uf-select-content-max-height`, `--uf-select-content-min-width`, `--uf-select-panel-pad`, `--uf-select-sheet-enter-y`, plus **two parallel indicator naming schemes** (`--uf-selector-indicator-*` AND `--uf-select-indicator-*`). Fallbacks: control geometry + overlay surface/enter tokens + `--uf-z-dropdown/overlay`.

### 7. Contract drift
- `value`/`defaultValue` json type `array` but real type is `string | string[] | null`.
- `displayValue` json `string` but real `ReactNode`.
- **`onChange` legacy alias absent from .json** entirely.
- Token map lists `--uf-select-content-min-width`, but code writes the CSS var **`--face-runtime-select-content-min-width`** (L504) — name mismatch.
- `.json` `usage` block is arguably fine for Select (note: Date's is not — see below).

### 8. Cleanup flags
- Two indicator token naming families (`selector-` vs `select-`) — consolidate.
- Magic numbers in side variant: `SELECT_SIDE_WIDTH=240`, `MAX_HEIGHT=480`, `GAP=4`, `INSET=4`, `MIN_HEIGHT=80`, side-close timer `80ms`.
- `side` variant duplicates positioning that `use-floating-position` largely already does.
- `onChange` legacy alias should be documented or removed.

---

## Date

### 1. Governance
category `overlay-form`, stable, a11yReviewed ✔, mobileReviewed ✔, responsiveSurface **auto->sheet**, related: Calendar, Select.

### 2. Props (selected; full list in file)
| Prop | Type (enum) | Default | Notes |
|---|---|---|---|
| mode | `date\|datetime\|time\|week\|month\|year` | `date` | |
| selection | `single\|range` | `single` | |
| views | `DateView[]` | derived from mode | |
| openTo | `month\|year\|day\|hours\|minutes` | first view | |
| value / defaultValue | `DateValueExternal` (any) | `null` | |
| onValueChange/onOpenChange | fn | — | |
| valueFormat | `date\|iso` | `iso` | |
| locale | string | `en-US` | |
| timezone | string | `UTC` | |
| weekStartsOn | `0..6` | `1` | json enumerates as strings |
| format | string | — | |
| min/max | string\|Date\|null | `null` | |
| disabledDates | array | `[]` | |
| disabledTime | `{hours?,minutes?}` | — | |
| closeOnSelect | boolean | **dynamic** (`mode==='date' && selection==='single'`) | json shows plain boolean, no default |
| showNow/showClear | boolean | `true` | |
| showPresets | boolean | `false` | |
| presets | `DatePreset[]` | default presets | |
| surface/surfaceBreakpoint/surfaceTitle | | `auto`/`900` | |
| label/description/error | ReactNode | — | |
| required/disabled/readOnly | boolean | `false` | |
| placeholder | string | mode-dependent | |
| membrane/fullWidth | boolean | `true` | |

### 3. Axes
mode (6), selection (2), views/openTo (day/month/year/hours/minutes), surface (3), valueFormat (2), weekStartsOn (0–6).

### 4. States / a11y
- Root `data-full-width`, machine root props. Content `.uf-date__content[data-surface]`, `data-state=open|closed` (CSS-driven transitions L2331/2339/2374).
- aria (json): `role=combobox`, requires `aria-label`+`aria-expanded`.
- **Positioning: none** — popover placed purely by CSS; no flip/collision/portal. Dismiss via inline `window mousedown` handler (L223-235), **not** `useDismissOutside`. Sheet uses backdrop + body scroll lock + `ResponsiveSheetHeader`.
- Embeds `Calendar` for day view; month/year/hours/minutes are Button grids.

### 5. Anatomy
root → label / trigger(→value,icon) / content(→calendar, toolbar, panel grids, presets, footer) / description / error.

### 6. Tokens
Component: `--uf-date-content-max-width/height`, `--uf-date-content-viewport-gap`, `--uf-date-sheet-inset/gap`, `--uf-date-panel-pad`, `--uf-date-sheet-enter-y`. Fallbacks: spacing/control/overlay surface + enter tokens, `--uf-color-error/destructive`.

### 7. Contract drift
- **Phantom prop `minutes` (json L133)** — no such prop in `DateProps`; `minutes` is only a local grid variable. Dead entry.
- **`.json` `usage` is stale/copy-pasted**: whenToUse = "Formatted date display / Relative time display", whenNotToUse = "Date input with calendar trigger", alternatives = Calendar, **Text**. Describes a text/relative-time widget, not a date picker.
- `closeOnSelect` real default is dynamic; json omits it.
- aria json requires `aria-expanded` but that is machine-supplied, not a prop.

### 8. Cleanup flags
- Does not use the shared `use-floating-position` — no collision handling on the popover.
- Inline dismiss handler instead of `useDismissOutside` (inconsistent with Select/Menu).
- Range selection partly handled outside the machine.

---

## Calendar

### 1. Governance
category **`form`** (not overlay), stable, a11yReviewed ✔, mobileReviewed ✔, related: Date. No responsiveSurface (standalone grid).

### 2. Props
| Prop | Type (enum) | Default | Notes |
|---|---|---|---|
| value | `Date \| CalendarRangeValue \| null` | — | json "object" |
| defaultValue | same | — | json "object" |
| selection | `single \| range` | `single` | |
| min / max | Date | — | json "object" |
| disabledDates | Date[] | `[]` | |
| locale | string | `en-US` | |
| weekStartsOn | `0..6` | `0` | |
| onValueChange | `({value: Date\|Range})=>void` | — | |
| className | string | — | |

### 3. Axes
selection: single / range. weekStartsOn 0–6.

### 4. States / a11y
- `role=grid` (json requires `aria-label`). Day cells: `data-part=day`, `data-range-start/end/between`, `data-state`, `data-highlighted`. Roving focus.
- Header prev/next Buttons + title Text.

### 5. Anatomy
root → header(prev/title/next) → grid → cells. Public API in `Date` objects; internal machine in ISO strings.

### 6. Tokens
Component: `--uf-calendar-nav-size/weekday-height/cell-size`, `--uf-icon-only-size`. Styled almost entirely via `[data-scope="calendar"]`/`[data-part]` selectors (CSS L4174+). Fallbacks: control geometry, colors.

### 7. Contract drift
- json `value/defaultValue/min/max` typed `object` — imprecise (`Date` instances).
- json default state uses `selection: "range"` while the real component default is `single`.

### 8. Cleanup flags
- **`dateToISO` silently coerces invalid/unparseable input to *today*** (L67-74) — a foot-gun; malformed props render as the current date instead of erroring.
- Class hooks `uf-calendar-navButton`, `uf-calendar-titleText`, `uf-calendar-weekdayText`, `uf-calendar-dayButton` are applied in TSX but **absent from components.css** (styling is data-part based) — dead/unused class hooks.
- Range logic (`handleRangeDateSelect`, `normalizeRangeOrder`) lives in the adapter, bypassing the machine's single-select `onValueChange`.
- Magic `6` week rows always rendered.

---

## Tooltip

### 1. Governance
category `overlay`, stable, a11yReviewed ✔, **mobileReviewed ✗ (only component here not mobile-reviewed)**, related: Popover, Overlay. No responsiveSurface.

### 2. Props
Thin wrapper: `TooltipProps = Omit<OverlayProps, 'trigger' | 'interactive'>`. Renders `<Overlay trigger="hover" interactive={false} />`. Exposed: content, children, open, openDelay, closeDelay, side (`top\|right\|bottom\|left`), align (`start\|center\|end`), sideOffset, onOpenChange, className.

### 3. Axes
side (4), align (3). Fixed: trigger=hover, interactive=false.

### 4. States / a11y
- `role=tooltip`. Content Card `data-scope=overlay`, `data-part=content`, `data-state=open|closed`, `data-side`, `data-align`, `data-trigger=hover`. Escape closes (json). `autoFocusOnOpen: none`.
- **a11y concern**: hover-only trigger; no evidence of focus-triggered open — keyboard users may never see it. mobileReviewed=false is consistent (tooltips need hover).

### 5. Anatomy
root → trigger → content → arrow. Positioning inherited from Overlay's bespoke (non-flipping) engine.

### 6. Tokens
`--uf-overlay-content-max-w`, `--uf-overlay-content-border-width`; `--uf-tooltip-bg/fg/border` aliases of overlay surface tokens; overlay enter tokens.

### 7. Contract drift
- json correctly omits `trigger`/`interactive`. Otherwise props match the Overlay subset.
- json `platform.anchorPositioning: true` but the underlying Overlay uses JS `getBoundingClientRect`, not CSS anchor positioning.

### 8. Cleanup flags
- No open-on-focus for keyboard a11y (verify in overlay.machine).
- Depends on **deprecated** Overlay (see Overlay).

---

## Popover

### 1. Governance
category `overlay`, stable, a11yReviewed ✔, mobileReviewed ✔, **responsiveSurface `auto->sheet`**, related: Tooltip, Menu, Select.

### 2. Props
Thin wrapper: `PopoverProps = Omit<OverlayProps, 'trigger'|'interactive'> & { interactive?: boolean }`. Renders `<Overlay trigger="click" interactive={interactive ?? true} />`. Exposed: interactive (default `true`), content, children, open, openDelay, closeDelay, side, align, sideOffset, onOpenChange, className.

### 3. Axes
interactive (bool), side (4), align (3). Fixed trigger=click.

### 4. States / a11y (claimed vs actual)
- json: `role=dialog`, `labelledBy=popover-title`, behavior `returnFocusOnClose`, `autoFocusOnOpen: first-focusable`, keyboard `Tab: focusTrap`.
- **Actual**: renders through Overlay which provides **no focus trap, no autofocus, no focus return**, and role comes from `connectOverlay` contentProps (shared with Tooltip) — likely not `dialog`. Content `data-trigger=click`.

### 5. Anatomy
root → trigger → content → arrow / close. Positioning = Overlay bespoke engine (no flip).

### 6. Tokens
Same overlay surface + enter tokens as Overlay/Tooltip.

### 7. Contract drift (SIGNIFICANT)
- **Registry `responsiveSurface: auto->sheet` is false** — Popover/Overlay have no `surface` prop, no `useResponsiveOverlaySurface`, no sheet rendering. There is no mobile sheet.
- **json a11y contract (dialog role, focus trap, autofocus, return focus, `popover-title` labelledBy) is unimplemented.**
- `platform.anchorPositioning: true` — actually JS positioning.
- Popover `interactive` default is `true` in both json and code (consistent).

### 8. Cleanup flags
- Whole component is a 4-line wrapper over a **deprecated** primitive.
- Governance and json promise mobile-sheet + dialog focus semantics that don't exist — highest-risk drift in this set.

---

## Overlay (DEPRECATED)

### 1. Governance
category `overlay-primitive`, **status `deprecated`**, replacedBy **Tooltip, Popover**, a11yReviewed ✔, mobileReviewed ✔, related: Tooltip, Popover.
- Reality: "deprecated" but **still the live engine** behind Tooltip and Popover — cannot be removed without reimplementing both.

### 2. Props
| Prop | Type (enum) | Default | Notes |
|---|---|---|---|
| trigger | `hover \| click` | `hover` | |
| interactive | boolean | `false` | keeps open on hover |
| content | ReactNode | `'Tooltip text'` fallback | json says "string" |
| children | ReactNode (trigger) | `'Hover me'` fallback | |
| open | boolean | — | controlled |
| openDelay | number | `200` | |
| closeDelay | number | `0` | |
| side | `top\|right\|bottom\|left` | `top` | |
| align | `start\|center\|end` | `center` | |
| sideOffset | number | `2` | |
| onOpenChange | `({open})=>void` | — | |
| className | string | — | applied to content |
| ...rest | HTMLAttributes | — | **spread onto the content Card** (leak risk) |

### 3. Axes
trigger (2) × interactive (2) = tooltip / popover / hovercard. side (4), align (3).

### 4. States / a11y
- `isOpen = state.matches('open','closing')` (keeps mounted for exit anim). Content Card: `data-scope=overlay`, `data-part=content`, `data-state=open|closed`, `data-side`, `data-align`, `data-trigger`. Arrow part. `role` from `connectOverlay` (single shared role — json says `tooltip`).
- Escape + click-outside dismissal via machine (json). `autoFocusOnOpen: none`. **No focus trap / return focus.**
- Portaled to `document.body`.

### 5. Anatomy
root → trigger (Button for primitive children, else wrapped span) → content(→arrow). **Own** `updateFloatingPosition` (L94-136), duplicating `use-floating-position` but **without `resolveSide` flipping**.

### 6. Tokens
`--uf-overlay-content-max-w`, `--uf-overlay-content-border-width`, `--uf-responsive-overlay-zero-blur`; `--uf-tooltip-*` aliases; overlay surface/enter tokens.

### 7. Contract drift
- **json `usage` is wrong/copy-pasted**: whenToUse "Background dimming for modals / Click-outside dismiss layer", alternatives Modal/Drawer — describes a scrim, not this floating tooltip/popover primitive.
- `content` typed "string" but is ReactNode.
- `platform.anchorPositioning: true` — actually JS positioning.

### 8. Cleanup flags
- Duplicate positioning engine that lacks flipping (Select/Menu flip; Overlay family does not).
- Magic default strings `'Tooltip text'` / `'Hover me'`.
- `...rest` HTMLAttributes spread onto content Card can leak arbitrary DOM props.
- "deprecated" status is misleading while it remains load-bearing.

---

## Menu

### 1. Governance
category `overlay`, stable, a11yReviewed ✔, mobileReviewed ✔, responsiveSurface **auto->sheet**, related: Popover, Command, Select.

### 2. Props
| Prop | Type (enum) | Default | Notes |
|---|---|---|---|
| trigger | `click \| context` | `click` | |
| items | `MenuItemEntry[]` (item/separator/group) | `[]` | json documents `contract` shape |
| children | ReactNode (trigger) | Button "Options" | |
| onSelect | `({value})=>void` | — | |
| disabled | boolean | `false` | |
| onOpenChange | `({open})=>void` | — | |
| surface | `auto\|popover\|sheet` | `auto` | |
| surfaceBreakpoint | number | `900` | |
| align | `start\|center\|end` | `end` | |
| sideOffset | number | `4` | |
| surfaceTitle | ReactNode | — | |
| className | string | — | |

### 3. Axes
trigger (2), surface (3), align (3). `side` is hardwired `'bottom'` (not exposed).

### 4. States / a11y
- Root `.uf-menu[data-surface][data-trigger]`. Content `.uf-menu-content[data-surface][data-trigger]`, `data-state=open|closed`. Items `role=menuitem`, `data-value`, `data-state`. `role=menu`.
- Uses shared `useFloatingPosition` (flip) + `useDismissOutside` + `useResponsiveOverlaySurface` + `useBodyScrollLock` — **the most consistent overlay in this set.**
- Escape via own `document` keydown listener. Keyboard highlight → manual `.focus()` on highlighted item (L301-311). No focus trap / return focus.

### 5. Anatomy
root → trigger → content → item(s)/separator/group(→label,items). Sheet via `ResponsiveSheetHeader` + backdrop.

### 6. Tokens
`--uf-menu-min-w/border-width/sheet-inset/sheet-gap/sheet-enter-y/separator-h`; overlay surface + enter tokens, `--uf-z-dropdown/overlay`.

### 7. Contract drift
- **json keyboard advertises submenu** (`ArrowRight: openSubmenu / hasSubmenu`, `ArrowLeft: closeSubmenu / inSubmenu`) but there is **no submenu support** — groups are flat, no nesting in `MenuItemEntry`, no code.
- `trigger="context"` opens a bottom-anchored popover, **not at the pointer coordinates** — a context menu conventionally opens at the cursor.

### 8. Cleanup flags
- `side` hardwired to bottom; no `side` prop while Overlay family has one — inconsistent.
- Own escape listener duplicates a pattern that `useDismissOutside`/machine handle elsewhere.
- Submenu keyboard contract is aspirational/dead.

---

## Command

### 1. Governance
category `overlay`, stable, a11yReviewed ✔, mobileReviewed ✔, responsiveSurface **auto->sheet**, related: Menu, Input, Modal. platform dialog + popover.

### 2. Props
| Prop | Type (enum) | Default | Notes |
|---|---|---|---|
| items | `CommandItem[]` | `[]` | `{id,label,keywords?,group?,disabled?,onSelect?}` |
| groups | `CommandGroup[]` | `[]` | |
| placeholder | string | `Search...` | |
| value / defaultValue | string | `''` | search query |
| onValueChange | `({value})=>void` | — | |
| onSelect | `({item})=>void` | — | |
| surface | **`auto\|inline\|dialog`** | `auto` | different vocabulary from others |
| surfaceBreakpoint | number | `900` | |
| open / defaultOpen | boolean | `false` | dialog surface |
| onOpenChange | `({open})=>void` | — | |
| emptyContent | ReactNode | `'No results found.'` | |
| className | string | — | |

### 3. Axes
surface: auto / inline / dialog (mapped internally inline→popover, dialog→sheet, then back).

### 4. States / a11y
- Root Card `data-surface=inline|dialog`. Dialog wrapper `.uf-commandSurface`/`.uf-command__dialog` with `data-state=open|closed` + backdrop. `role=combobox`, `labelledBy=command-label`.
- Uses `useControllableOpenState` + `useBodyScrollLock`; **no `useFloatingPosition`** (inline is in-flow, dialog is centered). Escape via own `document` keydown. Autofocuses input on dialog open (`setTimeout 0`). **No focus trap** for the dialog.

### 5. Anatomy
root(Card) → input / list → group(→label,items) / item / empty; dialog surface adds trigger button + backdrop + dialog container.

### 6. Tokens
`--uf-command-border-width/list-max-height/dialog-list-viewport-gap/dialog-enter-y/dialog-inset/dialog-viewport-gap`; control geometry + overlay surface tokens.

### 7. Contract drift
- Distinct surface vocabulary (`inline`/`dialog`) vs the family's `popover`/`sheet`, requiring a double round-trip mapping through `useResponsiveOverlaySurface`.
- `role=combobox`/`labelledBy=command-label` but no rendered element carries that id.

### 8. Cleanup flags
- `SET_ITEMS` effect + `itemsKey` string memo is an explicit workaround for a re-render loop ("avoid infinite re-render loop" comment) — code smell.
- `ref` attaches conditionally (`showPalette ? ref : null`) so the forwarded ref is null while a dialog is closed.
- Dialog has no focus trap despite being a modal palette (Cmd+K).

---

## Consolidated cleanup backlog
1. **Popover governance/a11y is fictional**: registry `responsiveSurface: auto->sheet` and json dialog/focus-trap/return-focus/autofocus are unimplemented. Either implement or correct the contract.
2. **Three+ positioning engines**; migrate Overlay (Tooltip/Popover) and Date onto shared `use-floating-position` so tooltips/popovers flip like Select/Menu.
3. **Overlay "deprecated" yet load-bearing** — resolve status vs reality.
4. **Stale `.json` usage blocks**: Date and Overlay `usage` sections are copy-paste wrong.
5. **Phantom/legacy props**: Date `minutes` (json only), Select `onChange` (code only, undocumented legacy).
6. **Type imprecision in json**: Select `value/defaultValue/displayValue`, Calendar `value/min/max` (Date objects typed as generic object/array).
7. **Token name mismatch**: Select code writes `--face-runtime-select-content-min-width` while token map lists `--uf-select-content-min-width`; Select carries two indicator token families.
8. **Inconsistent open-state API** (controlled `open` on Overlay-family/Command; onOpenChange-only on Select/Date/Menu).
9. **Menu**: submenu keyboard contract is dead; `context` trigger doesn't open at cursor; `side` not exposed.
10. **Focus traps missing** on Popover, Command dialog, Menu.
11. Calendar `dateToISO` silently coerces bad input to today; unused `uf-calendar-*` class hooks.
