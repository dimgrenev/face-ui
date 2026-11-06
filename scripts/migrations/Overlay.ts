import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Overlay', from: 'trigger', to: 'openOn', codemod: 'auto' },
] satisfies Migration[]
