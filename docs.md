# Face UI — composition and behavior contract

Face UI combines React components, headless interaction machines and a token-based visual system. This guide describes the shared rules. Exact prop types and defaults live in the component TypeScript interfaces; generated `<Component>/<Component>.json` files expose the same API to tooling. Do not maintain another handwritten prop catalogue.

## Entry points and ownership

```tsx
import { Button, Text, Input, Select, Modal } from '@userface/face-ui-react'
import '@userface/face-ui-react/assets/styles/index.css'
```

The stylesheet includes tokens, component styles and motion. A provider is not required. Set `data-theme="light"` or `data-theme="dark"` on the document element and give the application surface `--uf-color-background` and `--uf-color-foreground`. Load the product's font at the application boundary; the default family is Akt with a sans-serif fallback. The package includes Begriffsschrift for code.

Set shared theme overrides on `html` or `body`: floating content is portaled to the document body and cannot inherit a theme scoped only to its trigger's subtree. Components with an explicit `portal={false}` support local rendering, but that content remains subject to ancestor clipping and stacking contexts.

Use the primary barrel or canonical component subpaths. `Overlay`, `Toggle` and `Sidebar` are compatibility names; use `Tooltip`/`Popover`, `SegmentedControl` and `Panel` in new code. The registry describes component status and recommended replacements. A status label is not evidence of accessibility conformance.

## Breadcrumb

`href` is a native link, including on the current item when supplied. Without a
link, `onClick` creates a button; without either, the item is plain text. Handlers
receive the native React event. A router adapter should call `preventDefault()`
for the ordinary click it handles, leaving modifier clicks to the browser.

`maxItems` limits visible positions including the overflow button (default 4,
integer >=3). Set it to `null` to show the entire trail. The root and current
location stay visible. Optional item `key` preserves identity in dynamic lists;
without it, the original array index is used. Empty trails render nothing.

`overflowLabel` names the button and its list dialog. Native `aria-label` or
`aria-labelledby` names the nav separately; native attributes, styles, events and
ref belong to that nav. `membrane` affects inline locations and the overflow
trigger; the popup keeps its own spacing. A null/empty separator removes its slot.

Migration: replace `collapseAfter` with `maxItems`; use `maxItems={null}` instead
of values below 3 to disable collapse. Remove `allowNavigation`. Previews that
must retain their page can cancel link events at their own boundary, as the
included gallery does. Inline and overflow links now follow the same behavior.

## Pagination

`total` counts records, not pages; `pageSize` determines the page count. Values are
safe integers: `total >= 0`, `pageSize >= 1`, pages start at 1, and `siblingCount`
ranges from 0 to 20. Invalid numeric types, fractions and unsafe values are rejected.
`defaultPage` is read only at the initial uncontrolled mount. A controlled `page`
takes precedence. Display and actions use the same projection into current bounds;
external changes are quiet and re-selecting the visible page is a no-op.

`labels` translates internal controls. `labels.page` is a string with exactly one
`{page}` placeholder, so the number can appear anywhere in a localized page name.
The nav itself accepts native `aria-label`/`aria-labelledby`, `dir`, `lang`, `hidden`,
styles and events. `surfaceTitle` optionally overrides the picker title; otherwise
it follows `labels.choosePage`. `membrane` affects outer navigation buttons, while
the dialog keeps its own spacing. Disabled pagination can still close an open picker.

```tsx
<Pagination
  total={50}
  pageSize={10}
  aria-label="Страницы журнала"
  labels={{ previousPage: 'Назад', nextPage: 'Далее', page: 'Страница {page}',
    choosePage: 'Выбрать страницу', pageNumber: 'Номер страницы',
    goToPage: 'Перейти', close: 'Закрыть' }}
/>
```

The picker uses shared Modal and Input. `Modal.closeLabel` names its internal close
button; empty text uses its default. This is separate from the dialog's title/name.
Pagination uses ordinary Button variants and retains all navigation controls when
its container narrows, moving page numbers onto their own row.

## Accordion sections

`items` defines stable string identities, noninteractive labels and panel contents.
`expandedIds` controls expansion; `defaultExpandedIds` is read once. Both accept
readonly arrays. `multiple={false}` displays the first available expanded value;
`collapsible={false}` prevents users from closing the last open panel, without
inventing an initial selection. Missing values preserve intent for asynchronously
loaded items but do not count as open panels. A user change proposes existing,
unique values through `onExpandedChange`; prop updates do not emit this callback.

Choose `headingLevel` for the containing document (default 3). Panels are ordinary
content by default; set an item's `region: true` selectively when its contents
benefit from a named landmark. This replaces the former automatic region on every
panel. Root `id`, `style`, `dir`, `hidden`, ARIA and events address the same element
as `ref`. Capture handlers may cancel activation or keyboard navigation.

Root/item `disabled` affects disclosure triggers; embedded form fields keep their
own state and interactivity. Closing panels preserves their mounted contents.
React keys preserve identity when contents move and may explicitly reset it.
`icon` supplies a shared start icon; `item.icon` overrides it, and null/false/empty
content removes the icon slot. Labels wrap at narrow widths.

## Geometry: one membrane, one owner

The membrane is an **outer spacing boundary**, implemented by `assets/adapters/react/Membrane.tsx`. Its size is `--uf-membrane` (1px by default). It does not replace the control's internal padding, the container's content inset or the layout's gap.

- A component with `membrane` enabled owns exactly one boundary around its exposed geometry. `membrane={false}` removes its spacing box using `display: contents`; the neutral wrapper stays mounted so focus, selection and child state survive changes. It does not make the component smaller internally.
- A composed control may deliberately turn off a child's membrane when its own boundary already owns the interaction. Do not wrap a normal Button in another membrane merely because it is a trigger.
- The inner component owns semantics, id and ref. Measure that ref, not its `parentElement`; an inactive membrane has no box. CSS integrations can identify active spacing with `.uf-membrane:not([data-membrane-disabled])`.
- Content membranes are passive. Clicking their empty space cannot activate an arbitrary nested button. Interactive membranes explicitly identify their control and only forward clicks originating in their padding, preserving modifiers and focus. They add no keyboard stop.
- `ref`, `className`, `style`, native attributes and events normally belong to the actual component root/control, not an incidental spacing wrapper. Inspect the component interface when a composition has several roots.
- `fullWidth` controls available width. `Text.inset` controls internal text padding; `Card.padding` controls internal content spacing. `Table.rowStyle` controls row presentation. These are different responsibilities.

Baseline single-line controls have a 32px body, 20px text line and 6px vertical inset. With a 1px membrane on each side, their outer height is 34px. Multiline text and field labels may increase total height. Align rows by their control body or by their complete field layout deliberately; a labelled field is not a 32px button.

Use layout `gap` for separation between groups. Do not compensate for duplicate wrappers with negative margins or per-component pixel offsets. The system's interactive font weight is stable across hover, focus and selection; state styling must not change intrinsic text width.

## Typography and semantic HTML

Use `Text` for standard product typography. Its actual variants include `body`, `muted`, `heading`, `h1`–`h6`, `label`, `kbd`, `code`, `markdown` and `blockquote`. There is no `caption` or `default` variant. For small descriptive text use, for example, `variant="muted" size="sm" as="small"`.

`as` chooses HTML semantics; `variant` chooses presentation. Preserve heading order, real labels and valid nesting. Inside an inline parent, render inline text with `as="span"` and usually `membrane={false}`. For flowing prose use `inset="none"`; the default `inset="control"` aligns text with controls.

Controls own their labels. Passing `<Text>` into every control label is unnecessary. Native semantic HTML and third-party content are supported: the reset must not remove a consumer's borders, outlines, fonts or styles from arbitrary descendants.

`children` overrides `text` in Text; Button similarly accepts rich children or its declarative text/icon API. These are composition alternatives, not two independent labels. Icon-only controls require an accessible name such as `aria-label`.

## Calendar and Date localization

`locale` controls Gregorian date formatting, digits and the default first weekday.
`labels` supplies your application's translations for internal controls. Face does
not bundle an incomplete language dictionary or infer arbitrary action text from
Intl date names. The default internal labels are English.

Calendar accepts `labels.previousMonth` and `labels.nextMonth`; native `aria-label`
or `aria-labelledby` names its group. Date accepts those same navigation labels
plus `calendar`, `day`, `month`, `year`, `hours`, `minutes`, `start`, `end`,
`rangeEndpoint`, `previousYear`, `nextYear`, `previousYearPage`, `nextYearPage`,
`clear`, `now` and `close`. Year pages contain twelve years. View switches and
month/year/time choice groups share the same label. These choice groups keep
their pressed-button semantics; the calendar keeps its date-grid semantics.

Import `DateLabels` or `CalendarLabels` to check a complete dictionary, or pass a
partial object for a targeted wording override. A shared Date dictionary also
works in Calendar, which reads its own keys. Labels are trimmed; blank/undefined
entries fall back to the default, while malformed recognized values throw a
RangeError identifying their key. The library does not mutate your dictionary.
Live updates preserve focus, value, view, open state and form values.

Field content remains in `label`, `placeholder`, native accessible-name props
and `surfaceTitle`. Localize those according to the field's purpose and set native
`lang`/`dir` when needed. They address different elements and are not duplicated
inside the internal-control dictionary.

```tsx
import { Calendar, Date, type DateLabels } from '@userface/face-ui-react'

function BookingDates({ labels }: { labels: DateLabels }) {
  return <>
    <Date locale="ru-RU" lang="ru" label="Срок" placeholder="Выберите дату"
      labels={labels} />
    <Calendar locale="ru-RU" lang="ru" aria-label="Даты бронирования"
      labels={labels} />
  </>
}
```

Migration: replace Date `clearLabel`, `nowLabel` and `closeLabel` with
`labels={{ clear: clearText, now: nowText, close: closeText }}`. These flat Date
props are removed; no duplicate aliases remain. Other components' label APIs
are unchanged. Default month/year/time choice-group names now match their
switches: Month, Year, Hour and Minute.

## Calendar and Date range availability

Calendar and Date ranges exclude `disabledDates` from the entire interval by default.
If completing a range crosses an unavailable day, the activated day starts a new
incomplete range. The same applies when a live constraint invalidates the old
anchor. Date stays open until the new range is complete; incomplete ranges are
not submitted as form intervals.

For report filters that constrain only their boundaries, set
`selection="range" excludeDisabledDates={false}`. Endpoints still obey
`min`, `max` and `disabledDates`. This prop is unavailable for single selection
and week mode; weeks always contain exactly seven available days. Existing code
that intentionally allowed forbidden interior days needs this explicit false value.

Presets, native form changes and time edits reject unavailable intervals.
External/default values and form resets preserve the supplied value without a
change callback or silent repair. `disabledTime` constrains endpoint clock choices,
not every minute between them. Datetime range restart preserves the anchor's
preferred clock when the new day's time constraints permit it.

## State and events

A defined `value`, `checked`, `open`, `activeId` or equivalent controlled prop is authoritative. Defaults initialize uncontrolled state once. Use the matching change callback to accept user proposals; updating a controlled prop must not itself emit a user change callback. Where clearing is supported, `null` is a value rather than a signal to switch to uncontrolled mode.

Disabled/read-only guards block user edits. They must not block new values supplied by the parent. Callbacks use the latest committed props, including removal of a callback. Native event callbacks retain their event payload; semantic callbacks report the new value. They are not interchangeable.

Machine construction is pure. Effects and subscriptions start after React commits and clean up on unmount, including StrictMode's setup/cleanup replay. Snapshots remain stable until a change. Nested sends are serialized so an effect cannot lose its cleanup by transitioning synchronously while it is being registered.

## Forms

Input, Checkbox, Radio, Rating, Slider and Switcher use native form controls. Checkbox and Switcher expose one native checkbox as the focus target; visual indicators are decorative. Supply `name` for submission and an associated `label` or accessible name. Disabled controls are excluded from FormData.

Select and Date use a visually hidden native select proxy for submission, constraint validation and form reset. Validation focuses the visible trigger. `name`, `form` and `required` are functional; multiple Select values submit repeated entries under the same name. An incomplete Date range is empty for required validation and submits a complete range as `start/end`.

`form.reset()` restores initial uncontrolled defaults without emitting a user change callback. Controlled fields restore the current prop value. A prevented reset stays prevented. Read-only Date and nonzero Rating values are submitted but excluded from required validation. A required visual marker alone is not validation.

Not every value widget is an HTML form control. Calendar exposes value callbacks; use application form state or explicit hidden fields when its values must be submitted. SegmentedControl supports name/form submission and reset, but does not expose required validation. Upload exposes selected browser File objects and progress/status metadata; it does not upload files or implement a transport.

## Date and time

Date distinguishes a civil date/time from an instant:

- ISO output uses `YYYY-MM-DD` for dates and `YYYY-MM-DDTHH:mm` for date/time values. These are wall-clock values in `timezone` (UTC by default), with minute precision.
- A date-only string is never shifted to the previous/next day by formatting. Date objects and strings with explicit offsets are converted into the chosen zone.
- `valueFormat="date"` converts civil values to JavaScript Date instants in that zone. DST disambiguation is `compatible`: an ambiguous time uses the earlier instant; a nonexistent time advances across the gap. This behavior comes from `@internationalized/date`.
- Impossible calendar dates are rejected rather than silently rolled into another month. Month/year changes constrain the day and respect min/max and disabled dates.
- Range endpoints are normalized when selected in either direction. `closeOnSelect` closes on completion, not on the first range endpoint. `openTo` initializes the view; it does not reset the user's view every render.
- With no selected value, Date initially focuses today in `timezone`. Inline Calendar uses the browser's local day; an explicitly displayed different month starts at its first day. The current-day marker is distinct from selection, and keyboard navigation alone does not select a date.

`value` and `defaultValue` accept a civil ISO string or a native JavaScript
Date instant for single selection. Ranges, including `mode="week"`, accept
`DateRangeValue | null`: an object with both `start` and `end`, each containing
a string, Date or `null`. `DateRangeValue<T>` is exported from the package root.
An end-only or start-only range is a valid draft; a complete range is ordered
chronologically. A draft cannot satisfy `required` or submit an interval.

Accepted strings are exactly `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, optionally
with seconds and 1–3 fractional second digits. An explicit instant adds `Z`,
`±HH:mm` or `±HHmm` to a datetime. Whitespace, regional date strings and empty
strings are invalid; use `null` to clear. Years are `0001`–`9999`.
Invalid value shapes, dates, `min`, `max`, `disabledDates` entries and
`disabledTime` entries throw `RangeError` naming the prop. Disabled hours
are integers 0–23; disabled minutes are integers 0–59. Constraints restrict
user selection and do not rewrite externally supplied values.

The current model has day precision in date/week/month/year modes and minute
precision in datetime/time modes. Switching an uncontrolled field to a date
mode discards its clock; switching back starts at midnight. Switching from
single to range retains the known start; switching back retains the start
(or the known end) and discards the other endpoint. These adaptations are
quiet and do not resurrect previously edited clocks or range ends.

`valueFormat` controls callback values: ISO strings by default, or native Date
instants with `valueFormat="date"`. Callback types follow selection and format;
a cleared single value is `null`, and a cleared range has two `null` endpoints.
Form submission always uses civil ISO values, independently of callback format.

`defaultValue` is read and validated once, and ignored when initially controlled.
`value={null}` clears a controlled field. Releasing `value` retains its latest
accepted civil value. Reset restores the initial uncontrolled default projected
into the current mode and selection; a field initially controlled has no such
default and clears after release and reset. Controlled reset keeps the current
prop. None of these operations emits a user change callback.

An uncontrolled field owns civil values: changing `timezone` does not reinterpret
its stored value or reset default as an instant. A controlled native Date or
offset string is converted again in the new timezone. A controlled civil string
keeps its written date and time.

Migration: replace single strings in week pickers with explicit ranges, include
both range keys, and replace empty strings with `null`. Use datetime/time mode
when the clock must be retained. Headless Date machines now expose one `value`
in context and connection; `valueSingle` and `valueRange` have been removed.
Rejected native proxy changes restore the accepted form value, including when
the parent refuses a controlled change without rerendering.

`locale` controls the language, numbering system and regional first weekday in both Date and Calendar. Labels and arithmetic consistently use the Gregorian calendar, including when a locale normally uses another calendar. `weekStartsOn` overrides the regional default: 0 is Sunday, 1 is Monday, through 6 for Saturday. It controls the header order, Home/End navigation and Date's selected week interval. Removing the override restores the locale default; changing either prop does not select a value.

Migration: Date previously defaulted to Monday and Calendar to Sunday regardless of locale. With `en-US`, both now start on Sunday. Pass `weekStartsOn={1}` for a business week that must start on Monday independently of locale. Invalid locale syntax, timezone names or weekday indexes throw `RangeError`; well-formed unsupported locales follow the browser's Intl fallback.

Date's optional `format` changes display text, while callbacks and form submission retain their value format. Supported tokens are `y`, `yy`, `yyyy`; `M`, `MM`, `MMM`, `MMMM`; `d`, `dd`; `EEE`, `EEEE`; `H`, `HH` (24-hour), `h`, `hh` (12-hour); `m`, `mm`; and `a` (day period). Numeric fields use the locale's digits, without grouping. Quote literal words with apostrophes and double an apostrophe to display it: `yyyy-MM-dd 'at' HH:mm` or `h:mm 'o''clock' a`. Unsupported Latin token groups and unclosed quotes throw `RangeError`, including on an empty field. An empty pattern uses locale formatting.

`locale` currently localizes dates, not every built-in English action label. The picker has minute precision; timezone selection, seconds, alternative calendar arithmetic and custom DST choices require a separate application interface.

## Date actions

`presets` supplies explicit business shortcuts. An omitted or empty array renders
none. Each `DatePreset` has a stable, nonempty `id`, a nonempty string `label` and
a `value` matching the picker selection. IDs must be unique within the picker;
labels and values may coincide. Keep the ID when localizing, reordering or
updating a rolling period so the same action retains its DOM and focus.
Readonly preset arrays are accepted.

```tsx
const reportingPeriods = [
  { id: 'july-2026', label: 'July 2026',
    value: { start: '2026-07-01', end: '2026-07-31' } },
  { id: 'q3-2026', label: 'Q3 2026',
    value: { start: '2026-07-01', end: '2026-09-30' } },
] as const

<Date selection="range" presets={reportingPeriods} showNow={false} />
```

Preset values use the same civil ISO / native Date rules and precision as
`value`. Invalid configuration throws `RangeError` naming `presets[index]` and
its field, including malformed dates, missing/duplicate IDs and incompatible
single/range shapes. Null and entirely empty ranges are not preset actions;
use Clear to clear a selection. An incomplete non-week range can start a draft.
A valid preset that is unavailable under current constraints is disabled. Week
presets must represent a complete week aligned with `weekStartsOn` to be enabled.

Preset activation uses the same `onValueChange`, `valueFormat`, constraints and
`closeOnSelect` rules as manual selection. It cannot satisfy `required` or close
on completion while its range is incomplete. A controlled parent may refuse
the value change. Updating preset data itself does not emit a value callback.

`showClear` and `showNow` independently control the built-in shortcuts. Clear
is disabled when there is no selected endpoint; clearing a draft is supported.
`labels.clear` and `labels.now` set both visible text and the accessible name.
Blank entries use meaningful English defaults so the actions remain named.
`labels` also covers view switches, choice groups, range endpoints, navigation
and the sheet close action; see the localization contract below.

Migration: remove `showPresets`, provide explicit `presets` when shortcuts are
needed, and add a stable ID to each existing entry. Today/Yesterday/Last 7 days/
This month are no longer implicit component data; the application owns the
business periods, their timezone calculation and their localized labels.
`presets={[]}` removes the shortcuts without inventing replacements.

## Calendar DOM boundary

Calendar forwards standard root DOM attributes and events to its existing
`role="group"` div. Its ref addresses that same element. Use `aria-label` or
`aria-labelledby` to name the whole calendar, and `aria-describedby` for
external help; the inner grid retains its displayed-month name. `className`,
`style`, `hidden`, `dir` and `lang` also apply to this group. Calendar is
transparent: give its parent surface the matching theme background, including
in standalone previews. `locale` continues
to control date formatting and the default first weekday.

Native capture handlers can call `preventDefault()` before selection or
navigation. Bubble events observe the normal DOM event; `onValueChange` is
the selection callback. Calendar owns its generated contents and group role,
so raw HTML, editable contents, div autofocus and native input-change aliases
are not part of its API. For explicit group focus, use its ref and `tabIndex`.

`defaultValue={null}` initializes an empty single or range selection. Later
changes to defaults do not reset current state. Calendar and Date accept
readonly `disabledDates` arrays; neither mutates the caller's array.

Calendar does not add hidden fields to FormData. Use Date when a native form
field is needed. A native `fieldset disabled` can disable Calendar's controls
as part of a form section.

## Layers, triggers and focus

Tooltip is informational; use Popover for interactive content. Popover has no `interactive`, `openDelay` or `closeDelay` props: clicks open and close it immediately. Tooltip owns hover/focus delays. Both support `defaultOpen` for initial uncontrolled visibility. Menu is for actions; Select is for choosing a value; Modal is for a labelled task or inspection surface. Empty overlays do not invent demonstration content.

Pass a single real trigger element where possible. The shared Trigger adapter composes its ref and handlers, preserves disabled state and respects `preventDefault()`. It does not put a second button around a Button. A custom trigger must forward its ref and native interaction/ARIA props. Strings or multiple trigger children use a Button fallback.

All layers share a document-level stack. One Escape or outside pointer gesture dismisses only the top eligible layer. Modal layers make the background inert, trap focus across owned nested portals, restore focus on close, and share reference-counted body scroll locking. Out-of-order unmount must not unlock another modal. Menu, Select, Date, Command, Modal and responsive Navigation/Panel sheets participate in this contract.

If a focused element is removed, hidden or natively disabled by a DOM update
inside an active modal boundary, the shared layer moves focus to the first
available tab stop in the same surviving portal, or its surface as a fallback.
An existing valid focus target, including a heading with `tabIndex={-1}`,
keeps focus. Disabling initial autofocus does not prevent recovery after focus
has entered the modal. Explicit application focus changes take precedence.
This recovery applies to DOM and availability-attribute updates; it is not a
replacement for application focus management across separate workflows.

Provide meaningful titles or `aria-label`/`aria-labelledby` as supported by the component. A non-closable modal is still a dialog. Disabling auto-focus for an embedded preview also disables automatic focus restoration; use normal focus management in application dialogs.

Tooltip/Popover native attributes, className, style and ref belong to one content surface. Its outer Membrane owns spacing and positioning; sideOffset measures the gap before that membrane. Direction follows the trigger through portals unless dir is supplied.

Floating placement measures the owning document, handles viewport edges and resizes, and constrains content. Root-level theming is necessary for portals. Test the application's own scroll containers, zoom and custom triggers, not only the default preview.

## Keyboard, motion and content

Composite widgets move actual DOM focus along with their active index. Calendar uses date buttons inside grid cells; sliders expose bounds and keyboard steps; half-step Rating exposes real selectable half values. Navigation's inline menu and modal sheet use the same action callbacks. Nested Navigation groups remain reachable.

Carousel only exposes visible slides to focus and assistive technology, accounts for `slidesPerView` at the last position and offers an explicit rotation control when autoplay is enabled. Hover pauses rotation; focus stops it until restarted. Reduced motion disables automatic rotation by default. CSS motion also respects reduced-motion and forced-color focus requirements.

Markdown always sanitizes its rendered HTML, even with `safeMode={false}`. The latter expands allowed structure; it is not a trusted-HTML escape hatch. `allowRawHtml` controls whether source HTML is parsed, and `gfm` controls GFM independently. Task-list checkboxes are inert. Upload acceptance/size/count checks are client-side UX and do not replace server validation.

## Extending the system

Before adding a prop, identify its observable behavior, owner and relationship to existing props. Prefer one explicit concept to synonyms and switches whose effects cancel each other. Do not introduce a prop only to satisfy a preview generator. Remove demo-only fallback data from production components.

Shared foundations belong in `design-system/source/*.jsonc`; generated CSS/manifests are not edited by hand. Runtime component tokens live in `assets/styles/component-tokens.css`. Run `pnpm tokens:sync` after editing their sources. See [design-system/README.md](design-system/README.md).

When the public interface changes, run `pnpm contracts:sync` and `pnpm gallery:sync`, review the generated changes and update actual consumers. Contracts cannot prove that a prop works: cover meaningful behavior through a regression test or a browser scenario.

## Quality gates

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

`check` verifies token/contract/gallery drift, builds ESM/CJS/declarations, runs unit and interaction tests, checks exports and package contents, and dry-runs npm packing. Browser tests check gallery markup with axe, real keyboard/focus behavior, forms, nested layers, SSR hydration, themes and layout. CI runs React 18 and React 19.

These are regression gates, not an accessibility certification or a numeric design score. Product-specific content, localization, screen-reader usability, physical touch hardware and complex host layouts still require validation in the consuming application.

In the Userface workspace, synchronize generated Face UI/engine snapshots and product lockfiles from their canonical owners, then run package drift checks and both product builds. Never patch a generated snapshot as a source of truth.

## September 2026 migration

The subsequent per-prop audit simplifies additional contracts:

- Avatar has one `fallback` slot. Replace `icon="user"` with `fallback={<Icon name="user" />}` and custom children with `fallback={content}`. Use native `aria-label`, `aria-labelledby` or `aria-hidden` on its root for accessible or decorative identity displays.
- Tile uses `chevron="down" | "right"` and native `aria-expanded` instead of `selector`/`selectorOpen`. Replace `busy` with `aria-busy`, and merge `selectedDescendant` into `active`. `intent`/`TileIntent` are removed: use `interactive={false}` with `tone="muted"` for headings; use an explicit `role` and its ARIA state for custom controls. The row class is `uf-tile`; it no longer borrows `uf-option`/`uf-control`. `disabled` disables the primary action; nested actions own their disabled state. The row exposes `data-primary-disabled`. Button-like rows always render a native primary button: `id`, role, control ARIA and tabIndex target it; ref/class/style/data attributes remain on the layout container.
- Button uses `chevron="down"` or `chevron="right"` instead of `selector`/`selectorDirection`. Replace `selectorOpen` with native `aria-expanded`. The indicator and accessible state now share one source. `pnpm migrate` defaults to dry run and supports `--write`.
- Button `iconOnly` retains the label for assistive technology; `fullWidth` can expand an icon-only control. A right-side chevron no longer overrides `iconPosition`, `align` or `stretchText`.
- Button, Text, Tile and Input use `iconPosition="start" | "end"` (default `start`), following reading direction. Migrate `left` to `start` and `right` to `end`. The former values are removed. CSS overrides use `--uf-control-pad-start/end` and `--uf-tile-pad-start/end`; Button/Tile icon markers are `data-icon-start/end`.
- Avatar initials preserve complete graphemes, including combining marks and compound emoji, with the same segmentation implementation during SSR and client rendering. Custom `fallback` still takes precedence.
- Text `size` now overrides every variant's default, including heading and label. `inset="none"` removes padding with icons, kbd and blockquote too. The blockquote variant now uses a semantic `<blockquote>`; use `as` to choose a different element deliberately.
- Icon `title` supplies a native SVG hint and accessible name when `label` is absent. Empty labels/titles are decorative. Icon width/height are excluded from the style type because its standard box stays 20×20.
- Bar uses real sections: replace `Bar.LeftEllipsis` with `Bar.Section grow` and `Bar.Right` with `Bar.Section align="end"`. `Bar.LeftOverlap` is removed. Sections work inside consumer components and preserve keyed state; `BarSection` is the same implementation as `Bar.Section`. For descriptors use `__componentName__: "Bar.Section"` with `align`/`grow`. Use Text.truncate for custom text that should ellipsize. Bar remains a layout primitive without an implicit toolbar role; explicit `role="toolbar"` requires caller-owned label and focus management.
- Card `interactive` becomes `hoverable`: it highlights the surface on hover/focus within, while child controls own actions. Replace `footerLayout` with `footerAlign`, `Card.Footer layout` with `align`, and `Card.Header layout="stack"/"bar"` with `orientation="vertical"/"horizontal"`. The shared type is `CardAlign`; header direction uses `CardHeaderOrientation`.
- Card `border` is independent of padding/radius, including both set to `none`. `fullWidth={false}` changes width without centering; set alignment on the parent or through `style`. Explicit typography variants/sizes on Card.Title and Card.Description now retain Text semantics; `as` still overrides the element.
- Bar/Card descriptors share one resolver. Nested descriptor children work without duplicate Text/Membrane wrappers; unknown names render no content. Primitive footer text retains intrinsic width so footer alignment works.
- Copy success is reported through `onCopied`; the unused internal `data-copied` state and timer have been removed.

| Previous usage                               | Current usage                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `Switcher text="…" withText`                 | `Switcher label="…"`                                                         |
| Conditional `withText`                       | Conditionally provide `label`; use an accessible name if visually unlabelled |
| `Popover interactive={…}`                    | Remove it; use Tooltip for informational content                             |
| `Table membrane` to style rows               | `Table rowStyle="tile"`; `membrane` now means actual outer spacing           |
| Global membrane listener installation/import | Remove it; each component owns its explicit boundary                         |
| Nested global text overrides                 | Theme documented tokens; let each nested component own its typography        |

Run `pnpm migrate <source-directory>` for a dry run; add `--write` to update explicit JSX attributes and JSON descriptors. Review spreads, wrappers and generated content manually. The script preserves aliases of named imports but does not infer arbitrary user-defined components.

### Input native field contract

`Input` uses a single-line native control by default. Set `multiline` for a
textarea, `rows` for its minimum visible lines, and `autoGrow={false}` for a fixed
row count. `ref` points to the native input/textarea. Native attributes, `role`,
`aria-*` and events target that control; `className` and `style` target the outer
label/control/help layout. `aria-describedby` composes with help/error ids.

`onChange` receives the native React change event; `onValueChange` receives
`{ value }`. Both notify on edits and clear. Parent value updates and form reset
are silent. `clearable={false}` removes the clear action; `clearLabel` localizes
its accessible name. Required uses native validation; its visual marker is
hidden from assistive technology. Empty label/help/error/icon slots add no space.

Migration: `textLayout="wrap"` → `multiline`; `textLayout="scroll"` → omit it;
`controlRef` → `ref`; `ariaLabel` → `aria-label`; `controlRole` → `role`; use native
hyphenated names for ARIA relationships. Remove `stretchText`, which had no effect.
Single-line-only constraints and multiline sizing are incompatible in TypeScript.
Native input picker and autocomplete interfaces remain browser-dependent.

### Radio native group contract

`Radio` renders a flat `options` array as native radio inputs. `value` controls
selection; `null` clears it. An empty string is a valid option value.
`defaultValue` initializes uncontrolled selection and is restored by form reset.
Both arrow pairs move focus and selection, skipping disabled options and wrapping;
horizontal arrows follow reading direction. `orientation` controls the layout.

`ref`, `className`, `style`, `id`, `dir`, `hidden`, native events and group ARIA
belong to the outer radiogroup. `autoFocus` focuses its selected enabled input,
or its first enabled input. Options accept native `id`, `aria-label`,
`aria-labelledby` and `aria-describedby` for rich or externally described labels.
Use `aria-label` or `aria-labelledby` to name the group.

`onValueChange` receives `{ value }` once per user selection. Native `onChange`
also works for controlled parents. Reselecting, parent updates and reset do not
emit a value change. `form` associates all options with an external form that
exists by the end of the React commit. `required` needs a nonempty `name` for
native group validation; TypeScript requires the name when required is enabled.
Use distinct names for independent groups with the same form owner. Omit `name`
for callback-only settings that should not contribute to FormData.

Migration: `ariaLabel` → `aria-label`, `ariaLabelledBy` → `aria-labelledby`.
Remove group `defaultChecked`, arbitrary children or role overrides. The visual
label is anatomy `item`; the native control is `input`. Headless adapters should
use `getInputProps` for native input handlers and `getItemProps` for the visual row.


### Select value and surface contract

`Select` uses a native button trigger and a listbox. `ref`, native events, `id`,
ARIA names/descriptions and focus attributes belong to that button; `className`
and `style` belong to the visual root. Use `label`, `aria-label` or
`aria-labelledby` to name the field. Empty labels add no layout space.

Single selection uses `string | null`; `null` means no selection and `""` is a
valid option key. `multiple` changes both value and callback to a readonly string
array. Duplicate keys use their first definition. Disabled options cannot be
selected interactively. With no enabled options, opening is unavailable but the
trigger remains focusable for form validation; only explicit `disabled` excludes
the field from focus and submission. Rich labels should provide `textValue` for typeahead.

```tsx
<Select label="Model" value={model} options={models}
  onValueChange={({ value }) => setModel(value)} />
<Select multiple label="Teams" value={teams} options={teamOptions}
  onValueChange={({ value }) => setTeams(value)} />
```

`defaultValue` and `defaultOpen` initialize uncontrolled state once. Controlled
`value` and `open` stay owned by the parent; external updates do not echo change
callbacks. Form reset restores uncontrolled defaults and preserves controlled
values. `name`/`form` connect a native select proxy to submission and required
validation; an empty-string option is a valid explicit choice.

`surface="auto"` switches between popover and sheet. Explicit `popover`, `sheet`
and `side` keep that presentation. Side supports mouse hover, click and keyboard;
its selected row aligns to the trigger when the available space allows it.
When neither side fits, the list moves below or above the trigger without
covering it; the selected row remains visible.
Sheet has a labelled dialog, a separate listbox and a localized `closeLabel`.
`contentMinWidth` affects popovers and remains bounded by the viewport.

`fullWidth` defaults to true. Use false for compact controls; `iconOnly` removes
the chevron and makes the trigger square. It still needs an accessible name.
`stretchText` controls value expansion and chevron position for every surface.
`displayValue` changes presentation without changing selection or submission.

Migration: `type="multiselect"` → `multiple`; remove single `type`.
`variant="side"` → `surface="side"`; `variant="iconOnly"` →
`iconOnly fullWidth={false}`; remove `variant="default"`.
`ariaLabel` → `aria-label`. Ref targets HTMLButtonElement, replacing the old div.

## Calendar navigation and Date period selection

`mode` determines available views. `openTo` chooses the initial view and does
not reset navigation on rerender. The `views` prop has been removed; remove it
from existing JSX/JSON and keep `openTo` when a specific starting view matters.

| Mode | Available views |
| --- | --- |
| date, week | day, month, year |
| datetime | day, month, year, hours, minutes |
| time | hours, minutes |
| month | month, year |
| year | year |

Types reject incompatible mode/openTo combinations. Week mode represents a
whole week and has no `selection` prop; remove `selection` from week pickers.
Other modes support single values and ranges. Changing the mode adapts the
value precision and uses a valid view, without emitting a change callback.

Month views page by year; year views page through groups of up to 12 years,
covering years 1–9999 and respecting min/max navigation bounds. Paging does not
select a value. Month/year highlights represent the selected value or range.
Month, year, hour and minute choices share one Tab entry and directional key
navigation. Left/right follow text direction; up/down move by visual row;
Home/End move within the row and Ctrl+Home/End across the whole group.
PageUp/PageDown change period pages while preserving keyboard position.

Date's ref points to its native trigger button. `id`, data/ARIA attributes and
native events target that button; `className`, `style`, `hidden`, `dir`, `lang`
and `title` describe the whole field. The portal inherits its direction and
language. Click and key handlers can call `preventDefault()` to cancel the
picker action. Enter/Space use native button activation; ArrowDown opens it.

`open` controls visibility, `defaultOpen` sets its initial uncontrolled state,
and `onOpenChange({ open })` reports user requests. Parent updates and initial
opening are quiet. A parent may refuse a request without remounting the dialog
or losing its current focus. Disabled, read-only and hidden fields cannot open.
Closed dialogs are unmounted and have no dangling `aria-controls` reference.

Opening focuses the current calendar entry or selected clock control. Choosing
the same day can close the picker without another `onValueChange` callback.
Date and Calendar share a grid; each owns its selection model. Whole-week
constraints and days with no permitted time are reflected in day availability.

Labels, descriptions, errors and `surfaceTitle` accept rich content; empty
slots are omitted and numeric zero is preserved. `surfaceTitle` names the
dialog; `labels.close` names its sheet close button. The required asterisk is
decorative. Explicit native accessible names take precedence over the field
label, while external description IDs are combined with description/error IDs.

`Date mode="time"` edits the clock portion of a civil date/time value; the
stored date and timezone conversion rules remain the same as `datetime`.
For `selection="range"`, Start and End in the clock panel choose which endpoint
to edit. Editing its clock preserves the other endpoint and cannot cross it.
An incomplete range remains open with `closeOnSelect` and does not submit an
interval. Selecting a minute closes only after both endpoints exist.

Clock selection follows the current value, including controlled updates and
form reset. Repeating a value does not emit another `onValueChange` callback.
Date-only `min`/`max` include the entire boundary day; datetime bounds include
their exact minute. Day and hour selection preserve the current time where
possible, otherwise choose the nearest permitted minute within the chosen
day or hour. The minute panel contains all 60 exact minutes. Use
`disabledTime` to restrict choices. External values are not silently corrected
to satisfy constraints.

Starting a new calendar range clears the previous end, including its time.
The start retains its clock. A newly completed endpoint starts at midnight
(or the nearest available minute). When the second date precedes the first,
the already selected date and its clock stay together as the end of the range.
Both endpoint clocks can then be edited explicitly.

Now uses the configured timezone and the same selection model as manual
selection: it edits the active endpoint for time/datetime, selects a day for
date ranges, and selects all seven days for week mode. A weekly selection
requires all seven days to be available. Presets must match the single/range
value shape and constraints; weekly presets must represent a complete aligned
week. In the Date field, calendar bounds and disabled dates use the field's
timezone too.

Standalone Calendar uses Gregorian civil dates as `YYYY-MM-DD` strings in
every date prop and callback: `value`, `defaultValue`, range endpoints,
`viewDate`, `defaultViewDate`, `min`, `max` and `disabledDates`. A civil date
represents a calendar day independently of the browser's timezone. Supported
years are `0001`–`9999`. Invalid dates, timestamps and native JavaScript `Date`
objects throw `RangeError`; they are not shifted into another day.

This replaces Calendar's former native `Date` API. Store calendar days as ISO
strings. If the application starts with an instant, convert it to a civil date
in the application's chosen timezone before passing it to Calendar. For a field
that owns instant conversion and form submission, use Date with `timezone`.

Single selection accepts `string | null`; `selection="range"` accepts
`CalendarRangeValue | null`, with both `start` and `end` set to a string or
`null`. `CalendarRangeValue` is exported from the package root. An incomplete
range preserves its known endpoint until the next day is selected. Reversed
endpoints are ordered chronologically.

Calendar separates the selected `value` from the displayed `viewDate`.
`viewDate` controls the displayed month; `defaultViewDate` initializes it once.
Without either prop, the calendar starts at the selected date or today.
`onViewDateChange({ viewDate })` receives the first day of the month after user
navigation. External updates emit neither navigation nor selection callbacks.
Controlled props ignore their defaults; `value={null}` explicitly clears the
selection. Releasing a controlled prop retains its latest accepted state.
Default props are read and validated only at initialization. Switching an
uncontrolled range to single selection retains its start and discards its end.

Use `readOnly` to let users review the selection and browse other months while
preventing date changes. `disabled` suspends selection and navigation and removes
internal buttons from the Tab sequence. Both default to false; neither discards
the selection or prevents application updates to `value` and `viewDate`.
When both are true, `disabled` takes precedence. Day constraints (`min`, `max`,
`disabledDates`) retain their meaning after either state is removed.

```tsx
const [selectedDate, setSelectedDate] = useState<string | null>('2026-09-12')
const [viewedMonth, setViewedMonth] = useState('2026-09-01')

<Calendar value={selectedDate} viewDate={viewedMonth}
  onValueChange={({ value }) => setSelectedDate(value)}
  onViewDateChange={({ viewDate }) => setViewedMonth(viewDate)} />
```

PageUp/PageDown move by month; Shift moves by year, keeping the day number when
it exists and otherwise using the last day of the month. The grid retains one
Tab entry; left/right arrows follow the reading direction.

In Date, year/month drilldown changes the viewed period without committing a
value. Selecting a day commits that day. For `mode="month"` or `mode="year"`,
selecting that period commits it; `selection="range"` fills start and end in
two steps. With `closeOnSelect`, the first endpoint stays open. Changing the
view never updates the form field or calls `onValueChange`.


## Task progress and measurements

Use `Progress` for task completion and `Meter` for a known measurement such as
storage or quota usage. Both offer `shape="linear" | "circle"`, `tone`, `label`,
`showValue` and the standard `membrane` boundary. Label every indicator with
visible `label` or native `aria-label` / `aria-labelledby` (`ariaLabel` was removed).

`Progress` uses a finite `value` and positive `max` (defaults: 0 and 100).
`indeterminate` means task duration is unknown; it omits numeric value and text.
`Meter` adds a finite `min` (default 0), requires `min < max`, and always represents
a known reading. Finite values outside the range are clamped; invalid ranges or
nonfinite numbers throw. Unknown or zero-limit quotas should display their loading
or unavailable state without inventing a numeric range.

`formatValue={({ value, min, max, percent }) => string}` formats the bounded value
for visible text and accessibility; `aria-valuetext` can separately override speech.
The default integer percentage rounds down without losing exact visual/ARIA data.
All native attributes and the forwarded ref target the semantic root div.

```tsx
import { Progress, Meter } from '@userface/face-ui-react'

<Progress value={7} max={10} label="Import" showValue
  formatValue={({ value, max }) => `${value} of ${max} files`} />
<Meter value={74} label="Storage used" tone="warning" showValue />
```

Both indicators share `--uf-range-*` tokens, replacing the old `--uf-progress-*`
prefix. Geometry uses `--uf-range-track-height` and `--uf-range-circle-size`.


## Rating

Rating chooses a score with native radio inputs. `max` is an integer 1..10
(default 5); use Slider/Input for long numeric scales. Finite `value` and
`defaultValue` are bounded to 0..max. Editable scores snap to whole stars or
half stars with `allowHalf`; zero is unrated and omitted from FormData.

`readOnly` displays an exact average such as 4.2 using meter semantics, without
rounding to input steps, dimming, preview, focus stops or required validation.
`disabled` prevents editing and submission while retaining the displayed value.
Use `readOnly` for aggregate scores formerly shown through `disabled`.

`label` is noninteractive visible content. Native `aria-label` / `aria-labelledby`
replace `ariaLabel`; empty label content never suppresses native naming.
`formatValue({value,max})` returns localized nonempty option names or the readonly
value description. `name`, external `form`, `required` and native reset work;
required input needs a nonempty name. Independent ratings in a form need distinct
names. `autoFocus` focuses an editable choice only on mount.

Reselecting the current score keeps it and emits no change. Reset the form or set
controlled value to 0 to clear it. Arrows navigate from the focused option, wrap,
and respect RTL horizontally. Home/End choose the first/last real option. A
controlled refusal preserves the accepted value and form data while allowing
focus to move. External changes and reset are silent; releasing control retains
the last accepted score.

Each choice uses the shared Membrane. Toggling `membrane` preserves DOM, selection
and focus. Half choices have at least 24 CSS px hit width and share one star glyph;
narrow rows wrap whole star pairs. Native root attrs, events and ref are forwarded.
[Prop decisions, migration and verification](docs/audit/props/Rating.md).


## Slider

Slider uses one behavior model for dots and numbered handles. `showValue` replaces
`variant="advanced"`; `crop` works with either presentation. Use `label` (including
rich content) instead of `leadingText`/`leadingIcon`. `clampToCrop` replaces
`cropLocksValue`: false supports a playhead outside an animation interval.

`value`/`defaultValue` accept a finite number or a nonempty readonly array. Values
are ordered and snapped to a decimal grid starting at `min` (0 by default).
`max` defaults to 100; `step` defaults to 1. End selects the last step at or below
max. Invalid bounds, values and steps that cannot change representable numbers
throw instead of silently switching input modes or losing array entries.

Each thumb is a native range input. `name` submits ordered values as repeated
entries; `cropName` does the same for enabled crop endpoints. `form`, disabled
fieldset behavior and reset work natively. `labels.thumbs`, `labels.cropStart` and
`labels.cropEnd` provide complete localized names. `formatValue({value,index,kind})`
supplies visible numbers and accessible units; long visible text is truncated to
keep controls inside the available width, with full text in the native title.

`onValueChange({value})` and `onCropChange({min,max})` propose user edits to their
respective state. Accepted crop/bounds changes normalize primary values silently;
a refused crop proposal cannot mutate primary state. `onValueCommit` and
`onCropCommit` report an accepted completed edit. Cancellation, reset, external
updates and reselecting do not emit commits. Releasing controlled ownership retains
the last accepted state. Default values are captured on mount, not on rerender.

Horizontal controls follow text direction, vertical controls increase upward.
All thumbs keep stable tab order, Arrow/Page/Home/End navigation, dependent bounds
and one canonical Membrane. `membrane={false}` removes spacing without remounting
inputs; `autoFocus` focuses the first enabled thumb only on mount. There is no
native range `readOnly` or `required` no-op API; use Meter for passive measurements.

### SegmentedControl migration

Use `multiple` for independent options; omit it for a single radio choice. Single
`value`/`defaultValue` are strings or null; multiple values are readonly string
arrays. `selectionMode` and `ariaLabel` are removed; use native `aria-label` or
`aria-labelledby`. Empty string remains a real choice. Re-selecting a radio is
silent and preserves it. Multiple items are native pressed buttons.

Root native attributes/events/ref belong to the group. Item id and native ARIA
attributes name individual choices. Supply noninteractive labels. `name`/`form`
submit accepted values in item order; disabled choices are omitted; form reset
restores mount defaults. Use Radio/Select for required native validation.
`autoFocus` runs once. Unknown/duplicate selected keys are omitted; duplicate item
keys and malformed values throw. Removing uncontrolled choices discards them.

Deprecated Toggle keeps its `type` and array value adapter, with the corrected
semantics above. Its props reuse the canonical native surface. The unused
`toggleMachine`, `connectToggle`, `toggleAnatomy` and `ToggleSchema` exports are
removed. Membrane still owns spacing; orientation changes actual layout.
