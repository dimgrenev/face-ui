import type { Migration } from './types'

export default [
  { kind: 'rename-value', component: 'Text', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'text-to-children', component: 'Text', from: 'text', codemod: 'auto' },
  { kind: 'rename-value', component: 'Text', prop: 'align', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Text',
    before: '`variant="blockquote"` rendered a `<div>`',
    after: '`variant="blockquote"` renders `<blockquote>`; set `as` to choose another element',
  },
  {
    kind: 'behavior',
    component: 'Text',
    before: '`align="left"` and `align="right"` stayed on the physical side in right-to-left text',
    after: '`align="start"` and `align="end"` follow the text direction',
  },
] satisfies Migration[]
