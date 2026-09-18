import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Select', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Select',
    prop: 'type',
    use: '`multiple` instead of `"multiselect"`; omit `"select"`',
    codemod: 'auto',
    values: { multiselect: 'multiple', select: '' },
  },
  {
    kind: 'remove-prop',
    component: 'Select',
    prop: 'variant',
    use: '`surface="side"` or `iconOnly fullWidth={false}`; omit `"default"`',
    codemod: 'auto',
    values: { side: 'surface="side"', iconOnly: 'iconOnly fullWidth={false}', default: '' },
  },
  { kind: 'export', from: 'SelectVariant', to: 'The `surface` and `iconOnly` props', codemod: 'manual' },
  {
    kind: 'export',
    from: 'Select/Select#computeSelectSidePosition',
    to: 'Select/select-side-position#computeSelectSidePosition',
    codemod: 'auto',
  },
  {
    kind: 'export',
    from: 'Select/Select#computeSelectSideOptionViewportHeight',
    to: 'Select/select-side-position#computeSelectSideOptionViewportHeight',
    codemod: 'auto',
  },
  {
    kind: 'export',
    from: 'Select/Select#SelectSidePosition',
    to: 'Select/select-side-position#SelectSidePosition',
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Select',
    before: '`ref` pointed to the wrapper `<div>`',
    after: '`ref` points to the native trigger `<button>`',
  },
  {
    kind: 'behavior',
    component: 'Select',
    before: 'The `.uf-select` root and `.uf-select-wrapper` were `<div>`s',
    after: 'Both are `<span>`s, so a Select is valid inside a `<p>`; select them by class',
  },
] satisfies Migration[]
