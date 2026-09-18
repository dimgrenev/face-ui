import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'The `.uf-menu` root was a `<div>`',
    after: 'It is a `<span>`, so a Menu is valid inside a `<p>`; select it by class',
  },
] satisfies Migration[]
