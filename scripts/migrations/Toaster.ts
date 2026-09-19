import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Toaster', from: 'dismissible', to: 'closable', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Toaster', from: 'closeLabel', key: 'close', codemod: 'auto' },
  {
    kind: 'rename-value',
    component: 'Toaster',
    prop: 'placement',
    values: {
      'bottom-left': 'bottom-start',
      'bottom-right': 'bottom-end',
      'top-left': 'top-start',
      'top-right': 'top-end',
    },
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Toaster',
    before: 'The newest toast was last in every placement',
    after: 'The newest toast sits nearest the viewport edge: last at the bottom, first at the top',
  },
] satisfies Migration[]
