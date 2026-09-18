import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'SegmentedControl', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'SegmentedControl',
    prop: 'selectionMode',
    use: '`multiple` instead of `"multiple"`; omit `"single"`',
    codemod: 'auto',
    values: { multiple: 'multiple', single: '' },
  },
  {
    kind: 'behavior',
    component: 'SegmentedControl',
    before: 'Single selection used a one-element array',
    after: 'Single selection is a string or `null`; only `multiple` uses an array',
  },
] satisfies Migration[]
