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
  {
    kind: 'behavior',
    component: 'SegmentedControl',
    before: 'An item without a string `value`, a repeated `value`, or a malformed `items`/`value` threw a TypeError',
    after: 'The item or key is skipped and a development report names it',
  },
  {
    kind: 'behavior',
    component: 'SegmentedControl',
    before: 'A selected choice missing from `items` was discarded, so it stayed unselected when the item returned',
    after: 'The value is kept and the choice shows as selected again once its item is back; `onValueChange` is not called',
  },
  {
    kind: 'behavior',
    component: 'SegmentedControl',
    before: 'The root was the bordered strip of choices',
    after: 'The root is a field (`uf-field`) with `label`, `description` and `error`; the border is on the `.uf-toggle-list` strip, which keeps its natural width',
  },
  {
    kind: 'behavior',
    component: 'SegmentedControl',
    before: 'Removing or disabling the focused choice moved focus to the selected or first choice',
    after: 'Focus moves to the choice now at its place, else the one before it',
  },
] satisfies Migration[]
