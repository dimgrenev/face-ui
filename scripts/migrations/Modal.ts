import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Modal',
    before: '`scrollLock` defaulted to `false`',
    after: '`scrollLock` defaults to `portal`: a portaled modal locks page scroll unless `scrollLock={false}`',
  },
] satisfies Migration[]
