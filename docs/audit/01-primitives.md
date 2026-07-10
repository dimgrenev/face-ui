# Face UI — Primitives Audit (Button, Text, Icon, Tile, Separator, Badge)

Deep production-readiness audit. Read-only. Sources:
- `/Users/grenev/Documents/workspace/face-ui/<Name>/<Name>.tsx` + `.json`
- `/Users/grenev/Documents/workspace/face-ui/assets/Icon.tsx` (no `.json`)
- `/Users/grenev/Documents/workspace/face-ui/assets/styles/components.css` (+ `tokens.css`)
- `/Users/grenev/Documents/workspace/face-ui/component-registry.json`

Legend: **[LEGACY]** = compat/alias/deprecated; **[DRIFT]** = `.tsx` vs `.json` mismatch; **[A11Y]** = accessibility gap.

---

## Button

### 1. Governance
| Field | Value |
|---|---|
| category | primitive |
| status | **stable** |
| a11yReviewed | true |
| mobileReviewed | true |
| aliases / replacedBy | none (related: Text, Icon, Bar) |

### 2. Props (19 documented)
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| text | string | — | no | Button label text |
| rightText | ReactNode (json: string) | — | no | Secondary text at far right of text area |
| variant | enum `default\|primary\|secondary\|accent\|outline\|ghost\|destructive\|suggestion` (+`'delete'` in .tsx only) | `default` | no | Visual variant |
| icon | ReactNode/string (json: string) | — | no | Icon (registry name, ReactNode, or SVG) |
| iconPosition | enum `left\|right` | `left` | no | Icon position vs text |
| iconOnly | boolean | false | no | Icon-only square button |
| disabled | boolean | false | no | Disabled state |
| loading | boolean | false | no | Spinner, dims text, blocks activation |
| stretchText | boolean | false | no | Stretch text area (flex:1) |
| selector | boolean | false | no | Compact selector chevron after label |
| selectorOpen | boolean | false | no | Open state for selector chevron |
| selectorDirection | enum `vertical\|side` | `vertical` | no | Selector chevron direction |
| fullWidth | boolean | false | no | Full-width button |
| align | enum `left\|center\|right` | — | no | Text alignment |
| level | number (0–9, clamped) | — | no | Nesting indent for option rows |
| membrane | boolean | true | no | Membrane spacing wrapper |
| copyText | string | — | no | Copy-to-clipboard on click (Clipboard shim) |
| onCopied | function | — | no | Callback after successful copy |
| children | ReactNode (json: string) | — | no | Custom children (overrides text) |

Also spreads `ButtonHTMLAttributes` (onClick, type=default `button`, etc.).

Rarely-meaningful / legacy: **copyText + onCopied** (Clipboard was folded into Button — a merged-component shim, not core button behavior); **level** (option-row indent, app-specific); **selectorDirection='side'**.

### 3. Variants / sizes / tones
- variant: default, primary, secondary, accent, outline, ghost, destructive, suggestion **+ `delete` (alias→destructive)**.
- No size prop (height comes from `--uf-control-height`). No tone/intent/density.

### 4. States
- `data-*`: `data-variant`, `data-icon-only`, `data-stretch-text`, `data-full-width`, `data-align`, `data-icon-left`, `data-icon-right`, `data-selector`, `data-selector-direction`, `data-level`, `data-loading`, `data-copied`, `data-membrane`, plus anatomy `data-part`/`data-scope="button"`.
- Interactive: `:hover`, `:focus-visible` (inset ring), `:disabled`/`[data-disabled]`, `[data-loading]`.
- aria: `aria-busy=true` when loading; native `disabled` (also set when loading). role=button implicit (native `<button>`).

### 5. Anatomy / sub-components
- Anatomy parts: `root, icon, text, label, indicator, group`.
- Sub-component: **`ButtonGroup`** (props: children, orientation `horizontal|vertical`, className) — renders `role="group"`, `data-orientation`, `.uf-button-group`.
- Membrane wrapper `<span class="uf-membrane">` with click-forwarding to inner button.
- Extra classes on root: `uf-button uf-option uf-control`.

### 6. Token mapping
- Component tokens: `--uf-button-bg/-fg/-hover-bg/-hover-fg/-ring-color`, `--uf-button-focus-ring-width`, `--uf-button-outline-width`, `--uf-control-pad-left/-right`, `--uf-selector-indicator-*`, `--uf-icon-only-size`, `--face-runtime-option-level`, `--uf-interactive-weight`, spinner tokens.
- Semantic fallbacks: `--uf-control-height/-font-size/-line-height/-pad-*/-gap`, `--uf-color-primary(-fg)/-accent(-fg)/-hover-bg/-active-bg/-destructive(-soft)`, `--uf-radius`, `--uf-membrane`, motion tokens.

### 7. Contract drift
- **[DRIFT] variant `'delete'`**: present in `.tsx` type (`ButtonVariant | 'delete'`) and CSS has a `[data-variant="delete"]` rule, but `.json` `options` omit it. Deprecated alias is undocumented.
- Prop lists otherwise match 1:1 (19 props).
- Type notes: json types `icon`, `children`, `rightText` as `string`, but `.tsx` accepts `ReactNode` — under-documented type.

### 8. Legacy / cleanup flags
- **[LEGACY/DEAD CSS]** `variant='delete'` is mapped to `destructive` in the component **before** `data-variant` is emitted (`const variant = rawVariant === 'delete' ? 'destructive' : rawVariant`). So the CSS rule `.uf-button[...][data-variant="delete"]` (line 159) is **dead** — the component never emits `data-variant="delete"`. Remove alias from type + dead CSS, or document the alias.
- **[A11Y]** Icon-only buttons have **no enforced accessible name**: the inner `<Icon>` renders `aria-hidden` (no `label`), and Button does not require/warn on `aria-label`. An icon-only button with no `aria-label` has no accessible name. `a11yReviewed:true` looks optimistic here.
- **[LEGACY]** Clipboard merged in via `copyText`/`onCopied` + `document.execCommand('copy')` fallback (deprecated API) — a compat shim living inside a primitive.
- Naming: root carries three classes (`uf-button uf-option uf-control`); `uf-option` coupling is a hidden cross-component contract.

---

## Text

### 1. Governance
| Field | Value |
|---|---|
| category | primitive |
| status | **stable** |
| a11yReviewed | true |
| mobileReviewed | true |
| aliases / replacedBy | none (related: Button, Separator) |

### 2. Props (14 documented)
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| text | string | — | no | Text content |
| variant | enum (16 values, below) | `default` | no | Visual/typographic variant |
| size | enum `xs\|sm\|md\|lg\|xl` | — | no | Font size step (data-size → token) |
| as | enum (14 elements) | auto from variant | no | HTML element override |
| icon | ReactNode/string | — | no | Leading/trailing icon |
| iconPosition | enum `left\|right` | `left` | no | Icon side |
| inset | enum `control\|none` | `control` | no | `control`=button rhythm; `none`=flush |
| stretchText | boolean | false | no | Stretch text area (flex:1) |
| fullWidth | boolean | false | no | Full width |
| align | enum `left\|center\|right` | `left` | no | Alignment |
| membrane | boolean | true | no | Membrane spacing wrapper |
| truncate | boolean | false | no | Ellipsis on overflow |
| children | ReactNode (json: string) | — | no | Custom children (overrides text) |
| htmlFor | string | — | no | `for` attr, only when element is `label` |

Also spreads `HTMLAttributes<HTMLElement>`.

### 3. Variants / sizes
- variant (16): default, body, heading, h1, h2, h3, h4, h5, h6, label, caption, kbd, code, markdown, muted, blockquote.
- size (5): xs, sm, md, lg, xl. No tone/intent/density.

### 4. States
- `data-*`: `data-variant` (**normalized**: `default`→`body`), `data-size`, `data-inset`, `data-icon-position`, `data-stretch-text`, `data-full-width`, `data-truncate`, `data-align`, `data-membrane`, `data-part`/`data-scope="text"`.
- No interactive states. aria: no role forced; relies on semantic element (`as`/variant default). `htmlFor` only wired when resolved element is `label`.

### 5. Anatomy / sub-components
- Anatomy parts: `root` only (json `recommended` lists `icon` but no anatomy part exists for it).
- Internal spans: `.uf-text__icon`, `.uf-text__content`.
- Compat classes: `uf-text` + one of `uf-text-section` (label) / `uf-text-heading` (h1–h6) / `uf-text-body` (else), plus `uf-text--<variant>`, `uf-text--align-*`, `uf-text--inset-*`, `uf-text--withIcon`, `uf-text--icon-<pos>`.

### 6. Token mapping
- Component tokens: `--uf-text-min-height`, `-pad-y/-pad-x`, `-inset-none-*`, `-font-family/-size/-line-height/-letter-spacing/-weight/-color`, `-size-font-size`, per-variant (`-label-*`, `-heading-*`, `-caption-*`, `-kbd-*`, `-h1..h5-delta`, `-blockquote-border-width`).
- Semantic fallbacks: `--uf-control-height/-pad-y/-pad-text`, `--uf-font-family-base`, `--uf-font-size-xs..xl`, `--uf-control-font-size/-line-height/-letter-spacing`, `--uf-font-weight`, `--uf-color-fg/-fg-muted`.

### 7. Contract drift
- Prop lists match 1:1 (14 props).
- **[DRIFT-minor]** `data-variant` emits the **normalized** value (`default`→`body`), while the CSS *class* `uf-text--${variant}` uses the **raw** value (`uf-text--default`). Two different variant spellings coexist on one element; `.json` does not document this normalization.
- **[DRIFT-minor]** `composition.recommended` includes `icon`, but `textAnatomy` only declares `root` — the icon is a bare `.uf-text__icon` span, not an anatomy part.
- `h6` has no delta (maps to base control font-size) — intentional but undocumented.

### 8. Legacy / cleanup flags
- Dual styling contract (data-attrs **and** legacy `uf-text-body/-heading/-section` compat classes) — comment says "keep while also exposing data-*", i.e. an intentional but unfinished migration. Cleanup candidate.
- Both `default` and `body` variants exist and collapse to the same rendering — redundant public surface.
- `size` + variant-specific font-size fallbacks interact through nested `var()` fallbacks; brittle precedence (documented in json notes, but complex).

---

## Icon

### 1. Governance
| Field | Value |
|---|---|
| category | primitive |
| status | **stable** |
| a11yReviewed | true |
| mobileReviewed | true |
| aliases / replacedBy | none. **No `.json` contract file exists.** |

### 2. Props
`IconProps`:
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| name | IconName \| string | — | no | Registry icon name (canonical input) |
| icon | IconSource | — | no | **[LEGACY]** compat input; string names resolve, custom sources → `notdef` |
| src | string | — | no | **[LEGACY/deprecated]** external URL → renders `notdef` |
| size | number | — | no | **[LEGACY]** compat-only, IGNORED (icons always 20×20) |
| square | boolean | — | no | **[LEGACY]** compat-only, IGNORED |
| className | string | `''` | no | Extra class |
| style | CSSProperties | `{}` | no | Inline style (width/height overwritten to 20) |
| label | string | — | no | Accessible label; if omitted icon is decorative |
| title | string | — | no | Inline `<title>` for the SVG |

`IconProviderProps` (context): children, **size [LEGACY compat, ignored]**, **square [LEGACY compat]**, **registry [deprecated → notdef]**, **resolveIcon [deprecated → notdef]**.

### 3. Variants / sizes / tones
- None. Fixed `FACE_UI_ICON_SIZE = 20`. Color via `currentColor`. No variant/tone/size system.

### 4. States
- `data-icon="<requestedName|builtinName|notdef>"` on the `<svg>`.
- aria: with `label` → `role="img"` + `aria-label`; without → `aria-hidden="true"`.
- No interactive states.

### 5. Anatomy / sub-components
- No `createAnatomy`. Sub-component: **`IconProvider`** (React context; all its knobs are compat/deprecated no-ops). Class: `uf-icon`.
- ~130 built-in inline-SVG icons (`ICON_NAMES` export). viewBox map (`cloud-done`/`random` = 24×24; `crop` = 10×20; rest 20×20).

### 6. Token mapping
- CSS `.uf-icon` is layout-only (display/flex-shrink/vertical-align/user-select). Indicator/inline sizing elsewhere uses `--uf-selector-indicator-size`, `--uf-icon-size` (tokens.css `--uf-icon-size: 20px`), `--uf-control-line-height`.
- **The component itself hardcodes width/height=`20`** inline rather than consuming `--uf-icon-size`.

### 7. Contract drift
- **[DRIFT] No `.json` file at all** — Icon has zero machine-readable contract despite being `status: stable`, `a11yReviewed: true`. Every other primitive has one.

### 8. Legacy / cleanup flags
- **[LEGACY] Heavy compat surface**: `icon`, `src`, `size`, `square` props + `IconProvider.size/square/registry/resolveIcon` are all compat-only, ignored, or deprecated (registries resolve to `notdef`). This is a migration graveyard on a "stable" primitive.
- **[MAGIC NUMBER]** `FACE_UI_ICON_SIZE = 20` hardcoded and written as inline `width`/`height`, bypassing the `--uf-icon-size` token → not themeable/scalable.
- **[LEGACY]** `LEGACY_BUILTIN_ICON_NAMES = new Set(['git'])` → forced `notdef`; single-purpose compat shim.
- Unknown names silently coerce to `notdef` (+ `console.warn`); `.json` documentation absent so consumers have no enumerated icon list contract.
- `style` prop's width/height are silently overridden — surprising API.

---

## Tile

### 1. Governance
| Field | Value |
|---|---|
| category | primitive |
| status | **beta** |
| a11yReviewed | **false** |
| mobileReviewed | **false** |
| aliases / replacedBy | none (related: Button, Icon, Bar) |

### 2. Props (26 documented)
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| text | string | — | no | Primary label |
| rightText | ReactNode (json: string) | — | no | Secondary text at far right of label area |
| variant | enum `default\|ghost\|accent` | `default` | no | Visual variant |
| intent | enum `option\|navigation\|disclosure\|tree\|tab\|section` | `option` | no | Semantic row intent |
| density | enum `default\|compact\|spacious` | `default` | no | Internal padding density |
| tone | enum `neutral\|muted\|accent\|positive\|warning\|destructive` | `neutral` | no | Semantic fg/hover tone |
| actionVisibility | enum `reveal\|hover\|always\|hidden` | `reveal` | no | How actions slot is revealed |
| icon | ReactNode/string | — | no | Icon |
| iconPosition | enum `left\|right` | `left` | no | Icon side |
| leading | ReactNode | — | no | Isolated leading slot (nested controls; stopPropagation) |
| meta | ReactNode | — | no | Non-interactive trailing metadata before actions |
| disabled | boolean | false | no | Disabled state |
| busy | boolean | false | no | Busy (aria-busy/data-busy) without disabling |
| active | boolean | false | no | Active/selected |
| selectedDescendant | boolean | false | no | Parent contains selected descendant (collapsed) |
| interactive | boolean | auto | no | Override button semantics (false for headers) |
| stretchText | boolean | auto (true unless selector) | no | Stretch text area |
| selector | boolean | false | no | Compact selector chevron |
| selectorOpen | boolean | false | no | Selector open state |
| fullWidth | boolean | **true** | no | Full-width tile |
| align | enum `left\|center\|right` | `left` | no | Alignment |
| level | number (0–9) | — | no | Nesting indent |
| truncate | boolean | **true** | no | Ellipsis on overflow |
| membrane | boolean | true | no | Membrane spacing |
| actions | ReactNode (json: string) | — | no | Nested action buttons (clicks don't bubble) |
| children | ReactNode (json: string) | — | no | Custom children (overrides text/icon) |

Also spreads `HTMLAttributes<HTMLDivElement>` (onClick, onKeyDown, role, tabIndex, aria-busy consumed explicitly).

### 3. Variants / intents / density / tones
- variant (3): default, ghost, accent.
- intent (6): option, navigation, disclosure, tree, tab, section.
- density (3): default, compact, spacious.
- tone (6): neutral, muted, accent, positive, warning, destructive.
- actionVisibility (4): reveal, hover, always, hidden.
- No size prop. Note **no `selectorDirection`** (Button has it; Tile omits).

### 4. States
- `data-*`: `data-variant, data-intent, data-density, data-tone, data-action-visibility, data-active, data-selected-descendant, data-disabled, data-busy, data-interactive, data-stretch-text, data-full-width, data-align, data-selector, data-level, data-truncate, data-membrane, data-leading, data-meta, data-icon-left, data-icon-right` + part `data-position` on icon + `data-scope="tile"`.
- Interactive: `:hover`, `:focus-visible` (uses **`--uf-button-ring-color`** — borrowed from Button), `[data-active]`, `[data-selected-descendant]`, `[data-busy]`.
- Keyboard: Enter/Space activate (only when `e.target === e.currentTarget`).
- aria: `role` = `button` (interactive) / `tab` (intent=tab) / none (non-interactive section); `tabIndex` 0 / -1 (disabled) / undefined; `aria-disabled`, `aria-busy`.
- CSS note: `data-tone="neutral"` has **no** rule (only muted/accent/positive/warning/destructive) — neutral relies on base defaults.

### 5. Anatomy / sub-components
- Anatomy parts: `root, leading, icon, text, indicator, meta, actions`.
- Two isolated stopPropagation slots: `leading` and `actions`.
- Renders label via **`Text`** sub-component (`as="span"`, `inset="none"`, `membrane={false}`). Extra classes: `uf-tile uf-option uf-control`; internal `.uf-tile__label`, `.uf-tile__labelSlot`, `.uf-tile__rightText`, `.uf-tile__content`.

### 6. Token mapping
- Component tokens: `--uf-tile-pad(-x/-y/-left/-right)`, `--uf-tile-content-gap`, `--uf-tile-level-compensation`, `--uf-tile-action-size`, `--uf-tile-focus-ring-width`, `--uf-tile-selector-indicator-opacity(/-hover)`, `--uf-tile-bg/-fg/-hover-bg`, `--uf-selector-indicator-*`, `--face-runtime-option-level`.
- Semantic fallbacks: `--uf-membrane`, `--uf-control-height/-gap/-font-size/-line-height`, `--uf-font-weight(-bold)`, `--uf-radius`, `--uf-color-fg(-muted)/-hover-bg/-active-bg/-primary/-success/-warning/-destructive(-soft)`, **`--uf-button-ring-color`** (cross-component), `--uf-option-indent`, motion tokens.

### 7. Contract drift
- Prop lists match 1:1 (26 props).
- **[DRIFT] aria**: `.json` declares `"aria": { "role": "button" }`, but the component emits `role="tab"` for `intent="tab"` and **no role** for non-interactive `intent="section"`. Contract understates real roles.
- **[DRIFT] usage section is wrong/stale**: `.json` `usage.whenToUse` = "Grid item in dashboard / Clickable card-like block / Feature selection grid" and `whenNotToUse` = "Navigation item (use Button)". This describes a **grid tile**, but the component is an **interactive row / sidebar tab** (per header doc + `intent` taxonomy of navigation/tree/tab). Description and usage contradict each other.
- **[DRIFT-minor]** json types `rightText`, `actions`, `children` as `string` though `.tsx` = `ReactNode`.

### 8. Legacy / cleanup flags
- **[A11Y]** `a11yReviewed:false`, `mobileReviewed:false`, `status:beta` — not enterprise-ready. `div[role=button]` pattern needs the audit it hasn't had (focus, disabled semantics, nested-button announcement).
- **[DRIFT] Copy-paste usage docs** from a different (grid) component — actively misleading guidance.
- Cross-component token coupling: focus ring reads `--uf-button-ring-color` (no Tile-owned ring color token) → Tile visually depends on Button's token.
- `data-tone="neutral"` emitted but unstyled (harmless but noise).
- Heavy prop surface (26) with overlapping concerns (variant vs intent vs tone vs density) — high cognitive load; `whenNotToUse: "use Button"` vs Button's `whenNotToUse: "use Tile-like"` shows the row/button boundary is blurry.

---

## Separator

### 1. Governance
| Field | Value |
|---|---|
| category | primitive |
| status | **stable** |
| a11yReviewed | true |
| mobileReviewed | true |
| aliases / replacedBy | none (related: Bar, Panel) |

### 2. Props (3 documented)
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| orientation | enum `horizontal\|vertical` | `horizontal` | no | Divider direction |
| decorative | boolean | true | no | Decorative (role=none) vs semantic (role=separator) |
| membrane | boolean | true | no | Membrane spacing wrapper |

Also spreads `HTMLAttributes<HTMLDivElement>`.

### 3. Variants / sizes / tones
- None. Only orientation. Line width from token.

### 4. States
- `data-*`: `data-orientation`, `data-membrane`, `data-part`/`data-scope`.
- aria: `role` = `none` (decorative) / `separator`; `aria-orientation` set **only** for semantic (non-decorative) separators.
- No interactive states.

### 5. Anatomy / sub-components
- Anatomy parts: `root` only. No sub-components.
- Membrane wrapper: horizontal → `uf-membrane uf-membrane--full uf-separator-membrane`; vertical → `uf-membrane uf-membrane--full`.

### 6. Token mapping
- Component tokens: `--uf-separator-line-width` (tokens.css → `var(--uf-border-width-thin)`).
- Semantic fallbacks: `--uf-control-pad-text`, `--uf-color-border`.
- Note: `.uf-separator` background uses `--uf-color-border` directly (not a component-level color token/alias).

### 7. Contract drift
- **Clean.** Prop lists match 1:1 (3 props). Enum, defaults, aria all consistent between `.tsx` and `.json`. Best-behaved primitive in this set.

### 8. Legacy / cleanup flags
- Minor: separator color is hardcoded to `--uf-color-border` in CSS with no `--uf-separator-color` alias (every other primitive exposes a `-bg/-fg` component token). Small inconsistency, not blocking.
- Membrane branch produces two different className strings (horizontal adds `uf-separator-membrane`) — slight structural asymmetry.

---

## Badge

### 1. Governance
| Field | Value |
|---|---|
| category | **display** (not primitive) |
| status | **stable** |
| a11yReviewed | true |
| mobileReviewed | true |
| aliases / replacedBy | none (related: Text) |

### 2. Props (5 documented)
| Prop | Type | Default | Req | Purpose |
|---|---|---|---|---|
| text | string | — | no | Badge text |
| variant | enum `default\|primary\|secondary` (**.tsx also accepts tones + `outline`** as legacy) | `default` | no | Structural variant |
| appearance | enum `fill\|outline` | `outline` | no | Fill vs outline |
| tone | enum `neutral\|accent\|positive\|warning\|destructive` | `neutral` | no | Semantic status tone |
| children | ReactNode (json: string) | — | no | Custom children (overrides text) |

Also spreads `HTMLAttributes<HTMLSpanElement>`. Renders through **`Text`** (`as="span"`, `inset="control"`, `membrane`).

### 3. Variants / appearance / tones
- variant (3 documented): default, primary, secondary.
- appearance (2): fill, outline.
- tone (5): neutral, accent, positive, warning, destructive.
- **[LEGACY]** `.tsx` `variant` type = `BadgeVariant | BadgeTone | 'outline'` — legacy callers can pass `accent/positive/warning/destructive/neutral` or `outline` as `variant`; component remaps: `outline`→appearance=outline + variant=default; a tone value → tone + variant=default.

### 4. States
- `data-*`: `data-variant`, `data-appearance`, `data-tone`, `data-part`/`data-scope`.
- No interactive states. aria: **json declares `role="status"` but the component does NOT emit it** (see drift).

### 5. Anatomy / sub-components
- Anatomy parts: `root` only. No sub-components. Class `uf-badge`; content delegated to Text.

### 6. Token mapping
- Component tokens: `--uf-badge-outline-width`, `--uf-badge-bg`, `--uf-badge-fg`, `--uf-badge-border`.
- Semantic fallbacks: `--uf-membrane`, `--uf-control-pad-icon`, `--uf-control-line-height`, `--uf-font-size-xs`, `--uf-font-weight-bold`, `--uf-radius-full`, `--uf-color-primary(-fg)/-hover-bg/-fg/-border/-destructive(-fg)/-accent(-fg)/-success(-foreground)/-warning(-foreground)`.
- Per-tone CSS sets bg/fg/border together; `appearance="outline"` uses `--uf-badge-border` for text + inset box-shadow over `--uf-color-black-0` background; `fill` uses bg/fg.

### 7. Contract drift
- **[DRIFT] `variant` legacy values undocumented**: `.tsx` accepts tone names + `'outline'` as `variant` (compat remapping), but `.json` `variant.options` = only `default/primary/secondary`. Legacy accepted surface is hidden from the contract.
- **[DRIFT/A11Y] `role="status"` documented but not implemented**: `.json` `aria.role = "status"`, but `Badge` renders a plain Text span with **no `role`**. Either the contract is wrong or the a11y behavior is missing (`a11yReviewed:true` is inaccurate).
- **[DRIFT-minor]** json types `children` as `string` vs `.tsx` `ReactNode`.

### 8. Legacy / cleanup flags
- **[A11Y]** Missing `role="status"` (and no `aria-live`) despite contract + `a11yReviewed:true`. Status badges won't announce.
- **[LEGACY]** `LegacyBadgeVariant` union + runtime remap (`badgeTones` set, `variantProp === 'outline'` branch) is a compat shim overloading `variant` to also mean tone/appearance. Split cleanly or document + deprecate.
- Default `appearance` is `outline` — mildly surprising for a "status indicator" (most DS default to fill); intentional but worth noting.
- Category is `display`, not `primitive` (audit groups it with primitives; governance disagrees).

---

## Cross-cutting observations
- **Type under-documentation is systemic**: every `.json` types ReactNode-accepting props (`icon`, `children`, `rightText`, `actions`) as `string`. Consumers relying on the contract will under-use them.
- **Merged-component shims live inside primitives**: Button↔Clipboard (`copyText`), Icon↔registry/provider, Badge↔legacy variant. These are the biggest "enterprise polish" debt.
- **Dead CSS**: Button `[data-variant="delete"]` rule is unreachable (component pre-maps to `destructive`).
- **a11y claims vs reality**: Badge (`role=status` missing), Button (icon-only accessible name not enforced), Tile (`a11yReviewed:false` + wrong aria doc) all warrant re-review before "stable/enterprise" sign-off.
- **Cross-component token coupling**: Tile focus ring borrows `--uf-button-ring-color`; Separator/others hardcode `--uf-color-border` without a component alias.
