# Migration

Generated from `scripts/migrations/*.ts` by `pnpm migration:sync`; do not edit by hand.

Run `pnpm migrate <paths…>` for a dry run, add `--write` to apply the `auto` rows, or `--check`
to fail while any listed usage remains. Rows marked `manual` are reported, never rewritten.

## 0.2.0 (unreleased)

### All components

| Before | After | Codemod |
| --- | --- | --- |
| `normalizeProps` from `assets/adapters/react/normalize-props` | Spread the props onto the element directly | manual |
| `NormalizedProps` from `assets/adapters/react/normalize-props` | The props type itself | manual |
| `useDismissOutside` from `assets/adapters/react/use-dismiss-outside` | `useLayer` from `assets/adapters/react/use-layer` | manual |
| `UseDismissOutsideOptions` from `assets/adapters/react/use-dismiss-outside` | The options of `useLayer` from `assets/adapters/react/use-layer` | manual |
| `useFocusTrap` from `assets/adapters/react/use-focus-trap` | `useLayer` from `assets/adapters/react/use-layer` | manual |
| `installMembraneInteractions` from `assets/membrane-interactions` | Remove the call; each component owns its membrane | manual |
| `FormControlProps` | `FieldProps` for label, description, error and labelPosition; each control declares disabled, required, name, membrane and className itself | manual |

### Accordion

| Before | After | Codemod |
| --- | --- | --- |
| `expandedIds` | `expanded` | auto |
| `defaultExpandedIds` | `defaultExpanded` | auto |
| `onExpandedChange`: `details.expandedIds` | `details.expanded` | manual |
| Malformed `items`, `expandedIds` or `headingLevel` threw during render | The accordion renders with the value normalized and reports it once in development | — |

### Avatar

| Before | After | Codemod |
| --- | --- | --- |
| `icon` | `fallback={<Icon name="…" />}` | manual |
| `children` | `fallback={content}` | manual |

### Badge

| Before | After | Codemod |
| --- | --- | --- |
| `appearance` | `variant="fill"`; omit `"outline"`, the default | auto |
| `text` | children | auto |
| `BadgeAppearance` | `BadgeVariant` | auto |
| The root carried the fill or outline treatment as `data-appearance` | The root carries it as `data-variant` | — |

### Bar

| Before | After | Codemod |
| --- | --- | --- |
| `Bar.LeftEllipsis` | `Bar.Section grow` | auto |
| `Bar.Right` | `Bar.Section align="end"` | auto |
| `Bar.LeftOverlap` | `Bar.Section grow` for the content and `Bar.Section align="end"` for the actions | manual |

### Breadcrumb

| Before | After | Codemod |
| --- | --- | --- |
| `collapseAfter` | `maxItems` | auto |
| `allowNavigation` | Links always navigate; cancel the click in your own handler to stay on the page | manual |
| `collapseAfter` below 3, or not finite, turned collapsing off | `maxItems={null}` turns it off, and the codemod writes it for such literals; a number must be an integer of at least 3 | — |

### Button

| Before | After | Codemod |
| --- | --- | --- |
| `selector` | `chevron="down"`, or `chevron="end"` with `selectorDirection="side"` | auto |
| `selectorDirection` | The `chevron` value | auto |
| `selectorOpen` | `aria-expanded` | auto |
| `iconPosition="left"`, `iconPosition="right"` | `iconPosition="start"`, `iconPosition="end"` | auto |
| `ButtonSelectorDirection` | `ButtonChevron` (`down` \| `end`) | manual |
| `text` | children | auto |
| `align="left"`, `align="right"` | `align="start"`, `align="end"` | auto |
| `rightText` | `meta` | auto |
| `chevron="right"` | `chevron="end"` | auto |
| `level` | `indent` | auto |
| `chevron="right"` and `align="left"`/`"right"` pointed to the physical side in right-to-left text | `chevron="end"` mirrors and `align="start"`/`"end"` follow the text direction | — |

### Calendar

| Before | After | Codemod |
| --- | --- | --- |
| `value`: `Date`, or `{ start, end }` of `Date` | A `YYYY-MM-DD` string, or `{ start, end }` of them; a `Date` or a date-time string is invalid | manual |
| `defaultValue`: `Date`, or `{ start, end }` of `Date` | A `YYYY-MM-DD` string, or `{ start, end }` of them; a `Date` or a date-time string is invalid | manual |
| `min`: `Date` | A `YYYY-MM-DD` string; a `Date` or a date-time string is invalid | manual |
| `max`: `Date` | A `YYYY-MM-DD` string; a `Date` or a date-time string is invalid | manual |
| `disabledDates`: `Date[]` | `YYYY-MM-DD` strings | manual |
| `onValueChange`: `details.value` was a `Date` or a range of them | `details.value` is a `YYYY-MM-DD` string or a range of them | manual |
| `weekStartsOn` defaulted to 0 (Sunday) | The first weekday follows `locale`; set `weekStartsOn` to pin it | — |

### Card

| Before | After | Codemod |
| --- | --- | --- |
| `interactive` | `hoverable` | auto |
| `footerLayout` | `footerAlign` | auto |
| `Card.Header layout` | `orientation` | auto |
| `Card.Header layout="stack"`, `Card.Header layout="bar"` | `orientation="vertical"`, `orientation="horizontal"` | auto |
| `Card.Footer layout` | `align` | auto |
| `CardFooterLayout` | `CardAlign` | auto |
| `CardActionAlign` | `CardAlign` | auto |
| `CardHeaderLayout` | `CardHeaderOrientation` (`vertical` \| `horizontal`) | manual |
| `content` | children | auto |
| `Card.Title text` | children | auto |
| `Card.Description text` | children | auto |
| `Card.Title align="left"`, `Card.Title align="right"` | `align="start"`, `align="end"` | auto |
| `Card.Description align="left"`, `Card.Description align="right"` | `align="start"`, `align="end"` | auto |
| `content` without `title`, `description` or `footer` was wrapped in the content part | Children without `title`, `description` or `footer` render directly in the card; wrap them in `Card.Content` to keep the part | — |

### Checkbox

| Before | After | Codemod |
| --- | --- | --- |
| `ref` pointed to the `<label>` | `ref` points to the native checkbox `<input>`; `className` and `style` still style the label | — |

### Date

| Before | After | Codemod |
| --- | --- | --- |
| `showPresets` | Pass `presets`; they render whenever the list is not empty | manual |
| `views` | `mode` and `openTo` | manual |
| `clearLabel` | `labels.clear` | auto |
| `nowLabel` | `labels.now` | auto |
| `closeLabel` | `labels.close` | auto |
| `presets`: `{ label, value }` items | Each item also needs an `id`, unique within the picker | manual |
| `weekStartsOn` defaulted to 1 (Monday) | The first weekday follows `locale`; set `weekStartsOn` to pin it | — |
| `ref` pointed to the wrapper `<div>` | `ref` points to the trigger `<button>`; `className` and `style` still style the whole field | — |

### Icon

| Before | After | Codemod |
| --- | --- | --- |
| `label` | `aria-label` | auto |

### Input

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `controlRole` | `role` | auto |
| `ariaControls` | `aria-controls` | auto |
| `ariaActiveDescendant` | `aria-activedescendant` | auto |
| `ariaAutoComplete` | `aria-autocomplete` | auto |
| `ariaExpanded` | `aria-expanded` | auto |
| `ariaHasPopup` | `aria-haspopup` | auto |
| `controlRef` | `ref` | auto |
| `textLayout` | `multiline` instead of `"wrap"`; omit `"scroll"` | auto |
| `stretchText` | Remove it; it had no effect | auto |
| `iconPosition="left"`, `iconPosition="right"` | `iconPosition="start"`, `iconPosition="end"` | auto |
| `InputTextLayout` | The boolean `multiline` prop | manual |
| `ref` pointed to the wrapper `<div>` | `ref` points to the native input or textarea; `className` and `style` still style the outer layout | — |

### Menu

| Before | After | Codemod |
| --- | --- | --- |
| The `.uf-menu` root was a `<div>` | It is a `<span>`, so a Menu is valid inside a `<p>`; select it by class | — |

### Modal

| Before | After | Codemod |
| --- | --- | --- |
| `scrollLock` defaulted to `false` | `scrollLock` defaults to `portal`: a portaled modal locks page scroll unless `scrollLock={false}` | — |

### Popover

| Before | After | Codemod |
| --- | --- | --- |
| `interactive` | Remove it; Popover opens on click, use Tooltip for hover content | auto |
| `openDelay` | Remove it; Popover opens on click, use Tooltip for hover content | auto |
| `closeDelay` | Remove it; Popover opens on click, use Tooltip for hover content | auto |

### Progress

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |

### Radio

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `ariaLabelledBy` | `aria-labelledby` | auto |

### Rating

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| Pressing the selected star again or Home cleared the value | Neither clears it; reset the value yourself. Show a fixed score with `readOnly`, not `disabled` | — |

### SegmentedControl

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `selectionMode` | `multiple` instead of `"multiple"`; omit `"single"` | auto |
| Single selection used a one-element array | Single selection is a string or `null`; only `multiple` uses an array | — |

### Select

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `type` | `multiple` instead of `"multiselect"`; omit `"select"` | auto |
| `variant` | `surface="side"` or `iconOnly fullWidth={false}`; omit `"default"` | auto |
| `SelectVariant` | The `surface` and `iconOnly` props | manual |
| `computeSelectSidePosition` from `Select/Select` | `computeSelectSidePosition` from `Select/select-side-position` | auto |
| `computeSelectSideOptionViewportHeight` from `Select/Select` | `computeSelectSideOptionViewportHeight` from `Select/select-side-position` | auto |
| `SelectSidePosition` from `Select/Select` | `SelectSidePosition` from `Select/select-side-position` | auto |
| `ref` pointed to the wrapper `<div>` | `ref` points to the native trigger `<button>` | — |
| The `.uf-select` root and `.uf-select-wrapper` were `<div>`s | Both are `<span>`s, so a Select is valid inside a `<p>`; select them by class | — |

### Slider

| Before | After | Codemod |
| --- | --- | --- |
| `variant` | `showValue` instead of `"advanced"`; omit `"simple"` | auto |
| `leadingIcon` | Put leading content in `label` or next to the slider | manual |
| `leadingText` | Put leading content in `label` or next to the slider | manual |
| `cropLocksValue` | `clampToCrop` | auto |
| `SliderVariant` | The boolean `showValue` prop | manual |
| `SliderAdvanced` from `Slider/SliderAdvanced` | `Slider` with `showValue` and `crop` | manual |
| `SliderAdvancedProps` from `Slider/SliderAdvanced` | `SliderProps` | manual |
| `SliderCropRange` from `Slider/SliderAdvanced` | `SliderCropRange` from `Slider/Slider` | auto |

### Switcher

| Before | After | Codemod |
| --- | --- | --- |
| `text` | `label`, provided only when it should show | auto |
| `withText` | Provide or omit `label` | auto |
| `textWrap` | `truncate` instead of `"truncate"`; omit `"wrap"` | auto |
| `SwitcherTextWrap` | The boolean `truncate` prop | manual |
| A long label was cut to one line with an ellipsis | A long label wraps; set `truncate` to keep one line | — |
| `ref` pointed to the wrapper `<div>` | `ref` points to the native checkbox `<input>`; `className` and `style` still style the visible row | — |

### Table

| Before | After | Codemod |
| --- | --- | --- |
| `membrane` styled rows as tiles | `rowStyle="tile"` styles rows; `membrane` adds outer spacing only | — |

### Tabs

| Before | After | Codemod |
| --- | --- | --- |
| `withLine` | `variant="underline"` | auto |
| `items[].actionIcon` | Put controls in `actions`; the other `action*` fields and `onAction` go with it | manual |
| `tabsMachine` from `assets/machines/tabs.machine` | Use `Tabs`; the state machine is internal | manual |
| `tabsAnatomy` from `assets/machines/tabs.machine` | Use `Tabs`; the state machine is internal | manual |
| `connectTabs` from `assets/machines/tabs.machine` | Use `Tabs`; the state machine is internal | manual |
| `TabsSchema` from `assets/machines/tabs.machine` | Use `Tabs`; the state machine is internal | manual |

### Text

| Before | After | Codemod |
| --- | --- | --- |
| `iconPosition="left"`, `iconPosition="right"` | `iconPosition="start"`, `iconPosition="end"` | auto |
| `text` | children | auto |
| `align="left"`, `align="right"` | `align="start"`, `align="end"` | auto |
| `variant="blockquote"` rendered a `<div>` | `variant="blockquote"` renders `<blockquote>`; set `as` to choose another element | — |
| `align="left"` and `align="right"` stayed on the physical side in right-to-left text | `align="start"` and `align="end"` follow the text direction | — |

### Tile

| Before | After | Codemod |
| --- | --- | --- |
| `selector` | `chevron="down"` | auto |
| `selectorOpen` | `aria-expanded` | auto |
| `busy` | `aria-busy` | auto |
| `selectedDescendant` | `active={active \|\| selectedDescendant}` | manual |
| `intent` | `interactive={false} tone="muted"` for a section heading; an explicit `role` and its ARIA state for a custom control | manual |
| `iconPosition="left"`, `iconPosition="right"` | `iconPosition="start"`, `iconPosition="end"` | auto |
| `TileIntent` | The `interactive`, `tone` and `role` props | manual |
| `text` | children | auto |
| `rightText` | `meta` | auto |
| `align="left"`, `align="right"` | `align="start"`, `align="end"` | auto |
| `chevron="right"` | `chevron="end"` | auto |
| `level` | `indent` | auto |
| `rightText` sat inside the label area and joined a button row's accessible name | `meta` renders in its own part before the actions and is not part of the row's name | — |
| A Tile with `aria-expanded` but no `onClick`, `role` or `interactive` rendered an inert `<div aria-expanded>` | `aria-expanded` makes the row a disclosure button; pass `interactive={false}` to opt out | — |

### Toggle

| Before | After | Codemod |
| --- | --- | --- |
| `toggleMachine` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `toggleAnatomy` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `connectToggle` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `ToggleSchema` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
