# Face UI — Form Controls Audit

Scope: **Input, Checkbox, Radio, Switcher, Toggle, SegmentedControl, Slider, Rating**
Source: `/Users/grenev/Documents/workspace/face-ui/`
Method: read each `.tsx` + `.json`, grep `uf-<name>` classes / `data-*` in `assets/styles/components.css`, governance from `component-registry.json`. No code changed.

---

## Cross-cutting summary (API consistency)

| Control | value shape | primary callback | legacy `onChange` sig | `name`/form | `required` | `error`/`description` | `membrane` default | `disabled` |
|---|---|---|---|---|---|---|---|---|
| Input | `value: string` | `onValueChange({value})` | native `onChange(event)` (not legacy — kept) | ✅ | ✅ | ✅ error+description | `false` | ✅ |
| Checkbox | `checked: bool\|'indeterminate'` | `onCheckedChange({checked})` | `onChange(event)` (undocumented) | ✅ | ✅ | ❌ | `true` | ✅ |
| Switcher | `checked: bool` | `onCheckedChange({checked})` | `onChange(boolean)` | ✅ | ✅ | ❌ | `true` | ✅ |
| Radio | `value: string\|null` | `onValueChange({value})` | `onChange(value: string)` | ✅ | ✅ | ❌ | `true` | ✅ (group) |
| Toggle | `value: string[]` | `onValueChange({value})` | — none | ❌ | ❌ | ❌ | `true` | ✅ (group) |
| SegmentedControl | `value: string[]` | `onValueChange({value})` | — none | ❌ | ❌ | ❌ | `true` (via wrapper default *undefined*) | ✅ |
| Slider | `value: number[]\|number` | `onValueChange({value: number[]})` | `onChange(number)` scalar | ❌ | ❌ | ❌ (label only) | none | ✅ |
| Rating | `value: number` | `onValueChange({value})` | — none | ❌ | ❌ | ❌ (label only) | none | ✅ |

**Consistency findings**
- **`onChange` legacy alias has four incompatible signatures**: `event` (Checkbox), `boolean` (Switcher), `string` (Radio), `number` (Slider). Input's `onChange` is genuinely the native event handler, colliding semantically with the "legacy alias" meaning used elsewhere. There is no single documented convention.
- **`value`/`checked` split is coherent** (`onValueChange({value})` vs `onCheckedChange({checked})`), but the `{…}`-object detail wrapper is inconsistently paired with plain-scalar legacy aliases.
- **Form participation is uneven**: only Input, Checkbox, Switcher, Radio expose `name` + hidden native inputs. **Toggle, SegmentedControl, Slider, Rating have no `name` and cannot participate in a native `<form>`.**
- **Validation surface is Input-only**: only Input has `error`/`description`. No shared error/help-text pattern across the other controls.
- **`membrane` default differs**: Input `false`; Checkbox/Radio/Switcher/Toggle `true`; SegmentedControl declares no default (passes through, so effectively `undefined` → Toggle's `true`); Slider/Rating have no `membrane` prop at all.
- **`required` only on Input/Checkbox/Switcher/Radio.**
- **Accessible-name gap on groups**: Toggle & SegmentedControl JSON require `aria-label`, but the component provides no `aria-label`/`ariaLabel` prop and does **not** spread `...rest` onto the root — so a group name cannot be supplied (see Toggle/SegmentedControl below). Radio and Rating similarly expose no name-passing prop.

---

## Input

**1. Governance** — category `form`, status **stable**, a11yReviewed ✅, mobileReviewed ✅, related: Text, Select, Date. No aliases/deprecation.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| value | string | — | | controlled; synced via `SYNC_VALUE` |
| defaultValue | string | — | | uncontrolled seed ("components API compatibility") |
| id | string | auto `useId()` | | **present in TSX, MISSING from JSON** |
| name | string | — | | native name |
| type | `default\|text\|email\|number\|date\|password` | `default` | | `default` → textarea/text; others → native input |
| textLayout | `scroll\|wrap` | `scroll` | | wrap → auto-grow textarea |
| autoGrow | boolean | `true` | | |
| disabled | boolean | `false` | | |
| readOnly | boolean | `false` | | Input is the only control with `readOnly` |
| label | ReactNode (JSON: string) | — | | |
| description | ReactNode (JSON: string) | — | | |
| error | string | `""` | | |
| labelOrientation | `vertical\|horizontal` | `vertical` | | |
| placeholder | string | — | | |
| ariaLabel | string | — | | |
| controlRole | AriaRole | — | | for composite owners |
| ariaControls / ariaActiveDescendant / ariaAutoComplete / ariaExpanded / ariaHasPopup | aria passthrough | — | | |
| spellCheck | boolean | — | | |
| icon | ReactNode (JSON: string) | — | | string → `<Icon>` |
| iconPosition | `left\|right` | `left` | | |
| stretchText | boolean | `false` | | |
| required | boolean | `false` | | renders `*` |
| autoFocus | boolean | — | | |
| autoComplete | string | — | | |
| min / max / step | number\|string | — | | number type |
| minLength / maxLength | number | — | | |
| pattern | string | — | | single-line only |
| onValueChange | `({value})` | — | | machine |
| onChange / onBlur / onFocus / onKeyDown | native handlers | — | | |
| controlRef | Ref | — | | |
| membrane | boolean | `false` | | |
| className | string | — | | |

**3. Axes** — type (6), textLayout (2), labelOrientation (2), iconPosition (2).

**4. States** — data: `data-scope=input`, `data-label-orientation`, `data-invalid`, `data-icon-position`, `data-part=input|textarea|label`, `data-text-layout=scroll|wrap`, `data-stretch-text`, `data-empty` (machine, drives clear-button reveal), icon `data-position`. aria: `aria-describedby` (description+error ids), `aria-invalid`, native `disabled`/`readOnly` (+ aria-disabled/aria-readonly per JSON), error node `role=alert aria-live=polite`. Keyboard: `Escape`=clear when clear button present. Controlled+uncontrolled both supported.

**5. Anatomy** — root / label / control (icon, native input/textarea, clear button) / description / error. Optional `uf-membrane--full` wrapper.

**6. Tokens** — component: `--uf-input-icon-size`, `--uf-input-required-gap`. Fallbacks: `--uf-control-*`, `--uf-radius`, `--uf-membrane`, font-size/weight, `--uf-color-fg/-muted/-hover-bg/-destructive/-error`, motion tokens.

**7. Contract drift** — `id` prop exists in TSX but **absent from JSON**. JSON types `label`/`description`/`icon` as `string`; TSX allows `ReactNode`. `type` option ordering differs (cosmetic). Otherwise aligned.

**8. Legacy/cleanup** — `defaultValue` doc labelled "components API compatibility" (compat shim). Required-indicator note: "accepts legacy danger/error fallbacks until color aliases are burned down" (`--uf-color-destructive` + `--uf-color-error` both referenced — color-token duplication to burn down). Textarea auto-grow uses magic constant `BASE_H = 32` (hardcoded px, not tokenized).

---

## Checkbox

**1. Governance** — `form`, **stable**, a11y ✅, mobile ✅, related: Radio, Switcher.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| checked | `boolean\|'indeterminate'` | — | | controlled; `SET` sync |
| defaultChecked | `boolean\|'indeterminate'` | `false` | | |
| disabled | boolean | `false` | | |
| required | boolean | `false` | | on hidden input |
| name | string | `''` | | |
| label | ReactNode | — | | |
| onCheckedChange | `({checked})` | — | | |
| className | string | — | | |
| membrane | boolean | `true` | | |
| **onChange** | `(event)` | — | | **LEGACY, undocumented — `CheckboxLegacyProps`, not in interface, not in JSON** |

**3. Axes** — tri-state checked (unchecked/checked/indeterminate).

**4. States** — data: `data-scope=checkbox`, `data-has-label`, `data-icon-left`, `data-icon-only`, control `data-state`, `data-part`. Icons: MinusIcon (indeterminate) / CheckOnIcon / CheckOffIcon. aria: role `checkbox`, `aria-checked=true|false|mixed`, `aria-disabled`, `aria-required`. Hidden native `input[type=checkbox]` (readOnly) for form participation. Root is `<label>`; click handler `preventDefault()` + machine `TOGGLE` (ignores clicks originating on the INPUT).

**5. Anatomy** — root(label) / control(span with icon) / hiddenInput / label(Text). Membrane wrapper default on.

**6. Tokens** — component: `--uf-checkbox-control-size`, `--uf-hidden-input-size`, `--uf-hidden-input-offset`. Fallbacks: control geometry, radius, hover-bg, fg, membrane.

**7. Contract drift** — **`onChange` legacy prop entirely undocumented** (in TSX only). JSON `checked`/`defaultChecked` typed as `union` with options `[true,false,"indeterminate"]` — matches.

**8. Legacy/cleanup** — `CheckboxLegacyProps.onChange` compat shim (fires with a synthetic event whose `preventDefault` was already called — semantics questionable). Inconsistent with sibling controls (Switcher/Radio legacy `onChange` pass scalars, Checkbox passes event).

---

## Radio

**1. Governance** — `form`, **stable**, a11y ✅, mobile ✅, related: Checkbox, Select.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| options | `RadioOption[]` `{value,label,disabled?}` | `[]` (JSON shows demo default) | | |
| value | `string\|null` | — | | controlled |
| defaultValue | string | — | | |
| name | string | — | | on each radio input |
| disabled | boolean | `false` | | whole group |
| required | boolean | `false` | | on each input |
| orientation | `horizontal\|vertical` | `vertical` | | |
| onValueChange | `({value})` | — | | |
| className | string | — | | |
| membrane | boolean | `true` | | |
| **onChange** | `(value: string)` | — | | **LEGACY alias — TSX only, not in JSON** |
| **flow** | `horizontal\|vertical` | — | | **LEGACY orientation alias — TSX only, not in JSON** |

**3. Axes** — orientation (2); per-option disabled.

**4. States** — data: `data-scope=radio`, `data-orientation`, `data-disabled` (group), item `data-value`, `data-icon-left`, `data-part=item`, role `radio` per item, root role `radiogroup`. Roving focus via `state.context.focusedValue` → `.focus()`. Hidden native `input[type=radio]` (readOnly, tabIndex -1, inline-styled visually-hidden). Icons RadioOnIcon/RadioOffIcon.

**5. Anatomy** — root / item(label, multiple) / control / indicator / label(Text `.uf-radio-text`).

**6. Tokens** — component: `--uf-radio-indicator-size`. Fallbacks: control geometry, radius, fg, hover-bg, `--uf-color-disabled-opacity`.

**7. Contract drift** — **`onChange` and `flow` legacy props missing from JSON.** `value` is `string|null` in TSX vs `string` in JSON. JSON `options` has a hardcoded 3-item demo `default` array (documentation artifact, component default is `[]`).

**8. Legacy/cleanup** — two undocumented compat props (`onChange`, `flow`). **a11y gap:** JSON declares `aria-label` required for the `radiogroup`, but the component exposes **no `aria-label`/`ariaLabel` prop and no `...rest` spread** — the group cannot be given an accessible name via props. Hidden input uses an **inline `style` object** (not tokenized/class-based) for visual hiding — inconsistent with the class-based hiding elsewhere.

---

## Switcher

**1. Governance** — `form`, **stable**, a11y ✅, mobile ✅, related: Checkbox, SegmentedControl.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| checked | boolean | — | | controlled |
| defaultChecked | boolean | — | | |
| disabled | boolean | `false` | | |
| required | boolean | `false` | | |
| name | string | `''` | | |
| value | string | `'on'` | | hidden input value when checked |
| label | ReactNode | — | | takes priority |
| text | string | — | | shorthand, used when `withText` |
| withText | boolean | `true` | | |
| textWrap | `truncate\|wrap` | `truncate` | | |
| onCheckedChange | `({checked})` | — | | |
| onChange | `(checked: boolean)` | — | | **LEGACY alias — TSX only, missing from JSON** |
| className | string | — | | |
| membrane | boolean | `true` | | |
| *(…HTMLAttributes)* | rest | — | | spread onto root div |

**3. Axes** — textWrap (2); checked on/off.

**4. States** — data: `data-scope`, `data-switch-only`, `data-text-wrap`, control `data-state=checked`, `data-part=label|control|thumb`, `data-disabled`. aria: role `switch`, `aria-checked`, control `aria-labelledby=labelId` (only when a label/text is present). Hidden native input (readOnly). Thumb animates via `--uf-switcher-thumb-translate-x`.

**5. Anatomy** — root / label(Text) / control / thumb / hiddenInput.

**6. Tokens** — component aliases: `--uf-switcher-control-size`, `-track-inset-block/-inline`, `-track-radius`, `-thumb-size/-top/-left/-translate-x`. Fallbacks: control geometry, membrane, radius/radius-full, colors, motion.

**7. Contract drift** — legacy `onChange` missing from JSON. **`label`/`text`/`withText` create a redundant dual label API** not present on any sibling — potential confusion (both `label` and `text`; `withText` gates `text` only).

**8. Legacy/cleanup** — legacy `onChange(boolean)`. **a11y gap:** for `switch-only` (no label/text), the control gets no `aria-labelledby`; an `aria-label` passed via `...rest` lands on the **root div**, not on the element carrying `role=switch` — so an icon-only switch has no accessible name. Redundant `label` vs `text` API is a cleanup candidate.

---

## Toggle  ⚠️ DEPRECATED

**1. Governance** — `form`, **deprecated**, a11y ✅, mobile ✅, related & **replacedBy: SegmentedControl**. Usage doc literally says "Deprecated — use SegmentedControl instead."

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| items | `ToggleItem[]` `{value,label,disabled?}` | `[]` | | |
| value | `string[]` | — | | array even in single mode |
| defaultValue | `string[]` | — | | |
| type | `single\|multiple` | `multiple` | | |
| disabled | boolean | `false` | | group |
| orientation | `horizontal\|vertical` | `horizontal` | | |
| onValueChange | `({value: string[]})` | — | | |
| className | string | — | | |
| membrane | boolean | `true` | | |

**3. Axes** — type (2), orientation (2), per-item disabled.

**4. States** — data: `data-scope=toggle`, item `data-part=item`, `data-state=on`, membrane wrapper `data-membrane-interactive`, `data-orientation` (via getRootProps). Items are `<button type=button>`. Roving focus. aria: root role `group`. Keyboard: Arrow Left/Right focus, Enter/Space toggle.

**5. Anatomy** — root / item(button, multiple). No indicator.

**6. Tokens** — component: `--uf-toggle-border-width`. Fallbacks: membrane, `--uf-overlay-surface-border`, radius, control-height/pad, colors, `--uf-font-weight-bold`, emphasis motion. Uses `--uf-color-black-0` for background (item + track).

**7. Contract drift** — JSON aligned with TSX.

**8. Legacy/cleanup** — **This is the deprecated primitive, yet it is the actual runtime engine for its own replacement (SegmentedControl wraps Toggle).** So "deprecated, replacedBy SegmentedControl" is circular — Toggle cannot be deleted without reimplementing SegmentedControl. Token notes say "should stay aligned with SegmentedControl while compatibility remains." No `name`/form participation. No `aria-label` prop and **no `...rest` spread** → group cannot be labelled despite JSON stating role=group needs a name. CSS `data-scope="toggle-group"` selectors exist alongside `.uf-toggle[data-scope]` — legacy scope name duplication.

---

## SegmentedControl

**1. Governance** — `form`, **stable**, a11y ✅, mobile ✅, **aliases: [Toggle]**, related: Switcher, Tabs. (Note the inverse of Toggle's `replacedBy`.)

**2. Props** (thin wrapper over Toggle)

| name | type | default | req | notes |
|---|---|---|---|---|
| items | `ToggleItem[]` | — | | |
| value | `string[]` | — | | |
| defaultValue | `string[]` | — | | |
| selectionMode | `single\|multiple` | `single` | | mapped to Toggle `type` |
| disabled | boolean | — | | |
| orientation | `horizontal\|vertical` | — | | |
| onValueChange | `({value})` | — | | |
| className | string | — | | |
| membrane | boolean | *(no default in JSON)* | | passes through to Toggle (`true`) |

Implementation: `const {selectionMode='single', ...rest} = props; return <Toggle type={selectionMode} {...rest} />`. `SegmentedControlItem` = empty `extends ToggleItem`.

**3. Axes** — selectionMode (2), orientation (2).

**4. States** — inherits Toggle entirely (renders `uf-toggle`, role `group`, item `data-state=on`).

**5. Anatomy** — JSON declares root / item / **indicator**.

**6. Tokens** — mirrors Toggle (`--uf-toggle-border-width` + same fallbacks). JSON note: "thin wrapper over Toggle; token mapping intentionally mirrors Toggle until dedicated segmented-control slots exist."

**7. Contract drift (significant)**
- **`indicator` part is documented (composition.required) but never rendered** — Toggle has no indicator element.
- **aria role mismatch**: JSON says `role: radiogroup`; actual DOM renders Toggle's **`role=group`** with button items. In single-selection mode the semantically correct role would be radiogroup, but the implementation never provides it.
- **Keyboard mismatch**: JSON says Enter/Space = `select`; Toggle machine action is `toggle`.
- JSON omits a `default` for `membrane` (Toggle defaults `true`).

**8. Legacy/cleanup**
- **Circular deprecation**: the "canonical" SegmentedControl is a shell around the deprecated Toggle; no dedicated styling (`uf-toggle` class), no dedicated machine, no dedicated slots.
- **Dead CSS**: `.uf-toggle[data-scope].uf-segmented-borderless` selector exists but no code path ever applies `uf-segmented-borderless` — orphan style / unfinished feature.
- **a11y**: passing `aria-label` to SegmentedControl forwards into Toggle's `...rest`, but **Toggle does not spread rest onto its root**, so the label is dropped → the group is unnameable despite JSON requiring `aria-label`.
- Single-mode `value` is still an array (`string[]`) — awkward for a single-selection segmented control (should arguably be a scalar).

---

## Slider

**1. Governance** — `form`, **beta**, a11y ✅, mobile ✅, related: Rating, Progress.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| variant | `simple\|advanced` | `simple` | | |
| value | `number[]\|number` | — | | single=[n], range=[min,max] |
| defaultValue | `number[]\|number` | — | | |
| scalarValue | number | — | | **legacy** advanced scalar |
| min / max / step | number | 0 / 100 / 1 | | |
| disabled | boolean | `false` | | |
| orientation | `horizontal\|vertical` | `horizontal` | | advanced is horizontal-only |
| label | ReactNode | — | | |
| aria-label | string | — | | |
| onValueChange | `({value: number[]})` | — | | |
| onChange | `(value: number)` scalar | — | | **legacy** advanced |
| leading | `none\|icon\|text\|iconText` | `none` | | advanced |
| leadingIcon | ReactNode (JSON: string) | — | | advanced |
| leadingText | string | — | | advanced |
| crop | boolean | `false` | | advanced |
| defaultCropRange / cropRange | `{min,max}` | — | | advanced |
| cropLocksValue | boolean | `true` | | advanced |
| onCropChange | `(range)` | — | | advanced |
| className | string | — | | |

**3. Axes** — variant (2), orientation (2), leading (4), single vs range (thumb count).

**4. States** — Simple: `data-scope=slider`, `data-part=root|track|range|thumb`, `data-orientation`, `data-disabled`, machine `dragging` state; thumbs get `aria-label` (`"<base> N"` for multi). aria role `slider` with valuemin/max/now (from getThumbProps). Advanced: native `input[type=range]` + crop marker buttons (`aria-label="Crop start/end"`), runtime CSS vars `--face-runtime-slider-*`.

**5. Anatomy** — root / label / track / range / thumb(multiple) / **output** (recommended). Advanced sub-component `SliderAdvanced` (row / leading / body / track / fill / trackAllowed / thumbMeasure / thumbButton / input / cropMarker×2).

**6. Tokens** — large component set incl. `--uf-slider-track-hit-size`, `-line-size`, `-thumb-size`, `-row-gap`, `-leading-gap`, `-body-basis`, `-edge-gap`, `-thumb-w-fallback`, `-crop-*`, plus runtime `--face-runtime-slider-*`. Fallbacks: control geometry, membrane, radius-full, colors, short motion.

**7. Contract drift** — JSON `leadingIcon` typed `string`; TSX allows `ReactNode`. `output` part is documented but **not rendered** by either simple or advanced (advanced shows value inside a `Button`, not an `<output>`). `value`/`defaultValue` JSON typed `array` only; TSX also accepts scalar `number`.

**8. Legacy/cleanup (multiple, notable)**
- **Two entirely separate implementations** (machine-driven simple vs hand-rolled React `SliderAdvanced`) behind one component — divergent behavior, keyboard, and DOM.
- **Implicit variant switching**: `advancedFeaturesRequested` auto-activates advanced when *any* advanced prop is set; advanced silently falls back to simple when `orientation==='vertical'` or >1 thumb (`canRenderAdvanced`). Surprising/undocumented behavior.
- **⚠️ Conditional hooks bug**: `Slider` early-returns `<SliderAdvanced/>` (line ~136) **before** calling `useControllableMachineProp`, `useMachine`, `useRef`, `useEffect`, `useCallback`. If `advancedFeaturesRequested`/`canRenderAdvanced` changes between renders (e.g. `crop` toggles, `onChange` added, thumb count changes, orientation flips), the hook count changes → React "rendered fewer/more hooks than expected" crash. Real production risk.
- **Hardcoded pixel constants** in SliderAdvanced: `EDGE_GAP_PX=2`, `MARKER_W_PX=10`, `BUFFER_PX=2`, initial `thumbW=34`, `Math.max(24,…)`, `decimals` clamp `6`. JSON acknowledges: "Advanced slider still contains small pixel constants… migrate them only with interaction regression coverage."
- `scalarValue` + scalar `onChange` are legacy shims duplicating `value`/`onValueChange`.
- No `name`/form participation.

---

## Rating

**1. Governance** — `form`, **beta**, a11y ✅, mobile ✅, related: Slider.

**2. Props**

| name | type | default | req | notes |
|---|---|---|---|---|
| value | number | — | | controlled |
| defaultValue | number | `0` | | uncontrolled (useState) |
| max | number | `5` | | star count |
| disabled | boolean | `false` | | |
| allowHalf | boolean | `false` | | |
| label | ReactNode | — | | |
| onValueChange | `({value})` | — | | |
| className | string | — | | |

**3. Axes** — max (count), allowHalf.

**4. States** — data (from machine/getItemProps): `data-scope`, `data-part`, star `data-state=active|half`, `data-selected`, `data-highlighted`, `data-half`, `aria-checked`, root `data-hovering`. Items are `<button type=button>`. aria role `radiogroup` with valuenow/min/max. Uncontrolled state held in React `useState` (unlike other controls that seed the machine context).

**5. Anatomy** — root / label / item(button, multiple). Star icon hardcoded `<Icon name="star" />`.

**6. Tokens** — component: `--uf-rating-gap`. Fallbacks: membrane, control-height, radius, `--uf-font-size-lg`, colors, fast motion.

**7. Contract drift** — JSON aligned with TSX.

**8. Legacy/cleanup**
- **Star icon not customizable** — hardcoded `Icon name="star"`; no `icon`/`emptyIcon` prop.
- **No `name`/form participation** and no `aria-label` prop / `...rest` spread, though JSON requires `aria-label` for the radiogroup.
- **Uncontrolled model inconsistent** with siblings: uses `useState` + `machineValue` recompute rather than seeding machine `initial`/`context` like Checkbox/Switcher — a divergent controlled/uncontrolled pattern.
- CSS carries both `data-state=half`/`data-half` and `data-state=active`/`data-selected`/`aria-checked`/`data-highlighted` selectors (redundant active-state selectors — cleanup candidate).

---

## Consolidated cleanup backlog

1. **Slider conditional-hooks bug** — hooks after an early `return` (crash risk on variant flip). Highest priority.
2. **SegmentedControl ↔ Toggle circular deprecation** — deprecated Toggle is the engine for its "replacement"; SegmentedControl has no own role (claims `radiogroup`, renders `group`), no `indicator` (documented, unrendered), dead `.uf-segmented-borderless` CSS, single-mode value still `string[]`.
3. **Undocumented legacy props** — Checkbox `onChange`, Radio `onChange`+`flow`, Switcher `onChange`, Slider `scalarValue`/`onChange` — none (except partially) in JSON; four incompatible `onChange` signatures.
4. **Group a11y naming gap** — Toggle/SegmentedControl/Radio/Rating cannot receive an accessible name via props (no `...rest` spread / no `ariaLabel`) despite JSON requiring `aria-label`. Switcher switch-only lacks accessible name.
5. **No form participation** for Toggle/SegmentedControl/Slider/Rating (no `name`, no hidden input).
6. **Contract drift**: Input `id` missing from JSON; Slider/Input `leadingIcon`/`icon`/`label` typed `string` in JSON vs `ReactNode`; Slider `output` part documented-but-unrendered; SegmentedControl `indicator` documented-but-unrendered; ReactNode vs string across several `label` props.
7. **Magic numbers**: Input `BASE_H=32`; SliderAdvanced `2/10/2/34/24/6`.
8. **API unification**: no shared `error`/`description`/validation surface beyond Input; inconsistent `membrane` defaults (and Slider/Rating lack the prop); Rating hardcoded star icon; Rating's divergent uncontrolled pattern.
