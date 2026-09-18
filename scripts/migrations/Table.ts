import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Table',
    before: '`membrane` styled rows as tiles',
    after: '`rowStyle="tile"` styles rows; `membrane` adds outer spacing only',
  },
] satisfies Migration[]
