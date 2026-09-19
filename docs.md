# Face UI — agent guide

How to build interfaces with `@userface/face-ui-react`. Sections 1–2 are the constitution: read them before composing UI. Sections 3–4 are reference: read them on demand.

This guide never lists props, defaults or token values; they live in generated sources:

| Question | Source |
| --- | --- |
| Props, types, defaults, keyboard, ARIA | `<Name>/<Name>.json`, generated from the JSDoc in `<Name>/<Name>.tsx` |
| Token names and values | `design-system/generated/token-manifest.json` |
| Status, category, related components | `component-registry.json` |
| Removed or renamed API | `MIGRATION.md` and `migrations.json` |

## 1. Rules

### 1.1 Imports

Import from `@userface/face-ui-react` and load `@userface/face-ui-react/assets/styles/index.css` once; no provider is needed. `Overlay`, `Toggle` and `Sidebar` live only in the `/compat` subpath, for old code. Do not build a component that 1.4 already covers.

### 1.2 Text owns visible copy

Every piece of visible copy is either a control's own content prop or a `Text`. Never write a bare `<p>`, `<span>`, `<h1>`–`<h6>`, `<label>` or a text node inside a layout container.

- `variant` sets presentation: `body` (default), `muted`, `heading`, `h1`–`h6`, `label`, `kbd`, `code`, `markdown`, `blockquote`. `as` sets the element; keep heading order. `size` (`xs`–`xl`) overrides the variant's size.
- App UI keeps the defaults, so text aligns with controls.
- Editorial and landing copy: `heightMode="content" inset="none" membrane={false}`.
- Inside an inline parent: `as="span" membrane={false}`.
- Controls own their text. Pass content to `Button` children, `Input label`, `Checkbox label`, `Modal title` and the like; do not wrap those in `Text`.

```tsx
<Text variant="h2">Billing</Text>
<Text variant="muted" size="sm">Invoices are sent on the 1st.</Text>
<Text as="p" heightMode="content" inset="none" membrane={false}>Long-form paragraph.</Text>
```

### 1.3 Geometry

- Each component owns one outer boundary, the membrane (`--uf-membrane`, 1px). The spacing between adjacent controls comes from it. Never add margins or negative offsets between components.
- Separate groups with `gap` on a flex or grid container, using `--uf-spacing-*` tokens.
- Set `membrane={false}` only where a parent boundary already owns the spacing; it removes the box and keeps identity, state and focus.
- A single-line control is a 32px body plus 1px of membrane per side, so 34px. A labelled field is taller; align rows by control body on purpose.
- Icon placement belongs to the control: `icon` with `iconPosition="start" | "end"`. Never put a margin on `Icon`.
- Width comes from `fullWidth` where the contract offers it, otherwise from `style.width`.

### 1.4 Choosing a component

| Need | Use | Not |
| --- | --- | --- |
| Any visible copy | `Text` | bare HTML text |
| Prose from a Markdown string | `Markdown` | hand-written HTML |
| Code sample or log | `Code` | `<pre>` |
| A glyph inside a control | `Icon` | inline `<svg>` |
| Grouped content surface | `Card` | a styled `div` |
| Toolbar or header row | `Bar` | an ad hoc flex row |
| A line between sections | `Separator` | `<hr>`, borders |
| Status label or count | `Badge` | coloured `Text` |
| Row with icon, meta and actions | `Tile` | `Button` with custom children |
| Action | `Button` | `<button>`, a clickable `div` |
| Text or number entry | `Input` (`multiline` for long text) | `<input>`, `<textarea>` |
| One value from a list | `Select` | `Menu` |
| Two to five options in one strip | `SegmentedControl` | `Tabs` |
| Options that each need a visible row | `Radio` | `Select` |
| Independent on/off inside a form | `Checkbox` | `Switcher` |
| Setting that applies immediately | `Switcher` | `Checkbox` |
| Number on a scale | `Slider` | `Input type="number"` |
| Score | `Rating` | stars in `Text` |
| Date, time or period field | `Date` | `Input type="date"` |
| Always-visible month grid | `Calendar` | `Date` |
| Files | `Upload` | `<input type="file">` |
| Switching sibling panels | `Tabs` | `SegmentedControl` |
| Collapsible sections | `Accordion` | `Tile` plus state |
| Location in a hierarchy | `Breadcrumb` | `Text` with slashes |
| Paged results | `Pagination` | two `Button`s |
| Multi-step flow | `Steps` | `Tabs` |
| Product navigation at the top | `Navigation` | a `Bar` of links |
| Product navigation at the side | `Panel` | `Tree` |
| Hierarchy that expands | `Tree` | `Accordion` |
| Sections of the current document | `Toc` | `Tree`, `Navigation` |
| Non-interactive hint | `Tooltip` | `Popover` |
| Small interactive surface | `Popover` | `Tooltip` |
| List of actions | `Menu` | `Select` |
| Search over commands | `Command` | `Menu` |
| Focused task or inspection | `Modal` | `Popover` |
| Transient notice | `Toast` through `useToast()` | `Modal`, `alert()` |
| Task completion | `Progress` | `Meter` |
| Known measurement, such as a quota | `Meter` | `Progress` |
| Loading placeholder | `Skeleton` | a spinner in content |
| Person or entity | `Avatar` | `Media` |
| Image, video or audio | `Media` | `<img>`, `<video>` |
| Rotating showcase | `Carousel` | a scroller |
| Tabular data | `Table` | a grid of `Card` |
| A region that scrolls | `Scroll` | an `overflow: auto` wrapper |
| Existing `Overlay` code | `Tooltip`, `Popover` | `Overlay` |
| Existing `Toggle` code | `SegmentedControl` | `Toggle` |

### 1.5 Layers

- `Tooltip` informs, `Popover` holds interactive content, `Menu` runs actions, `Select` chooses a value, `Command` searches, `Modal` holds a named task.
- Keep `surface="auto"` on `Select`, `Date`, `Menu`, `Command`, `Navigation` and `Panel`: contextual on wide screens, a sheet or dialog below 900px.
- Pass one real trigger element; a custom trigger forwards `ref` and props, and a string renders as a `Button`.
- Escape and an outside press dismiss the top layer only; a modal layer traps focus, restores it on close and makes the page behind inert.
- Set `data-theme` and theme overrides on `html`: a portaled layer cannot inherit a theme scoped to a subtree.
- Name every dialog and floating surface with `title`, `aria-label` or `aria-labelledby`.

### 1.6 Before shipping

- [ ] All copy goes through 1.2; heading levels are in order.
- [ ] Components chosen by meaning (1.4); no compat names; no raw `<button>`, `<input>`, `<select>`.
- [ ] No margins between components; gaps use spacing tokens.
- [ ] Icon-only controls and unlabelled fields have `aria-label`.
- [ ] Overlays keep `surface="auto"` and work at 360px wide.
- [ ] The console shows no `Face UI <Component>: invalid …` report (2.8).

## 2. API conventions

Every component follows these rules. Where a contract contradicts them, trust the contract and report the difference as a library bug.

### 2.1 State

- Each piece of state is one triple: `x` (controlled), `defaultX` (read once on mount) and `onXChange({ x })` (user proposals only). The names in use are `value`, `checked`, `files`, `open`, `expanded`, `collapsed`, `search`, `page`, `step`, `index`, `viewDate`, `sort` and `selectedRows`.
- A parent update, a reset or a normalization never calls `onXChange`. If the parent refuses a proposal, the accepted value stays.
- `null` is a value (nothing selected), not a switch to uncontrolled mode.
- `disabled` and `readOnly` block the user, never the parent.
- The end of a gesture is `onXCommit({ x })`, alongside the live `onXChange`.

### 2.2 Collections and selection

- A collection is `items`. A base item is `{ value, label, disabled?, icon?, textValue? }`; a group is `{ type: 'group', label, items }`, a divider is `{ type: 'separator' }`, and nesting goes through the item's own `items`.
- Keys are strings and `''` is a real key. An item without a `value`, or repeating one, is dropped. Arrays arrive `readonly` and are never mutated; callbacks receive a fresh array.
- `multiple` switches the shape of the value: `string | null` becomes `string[]`. There is no `selectionMode` or `type`.
- Display-only items (`Breadcrumb`, `Steps`) take an optional `key`; structural definitions (`columns`, `presets`) take an `id`. An `Id` suffix means a DOM id, as in `panelId`.

### 2.3 Names

- ARIA uses native attributes: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-busy`. There are no camelCase aliases.
- Axes are logical: `start` and `end` for `align`, `iconPosition`, `placement` and `labelPosition`; `chevron="down" | "end"` mirrors in right-to-left text. A physical `side` exists only on floating surfaces anchored to a trigger.
- One concept has one name. There are no aliases and no deprecated synonyms; every removed name is in `MIGRATION.md`.

### 2.4 Content and strings

- `children` is the main content. `content` is a second region, used when `children` is the trigger (`Tooltip`, `Popover`) or on an item that owns a panel.
- A surface names its regions `title`, `description` and `footer`. A label is made of `label`, `meta`, `icon` with `iconPosition`, and `actions`.
- Strings a component renders for its own controls — close, clear, next page, remove — come from one `labels` object with shared keys. Copy the caller owns (`label`, `placeholder`, `title`, `description`) stays a separate prop, has no English default, and never loses an accessible name to an empty string.
- JSON face documents address components with slot descriptors `{ "__componentName__": "Name", ...props }`.

### 2.5 Fields

Eight components are fields — `Input`, `Select`, `Date`, `Radio`, `Rating`, `Slider`, `SegmentedControl` and `Upload`. Each takes the same `label`, `description`, `error` and `labelPosition`, renders the same anatomy, and resolves its name as `aria-labelledby` over `aria-label` over the visible `label`. `error` marks the field invalid and is not a live region; `required` adds the marker. `Checkbox` and `Switcher` are not fields: their `label` names one option, and a set of them belongs in a `<fieldset>`.

### 2.6 Forms

- Form controls take native `name`, `form`, `required`, `disabled` and `autoFocus`, and submit through `FormData` — `Select`, `Date` and `SegmentedControl` included.
- `form.reset()` restores defaults silently. A `disabled` control, including one inside `<fieldset disabled>`, is left out of submission.
- The browser runs interactive validation; the component supplies the constraints and shows the message.

### 2.7 DOM ownership and events

- `ref`, `id`, `className`, `style` and native attributes land on the real control or semantic root, never on a spacing wrapper; on an overlay they land on the content surface.
- A native handler keeps its native signature, runs before the component's own, and `preventDefault()` cancels the built-in action. A semantic callback receives one details object instead.

### 2.8 Invalid input

- Rendering never throws on data. A value a component cannot use is normalized — fallback to the
  documented default, clamp numbers (integers truncate), drop invalid or duplicate items (first wins),
  project a value shaped for the other mode — and reported once in development:
  `Face UI <Component>: invalid <prop> <value>; <outcome>.` Production is silent.
- Empty text means "not provided". Nothing is coerced: "50" for a number is replaced by the default.
- Types are checked by TypeScript in code and by the contract validator in face documents.
- A report is a defect in your data: fix the document. Face UI's own scenarios render with zero reports.

### 2.9 Extending

Add a prop only for an observable effect no existing prop has. Never add a second name for one concept, a prop that does nothing, or a switch whose effect cancels another. Prefer the native attribute or `style` when it already works, and put the decision in the prop's JSDoc, which is where the contract comes from.

---

<!-- SEPARATOR:CONSTITUTION_END -->

## 3. Recipes

### 3.1 Settings screen

`Panel` for the sections, `Bar` for the page header and its actions, `Text` for section titles and help, `Input`, `Select`, `Switcher`, `Checkbox` and `Date` for the values, `Button` for save and reset. One `<form>` around the fields leaves reset and validation to the browser.

### 3.2 Search and commands

`Command` for search and action discovery, `Menu` for a short list of actions on one object, `Popover` for a small rich surface. Keep `surface="auto"` so both become a sheet on a phone.

### 3.3 Documentation page

`Toc` for the sections, `Text` for the hierarchy, `Markdown` for authored prose, `Code` for samples, `Table` for reference data, `Accordion` for the FAQ.

### 3.4 Data-heavy page

`Bar` for filters and actions, `Table` for the data, `Pagination` under it, `Modal` with `placement="end"` as an edge sheet for the row detail, `Skeleton` while the first page loads.

### 3.5 Landing page

All copy through `Text` with `heightMode="content" inset="none" membrane={false}`; `Card` for blocks, `Media` and `Carousel` for imagery, `Button` for the calls to action, `Code` for install commands, `Accordion` for the FAQ.

## 4. Components

### Accordion

Stacked sections that open and close, several at a time by default.

```tsx
<Accordion
  defaultExpanded={['profile']}
  items={[
    { value: 'profile', label: 'Profile', icon: 'account', content: <Text>Identity.</Text> },
    { value: 'security', label: 'Security', content: <Text>Sessions.</Text> },
  ]}
  onExpandedChange={({ expanded }) => setOpen(expanded)}
/>
```

- `multiple={false}` keeps one section open, and only the first value of `expanded` shows.
- `collapsible={false}` leaves the last open trigger `aria-disabled` instead of closing it.
- Panels stay mounted while collapsed, so their controls keep local state; `item.region` exposes a complex panel as a landmark.

### Avatar

A person's image, with initials or custom content while it is missing, pending or broken.

```tsx
<Avatar src={user.photo} name="Maya Chen" />
<Avatar name="Research assistant" fallback="AI" />
```

- `name` is both the accessible name and the source of the initials; `fallback` replaces the initials, not the name.
- `fallbackDelay` only holds back a pending image — a missing or broken one falls back at once.

### Badge

A status label or a count. It is not interactive: put actions in `Button` or `Tile`.

```tsx
<Badge tone="positive" variant="fill">Ready to deploy</Badge>
<Badge tone="warning">Quota almost used</Badge>
```

- `tone` carries the meaning and `variant` only the treatment, so they are set independently.

### Bar

A row of content with sections that push apart. Children keep their own keyboard behaviour.

```tsx
<Bar>
  <Text truncate>Acme Workspace</Text>
  <Bar.Section align="end">
    <Button icon="plus" fullWidth={false}>Invite</Button>
  </Bar.Section>
</Bar>
```

- `Bar.Section align="end"` moves a section to the inline end; `grow` gives it the spare room.
- `orientation="vertical"` stacks the sections; the same alignment rules follow the block axis.

### Breadcrumb

The trail from the root to the current page, collapsing its middle into an overflow list.

```tsx
<Breadcrumb
  maxItems={4}
  items={[
    { label: 'Projects', href: '/projects' },
    { label: 'Dashboard' },
  ]}
/>
```

- An item with `href` is a link, an item with only `onClick` is a button, and an item with neither is plain text; the last item is the current page.
- `maxItems` counts the overflow button and starts at 3; `maxItems={null}` shows the whole trail.
- Name the nav with `aria-label`; `labels.more` names the overflow button.

### Button

An explicit action. Keep one `accent` button per group of actions.

```tsx
<Button variant="accent" icon="plus" fullWidth={false}>Create workspace</Button>
<Button icon="more" iconOnly aria-label="More actions" />
<Button chevron="down" aria-expanded={open} onClick={toggle}>Details</Button>
```

- `iconOnly` keeps the children as the accessible name only; a button with no text needs `aria-label`.
- `chevron` draws the disclosure and native `aria-expanded` carries the state; they share one source.
- `loading` keeps the label, shows a spinner and marks the button `aria-busy`; like `disabled` it blocks activation.

### Calendar

An always-visible month grid for a civil day or a range. It is not a form control.

```tsx
<Calendar
  selection="range"
  defaultValue={{ start: '2026-07-14', end: '2026-07-18' }}
  min="2026-07-01"
  locale="en-GB"
  weekStartsOn={1}
  aria-label="Booking dates"
  onValueChange={({ value }) => setRange(value)}
/>
```

- Values are `YYYY-MM-DD` strings, independent of the browser's timezone; use `Date` for a field that submits.
- A range excludes `disabledDates` from the whole interval; `excludeDisabledDates={false}` constrains only its endpoints.
- `locale` formats and picks the first weekday; `labels` translates the navigation buttons.

### Card

A contained surface. Either fill its regions with props, or compose the parts.

```tsx
<Card title="API usage" description="This month"
  footer={<Button variant="outline" fullWidth={false}>View usage</Button>}>
  <Text>1.8M of 2M tokens used.</Text>
</Card>

<Card variant="plain" padding="none">
  <Card.Header><Card.Title>Settings</Card.Title></Card.Header>
  <Card.Content>…</Card.Content>
</Card>
```

- With `title`, `description` or `footer` set, `children` fills the content part; without them `children` is free composition.
- In compound use, alignment comes from `Card.Footer align`, not from `footerAlign`.
- `hoverable` only highlights the surface; it creates no action.

### Carousel

Slides shown one position at a time, with previous, next and indicators.

```tsx
<Carousel aria-label="Product tour" loop autoPlay autoPlayInterval={5000}>
  <Media src="/tour/overview.webp" alt="Workspace overview" height={320} />
  <Media src="/tour/analytics.webp" alt="Analytics" height={320} />
</Carousel>
```

- Each top-level child is one slide; `slidesPerView` shows several and each takes that share of the width.
- `autoPlay` adds a rotation control and stops on keyboard focus or a user move; reduced motion disables it.
- Name the region with `aria-label`; `labels` translates the slide and control names.

### Checkbox

An independent on/off option with its own visible label.

```tsx
<Checkbox label="I agree to the Terms of Service" name="terms" required />
<Checkbox label="Select all" checked={allChecked} onCheckedChange={({ checked }) => selectAll(checked)} />
```

- `checked="indeterminate"` summarizes a partly selected collection; it submits nothing and does not satisfy `required`.
- `value` is the string submitted while checked; it never controls the selection.
- Use `Switcher` for a setting that applies at once, and a `<fieldset>` with a `<legend>` to group several checkboxes.

### Code

A block of source with an optional title, line numbers, marked lines, copy and collapse.

```tsx
<Code title="request.ts" language="ts" showLineNumbers highlightedLines={[2, 3]}>{source}</Code>
<Code collapsedLines={3} defaultCollapsed>{buildLog}</Code>
```

- `children` is a plain string copied verbatim. `Code` colours nothing: `language` only sets the `language-*` class, and colours arrive as `tokenizedLines`, one token array per line.
- `collapsed` hides lines visually past `collapsedLines` while assistive technology still reads them all, so the toggle is named by `labels`, not `aria-expanded`.

### Command

A search field over a list of commands, in the page or in a dialog.

```tsx
<Command
  aria-label="Commands"
  placeholder="Ask or run a command…"
  items={[{ type: 'group', label: 'Create', items: [
    { value: 'agent', label: 'Create an agent', keywords: ['assistant'] },
  ] }]}
  onSelect={({ value }) => run(value)}
/>
```

- `surface="auto"` is a dialog below 900px and the list in the page above it; an inline Command is always visible and ignores `open`.
- `keywords` widen what an item matches without being shown.
- `labels.empty` replaces the list when nothing matches.

### Date

A date, time, week, month or year field with a picker, and the form control behind it.

```tsx
<Date label="Launch time" mode="datetime" timezone="UTC" name="launch"
  onValueChange={({ value }) => setLaunch(value)} />

<Date label="Reporting period" selection="range" surface="sheet"
  presets={[{ id: 'q3', label: 'Q3 2026', value: { start: '2026-07-01', end: '2026-09-30' } }]} />
```

- `valueFormat` decides what callbacks receive — civil ISO strings (`iso`) or `Date` instants (`date`) — while form submission always sends civil ISO, a range as `start`/`end`.
- `timezone` resolves instants and "today"; `locale` only formats.
- `labels` names the picker's own controls; `label`, `description` and `placeholder` stay field props.

### Icon

One built-in glyph, always 20×20.

```tsx
<Button icon="search" iconOnly aria-label="Search" />
<Icon name="check" aria-label="Verified" />
```

- Without `aria-label` or `title` the icon is decorative and hidden from assistive technology.
- An unknown `name` renders the notdef glyph and reports it; an empty one renders nothing.
- Spacing belongs to the control that owns the icon — never add a margin here.

### Input

A native text field with a label, help, validation message, clear action and multiline sizing.

```tsx
<Input label="Work email" type="email" name="email" autoComplete="email" required
  description="Used for security alerts." placeholder="name@company.com" />

<Input label="System instruction" multiline autoGrow maxLength={4000}
  value={prompt} onValueChange={({ value }) => setPrompt(value)} />
```

- `multiline` renders a textarea, so `type` and the single-line constraints no longer apply.
- `clearable` shows the clear action only for a non-empty, editable field.
- `placeholder` is a hint, never the accessible name: keep `label` or `aria-label`.

### Markdown

A Markdown string rendered as sanitized HTML.

```tsx
<Markdown linkTarget="_blank">{article}</Markdown>
```

- The output is always sanitized. `html` only widens an allowlist of text and block tags; it is no escape hatch for trusted HTML.
- `linkTarget` and `linkRel` apply to absolute links; relative links, anchors and `mailto:` always open in place.
- A standalone code sample belongs in `Code`, which offers copy, line numbers and collapse.

### Media

An image, video or audio source in a box, with fallback content when it fails.

```tsx
<Media src="/shots/dashboard.webp" alt="Analytics dashboard" height={320} objectFit="contain"
  fallback={<Text variant="muted">Screenshot unavailable</Text>} />

<Media type="video" src="/tour.mp4" controls poster="/tour.webp" playsInline />
```

- `alt=""` marks an image decorative; any other text stands in for it.
- `width` and `height` size the box and win over `style`; `objectFit` then crops or letterboxes.
- Native attributes and `ref` reach the `<img>`, `<video>` or `<audio>`; `children` holds `<track>` elements.

### Menu

A list of actions opened from a trigger, or at the pointer as a context menu.

```tsx
<Menu
  aria-label="Account actions"
  items={[
    { value: 'docs', label: 'Documentation', href: '/docs' },
    { type: 'separator' },
    { value: 'logout', label: 'Sign out', tone: 'destructive' },
  ]}
  onSelect={({ value }) => run(value)}
>
  <Button fullWidth={false}>Account</Button>
</Menu>
```

- `children` is the trigger; without one nothing renders. A string becomes a `Button`.
- An item with `href` is a real link, so modifier clicks open it elsewhere; `checked` makes it a checkbox item.
- `openOn="context"` opens at the pointer and ignores `side`, `align` and `sideOffset`.

### Meter

A known measurement inside a bounded range, such as a quota.

```tsx
<Meter label="Storage used" value={82} tone="warning" showValue />
<Meter label="Context used" value={74} shape="circle" showValue />
```

- Use `Progress` for work being done and `Meter` for something being measured.
- `value` is bounded into `min..max`; `tone` is chosen by you and never follows the number.
- An unlabelled meter still needs `aria-label` or `aria-labelledby`.

### Modal

A dialog that takes over the page, centered or attached to an edge.

```tsx
<Modal title="Create project" description="Start from a blank workspace."
  trigger={<Button variant="accent" fullWidth={false}>New project</Button>}
  footer={<Button variant="accent" fullWidth={false} onClick={create}>Create</Button>}>
  <Text>Name, region and environment.</Text>
</Modal>

<Modal open={open} onOpenChange={({ open }) => setOpen(open)}
  placement="end" edge="flush" title="Customer details">…</Modal>
```

- `title` gives the dialog its accessible name; without one, name it with `aria-label`.
- `footer` buttons close nothing by themselves — close through `onOpenChange` or your own state.
- `closable={false}` removes the close button and blocks Escape and backdrop presses; `portal={false}` is a static preview that leaves focus, keys and the page alone.

### Navigation

The main links of a site or app in a bar, becoming a sheet on narrow screens.

```tsx
<Navigation
  aria-label="Main"
  value={section}
  onValueChange={({ value }) => setSection(value)}
  items={[
    { value: 'dashboard', label: 'Dashboard', href: '/' },
    { value: 'projects', label: 'Projects', items: [
      { value: 'active', label: 'Active', href: '/projects' },
    ] },
  ]}
/>
```

- An item with `items` is a dropdown button and its own `href` is ignored.
- `value` marks the current item `aria-current="page"`; an unknown value marks none.
- `surface="auto"` is a sheet below 900px, opened by `trigger` or a default icon button.

### Overlay

Compatibility adapter, exported only from `@userface/face-ui-react/compat`. Use `Tooltip` for a hint and `Popover` for interactive content.

### Pagination

Previous, next and numbered page buttons, plus a dialog for jumping to a page.

```tsx
<Pagination total={248} pageSize={20} page={page}
  onPageChange={({ page }) => setPage(page)} aria-label="Search results" />
```

- The number of pages comes from `total` and `pageSize`; there is no page-count prop, and a page past the last shows the last.
- `siblingCount` sets how many buttons flank the current page while the bar keeps its length near either end.
- Name the nav with `aria-label`; `labels` translates the buttons and the page picker.

### Panel

Side navigation: links in expandable groups, collapsing to a rail or a sheet.

```tsx
<Panel
  aria-label="Admin"
  value={page}
  onValueChange={({ value }) => setPage(value)}
  items={[
    { value: 'overview', label: 'Overview', icon: 'folder', href: '/overview' },
    { value: 'billing', label: 'Billing', icon: 'file', items: [
      { value: 'invoices', label: 'Invoices', href: '/invoices' },
    ] },
  ]}
/>
```

- An item with `items` is a group whose rows show while it is expanded; its own `href` is ignored.
- `width` and `collapsedWidth` own the width, so `style.width` is ignored; a sheet surface never collapses.
- `collapsible={false}` hides the rail toggle and leaves `collapsed` to the parent.

### Popover

A floating interactive surface anchored to a trigger; a click toggles it.

```tsx
<Popover content={<Text>Status is Active and owner is you.</Text>} side="bottom" align="start">
  <Button fullWidth={false}>Add filter</Button>
</Popover>
```

- Use `Tooltip` for a non-interactive hint: `Popover` has no hover delays and its content may hold controls.
- `children` is one real trigger element that forwards `ref` and props; a string renders as a `Button`.
- `side` is a preference and flips when the opposite side has more room; `align` and the content direction stay logical.

### Progress

Completion of a task, with a known or unknown amount of work.

```tsx
<Progress label="Uploading dataset" value={68} showValue />
<Progress label="Analyzing documents" value={null} />
```

- `value={null}` is an unknown amount: it is announced without a number and never shows one.
- Use `Meter` for a measurement such as storage — `Progress` is only for work in flight.
- `tone` is semantic and independent of the number.

### Radio

One choice among items that each need a visible row.

```tsx
<Radio
  label="Model quality"
  description="Higher quality answers take longer."
  name="model-quality"
  defaultValue="balanced"
  items={[
    { value: 'fast', label: 'Fast' },
    { value: 'balanced', label: 'Balanced' },
  ]}
/>
```

- Native group validation needs a non-empty `name`; give each independent group in a form its own.
- `value={null}`, or a value no item has, checks nothing.
- All four arrow keys move and select in either `orientation`; use `Select` when the list is long.

### Rating

A star scale for choosing a score, or for showing an average read-only.

```tsx
<Rating label="How helpful was this answer?" name="helpfulness" defaultValue={4}
  onValueChange={({ value }) => send(value)} />
<Rating label="4.2 average rating" value={4.2} readOnly />
```

- `readOnly` shows the exact fraction as a meter: not focusable, still submitted, and never blocked by `required`.
- An editable rating rounds `value` to the nearest choice; `allowHalf` adds a half-star choice before each star.
- `required` needs a non-empty `name` to have any effect.

### Scroll

A framed box whose content scrolls natively.

```tsx
<Scroll height={180} aria-label="Recent activity">
  <Text heightMode="content">…</Text>
</Scroll>
```

- The box is a named tab stop only while it can actually scroll, so give it `aria-label` when it holds long content.
- `orientation` picks the axes that scroll; overflow on the other axis is clipped.
- Without `height` the box is as tall as its content or as its layout makes it.

### SegmentedControl

A compact strip of two to five choices: one radio choice, or several pressed independently.

```tsx
<SegmentedControl aria-label="Dashboard view" defaultValue="table"
  items={[{ value: 'table', label: 'Table' }, { value: 'board', label: 'Board' }]}
  onValueChange={({ value }) => setView(value)} />

<SegmentedControl multiple aria-label="Channels" defaultValue={['email']} items={channels} />
```

- `multiple` makes the value a `string[]` instead of `string | null`, and submits one FormData entry per pressed choice.
- Without `multiple` all four arrow keys move between choices in either orientation.
- Use `Tabs` when the choice switches sibling panels, and `Radio` when each option needs its own row.

### Select

A trigger that opens a list to choose one value, or several with `multiple`.

```tsx
<Select label="Region" name="region" defaultValue="eu"
  items={[{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'United States' }]} />

<Select label="Teams" multiple value={teams} surface="sheet"
  onValueChange={({ value }) => setTeams(value)} items={allTeams} />
```

- `multiple` makes the value a `string[]`, keeps the list open while selecting, and submits one entry per selected item.
- It submits and resets like a native select: `name`, `form` and `required` work inside a `<form>`.
- `iconOnly` makes a square trigger without a chevron: put an icon in `displayValue` and name it with `aria-label`.

### Separator

A thin line between sections or between controls in a row.

```tsx
<Separator />
<Separator orientation="vertical" decorative={false} />
```

- It is decorative by default and hidden from assistive technology; `decorative={false}` exposes a real break between sections.
- `membrane` insets the line so its ends meet the visible edges of the neighbouring controls.
- Prefer spacing to show grouping; reach for a line only when spacing cannot.

### Skeleton

A pulsing placeholder in the shape of the content being loaded.

```tsx
<Skeleton shape="circle" width={40} />
<Skeleton shape="rect" height={160} />
```

- It is hidden from assistive technology: mark the loading region itself with `aria-busy`.
- `text` and `rect` fill their column by default: give a `width` inside a container sized by its content.
- A circle given only one dimension uses it for both.

### Slider

A number, or several ordered numbers, chosen on a scale.

```tsx
<Slider label="Creativity" name="creativity" defaultValue={62} max={100} showValue
  onValueCommit={({ value }) => save(value)} />

<Slider label="Monthly price" defaultValue={[40, 180]} max={250} step={10}
  labels={{ thumbs: ['Minimum price', 'Maximum price'] }} />
```

- The shape you pass is the shape you get back: a number gives one thumb, an array one thumb per entry and a fresh sorted array.
- `onValueChange` fires while dragging and `onValueCommit` once at the end of the gesture.
- `crop` adds two independently edited boundaries on a second rail, with their own `cropRange` triple and `cropName`.

### Steps

Ordered wizard navigation with a persistent panel per step.

```tsx
<Steps
  step={step}
  onStepChange={({ step }) => setStep(step)}
  items={[
    { label: 'Workspace', content: <Text>Choose a name and region.</Text> },
    { label: 'Team', content: <Text>Invite collaborators.</Text> },
  ]}
/>
```

- `linear` allows only the current, an earlier or the next step; it validates no forms, so gate the move yourself.
- Panels stay mounted, so the fields in an earlier step keep their state.
- A `step` past the last one shows the last; give items a `key` when the list reorders.

### Switcher

A binary setting that takes effect as soon as it is switched.

```tsx
<Switcher label="Auto save" defaultChecked name="auto-save" />
<Switcher label="Product analytics" checked={consent}
  onCheckedChange={({ checked }) => setConsent(checked)} />
```

- Use `Checkbox` inside a form that is submitted, and `Switcher` for a setting applied at once.
- `value` is the string submitted while on; it never controls the setting.
- The label wraps by default; `truncate` cuts it to one line instead.

### Table

A data table with sortable columns, row selection, row actions and sticky, resizable columns.

```tsx
<Table
  aria-label="Workspace members"
  rowKey="id"
  selectable
  columns={[
    { id: 'name', header: 'Member', sortable: true, truncate: true },
    { id: 'seats', header: 'Seats', align: 'end', render: ({ value }) => <Badge>{String(value)}</Badge> },
  ]}
  rows={members}
  onSortChange={({ sort }) => setSort(sort)}
/>
```

- Every column needs a unique `id`; it reads `row[id]` unless `accessor` says otherwise, and only a `sortable` column gets a header button.
- A cell value that is not text or a number needs `render` — a date or a boolean shows nothing without it.
- `rowKey` keys selection and identity; a row whose key is not text falls back to its position.

### Tabs

Tabs that switch sibling panels.

```tsx
<Tabs
  aria-label="Analytics views"
  defaultValue="overview"
  variant="underline"
  items={[
    { value: 'overview', label: 'Overview', content: <Text>Key metrics.</Text> },
    { value: 'funnels', label: 'Funnels', content: <Text>Conversion.</Text> },
  ]}
/>
```

- `renderPanels={false}` hands the panels to you, and every item then needs its own `panelId`.
- `activationMode="manual"` waits for a click, Space or Enter instead of selecting the tab an arrow key reaches.
- Use `SegmentedControl` when the choice is a value rather than a panel; `actions` holds header controls outside the tablist.

### Text

Every piece of visible copy. `variant` chooses the presentation and `as` the element.

```tsx
<Text variant="h2">Revenue overview</Text>
<Text variant="muted" size="sm" as="small">Updated 2 minutes ago.</Text>
<Text as="p" heightMode="content" inset="none" membrane={false}>Long-form paragraph.</Text>
```

- Keep heading order when `variant` and `as` differ, and use `htmlFor` when the element resolves to a `<label>`.
- Defaults align text with controls; editorial copy needs `heightMode="content" inset="none"` so it is sized by its line boxes.
- `variant="markdown"` only supplies paragraph rhythm — parsing a Markdown string is `Markdown`.

### Tile

A composed row: label, icon, meta and nested actions, with an optional primary action.

```tsx
<Tile icon="folder" meta="Healthy" tone="positive" active onClick={open}>Production API</Tile>

<Tile icon="folder" chevron="down" aria-expanded={open} onClick={toggle}
  actions={<Button icon="more" iconOnly aria-label="More" fullWidth={false} />}>
  Customer success
</Tile>
```

- The primary action is inferred from `onClick`, `aria-expanded` or an explicit button role; `interactive={false}` makes a structural row.
- Controls inside `actions` and `leading` keep their own clicks and disabled state — a press there never reaches the row.
- `chevron` orients itself from `aria-expanded`; `actionVisibility` decides when the actions appear.

### Toast

A transient notification. `Toaster` shows, times and stacks them; `useToast()` raises them.

```tsx
<Toaster placement="bottom-center" />

const { toast, dismiss } = useToast()
toast({ title: 'Workspace saved', tone: 'positive', action: { label: 'View changes', onClick: open } })
```

- Mount one `Toaster`; `createToastContext()` gives an independent store when a surface needs its own.
- `toast()` returns an id, and passing the same `id` again updates that toast in place instead of stacking another.
- `duration: 0` keeps a toast until it is closed; hover and focus pause the timers.

### Toc

A table of contents: native links to the sections of the current document.

```tsx
<Toc
  value={current}
  onValueChange={({ value }) => setCurrent(value)}
  items={[
    { value: 'overview', label: 'Overview', level: 1 },
    { value: 'api-keys', label: 'API keys', level: 2 },
  ]}
/>
```

- Each entry is a link to `#value`, so the browser scrolls, sets the hash and honours a middle click; `onSelect` sees that event.
- `level` nests an entry under the previous entry of a smaller level.
- `value` marks the current entry `aria-current="location"`; `line` moves or removes the rail.

### Toggle

Compatibility adapter, exported only from `@userface/face-ui-react/compat`. Use `SegmentedControl`, whose `multiple` replaces `type="multiple"`.

### Tooltip

A non-interactive hint shown on hover and keyboard focus.

```tsx
<Tooltip content="Search workspace — Cmd K">
  <Button icon="search" iconOnly aria-label="Search" />
</Tooltip>
```

- The content must stay non-interactive: anything with a control belongs in `Popover`.
- A tooltip is not an accessible name — an icon-only trigger still needs its own `aria-label`.
- `openDelay` and `closeDelay` are milliseconds; `side` flips when the opposite side has more room.

### Tree

Nested items that expand and collapse, with one item selected.

```tsx
<Tree
  aria-label="Repository files"
  variant="lines"
  defaultExpanded={['src']}
  value={selected}
  onValueChange={({ value }) => setSelected(value)}
  items={[{ value: 'src', label: 'src', icon: 'folder', items: [
    { value: 'app', label: 'App.tsx', icon: 'file', meta: 'M' },
  ] }]}
/>
```

- An item with `items` is a branch; values must be unique across the whole tree, and a repeat is dropped.
- A `disabled` item takes everything nested in it out of selection, expansion and focus.
- Use `Panel` for product navigation, `Accordion` for a flat set of sections.

### Upload

A field that collects files picked from the system or dropped onto it, and lists them.

```tsx
<Upload label="Product images" description="PNG or JPEG, up to 5 MB each."
  accept="image/png,image/jpeg" multiple maxSize={5_242_880} maxFiles={8} name="images"
  onFilesChange={({ files }) => setFiles(files)}
  onReject={({ files }) => report(files)} />
```

- It collects files; it never uploads them. Submit them with the form or send them yourself, and show progress through each file's `progress`.
- `accept`, `maxSize` and `maxFiles` are UX, not validation: check them again on the server.
- Without `multiple` a new file replaces the one already listed.
