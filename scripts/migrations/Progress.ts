import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Progress', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Progress',
    prop: 'indeterminate',
    use: '`value={null}`',
    codemod: 'auto',
    values: { true: 'value={null}', false: '' },
  },
] satisfies Migration[]
