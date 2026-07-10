# Face UI Audit — Overlays (part 2), Feedback & Navigation

Scope: **Modal, Sheet, Drawer, Toast, Progress, Tabs, Accordion, Steps**
Source: `/Users/grenev/Documents/workspace/face-ui/`
Governance: `component-registry.json` (`components` map, 48 entries). Global overlay-sheet breakpoint = **900** (`governance.responsiveBreakpoints.overlaySheet`), but code default `DEFAULT_OVERLAY_SURFACE_BREAKPOINT = 900` in `assets/adapters/react/use-responsive-overlay-surface.ts`.

Architecture note: **Modal is the single overlay engine.** Drawer wraps Modal; Sheet wraps Drawer. State/focus/aria all live in `assets/machines/modal.machine.ts`.

---

## Modal

Files: `Modal/Modal.tsx`, `Modal/Modal.json`, machine `assets/machines/modal.machine.ts`.

### 1. Governance
| field | value |
|---|---|
| category | overlay |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| responsiveSurface | `auto->sheet` |
| aliases / replacedBy | — |
| related | Drawer, Command |

### 2. Props
| name | type | default | req | purpose / flag |
|---|---|---|---|---|
| open | boolean | — | no | controlled open |
| variant | enum `center\|left\|right\|top\|bottom` | **`right`** | no | placement. NOTE: default `right` is unusual for a "modal" (a right drawer, not a centered dialog). |
| closeOnOverlayClick | boolean | true | no | "components API compatibility" — overlay dismiss |
| closable | boolean | true | no | false => alertdialog (no Escape/backdrop) |
| title | ReactNode | — | no | header title |
| description | ReactNode | — | no | below title |
| children | ReactNode | — | no | body |
| actions | `Array<{label,variant?,disabled?}>` | `[]` | no | footer buttons |
| trigger | ReactNode | — | no | toggle element |
| width | number(px) | 400 | no | left/right only |
| height | number(px) | 420 | no | top/bottom only |
| onOpenChange | `(d:{open})=>void` | — | no | change callback |
| surface | enum `auto\|dialog\|sheet` | auto | no | compact behavior |
| surfaceBreakpoint | number | 900 (const) | no | auto→sheet threshold. **`.json` has no default listed.** |
| autoFocusOnOpen | boolean | true | no | focus into modal on open |
| portal | boolean | true | no | portal to document.body |
| className / backdropClassName / positionerClassName | string | — | no | slot classes |
| **isOpen** (legacy) | boolean | — | no | **legacy**, `ModalLegacyProps`, not in `.json` |
| **onClose** (legacy) | ()=>void | — | no | **legacy**, not in `.json` |

### 3. Enum axes
- variant: center / left / right / top / bottom
- surface: auto / dialog / sheet
- resolved surface: compact viewport → sheet, else dialog; sheet + variant=center is remapped to `bottom` (effectiveVariant logic).

### 4. States / a11y / focus
- data-attrs (CSS): `data-state="open|closed"` (backdrop, positioner, content), `data-surface="sheet"`, `data-variant=center|left|right|top|bottom`, `data-portal="true|false"`, `data-drawer-edge` (read from rest, used to drop border on flush).
- role: `dialog` when closable, **`alertdialog` when `closable=false`** (machine line 197). `aria-modal=true`, `aria-labelledby=titleId`, `aria-describedby=descriptionId`.
- Focus: `focusInitialElement` focuses first focusable (gated by `autoFocusOnOpen`); Tab focus-trap wraps first/last (machine ~149-171); **return focus to previously-focused element on close is implemented** (machine ~143 `previous.focus()`).
- Escape handled via `trackDocumentEscape`; suppressed when not closable.

### 5. Anatomy / sub-components
Rendered via `Card` (variant="dialog"): `uf-modal-backdrop`, `uf-modal-positioner`, `uf-modal` (Card), `uf-modal-bar` (Card.Header), `uf-modal-title` (Card.Title), `uf-modal-closeActions`/`uf-modal-closeButton`, `uf-modal-description`, `uf-modal-body` (Card.Content), `uf-modal-actionsBar` (Card.Footer). Also `uf-modal-inlineHost` (non-portal fallback) and `.uf-modal-overlay` class present in CSS but not emitted by the .tsx (dead/legacy selector). No compound `Modal.*` exports.

### 6. Tokens
Component: `--uf-modal-*` (sheet-inset/gap, pad, max-w, viewport-gap, enter-y, side-enter-x, side-w-default, stack-h-default, zero-blur) + private runtime `--face-runtime-modal-w/h` written from width/height props. Semantic fallbacks: `--uf-overlay-*` (backdrop/surface bg/blur/shadow), `--uf-z-modal`, `--uf-radius-lg`, `--uf-duration-*`, `--uf-ease-enter`, `--uf-color-fg(/-muted)`.

### 7. Contract drift (.json vs .tsx)
- `title`/`description`/`children`/`trigger` typed `string` in `.json` but `ReactNode` in `.tsx` (systemic across this family).
- Legacy `isOpen`/`onClose` exist in code, **absent from `.json`**.
- `.json` `surfaceBreakpoint` has no default; code uses 900.
- `.json.behavior` claims **`scrollLock: true`** and `.json.platform.inert: true` — **neither is implemented** (no body overflow lock, no `inert`/aria-hidden of background in `modal.machine.ts`; grep for overflow/inert = none). `focusTrap`, `dismissOnEscape`, `dismissOnClickOutside`, `returnFocusOnClose`, `autoFocusOnOpen` are implemented.
- `.json.aria.labelledBy: "modal-title"` etc. are static placeholders; real ids are `useId()`-generated.

### 8. Cleanup flags
- **Default `variant='right'`** makes a bare `<Modal open>` a right-side drawer, not a centered dialog — surprising for the "unifies Dialog" component.
- **Missing scroll-lock and inert/background-hiding** despite documented contract — production a11y gap (background scroll + AT can reach background).
- Dead `.uf-modal-overlay` CSS selector (component emits `uf-modal-backdrop`).
- Legacy `isOpen`/`onClose` shim undocumented.
- `data-drawer-edge` is read out of `...rest` (stringly-typed cross-component coupling from Drawer).
- `closeOnOverlayClick` deletes `onClick` off backdropProps via `try/delete` — brittle.

---

## Sheet  (DEPRECATED)

Files: `Sheet/Sheet.tsx` (12 lines), `Sheet/Sheet.json`.

### 1. Governance
| field | value |
|---|---|
| category | overlay |
| status | **deprecated** |
| a11yReviewed | true |
| mobileReviewed | true |
| replacedBy | **Drawer** |
| related | Modal, Drawer |

Exported only from **`compat.ts`** (`export { Sheet } from './Sheet/Sheet'`), **NOT** from `index.ts`. Pure compat shim.

### 2. Props
Thin wrapper: `Omit<DrawerProps,'side'>` + `side?: 'bottom'|'top'` (default `bottom`) + `edge?: DrawerEdge`. All other props (open, title, actions, etc.) pass through to Drawer→Modal. `.json` re-lists the full Modal prop surface (see Modal table); its `side` enum is correctly limited to `bottom|top`.

### 3. Axes
- side: bottom / top (only). edge: inset / flush.

### 4. States
Inherits Modal entirely (role=dialog, data-state, focus trap). No unique data-attrs. **No `uf-sheet-*` CSS classes exist** (Drawer renders `uf-drawer*` classes).

### 5. Anatomy
None of its own — delegates to Drawer. `.json.composition` advertises a `handle` part; **no handle is rendered anywhere.**

### 6. Tokens
`.json` lists `--uf-modal-sheet-*`, `--uf-responsive-panel-*` + overlay fallbacks — all inherited; Sheet contributes none.

### 7. Contract drift
- `.json.behavior.dragToDismiss: true` and `.json.composition` `handle` part — **NOT implemented** anywhere (no drag handler in Modal/Drawer/Sheet or machine; grep dragToDismiss = 0 hits). False capability advertised.
- `.json.aria` omits `describedBy` (Modal/Drawer include it) — inconsistent doc.
- Same string-vs-ReactNode drift as Modal.

### 8. Cleanup flags
- **Sheet ↔ Drawer overlap is total**: `Sheet(side)` === `Drawer(side ∈ {top,bottom})`. Drawer already handles all 4 sides. Sheet is pure redundancy kept for compat — candidate for deletion once compat window closes.
- Deprecated but its `.json` still documents rich behavior (drag-to-dismiss, handle) that neither it nor its replacement implements.

---

## Drawer

Files: `Drawer/Drawer.tsx`, `Drawer/Drawer.json`.

### 1. Governance
| field | value |
|---|---|
| category | overlay |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| **aliases** | **Sheet** |
| related | Modal, Panel |

### 2. Props
`Omit<ModalProps,'surface'|'variant'>` + adds:
| name | type | default | req | purpose |
|---|---|---|---|---|
| side | enum `left\|right\|top\|bottom` | `right` | no | slide-in side → Modal `variant` |
| edge | enum `inset\|flush` | derived (`top/bottom`→inset, `left/right`→flush) | no | viewport attachment/rounding |
| trigger | ReactNode | `'Open drawer'` | no | **non-empty default** (overrides Modal's undefined) |
| title | ReactNode | `'Drawer'` | no | **non-empty default** |
| children | ReactNode | `'Drawer content'` | no | **non-empty default** |

Plus all Modal props (open, closable, actions, width/height, onOpenChange, portal, autoFocusOnOpen, …). `surface` is chosen internally: `top/bottom→sheet`, else `dialog`.

### 3. Axes
- side: left / right / top / bottom
- edge: inset / flush
- derived surface: dialog (l/r) or sheet (t/b)

### 4. States
Inherits all Modal data-state/aria/focus. Adds classes `uf-drawer`, `uf-drawer--{inset|flush}`, `uf-drawer-positioner--{inset|flush}` and `data-drawer-edge={resolvedEdge}` (consumed by Modal to drop content border when `flush`). CSS keys off `data-variant=left|right|top|bottom`.

### 5. Anatomy
Same slot map as Modal (root/overlay/content/title/description/close). No own sub-components.

### 6. Tokens
`--uf-modal-side-w-default`, `--uf-modal-stack-h-default`, `--uf-modal-side-enter-x`, `--uf-modal-sheet-*`, runtime `--face-runtime-modal-w/h` + Modal overlay semantic fallbacks. No drawer-namespaced tokens (reuses modal namespace).

### 7. Contract drift
- `.json` documents `side` default `right` and `title`/`children`/`trigger` defaults — matches code. Good.
- Same string-vs-ReactNode typing drift.
- `.json` still lists full Modal prop surface including `width`/`height` (valid, passthrough).

### 8. Cleanup flags
- **Hard-coded content defaults** (`title='Drawer'`, `children='Drawer content'`, `trigger='Open drawer'`) are demo/placeholder values baked into the production component — a consumer rendering `<Drawer open>` gets literal "Drawer"/"Drawer content" text. These belong in the `.json` preview state, not the component default.
- `data-drawer-edge` passed through `...rest` and re-parsed by Modal — implicit contract between the two files.
- Alias/duplication with Sheet (see Sheet §8).

---

## Toast

Files: `Toast/Toast.tsx`, `Toast/Toast.json`, machine `assets/machines/toast.machine.ts`.
**Usage note: 0 usages in the app.** Exports from `index.ts`: **`Toaster`, `useToast`, `createToastContext`** (+ types `ToastAction`, `ToasterProps`). The `Toast` demo wrapper component is **NOT exported** from `index.ts` (only lives for playground/preview).

### 1. Governance
| field | value |
|---|---|
| category | feedback |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| related | Bar, Text |

### 2. Props
`.json` documents only the **demo wrapper** (`Toast`), not the real API:
| name | type | default | purpose |
|---|---|---|---|
| className | string | — | container class |
| showTrigger | boolean | true | demo trigger button |
| autoShow | boolean | false | auto-fire one sample toast |

Real API (in code, not fully in `.json`):
- `ToasterProps`: `className` + div attrs.
- `useToast(): { toast, dismiss }`.
- `toast(opts)` opts: `{ title?, description?, variant?, duration?, action?:{label,onClick} }` — `variant: default|success|error|warning`, `duration` (default 4000-ish via `defaultDuration`).
- `createToastContext({ maxVisible?, defaultDuration? })` → `{ toaster, useToast, Toaster }`; `maxVisible` default **3**.

### 3. Axes
- toast variant: default / success / error / warning (machine `ToastVariant`).
- placement: single group container (`uf-toaster`), no placement axis exposed.

### 4. States / a11y
- Group: `role="region"`, `aria-label="Notifications"`, `aria-live="polite"`.
- Item: `role="status"`, `aria-atomic=true`, `data-variant={variant}`.
- Close: `aria-label="Close notification"`.
- Auto-dismiss timers per toast; **pause on hover** implemented (`pauseToast`, MOUSEENTER). maxVisible trims oldest.
- Escape → dismissAll (per `.json`).
- CSS data-attrs on toast: only `data-scope`, `data-icon-only` (from Button/Bar). **No `data-variant` styling in CSS** — success/error/warning toasts render visually identical (variant is set as data attr but unstyled).

### 5. Anatomy / hooks
Classes: `uf-toaster`, `uf-toast`, `uf-toast-body`, `uf-toast-bar`, `uf-toast-title`, `uf-toast-description`, `uf-toast-actionRow`/`uf-toast-action`, `uf-toast-close`; demo: `uf-toast-demo`, `uf-toast-demo-trigger`, `uf-toast-trigger`. Built from `Card` (variant="floating"), `Bar`, `Button`, `Text`.
Exported: `Toaster` component, `useToast` hook, `createToastContext` factory (each factory call = isolated toaster + hook + component triple). Default singleton created at module load (`defaultContext`).

### 6. Tokens
Component: `--uf-toast-container-max-width`, `--uf-toast-surface-pad`, `--uf-toast-border-width`, `--uf-toast-compact-inset`. Fallbacks: `--uf-overlay-surface-*` (shares surface with Menu/Select/Popover/Tooltip), radius/font/control tokens. `.json` notes z-index is an unresolved implementation detail (no layer token).

### 7. Contract drift
- **`.json` documents the demo wrapper, not the shipping API.** The real surface (`toast()` signature, variants, duration, action, `createToastContext`, `maxVisible`) is undocumented in the contract file.
- `variant` (success/error/warning) is a first-class machine feature but has **no visual CSS** and no `.json` mention.
- `.json.aria.role: "status"` is the item role; group role is `region` — partially documented.

### 8. Cleanup flags
- **Dead-ish component**: 0 app usages; ships a module-level singleton `defaultContext` (side-effectful at import, creates timers infra) that nothing consumes.
- Toast variants are non-functional visually (data-only) — either wire CSS or drop the enum.
- `Toast` demo wrapper mixes preview scaffolding into the component file; not exported, so it's dead weight in the lib bundle.
- Toaster z-index unresolved (no token) — could render under other overlays.
- action button calls `toast.action.onClick` in an inline handler AND spreads `getActionProps()` — double wiring risk.

---

## Progress

Files: `Progress/Progress.tsx`, `Progress/Progress.json`, machine `assets/machines/progress.machine.ts`.

### 1. Governance
| field | value |
|---|---|
| category | feedback |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| related | Steps, Slider |

### 2. Props
| name | type | default | req | purpose / flag |
|---|---|---|---|---|
| value | number | 0 | no | current; **`-1` = indeterminate** (magic number) |
| max | number | 100 | no | max |
| variant | enum `default\|success\|warning\|error` | default | no | color |
| shape | enum `linear\|circle` | linear | no | form |
| showLabel | boolean | false | no | show `NN%` |
| label | ReactNode | — | no | header/side label |
| aria-label | string | — | no | a11y label when no visible label |
| className | string | — | no | — |

### 3. Axes
- variant: default / success / warning / error
- shape: linear / circle

### 4. States / a11y
- root: `role="progressbar"` (machine `getRootProps`) with `aria-valuenow/min/max`; `data-variant`, `data-shape`, `data-state="indeterminate"` when value=-1.
- `aria-label`/`aria-labelledby` wired (labelId only when `label` present).
- No keyboard/behavior (static indicator).
- CSS: `[data-shape="circle"]` (conic-gradient ring), `[data-variant=success|warning|error]`, `[data-state="indeterminate"]`, parts `[data-part=track|indicator|label]`.

### 5. Anatomy
Classes: `uf-progress`, `uf-progress__header`, `uf-progress__trackWrap`, `uf-progress-title` (label), `uf-progress-label` (value %). Parts via machine: root/track/indicator/label. Labels render through `Text`. No sub-components.

### 6. Tokens
Component: `--uf-progress-track-height`, `-track-inset-inline`, `-label-min-width`, `-circle-size`, `-track-bg`, `-indicator-bg`, `-indicator-{success,warning,error}-bg`, plus JS-set `--uf-progress-percent`. Fallbacks: control geometry, radius-full, motion tokens (loading/indefinite iteration for indeterminate).

### 7. Contract drift
- **BEM naming mismatch**: `.json.composition.parts` names are `track` / **`range`** (recommended `label`), but code/CSS emit **`indicator`** not `range` (`[data-part="indicator"]`, `getIndicatorProps`). The `range` part name is wrong/stale.
- `.json.props` **omits `aria-label`** which exists in `.tsx`.
- `.json` `className` description is a stub ("className prop").
- `value=-1` magic sentinel for indeterminate is undocumented as an enum/special value beyond a prose hint.

### 8. Cleanup flags
- `range` vs `indicator` part-name inconsistency (contract says range, impl says indicator).
- Magic `-1` sentinel instead of an explicit `indeterminate` prop.
- Circular shape ignores `indicatorProps.style` (only linear uses it) — divergent code paths for the two shapes.

---

## Tabs

Files: `Tabs/Tabs.tsx`, `Tabs/Tabs.json`, machine `assets/machines/tabs.machine.ts`.

### 1. Governance
| field | value |
|---|---|
| category | navigation |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| related | Accordion, SegmentedControl |

### 2. Props
| name | type | default | req | purpose / flag |
|---|---|---|---|---|
| items | `TabItem[]` | — | no | tab defs (see below) |
| **tabs** | `LegacyTabItem[]` | — | no | **legacy** alias (uses `id` not `value`); not in `.json` |
| value | string | — | no | controlled selection |
| **activeTab** | string | — | no | **legacy** controlled alias; not in `.json` |
| defaultValue | string | first enabled | no | uncontrolled initial |
| **defaultActiveTab** | string | — | no | **legacy** alias; not in `.json` |
| orientation | enum `horizontal\|vertical` | horizontal | no | list axis |
| activationMode | enum `automatic\|manual` | automatic | no | focus vs click activation |
| disabled | boolean | false | no | disable group |
| onValueChange | `(d:{value})=>void` | — | no | change cb |
| **onChange** | `(id)=>void` | — | no | **legacy** alias; not in `.json` |
| withLine | boolean | false | no | "components API compatibility" — line indicator |
| wrap | boolean | false | no | allow wrapping |
| membrane | boolean | true | no | per-trigger membrane wrapper |
| renderPanels | boolean | true | no | render internal panels |
| className | string | — | no | — |

`TabItem`: value, label, content, disabled?, panelId?, leadingIcon?, trailingIcon?, actionIcon?, actionLabel?, actionTitle?, actionDisabled?, actionVisibility (`hover|always`), actionPosition (`right|left-overlay`), onAction.

### 3. Axes
- orientation: horizontal / vertical
- activationMode: automatic / manual
- action overlay: visibility hover/always, position right/left-overlay
- style flags: withLine, wrap, membrane

### 4. States / a11y
- root/list `role="tablist"`; triggers `role="tab"` with `data-state="active"`, `data-disabled`, `data-value`; content `role="tabpanel"`.
- Roving focus (`rovingFocus`); Arrow keys (dir by orientation), Home/End, Enter/Space activate in manual mode.
- Custom effect scrolls/focuses the `focusedValue` trigger (`scrollIntoView`).
- CSS data-attrs: `data-state="active"`, `data-disabled`, `data-position="left"` (icon), `data-action-overlay`, `data-action-position="left-overlay"`, `data-action-visibility="always"`, `data-membrane-hover`.

### 5. Anatomy
Classes: `uf-tabs`, `uf-tabs--withLine`, `uf-tabs--wrap`, `uf-tabs-header` (list), `uf-tabs-tab`, `uf-tabs-tabSlot`, `uf-tabs-tabIcon`, `uf-tabs-tabLabel`, `uf-tabs-tabAction`/`-tabActionIcon`, `uf-tabs-indicator`, `uf-tabs-content`. Membrane wrapper `uf-membrane`. Flat API (no compound `Tabs.Tab`). String labels/content route through `Text`.

### 6. Tokens
Component: `--uf-tabs-rail-h`, `--uf-tabs-indicator-h`, `--uf-tabs-line-gap`. Fallbacks: control height/pad, radius-full, membrane, motion tokens.

### 7. Contract drift
- **Four legacy props absent from `.json`**: `tabs`, `activeTab`, `defaultActiveTab`, `onChange`. Undocumented compat surface.
- `.json` `wrap` description ("Allow tabs list wrapping") differs from `.tsx` comment; minor.
- TabItem's rich action API (actionIcon/actionLabel/actionVisibility/actionPosition/onAction/leadingIcon/trailingIcon/panelId) is only described in prose inside the `items` prop description, not structured in `.json`.

### 8. Cleanup flags
- Legacy dual API (`tabs`/`id` vs `items`/`value`, `activeTab`, `defaultActiveTab`, `onChange`) — significant compat cruft; consider deprecation path.
- `withLine` labeled "components API compatibility" — legacy naming smell (like Modal's `closeOnOverlayClick`).
- Focus effect uses `querySelectorAll('[role="tab"][data-value]')` + `behavior:'smooth'` — DOM-scraping side effect, ignores reduced-motion.
- `aria-controls` overridden by `panelId` — external-panel mode can desync ids if `renderPanels` and `panelId` both set.

---

## Accordion

Files: `Accordion/Accordion.tsx`, `Accordion/Accordion.json`, machine `assets/machines/accordion.machine.ts`.

### 1. Governance
| field | value |
|---|---|
| category | navigation |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| related | Tabs |

### 2. Props
| name | type | default | req | purpose / flag |
|---|---|---|---|---|
| items | `AccordionItem[]` | **`buildDefaultItems()`** | no | item defs (value,label,icon?,content,disabled?) |
| icon | ReactNode | — | no | default trigger icon |
| expandedIds | string[] | — | no | controlled expanded |
| defaultExpandedIds | string[] | — | no | uncontrolled initial |
| multiple | boolean | true | no | allow multi-open |
| collapsible | boolean | true | no | allow closing last open |
| disabled | boolean | false | no | disable all |
| onExpandedChange | `(d:{expandedIds})=>void` | — | no | change cb |
| className | string | — | no | — |
| **legacyItems** | `{id?,summary,content,isOpen?,disabled?}[]` | — | no | **legacy**; not in `.json` |
| **onChange** | `(expandedIds)=>void` | — | no | **legacy** alias; not in `.json` |

### 3. Axes
- multiple: true/false (multi vs single open)
- collapsible: true/false

### 4. States / a11y
- root `role` via machine; items `[data-part="item"]`, trigger `[data-part="trigger"|"item-trigger"]` with `data-state="open"`; content region.
- Triggers are native `<button>` with `aria-controls={contentId}`, content `aria-labelledby={triggerId}` — ids built from `useId()` (`accordion:<inst>:<part>:<value>`).
- Keyboard: ArrowUp/Down between triggers, Home/End, Enter/Space toggle.
- `.json.aria.role: "region"` for content; triggers native buttons.

### 5. Anatomy
Classes: `uf-accordion`, `uf-accordion-icon`, `uf-accordion-label`, `uf-accordion-arrow` (RightIcon), `uf-accordion-content-inner`, `uf-accordion-slot`, `uf-accordion-contentText`. Membrane `uf-membrane uf-membrane--full`. Content is **flattened** (Fragment children split into per-node `uf-accordion-slot` wrappers) so nested controls keep full-width insets. Flat API. String content → `Text`.

### 6. Tokens
Component: **none** (empty `component` array — intentional per notes). Fallbacks: control geometry, icon-size, radius, color, motion tokens. Deliberately uses shared control tokens.

### 7. Contract drift
- `legacyItems` + `onChange` legacy props absent from `.json`.
- `.json` claims `icon` type `string`, but code accepts ReactNode (string→Icon, node→direct). Under-specified.
- `.json.aria.role` "region" is content role only; trigger semantics in prose.
- items `string` typing in `.json` vs `AccordionItem[]`.

### 8. Cleanup flags
- **`buildDefaultItems()` bakes a full 3-section demo (with Buttons "Install package", "Delete setup", etc.) as the default when no `items` given** — production placeholder content shipping in the component (same anti-pattern as Drawer defaults, but heavier).
- Legacy `legacyItems`/`summary`/`isOpen`/`onChange` shim undocumented.
- `flattenAccordionContent` uses `try/catch` around `Children.toArray` and inspects `content.type === Fragment` — fragile content introspection.
- `data-part` naming inconsistency in CSS: both `trigger` and `item-trigger` appear.

---

## Steps

Files: `Steps/Steps.tsx`, `Steps/Steps.json`, machine `assets/machines/steps.machine.ts`.

### 1. Governance
| field | value |
|---|---|
| category | navigation |
| status | stable |
| a11yReviewed | true |
| mobileReviewed | true |
| related | Progress |

### 2. Props
| name | type | default | req | purpose |
|---|---|---|---|---|
| items | `StepItem[]` (`{label, content?}`) | `[]` | no | step defs |
| step | number | — | no | controlled 0-based index |
| defaultStep | number | 0 | no | uncontrolled initial |
| linear | boolean | true | no | prevent skipping |
| disabled | boolean | false | no | disable all |
| onStepChange | `(d:{step})=>void` | — | no | change cb |
| className | string | — | no | — |

No legacy props (cleanest of the set).

### 3. Axes
- linear: true/false (linear vs non-linear navigation)

### 4. States / a11y
- root `role="list"`, `aria-label="Steps"` (machine). Triggers with `aria-current="step"` on active step, `data-state="active|completed|upcoming"` (machine `getStepState`: index<step → completed, in `completed[]` → completed, index===step → active, else upcoming). Indicator + content also carry `data-state`.
- Completion tracked in machine (`completed[]`, `progress` computed %).
- Linear disable rule: `disabled || (linear && index > step+1 && !completed.includes(index))` — steps beyond next are disabled.
- Keyboard: ArrowLeft/Right move focus between steps (per `.json`; machine focus events).
- CSS data-attrs: `[data-part="trigger"]`, `[data-scope="steps"]`, `data-state` (from machine, styled via scope).

### 5. Anatomy
Classes: `uf-steps`, `uf-steps-list`, `uf-steps-item`, `uf-steps-trigger` (+ `uf-option uf-control`), `uf-steps-indicator`, `uf-steps-label`. Membrane `uf-membrane`. Indicator uses **circled-number glyphs** `①..⑳` via `getCircledStepSymbol` (falls back to plain number >20). Labels/content → `Text`. Flat API.

### 6. Tokens
Component: **none**. Fallbacks: control geometry, `--uf-steps-indicator-width` (listed under semanticFallbacks though it's steps-namespaced — misfiled), radius, font-weight, colors. Intentionally token-light.

### 7. Contract drift
- `.json.composition` declares a **`separator`** part (recommended) — **no separator is rendered** in `.tsx` (and no `uf-steps-separator` CSS). Advertised-but-absent part.
- `.json.aria.role: "list"` matches; step items should arguably be `role="listitem"` — not verified in emitted props.
- `--uf-steps-indicator-width` is placed under `semanticFallbacks` but is a component-scoped token (should be in `component`).
- `.json.behavior` is empty `{}` despite real completion/linear behavior in the machine.

### 8. Cleanup flags
- **Circled-glyph indicators `①..⑳`** are a hard cap + typographic hack; steps >20 silently degrade to bare numbers, and glyph rendering is font-dependent (a11y/cross-platform risk).
- `separator` part documented but never implemented.
- No visible "completed vs upcoming" affordance beyond data-state styling; relies entirely on CSS.
- ArrowUp/Down not handled (only Left/Right) — vertical step layouts would lack keyboard nav.

---

## Cross-cutting findings

1. **Overlay engine consolidation is real and clean**: Modal ← Drawer ← Sheet. But it leaks: `data-drawer-edge` travels through `...rest` as a stringly-typed side-channel between Drawer and Modal.

2. **Sheet is fully redundant** with Drawer (Drawer covers top/bottom + all sides). Deprecated, exported only via `compat.ts`. Its `.json` advertises **drag-to-dismiss + a handle part that do not exist** in the codebase. Safe-delete candidate post-compat.

3. **Documented-but-unimplemented contracts** (production readiness gaps):
   - Modal/Drawer/Sheet: `.json scrollLock: true` and `platform.inert: true` — **no scroll lock, no inert/background hiding** in `modal.machine.ts`. Real a11y hole (background scroll + AT reachable).
   - Sheet: `dragToDismiss`, `handle` part — absent.
   - Steps: `separator` part — absent.
   - Progress: part named `range` in contract, emitted as `indicator`.

4. **Placeholder/demo content shipped as component defaults**: Drawer (`title='Drawer'`, `children='Drawer content'`), Accordion (`buildDefaultItems()` full demo with real Buttons), Toast (`Toast` demo wrapper + module-level singleton). These belong in `.json` preview states, not runtime defaults.

5. **Undocumented legacy compat surfaces** (in `.tsx`, missing from `.json`): Modal (`isOpen`,`onClose`), Tabs (`tabs`,`activeTab`,`defaultActiveTab`,`onChange`), Accordion (`legacyItems`,`onChange`). "components API compatibility" props (`closeOnOverlayClick`, `withLine`) are legacy-naming smells.

6. **Systemic type drift**: `.json` types ReactNode props as `string` (title/description/children/content/label/icon) across every component.

7. **Toast**: 0 app usages; ships side-effectful module-level singleton; variants (success/error/warning) are data-only with **no CSS styling**; z-index unresolved (no layer token). Exports `Toaster`/`useToast`/`createToastContext` only — the `Toast` demo component is not exported.

8. **Magic numbers**: Progress `value=-1` = indeterminate; Steps `①..⑳` glyph cap at 20; overlay breakpoint 900 duplicated between registry governance and code constant.
