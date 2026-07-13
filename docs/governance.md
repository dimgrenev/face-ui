# Governance Model

## Maturity
- `stable`: compatibility required; breaking changes need aliases or migrations.
- `beta`: shape may change, but preview parity and responsive behavior are required.
- `deprecated`: kept only for compatibility; new usage should move to the listed replacement.

## Review Gates
- Contract sync passes.
- Interaction smoke tests pass.
- Responsive review for compact viewport.
- Accessibility review for focus, keyboard, and hidden inputs.
- Preview parity between gallery and standalone preview.

## Public Taxonomy Rules
- `Tooltip` and `Popover` are public. `Overlay` is internal/deprecated.
- `SegmentedControl` is public. `Toggle` is a compatibility alias.
- `Panel` is public. `Sidebar` is a compatibility alias.
- `Modal` is the single public modal surface for centered and edge-aligned workflows.
- `Date` is the single public date selection component.

## Public Surface Rules
- The primary barrel is `index.ts`.
- Deprecated aliases must not appear in the primary barrel, gallery, or component tree.
- Deprecated aliases may remain in `compat.ts` only as an explicit migration path.
