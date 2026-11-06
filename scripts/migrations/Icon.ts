import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Icon', from: 'label', to: 'aria-label', codemod: 'auto' },
] satisfies Migration[]
