# Face UI — Design System Foundation Audit

Scope: `face-ui/design-system/*`, `face-ui/assets/styles/*`, and DS infra
(`assets/anatomy.ts`, `assets/component-governance.ts`, `assets/machines/`,
`assets/adapters/`, `assets/runtime/`). Read-only audit — no code changed.

Date: 2026-07-09

---

## 0. TL;DR — top cleanup issues

1. **Two sources of truth for `--uf-*` foundations.** `design-system/tokens/*.css`
   + `themes/default.css` are **generated** from `source/*.jsonc` (each carries the
   `/* Generated from canonical design-system source. */` marker and a manifest).
   `assets/styles/tokens.css` (999 lines, hand-authored, no generated marker) is a
   **superset copy** of the same foundation that the actual runtime imports. The two
   have already drifted (motion, topbar padding — see §1 and §4).
2. **The runtime consumes the hand-authored copy, not the canonical output.**
   `assets/styles/index.css` imports `./tokens.css`; it never imports
   `design-system/tokens/index.css`. So components render from the un-generated file.
3. **`geometry` and `motion` have no `source/*.jsonc` shard** yet `tokens/geometry.css`
   and `tokens/motion.css` exist — orphaned hand-maintained token sheets inside the
   "generated" tree. Control geometry is *also* authored in `themes-default.jsonc`,
   so it is declared in three places with at least one value conflict.
4. **Semantic spacing + ~200 component-default tokens exist only in the runtime copy**,
   not in the canonical DS output, even though the README documents them as DS tokens.
5. Legacy shims (`--background`, `--foreground`, `--black-*`/`--white-*`, `--space-*`)
   and a dangling `--uf-color-surface-sidebar` reference persist. Dead letter-spacing
   scale (all `0`), `font-weight-bold == semibold == 600`, off-scale `--uf-radius: 6px`.

Positive: **zero `!important` in any CSS** (the README rule is honored); theming is
consistently token-driven; anatomy/governance infra is clean and small.

---

## 1. Token architecture

### Layers

```
ProjectMap authoring (external)          ← owns edits/review/publish (per README)
   │
   ▼
source/*.jsonc  (canonical physical storage, 10 shards)
   │  build/codegen
   ▼
generated/*.json          tokens/*.css              themes/*.css
 token-manifest.json      colors,typography,        default.css
 preview-metadata.json    spacing,shadows,borders   (control geometry + typo theme)
   │                       (all marked "Generated")
   ▼
design-system/index.css  → @import tokens + themes + utilities   [canonical package entrypoint]

── SEPARATE, HAND-AUTHORED ──
assets/styles/tokens.css → assets/styles/index.css (tokens→base→components→animations)  [runtime]
```

### source → generated mapping

| source shard | `generatedPath` | generated file present? | marked "Generated"? |
|---|---|---|---|
| color-system.jsonc | tokens/colors.css | yes (concatenated) | yes |
| semantic-action/content/feedback/surface.jsonc | tokens/colors.css (all four) | yes | yes |
| typography.jsonc | tokens/typography.css | yes | yes |
| spacing.jsonc | tokens/spacing.css | yes | yes |
| shape.jsonc | tokens/borders.css | yes | yes |
| effects.jsonc | tokens/shadows.css | yes | yes |
| themes-default.jsonc | themes/default.css | yes | yes |
| **(none)** | **tokens/geometry.css** | yes | **no — orphan, hand-authored** |
| **(none)** | **tokens/motion.css** | yes | **no — orphan, hand-authored** |

`colors.css` (383 lines) is the concatenation of `color-system` + the four
`semantic-*` shards (all five share `generatedPath: tokens/colors.css`).
`preview-metadata.json` reports the color sheet at **219 tokens**.

### Is `assets/styles/tokens.css` generated or hand-authored? → **hand-authored, and it IS a second source of truth**

Header: *"This file is the standalone runtime token bundle... Foundation values
**mirror** design-system/tokens/*; component-only defaults live below them."*
No `Generated from canonical` marker (all real generated files have one). It
re-declares the **entire** foundation and adds more:

| Block in `assets/styles/tokens.css` | Duplicates DS generated? | Notes |
|---|---|---|
| black/white ramp + `--black-*/--white-*` (L18–221) | = colors.css | exact mirror |
| data colors + semantic surface/content/action/feedback (L225–397) | = colors.css | exact mirror |
| legacy `--background`/`--foreground`/... (L399–410) | **runtime only** | not in DS |
| typography (L412–516) | = typography.css | mirror + `--uf-font-size` alias |
| geometry (L518–605) | = tokens/geometry.css | mirror (but see topbar conflict) |
| spacing scale (L614–631) | = spacing.css | mirror |
| **semantic spacing** `--uf-spacing-xs..2xl`, `-panel/-section/-container` (L635–647) | **runtime only** | README documents these as DS tokens |
| legacy `--space-*` (L653–664) | = spacing.css | mirror |
| borders (L666–686) | = borders.css | mirror |
| shadows + z + blur (L688–730) | = shadows.css | mirror |
| **motion** (L739–750, and again L931–957) | ≠ motion.css | **diverged** (see §4) |
| **~200 component defaults** `--uf-button-*`, `--uf-tile-*`, `--uf-modal-*`, ... (L752–957) | **runtime only** | the bulk that actually drives components |
| `.uf-compact` / `.uf-large` size containers (L978–999) | **runtime only** | |

**Consequence:** editing a value in ProjectMap → `source/*.jsonc` → regenerating
`tokens/*.css` does **not** update what components render, because the runtime imports
the hand-maintained `assets/styles/tokens.css`. The generated tree is effectively a
parallel artifact consumed only by whoever imports `design-system/index.css`.

---

## 2. Token inventory by category (actual scales)

### Color
- **Alpha ramps:** `--uf-color-black-{0..100}` and `--uf-color-white-{0..100}` in **2% steps** = **51 + 51 = 102** primitives. `-0` = transparent, `-100` = `#000`/`#fff`.
- **Legacy aliases:** `--black-{0..100}` / `--white-{0..100}` = **102** more (pure `var()` passthrough).
- **Data palette:** 15 tokens (`amber, blue, blue-soft, cyan, green, lime, orange, orange-soft, pink, purple, purple-soft, rose, success, teal, violet`) — all mapped to grayscale alpha (white-N in dark / black-N in light); **not actual hues**.
- **Semantic:** surface (~28: background/bg/panel/props-panel/header/input/bg-code/border/border-hover/border-subtle/ring/glyph-line/overlay-*/tooltip-*/strip-*), content (9: foreground/fg/text-primary/text-secondary/fg-muted/text-code/active-text/primary/primary-fg), action (13: active/hover/accent/accent-hover/cta*/primary-hover-bg/button-ring/disabled-opacity), feedback (~22: success/error/warning/info/new/destructive*/on-* + progress-*).
- Sheet total per `preview-metadata.json`: **219**.

### Typography
| Axis | Values | Count |
|---|---|---|
| family | `Akt` (base), `Begriffsschrift` (mono) | 2 |
| font-size | xs 10, sm 11, base 12, md 14, lg 16, xl 18, 2xl 20, 3xl 24, 4xl 32, 5xl 48 (px) | 10 |
| font-weight | normal 400, medium 500, semibold 600, **bold 600** | 4 (bold == semibold) |
| line-height | tight 1.2, normal 1.5, relaxed 1.6 | 3 |
| letter-spacing | tight/normal/wide/wider — **all `0`** | 4 (dead) |
| text-transform | none/uppercase/lowercase | 3 |
| text-role tokens | body/section/label/caption/heading/kbd/h1–h5 deltas, etc. | ~40 |

### Spacing
- **Numeric scale (4px base):** `--uf-spacing-{0,1,2,3,4,5,6,8,10,12,16,20,24}` = **13 steps** (0,4,8,12,16,20,24,32,40,48,64,80,96 px).
- **Semantic:** `xs/sm/md/lg/xl/2xl` (= 4/8/16/24/40/64) — **runtime file only**.
- **Component:** `panel/section/container` (= 20/32/40) — **runtime file only**.
- **Legacy:** `--space-{0,2,4,8,12,16,20,24,32,40}` = 10 (note `--space-4` and `--space-8` both map to `--uf-spacing-2` = 8px — a collision baked into the alias table).

### Radius / borders
- **Radius:** none 0, sm 4, md 8, lg 12, xl 16, full 9999 — plus `--uf-radius: 6px` and `--uf-radius-base: var(--uf-radius)`. **`--uf-radius`/base = 6px does not sit on the 4/8/12/16 scale** (it's the de-facto default used by controls).
- **Border width:** none 0, thin 1, base 2, thick 4. **Styles:** solid/dashed/dotted. **Composites:** `--uf-border-default/subtle/focus`. `--uf-membrane: 1px`.

### Shadows / elevation
- **Shadows:** none, sm, base, md, lg, xl (6) — theme-variant (lighter in light, heavier in dark; `:root:not([data-theme])` treated as dark).
- **Elevation:** `--uf-elevation-{0..5}` aliased to shadow none→xl (6).
- **Z-index:** dropdown 2300, overlay 1900, modal 2100, toast 2400. **Blur:** backdrop-blur-overlay 120px, overlay-backdrop-blur 28px, overlay-surface-blur 24px.

### Motion — **two divergent definitions**
| token | `tokens/motion.css` (DS) | `assets/styles/tokens.css` (runtime) |
|---|---|---|
| fast | `--uf-motion-fast: 120ms` | `--uf-motion-fast: var(--uf-motion-duration-fast=120ms)` |
| snappy | 140ms | `= --uf-motion-duration-short = **150ms**` |
| normal | 240ms | `= --uf-motion-duration-control = **200ms**` |
| slow | 300ms | `= --uf-motion-duration-medium = **250ms**` |
| ease-out | `cubic-bezier(0,0,0.2,1)` | **`ease-out` keyword** |
| ease-in-out | `cubic-bezier(0.2,0.8,0.2,1)` | **`ease-in-out` keyword** |

Runtime file additionally defines `--uf-motion-duration-{fast,short,control,medium,emphasis,spin,loading,skeleton,reduced}`, `--uf-motion-ease-*`, `--uf-duration-enter/exit`, `--uf-ease-enter/exit`, and a `prefers-reduced-motion` override. The DS `motion.css` has none of this. **These are not the same system.**

### Control geometry (`--uf-control-*`)
height 32, font-size 14, line-height 20, letter-spacing 0, pad-y 6, pad-text 8, pad-left/right (= pad-text), pad-icon 6, gap 8; plus `--uf-icon-size 20`, `--uf-icon-only-size 32`, `--uf-content-inset 12`, `--uf-option-indent` (calc), topbar-* , panel-pad-x/y 7px, resizer geometry, `--uf-interactive-weight 500`, icon-size-sm/md/lg (all 20). `.uf-compact` (28px) / `.uf-large` (40px) override the control block.

---

## 3. Semantic layering

Semantic tokens reference primitives (never raw hex), and higher semantics reference
lower semantics — a clean cascade:

```
alpha ramp (white-N / black-N)
  → surface:  --uf-color-background = black-96 (dark) / white-100 (light)
              --uf-color-border = white-20 / black-12
  → content:  --uf-color-foreground = white-92 / black-88
              --uf-color-text-secondary = white-54 / black-48
  → action:   --uf-color-hover = white-8 / black-6 ; --uf-color-active = white-12 / black-8
              --uf-color-accent = foreground ; --uf-color-cta = foreground
  → feedback: --uf-color-success/error/new = foreground ; warning/info = text-secondary
              --uf-color-destructive = error ; progress-* = hover-bg / fg / success ...
```

**Consistency:** strong — everything resolves to the black/white alpha ramp, giving a
monochrome design language. Alias pairs are provided for ergonomics
(`--uf-color-fg`≈`--uf-color-foreground`, `--uf-color-bg`≈`--uf-color-background`,
`--uf-color-on-success`≈`--uf-color-success-foreground`).

**Gaps / smells:**
- **Feedback colors are not colorful.** success/error/new all = `foreground`;
  warning/info = `text-secondary`. There is no green/red/amber semantic hue — a
  deliberate monochrome choice, but it means success and error are visually identical
  (both render as foreground-on-background). Worth confirming this is intended for a
  "production-ready" feedback system (e.g. Toast success vs error indistinguishable by color).
- **`--uf-color-data-*`** are all grayscale too, so charts/legends relying on
  amber/blue/green/etc. get shades of gray, not distinct hues.
- **`--uf-color-surface-sidebar` is referenced but never defined** (in
  `--uf-overlay-surface-bg` and `--uf-tooltip-bg`, via `var(--uf-color-surface-sidebar, …)`).
  It is a product-supplied token leaking into the DS layer; DS relies on the fallback.

---

## 4. Legacy / cleanup flags

| Flag | Where | Detail |
|---|---|---|
| **Second source of truth** | `assets/styles/tokens.css` vs `design-system/tokens/*` | see §1 — the headline issue |
| **topbar-pad-bottom conflict** | geometry.css & runtime tokens.css = **2px**; themes-default.jsonc → themes/default.css = **12px** | same token, two values; resolved value depends on entrypoint/import order |
| **Motion divergence** | motion.css vs runtime tokens.css | snappy 140≠150, normal 240≠200, slow 300≠250, cubic-bezier vs keyword eases (§2) |
| **Orphan generated sheets** | tokens/geometry.css, tokens/motion.css | no `source/*.jsonc` shard; hand-edited inside the "generated" tree (contradicts README rule #5) |
| **Triple authorship of control geometry** | themes-default.jsonc, tokens/geometry.css, runtime tokens.css | control-height/font/lh/pad declared in all three |
| **Intra-file duplication** | assets/styles/tokens.css | control geometry declared twice (L477–479 & L530–535); z-index block twice (L701–704 & L923–926) |
| **Intra-file contradiction** | assets/styles/tokens.css | `--uf-text-pad-y: var(--uf-control-pad-y)` (L488) then `--uf-text-pad-y: 0px` (L561) — later wins → 0 |
| **Legacy color shims** | runtime tokens.css L399–410 | `--background`, `--foreground`, `--border`, `--panel-bg`, `--header-bg`, `--input-bg`, `--active-bg`, `--active-text`, `--secondary-text`, `--hover-bg` (runtime-only; README §Принципы promises to keep them) |
| **Legacy alias ramps** | source + runtime | `--black-*`/`--white-*` (102 vars) pure passthrough; `--space-*` (10, with `--space-4`==`--space-8`); `--font-base`, `--uf-font-family`, `--uf-font-mono` |
| **Dangling reference** | `--uf-color-surface-sidebar` | referenced, never defined (fallback only) |
| **Dead scale** | letter-spacing tight/normal/wide/wider | all `0` — no differentiation |
| **Meaningless weight** | `--uf-font-weight-bold: 600` == semibold | "bold" is not bolder than "semibold" |
| **Off-scale radius** | `--uf-radius: 6px` (`--uf-radius-base`) | between sm(4) and md(8); the real control default is outside the named scale |
| **Naming convention mix** | tokens generally | `--uf-spacing-4` (numeric) vs `--uf-spacing-md` (semantic) vs `--space-16` (legacy); `--uf-motion-fast` vs `--uf-motion-duration-fast`; `--uf-color-fg` vs `--uf-color-foreground` |
| **`!important`** | none in CSS | **clean** — only the README documents the "no !important" rule |
| **Hardcoded values** | pervasive px literals in source | acceptable at the primitive layer (that's where literals belong); no hardcoded colors found in components sampled |
| **Doc drift** | README | documents `.uf-theme-specimen` / `.uf-theme-my-custom` themes and `--uf-spacing-panel` as DS tokens; specimen theme class does not exist in DS, semantic spacing lives only in runtime file |

---

## 5. Theming

- **Mechanism:** `data-theme` attribute. Color variants are authored inline in
  `colors.css` (and mirrored in runtime tokens.css) with paired selectors:
  - dark (default): `:root,\n[data-theme='dark']`
  - light: `:root[data-theme='light'],\n[data-theme='light']`
  - Shadows use `:root[data-theme='dark'],\n:root:not([data-theme])` → **no `data-theme` = dark**.
- **Default is dark.** Light requires an explicit `data-theme="light"`.
- **No `prefers-color-scheme` media query** anywhere — theme is purely attribute-driven
  (differs from the Artifact/OS-driven convention; may be intentional for an app shell).
- **`themes/` contains only `default.css`** (imported by `themes/index.css`), and it
  carries **geometry + typography theme values, not colors** (control-height, control
  font/line-height, topbar padding, icon sizes, interactive-weight). Color theming is
  not in `themes/` at all — it's baked into `colors.css`.
- **`.uf-theme-*` classes:** README describes `.uf-theme-specimen` and custom
  `.uf-theme-my-custom` overriding control geometry, but **no such classes ship** in the
  DS CSS. The only real container overrides are `.uf-compact` / `.uf-large` (size, not theme).
- **Existing "themes":** effectively one (default), two color modes (dark default / light).

---

## 6. Anatomy & governance infra

### `createAnatomy` (`assets/runtime/anatomy.ts`, re-exported by `assets/anatomy.ts`)
~30 lines. `createAnatomy(scope).parts('root','control',...)` returns
`{ scope, parts, getPartAttrs(part) → { 'data-scope': scope, 'data-part': part } }`.
This is the entire styling contract: `base.css` targets `[data-scope]` / `[data-part]`
selectors, and the reset (`base.css`) deliberately strips borders/shadows/outlines
inside `[data-scope]` to isolate from Tailwind Preflight and external reference CSS.
Isolation is by attribute specificity, **no `@layer`** (documented as intentional).

### Component governance (`assets/component-governance.ts` + root `component-registry.json`)
- Typed wrapper over `component-registry.json` (imported from repo root, `../component-registry.json`).
- Registry: version 1, **48 components**, **5 planned**.
  - Status: **34 stable / 11 beta / 3 deprecated** (`Toggle`, `Overlay`, `Sheet`).
  - Categories: form 9, navigation 9, overlay 7, primitive 5, display 5, pattern 4, content 2, overlay-form 2, feedback 2, layout 2, overlay-primitive 1.
  - Reviewed flags: **a11yReviewed 45/48, mobileReviewed 44/48**.
  - Governance meta: `qualityGates = [contracts, interaction-tests, responsive-review, a11y-review, preview-parity]`, `maturityLevels = [stable, beta, deprecated]`.
- Helpers: `getFaceUiComponentMeta(name)` (alias-aware), `isDeprecatedFaceUiComponent(name)`.

### Machines (`assets/machines/`)
**30 machine files** (Zag-style: `*.machine.ts` exporting `xMachine`, `xAnatomy`,
`connectX`, `XSchema`). `index.ts` barrels ~29 of them. Coverage: checkbox, switcher,
radio, toggle, slider, rating, input, select, modal, overlay, menu, toast, tabs,
accordion, progress, avatar, pagination, steps, carousel, toc, tree, sidebar,
navigation, command, upload, table, calendar, date, resizable.

### Adapters (`assets/adapters/react/`)
10 files (React glue): `use-machine.ts`, `normalize-props.ts`, `merge-props.ts`,
`use-floating-position.ts`, `use-dismiss-outside.ts`, `use-body-scroll-lock.ts`,
`use-controllable-machine-prop.ts` (+ test), `use-controllable-open-state.ts`,
`use-responsive-overlay-surface.ts`. Only a `react` adapter exists (framework-agnostic
core in `runtime/`, React binding in `adapters/react/`).

### Runtime (`assets/runtime/`)
`anatomy.ts`, `create-machine.ts` (10KB — the machine engine), `collection.ts`,
`core.ts`, `date-utils.ts`, `membrane-interactions.ts`, `shared-types.ts`, `types.ts`,
`utils.ts`. Top-level `assets/*.ts` (anatomy/core/collection/create-machine/…) are
thin re-export shims pointing at `runtime/`.

### Generated artifacts
- `generated/token-manifest.json` (5519 lines): flat list of every token with
  `name, sheet, profile:"design-system", generatedPath, selectors[], values[]`.
- `generated/preview-metadata.json` (204 lines): per-sheet preview descriptors
  (`sheet, title, generatedPath, previewKind, tokenCount, selectors, sampleTokens`) —
  e.g. color sheet `tokenCount: 219`. Drives token-preview tooling.

---

## Recommended cleanup priorities

1. **Collapse the two token sources.** Either (a) generate `assets/styles/tokens.css`'s
   foundation section from `source/*.jsonc` (and keep only component defaults hand-authored),
   or (b) make the runtime import the generated `design-system/tokens/index.css` and keep
   only component defaults + size containers in a separate runtime file. Today the runtime
   silently ignores the canonical output.
2. **Reconcile the concrete drifts:** `topbar-pad-bottom` (2 vs 12) and the entire motion
   system (values + easing style). Pick one and delete the other.
3. **Give `geometry` and `motion` a `source/*.jsonc` shard** (or fold geometry into
   themes-default and delete `tokens/geometry.css`), so the generated tree has no orphans
   and control geometry has a single owner.
4. **Move semantic spacing + component defaults into the canonical model** (or explicitly
   document them as runtime-only and fix the README, which currently lists them as DS tokens).
5. **Prune:** remove intra-file duplicate/contradictory declarations in `tokens.css`
   (control geometry x2, z-index x2, `--uf-text-pad-y` contradiction); define or remove
   `--uf-color-surface-sidebar`; decide the fate of the `--black-*/--white-*/--space-*`
   and `--background/--foreground` legacy shims.
6. **Fix trivial correctness:** `--uf-font-weight-bold` should differ from semibold;
   the dead letter-spacing scale should be removed or given real values; document why
   `--uf-radius`/base sits off the radius scale (or add a `--uf-radius-md`-aligned default).
