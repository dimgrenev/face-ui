import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Input', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'controlRole', to: 'role', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'ariaControls', to: 'aria-controls', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'ariaActiveDescendant', to: 'aria-activedescendant', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'ariaAutoComplete', to: 'aria-autocomplete', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'ariaExpanded', to: 'aria-expanded', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'ariaHasPopup', to: 'aria-haspopup', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Input', from: 'controlRef', to: 'ref', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Input',
    prop: 'textLayout',
    use: '`multiline` instead of `"wrap"`; omit `"scroll"`',
    codemod: 'auto',
    values: { wrap: 'multiline', scroll: '' },
  },
  { kind: 'remove-prop', component: 'Input', prop: 'stretchText', use: 'Remove it; it had no effect', codemod: 'auto' },
  { kind: 'rename-value', component: 'Input', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'export', from: 'InputTextLayout', to: 'The boolean `multiline` prop', codemod: 'manual' },
  {
    kind: 'behavior',
    component: 'Input',
    before: '`ref` pointed to the wrapper `<div>`',
    after: '`ref` points to the native input or textarea; `className` and `style` still style the outer layout',
  },
] satisfies Migration[]
