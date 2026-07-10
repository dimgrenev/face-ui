# Face UI — App Usage Audit (production audit, read-only)

**Scope:** `userface-app/` — measured across `packages/` and `apps/` (the desktop shell in
`apps/desktop/web` also consumes Face UI). The vendored library snapshot
`userface-app/packages/face-ui-react/` is **excluded** from all usage counts, as are
`node_modules/` and `public/` (the bundled `public/runtime/sandbox/vendor-bundle.js` is a build
artifact, not source usage). Counts below are **production usage only** — `*.test.*` and
`*Fixture*` files are excluded so the numbers reflect the shipping surface.

**Method:** A custom JSX-tag parser (brace/string-aware, multiline-aware, dash-aware for
`aria-*`/`data-*`) walked all 325 `.tsx` source files, extracted every `<Component …>` opening tag,
and collected the union of prop names + literal values for `variant`/`size`/`tone`/`intent`/etc.
Library public prop interfaces were read from `packages/face-ui-react/<Name>/<Name>.tsx` and
`assets/Icon.tsx`, then diffed against the app's actual prop set to flag non-API usage.

---

## Key architectural finding: consumption is via a thin wrapper layer

The app does **not** mostly import Face UI directly. Instead it consumes it through its own
`@userface/app-ui/<Name>/<Name>` wrapper package. The wrappers are pass-through:

```tsx
// packages/userface-app-ui/Button/Button.tsx
export interface ButtonProps extends Omit<FaceUiButtonProps, 'icon'> { icon?: React.ReactNode; }
export const Button = forwardRef(function Button({ icon, ...props }, ref) {
  const resolvedIcon = typeof icon === 'string' ? <Icon name={icon} /> : icon;
  return <FaceUiButton ref={ref} icon={resolvedIcon} {...props} />;   // ← spreads everything through
});
```

Wrappers that re-export Face UI 1:1 (spread `{...props}`): **Text, Button, Icon** (and
`Input`, `Select`, `Tile`, `Modal`, `Badge`, `Switcher`, `Slider`, `Checkbox`, `Table`, `Menu`,
`Bar`, `Radio` are imported directly from `@userface/face-ui-react/<Name>/<Name>` at their call
sites). The only wrapper-level transform is `icon`: the app normalizes a **string** `icon`/name
into `<Icon name=…>`, so `Text`/`Button` accept `icon?: React.ReactNode | string` — a superset of
the library's `icon?: ReactNode`.

**Implication for the library team:** because the wrappers forward props verbatim, the JSX prop
surface measured across the app *is* the effective Face UI prop contract. Any prop rename/removal in
the library propagates straight to app call sites. The `icon`-as-string convenience is the single
app-side deviation and is handled entirely in `app-ui`, so the library `icon: ReactNode` contract is
safe.

---

## Top-level summary table

Usage count = production JSX occurrences (tests/fixtures excluded). "Load-bearing props" = props
whose rename/removal would break the app (high-frequency and/or structurally required).

| Component | Usage | Concentrated in | Load-bearing props (do NOT rename/remove) |
|-----------|------:|-----------------|-------------------------------------------|
| **Text** | 1717 | app-ui everywhere; `ProjectMap/*`, `UnifiedPanel`, `Chat/*` | `text`, `as`, `variant`, `size`, `inset`, `membrane`, `truncate`, `align`, `icon`, `fullWidth` + HTML passthrough (`className`, `aria-*`, `data-*`, `style`) |
| **Button** | 502 | `ProjectMap/*`, `Chat/*`, `apps/desktop/web`, `UnifiedPanel` | `text`, `variant`, `onClick`, `disabled`, `icon`, `iconOnly`, `iconPosition`, `fullWidth`, `align`, `loading`, `selector`/`selectorOpen`/`selectorDirection`, `level`, `stretchText`, `membrane`, `type` |
| **Input** | 107 | `PropsEditor/*`, `ProjectMap/*`, `apps/desktop/web` settings | `value`, `type`, `onValueChange`, `disabled`, `label`, `placeholder`, `textLayout`, `membrane`, `ariaLabel`, `error`, `autoGrow`, `stretchText`, `readOnly`, `required` |
| **Icon** | 99 | app-ui everywhere (via Text/Button `icon` string + direct) | `name` (required), `className` |
| **Select** | 50 | `ProjectMap/*`, `PropsEditor/*`, `apps/desktop/web` settings | `options`, `value`, `onValueChange`, `ariaLabel`, `label`, `disabled`, `stretchText` |
| **Tile** | 28 | `ProjectMap/DesignSystemSidebar`, `UnifiedPanel`, `Chat/AgentSidebar` | `intent`, `align`, `onClick`, `active`, `fullWidth`, `actionVisibility`, `level`, `actions`, `text`, `selector`/`selectorOpen`, `density`, `interactive`, `tone` |
| **Modal** | 17 | `ProjectMap/*`, `Chat/Overlays`, `apps/desktop/web` | `open`, `onOpenChange`, `title`, `variant`, `width`, `description`, `surface`, `closeOnOverlayClick` |
| **Badge** | 20 | `Chat/*`, `ProjectMap/DesignSystemWorkspace` | `appearance`, `text`, `variant` |
| **Card** | **2** | `Chat/Context/PropsQuickEdit`, `Chat/Overlays/TopUpModal` | `membrane`, `className` (barely used — see note) |
| **Switcher** | 21 | `PropsEditor/*`, `Playground/*`, `apps/desktop/web` settings | `checked`, `onCheckedChange`, `withText`, `text`, `disabled` |
| **Slider** | 11 | `PropsEditor/FontPropsPanel`, `components/ColorPicker` | `min`, `max`, `step`, `value`, `onValueChange`, `label`, `crop`/`cropRange`/`cropLocksValue`/`onCropChange` |
| **Checkbox** | 8 | `ProjectMap/DesignSystemWorkspace`, `Chat/*` | `checked`, `onCheckedChange`, `membrane`, `disabled`, `label` |
| **Table** | 7 | `ProjectMap/DesignSystemWorkspace`, `Chat/runtime/MarkdownBody` | `columns`, `rows`, `rowKey`, `stickyHeader`, `showDividers`, `membrane`, `onRowClick` |
| **Menu** | 7 | `apps/desktop/web/DesktopTitlebar`, `Chat/Composer/*` | `items`, `onSelect`, `surfaceTitle`, `trigger`, `align`, `sideOffset` |
| **Bar** | 7 | `UnifiedPanel`, `Playground/*`, `components/OverlayShell` | compound API: `Bar`, `Bar.LeftEllipsis`, `Bar.Right` (subcomponents load-bearing) |
| **Radio** | 5 | `PropsEditor/FontPropsPanel`, `Playground/PlaygroundOverlays` | `options`, `value`, `onValueChange`, `name` |
| **Toast** | 0 `<Toast>` JSX — **but used via API** | `apps/desktop/web/*`, `UnifiedPanel` | `useToast()` hook + `<Toaster/>` mount — **load-bearing, see deprecated section** |
| Toggle / Overlay / Sheet / Date / Carousel | **0** | — | none (fully unused — see deprecated section) |

> **Card caveat:** the ~31 figure in the audit brief is a false positive — it counts app-specific
> components named `*Card` (`ToolCallCard`, `PlanCard`, `CommandCard`, `ChangeSetCard`, `PatchCard`,
> `PaymentStatusCard`, …), which are **not** the Face UI `Card`. Real Face UI `<Card>` usage is **2**.

---

## Per-component detail

### Text — 1717 uses
- **Where:** ubiquitous. Densest in `packages/userface-app-ui/ProjectMap/DesignSystemWorkspace.tsx`
  (836), `DesignSystemAlignmentWorkspace.tsx` (126), `UnifiedPanel/UnifiedPanel.tsx` (51),
  `Chat/runtime/ChangeSetCard` (38), plus `apps/desktop/web/*`.
- **Props (union):** `as` (1632), `className` (1358), `inset` (1189), `membrane` (1162), `text`
  (573), `variant` (387), `size` (318), `truncate` (92), `style`, `role`, `id`, `aria-*`, `data-*`,
  `title`, `align` (10), `fullWidth` (10), `status`, `icon` (7), `htmlFor`(`label`), `hidden`,
  `aria-live`, `date`/`time`, `aria-atomic`, `aria-busy`, `tone`.
- **`variant` values used:** `muted` (203), `body` (68), `h2` (29), `code` (24), `caption` (21),
  `label` (18), `markdown` (7), `default` (6), `h1` (3), `h3` (2) + several ternaries between
  `body`/`muted`. **Not seen:** `kbd`, `h4`/`h5`/`h6`, `strong`, `em`, `small` (if these are library
  variants they are unused by the app).
- **`size` values:** `sm` (212), `xs` (91), `lg` (8), `md` (6), `xl` (1) — all five sizes used.
- **`align`:** `left` (9), `right` (1). **`inset`:** used 1189× (values `control`/`none`) — heavily
  load-bearing. **`membrane`:** 1162× boolean — heavily load-bearing.
- **Representative sites:**
  - `packages/userface-app-ui/Chat/runtime/ChangeSetCard/ChangeSetCard.tsx:789` — `<Text as="p" className={s.empty} text="…" {...textProps} />`
  - `packages/userface-app-ui/ProjectMap/DesignSystemWorkspace.tsx:836` (region of heaviest use)
  - `apps/desktop/web/DesktopBillingSection.tsx:27`
- **Non-API props:** none. All resolve to `TextProps` or its `HTMLAttributes<HTMLElement>` base.

### Button — 502 uses
- **Where:** `ProjectMap/DesignSystemWorkspace` (151), `UnifiedPanel` (29), `PropsEditor/FontPropsPanel`
  (24), `apps/desktop/web/DesktopTitlebar` (17), `Chat/Composer/*`.
- **Props (union, high→low):** `onClick` (479), `variant` (402), `fullWidth` (389), `text` (354),
  `disabled` (247), `type` (222), `className` (203), `aria-*` (179), `icon` (151), `title` (132),
  `label`(aria-label) , `iconOnly` (96), `membrane` (90), `data-*` (76), `align` (58), `active`,
  `aria-expanded`, `selector`/`selectorOpen`/`selectorDirection`, `loading` (14), `iconPosition`
  (12), `level` (10), `stretchText` (6), `copyText` (2), plus event handlers
  (`onMouseEnter/Leave/Down`, `onFocus`, `onKeyDown`, `onPointerDown`) and native attrs.
- **`variant` values:** `default` (233), `ghost` (68), `accent` (54), `primary` (11),
  `destructive` (5), `outline` (5), `suggestion` (4), `secondary` (2) + many ternaries selecting
  `accent`/`ghost`/`default`. **All are load-bearing;** `destructive` is the only "danger"-style
  variant used (no `delete`/`danger` alias — see deprecated section).
- **`type`:** `button` (220), `submit` (2). **`align`:** `left`/`right`/`center`.
- **Boolean states used:** `disabled`, `loading`, `iconOnly`, `fullWidth`, `stretchText`,
  `selectorOpen`, plus `aria-pressed`/`aria-selected`/`aria-checked`/`aria-expanded` for toggle
  semantics.
- **Representative sites:**
  - `packages/userface-app-ui/Chat/Composer/ChatComposerControls.tsx:487` — `<Button className=… {...chatRowActionButtonProps} role="menuitemradio" aria-checked=… disabled=… data-selected=… onClick=… >`
  - `packages/userface-app-ui/ProjectMap/DesignSystemWorkspace.tsx:151`
  - `apps/desktop/web/DesktopTitlebar.tsx:17`
- **Non-API props:** none once dashed attrs are resolved. NB: some call sites spread object props
  (`{...chatRowActionButtonProps}`), so a few props arrive via spread and are not individually
  visible to static analysis.

### Input — 107 uses
- **Where:** `PropsEditor/*` (`PropsEditor`, `PropControls`, `FeldGalleryPropsPanel`),
  `ProjectMap/DesignSystemWorkspace`, `apps/desktop/web` settings sections.
- **Props (union):** `value` (107), `type` (88), `onValueChange` (85), `disabled` (74), `membrane`
  (65), `textLayout` (63), `label` (58), `placeholder` (48), `ariaLabel` (21), `onChange` (21),
  `onKeyDown`, `className`, `autoFocus`, `stretchText`, `onBlur`, `error` (5), `autoGrow` (4),
  `required`, `readOnly`, `spellCheck`, `maxLength`, `description`, `min`/`max`/`step`, `autoComplete`,
  `onFocus`, `icon`.
- **`type` values:** `default` (60), `text` (19), `password` (5), `number` (2), `email` (2).
  Note the app relies on `type="default"` — confirm this is a valid `InputProps['type']` literal.
- **Non-API props:** `aria-invalid` (1) is passed but `InputProps` does not extend `HTMLAttributes`
  and has no `aria-invalid` field (it exposes `ariaExpanded`/`ariaControls`/etc. as named props).
  Low-severity passthrough — flag.
- **Representative sites:** `PropsEditor/PropControls.tsx:175`,
  `ProjectMap/DesignSystemWorkspace.tsx:3595`, `apps/desktop/web/DesktopMcpSettingsSection.tsx`.

### Icon — 99 uses (direct JSX; plus many more indirect via Text/Button `icon="name"`)
- **Props (union):** `name` (99, effectively required), `className` (36), `aria-hidden` (4),
  `hidden` (4), `size` (1, `{16}`), `title` (1).
- **Non-API props:** `aria-hidden`/`hidden` — `IconProps` has no `HTMLAttributes` base (fields are
  `name`, `icon`, `src`, `size`, `square`, `className`, `style`, `label`, `title`). The library
  handles decorative icons internally via `label` omission, so app-passed `aria-hidden` is a
  passthrough that may be dropped. `size` is documented compat-only (Face UI icons render 20×20).
- **Representative sites:** `UnifiedPanel/UnifiedPanel.tsx:12`, `apps/desktop/web/DesktopTitlebar.tsx:11`.

### Select — 50 uses
- **Props (union):** `options` (50), `value` (50), `ariaLabel` (49), `onValueChange` (48),
  `stretchText` (39), `label` (38), `disabled` (35), `membrane`, `variant`, `placeholder`,
  `onChange`, `triggerClassName`, `valueClassName`, `surface`, `surfaceTitle`, `contentMinWidth`,
  `displayValue`.
- **`variant` values:** `side` (1), `iconOnly` (1) — barely used; core Select is prop-driven not
  variant-driven.
- **Non-API props:** none.
- **Representative sites:** `PropsEditor/PropControls.tsx`, `ProjectMap/DesignSystemWorkspace.tsx:12737`,
  `apps/desktop/web/DesktopAgentSettingsSection.tsx`.

### Tile — 28 uses
- **Where:** `ProjectMap/DesignSystemSidebar`, `UnifiedPanel`, `apps/desktop/web/DesktopSettingsDialog`,
  `Chat/AgentSidebar/*`, `StartScreen`.
- **Props (union):** `align` (27), `intent` (26), `className` (26), `fullWidth` (23), `onClick`
  (23), `aria-*` (22), `actionVisibility` (14), `active` (13), `data-*` (13), `title`, `level` (10),
  `actions` (10), `text`, `selector`/`selectorOpen` (9), `membrane`, `density` (6), `label`,
  `interactive` (5), `aria-controls`, `aria-current`, `tone`, `selectedDescendant`, `aria-expanded`,
  `icon`, `variant` (2), `truncate`, `busy`, `disabled`, drag handlers, `orientation`, `status`.
- **`intent` values:** `disclosure` (9), `navigation` (8), `section` (4), `option` (2), `tree` (2),
  `tab` (1) — all load-bearing.
- **`align`:** `left` (27). **`level`:** `{0}`/`{1}`. **`variant`:** `default` (2).
  **`tone`:** `destructive`/`muted`/`neutral`/`accent` (via ternaries).
- **Boolean states:** `active`, `interactive`, `busy`, `disabled`, `selectorOpen`,
  `selectedDescendant`, `fullWidth`, `truncate`.
- **Non-API props:** none (`Tile extends HTMLAttributes<HTMLDivElement>`).
- **Representative sites:** `ProjectMap/DesignSystemSidebar.tsx:205`, `UnifiedPanel/UnifiedPanel.tsx`,
  `Chat/AgentSidebar/AgentSidebarThreads.tsx`.

### Modal — 17 uses
- **Props (union):** `open` (17), `onOpenChange` (17), `title` (17), `variant` (17), `width` (14),
  `description` (5), `className`, `surface` (3), `closeOnOverlayClick` (2), `closable` (1),
  `backdropClassName`, `positionerClassName`, `style`.
- **`variant` values:** `center` (17) — **only `center` is used.** Other Modal variants (if any)
  are dead surface from the app's perspective.
- **Non-API props:** none.
- **Representative sites:** `ProjectMap/DesignSystemSettingsModal.tsx:65`,
  `Chat/Overlays/TopUpModal.tsx:425`, `apps/desktop/web/DesktopSettingsDialog.tsx`.

### Badge — 20 uses
- **Props (union):** `appearance` (20), `text` (19), `className` (18), `variant` (17), `aria-label`,
  `label`.
- **`variant` values:** `secondary` (7), `accent` (2), `default` (1), `destructive` (via ternary)
  + `statusVariant(...)` helper calls. **`appearance`** is passed on every Badge — load-bearing.
- **Non-API props:** none.
- **Representative sites:** `Chat/AgentSidebar/BackgroundTaskList/BackgroundTaskList.tsx`,
  `ProjectMap/DesignSystemWorkspace.tsx:7626`, `Chat/runtime/CommandCard/CommandCard.tsx`.

### Card — 2 uses
- **Props:** `membrane` (2), `className` (2). Essentially unused. Only `Chat/Context/PropsQuickEdit.tsx:168`
  and `Chat/Overlays/TopUpModal.tsx:344`. Safe to evolve aggressively.

### Switcher — 21 uses
- **Props (union):** `withText` (21), `checked` (21), `onCheckedChange` (21), `text` (10),
  `disabled` (7), `className`, `title`, `membrane`. **All three core props on every instance.**
- **Non-API props:** none.
- **Representative sites:** `PropsEditor/PropsEditor.tsx`, `apps/desktop/web/DesktopMcpSettingsSection.tsx`,
  `apps/desktop/web/DesktopAppearanceSettingsSection.tsx`.

### Slider — 11 uses
- **Props (union):** `min`/`max`/`step`/`value`/`onValueChange`/`label` (all 11), `aria-label` (11),
  `crop`/`cropLocksValue`/`cropRange`/`onCropChange` (2 each), `className`, `disabled`.
- **Crop feature is used** (`components/ColorPicker.tsx`) — the `crop*` prop family is load-bearing
  for at least one call site.
- **Non-API props:** `aria-label` (11) — `SliderProps` doesn't extend `HTMLAttributes` and has no
  `aria-label` field (it exposes `label`). Every Slider passes `aria-label`; if the library drops it
  on the floor, sliders are unlabeled for a11y. **Flag for the library team.**
- **Representative sites:** `PropsEditor/FontPropsPanel.tsx:2032`, `PropsEditor/BoundedNumberControl.tsx:74`.

### Checkbox — 8 uses
- **Props:** `checked` (8), `membrane` (8), `onCheckedChange` (8), `disabled` (4), `label` (2),
  `className`. Non-API: none.

### Table — 7 uses
- **Props:** `columns`/`rows`/`rowKey`/`stickyHeader`/`showDividers` (all 7), `membrane` (6),
  `onRowClick` (2), `resizable`/`onColumnResize`/`activeRowId`/`ariaLabel` (1). Non-API: none.
- Concentrated in `ProjectMap/DesignSystemWorkspace.tsx`.

### Menu — 7 uses
- **Props:** `items`/`surfaceTitle`/`onSelect` (all 7), `className`, `trigger` (3), `disabled`,
  `onOpenChange`, `align` (`start`), `sideOffset`. Non-API: none.
- **Representative sites:** `apps/desktop/web/DesktopTitlebar.tsx`, `Chat/Composer/BranchSelector.tsx:368`.

### Bar — 7 uses (compound component)
- Used as a layout primitive: `<Bar> … <Bar.LeftEllipsis/> <Bar.Right/> </Bar>`. Only `className`
  appears as a prop; the **load-bearing surface is the compound subcomponent API**
  (`Bar.LeftEllipsis`, `Bar.Right`), not props. Renaming/removing those subcomponents breaks
  `UnifiedPanel`, `OverlayShell`, `Playground/*`.

### Radio — 5 uses
- **Props:** `options`/`value`/`onValueChange` (all 5), `name` (4). Non-API: none.
  In `PropsEditor/FontPropsPanel.tsx` and `Playground/PlaygroundOverlays.tsx`.

---

## Deprecated / alias / zero-usage findings

| Item | Brief expectation | Actual in codebase | Verdict |
|------|-------------------|--------------------|---------|
| `variant="delete"` / `"danger"` | possibly present | **0 occurrences** anywhere | No deprecated variant to migrate. App uses `variant="destructive"` on Button. |
| **Toggle** | ~3 uses | **0** JSX, **0** imports | **Fully unused — safe to remove.** (The only "Toggle" matches are inside the excluded `vendor-bundle.js` build artifact, unrelated Radix internals.) |
| **Overlay** | ~2 uses | **0** JSX, **0** imports | **Fully unused — safe to remove.** |
| **Sheet** | zero | **0** | Confirmed unused. |
| **Date** | zero | **0** JSX/imports (only referenced in generated `runtime-manifest.json` catalog) | Confirmed unused as a component. |
| **Carousel** | zero | **0** JSX/imports (only in `runtime-manifest.json` catalog) | Confirmed unused as a component. |
| **Toast** | zero | **0 `<Toast>` JSX, but LOAD-BEARING via imperative API** | **Correction: Toast is used.** `useToast()` hook + `<Toaster/>` mount. See below. |

### Toast is NOT removable — used via hook + Toaster
- `apps/desktop/web/AppShell.tsx:43` imports `useToast`; `:688` calls `const { toast } = useToast();`
- `apps/desktop/web/DesktopMainSurface.tsx:20` imports `Toaster`; `:616` mounts `<Toaster />`
- `packages/userface-app-ui/UnifiedPanel/UnifiedPanel.tsx:131` imports `useToast`; `:771` calls it.

The `useToast()` return shape (`{ toast }`) and the `<Toaster/>` mount component are load-bearing.
A `<Toast>` JSX audit would wrongly conclude Toast is dead — it is consumed imperatively.

---

## Non-API / passthrough props flagged for the library team

Only three genuine cases exist (everything else maps cleanly to the public prop interfaces or their
`HTMLAttributes` bases). All three are components whose prop interface does **not** extend
`HTMLAttributes`, so a11y attributes passed by the app may be silently dropped:

1. **Slider `aria-label`** — passed on **all 11** call sites, but `SliderProps` has no
   `aria-label`/`HTMLAttributes`. Highest-impact of the three (a11y-relevant, 100% of call sites).
2. **Icon `aria-hidden`** — 4 call sites; `IconProps` has no `HTMLAttributes` base. Library manages
   decorative state via `label` omission.
3. **Input `aria-invalid`** — 1 call site; `InputProps` exposes named `ariaExpanded`/`ariaControls`
   etc. but not `aria-invalid`.

App-side deviation (not a bug): `Text`/`Button` accept `icon` as `string | ReactNode` — the extra
`string` form is resolved to `<Icon name>` inside the `@userface/app-ui` wrapper, so the library's
`icon: ReactNode` contract is untouched.

---

## Load-bearing surface — bottom line

Highest-risk-to-change (used on hundreds/thousands of call sites, breaking the app if renamed):

- **Text:** `text`, `as`, `variant` (esp. `muted`/`body`/`h2`/`code`/`caption`/`label`), `size`
  (all of `xs…xl`), `inset`, `membrane`, `truncate`.
- **Button:** `text`, `variant` (`default`/`ghost`/`accent`/`primary`/`destructive`/`outline`/
  `suggestion`/`secondary`), `onClick`, `disabled`, `icon`, `iconOnly`, `fullWidth`, `loading`,
  `selector*`, `type`.
- **Input:** `value`, `type` (incl. literal `"default"`), `onValueChange`, `disabled`, `label`,
  `textLayout`, `membrane`.
- **Icon:** `name`.
- **Select:** `options`, `value`, `onValueChange`, `ariaLabel`, `label`, `stretchText`.
- **Tile:** `intent` (all 6 values), `align`, `onClick`, `active`, `actionVisibility`, `actions`,
  `level`, `selector*`.
- **Modal:** `open`, `onOpenChange`, `title`, `variant="center"`, `width`.
- **Switcher:** `checked`, `onCheckedChange`, `withText`, `text`.
- **Cross-cutting:** `membrane` (Text 1162×, plus Input/Checkbox/Table/Card/Tile) and `inset`
  (Text 1189×) are the two most pervasive Face-UI-specific layout props — treat as frozen contract.

Cleanup that is **unblocked**: removing **Toggle, Overlay, Sheet, Date, Carousel** (zero usage) and
the `variant="delete"`/`"danger"` alias (never used). Cleanup that is **blocked**: **Toast** must
stay (imperative `useToast` + `<Toaster/>`).
