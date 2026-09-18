import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Rating', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Rating',
    before: 'Pressing the selected star again or Home cleared the value',
    after: 'Neither clears it; reset the value yourself. Show a fixed score with `readOnly`, not `disabled`',
  },
] satisfies Migration[]
