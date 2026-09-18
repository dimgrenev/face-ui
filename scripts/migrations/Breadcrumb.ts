import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Breadcrumb', from: 'collapseAfter', to: 'maxItems', codemod: 'auto' },
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
    before: '`collapseAfter` below 3 disabled collapsing',
    after: '`maxItems={null}` disables collapsing; a number must be at least 3',
  },
] satisfies Migration[]
