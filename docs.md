# Face UI React — Agent Docs

This file is the root operating manual for agents and developers working with `/Users/grenev/Documents/uf/userface/face-ui-react`.

It is not marketing copy. It is the canonical usage guide for:
- choosing the right component,
- understanding when a component should or should not be used,
- understanding each public prop,
- composing screens that are visually consistent with the library,
- avoiding deprecated aliases and preview-only traps.

## 1. Source Of Truth

- Primary public API: `/Users/grenev/Documents/uf/userface/face-ui-react/index.ts`
- Compatibility aliases only: `/Users/grenev/Documents/uf/userface/face-ui-react/compat.ts`
- Governance metadata: `/Users/grenev/Documents/uf/userface/face-ui-react/component-registry.json`
- Per-component contracts: `/Users/grenev/Documents/uf/userface/face-ui-react/<Component>/<Component>.json`

For new work:
- import only from the primary barrel or canonical component paths,
- do not introduce new usage of deprecated aliases,
- do not invent new component names if an existing canonical component already covers the case.

## 2. Non-Negotiable System Rules

### 2.1 Typography

- All visible product text should go through `Text` unless a component owns its own text rendering internally.
- Do not drop raw text nodes into layouts if a `Text` component is appropriate.
- Do not center text unless the component explicitly requires centered alignment.

### 2.2 Membranes

- Membranes are the 1px outer spacing contract used by the library.
- Control spacing should come from membranes and control insets, not random external gaps.
- If two interactive controls sit next to each other, prefer membrane-driven rhythm over ad hoc margins.
- If you intentionally use a single shared membrane wrapper, inner controls may have `membrane={false}`. That is allowed when done deliberately to avoid double membranes.

### 2.3 Icon Spacing

- Icon placement is owned by the control, not by `Icon`.
- Do not use negative margins on `Icon`.
- If an icon sits at the control edge, it should use the icon-side inset contract so that side/top/bottom spacing feel equal.

### 2.4 Responsive Overlays

These components have first-class responsive surface behavior:
- `Select`
- `DatePicker`
- `Menu`
- `Command`
- `Modal`
- `Drawer`
- `Panel`
- `Navigation`

Default rule:
- desktop/wide viewport: keep contextual surface behavior,
- compact viewport: move to sheet/dialog/drawer behavior when that is the canonical mobile pattern.

Use the default unless you have a strong reason to force a specific surface.

### 2.5 Canonical Naming

Use these names in new code:
- `Panel`, not `Sidebar`
- `SegmentedControl`, not `Toggle`
- `Drawer`, not `Sheet`
- `DatePicker`, not `Date`
- `Tooltip` or `Popover`, not `Overlay`

Deprecated aliases may exist for compatibility, but agents should not generate them in new code.

### 2.6 Overlay Visual Rules

- Overlay surfaces should use blur/backdrop behavior, not heavy shadows.
- Do not add arbitrary tinted overlays or extra borders unless the component contract already does it.
- Mobile sheet insets should remain consistent with the library defaults.

## 3. Component Selection Rules

Use this decision matrix before composing UI.

### Textual / Structural

- `Text`: any standalone text content, labels, headings, inline code labels.
- `Bar`: toolbars, headers, action rows, modal headers/footers.
- `Separator`: subtle separation inside sections or panels.
- `Card`: grouped content block.

### Actions / Controls

- `Button`: explicit action.
- `Checkbox`: boolean or multi-select checklist item.
- `Switcher`: binary on/off switch.
- `Radio`: exactly one option from a small explicit set.
- `SegmentedControl`: mutually exclusive compact mode switch.
- `Select`: choose from options when you do not need free typing.
- `Input`: typed input.
- `Slider`: continuous/ranged value.
- `Rating`: rating input/display.

### Navigation

- `Tabs`: switch between sibling views.
- `Accordion`: reveal/hide stacked sections.
- `Breadcrumb`: current location in hierarchy.
- `Pagination`: move across pages of data.
- `Steps`: discrete workflow progress.
- `Navigation`: app/site navigation.
- `Panel`: persistent or responsive navigation panel.
- `Tree`: hierarchical navigation/content structure.
- `Toc`: section navigation within one document/screen.

### Overlay / Surface

- `Tooltip`: short non-interactive helper.
- `Popover`: small interactive contextual surface.
- `Menu`: action list.
- `Modal`: centered dialog / sheet-like overlay depending on viewport and variant.
- `Drawer`: directional overlay from left/right/top/bottom.
- `Command`: searchable command/action palette.

### Data / Content

- `Badge`: compact status/tone marker.
- `Avatar`: identity/media fallback.
- `Code`: code block or snippet presentation.
- `Markdown`: sanitized rich text rendering.
- `Media`: image/video/audio renderer.
- `Table`: structured tabular data.
- `Progress`: continuous progress display.
- `Skeleton`: loading placeholder.
- `Carousel`: slide-based content.
- `Upload`: file input/dropzone.
- `Scroll`: scrollable viewport wrapper.
- `Calendar`: standalone date grid.
- `DatePicker`: input + calendar selection pattern.

## 4. Agent Rules For Building Good Interfaces

Agents should follow these rules when materializing UI from this library.

### 4.1 Choose canonical components

Never generate new code with:
- `Overlay`
- `Toggle`
- `Sidebar`
- `Sheet`
- `Date`

Use:
- `Tooltip` / `Popover`
- `SegmentedControl`
- `Panel`
- `Drawer`
- `DatePicker`

### 4.2 Prefer composition over invention

If a surface needs:
- title + actions -> `Bar`
- content group -> `Card`
- content sections -> `Text` + `Separator`
- document navigation -> `Toc`

Do not invent raw wrappers that bypass these primitives.

### 4.3 Keep responsive behavior explicit

If a component exposes `surface` and `surfaceBreakpoint`:
- default to `surface="auto"`
- only force `popover`, `sheet`, `dialog`, or directional drawer when product intent clearly requires it

### 4.4 Do not overuse tables on mobile

For complex data on narrow screens:
- prefer card/list patterns,
- or reduce visible columns and use a picker/panel.

Do not force desktop-style dense tables on narrow viewports unless that is explicitly required.

### 4.5 Respect control density

- Use the built-in control spacing.
- Do not inject extra margin between label/control or trigger/dropdown unless the component contract explicitly calls for it.
- If an overlay sits next to a trigger, the visible gap should usually come from membranes, not random pixel offsets.

### 4.6 Prefer stable building blocks

When two components could work, choose:
- `stable` over `beta`
- `canonical` over `deprecated`
- richer semantic components over generic ones

Examples:
- `DatePicker` over `Calendar` if the UI needs trigger + overlay
- `SegmentedControl` over `Tabs` for compact binary/mode switching
- `Panel` over a custom left navigation stack

## 5. Public Component Reference

Below is the primary public surface. Props listed here are the props agents should reason about.

---

## 5.1 Primitives

### Button

Purpose:
- Explicit user action.

Use when:
- the user is invoking an action,
- a row-like option still behaves like an action/button.

Avoid when:
- the thing is pure text,
- the interaction is binary state only and should be `Switcher`,
- the interaction is selection among peers and should be `SegmentedControl`, `Radio`, `Tabs`, or `Menu`.

Props:
- `text`: primary label text.
- `rightText`: secondary right-aligned text inside the text area.
- `variant`: visual style. Use `default`, `primary`, `secondary`, `accent`, `outline`, `ghost`, `destructive`, `suggestion`.
- `icon`: icon name/node/source.
- `iconPosition`: left or right icon placement.
- `iconOnly`: square icon-only button.
- `disabled`: disables interaction.
- `loading`: loading state.
- `stretchText`: makes text area flex.
- `fullWidth`: stretches button horizontally.
- `align`: text alignment.
- `level`: nesting/indent level for option-like rows.
- `membrane`: outer membrane spacing.
- `copyText`: copies text on click.
- `onCopied`: callback after successful copy.
- `children`: custom children instead of default text/icon rendering.

Agent notes:
- Use `Button` for close/copy/more triggers instead of raw `<button>`.
- Prefer `iconOnly` for compact utility actions.

### Text

Purpose:
- Unified typography primitive.

Use when:
- rendering any text that is not fully owned by another component.

Props:
- `text`: string content.
- `variant`: semantic text style.
- `size`: visual size.
- `as`: underlying HTML tag.
- `icon`: optional icon.
- `iconPosition`: icon placement.
- `inset`: text inset mode.
- `stretchText`: flex-stretch text area.
- `fullWidth`: stretch full width.
- `align`: text alignment.
- `membrane`: outer membrane.
- `children`: custom content.
- `htmlFor`: label association.

Agent notes:
- This is the default text primitive for labels, headings, row labels, helper text, and metadata.

### Icon

Purpose:
- Universal icon renderer from the shared icon registry.

Props:
- `name`: icon name from registry.
- `icon`: universal icon input: name/component/node/url/registry item.
- `src`: explicit external source URL.
- `size`: icon box size.
- `square`: keep square icon box.
- `className`: class name.
- `style`: inline style.
- `label`: accessible label. Omit for decorative icons.
- `title`: optional SVG title.

Agent notes:
- `Icon` is not a spacing component.
- Do not solve layout with icon margins.

### Separator

Purpose:
- Thin divider line between sections.

Props:
- `orientation`: horizontal or vertical.
- `decorative`: marks it decorative for accessibility.
- `membrane`: outer membrane spacing.

Agent notes:
- Use sparingly.
- Prefer rhythm/spacing first; use separators only when real visual separation is needed.

---

## 5.2 Display / Content

### Badge

Purpose:
- Small status/tone label.

Use when:
- marking state, status, category, or count-like metadata.

Props:
- `text`: badge label.
- `variant`: tone/style family.
- `appearance`: `fill` or `outline`.
- `children`: custom content.

### Card

Purpose:
- Generic grouped content block.

Props:
- `title`: card title.
- `description`: supporting description.
- `content`: main content string.
- `footer`: footer string.
- `membrane`: outer membrane.
- `children`: custom content.

Agent notes:
- Prefer `children` for real layouts.
- The string props are best for simple showcase/demo or simple structured cards.

### Skeleton

Purpose:
- Loading placeholder.

Props:
- `width`: width.
- `height`: height.
- `variant`: visual form of skeleton.

### Avatar

Purpose:
- Identity/media fallback.

Props:
- `src`: avatar image URL.
- `name`: source for fallback initials.
- `fallback`: explicit fallback text.
- `fallbackDelayMs`: fallback delay.
- `className`: class name.

### Media

Purpose:
- Unified image/video/audio renderer.

Use when:
- you want one media surface contract instead of ad hoc `<img>`/`<video>` usage.

Props:
- `type`: media type.
- `src`: media source URL.
- `alt`: alt text.
- `variant`: surface styling variant.
- `lazy`: lazy-load intent.
- `loading`: loading behavior.
- `decoding`: decoding hint.
- `poster`: video poster.
- `controls`: native controls.
- `autoPlay`: autoplay.
- `loop`: loop.
- `muted`: muted playback.
- `width`: width.
- `height`: height.
- `objectFit`: fit mode.
- `fallback`: fallback content.
- `onError`: error callback.
- `onLoad`: load callback.
- `className`: class name.
- `role`: ARIA role override.
- `title`: title.
- `tabIndex`: tab index.
- `style`: inline style.

Status:
- `beta`

### Markdown

Purpose:
- Safe markdown rendering.

Props:
- `content`: markdown source.
- `gfm`: GitHub-flavored markdown mode.
- `safeMode`: sanitization-first mode.
- `allowRawHtml`: allow raw HTML.
- `linkTarget`: link target behavior.
- `linkRel`: link rel.
- `membrane`: outer membrane.
- `fullWidth`: full width layout.

Agent notes:
- Default to safe/sanitized markdown.
- Do not use raw HTML unless the content source is trusted and the product explicitly needs it.

### Code

Purpose:
- Code snippet / block display.

Props:
- `code`: code text.
- `language`: language label.
- `title`: block title.
- `showLineNumbers`: line number toggle.
- `highlight`: highlighted lines.
- `defaultCollapsed`: initial collapse state.
- `collapsedHeight`: collapsed preview height.
- `className`: class name.
- `role`: role override.
- `titleAttr`: native title.
- `style`: inline style.

### Scroll

Purpose:
- Scroll viewport wrapper.

Props:
- `children`: content to scroll.
- `type`: scroll behavior type.
- `orientation`: scroll axis.
- `className`: class name.
- `height`: explicit height.

---

## 5.3 Form Controls

### Input

Purpose:
- Text-like field input.

Use when:
- free-form typing is required.

Props:
- `value`: controlled value.
- `defaultValue`: uncontrolled initial value.
- `type`: field mode.
- `textLayout`: single-line or wrap behavior.
- `disabled`: disabled state.
- `readOnly`: read-only state.
- `label`: field label.
- `description`: supporting copy.
- `error`: error text.
- `labelOrientation`: label layout direction.
- `placeholder`: placeholder text.
- `spellCheck`: spellcheck.
- `icon`: edge icon.
- `iconPosition`: left/right icon placement.
- `stretchText`: stretch text area.
- `required`: required state.
- `autoFocus`: autofocus.
- `min`: numeric/date min.
- `max`: numeric/date max.
- `step`: numeric/date step.
- `onValueChange`: canonical value callback.
- `onChange`: raw input change callback.
- `onBlur`: blur callback.
- `onFocus`: focus callback.
- `membrane`: outer membrane.
- `className`: class name.

### Checkbox

Purpose:
- Boolean or indeterminate selection.

Props:
- `checked`: controlled checked state.
- `defaultChecked`: uncontrolled initial state.
- `disabled`: disabled state.
- `required`: required state.
- `name`: form name.
- `label`: visible label.
- `onCheckedChange`: canonical state callback.
- `className`: class name.
- `membrane`: outer membrane.

### Radio

Purpose:
- Single selection from a small explicit set.

Props:
- `options`: radio options.
- `value`: controlled selected value.
- `defaultValue`: uncontrolled initial value.
- `name`: form name.
- `disabled`: disabled state.
- `required`: required state.
- `orientation`: horizontal or vertical layout.
- `onValueChange`: canonical change callback.
- `className`: class name.
- `membrane`: outer membrane.

### Switcher

Purpose:
- Binary on/off switch.

Props:
- `checked`: controlled boolean state.
- `defaultChecked`: uncontrolled initial state.
- `disabled`: disabled state.
- `required`: required state.
- `name`: form name.
- `value`: form value.
- `label`: visible label.
- `text`: inline text.
- `withText`: show text next to switch.
- `textWrap`: wrapping mode for text.
- `onCheckedChange`: change callback.
- `className`: class name.
- `membrane`: outer membrane.

### SegmentedControl

Purpose:
- Compact segment-based mode selector.

Use when:
- several small mutually exclusive views/modes live in one strip.

Props:
- `items`: segment items.
- `value`: controlled selected values.
- `defaultValue`: uncontrolled initial values.
- `selectionMode`: `single` or `multiple`.
- `disabled`: disabled state.
- `orientation`: layout orientation.
- `onValueChange`: change callback.
- `className`: class name.
- `membrane`: outer membrane.

Agent notes:
- This is the canonical replacement for `Toggle`.

### Slider

Purpose:
- Continuous or ranged numeric selection.

Use when:
- dragging is more natural than discrete option picking.

Props:
- `variant`: simple or advanced mode.
- `value`: controlled thumb values.
- `defaultValue`: uncontrolled initial thumb values.
- `scalarValue`: legacy single numeric input for advanced mode.
- `min`: minimum.
- `max`: maximum.
- `step`: step size.
- `disabled`: disabled state.
- `orientation`: horizontal or vertical.
- `label`: label text.
- `onValueChange`: canonical value callback.
- `onChange`: legacy scalar callback.
- `leading`: advanced leading content mode.
- `leadingIcon`: optional leading icon.
- `leadingText`: optional leading text.
- `crop`: enable crop handles.
- `defaultCropRange`: uncontrolled crop range.
- `cropRange`: controlled crop range.
- `cropLocksValue`: lock main value to crop logic.
- `onCropChange`: crop range callback.
- `className`: class name.

Status:
- `beta`

Agent notes:
- Use `variant="advanced"` only when the product truly needs crop-like behavior or richer value decoration.

### Rating

Purpose:
- Rating input or display.

Props:
- `value`: controlled rating.
- `defaultValue`: uncontrolled initial rating.
- `max`: maximum stars/items.
- `disabled`: disabled state.
- `allowHalf`: half-step support.
- `label`: label text.
- `onValueChange`: change callback.
- `className`: class name.

Status:
- `beta`

### Select

Purpose:
- Option picker without free typing.

Use when:
- the user selects from a known set,
- you do not need arbitrary text entry.

Props:
- `options`: option list.
- `value`: controlled value array.
- `defaultValue`: uncontrolled initial value array.
- `placeholder`: placeholder.
- `disabled`: disabled state.
- `type`: selection mode.
- `label`: label text.
- `labelOrientation`: label layout.
- `ariaLabel`: ARIA label.
- `displayValue`: custom display text.
- `stretchText`: stretch text area.
- `onValueChange`: value callback.
- `onOpenChange`: open-state callback.
- `surface`: `auto`, `popover`, or `sheet`.
- `surfaceBreakpoint`: responsive breakpoint.
- `surfaceTitle`: mobile sheet title.
- `membrane`: outer membrane.
- `className`: class name.

Agent notes:
- Default to `surface="auto"`.
- On mobile, this is expected to behave like a sheet.

### Calendar

Purpose:
- Standalone date grid.

Use when:
- the date grid is always visible in the layout,
- no trigger/input wrapper is needed.

Props:
- `value`: controlled selected value.
- `defaultValue`: uncontrolled initial value.
- `min`: minimum date.
- `max`: maximum date.
- `disabledDates`: explicitly disabled dates.
- `locale`: locale string.
- `weekStartsOn`: starting weekday.
- `onValueChange`: date callback.
- `className`: class name.

### DatePicker

Purpose:
- Canonical date selection component.

Use when:
- the UI needs a trigger/control plus calendar/time selection.

Props:
- `mode`: date or date-time mode.
- `selection`: single/range-like selection mode.
- `views`: enabled views.
- `openTo`: initial view.
- `value`: controlled value.
- `defaultValue`: uncontrolled initial value.
- `onValueChange`: value callback.
- `onOpenChange`: open-state callback.
- `valueFormat`: returned value format.
- `locale`: locale string.
- `timezone`: timezone.
- `weekStartsOn`: first weekday.
- `format`: display format.
- `min`: minimum value.
- `max`: maximum value.
- `disabledDates`: disabled dates.
- `disabledTime`: disabled time config.
- `closeOnSelect`: close after selection.
- `showNow`: show “now” action.
- `showClear`: show clear action.
- `showPresets`: show preset actions.
- `presets`: custom presets.
- `surface`: `auto`, `popover`, or `sheet`.
- `surfaceBreakpoint`: responsive breakpoint.
- `surfaceTitle`: mobile sheet title.
- `label`: field label.
- `description`: helper text.
- `error`: error text.
- `required`: required state.
- `disabled`: disabled state.
- `readOnly`: read-only state.
- `placeholder`: placeholder.
- `membrane`: outer membrane.
- `fullWidth`: full width mode.
- `className`: class name.

Agent notes:
- This is the canonical public date control. Do not use `Date` in new code.

---

## 5.4 Overlay Surfaces

### Modal

Purpose:
- Canonical dialog-like overlay.

Use when:
- the user must focus on one task, confirm, review, or edit something in isolation.

Props:
- `open`: controlled open state.
- `variant`: visual/behavior variant.
- `closeOnOverlayClick`: close when background is clicked.
- `closable`: show and allow dismiss.
- `title`: title text.
- `description`: supporting text.
- `children`: body content.
- `actions`: action button definitions.
- `trigger`: trigger content/label.
- `width`: preferred width.
- `height`: preferred height.
- `onOpenChange`: open-state callback.
- `surface`: responsive surface mode.
- `surfaceBreakpoint`: responsive breakpoint.
- `className`: class name.

Agent notes:
- Use `Modal` for centered dialog semantics.
- Use `Drawer` when directionality matters.

### Drawer

Purpose:
- Directional edge surface.

Use when:
- content should slide from an edge,
- the direction itself communicates meaning.

Props:
- `side`: `left`, `right`, `top`, or `bottom`.
- All `Modal` props except `surface` and `variant`, which the wrapper owns.

Agent notes:
- This is the canonical replacement for `Sheet`.

### Tooltip

Purpose:
- Short, non-interactive contextual explanation.

Props:
- `content`: floating content.
- `children`: trigger.
- `open`: controlled open state.
- `openDelay`: delay before open.
- `closeDelay`: delay before close.
- `side`: preferred side.
- `align`: alignment.
- `sideOffset`: side offset.
- `onOpenChange`: open-state callback.
- `className`: content class name.

Agent notes:
- Keep content short.
- If content becomes interactive or richer, it is probably a `Popover`.

### Popover

Purpose:
- Small contextual interactive surface.

Props:
- `interactive`: whether content is interactive.
- `content`: popover content.
- `children`: trigger.
- `open`: controlled open state.
- `openDelay`: delay before open.
- `closeDelay`: delay before close.
- `side`: preferred side.
- `align`: alignment.
- `sideOffset`: side offset.
- `onOpenChange`: open-state callback.
- `className`: content class name.

### Menu

Purpose:
- Action list surface.

Use when:
- the user is choosing an action, not entering free text.

Props:
- `trigger`: click/context trigger mode.
- `items`: action items.
- `children`: trigger content.
- `onSelect`: item selection callback.
- `disabled`: disabled state.
- `onOpenChange`: open-state callback.
- `surface`: `auto`, `popover`, or `sheet`.
- `surfaceBreakpoint`: responsive breakpoint.
- `surfaceTitle`: mobile sheet title.
- `className`: class name.

### Toaster / Toast

Purpose:
- Notification system.

Public surface:
- `Toaster`
- `useToast()`
- `createToastContext()`

Use when:
- showing transient notifications.

Toaster props:
- `className`: extra class for toast group container.
- `showTrigger`: whether a demo/show trigger is shown in showcase contexts.
- `placement`: toast placement.
- `maxVisible`: maximum visible toasts.
- `duration`: default duration.
- `label`: trigger label.

Agent notes:
- Prefer a single app-level `Toaster`.
- Use `useToast()` to push notifications from interactions.

### Command

Purpose:
- Searchable command/action palette.

Use when:
- the user needs fuzzy-ish lookup or command selection,
- option count is too large for a plain `Menu`.

Props:
- `items`: flat command items.
- `groups`: grouped command sections.
- `placeholder`: search placeholder.
- `value`: controlled query.
- `defaultValue`: uncontrolled query.
- `onValueChange`: query callback.
- `onSelect`: item select callback.
- `surface`: `auto`, `inline`, or `dialog`.
- `surfaceBreakpoint`: responsive breakpoint.
- `surfaceTitle`: mobile/dialog title.
- `open`: controlled open state.
- `defaultOpen`: uncontrolled open state.
- `onOpenChange`: open-state callback.
- `emptyContent`: empty state content.
- `className`: class name.

Agent notes:
- On compact viewports, command should act like a dialog, not a tiny dropdown.

---

## 5.5 Navigation

### Tabs

Purpose:
- Switch between sibling views or panels.

Props:
- `items`: tab items.
- `value`: controlled active tab.
- `defaultValue`: uncontrolled initial tab.
- `orientation`: horizontal or vertical.
- `activationMode`: manual or automatic.
- `disabled`: disabled state.
- `onValueChange`: active tab callback.
- `withLine`: show active line.
- `wrap`: allow wrap.
- `membrane`: outer membrane.
- `className`: class name.

Agent notes:
- Prefer horizontal overflow scrolling rather than forcing many tabs into too little width.

### Accordion

Purpose:
- Expand/collapse stacked sections.

Props:
- `items`: accordion items.
- `expandedIds`: controlled expanded ids.
- `defaultExpandedIds`: uncontrolled expanded ids.
- `multiple`: allow multiple open items.
- `collapsible`: allow closing the last open item.
- `disabled`: disabled state.
- `onExpandedChange`: expanded ids callback.
- `className`: class name.

### Breadcrumb

Purpose:
- Hierarchy trail for current location.

Props:
- `items`: breadcrumb items.
- `separator`: separator display.
- `membrane`: outer membrane.
- `allowNavigation`: whether items are interactive.
- `className`: class name.
- `collapseAfter`: collapse threshold.

Agent notes:
- Overflow/collapse is expected on deep paths.

### Pagination

Purpose:
- Pagination for paged data.

Props:
- `page`: controlled page.
- `defaultPage`: uncontrolled initial page.
- `total`: total item count.
- `pageSize`: items per page.
- `siblingCount`: visible sibling count.
- `disabled`: disabled state.
- `onPageChange`: page callback.
- `className`: class name.
- `membrane`: outer membrane.
- `surfaceTitle`: title for overflow page picker.

### Steps

Purpose:
- Workflow progress / step navigator.

Props:
- `items`: step items.
- `step`: controlled current step.
- `defaultStep`: uncontrolled initial step.
- `linear`: enforce linear flow.
- `disabled`: disabled state.
- `onStepChange`: step callback.
- `className`: class name.

### Navigation

Purpose:
- App/site navigation bar.

Props:
- `items`: navigation items.
- `activeId`: controlled active item.
- `defaultActiveId`: uncontrolled initial item.
- `onActiveChange`: active item callback.
- `orientation`: horizontal or vertical.
- `className`: class name.
- `surface`: responsive surface mode.
- `surfaceBreakpoint`: responsive breakpoint.
- `open`: controlled compact-panel state.
- `defaultOpen`: uncontrolled compact-panel state.
- `onOpenChange`: open-state callback.
- `trigger`: trigger content/mode.
- `surfaceTitle`: compact-panel title.

### Panel

Purpose:
- Collapsible panel navigation with nested groups.

Use when:
- the app needs a persistent or responsive side/drawer navigation surface.

Props:
- `items`: panel items.
- `collapsed`: controlled collapsed state.
- `defaultCollapsed`: uncontrolled initial collapsed state.
- `onCollapsedChange`: collapsed callback.
- `selectedId`: controlled selected item.
- `defaultSelectedId`: uncontrolled selected item.
- `onSelectedChange`: selected item callback.
- `width`: expanded width.
- `collapsedWidth`: collapsed width.
- `className`: class name.
- `previewPreset`: preview/demo preset.
- `surface`: responsive surface mode.
- `surfaceBreakpoint`: responsive breakpoint.
- `open`: controlled drawer state on compact viewports.
- `defaultOpen`: uncontrolled drawer state.
- `onOpenChange`: open-state callback.
- `trigger`: trigger content.
- `surfaceTitle`: compact drawer title.

Agent notes:
- This is the canonical replacement for `Sidebar`.

### Tree

Purpose:
- Hierarchical tree with expand/collapse and selection.

Props:
- `items`: tree nodes.
- `expandedIds`: controlled expanded ids.
- `defaultExpandedIds`: uncontrolled expanded ids.
- `selectedId`: controlled selected id.
- `defaultSelectedId`: uncontrolled selected id.
- `onExpandedChange`: expanded callback.
- `onSelectedChange`: selected callback.
- `className`: class name.

### Toc

Purpose:
- In-page or in-panel table of contents.

Props:
- `items`: toc items.
- `activeId`: controlled active section.
- `defaultActiveId`: uncontrolled active section.
- `withLine`: show active indicator line.
- `lineSide`: left or right side line.
- `onActiveChange`: section callback.
- `className`: class name.

Agent notes:
- Use `Toc` for document/section navigation, not app-wide navigation.

---

## 5.6 Patterns And Data Surfaces

### Progress

Purpose:
- Continuous progress display.

Props:
- `value`: current value.
- `max`: max value.
- `variant`: visual variant.
- `showLabel`: whether to show label text.
- `label`: label text.
- `className`: class name.

### Carousel

Purpose:
- Slide-based content container.

Props:
- `children`: slides.
- `loop`: loop slides.
- `autoPlay`: enable autoplay.
- `autoPlayInterval`: autoplay interval.
- `orientation`: horizontal or vertical.
- `slidesPerView`: slides visible at once.
- `index`: controlled active slide.
- `defaultIndex`: uncontrolled initial slide.
- `onIndexChange`: active slide callback.
- `className`: class name.

### Table

Purpose:
- Structured tabular data.

Use when:
- columns matter,
- sorting or selection matters,
- row comparison is important.

Props:
- `columns`: table columns.
- `rows`: table rows.
- `rowKey`: key field name.
- `sortColumn`: controlled sort column.
- `sortDirection`: sort direction.
- `onSortChange`: sort callback.
- `direction`: custom sort direction resolver.
- `selectedRows`: controlled selected row ids.
- `onSelectedRowsChange`: selected rows callback.
- `selectable`: enable row selection.
- `showRowNumbers`: show row numbers.
- `stickyHeader`: sticky header.
- `showDividers`: row dividers.
- `className`: class name.
- `getRowId`: custom row id getter.
- `onColumnResize`: resize callback.
- `resizable`: enable column resize.
- `stickyLastColumn`: sticky last column.

Agent notes:
- Do not use `Table` as a generic list replacement.
- On compact screens, reconsider the information architecture rather than blindly forcing a dense table.

### Upload

Purpose:
- File selection and dropzone.

Props:
- `accept`: accept filter.
- `multiple`: multi-file mode.
- `maxSize`: max file size.
- `maxFiles`: max file count.
- `disabled`: disabled state.
- `files`: controlled files.
- `onFilesChange`: accepted files callback.
- `onReject`: rejection callback.
- `size`: required in certain flow presets.
- `type`: upload type.
- `reason`: rejection reason / supporting data in some flows.
- `className`: class name.

## 6. Deprecated Compatibility Surface

These names may still exist for migration, but agents should not generate them in new work.

- `Overlay` -> use `Tooltip` or `Popover`
- `Toggle` -> use `SegmentedControl`
- `Sidebar` -> use `Panel`
- `Sheet` -> use `Drawer`
- `Date` -> use `DatePicker`

## 7. Design-System Consistency Checklist

Before shipping an interface, agents should check:

- Are all texts rendered through `Text` where appropriate?
- Are canonical components used instead of deprecated aliases?
- Does spacing come from membranes and control insets rather than random margins?
- Are icon-edge paddings using control-side logic rather than icon margins?
- Are overlay components using responsive `surface="auto"` unless there is a good reason not to?
- Does mobile behavior still make sense for `Select`, `DatePicker`, `Menu`, `Command`, `Modal`, `Drawer`, `Panel`, and `Navigation`?
- Are action rows built with `Bar` rather than ad hoc flex wrappers?
- Is document navigation using `Toc` instead of misusing `Tree` or `Navigation`?
- Is the chosen component semantically correct, not just visually similar?

## 8. Recommended Build Recipes

### Settings screen
- `Panel` for app structure
- `Bar` for page header/actions
- `Text` for section labels and help
- `Input`, `Select`, `Switcher`, `Checkbox`, `DatePicker`
- `Button` for save/reset actions

### Command/search workflow
- `Command` for search and action discovery
- `Menu` only for short action lists
- `Popover` only for lightweight rich contextual content

### Documentation page
- `Toc` for section navigation
- `Text` for content hierarchy
- `Code` for snippets
- `Table` for structured reference data
- `Accordion` for FAQ / collapsed explanations

### Data-heavy page
- `Bar` for filters/actions
- `Table` for desktop comparison
- `Pagination` for page stepping
- `Drawer` or `Modal` for row detail/edit flows

## 9. Final Guidance For Agents

If uncertain:
- choose the more semantic component,
- choose the canonical component,
- choose the stable component,
- choose the responsive default surface,
- and keep the composition simple.

The library is strongest when:
- component taxonomy is clean,
- overlays are predictable,
- text is consistent,
- spacing is membrane-driven,
- and preview output matches real usage.
