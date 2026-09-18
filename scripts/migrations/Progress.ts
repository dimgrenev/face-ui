import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Progress', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
] satisfies Migration[]
