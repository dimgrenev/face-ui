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
  {
    kind: 'retype-prop',
    component: 'Date',
    prop: 'presets',
    before: '`{ label, value }` items',
    after: 'Each item also needs an `id`, unique within the picker',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: '`weekStartsOn` defaulted to 1 (Monday)',
    after: 'The first weekday follows `locale`; set `weekStartsOn` to pin it',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: '`ref` pointed to the wrapper `<div>`',
    after: '`ref` points to the trigger `<button>`; `className` and `style` still style the whole field',
  },
] satisfies Migration[]
