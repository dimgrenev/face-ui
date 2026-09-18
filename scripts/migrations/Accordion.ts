import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Accordion', from: 'expandedIds', to: 'expanded', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Accordion', from: 'defaultExpandedIds', to: 'defaultExpanded', codemod: 'auto' },
  {
    kind: 'retype-prop',
    component: 'Accordion',
    prop: 'onExpandedChange',
    before: '`details.expandedIds`',
    after: '`details.expanded`',
    codemod: 'manual',
    legacy: String.raw`\bexpandedIds\b`,
  },
  {
    kind: 'behavior',
    component: 'Accordion',
    before: 'Malformed `items`, `expandedIds` or `headingLevel` threw during render',
    after: 'The accordion renders with the value normalized and reports it once in development',
  },
] satisfies Migration[]
