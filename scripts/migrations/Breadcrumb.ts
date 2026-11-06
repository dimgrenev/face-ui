import type { Migration } from './types'

export default [
  {
    kind: 'rename-prop',
    component: 'Breadcrumb',
    from: 'collapseAfter',
    to: 'maxItems',
    codemod: 'auto',
    transform: 'breadcrumb-max-items',
  },
  {
    kind: 'remove-prop',
    component: 'Breadcrumb',
    prop: 'allowNavigation',
    use: 'Links always navigate; cancel the click in your own handler to stay on the page',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Breadcrumb',
    before: '`collapseAfter` below 3, or not finite, turned collapsing off',
    after: '`maxItems={null}` turns it off, and the codemod writes it for such literals; a number must be an integer of at least 3',
  },
  { kind: 'move-to-labels', component: 'Breadcrumb', from: 'overflowLabel', key: 'more', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Breadcrumb',
    before: 'Malformed `items` or keys, and a `maxItems` that is not an integer of at least 3, threw during render',
    after: 'The trail renders them normalized (bad items dropped, the first of a repeated key kept, `maxItems` clamped) and reports once in development',
  },
] satisfies Migration[]
