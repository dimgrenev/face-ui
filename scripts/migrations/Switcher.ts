import type { Migration } from './types'

export default [
  { kind: 'remove-prop', component: 'Switcher', prop: 'text', use: '`label`, provided only when it should show', codemod: 'auto' },
  { kind: 'remove-prop', component: 'Switcher', prop: 'withText', use: 'Provide or omit `label`', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Switcher',
    prop: 'textWrap',
    use: '`truncate` instead of `"truncate"`; omit `"wrap"`',
    codemod: 'auto',
    values: { truncate: 'truncate', wrap: '' },
  },
  { kind: 'export', from: 'SwitcherTextWrap', to: 'The boolean `truncate` prop', codemod: 'manual' },
  {
    kind: 'behavior',
    component: 'Switcher',
    before: 'A long label was cut to one line with an ellipsis',
    after: 'A long label wraps; set `truncate` to keep one line',
  },
] satisfies Migration[]
