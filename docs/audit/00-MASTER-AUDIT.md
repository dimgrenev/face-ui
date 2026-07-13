# Face UI — Deep Production Audit (master)

> Historical snapshot: this audit records the pre-consolidation API. Public
> `Drawer` and `Sheet` were removed after the audit; their centered and edge
> surface use cases now belong to `Modal` through `placement` and `edge`.

> Date: 2026-07-09 · Scope: `@userface/face-ui-react` (48 components, design-system, runtime CSS) + how `userface-app` consumes it.
> Goal: bring the library to enterprise/production grade — remove legacy, systematize props/states/variants/styles — **without breaking the app**.
> This is the index + synthesis. Per-area detail lives in the sibling files (`01`…`08`).

## Detail reports
| File | Area |
|------|------|
| [`01-primitives.md`](01-primitives.md) | Button, Text, Icon, Tile, Separator, Badge |
| [`02-display-content.md`](02-display-content.md) | Card, Setting, Skeleton, Avatar, Media, Markdown, Code |
| [`03-form-controls.md`](03-form-controls.md) | Input, Checkbox, Radio, Switcher, Toggle, SegmentedControl, Slider, Rating |
| [`04-overlays.md`](04-overlays.md) | Select, Date, Calendar, Tooltip, Popover, Overlay, Menu, Command |
| [`05-overlays2-feedback-nav.md`](05-overlays2-feedback-nav.md) | Modal, Sheet, Drawer, Toast, Progress, Tabs, Accordion, Steps |
| [`06-nav-layout-patterns.md`](06-nav-layout-patterns.md) | Breadcrumb, Pagination, Navigation, Panel, Tree, Toc, Bar, Scroll, Carousel, Table, Upload |
| [`07-design-system.md`](07-design-system.md) | tokens, themes, semantic sources, runtime CSS, anatomy/governance/machines |
| [`08-app-usage.md`](08-app-usage.md) | Which props/variants/states `userface-app` actually uses |

---

## 1. Verdict

The **architecture is genuinely good** and worth keeping: one folder per component with a `.tsx` + a machine-readable `.json` contract, a governance registry (`component-registry.json`), Zag-style state machines, a React-only adapter layer, `createAnatomy` (`data-scope`/`data-part`), token-driven styling, and a written "constitution" (`docs.md`). Zero `!important` in the whole CSS. This is a solid enterprise skeleton.

What blocks the "no complaints, polished" bar is **not the bones — it's accumulated drift and half-finished migrations**:

1. **A real second source of truth for tokens** — and the runtime renders from the *wrong* copy.
2. **Systemic contract drift** — `.json` contracts describe an API (roles, parts, props, focus behavior) the `.tsx` does not implement, on components flagged `a11yReviewed: true`.
3. **Merged-component shims and demo/placeholder content baked into production primitives.**
4. **At least one correctness bug** (Slider conditional hooks → React crash) and several a11y gaps that are load-bearing in the app.

The good news for the cleanup: **app coupling is thin and well-mapped.** The app consumes Face UI through a `@userface/app-ui/<Name>` wrapper that just spreads props, so the app's JSX prop surface *is* the effective contract — and the load-bearing surface is small and known (Section 5). Most legacy can be deleted safely.

---

## 2. Cross-cutting systemic issues (fix once, benefits everywhere)

These recurred across nearly every batch. Fixing them at the system level is higher-leverage than per-component nitpicks.

### S1 — Token second-source-of-truth (highest structural risk)
`assets/styles/tokens.css` (hand-authored, ~999 lines, no generated marker) is a **superset copy** of the canonical `design-system/tokens/*` + `themes/default.css`. The runtime entrypoint `assets/styles/index.css` imports `./tokens.css` and **never** imports `design-system/tokens/index.css`. So the ProjectMap → `source/*.jsonc` → generated-CSS authoring pipeline **does not change what components render.** The two copies have already drifted: motion durations/easings are different systems, `--uf-topbar-pad-bottom` is 2px vs 12px, and semantic spacing (`--uf-spacing-md/-panel`) + ~200 component defaults exist *only* in the runtime copy. Also: `tokens/geometry.css` and `tokens/motion.css` are orphans in the "generated" tree with no `source` shard (hand-edited), and `tokens.css` declares its control-geometry and z-index blocks **twice**. → **Pick one source of truth, generate the runtime file from it, delete the divergence.**

### S2 — `.json` contract drift (a11y + parts + props)
The machine-readable contracts are treated as the public API by tooling/codegen, but they lie in three consistent ways:
- **aria roles declared, never applied.** Card `region`, Skeleton `progressbar` (code does the opposite: `aria-hidden`), Avatar `img`, Markdown `document`, Code `code`, Badge `status`, SegmentedControl `radiogroup`, Popover `dialog` — none set in the `.tsx`. This directly contradicts `a11yReviewed: true`.
- **Anatomy/parts drift.** Documented parts that are never rendered: SegmentedControl `indicator`, Slider `output`, Steps `separator`, Bar `start`/`end`, Progress `range` (code emits `indicator`), Code `header`/`lineNumbers` vs `line`/`lineNumber`.
- **Phantom & missing props.** Table declares a `direction` prop (`function`, `required:true`) that doesn't exist → breaks validation/codegen. Date declares `minutes` that doesn't exist. Missing from `.json`: Input `id`, Setting `Setting.Group` props, Modal `isOpen/onClose`, Tabs/Accordion legacy props, Select `onChange`, and more.
- **Type flattening (universal).** Every ReactNode/number prop (`icon`, `children`, `title`, `description`, `content`, `width`, `height`, `rightText`, `actions`) is typed `string` in `.json`. → **The contracts need a validation pass against the source, plus a richer type vocabulary (`node`, `number|string`, union).**

### S3 — Merged-component & legacy-alias shims inside primitives
Primitives carry embedded second personalities: Button↔Clipboard (`copyText`/`onCopied` + deprecated `execCommand`), Icon↔registry/`src`/`square` (mostly ignored/deprecated), Badge↔legacy `variant` overload (tone names + `outline`, undocumented), Button `variant:'delete'`/`'danger'` alias (dead CSS + never used in app). Switcher dual label API (`label` vs `text`+`withText`). → **Split or delete; a primitive should have one job.**

### S4 — Demo / placeholder content shipped as runtime defaults
Production components render fake content when given no props: Drawer `title='Drawer'`/`children='Drawer content'`, Accordion `buildDefaultItems()` (3 sections incl. a "Delete setup" button), Toast demo wrapper + module-level singleton, Scroll filler paragraphs, Carousel bundled office `.webp` images, Panel ~120-line `workspace` preview preset, Tree default tree, Bar phantom "Bar" label + Close button when empty. → **Move all fixtures into the gallery/preview layer; ship empty-by-default.**

### S5 — Inconsistent APIs across sibling components
No shared contract where there obviously should be one:
- **Form controls:** `onChange` legacy alias has **four incompatible signatures** (event/boolean/string/number); form participation is uneven (only Input/Checkbox/Switcher/Radio expose `name`+hidden input); `membrane` default differs (Input `false`, others `true`, Slider/Rating none); validation (`error`/`description`) is Input-only.
- **Overlays:** four floating-position implementations (shared `use-floating-position` only in Select-popover + Menu; Tooltip/Popover/Overlay clamp-but-never-flip; Select-`side` bespoke; Date CSS-only), and three open-state APIs (`open` controlled vs `onOpenChange`-only vs neither). Focus traps missing on Popover, Command Cmd+K, Menu.
- **Nav item shapes:** Tree uses `children`, Navigation/Panel use `items`; key field is `id` except Menu `value` and Breadcrumb (array index); icon support diverges. Panel and Navigation item types are near-identical yet unshared. → **Introduce shared bases: `FormControlProps`, an overlay open-state + positioning primitive, `NavItemBase`.**

### S6 — Monochrome feedback palette (needs a product decision)
`success == error == warning == foreground` and `data-*` colors are grayscale. Toast success/error/warning variants are data-only with **no CSS** (render identically). This may be an intentional monochrome design language — **confirm before "fixing".** If intended, document it; if not, it's a feedback-affordance gap.

---

## 3. Severity-ranked backlog

### P0 — Correctness / crashes (fix first)
- **Slider conditional hooks bug** — `return <SliderAdvanced/>` executes *before* the first hook (`useControllableMachineProp`, `useMachine`, `useRef`, `useEffect`, `useCallback`). The branch is derived from runtime-changeable props (`variant`, `scalarValue`, `onChange`, `leading`, `crop`, `orientation`, value length), so flipping it changes the hook count between renders → "rendered fewer/more hooks" React crash. **Verified in source (Slider.tsx:136 vs :167).**
- **Table.json phantom required `direction` prop** — breaks contract validation/codegen for the whole pipeline.

### P1 — a11y that the app actively relies on
- **Slider `aria-label` dropped** — `SliderProps` doesn't extend `HTMLAttributes` and the root doesn't spread `...rest`; the app passes `aria-label` at **all 11 call sites** for labeling → silently unlabeled sliders.
- **Overlay dialogs without scroll-lock / `inert`** — Modal/Drawer/Sheet `.json` claim `scrollLock` + `inert`; `modal.machine.ts` implements neither → background scrolls and stays reachable by AT. (Focus-trap/Escape/return-focus *are* implemented.)
- **Missing focus traps** — Popover, Command Cmd+K dialog, Menu.
- **Group/name gaps** — SegmentedControl/Toggle drop `aria-label` (no `...rest` spread, no prop); Radio/Rating/Switcher have no accessible-name prop; Button icon-only enforces no name.
- **False `a11yReviewed: true`** across Card/Skeleton/Avatar/Markdown/Code/Badge/Button/Tile (see S2). → **Re-run the a11y gate honestly; flip the flags to match reality.**

### P2 — Architecture / systematization (the "causes complaints" tier)
- Resolve **S1** (token single source) — biggest structural win.
- Resolve **S2** (contract validation pass) — make `.json` true.
- Unify overlay positioning + open-state (**S5**); make Popover real or thin over a real primitive (its contract is currently ~fictional over deprecated Overlay).
- **Break the SegmentedControl→Toggle circular deprecation.** The "canonical" SegmentedControl is a thin wrapper over the *deprecated* Toggle, so Toggle is the live engine for its own replacement. Invert: make SegmentedControl the engine, delete Toggle.
- Shared form-control base + shared nav item base (**S5**).

### P3 — Cleanup / polish
- Delete dead code: empty `DatePicker/` dir; dead CSS (`[data-variant="delete"]`, `.uf-segmented-borderless`, unused `uf-calendar-*`); dead `data-*` attrs (Card `data-membrane`, Code `data-language/-line-numbers/…`).
- Remove demo defaults (**S4**).
- Retire legacy shims (**S3**).
- Naming: Panel renders as `uf-sidebar`/`data-scope="sidebar"` (`uf-panel` = 0 matches) — align class/scope to the canonical name; export the `Sidebar` alias or drop it from the registry.
- Magic numbers → tokens: Icon `FACE_UI_ICON_SIZE=20`, Input `BASE_H=32`, Card `--uf-card-pad:7px`, Slider pixel constants, Steps glyph cap at 20, breakpoint `900` duplicated in registry + code, off-scale `--uf-radius:6px`.
- Markdown identical-branch ternary + silent `catch {}`; Calendar `dateToISO` coercing bad input to *today*.
- Redundant tokens/vars: legacy `--background/--foreground/--border`, `--black-*/--white-*` (102), `--space-*` (with `--space-4==--space-8`), dangling `--uf-color-surface-sidebar`, dead all-zero letter-spacing scale, `font-weight-bold==semibold`.

---

## 4. Per-component status matrix

Legend — **Use**: app usage (JSX count unless noted; corrected in `08`). **Del?**: safe to delete/retire. Status from `component-registry.json`.

| Component | Status | Use | Top issues | Del? |
|-----------|--------|-----|-----------|------|
| **Text** | stable | ~1717 | dual styling contract (data-attr + legacy `uf-text-*` classes); `default` vs `body` redundancy; `data-variant` normalized vs class raw | frozen |
| **Button** | stable | ~502 | Clipboard shim + `execCommand`; dead `delete`/`danger` alias; icon-only no name | frozen |
| **Input** | stable | ~107 | `id` missing from `.json`; `BASE_H=32` magic; `type="default"` literal used | frozen |
| **Icon** | stable | ~99 | **no `.json` at all**; legacy `src`/`square`/registry surface; `size=20` magic | frozen |
| **Select** | stable | ~50 | token name mismatch; two indicator token families; bespoke `side` positioning | frozen |
| **Tile** | **beta** | ~28 | a11y✗/mobile✗; `.json` usage copy-pasted from a grid/card; aria drift | keep, harden |
| **Switcher** | stable | ~21 | dual label API (`label` vs `text`+`withText`); no accessible name | keep |
| **Checkbox** | stable | ~18 | `onChange(event)` legacy undocumented | keep |
| **Table** | **beta** | ~17 | **phantom required `direction` prop (P0)**; mobile✗ | keep, fix |
| **Modal** | stable | ~17 | scrollLock/inert unimplemented; default `variant='right'` (bare Modal = drawer) | frozen |
| **Slider** | **beta** | 11 (aria) | **conditional-hooks crash (P0)**; `aria-label` dropped (P1); pixel magics | keep, fix |
| **Menu** | stable | ~14 | no focus trap; advertises submenu kbd it lacks | keep |
| **Bar** | stable | ~13 | two conflicting layout models; phantom empty-state chrome | keep, refactor |
| **Radio** | stable | ~11 | no accessible-name prop; `onChange(string)` + `flow` undocumented | keep |
| **Popover** | stable | ~8 | contract ~fictional (dialog/focus-trap/responsive none impl); 4-line over Overlay | keep, rebuild |
| **Media** | beta | ~7 | a11y✗; `lazy` vs `loading` + `titleAttr` shims; missing `id` | keep |
| **Separator** | stable | ~6 | cleanest; no `--uf-separator-color` alias | keep |
| **Progress** | stable | ~6 | part `range` vs code `indicator`; `aria-label` missing from `.json`; `value=-1` magic | keep |
| **Code** | stable | ~5 | anatomy drift; dead `data-*`; `--uf-color-black-*`; no copy feedback | keep |
| **Badge** | stable | ~5→? | no role emitted (claims `status`); legacy variant overload | keep |
| **Card** | stable | **2** (not ~31) | aria `region` not set; legacy slots; `--uf-card-pad:7px` | frozen-ish |
| **Tree** | beta | ~3 | item shape uses `children` (diverges); default tree demo | keep |
| **Toc** | beta | ~3 | `onChange` legacy shim; strip plumbing | keep |
| **Skeleton** | stable | ~3 | contract says `progressbar`+label; code is `aria-hidden` (opposite) | keep |
| **Panel** | stable | ~3 | renders as `uf-sidebar`; alias not exported; resize tokens for absent feature | keep, rename |
| **Calendar** | stable | ~3 | `dateToISO`→today coercion; unused `uf-calendar-*` hooks | keep |
| **Setting** | **beta** | ~2 | a11y✗; `Setting.Group` props missing from `.json`; `24rem` magic | keep |
| **SegmentedControl** | stable | ~2 | **wraps deprecated Toggle (circular)**; `role` drift; single value is `string[]` | keep, invert |
| **Scroll** | stable | ~2 | filler content; inert `type` enum | keep |
| **Rating** | beta | ~2 | hardcoded star icon; divergent uncontrolled model; no name | keep |
| **Markdown** | stable | ~2 | identical-branch ternary; silent `catch{}`; `--uf-color-black-*` | keep |
| **Avatar** | stable | ~2 | aria `img`+label not set; no size variants / groups | keep |
| **Accordion** | stable | ~2 | ships 3-section demo default; legacy `legacyItems`/`onChange` | keep |
| **Upload** | beta | ~1 | strip plumbing; `as any` | keep |
| **Tooltip** | stable | ~1 | mobile✗; clamp-not-flip positioning | keep |
| **Tabs** | stable | ~1 | legacy `tabs`/`activeTab`/`defaultActiveTab`/`onChange` | keep |
| **Steps** | stable | ~1 | cleanest of batch; glyph cap 20; `separator` part unrendered | keep |
| **Pagination** | stable | ~1 | impl diverged from docstring; `siblingCount` no effect | keep, fix |
| **Navigation** | beta | ~1 | `orientation="vertical"` unstyled; item shape lacks `icon` | keep |
| **Drawer** | stable | ~1 | demo default title/children; scrollLock/inert unimpl | keep |
| **Command** | stable | ~1 | no focus trap on Cmd+K; own surface vocabulary | keep |
| **Breadcrumb** | stable | ~1 | items have no `id` (array index) | keep |
| **Toast** | stable | **imperative** | load-bearing via `useToast()`/`<Toaster>`; variants no CSS; singleton | **KEEP** |
| **Toggle** | **deprecated** | **0** | but is SegmentedControl's engine → invert first, then delete | delete* |
| **Overlay** | **deprecated** | **0** | but is Tooltip/Popover engine → rebuild those first, then delete | delete* |
| **Sheet** | **deprecated** | **0** | fully redundant with Drawer; contract advertises drag/handle that don't exist | **delete** |
| **Date** | stable | **0** | `minutes` phantom prop; stale copy-paste `.json` usage | delete? |
| **Carousel** | beta | **0** | bundled demo images | delete? |

\* Toggle/Overlay have zero app usage but are runtime engines for canonical components — invert the dependency before deleting.

---

## 5. Change-safety / risk map

### Frozen surface — do NOT rename/remove (app depends on it)
The app spreads props through `@userface/app-ui/<Name>`, so these props are the live contract:
- **Text:** `text`, `as`, `variant` (`muted`/`body`/`h2`/`code`/`caption`/`label`), `size` (xs–xl), `inset`, `membrane`, `truncate`
- **Button:** `text`, `variant` (`default`/`ghost`/`accent`/`primary`/`destructive`/`outline`/`suggestion`/`secondary`), `onClick`, `disabled`, `icon`, `iconOnly`, `fullWidth`, `loading`, `selector*`, `type`
- **Input:** `value`, `type` (incl. `"default"`), `onValueChange`, `disabled`, `label`, `textLayout`, `membrane`
- **Icon:** `name` · **Select:** `options`, `value`, `onValueChange`, `ariaLabel`, `label` · **Tile:** `intent` (all 6), `align`, `onClick`, `active`, `actions`, `level` · **Modal:** `open`, `onOpenChange`, `title`, `variant="center"`, `width` · **Switcher:** `checked`, `onCheckedChange`, `withText`
- **`membrane` and `inset`** are the two most pervasive Face-UI-specific props (Text alone 1162×/1189×) — **treat as frozen system-wide.**
- **Toast** imperative API (`useToast`, `<Toaster>`, `createToastContext`) — used in `AppShell`, `DesktopMainSurface`, `UnifiedPanel`.

### Safe to delete now (zero real usage)
- **Components:** Toggle, Overlay, Sheet, Date, Carousel (all 0 JSX + 0 imports; only string-name references in Playground/`compositionValidator`/gallery meta — update those).
- **Aliases/values:** `variant="delete"` / `"danger"` on Button (app uses `destructive`).
- **Dirs:** empty `DatePicker/`.
- **Caveat:** before deleting Toggle & Overlay, invert the SegmentedControl→Toggle and Tooltip/Popover→Overlay dependencies (P2).

---

## 6. Suggested sequencing

1. **P0 hotfixes** — Slider hooks order; Table `direction` phantom prop.
2. **Token single-source (S1)** — decide canonical source, regenerate runtime `tokens.css` from it, delete drift + duplicate blocks + orphan generated files. Add a test that runtime == generated.
3. **Contract-truth pass (S2)** — script that diffs every `.json` against its `.tsx` (props, enums, parts) and against emitted aria; fail CI on drift. Fix roles or flip `a11yReviewed`.
4. **Delete dead surface (Section 5)** — after inverting the two deprecation cycles.
5. **Systematize (S5)** — shared `FormControlProps`, overlay positioning/open-state primitive, `NavItemBase`.
6. **Polish (P3)** — demo defaults, magic numbers→tokens, naming, redundant tokens.

Each step is independently shippable and the frozen surface in Section 5 is the guardrail against regressions.
