import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Tile',
    prop: 'selector',
    use: '`chevron="down"`',
    codemod: 'auto',
    values: { true: 'chevron="down"', false: '' },
  },
  { kind: 'rename-prop', component: 'Tile', from: 'selectorOpen', to: 'aria-expanded', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Tile', from: 'busy', to: 'aria-busy', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Tile',
    prop: 'selectedDescendant',
    use: '`active={active || selectedDescendant}`',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Tile',
    prop: 'intent',
    use: '`interactive={false} tone="muted"` for a section heading; an explicit `role` and its ARIA state for a custom control',
    codemod: 'manual',
  },
  { kind: 'rename-value', component: 'Tile', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'export', from: 'TileIntent', to: 'The `interactive`, `tone` and `role` props', codemod: 'manual' },
  { kind: 'text-to-children', component: 'Tile', from: 'text', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Tile', from: 'rightText', to: 'meta', codemod: 'auto' },
  { kind: 'rename-value', component: 'Tile', prop: 'align', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'rename-value', component: 'Tile', prop: 'chevron', values: { right: 'end' }, codemod: 'auto' },
  { kind: 'rename-prop', component: 'Tile', from: 'level', to: 'indent', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Tile',
    before: '`rightText` sat inside the label area and joined a button row\'s accessible name',
    after: '`meta` renders in its own part before the actions and is not part of the row\'s name',
  },
  {
    kind: 'behavior',
    component: 'Tile',
    before: 'A Tile with `aria-expanded` but no `onClick`, `role` or `interactive` rendered an inert `<div aria-expanded>`',
    after: '`aria-expanded` makes the row a disclosure button; pass `interactive={false}` to opt out',
  },
] satisfies Migration[]
