import type { Migration } from './types'

const use = 'Remove it; Popover opens on click, use Tooltip for hover content'

export default [
  { kind: 'remove-prop', component: 'Popover', prop: 'interactive', use, codemod: 'auto' },
  { kind: 'remove-prop', component: 'Popover', prop: 'openDelay', use, codemod: 'auto' },
  { kind: 'remove-prop', component: 'Popover', prop: 'closeDelay', use, codemod: 'auto' },
] satisfies Migration[]
