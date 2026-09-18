import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Button',
    prop: 'selector',
    use: '`chevron="down"`, or `chevron="right"` with `selectorDirection="side"`',
    codemod: 'auto',
  },
  { kind: 'remove-prop', component: 'Button', prop: 'selectorDirection', use: 'The `chevron` value', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Button', from: 'selectorOpen', to: 'aria-expanded', codemod: 'auto' },
  { kind: 'rename-value', component: 'Button', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'export', from: 'ButtonSelectorDirection', to: '`ButtonChevron` (`down` | `right`)', codemod: 'manual' },
] satisfies Migration[]
