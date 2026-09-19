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
| `fallbackDelayMs` | `fallbackDelay` | auto |
| The root, image and fallback carried `data-state="loading"` while a pending image waited out the delay | Only the root carries `data-state`: `idle` inside the delay, then `loading`, `loaded` or `error` | — |

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
| `overflowLabel` | `labels.more` | auto |
| Malformed `items` or keys, and a `maxItems` that is not an integer of at least 3, threw during render | The trail renders them normalized (bad items dropped, the first of a repeated key kept, `maxItems` clamped) and reports once in development | — |

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
| An unreadable `value`, `defaultValue`, `viewDate`, `defaultViewDate`, `min`, `max`, `disabledDates`, `locale` or `weekStartsOn` threw during render | The calendar renders without it and reports it once in development; a day given for a range, or a range for a day, is projected silently | — |

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
| `onCheckedChange` ran before the native `onChange` | `onChange` runs first, and its `preventDefault()` cancels the change | — |
| `syncCheckedInput` from `assets/adapters/react/use-checked-input` | `useCheckedInput(options)`, which owns the checked state and writes the input | manual |

### Code

| Before | After | Codemod |
| --- | --- | --- |
| `code` | children | auto |
| A wrapper typed with `CodeProps` (such as a syntax-highlighting one) took and passed the source as `code` | The wrapper reads and passes `children` and is fixed by hand: the codemod rewrites only `<Code code>` elements, and the type checker reports the wrapper and each of its `code` call sites | — |
| `highlight` | `highlightedLines` | auto |
| `titleAttr` | Remove it; a native tooltip on the whole block has no replacement (`title` is the header) | auto |
| `collapsedHeight` | `collapsedLines`, the number of lines a collapsed source shows (the old 160px showed about 7) | manual |
| A source collapsed when it had more than 8 lines or 240 characters, to `collapsedHeight` pixels | A source collapses when it has more lines than `collapsedLines` (default 8), to exactly its first that many lines; it cannot scroll while collapsed and expands from its first line | — |
| Without `title`, a short source had no copy button | The copy button is always there: in the header, which an untitled source of more than one line also gets, or at the inline end beside an untitled one-line source; a successful copy shows a check and announces `labels.copied` | — |
| `tokenizedLines` supplied the source when `code` was omitted, and their text was shown even where it differed from `code` | `children` is the only source; a line whose tokens are missing or spell other text (a highlighter still catching up) renders plain, so what is shown is what is copied | — |
| A final line break rendered an empty, numbered last line | A final line break ends the last line; the copy button still copies it | — |
| The root carried `data-language`; lines carried `data-line` and `data-highlight`; the `pre` carried `is-collapsed`/`is-scrollable` | `<code>` carries the `language-*` class; highlighted lines are `<mark>` elements; the root carries `data-state="collapsed" \| "expanded"` when the source can collapse; the `pre` is `dir="ltr"`, `translate="no"`, and `tabindex="0"` while it scrolls, `-1` otherwise | — |

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
| `showClear` | `clearable` | auto |
| `surfaceTitle` | The picker takes the field name: `label`, `aria-label` or `aria-labelledby` | manual |
| `surfaceBreakpoint` | `surface="auto"` switches to a sheet below 900px; pass `surface="sheet"` or `"popover"` to pin one | auto |
| The trigger showed "Pick date" or "Pick time", and an unlabelled field was named "Choose date" or "Choose time" | There is no English default: pass `placeholder`, and `label` or `aria-label` | — |
| Label, help and error were `.uf-date__label`, `.uf-date__description` and `.uf-date__error` inside `.uf-date__triggerWrap` | They are the shared Field parts `.uf-field__label`, `.uf-field__description`, `.uf-field__error` and `.uf-field__required` (`[data-scope="field"]`); `labelPosition` places the label | — |
| An unreadable `value`, `defaultValue`, `min`, `max`, `disabledDates`, `presets`, `format`, `locale`, `timezone` or `weekStartsOn`, or an out-of-range `disabledTime`, threw during render | The picker renders without it (a preset is dropped, a format or locale falls back) and reports it once in development; a point given for a range, or a range for a point, is projected silently | — |

### FloatingOverlay

| Before | After | Codemod |
| --- | --- | --- |
| `trigger` | `openOn` | auto |
| Its hover hook, `useHoverIntent({ enabled, open, triggerRef, contentRef, send })` from `assets/adapters/react/use-hover-intent`, sent pointer and focus events to a machine | `useHoverIntent({ value, onValueChange, openDelay, closeDelay })` proposes the open key; spread `trigger(key)` on each trigger and `content` on the surface | — |

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
| `clearLabel` | `labels.clear` | auto |
| `labelOrientation` | `labelPosition` | auto |
| `labelOrientation="vertical"`, `labelOrientation="horizontal"` | `labelPosition="top"`, `labelPosition="start"` | auto |
| `InputLabelOrientation` from `Input/Input` | `FieldProps['labelPosition']` (`'top' \| 'start'`) | manual |
| `membrane` defaulted to `false` | `membrane` defaults to `true`, like every control in a row; pass `membrane={false}` for the old spacing | — |
| `onValueChange` ran before the native `onChange` | `onChange` runs first, and its `preventDefault()` cancels the edit | — |
| The `error` message was a `role="alert"` live region | The control describes the message (`aria-describedby`); nothing is announced on render | — |
| Label, help, error and required marker were `.uf-input__description`, `.uf-input__error`, `.uf-input__required` and `[data-scope="input"][data-part="label"]` | They are the shared Field parts `.uf-field__label`, `.uf-field__description`, `.uf-field__error` and `.uf-field__required` (`[data-scope="field"]`) | — |
| `ref` pointed to the wrapper `<div>` | `ref` points to the native input or textarea; `className` and `style` still style the outer layout | — |

### Menu

| Before | After | Codemod |
| --- | --- | --- |
| The `.uf-menu` root was a `<div>` | It is a `<span>`, so a Menu is valid inside a `<p>`; select it by class | — |
| `trigger` | `openOn` | auto |
| `surfaceTitle` | `aria-label` | auto |
| `surfaceBreakpoint` | Remove it; `surface="auto"` becomes a sheet below 900px | auto |
| `MenuItemDef` from `Menu/Menu` | `MenuItem` from `Menu/Menu` | auto |
| `MenuSeparatorDef` from `Menu/Menu` | `MenuItemEntry`, which includes `{ type: "separator" }` | manual |
| `MenuGroupDef` from `Menu/Menu` | `MenuItemEntry`, which includes `{ type: "group", label, items }` | manual |
| Without children the trigger was an "Options" button, and "Options" titled the sheet | Without children nothing renders; the sheet is titled by `aria-label`, else by text children | — |
| `surfaceTitle` only titled the sheet; the menu had no accessible name | `aria-label` names the menu and titles the sheet; without it a click menu is named by its trigger | — |
| `ref` pointed to the `.uf-menu-content` surface, which stayed in the document while closed | `ref` and native attributes go on the `[role="menu"]` list, which exists only while open; `className` and `style` stay on `.uf-menu-content` | — |
| Items were Face UI Buttons (`.uf-button`, `[data-scope="button"]`) | Items are `[data-scope="menu"][data-part="item"].uf-menu-item` buttons, or links with `href`; the label is `.uf-menu-itemLabel` | — |
| `.uf-menu` and `.uf-menu-content` carried `data-trigger="click\|context"` | They carry `data-open-on="click\|context"`, after the prop | — |
| Typeahead read the text inside an item label that was an element | Typeahead reads `textValue`, else a text `label`; give an element label a `textValue` to keep it searchable | — |
| A context menu opened below its trigger | It opens at the pointer; `side`, `align` and `sideOffset` place click menus only | — |
| A press inside the context area kept an open context menu open, and closing it moved focus to the area or its first focusable element | Any press outside the menu closes it, and a right-click reopens it at the new point; focus returns to where it was when the menu opened | — |
| Opening by click kept focus on the trigger; Tab left the menu open; disabling an open menu left it open | A click focuses the menu list and a key opens at the first or last item; Tab closes it from the trigger; `disabled` closes it | — |

### Modal

| Before | After | Codemod |
| --- | --- | --- |
| `closeLabel` | `labels.close` | auto |
| `closeOnOverlayClick` | `closeOnBackdropClick` | auto |
| `placement="left"`, `placement="right"` | `placement="start"`, `placement="end"` | auto |
| `autoFocusOnOpen` | Nothing: opening always moves focus inside, to focus a child already took, else `[data-autofocus]`, else the first control; `portal={false}` previews never take focus | auto |
| `actions` | `footer` with Button elements, e.g. `footer={<><Button variant="outline" onClick={cancel}>Cancel</Button><Button variant="accent" onClick={save}>Save</Button></>}`; the last button is no longer made accent for you | manual |
| `ModalAction` | Button props in `footer` | manual |
| The close button was named "Close modal" | It is named "Close"; `labels.close` renames it | — |
| A closed Modal kept its body mounted and hidden, so a child with `autoFocus` never received focus when it opened | The surface mounts when the dialog opens and unmounts after it fades out; child state resets on every opening | — |
| An open `portal={false}` Modal still held focus and took Escape and outside presses, like a portaled one | An in-place Modal is a static preview: the page, Escape and focus are left alone and `scrollLock` does nothing | — |
| `edge="flush"` squared and unbordered a centered dialog | `edge` applies to edge placements only; a centered dialog stays inset | — |
| `placement="left"`/`"right"` sat on the right/left in right-to-left documents | `start`/`end` follow the dialog direction (`dir`, else the document), and the surface slides in from that side | — |
| A dialog without a title had no accessible name and no warning | An open dialog without `title`, `aria-label` or `aria-labelledby` is reported once in development | — |

### Overlay

| Before | After | Codemod |
| --- | --- | --- |
| `trigger` | `openOn` | auto |

### Pagination

| Before | After | Codemod |
| --- | --- | --- |
| `surfaceTitle` | `labels.choosePage` | auto |
| `labels`: `previousPage` and `nextPage` keys | the shared `previous` and `next` keys | manual |
| A `page`, `defaultPage`, `total`, `pageSize` or `siblingCount` out of range or not an integer threw during render | Pagination renders it normalized (integers clamped, non-numbers such as `"50"` replaced by the default) and reports once in development | — |
| `labels.page` without exactly one `{page}` threw during render | Every `{page}` is replaced by the number; a template without one gets the number appended after a space | — |
| The nav's `onClick` ran after the page changed | `onClick` runs first, and its `preventDefault()` cancels the change | — |

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
| `indeterminate` | `value={null}` | auto |

### Radio

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `ariaLabelledBy` | `aria-labelledby` | auto |
| `options` | `items` | auto |
| `RadioOption` | `RadioItem` | auto |
| Options sat directly in the radiogroup root | Items sit in `[data-part="list"]`; the root is a field (`uf-field`) that also holds `label`, `description` and `error` | — |
| An option repeating a value rendered twice under one React key | The first item with a value wins; later ones are dropped with a development report | — |
| Home and End did nothing | Home and End focus and select the first and last enabled item | — |

### Rating

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| Pressing the selected star again or Home cleared the value | Neither clears it; reset the value yourself. Show a fixed score with `readOnly`, not `disabled` | — |
| The root was an inline box sized to its stars; `label` was `[data-scope="rating"][data-part="label"]` inside the membrane | The root is a block field (`uf-field`) with `label`, `description` and `error` as `[data-scope="field"]` parts; `membrane` spaces the stars only | — |
| An invalid `max`, a non-finite `value`, `required` without `name` or a non-text `formatValue` result threw | Each renders normalized (`max` clamped to 1..10, score 0, `required` ignored, the default text) with one development report | — |
| Shrinking `max`, turning off `allowHalf` or leaving `readOnly` stored the rounded or bounded score | The stored score stays; only the shown one is bounded or rounded, so the exact score returns with the scale | — |

### SegmentedControl

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `selectionMode` | `multiple` instead of `"multiple"`; omit `"single"` | auto |
| Single selection used a one-element array | Single selection is a string or `null`; only `multiple` uses an array | — |
| An item without a string `value`, a repeated `value`, or a malformed `items`/`value` threw a TypeError | The item or key is skipped and a development report names it | — |
| A selected choice missing from `items` was discarded, so it stayed unselected when the item returned | The value is kept and the choice shows as selected again once its item is back; `onValueChange` is not called | — |
| The root was the bordered strip of choices | The root is a field (`uf-field`) with `label`, `description` and `error`; the border is on the `.uf-toggle-list` strip, which keeps its natural width, so a width set on the root no longer stretches it: also give `.uf-toggle-list` `inline-size: 100%` | — |
| Removing or disabling the focused choice moved focus to the selected or first choice | Focus moves to the choice now at its place, else the one before it | — |

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
| `options` | `items` | auto |
| `SelectOption` | `SelectItem` | auto |
| `closeLabel` | `labels.close` | auto |
| `surfaceTitle` | The sheet is titled by `label`, else by `aria-label`; pass `aria-label` to name a field without a visible label | manual |
| `surfaceBreakpoint` | Remove it; `surface="auto"` becomes a sheet below 900px | auto |
| `labelOrientation` | `labelPosition` | auto |
| `labelOrientation="vertical"`, `labelOrientation="horizontal"` | `labelPosition="top"`, `labelPosition="start"` | auto |
| `placeholder` defaulted to "Select option", which also titled a sheet without a label | There is no default text: pass `placeholder`, and name the field with `label`, `aria-label` or `aria-labelledby` (an unnamed Select is reported in development) | — |
| A value missing from `options` showed its raw key in the trigger and was submitted | It shows as unselected and is not submitted until an item with that value appears; the value itself is kept | — |
| The label was `[data-scope="select"][data-part="label"]` at 11px, and the root carried `data-label-orientation` | Label, required marker, `description` and `error` are the shared Field parts (`.uf-field__*`, `[data-scope="field"]`, 12px label); the root carries `data-label-position` | — |
| A failed `required` check showed only the browser bubble | The browser message also fills the field error slot and marks the trigger `aria-invalid` until a value is chosen; `error` wins over it | — |
| Home and End did nothing on a closed list | Home and End open the list at the first or last enabled item | — |

### Separator

| Before | After | Codemod |
| --- | --- | --- |
| `role` | `decorative={false}` for `role="separator"`; `decorative` for `role="none"`. A role passed anyway is ignored | auto |
| `aria-orientation` | Set `orientation` to the direction the line is drawn in; a separator that is not decorative announces it. A passed `aria-orientation` is ignored | manual |
| `children` | Place the text beside the separator; a separator is only a line | manual |
| Outside a flex or grid row a vertical separator was 0 tall without membrane, and its line 2px shorter than a control with membrane | The line is at least `--uf-control-height` tall and stretches with its row; membrane only adds its spacing around it | — |
| The line’s min and max width and height were pinned, so a className or style could not widen or lengthen it (a resize handle stayed 1px wide) | Only the thickness is set; a className or style sizes the line directly, and a widened line is painted in the separator color unless that rule also sets its background | — |

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
| `onCropChange` | `onCropRangeChange` | auto |
| `onCropCommit` | `onCropRangeCommit` | auto |
| `onCropRangeChange`: The crop range itself, `{ min, max }` | `{ cropRange }`, with `cropRange` as `{ start, end }` | manual |
| `onCropRangeCommit`: The crop range itself, `{ min, max }` | `{ cropRange }`, with `cropRange` as `{ start, end }` | manual |
| `cropRange`: `{ min, max }` | `{ start, end }`; `min` and `max` name the ends of the scale | manual |
| `defaultCropRange`: `{ min, max }` | `{ start, end }`; `min` and `max` name the ends of the scale | manual |
| `onValueChange`: `details.value` was always an array | `details.value` has the shape of `value`/`defaultValue`: a number for a number, an array for an array | manual |
| `onValueCommit`: `details.value` was always an array | `details.value` has the shape of `value`/`defaultValue`: a number for a number, an array for an array | manual |
| An empty or non-finite `value`, a `labels.thumbs` of the wrong length, a blank control name, a non-object crop range or a non-text `formatValue` result threw during render | The slider renders: non-finite entries are dropped (none left reads as `min`), missing or blank names and text fall back to the defaults, and malformed data is reported once in development | — |
| Narrowing `max`, `min` or the crop rewrote the uncontrolled value (and the default crop) to the clamped one, so widening again did not bring it back | The value is kept and shown clamped; widening the scale or the crop shows it again, and the default crop follows the scale until the user edits it | — |
| `onValueCommit`/`onCropRangeCommit` fired only when the parent had accepted the last proposal of the gesture | They fire when a gesture ends showing a different value than at its start, whatever the parent accepted along the way | — |
| ArrowRight decreased a vertical slider in right-to-left text | ArrowRight and ArrowUp always increase a vertical slider; only a horizontal right-to-left track swaps Left and Right | — |
| The label was a `Text` part (`[data-scope=slider][data-part=label]`, `.uf-slider__label`) with the membrane around it | The root is a field (`uf-field`) with `label`, `description`, `error`, `labelPosition` and a `required` marker; the label is `.uf-field__label` in the shared field typography, and each thumb carries the description, the error and `aria-invalid` | — |

### Steps

| Before | After | Codemod |
| --- | --- | --- |
| Malformed `items` or keys, and a `step` or `defaultStep` that is not a nonnegative integer, threw during render | Steps render them normalized (bad items dropped, the first of a repeated key kept, the index clamped) and report once in development | — |
| The root group was named "Steps" by default | The root has no default name; name it with `aria-label` or `aria-labelledby` | — |
| The root's `onClick` ran after the step changed | `onClick` runs first, and its `preventDefault()` cancels the change | — |
| An uncontrolled step beyond an empty or shorter `items` list fell back for good | It waits for the items to arrive; only removing the current step moves it, to the last one left | — |

### Switcher

| Before | After | Codemod |
| --- | --- | --- |
| `text` | `label`, provided only when it should show | auto |
| `withText` | Provide or omit `label` | auto |
| `textWrap` | `truncate` instead of `"truncate"`; omit `"wrap"` | auto |
| `SwitcherTextWrap` | The boolean `truncate` prop | manual |
| A long label was cut to one line with an ellipsis | A long label wraps; set `truncate` to keep one line | — |
| `ref` pointed to the wrapper `<div>` | `ref` points to the native checkbox `<input>`; `className` and `style` still style the visible row | — |
| `onCheckedChange` ran before the native `onChange` | `onChange` runs first, and its `preventDefault()` cancels the change | — |

### Table

| Before | After | Codemod |
| --- | --- | --- |
| `membrane` styled rows as tiles | `rowStyle="tile"` styles rows; `membrane` adds outer spacing only | — |

### Tabs

| Before | After | Codemod |
| --- | --- | --- |
| `withLine` | `variant="underline"` | auto |
| `items[].actionIcon` | Put controls in `actions`; the other `action*` fields and `onAction` go with it | manual |
| `items[].leadingIcon` | `items[].icon` | manual |
| `items[].trailingIcon` | Put a status mark in `label`, or a control in `actions` | manual |
| A `value` missing from `items` selected no tab and showed no panel | The first enabled tab shows until the key appears; nothing is reported to `onValueChange` | — |
| A `defaultValue` missing from the first `items` was replaced by the first enabled tab for good | It waits until `items` contain it; only removing the selected tab moves the selection, to its neighbour | — |
| In automatic mode any focus on a tab selected it | Arrow keys, Home and End select; focus from a script or the Tab key does not | — |
| Invalid or duplicate item keys, external items without `panelId` or with `content`, and empty or repeated ids threw a TypeError | Tabs renders: bad items are dropped (first key wins) and reported, a tab without `panelId` in external mode gets no `aria-controls` and is reported, external `content` is ignored | — |
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

### Toast

| Before | After | Codemod |
| --- | --- | --- |
| `dismissible` | `closable` | auto |
| `closeLabel` | `labels.close` | auto |
| `onDismiss` | `onClose` | auto |
| The close button rendered without `onDismiss` and did nothing | The close button, and Escape inside the toast, appear only when `onClose` can be called | — |
| Clicking the action always closed the toast; `action.onClick` received no event | `action.onClick(event)` runs first; `event.preventDefault()` keeps the toast open | — |
| Only the first toast of a series closed itself, and hovering did not pause it | Every toast closes after its own `duration`; a pointer over a toast, focus in the region or a background window pauses all of them, keeping the time left | — |
| Toasts beyond `maxVisible` were dropped | They wait behind the newest ones with their time stopped and appear as those close | — |
| `createToastContext({ defaultDuration })`; its `toaster` exposed the machine service | `createToastContext({ duration })`; its `toaster` is `{ toast, dismiss }`, the object `useToast()` returns | — |

### Toaster

| Before | After | Codemod |
| --- | --- | --- |
| `dismissible` | `closable` | auto |
| `closeLabel` | `labels.close` | auto |
| `placement="bottom-left"`, `placement="bottom-right"`, `placement="top-left"`, `placement="top-right"` | `placement="bottom-start"`, `placement="bottom-end"`, `placement="top-start"`, `placement="top-end"` | auto |
| The newest toast was last in every placement | The newest toast sits nearest the viewport edge: last at the bottom, first at the top | — |

### Toggle

| Before | After | Codemod |
| --- | --- | --- |
| `toggleMachine` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `toggleAnatomy` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `connectToggle` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `ToggleSchema` from `assets/machines/toggle.machine` | Use `SegmentedControl`; the state machine is internal | manual |
| `type` | `multiple` instead of `"multiple"`; omit `"single"` | auto |
| Without `type`, Toggle pressed independent options | Toggle is `SegmentedControl`: without `multiple` it selects one choice, so add `multiple` where `type` was omitted | — |
| `value`: an array in both modes | A string or `null` without `multiple`, as is `onValueChange`'s `details.value`; an array with it | manual |
| `defaultValue`: an array in both modes | A string or `null` without `multiple`; an array with it | manual |
