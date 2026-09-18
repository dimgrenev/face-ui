import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Radio', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Radio', from: 'ariaLabelledBy', to: 'aria-labelledby', codemod: 'auto' },
] satisfies Migration[]
