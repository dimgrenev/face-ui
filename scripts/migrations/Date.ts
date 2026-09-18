import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Date',
    prop: 'showPresets',
    use: 'Pass `presets`; they render whenever the list is not empty',
    codemod: 'manual',
  },
  { kind: 'remove-prop', component: 'Date', prop: 'views', use: '`mode` and `openTo`', codemod: 'manual' },
  { kind: 'move-to-labels', component: 'Date', from: 'clearLabel', key: 'clear', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Date', from: 'nowLabel', key: 'now', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Date', from: 'closeLabel', key: 'close', codemod: 'auto' },
] satisfies Migration[]
