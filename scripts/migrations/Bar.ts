import type { Migration } from './types'

export default [
  { kind: 'export', from: 'Bar.LeftEllipsis', to: 'Bar.Section grow', codemod: 'auto' },
  { kind: 'export', from: 'Bar.Right', to: 'Bar.Section align="end"', codemod: 'auto' },
  {
    kind: 'export',
    from: 'Bar.LeftOverlap',
    to: '`Bar.Section grow` for the content and `Bar.Section align="end"` for the actions',
    codemod: 'manual',
  },
] satisfies Migration[]
