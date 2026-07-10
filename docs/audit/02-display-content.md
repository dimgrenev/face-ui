# Face UI Audit — Display & Content (02)

Scope: `Card, Setting, Skeleton, Avatar, Media, Markdown, Code`
Source root: `/Users/grenev/Documents/workspace/face-ui/`
CSS: `/Users/grenev/Documents/workspace/face-ui/assets/styles/components.css`
Registry: `/Users/grenev/Documents/workspace/face-ui/component-registry.json`
Read-only audit — no code changed.

---

## Card

**Files:** `Card/Card.tsx`, `Card/Card.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `display` |
| status | `stable` |
| a11yReviewed | `true` |
| mobileReviewed | `true` |
| related | Text, Media |
| aliases / replacedBy | none |

### 2. Props (root `<Card>`)
| Name | Type | Default | Req | Purpose / Notes |
|---|---|---|---|---|
| title | ReactNode | — | no | **Legacy** slot → Card.Title/Text (json: `string`). |
| description | ReactNode | — | no | **Legacy** slot → Card.Description/Text (json: `string`). |
| content | ReactNode | — | no | **Legacy** body slot; strings → Text (json: `string`). |
| footer | ReactNode | — | no | Footer slot (descriptor or array). json type `object`. |
| variant | CardVariant | `default` | no | Surface preset. |
| padding | CardPadding | `default` | no | Inset scale. |
| radius | CardRadius | `md` | no | Corner radius. |
| border | boolean | `true` | no | Draw membrane stroke. |
| interactive | boolean | `false` | no | Hover surface, not a button. |
| fullWidth | boolean | `true` | no | Stretch inline; false → intrinsic + center. |
| footerLayout | CardFooterLayout | `end` | no | **Legacy**; compound uses Card.Footer `layout`. |
| membrane | boolean | `true` | no | Sets `data-membrane` (see drift — unused in CSS). |
| children | ReactNode | — | no | Compound children / escape hatch. |

Sub-component props: `CardHeader.layout` (`stack`|`bar`, default `stack`), `CardFooter.layout` (`start`|`end`|`between`|`split`, default `end`), `CardActions.align` (`start`|`end`|`between`, default `end`), `CardTitle`/`CardDescription` extend `TextProps`.

### 3. Style axes
- **variant:** default, floating, dialog, code, showcase, plain
- **padding:** none, membrane, compact, control, default, spacious, showcase
- **radius:** none, base, sm, md, lg, xl, showcase
- **footerLayout / CardFooter.layout:** start, end, between, split
- **CardHeader.layout:** stack, bar
- **CardActions.align:** start, end, between

### 4. States / data-* / aria
Root data-attrs: `data-card-variant`, `data-padding`, `data-radius`, `data-border` (`"true"`/`"false"`), `data-interactive` (empty/undef), `data-full-width` (empty/undef), `data-membrane` (empty/undef). Parts: `data-part` on header/title/description/content/footer/actions; `data-layout` on header & footer; `data-align` on actions. Interactive: `:hover, :focus-within` → hover bg. **aria:** json declares `role="region"` but the TSX **never sets `role`** on the root (drift — see §8).

### 5. Anatomy / compound
Anatomy parts: root, header, title, description, content, footer, actions. Compound: `Card.Root/.Header/.Title/.Description/.Content/.Footer/.Actions`. Descriptor renderer accepts `Text`, `Button`, `Icon`, and all `Card.*` descriptors (`__componentName__`), auto-injecting `membrane` on Text/Button.

### 6. Tokens
Component vars (defined in CSS, not listed in json `component`): `--uf-card-bg`, `--uf-card-border`, `--uf-card-underlay-bg`, `--uf-card-background`, `--uf-card-pad`, `--uf-card-radius`, `--uf-card-border-width`, `--uf-card-shadow`, `--uf-card-blur`. Semantic fallbacks: `--uf-overlay-surface-*`, `--uf-radius-md/lg`, `--uf-font-weight-bold`, `--uf-font-size-md`.

### 7. Contract drift
- json `tokenMapping.component: []` but CSS defines 9 `--uf-card-*` tokens → **understated**.
- json prop types `string` for `title/description/content/children`; TSX = `ReactNode`.
- json declares `aria.role: "region"`; TSX renders no `role`.
- json documents no `default` values for any enum (TSX defaults exist).
- Sub-component enums (`CardHeader.layout` `bar`, `CardActions`) not represented in json props at all.

### 8. Legacy / cleanup flags
- **Dead attribute:** root emits `data-membrane` but no `.uf-card…[data-membrane]` rule exists → no-op.
- **Magic number:** `--uf-card-pad: 7px;` hardcoded (the "7px contained-surface rhythm"); `plain` variant hardcodes `--uf-card-blur: 0px`.
- **Legacy props:** `title`, `description`, `content`, `footerLayout` explicitly marked legacy in json; kept as compat shims.
- Missing `role="region"` despite claim → a11y gap vs registry `a11yReviewed: true`.
- Tooltip reuses `--uf-card-*` tokens (CSS ~3319) — cross-component coupling to note.

---

## Setting

**Files:** `Setting/Setting.tsx`, `Setting/Setting.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `pattern` |
| status | `beta` |
| a11yReviewed | `false` |
| mobileReviewed | `false` |
| related | Card, Switcher, Select, SegmentedControl |
| aliases / replacedBy | none |

### 2. Props
**Setting (row):**
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| label | ReactNode | — | no | Primary label. |
| description | ReactNode | — | no | Muted supporting copy. |
| badge | ReactNode | — | no | String → Badge; else raw node. |
| warning | ReactNode | — | no | Cautionary copy + warning icon. |
| control | ReactNode | — | no | Trailing control slot. |
| layout | `row`\|`stack` | `row` | no | Control inline vs full-width below. |
| align | `center`\|`start` | `center` | no | Vertical align info vs control. |
| disabled | boolean | `false` | no | Dim + block pointer. |
| highlighted | boolean | `false` | no | Deep-link emphasis (hover bg). |
| children | ReactNode | — | no | Nested full-width content. |

**Setting.Group (NOT in json props):** `title` (ReactNode), `description` (ReactNode), `variant` (`framed`|`plain`, default `framed`), `children`.

### 3. Style axes
- Setting: layout (row, stack); align (center, start).
- SettingGroup: variant (framed, plain).

### 4. States / data-* / aria
Root: `role="group"`, `aria-labelledby`, `aria-describedby`, `data-layout`, `data-align`, `data-disabled` (empty/undef), `data-highlighted` (empty/undef). Group: `<section>` with `aria-labelledby`, `data-variant`. Parts carry `data-part`. IDs generated via `useId()`. Framed group applies hairline separators + first/last row radius inheritance.

### 5. Anatomy / compound
Anatomy parts: root, info, label, description, warning, control, content, group, group-header, group-title, group-description, group-body. Compound: `Setting.Root`, `Setting.Group`. Descriptor renderer accepts `Switcher, Button, Input, Badge, Icon, Text`.

### 6. Tokens
Component: `--uf-setting-pad-x` (`--uf-spacing-3`), `--uf-setting-pad-y` (`--uf-spacing-3`), `--uf-setting-control-max-width` (`24rem`). Semantic fallbacks per json (spacing 1–4, radius, borders, control-height, hover-bg, disabled-opacity, motion).

### 7. Contract drift
- **Setting.Group props entirely absent** from json `props` (only surfaced via composition parts) → biggest gap: `variant`, group `title`, group `description` undocumented.
- json prop types `string` for label/description/badge/warning/control/children; TSX = `ReactNode`.
- json `aria.role: "group"` matches TSX. Good.

### 8. Legacy / cleanup flags
- **Magic number:** `--uf-setting-control-max-width: 24rem` hardcoded (not a shared token).
- `beta` + `a11yReviewed:false`/`mobileReviewed:false` → enterprise-polish blocker; needs a11y + responsive review before promotion.
- `warning` copy renders through Text with **empty part attrs** (`{}`) — the warning copy element has no `data-part` (only the wrapper does). Minor anatomy inconsistency.
- No documented enum defaults mismatch (json defaults present here — better than Card).

---

## Skeleton

**Files:** `Skeleton/Skeleton.tsx`, `Skeleton/Skeleton.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `display` |
| status | `stable` |
| a11yReviewed | `true` |
| mobileReviewed | `true` |
| related | Card |

### 2. Props
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| width | `number \| string` | — | no | Passed to inline `style.width`. json says `string`. |
| height | `number \| string` | — | no | Passed to inline `style.height`. json says `string`. |
| variant | `text`\|`circle`\|`rect` | `text` | no | Shape. |
| ...HTMLAttributes | — | — | no | Spread onto root div. |

### 3. Style axes
- variant: text, circle, rect. (Note: `rect` has **no dedicated CSS rule** — falls back to base `.uf-skeleton` + radius `--uf-radius`; only `text` and `circle` have explicit rules.)

### 4. States / data-* / aria
`data-variant`; `aria-hidden="true"`; pulse animation (`uf-skeleton-pulse`, opacity 1→0.5). **No `role`, no `aria-label`.**

### 5. Anatomy
Single part: root. No compound.

### 6. Tokens
Component: none. Semantic: `--uf-color-hover-bg`, `--uf-radius`, `--uf-radius-full`, `--uf-control-height`, `--uf-motion-duration-skeleton`, `--uf-motion-iteration-indefinite`, `--uf-motion-ease-in-out`.

### 7. Contract drift (significant)
- **aria conflict:** json declares `role="progressbar"` with required `aria-label`; TSX renders **`aria-hidden="true"` and no role/label** — opposite intent. Either the component is decorative (correct for a skeleton, aria-hidden) or a progressbar; json and code disagree.
- json `width`/`height` typed `string`; TSX accepts `number | string`.
- json `variant.default: "text"` matches TSX. Good.

### 8. Legacy / cleanup flags
- `rect` variant declared but no CSS rule → relies on base styling; arguably fine but undocumented.
- `a11yReviewed: true` is **questionable** given the json/TSX aria contradiction — resolve which model is canonical (aria-hidden decorative is the common correct choice; then fix the json).
- Default json states set width/height to `var(--uf-control-height)` strings — relies on consumer passing CSS var strings through `style`.

---

## Avatar

**Files:** `Avatar/Avatar.tsx`, `Avatar/Avatar.json`; machine `assets/machines/avatar.machine.ts`

### 1. Governance
| Field | Value |
|---|---|
| category | `display` |
| status | `stable` |
| a11yReviewed | `true` |
| mobileReviewed | `true` |
| related | Badge, Media |

### 2. Props
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| src | string | `''` | no | Image URL. |
| name | string | `''` | no | Initials + `alt` source. |
| icon | `IconName \| ReactNode` | — | no | Icon fallback (string → `<Icon>`). json says `string`. |
| fallback | ReactNode | — | no | Custom fallback. json says `string`. |
| children | ReactNode | — | no | Custom clipped media fallback. |
| fallbackDelayMs | number | `0` | no | Delay before fallback shows. |
| className | string | — | no | Root class. |

Fallback precedence: `children ?? icon ?? fallback ?? initials`.

### 3. Style axes
None — fixed circular chip at `--uf-control-height`, `--uf-radius-full`. **No size/tone variants** (unlike Media/Badge).

### 4. States / data-* / aria
Machine-driven: `data-scope="avatar"`, `data-part` (root/image/fallback), `data-state` (loading/loaded/error), image/fallback `hidden` toggled by computed `showImage`/`showFallback`. Image gets `alt={name}`. **Root span has NO `role` and NO `aria-label`** (getRootProps returns only part attrs + data-state).

### 5. Anatomy
Parts: root, image, fallback (+ `.uf-avatar__content` wrapper, not an anatomy part). No compound.

### 6. Tokens
Component: none. Semantic: `--uf-control-height`, `--uf-radius-full`, `--uf-font-weight-bold`, `--uf-font-size-sm`. Base bg `--uf-color-hover-bg`, fg `--uf-color-fg-muted`.

### 7. Contract drift
- **aria drift:** json `role="img"` + required `aria-label`; TSX/machine set **neither** on the root. Image `alt` exists, but when the fallback (initials/icon) shows there is no accessible name/role → screen-reader gap. Contradicts `a11yReviewed: true`.
- json types `icon`/`fallback` as `string`; TSX = `IconName | ReactNode`.
- json `children` typed `string`; TSX ReactNode.
- Empty `src=''` still renders an `<img src="">` (hidden) — harmless but sloppy; a blank src can trigger a spurious request/error state in some browsers.

### 8. Legacy / cleanup flags
- Missing root `role`/`aria-label` is the headline a11y blocker for a "stable/reviewed" component.
- No size variants — enterprise avatar usage (xs/sm/lg stacks, avatar groups) not supported; likely a polish gap given `related: Badge, Media`.

---

## Media

**Files:** `Media/Media.tsx`, `Media/Media.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `display` |
| status | `beta` |
| a11yReviewed | `false` |
| mobileReviewed | `true` |
| related | Card, Avatar |

### 2. Props
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| type | `image`\|`video`\|`audio` | `image` | no | Element kind. |
| src | string | — | **yes** | Source URL. |
| alt | string | `''` | no | Image alt. |
| variant | `default`\|`rounded`\|`circle`\|`thumbnail` | `default` | no | **image-only** compat variant. |
| lazy | boolean | `false` | no | **compat alias** → `loading="lazy"`. |
| loading | `eager`\|`lazy` | — | no | Native loading hint (overrides `lazy`). |
| decoding | `async`\|`sync`\|`auto` | — | no | Native decoding (defaults `async`). |
| poster | string | — | no | Video poster. |
| controls | boolean | — | no | Native controls (video/audio). |
| autoPlay | boolean | — | no | Autoplay. |
| loop | boolean | — | no | Loop. |
| muted | boolean | — | no | Start muted. |
| width | `number \| string` | — | no | Wrapper width. json `string`. |
| height | `number \| string` | — | no | Wrapper height. json `string`. |
| objectFit | `cover`\|`contain`\|`fill`\|`none` | — | no | CSS object-fit. |
| fallback | ReactNode | — | no | Error fallback. json `string`. |
| onError / onLoad | () => void | — | no | Callbacks. |
| className | string | — | no | Root class. |
| membrane | boolean | `false` | no | Membrane wrapper. |
| id | string | — | no | **Not in json props.** |
| role | string | — | no | Wrapper role passthrough. |
| ariaLabel | string | — | no | Sets aria-label. |
| 'aria-label' | string | — | no | DOM alias (**not in json props**). |
| title | string | — | no | title attr. |
| tabIndex | number | — | no | tabindex. |
| style | CSSProperties | — | no | Inline style. |

### 3. Style axes
- type: image, video, audio
- variant (image only): default, rounded, circle, thumbnail (`.uf-image--*`)
- objectFit: cover, contain, fill, none

### 4. States / data-* / aria
`data-type`, `data-error` (on load failure, error path renders fallback). `role`/`aria-label` **only if passed** — no default. Image relies on `alt`. Fallback part shown when `hasError && fallback`.

### 5. Anatomy
Parts: root, element, fallback. No compound.

### 6. Tokens
Component: `--uf-media-fallback-size` (`calc((control-height*2)+spacing-4)`). Semantic: control-height, radius/radius-md/sm/full, membrane, hover-bg, fg-muted, border.

### 7. Contract drift
- json `props` **missing `id`** and **`aria-label`** (both accepted by TSX).
- json declares `aria.role: "img"` + required `aria-label`, but TSX default sets **no role/label** (only passthrough). For `video`/`audio`, `role="img"` would be wrong anyway.
- json `width`/`height`/`fallback` typed `string`; TSX = `number|string` / ReactNode.
- `variant` class `uf-image--*` is always applied on the `<img>` even though json calls it "components API compatibility" — value `default` yields base `.uf-image` only (fine).

### 8. Legacy / cleanup flags
- **Compat cruft:** `lazy` (boolean) duplicates `loading` (enum); comment literally says "components API compatibility aliases". Candidate to deprecate in favor of `loading`.
- **Dead-for-non-image:** `variant`, `objectFit` image class only apply to `<img>`; `data-error`/fallback ignore `type` (video/audio error still swaps to fallback — OK, but variant styling won't).
- `type: (loading as any)` / `(decoding as any)` casts — loose typing.
- `beta` + `a11yReviewed:false`: no default accessible role/label story; `alt=''` default means decorative-by-default which can mask missing alts. Enterprise blocker.
- `src` is required in json but TSX has no runtime guard (empty src → broken element).

---

## Markdown

**Files:** `Markdown/Markdown.tsx`, `Markdown/Markdown.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `content` |
| status | `stable` |
| a11yReviewed | `true` |
| mobileReviewed | `true` |
| related | Text, Code |

### 2. Props
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| content | string | `''` | no | Markdown source. |
| gfm | boolean | `true` | no | Enable GFM (auto-detected too). |
| safeMode | boolean | `true` | no | Strict vs relaxed sanitizer. |
| allowRawHtml | boolean | `false` | no | Keep raw HTML tokens (still sanitized). |
| linkTarget | `_self`\|`_blank` | `_self` | no | Anchor target (internal links forced `_self`). |
| linkRel | string | `noopener noreferrer` | no | rel for `_blank`. |
| membrane | boolean | `true` | no | Membrane wrapper. |
| fullWidth | boolean | `true` | no | Full width + `data-full-width`. |
| ...HTMLAttributes | — | — | no | Spread on root. |

### 3. Style axes
No enum style variants. Boolean modifiers only (`membrane`, `fullWidth`). Two sanitize profiles (strict/relaxed) via `safeMode`.

### 4. States / data-* / aria
`data-full-width` (empty/undef). Content injected via `dangerouslySetInnerHTML`. **No `role="document"`** set (json claims it). Links rewritten: external → `linkTarget`+`rel`, internal (`/`,`#`) → `_self`. Task-list `input` forced `disabled`.

### 5. Anatomy
Parts: root, content. No compound.

### 6. Tokens
Rich component token set (18): `--uf-markdown-block-gap`, `-heading-gap`, `-h1..h5-size`, `-list-indent`, `-list-item-gap`, `-task-gap`, `-checkbox-size`, `-underline-offset`, `-blockquote-border-width`, `-code-pad-y/x`, `-table-pad-y/x`, `-table-border-width`. Semantic fallbacks: spacing, membrane, control-pad-text, font sizes/weights, mono family, radii, fg/border/hover colors.

### 7. Contract drift
- json `aria.role: "document"` — TSX sets **no role** anywhere. Straight drift.
- json states use both `\\n` (escaped, e.g. "Paragraphs and Breaks") and real `\n` (Default state) — inconsistent authoring; escaped `\\n` will render literal `\n`, so several demo states are subtly broken.
- No `--uf-markdown-h6-size` token though h6 is an allowed tag (h6 falls back to inherited size).

### 8. Legacy / cleanup flags
- **Dead ternary / logic smell:** `type: attribs.type === 'checkbox' ? 'checkbox' : 'checkbox'` — both branches identical; always coerces to `'checkbox'`. Cleanup candidate.
- json tokenMapping note admits: *"Code/pre backgrounds still reference primitive black alpha variables; migrate to semantic code-surface tokens in the token alias cleanup slice."* → known **token-debt TODO** (uses `--uf-color-black-*` primitives).
- Empty `catch {}` swallows all parse/sanitize errors → renders empty silently (no dev warning).
- `role="document"` missing undercuts `a11yReviewed: true`.

---

## Code

**Files:** `Code/Code.tsx`, `Code/Code.json`

### 1. Governance
| Field | Value |
|---|---|
| category | `content` |
| status | `stable` |
| a11yReviewed | `true` |
| mobileReviewed | `true` |
| related | Text, Button |

### 2. Props
| Name | Type | Default | Req | Purpose |
|---|---|---|---|---|
| code | string | — | no | Source string. |
| language | string | — | no | Sets `data-language` (unused in CSS). |
| tokenizedLines | `CodeToken[][]` | — | no | Pre-tokenized colored lines (Shiki etc). |
| title | string | — | no | Header bar title. |
| showLineNumbers | boolean | `false` | no | Line numbers. |
| highlight | number[] | `[]` | no | 1-based highlighted lines. |
| defaultCollapsed | boolean | `false` | no | Start collapsed (auto-off if short). |
| collapsedHeight | number | `160` | no | Collapsed max px. |
| className | string | — | no | Root class. |
| id | string | — | no | **Not in json props.** |
| role | string | — | no | Passthrough. |
| titleAttr | string | — | no | title attribute (compat). |
| style | CSSProperties | — | no | Inline style. |

`canToggle` auto-derived: `>8` lines OR `>240` chars.

### 3. Style axes
No enum variants. Renders through `Card variant="code" padding="none" radius="md"`. Booleans: showLineNumbers, defaultCollapsed. Pre states via classes `is-collapsed` / `is-scrollable`.

### 4. States / data-* / aria
Root emits `data-language`, `data-line-numbers`, `data-collapsed`, `data-has-header` — **none are referenced in CSS** (see §8). Line parts: `data-highlight` (styled), `data-line`. Line numbers `aria-hidden="true"`. Buttons have `aria-label` (Copy/Expand/Collapse). Collapse styling driven entirely by `.is-collapsed`/`.is-scrollable` classes on `<pre>`, not data attrs.

### 5. Anatomy / compound
TSX anatomy parts: **root, pre, line, lineNumber**. Header is a plain `.uf-code-header` div (NOT an anatomy part). No compound. Copy uses secure-context clipboard with legacy `execCommand('copy')` fallback.

### 6. Tokens
Component: `--uf-code-header-pad`, `--uf-code-scroll-max-height` (`control-height*15`), `--uf-code-fade-height`, `--uf-code-fade-h` (alias used in gradient), `--uf-code-line-number-width`. Semantic: control-height/-font-size, radius-md, mono family, font-size-sm. Colors: `--uf-color-bg-code`, `--uf-color-text-code`, `--uf-color-text-secondary`.

### 7. Contract drift (notable)
- **Anatomy vs json parts mismatch:** json `composition.parts` = `root, header, pre, lineNumbers`; TSX anatomy = `root, pre, line, lineNumber`. `header` is not an anatomy part; `lineNumbers` (json) vs `lineNumber` (TSX); `line` missing from json.
- json `aria.role: "code"` — TSX sets no default `role` (only passthrough `role` prop). Drift.
- json `props` **missing `id`** (accepted by TSX). json lists `titleAttr` but not `title`/`titleAttr` distinction clearly.
- json `tokenMapping.component` lists `--uf-code-fade-h`? No — it lists 5 tokens but omits `--uf-code-fade-h` alias actually used in the gradient. Minor.

### 8. Legacy / cleanup flags
- **Dead data attributes:** `data-language`, `data-line-numbers`, `data-collapsed`, `data-has-header` set on root but **no CSS consumes them** (collapse uses `.is-*` classes). Either wire them up or drop.
- **Magic numbers:** `collapsedHeight = 160`, `canToggle` thresholds `>8` lines / `>240` chars are hardcoded heuristics; json note flags `collapsedHeight` as a "numeric compatibility prop".
- json tokenMapping note admits: *"Code backgrounds still reference primitive black alpha variables … migrate only with visual regression coverage"* → **token-debt TODO** (`--uf-color-black-0/-4` used in fade gradient).
- Dead comment: `{/* Copy button is always available via header; no disabled button for collapse */}`.
- `role="code"` never applied → a11y claim vs reality gap.
- Copy has no user feedback (no "copied" state / toast) — enterprise polish gap.

---

## Cross-cutting findings

1. **aria contract drift is systemic.** Card (`region`), Skeleton (`progressbar` vs actual `aria-hidden`), Avatar (`img`+label), Media (`img`+label), Markdown (`document`), Code (`code`) all declare an `aria.role` in `.json` that the `.tsx` **never applies**. Yet registry marks Card/Skeleton/Avatar/Markdown/Code `a11yReviewed: true`. This is the top production-readiness blocker.
2. **json prop-type flattening.** Across all seven, ReactNode/number props are typed `string` in json (title/description/content/children/width/height/icon/fallback). Contracts under-describe the real API.
3. **json missing props.** Media & Code omit `id` (and Media omits `aria-label`) from `props`. Setting omits the entire `Setting.Group` prop set.
4. **tokenMapping.component understated for Card** (`[]` while 9 `--uf-card-*` tokens exist).
5. **Known token debt (self-documented):** Markdown and Code both still use `--uf-color-black-*` primitive alpha vars for code surfaces, flagged for a future "token alias cleanup slice."
6. **Compat shims to retire:** Card (`title`/`description`/`content`/`footerLayout` legacy slots), Media (`lazy` vs `loading`, `titleAttr`), Code (`titleAttr`, dead `data-*`).
7. **Dead code:** Card `data-membrane` (no CSS), Code four root `data-*` (no CSS), Markdown identical-branch `input` ternary.
8. **Beta components** (Setting, Media) correctly carry `a11yReviewed:false` and are the honest ones; the "stable + reviewed" components hide the larger aria gaps.
