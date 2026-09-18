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
] satisfies Migration[]
