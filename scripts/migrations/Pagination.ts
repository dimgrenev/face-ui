import type { Migration } from './types'

export default [
  { kind: 'move-to-labels', component: 'Pagination', from: 'surfaceTitle', key: 'choosePage', codemod: 'auto' },
  {
    kind: 'retype-prop',
    component: 'Pagination',
    prop: 'labels',
    before: '`previousPage` and `nextPage` keys',
    after: 'the shared `previous` and `next` keys',
    codemod: 'manual',
    legacy: String.raw`\b(previousPage|nextPage)\b`,
  },
  {
    kind: 'behavior',
    component: 'Pagination',
    before: 'A `page`, `defaultPage`, `total`, `pageSize` or `siblingCount` out of range or not an integer threw during render',
    after: 'Pagination renders it normalized (integers clamped, non-numbers such as `"50"` replaced by the default) and reports once in development',
  },
  {
    kind: 'behavior',
    component: 'Pagination',
    before: '`labels.page` without exactly one `{page}` threw during render',
    after: 'Every `{page}` is replaced by the number; a template without one gets the number appended after a space',
  },
  {
    kind: 'behavior',
    component: 'Pagination',
    before: "The nav's `onClick` ran after the page changed",
    after: '`onClick` runs first, and its `preventDefault()` cancels the change',
  },
] satisfies Migration[]
