# Face UI React — Agent Operating Manual

> **This document is part of the FaceUI Design Operating System.**
> - **Principles** — this file (constitution + reference)
> - **Component Contracts** — `<Component>/<Component>.json` (machine-readable API per component)
> - **Patterns** — owned by Userface Engine and generated from the same component contracts
> - **Assembly Policy** — owned by Userface Engine quality rules
> - **Orchestrator** — external tooling can read this package through the published contracts

This is the canonical usage guide for agents and developers building interfaces with Face UI React.
It is not marketing copy. It is the source of truth for component selection, composition rules, spacing, typography, and architectural decisions.

---

## 1. Source Of Truth

- Primary public API: `index.ts`
- Governance metadata: `component-registry.json`
- Per-component contracts: `<Component>/<Component>.json`

Import only from the primary barrel or canonical component paths.
Do not introduce new usage of deprecated aliases.
Do not invent new component names if an existing canonical component already covers the case.

---

## 2. Fundamental Rules

### 2.1 Text Rendering — The Single Most Important Rule

**ALL visible text on any page MUST be rendered through the `<Text>` component.**

This is non-negotiable. There are no exceptions except controls that own their own text internally (Button, Input, Select, etc.).

What this means:
- Every heading → `<Text variant="h1">`, `<Text variant="h2">`, etc.
- Every paragraph → `<Text>` or `<Text variant="body">`
- Every label → `<Text variant="label">`
- Every caption → `<Text variant="caption">`
- Every muted helper text → `<Text variant="muted">`
- Every inline code → `<Text variant="code">`
- Every keyboard shortcut → `<Text variant="kbd">`

What is NOT allowed:
- `<span>text</span>` — NEVER. Use `<Text as="span">`.
- `<p>text</p>` — NEVER. Use `<Text as="p">`.
- `<h1>text</h1>` — NEVER. Use `<Text variant="h1">`.
- `<div>text</div>` — NEVER. Use `<Text as="div">`.
- `<label>text</label>` — NEVER. Use `<Text variant="label">`.
- Bare text nodes inside layout containers — NEVER. Wrap in `<Text>`.

Components that own their text internally and do NOT need `<Text>` wrapping:
- `Button` (text prop)
- `Input` (label, description, error, placeholder)
- `Select` (label, options)
- `Checkbox` (label)
- `Radio` (option labels)
- `Switcher` (label)
- `Tabs` (tab labels — string labels are auto-wrapped internally)
- `Accordion` (item labels — auto-wrapped internally)
- `Breadcrumb` (item labels)
- `Steps` (item labels — auto-wrapped internally)
- `Modal` (title, description)
- `Menu` (item labels)
- `Command` (item labels)
- `Code` (title)
- `DatePicker` (label, description, error)

For all other text content — headings, descriptions, paragraphs, metadata, status text, section titles, card content text — use `<Text>`.

### 2.2 Text Variants — Full Typography System

`Text` provides a complete typography system matching Markdown heading hierarchy:

| Variant | Default element | Size | Weight | Use case |
|---------|----------------|------|--------|----------|
| `h1` | `h1` | +10px (24px) | 600 | Page title, hero heading |
| `h2` | `h2` | +8px (22px) | 600 | Section heading |
| `h3` | `h3` | +6px (20px) | 600 | Subsection heading |
| `h4` | `h4` | +4px (18px) | 600 | Card heading, group title |
| `h5` | `h5` | +2px (16px) | 600 | Small heading |
| `h6` | `h6` | base (14px) | 600 | Micro heading (0.8 opacity) |
| `heading` | `h2` | bold | 600 | Generic heading (legacy, prefer h1–h6) |
| `body` / `default` | `div` / `p` | base | 400 | Body text, paragraphs |
| `muted` | `p` | base | 400 | Secondary/helper text (reduced opacity) |
| `label` | `label` | base | 400 | Form labels, section labels |
| `caption` | `small` | small | 400 | Fine print, timestamps, metadata |
| `kbd` | `kbd` | mono | 400 | Keyboard shortcuts |
| `code` | `code` | mono | 400 | Inline code |
| `blockquote` | `div` | base | 400 | Quoted/highlighted text block |

**Size modifiers** (apply on top of variant):
- `xs` (12px), `sm` (13px), `md` (16px), `lg` (18px), `xl` (20px)

**Element override** with `as` prop:
- Any variant can render as any HTML element: `<Text variant="h1" as="div">` renders h1 styling on a `<div>`.

**Usage examples:**

```tsx
// Page title
<Text variant="h1">Dashboard</Text>

// Section heading
<Text variant="h2">Recent activity</Text>

// Card-level heading
<Text variant="h4">Revenue breakdown</Text>

// Body paragraph
<Text>Your workspace has 12 active members.</Text>

// Helper/secondary text
<Text variant="muted">Last updated 3 minutes ago.</Text>

// Label for a form group
<Text variant="label" htmlFor="email">Email address</Text>

// Caption / metadata
<Text variant="caption">Created on 2026-03-15 by @grenev</Text>

// Keyboard shortcut
<Text variant="kbd">⌘K</Text>

// Inline code
<Text variant="code">npx userface connect</Text>

// Blockquote
<Text variant="blockquote">Structure powers intelligence.</Text>

// Landing page — flush text (no control padding, no membrane)
<Text variant="h1" inset="none" membrane={false} className={styles.heroTitle}>
  Make AI build with your real UI.
</Text>

// Size override — small heading with large size
<Text variant="h5" size="lg">Section title</Text>

// Element override — heading style on a span (inline context)
<Text variant="h3" as="span">Inline heading</Text>
```

**Two modes of use:**

| Context | `inset` | `membrane` | Result |
|---------|---------|------------|--------|
| App UI (controls, panels, sidebars) | `"control"` (default) | `true` (default) | Padded to match button/input rhythm |
| Landing / marketing / content | `"none"` | `false` | Flush text, no extra spacing |
| Inside other components (Tile, Accordion) | `"none"` | `false` | No double-padding |

### 2.3 Spacing Between Elements

The library uses a 4px grid. Follow these spacing guidelines:

**Between text blocks:**
- Heading → body text: 8px (margin-bottom on heading)
- Paragraph → paragraph: 12px
- Section → section: 24px–32px

**Between text and controls:**
- Label → control: 0px (label component has built-in spacing via membrane)
- Text block → button row: 16px
- Description → action: 12px

**Between controls:**
- Control → control (same group): use membrane rhythm (1px × 2 = 2px gap)
- Control groups: 8px–12px
- Action buttons side by side: membrane-driven gap

**General rules:**
- Do NOT add manual margins between membrane-wrapped components. The membrane system handles spacing.
- Use `var(--uf-space-*)` tokens for custom gaps: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- Prefer `gap` on flex/grid containers over individual margins.

### 2.4 Membranes

Membranes are the 1px outer spacing contract used by the library.

- Control spacing comes from membranes and control insets, not random external gaps.
- If two interactive controls sit next to each other, prefer membrane-driven rhythm over ad hoc margins.
- If you intentionally use a single shared membrane wrapper, inner controls may have `membrane={false}`. That is allowed when done deliberately to avoid double membranes.

### 2.5 Icon Spacing

- Icon placement is owned by the control, not by `Icon`.
- Do not use negative margins on `Icon`.
- If an icon sits at the control edge, it should use the icon-side inset contract so that side/top/bottom spacing feel equal.

### 2.6 Responsive Overlays

These components have first-class responsive surface behavior:
`Select`, `DatePicker`, `Menu`, `Command`, `Modal`, `Drawer`, `Panel`, `Navigation`.

Default rule:
- Desktop/wide viewport: keep contextual surface behavior.
- Compact viewport: move to sheet/dialog/drawer behavior when that is the canonical mobile pattern.
- Use the default `surface="auto"` unless you have a strong reason to force a specific surface.

### 2.7 Canonical Naming

Use these names in new code:
- `Panel`, not `Sidebar`
- `SegmentedControl`, not `Toggle`
- `Drawer`, not `Sheet`
- `DatePicker`, not `Date`
- `Tooltip` or `Popover`, not `Overlay`

### 2.8 Protocol of Use — How an Agent Should Work

When building UI:
1. **Understand intent** — what screen/section is being built?
2. **Choose a pattern** — select a composition pattern that matches the intent (form, dashboard, settings, etc.)
3. **Pick components by contract** — use Component Contracts (face.json) as the source of truth for props, types, defaults
4. **Apply assembly policy** — validate the result against quality rules: structural, a11y, contract compliance
5. **Iterate** — fix violations, re-validate until score ≥ 90

When modifying existing UI:
1. Read the relevant Component Contract
2. Check current violations with `component_validate`
3. Make changes within contract boundaries
4. Re-validate

---

<!-- SEPARATOR:CONSTITUTION_END -->
## ⚡ Constitution ends here. Below is the reference section.
## Agents: read the constitution always. Consult reference on demand.
<!-- /SEPARATOR -->

---

## 3. Component Selection Decision Matrix

Before composing UI, use this matrix to choose the right component.

### Text & Structure

| Need | Component | NOT this |
|------|-----------|----------|
| Any visible text | `Text` | bare `<span>`, `<p>`, `<div>` |
| Rich text from markdown source | `Markdown` | manual HTML |
| Code snippet | `Code` | `<pre><code>` |
| Grouped content block | `Card` | raw `<div>` wrapper |
| Visual divider | `Separator` (sparingly!) | `<hr>`, border hacks |
| Toolbar / action row | `Bar` | flex wrapper |
| Status indicator | `Badge` | colored `<span>` |

### Actions & Controls

| Need | Component | NOT this |
|------|-----------|----------|
| Explicit action | `Button` | `<button>`, clickable `<div>` |
| Boolean toggle | `Checkbox` or `Switcher` | |
| One from small set | `Radio` | |
| Mode switch strip | `SegmentedControl` | `Toggle` (deprecated) |
| Option picker | `Select` | |
| Text input | `Input` | `<input>` |
| Numeric range | `Slider` | |
| Star rating | `Rating` | |
| File input | `Upload` | `<input type="file">` |

### Navigation

| Need | Component | NOT this |
|------|-----------|----------|
| Sibling view switching | `Tabs` | |
| Expand/collapse sections | `Accordion` | |
| Location hierarchy | `Breadcrumb` | |
| Page stepping | `Pagination` | |
| Workflow progress | `Steps` | |
| App/site navigation | `Navigation` | |
| Persistent side panel | `Panel` | `Sidebar` (deprecated) |
| Hierarchical tree | `Tree` | |
| Document section nav | `Toc` | `Tree` misuse |

### Overlays

| Need | Component | NOT this |
|------|-----------|----------|
| Non-interactive hint | `Tooltip` | `Overlay` (deprecated) |
| Small interactive popup | `Popover` | |
| Action menu | `Menu` | |
| Focused dialog | `Modal` | |
| Edge slide-in panel | `Drawer` | `Sheet` (deprecated) |
| Search/command palette | `Command` | |
| Notifications | `Toaster` + `useToast()` | alert() |

### Data & Content

| Need | Component |
|------|-----------|
| Tabular data | `Table` |
| Progress bar | `Progress` |
| Loading placeholder | `Skeleton` |
| User avatar | `Avatar` |
| Image/video/audio | `Media` |
| Carousel | `Carousel` |
| Scrollable area | `Scroll` |
| Date grid | `Calendar` |
| Date input + picker | `DatePicker` |

---

## 4. Component Reference

### 4.1 Text

**Purpose:** The universal typography primitive. ALL visible text goes through this component.

**When to use:** Always, for any text that is not internally owned by a control component.

**When NOT to use:** Inside components that already handle their own text rendering (Button text prop, Input label, etc.).

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | — | Text content |
| `variant` | TextVariant | `'default'` | Typography style (see §2.2) |
| `size` | `'xs'\|'sm'\|'md'\|'lg'\|'xl'` | — | Size override |
| `as` | TextElement | auto | HTML element override |
| `icon` | ReactNode \| string | — | Optional icon |
| `iconPosition` | `'left'\|'right'` | `'left'` | Icon placement |
| `inset` | `'control'\|'none'` | `'control'` | Padding mode |
| `stretchText` | boolean | `false` | Flex-stretch text area |
| `fullWidth` | boolean | `false` | Full width |
| `align` | `'left'\|'center'\|'right'` | `'left'` | Text alignment |
| `membrane` | boolean | `true` | Outer membrane spacing |
| `children` | ReactNode | — | Custom content (overrides `text`) |
| `htmlFor` | string | — | Label association (for `variant="label"`) |

**Inset modes:**
- `inset="control"` (default) — adds control-height padding so text aligns with buttons, inputs, and other controls. Use in app UI.
- `inset="none"` — flush text with zero padding. Use on marketing pages, landing pages, or when text sits inside a component that manages its own padding.

**Examples:**
```tsx
// Page heading
<Text variant="h1">Dashboard</Text>

// Section heading
<Text variant="h2">Settings</Text>

// Body paragraph
<Text>Component contracts give agents real prop data.</Text>

// Muted description
<Text variant="muted">Last updated 2 hours ago.</Text>

// Label for a form field
<Text variant="label" htmlFor="name">Full name</Text>

// Caption / fine print
<Text variant="caption">* Required fields</Text>

// Landing page (no control padding)
<Text variant="h1" inset="none" membrane={false}>Hero Title</Text>
```

**Agent rules:**
- Default to `variant="body"` or `variant="default"` for regular text.
- Use specific heading variants (`h1`–`h6`) instead of generic `heading` when document structure matters.
- Do NOT center text unless the design explicitly requires it.
- When `Text` sits inside `Accordion`, `Card`, `Tabs` content, or any container — still use `<Text>`, not bare strings.

---

### 4.2 Separator

**Purpose:** Thin visual divider line between sections.

**DEFAULT BEHAVIOR: Do not use.** Separator should be added only in rare cases where an explicit visual boundary is genuinely needed and spacing alone is insufficient. Prefer whitespace and layout rhythm first.

**When to use (rare):**
- Between visually distinct content sections inside a panel or card where spacing alone does not communicate the boundary.
- Between groups in a settings form only if explicitly requested by the designer.
- Never between every item in a list. Never between a heading and its content.

**When NOT to use:**
- Between consecutive form fields (membrane spacing handles this).
- Between heading and body text (spacing handles this).
- Between cards or sections (visual boundary is already clear).
- As a default "just in case" divider.
- Without explicit instruction from the person designing the interface.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal'\|'vertical'` | `'horizontal'` | Divider direction |
| `decorative` | boolean | `true` | If true, hidden from a11y tree |
| `membrane` | boolean | `true` | Outer membrane spacing |

---

### 4.3 Button

**Purpose:** Explicit user action.

**When to use:** User is invoking an action, or a row-like option behaves as a button.

**When NOT to use:**
- Pure text display → use `Text`
- Binary state toggle → use `Switcher`
- Selection among peers → use `SegmentedControl`, `Radio`, `Tabs`, or `Menu`
- Navigation link → use `<Link>` or `Navigation`

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | — | Primary label |
| `rightText` | string | — | Secondary right-aligned text |
| `variant` | `'default'\|'primary'\|'secondary'\|'accent'\|'outline'\|'ghost'\|'destructive'\|'suggestion'` | `'default'` | Visual style |
| `icon` | ReactNode \| string | — | Icon |
| `iconPosition` | `'left'\|'right'` | `'left'` | Icon placement |
| `iconOnly` | boolean | `false` | Square icon-only button |
| `disabled` | boolean | `false` | Disabled state |
| `loading` | boolean | `false` | Loading state |
| `stretchText` | boolean | `false` | Flex-stretch text |
| `fullWidth` | boolean | `false` | Full width |
| `align` | `'left'\|'center'\|'right'` | `'center'` | Text alignment |
| `level` | number (0–9) | — | Nesting indent level |
| `membrane` | boolean | `true` | Outer membrane |
| `copyText` | string | — | Copies text on click |
| `onCopied` | function | — | Copy success callback |

**Variant guide:**
- `default` — neutral secondary action
- `accent` — primary CTA (one per view ideally)
- `ghost` — minimal, text-like button
- `destructive` — dangerous/irreversible actions
- `outline` — bordered secondary style
- `suggestion` — soft prompt/suggestion

**Agent rules:**
- Use `Button` for close/copy/more triggers instead of raw `<button>`.
- Prefer `iconOnly` for compact utility actions.
- At most one `accent` button per visible group of actions.

---

### 4.4 Badge

**Purpose:** Small status/tone indicator label.

**When to use:** Marking state, status, category, or count-like metadata.

**When NOT to use:**
- As a substitute for `Text` in headings or body copy.
- As interactive elements (badges are not clickable).
- For long text content.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | — | Badge label |
| `variant` | `'default'\|'primary'\|'secondary'\|'accent'\|'destructive'` | `'default'` | Tone |
| `appearance` | `'fill'\|'outline'` | `'fill'` | Visual style |
| `children` | ReactNode | — | Custom content |

---

### 4.5 Icon

**Purpose:** Universal icon renderer from the shared icon registry.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | — | Icon name from registry |
| `icon` | any | — | Universal icon input (name/component/node/url) |
| `src` | string | — | External source URL |
| `size` | number | — | Icon box size |
| `square` | boolean | — | Keep square box |
| `label` | string | — | Accessible label (omit for decorative) |

**Agent rules:**
- `Icon` is NOT a spacing component. Do not solve layout with icon margins.

---

### 4.6 Card

**Purpose:** Generic grouped content block.

**When to use:** Grouping related content visually — settings section, stat card, feature card.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | — | Card title |
| `description` | string | — | Supporting description |
| `content` | string | — | Main content string |
| `footer` | string | — | Footer string |
| `membrane` | boolean | `true` | Outer membrane |
| `children` | ReactNode | — | Custom content |

**Agent rules:**
- Prefer `children` for real layouts. String props (`title`, `description`) are for simple showcase use.
- Text inside Card children must use `<Text>`, not bare strings.

---

### 4.7 Input

**Purpose:** Text-like field input.

**When to use:** Free-form typing is required.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | — | Controlled value |
| `defaultValue` | string | — | Uncontrolled initial value |
| `type` | `'text'\|'email'\|'number'\|'date'\|'password'` | `'text'` | Field mode |
| `textLayout` | `'scroll'\|'wrap'` | `'scroll'` | Text overflow behavior |
| `disabled` | boolean | `false` | Disabled |
| `readOnly` | boolean | `false` | Read-only |
| `label` | string | — | Field label |
| `description` | string | — | Helper text |
| `error` | string | — | Error message |
| `labelOrientation` | `'vertical'\|'horizontal'` | `'vertical'` | Label position |
| `placeholder` | string | — | Placeholder |
| `icon` | ReactNode | — | Edge icon |
| `iconPosition` | `'left'\|'right'` | — | Icon placement |
| `required` | boolean | `false` | Required state |
| `autoFocus` | boolean | `false` | Auto-focus |
| `onValueChange` | function | — | Canonical value callback |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.8 Checkbox

**Purpose:** Boolean or indeterminate selection.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean\|'indeterminate'` | — | Controlled state |
| `defaultChecked` | boolean | — | Initial state |
| `disabled` | boolean | `false` | Disabled |
| `required` | boolean | `false` | Required |
| `name` | string | — | Form name |
| `label` | string | — | Visible label |
| `onCheckedChange` | function | — | State callback |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.9 Radio

**Purpose:** Single selection from a small explicit set.

**When to use:** 2–5 mutually exclusive options that should all be visible at once.

**When NOT to use:** More than 5 options → use `Select`. Binary toggle → use `Switcher`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `{value, label, disabled?}[]` | — | Radio options |
| `value` | string | — | Controlled selected value |
| `defaultValue` | string | — | Initial value |
| `orientation` | `'horizontal'\|'vertical'` | `'vertical'` | Layout |
| `onValueChange` | function | — | Change callback |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.10 Switcher

**Purpose:** Binary on/off switch.

**When to use:** Immediate toggle between two states (enabled/disabled, on/off).

**When NOT to use:** Choosing between labeled options → use `SegmentedControl` or `Radio`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | boolean | — | Controlled state |
| `defaultChecked` | boolean | — | Initial state |
| `disabled` | boolean | `false` | Disabled |
| `label` | string | — | Visible label |
| `text` | string | — | Inline text |
| `withText` | boolean | — | Show text next to switch |
| `textWrap` | `'truncate'\|'wrap'` | `'truncate'` | Text overflow |
| `onCheckedChange` | function | — | State callback |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.11 SegmentedControl

**Purpose:** Compact segment-based mode selector. Canonical replacement for deprecated `Toggle`.

**When to use:** 2–4 mutually exclusive views/modes in a compact strip.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | segment items | — | Segment items |
| `value` | string[] | — | Controlled selected values |
| `defaultValue` | string[] | — | Initial values |
| `selectionMode` | `'single'\|'multiple'` | `'single'` | Selection mode |
| `orientation` | orientation | — | Layout |
| `onValueChange` | function | — | Change callback |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.12 Select

**Purpose:** Option picker without free typing.

**When to use:** Choosing from a known set without needing text entry.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `{value, label, disabled?}[]` | — | Options |
| `value` | string[] | — | Controlled value |
| `defaultValue` | string[] | — | Initial value |
| `placeholder` | string | — | Placeholder |
| `type` | `'select'\|'multiselect'` | `'select'` | Mode |
| `label` | string | — | Label |
| `surface` | `'auto'\|'popover'\|'sheet'` | `'auto'` | Surface mode |
| `surfaceBreakpoint` | number | 900 | Responsive breakpoint |
| `onValueChange` | function | — | Value callback |
| `membrane` | boolean | `true` | Outer membrane |

**Agent rules:** Default to `surface="auto"`. On mobile, this becomes a sheet.

---

### 4.13 Slider

**Purpose:** Continuous or ranged numeric selection. **Status: beta.**

**When to use:** Dragging is more natural than discrete option picking.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'simple'\|'advanced'` | `'simple'` | Mode |
| `value` | number[] | — | Thumb values |
| `min` | number | 0 | Minimum |
| `max` | number | 100 | Maximum |
| `step` | number | 1 | Step |
| `label` | string | — | Label |
| `onValueChange` | function | — | Value callback |

---

### 4.14 Rating

**Purpose:** Rating input or display. **Status: beta.**

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | number | — | Rating value |
| `max` | number | 5 | Max stars |
| `allowHalf` | boolean | `false` | Half-step support |
| `label` | string | — | Label |
| `onValueChange` | function | — | Change callback |

---

### 4.15 Calendar

**Purpose:** Standalone date grid (always visible, no trigger).

**When to use:** Calendar is permanently visible in the layout.
**When NOT to use:** Need trigger + overlay → use `DatePicker`.

---

### 4.16 DatePicker

**Purpose:** Canonical date selection component. Replaces deprecated `Date`.

**When to use:** UI needs a trigger/control plus calendar/time selection.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'date'\|'datetime'` | `'date'` | Mode |
| `value` | string | — | Controlled value |
| `label` | string | — | Label |
| `format` | string | — | Display format |
| `min` / `max` | string | — | Date bounds |
| `surface` | `'auto'\|'popover'\|'sheet'` | `'auto'` | Surface mode |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.17 Tabs

**Purpose:** Switch between sibling views or panels.

**When to use:** Content has 2–7 parallel views/sections.
**When NOT to use:** Binary mode switch → `SegmentedControl`. Deep navigation → `Navigation` or `Panel`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `{value, label, content, disabled?}[]` | — | Tab items |
| `value` | string | — | Controlled active tab |
| `defaultValue` | string | — | Initial tab |
| `orientation` | `'horizontal'\|'vertical'` | `'horizontal'` | Layout |
| `withLine` | boolean | `false` | Active indicator line |
| `wrap` | boolean | `false` | Allow tab wrapping |
| `membrane` | boolean | `true` | Outer membrane |
| `onValueChange` | function | — | Tab change callback |

**Agent rules:**
- String `label` values are automatically wrapped in `<Text>` internally.
- ReactNode labels should use `<Text>` explicitly.
- Prefer horizontal overflow scrolling rather than forcing many tabs into too little width.

---

### 4.18 Accordion

**Purpose:** Expand/collapse stacked sections.

**When to use:** FAQ, collapsible settings groups, show/hide detail.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `{value, label, content, disabled?}[]` | — | Items |
| `expandedIds` | string[] | — | Controlled expanded IDs |
| `defaultExpandedIds` | string[] | — | Initial expanded IDs |
| `multiple` | boolean | `false` | Allow multiple open |
| `collapsible` | boolean | `false` | Allow closing all |
| `onExpandedChange` | function | — | Expanded callback |

**Agent rules:**
- Labels are rendered through `<Text>` internally.
- Content passed as `content` prop: if it's a string, it's auto-wrapped in `<Text>`. If it's a ReactNode, it is rendered as-is — the caller must use `<Text>` inside.
- Example of correct content:
```tsx
content: <Text variant="muted">Detailed explanation here.</Text>
```

---

### 4.19 Modal

**Purpose:** Canonical dialog-like overlay. Focused task, confirmation, review, or edit.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | boolean | — | Controlled open state |
| `variant` | `'center'\|'left'\|'right'\|'top'\|'bottom'` | `'center'` | Position |
| `closeOnOverlayClick` | boolean | `true` | Close on backdrop click |
| `closable` | boolean | `true` | Show close button |
| `title` | string | — | Title |
| `description` | string | — | Description |
| `children` | ReactNode | — | Body content |
| `actions` | `{label, variant?, disabled?}[]` | — | Action buttons |
| `trigger` | ReactNode | — | Trigger content |
| `width` / `height` | string | — | Size |
| `surface` | surface mode | — | Responsive surface |
| `onOpenChange` | function | — | Open state callback |

**Agent rules:**
- Use `Modal` for centered dialog semantics. Use `Drawer` when directionality matters.

---

### 4.20 Drawer

**Purpose:** Directional edge surface. Canonical replacement for deprecated `Sheet`.

**Props:** Same as `Modal` plus:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `side` | `'left'\|'right'\|'top'\|'bottom'` | `'right'` | Slide direction |

---

### 4.21 Tooltip

**Purpose:** Short, non-interactive contextual explanation.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | ReactNode | — | Floating content |
| `children` | ReactNode | — | Trigger |
| `side` | side | — | Preferred side |
| `align` | alignment | — | Alignment |
| `openDelay` / `closeDelay` | number | — | Timing |

**Agent rules:** Keep content short. If content becomes interactive → use `Popover`.

---

### 4.22 Popover

**Purpose:** Small contextual interactive surface.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `interactive` | boolean | — | Interactive content |
| `content` | ReactNode | — | Popover content |
| `children` | ReactNode | — | Trigger |
| `side` | side | — | Preferred side |

---

### 4.23 Menu

**Purpose:** Action list surface.

**When to use:** User is choosing an action, not entering text.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trigger` | `'click'\|'context'` | `'click'` | Trigger mode |
| `items` | menu items | — | Action items |
| `children` | ReactNode | — | Trigger content |
| `onSelect` | function | — | Selection callback |
| `surface` | surface mode | `'auto'` | Surface mode |

---

### 4.24 Command

**Purpose:** Searchable command/action palette.

**When to use:** Fuzzy search or command selection with many options.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | command items | — | Flat items |
| `groups` | command groups | — | Grouped sections |
| `placeholder` | string | — | Search placeholder |
| `onSelect` | function | — | Selection callback |
| `surface` | `'auto'\|'inline'\|'dialog'` | `'auto'` | Surface mode |

---

### 4.25 Toaster / Toast

**Purpose:** Transient notification system.

**Usage:** Place one `<Toaster>` at app root. Push notifications via `useToast()`.

**Props (Toaster):**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placement` | placement | — | Toast position |
| `maxVisible` | number | — | Max visible toasts |
| `duration` | number | — | Default duration |

---

### 4.26 Breadcrumb

**Purpose:** Hierarchy trail for current location.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | breadcrumb items | — | Trail items |
| `separator` | ReactNode | — | Separator display |
| `allowNavigation` | boolean | — | Interactive items |
| `collapseAfter` | number | — | Collapse threshold |

---

### 4.27 Pagination

**Purpose:** Page stepping for paged data.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | number | — | Current page |
| `total` | number | — | Total items |
| `pageSize` | number | — | Items per page |
| `onPageChange` | function | — | Page callback |

---

### 4.28 Steps

**Purpose:** Workflow progress / step navigator.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `{label}[]` | — | Step items |
| `step` | number | — | Current step |
| `linear` | boolean | `false` | Enforce linear flow |
| `onStepChange` | function | — | Step callback |

---

### 4.29 Navigation

**Purpose:** App/site navigation bar.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | nav items | — | Navigation items |
| `activeId` | string | — | Active item |
| `orientation` | `'horizontal'\|'vertical'` | — | Layout |
| `surface` | surface mode | `'auto'` | Surface mode |

---

### 4.30 Panel

**Purpose:** Collapsible panel navigation with nested groups. Canonical replacement for `Sidebar`.

**When to use:** Persistent or responsive side/drawer navigation surface.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | panel items | — | Navigation items |
| `collapsed` | boolean | — | Collapsed state |
| `selectedId` | string | — | Selected item |
| `width` | string | — | Expanded width |
| `collapsedWidth` | string | — | Collapsed width |
| `surface` | surface mode | `'auto'` | Surface mode |

---

### 4.31 Tree

**Purpose:** Hierarchical tree with expand/collapse and selection. **Status: beta.**

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | tree nodes | — | Tree items |
| `expandedIds` | string[] | — | Expanded nodes |
| `selectedId` | string | — | Selected node |
| `onExpandedChange` | function | — | Expand callback |
| `onSelectedChange` | function | — | Selection callback |

---

### 4.32 Toc

**Purpose:** In-page or in-panel table of contents. **Status: beta.**

**When to use:** Document/section navigation within one page.
**When NOT to use:** App-wide navigation → use `Navigation` or `Panel`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | toc items | — | Sections |
| `activeId` | string | — | Active section |
| `withLine` | boolean | — | Indicator line |
| `lineSide` | `'left'\|'right'` | — | Line side |

---

### 4.33 Tile

**Purpose:** Interactive row primitive. Used for list items, tree nodes, file browser entries. **Status: beta.**

**When to use:** Row-level interactive element in a list, sidebar, or tree. Visually a flat selectable row with icon, text, and optional actions.

**When NOT to use:** Button action → use `Button`. Navigation link → use `Navigation`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | — | Primary label |
| `rightText` | ReactNode | — | Secondary right text |
| `variant` | `'default'\|'ghost'\|'accent'` | `'default'` | Visual variant |
| `icon` | ReactNode | — | Icon |
| `iconPosition` | `'left'\|'right'` | `'left'` | Icon placement |
| `disabled` | boolean | `false` | Disabled |
| `active` | boolean | `false` | Active/selected state |
| `level` | number (0–9) | — | Nesting indent level |
| `actions` | ReactNode | — | Right-side action buttons |
| `membrane` | boolean | `true` | Outer membrane |

---

### 4.34 Code

**Purpose:** Code snippet / block display.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | string | — | Code text |
| `language` | string | — | Language label |
| `title` | string | — | Block title |
| `showLineNumbers` | boolean | — | Line numbers |
| `highlight` | number[] | — | Highlighted lines |
| `defaultCollapsed` | boolean | — | Initial collapse state |
| `collapsedHeight` | number | — | Collapsed preview height |

---

### 4.35 Markdown

**Purpose:** Safe GFM renderer for rich text from markdown source.

**When to use:** Rendering user-generated or API-provided markdown content.
**When NOT to use:** Static text content → use `Text`. Code blocks → use `Code`.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | string | — | Markdown source |
| `gfm` | boolean | `true` | GitHub Flavored Markdown |
| `safeMode` | boolean | `true` | Strict sanitization |
| `allowRawHtml` | boolean | `false` | Allow raw HTML |
| `linkTarget` | `'_self'\|'_blank'` | `'_self'` | Link target |
| `membrane` | boolean | `true` | Outer membrane |
| `fullWidth` | boolean | `true` | Full width |

**Agent rules:** Default to safe/sanitized markdown. Do not use raw HTML unless the content source is trusted.

---

### 4.36 Bar

**Purpose:** Horizontal/vertical toolbar container for actions, headers, footers.

**When to use:** Page header with title + actions. Modal footer. Filter row. Any action strip.

**Compound parts:**
- `Bar.Left` — left-aligned content
- `Bar.LeftEllipsis` — left content with text truncation
- `Bar.LeftOverlap` — overlapping left content (e.g., avatar stack)
- `Bar.Right` — right-aligned content

**Agent rules:** Use `Bar` instead of ad hoc flex wrappers for action rows and headers.

---

### 4.37 Table

**Purpose:** Structured tabular data. **Status: beta.**

**When to use:** Columns matter, sorting/selection matter, row comparison is important.
**When NOT to use:** Simple list → use Card or Tile. On mobile, reconsider dense tables.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | column defs | — | Column definitions |
| `rows` | data rows | — | Row data |
| `sortColumn` | string | — | Sort column |
| `sortDirection` | `'asc'\|'desc'` | — | Sort direction |
| `onSortChange` | function | — | Sort callback |
| `selectable` | boolean | — | Enable row selection |
| `stickyHeader` | boolean | — | Sticky header |
| `resizable` | boolean | — | Column resize |

---

### 4.38 Progress

**Purpose:** Continuous progress display.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | number | — | Current value (-1 for indeterminate) |
| `max` | number | 100 | Maximum |
| `variant` | `'default'\|'success'\|'warning'\|'error'` | `'default'` | Visual variant |
| `showLabel` | boolean | — | Show percentage label |

---

### 4.39 Avatar

**Purpose:** Identity image with fallback initials.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | string | — | Image URL |
| `name` | string | — | Name for initials fallback |
| `fallback` | string | — | Explicit fallback text |

---

### 4.40 Media

**Purpose:** Unified image/video/audio renderer. **Status: beta.**

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'image'\|'video'\|'audio'` | — | Media type |
| `src` | string | — | Source URL |
| `alt` | string | — | Alt text |
| `objectFit` | CSS object-fit | — | Fit mode |
| `fallback` | ReactNode | — | Fallback content |

---

### 4.41 Skeleton

**Purpose:** Loading placeholder.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | string/number | — | Width |
| `height` | string/number | — | Height |
| `variant` | string | — | Shape variant |

---

### 4.42 Carousel

**Purpose:** Slide-based content container. **Status: beta.**

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | — | Slides |
| `loop` | boolean | — | Loop slides |
| `autoPlay` | boolean | — | Enable autoplay |
| `slidesPerView` | number | 1 | Visible slides |

---

### 4.43 Upload

**Purpose:** File selection and dropzone. **Status: beta.**

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accept` | string | — | File type filter |
| `multiple` | boolean | — | Multi-file |
| `maxSize` | number | — | Max file size |
| `maxFiles` | number | — | Max file count |
| `files` | file objects | — | Controlled files |
| `onFilesChange` | function | — | Files callback |

---

### 4.44 Scroll

**Purpose:** Scrollable viewport wrapper.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | — | Scroll behavior |
| `orientation` | `'horizontal'\|'vertical'` | — | Scroll axis |
| `height` | string | — | Explicit height |

---

## 5. Design Tokens

The library uses CSS custom properties as design tokens:

**Spacing (4px grid):**
`--uf-space-1` (4px) through `--uf-space-12` (48px)

**Typography:**
- `--uf-font-size-xs`: 12px
- `--uf-font-size-sm`: 13px
- `--uf-font-size`: 14px (base)
- `--uf-font-size-md`: 16px
- `--uf-font-size-lg`: 18px
- `--uf-font-size-xl`: 20px
- `--uf-font-weight`: 400
- `--uf-font-weight-bold`: 600

**Control geometry:**
- `--uf-control-height`: 32px
- `--uf-control-font-size`: 14px
- `--uf-control-pad-y`: 6px
- `--uf-control-pad-text`: 12px
- `--uf-control-pad-icon`: 6px
- `--uf-control-gap`: 10px

**Radius:**
- `--uf-radius-sm`: 4px
- `--uf-radius`: 6px
- `--uf-radius-md`: 8px
- `--uf-radius-lg`: 12px

**Size modifiers:**
- `.uf-compact`: height 28px, font-size 13px
- `.uf-large`: height 40px, font-size 16px

---

## 6. Deprecated Components

Do NOT use in new code:

| Deprecated | Use instead |
|-----------|-------------|
| `Overlay` | `Tooltip` or `Popover` |
| `Toggle` | `SegmentedControl` |
| `Sidebar` | `Panel` |
| `Sheet` | `Drawer` |
| `Date` | `DatePicker` |

---

## 7. Build Recipes

### Settings screen
- `Panel` for app structure
- `Bar` for page header/actions
- `Text` for section labels and help
- `Input`, `Select`, `Switcher`, `Checkbox`, `DatePicker` for fields
- `Button` for save/reset actions

### Command/search workflow
- `Command` for search and action discovery
- `Menu` only for short action lists
- `Popover` only for lightweight rich contextual content

### Documentation page
- `Toc` for section navigation
- `Text` for content hierarchy (h1–h6, body, muted)
- `Code` for snippets
- `Table` for structured reference data
- `Accordion` for FAQ / collapsed explanations

### Data-heavy page
- `Bar` for filters/actions
- `Table` for desktop comparison
- `Pagination` for page stepping
- `Drawer` or `Modal` for row detail/edit flows

### Landing / marketing page
- `Text` with `inset="none" membrane={false}` for all typography
- `Card` for content blocks
- `Code` for CLI examples
- `Button` for CTAs
- `Accordion` for FAQ
- Do NOT use `Badge` as text substitute — use `Text` with appropriate CSS class

### 7.5 Landing Page Methodology (Cursor / Sanity / Sandpack)

Deep guide for building product landing pages with face-ui-react. The quick recipe in section 7 covers component selection; this section covers structure, narrative, and rules.

#### Narrative Arc

| Phase | Purpose | Typical Section |
|-------|---------|-----------------|
| **Promise** | One-sentence value prop | Hero |
| **Proof** | Show the product working | Live demo / interactive |
| **Depth** | Progressive feature disclosure | Feature sections, tabs |
| **Trust** | Social proof + authority | Logos, testimonials, stats |
| **Action** | Low-friction conversion | Install command / Download |

Every claim must be immediately followed by visual or interactive proof. Never pitch without proving.

#### Section Inventory

| Section | Purpose |
|---------|---------|
| **Hero** | Headline (5-10 words) + subheadline + primary/secondary CTA + product visual |
| **Metrics** | 3-4 stat cards proving substance (uptime, users, rules count) |
| **Steps** | 3 numbered steps (01/02/03) showing the workflow |
| **Feature Tabs** | Horizontal numbered tabs with text + visual panels |
| **Alternating Features** | Left-right sections, each with heading + paragraph + code/visual |
| **Demo** | Interactive product embed or live code editor |
| **Pricing** | Tiered cards with featured plan highlight |
| **FAQ** | Expandable Q&A, 5-8 items |
| **Pre-footer CTA** | Final conversion: install command or download button |
| **Footer** | Links, social, legal |

Target 8-12 sections total. Alternate background shades every 2-3 sections to create rhythm.

#### Component Mapping

| Landing Section | face-ui-react Components |
|-----------------|-------------------------|
| Hero | `Text` (h1, lead), `Button` (CTAs), `Code` (quickstart), `Card` (container) |
| Metrics | `Card` + `Text` (value / label / detail) |
| Steps | `Card` + `Text` (number / title / body) |
| Demo | `Tabs` + `Code` + `Card` |
| Alternating Features | `Text` (title / body) + `Code` (example) in CSS grid |
| Desktop / Download | `Text` + `Button` + `Code` |
| Pricing | `Card` + `Text` + `Button` |
| FAQ | `Card` + `Accordion` + `Text` |
| Pre-footer CTA | `Text` + `Button` + `Code` |
| Footer | `Text` + links (plain `<a>` or router Link) |

#### Landing Text Rule

All text on landing pages MUST use `Text` with `inset="none" membrane={false}`. No bare HTML text elements (`<h1>`, `<p>`, `<span>`). This removes control-height padding and membrane spacing, giving full layout control to CSS.

```tsx
<Text variant="h1" inset="none" membrane={false}>Hero Title</Text>
<Text variant="body" inset="none" membrane={false}>Subheadline text.</Text>
```

#### Typography Scale

| Role | Size |
|------|------|
| Hero title | `clamp(52px, 8vw, 96px)` |
| Section title | `clamp(34px, 4.2vw, 58px)` |
| Body / description | 16-18px |
| Code | 14px |

Use at most 2 weights (400, 600). Control hierarchy through size, not weight. Line height for hero/section titles: tight (~1.0).

#### CTA Copy Rules

| Bad | Good |
|-----|------|
| Sign up | Download for macOS |
| Learn more | Open playground |
| Get started | `npx create userface@latest` |
| Try now | `npm install @userface/react` |

CTAs for developer products must be concrete actions or install commands. Never generic marketing verbs.

#### Anti-patterns

- No stock imagery — always show real product UI or code
- No generic CTAs ("Learn more", "Sign up") — be specific
- No feature lists without visual proof (code, screenshot, or demo)
- Max 2 sentences per feature block — concise, active voice
- No more than 2 primary CTAs per page — avoid decision paralysis
- No walls of same-shade background — alternate to create rhythm
- No animations for decoration — only for content reveal and interaction response

---

## 8. Pre-Ship Checklist

Before shipping an interface, verify:

- [ ] All text rendered through `<Text>` (no bare `<span>`, `<p>`, `<div>` with text)
- [ ] Canonical components used (no deprecated aliases)
- [ ] Spacing comes from membranes and control insets, not random margins
- [ ] Heading hierarchy uses proper Text variants (h1 → h6)
- [ ] Separator NOT used unless explicitly needed and approved
- [ ] Overlay components use `surface="auto"` by default
- [ ] Mobile behavior tested for responsive overlay components
- [ ] Action rows use `Bar` instead of ad hoc flex wrappers
- [ ] Document navigation uses `Toc`, not `Tree` or `Navigation`
- [ ] Component choice is semantically correct, not just visually similar
- [ ] No manual `<button>`, `<input>`, `<select>` — use library components
