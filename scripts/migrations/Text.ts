import type { Migration } from './types'

export default [
  { kind: 'rename-value', component: 'Text', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Text',
    before: '`variant="blockquote"` rendered a `<div>`',
    after: '`variant="blockquote"` renders `<blockquote>`; set `as` to choose another element',
  },
] satisfies Migration[]
