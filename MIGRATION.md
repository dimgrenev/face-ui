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

### Carousel

| Before | After | Codemod |
| --- | --- | --- |
| `slides` | One child per slide: `<Media src alt />` for each former `{ src, alt }` (in JSON, `{ "__componentName__": "Media", "src": …, "alt": … }`) | manual |
| `CarouselMediaSlide` from `Carousel/Carousel` | `MediaImageProps` of the `Media` children | manual |
| `useControllableMachineProp` from `assets/adapters/react/use-controllable-machine-prop` | `useControllableState` from `assets/adapters/react/use-controllable-state` | manual |
| `ariaLabel` | `aria-label` | auto |
| `orientation` | Remove it; a carousel moves horizontally. Content that scrolls vertically belongs in `Scroll` | auto |
| A text or number child became an image whose URL was that text | A text child is a text slide; images are `Media` children, and any other JSON descriptor is reported and left out | — |
| Control names, slide names, the rotation button text and the announced kinds were fixed English strings | `labels` renames them: `previous`, `next`, `play`, `pause`, `slide` (`{index}`, `{count}`), `goToSlide` (`{index}`), `roleCarousel`, `roleSlide` | — |
| The root took only `className`; every indicator was a tab stop marked `aria-pressed`; one slide still showed two disabled arrows and a dot | The root takes native attributes; the indicators are one tab stop whose arrows move and activate, the current one marked `aria-current`; a single position shows no controls | — |
| Without `loop`, autoplay stopped at the last slide while its button still read "Pause rotation"; focus paused it, a click did not | Autoplay returns to the first slide after the last; a move by the user, keyboard focus inside (on the rotation control too) or a press outside the rotation control stops it until the rotation control starts it, hover pauses it; the rotation control is an icon button named `labels.play`/`labels.pause` | — |
| In right-to-left text the track slid the wrong way and showed nothing; arrows and swipes did not mirror | The track, ArrowLeft/ArrowRight and swipes follow the computed text direction, however it is set; the arrow icons follow the nearest `dir` attribute; the track follows the pointer while dragged | — |
| `slidesPerView` above the number of slides stretched the slides to fill the width | Each slide keeps its `1 / slidesPerView` share; a fractional or zero `slidesPerView` is reported and becomes a whole number from 1 | — |
| The root and viewport carried `data-state` (`idle`, `dragging`, `auto-playing`); slides carried `aria-hidden` and `data-state` | Slides outside the view are `inert` (also on React 19) and marked by the absence of `data-current`; the root carries no state attribute | — |

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

### Command

| Before | After | Codemod |
| --- | --- | --- |
| `value` | `search` | auto |
| `defaultValue` | `defaultSearch` | auto |
| `onValueChange` | `onSearchChange` | manual |
| `onValueChange({ value })` reported the search text | `onSearchChange({ search })` reports it; read `search` from the details | — |
| `surfaceBreakpoint` | Remove it; `surface="auto"` becomes a dialog below 900px | auto |
| `emptyContent` | `labels.empty` | auto |
| `groups` | Group items: `{ type: "group", label, items }` inside `items`, in list order | manual |
| `items[].group` | Move the item into its group item: `{ type: "group", label, items: [item] }` | manual |
| `items[].id` | `items[].value` | manual |
| `items[].onSelect` | Command `onSelect({ value })`, branching on `value` | manual |
| `onSelect({ item })` received a copy of the item with its label turned into a string | `onSelect({ value })` receives the item value | — |
| `CommandGroup` | `CommandItemEntry`, which includes `{ type: "group", label, items }` | manual |
| An element `label` was searched as the text "[object Object]" | The search reads `textValue`, else a text `label`, plus `keywords`; give an element label a `textValue` | — |
| The whole search had to occur as one piece of the label or of a keyword | Every word of the search must occur in the item text or a keyword, ignoring case and accents | — |
| `placeholder` defaulted to "Search..." and named the field, the list ("Command items") and the dialog ("Commands") | There is no default text; `aria-label`, `aria-labelledby` or `placeholder` names the field, its list, the dialog and its trigger | — |
| `ref` and `className` went on the `.uf-command` box, and the component took no other native attributes | `ref` and native attributes (`id`, `autoFocus`, `onKeyDown`, `aria-describedby`…) go on the search field, which a dialog renders only while open; `className` and `style` stay on `.uf-command` | — |
| The empty text showed only for a search without results; the empty part sat inside the listbox | It shows whenever no item is listed, after the listbox | — |
| Items were grouped after the ungrouped ones, and Enter could pick another item than the highlighted one | Items and groups keep their order in `items`; Enter picks the highlighted item | — |
| The root carried `data-state="focused\|idle"`; group labels had `role="presentation"` | No focus state attribute (use `:focus-within`); group labels are `aria-hidden` and name their group | — |

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

### Media

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| `ref`, `id`, `role`, `tabIndex` and `aria-label` went to the wrapping box, `title` to both the box and the element; other native attributes were dropped | `ref` and every native attribute go to the `<img>`, `<video>` or `<audio>` element; only `className` and `style` stay on the box | — |
| `alt` defaulted to `""`, so an image without it was silently decorative; any type accepted every prop | `type` selects the props: an image requires `alt` (`""` marks it decorative) and takes `variant`; video and audio take player attributes and `<track>` children | — |
| `variant="rounded"` | `variant="default"` | auto |
| `onLoad()` and `onError()` received no event; on video and audio `onLoad` ran on `loadeddata` | `onLoad(event)` and `onError(event)` are the element's native events; video and audio report loading through the native `onLoadedData(event)` | — |
| An image in a box with a height stretched to fill it unless `objectFit` was set; a video kept its own width | Images default to `objectFit="cover"`; video and audio fill the box width and video keeps `contain` | — |
| A failed load replaced the element with the fallback and set `data-error` on the box; an empty `src` requested the page | The box carries `data-state` (`loading`, `loaded`, `error`), a player counting as loaded once its metadata arrives or the browser holds off fetching until playback; a missing or empty `src` counts as failed; the fallback shows beside the element, which is hidden | — |
| The JSON contract listed `title` | `title` is left out of the contract, as it names nothing reliably; an image is named by `alt` and a player by `aria-label`. In TSX it still reaches the element as a native attribute | — |
| `MediaLoading` from `Media/Media` | `ImgHTMLAttributes<HTMLImageElement>['loading']` | manual |
| `MediaDecoding` from `Media/Media` | `ImgHTMLAttributes<HTMLImageElement>['decoding']` | manual |
| `mediaAnatomy` from `Media/Media` | The `[data-scope="media"][data-part="root" \| "element" \| "fallback"]` attributes | manual |

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

### Navigation

| Before | After | Codemod |
| --- | --- | --- |
| `activeId` | `value` | auto |
| `defaultActiveId` | `defaultValue` | auto |
| `onActiveChange` | `onValueChange` | auto |
| `onValueChange`: `details.id` | `details.value` | manual |
| `items[].id` | `items[].value` | manual |
| `orientation` | Remove it: the bar is horizontal; a vertical navigation is `Panel` | manual |
| `surfaceBreakpoint` | Remove it; `surface="auto"` becomes a sheet below 900px | auto |
| `surfaceTitle` | `aria-label` | auto |
| A `<div role="navigation">` with a `menubar` of `menuitem`s; `className` and `ref` moved to the sheet host and dialog on narrow screens | A `<nav>` landmark of links and disclosure buttons (APG disclosure navigation) on every surface; native attributes, `className`, `style` and `ref` stay on it | — |
| `items[].onClick()` took no event and cancelled the item's `href` | `items[].onClick(event)` runs first; the link is followed unless it calls `event.preventDefault()`, and the item still becomes current | — |
| Items nested two levels deep rendered as a labelled section of the dropdown | A dropdown section is `{ type: "group", label, items }`; `items` of a dropdown link are ignored | — |
| Hovering a dropdown item opened it at once, and `onActiveChange` also fired when `activeId` changed from the parent | Hover opens after 200 ms and closes 150 ms after leaving; `onValueChange` reports only user activations | — |
| In the sheet, links were buttons that called `location.assign`, and the sheet was titled "Navigation" | The sheet is a modal bottom sheet of real links, titled by `aria-label`; `labels.open` and `labels.close` name its buttons | — |
| The landmark had no name unless `surfaceTitle` was set | The `<nav>` and its sheet are named "Main" until `aria-label` or `aria-labelledby` names them | — |
| A click with Ctrl, Cmd, Shift or Alt on a link also made it current and closed its dropdown or the sheet | Such a click opens the link elsewhere and leaves the current item, the dropdown and the sheet as they are | — |
| Items had `data-active`; bar buttons were `.uf-navigation-trigger`, dropdown links `.uf-navigation-dropdownItem` Buttons, and the sheet used `.uf-navigation-sheet*` classes | The current link has `aria-current="page"` and the bar button holding it `data-current`; style `[data-part="trigger"]`, `[data-part="link"]` and `.uf-navigation-section` instead | — |

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

### Panel

| Before | After | Codemod |
| --- | --- | --- |
| `selectedId` | `value` | auto |
| `defaultSelectedId` | `defaultValue` | auto |
| `onSelectedChange` | `onValueChange` | auto |
| `onValueChange`: `details.selectedId` | `details.value` | manual |
| `items[].id` | `items[].value` | manual |
| `surfaceBreakpoint` | Remove it; `surface="auto"` becomes a sheet below 900px | auto |
| `surfaceTitle` | `aria-label` | auto |
| `Sidebar` from `Panel/Panel` | `Sidebar` from `compat` | auto |
| `SidebarProps` from `Panel/Panel` | `SidebarProps` from `compat` | auto |
| `SidebarItem` from `Panel/Panel` | `SidebarItem` from `compat` | auto |
| Rows were Buttons (`.uf-sidebar-itemButton`) with `aria-pressed`; `href` rows called `location.assign`, and `onClick()` took no event | Rows are links or buttons (`.uf-sidebar-item`) with `aria-current="page"`; `onClick(event)` runs first and `preventDefault()` cancels only the link | — |
| Group rows always showed their children; the group button only flipped `aria-expanded` | A group shows its rows while expanded (`expanded`); on mount the groups holding the current row are expanded | — |
| The rail hid the rows of every group, and only string labels named icon-only rows | A group in the rail expands the panel at that group (in a rail without the toggle it shows its rows in place); every label stays as the accessible name | — |
| A disabled group's rows stayed usable, and a click with Ctrl, Cmd, Shift or Alt on a link also made it current and closed the sheet | Disabling a group disables its rows; such a click opens the link elsewhere and leaves the current row and the sheet as they are | — |
| Rows had `data-selected` and `data-state`; parts were `itemIcon`, `itemLabel` and `groupContent`, and a group's button was `groupLabel` | The current row has `aria-current="page"`; parts are `icon`, `label`, `group` (the rows of a group) and `trigger` (its button) | — |
| The header always held the collapse toggle, an empty footer followed the rows, and "[" toggled the rail | `collapsible={false}` removes the toggle; there is no footer and no keyboard shortcut | — |
| The sheet covered the whole viewport, titled "Panel"; `className` and `ref` moved to its host and dialog | The sheet is a modal drawer at the start edge, titled by `aria-label`; the `<nav>` and the sheet are named "Sidebar" until `aria-label` or `aria-labelledby` names them; the `<nav>` keeps native attributes, `className`, `style` and `ref` | — |
| `onSelectedChange` and `onCollapsedChange` also fired when the parent changed `selectedId` or `collapsed` | `onValueChange` and `onCollapsedChange` report only user actions | — |

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

### Scroll

| Before | After | Codemod |
| --- | --- | --- |
| `ariaLabel` | `aria-label` | auto |
| Without `height`, the box was 240px tall | Without `height`, the box is as tall as its content or as its layout makes it (a flex or grid cell, `style.maxHeight`); pass `height={240}` to keep the former size | — |
| The viewport was always a tab stop and a region named "Scrollable text" or `ariaLabel` | It is a tab stop only while its content overflows along an axis it scrolls, and stays focusable by script after; until measured (server HTML, no ResizeObserver) it has no tabindex, so the browser decides. A tab stop without `aria-label` or `aria-labelledby` is named "Scrollable content", and it is a region only while it is named | — |
| The ref and `className` went to the outer box, and no other attribute or handler was passed on | The ref, native attributes and handlers (`id`, `onScroll`, `aria-*`, `data-*`) go to the scrolling viewport; `className` and `style` go to the outer box. Scroll owns `role`, `tabIndex`, `hidden` and the content, so those are not accepted | — |
| Text in a horizontal or both-axes Scroll wrapped at the box width (never narrower than 12 control heights), so it rarely scrolled sideways | Text that can scroll sideways keeps each line whole and scrolls; in a vertical Scroll it wraps as before | — |

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
| `dangerouslySetInnerHTML` | Place the markup beside the separator; a separator is only a line | manual |
| `defaultValue` | Nothing: a separator holds no value, and the attribute never did anything | auto |
| `defaultChecked` | Nothing: a separator holds no value, and the attribute never did anything | auto |
| Outside a flex or grid row, a vertical separator with membrane drew its line 2px shorter than a control | The line is one control tall there. Without membrane it still takes its height only from its row or its own style | — |
| The line’s thickness was pinned by min and max sizes, so no className or style could widen it (a resize handle stayed 1px wide) | A style on the line, or a className rule that outranks the library’s, widens it. A widened resize handle is painted in the separator color unless that rule also sets its background | — |
| With membrane, a horizontal separator in a row kept its container’s full width and overflowed the row | It never overflows: it shrinks along with its siblings, so a multi-word label beside it wraps unless it is kept on one line | — |
| In forced colors the line was repainted in the canvas color and disappeared | It is drawn in CanvasText | — |

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

### Toc

| Before | After | Codemod |
| --- | --- | --- |
| `activeId` | `value` | auto |
| `defaultActiveId` | `defaultValue` | auto |
| `onActiveChange` | `onValueChange` | auto |
| `onValueChange`: `details.id` | `details.value` | manual |
| `lineSide` | `line` | auto |
| `lineSide="left"`, `lineSide="right"` | `line="start"`, `line="end"` | auto |
| `withLine` | `line="none"` hides the rail; `line` defaults to `"start"` | auto |
| `items[].id` | `items[].value` | manual |
| `items[].disabled` | Leave out an entry whose section is not in the document | manual |
| Entries were buttons: a click only reported the id, and the page scrolled if the handler did it; clicking the current entry reported nothing | Entries are links to `#value`: the browser scrolls to the section and updates the hash; `onSelect({ value, event })` fires on every follow, the current entry included, and `event.preventDefault()` there keeps the page still (for a scroll of your own) | — |
| Without `activeId` or `defaultActiveId` the first entry was current | No entry is current until one is followed or `value`/`defaultValue` names it; a `defaultValue` waits for items that arrive later | — |
| `level` only indented a flat list of Face UI buttons, `button.uf-toc-item[data-scope="button"]`, with a `.uf-toc-indicator` element | A deeper entry nests in a `<ul>` under the previous shallower one: `nav > ul[data-part="list"] > li.uf-toc-item > a.uf-toc-link[data-part="link"]`; the marker is the top list's `::after` | — |
| The contract promised ArrowUp/ArrowDown between entries, but only Tab worked; long labels were cut with an ellipsis | Tab and Enter work as for any links and arrow keys scroll the page; long labels wrap | — |
| The nav was always named "Table of contents" and took no native attributes | Native attributes and `ref` reach the `<nav>`; `aria-label` or `aria-labelledby` replaces the default name | — |

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

### Tree

| Before | After | Codemod |
| --- | --- | --- |
| `selectedId` | `value` | auto |
| `defaultSelectedId` | `defaultValue` | auto |
| `onSelectedChange` | `onValueChange` | auto |
| `onValueChange`: `details.selectedId` | `details.value` | manual |
| `expandedIds` | `expanded` | auto |
| `defaultExpandedIds` | `defaultExpanded` | auto |
| `onExpandedChange`: `details.expandedIds` | `details.expanded` | manual |
| `renderNode`: `details` held `node`, `depth`, `hasChildren`, `expanded`, `selected`, `focused` and `activePath`, and the result replaced the whole row | `details` holds `item`, `expanded` and `selected`; the result replaces the icon, label and meta after the arrow | manual |
| `items[].id` | `items[].value` | manual |
| `items[].children` | `items[].items` | manual |
| `items[].rightText` | `items[].meta` | manual |
| `items[].kind` | Remove it; every row has one look, chosen for the whole tree by `variant`. `kind: "custom"` content goes in `label` | manual |
| `items[].content` | `items[].label`, which takes rich content | manual |
| `items[].render` | `renderNode` on the Tree | manual |
| `items[].actions` | A tree item cannot hold controls; offer row actions from a `Menu openOn="context"` around the Tree and read the row from `data-value` | manual |
| `TreeNode` | `TreeItem` | auto |
| Rows were Face UI Buttons or Tiles marked `data-tree-node-id`, and collapsed children stayed in the document, hidden | Rows are `[data-scope="tree"][data-part="item"]` buttons marked `data-value`; nested rows sit in `[data-part="group"]`, which exists only while its item is expanded | — |
| A click on a branch selected and toggled it, while Enter and Space only selected it; nothing expanded a branch without selecting it | A click, Enter and Space all select the item and toggle a branch; a click on the arrow, Right and Left toggle without selecting | — |
| Right on a leaf added it to `expandedIds`; Right and Left never moved to a child or parent; typeahead and `*` did nothing; a disabled item trapped the arrows | The APG tree keyboard: Right expands then enters, Left collapses then leaves (swapped in RTL), typeahead, `*` expands the siblings; disabled items are skipped | — |
| A disabled item was focusable, silently ignored clicks and looked enabled | A disabled item and everything nested in it are disabled buttons: dimmed, skipped by the keyboard, never selected or expanded | — |
| The root was always named "Tree navigation" and took no native attributes, only `className` | The root is named "Tree" until `aria-label` or `aria-labelledby` names it, and takes native attributes and `ref` | — |
| The selected item and all its ancestors had the hover background; a controlled selection could not be cleared | Only the selected item is marked (active background, bold); `value={null}` selects nothing | — |
| A branch showed a down or up chevron at the end of its row | A branch shows an arrow at the start that points to the inline end and turns down when expanded | — |
| With the selected item inside a collapsed branch, Tab could not enter the tree | Tab enters at the selected item, or at the collapsed item that holds it | — |
