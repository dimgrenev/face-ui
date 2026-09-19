import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Radio', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Radio', from: 'ariaLabelledBy', to: 'aria-labelledby', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Radio', from: 'options', to: 'items', codemod: 'auto' },
  { kind: 'export', from: 'RadioOption', to: 'RadioItem', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Radio',
    before: 'Options sat directly in the radiogroup root',
    after:
      'Items sit in `[data-part="list"]`; the root is a field (`uf-field`) that also holds `label`, `description` and `error`',
  },
  {
    kind: 'behavior',
    component: 'Radio',
    before: 'An option repeating a value rendered twice under one React key',
    after: 'The first item with a value wins; later ones are dropped with a development report',
  },
  {
    kind: 'behavior',
    component: 'Radio',
    before: 'Home and End did nothing',
    after: 'Home and End focus and select the first and last enabled item',
  },
] satisfies Migration[]
