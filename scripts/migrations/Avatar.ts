import type { Migration } from './types'

export default [
  { kind: 'remove-prop', component: 'Avatar', prop: 'icon', use: '`fallback={<Icon name="…" />}`', codemod: 'manual' },
  { kind: 'remove-prop', component: 'Avatar', prop: 'children', use: '`fallback={content}`', codemod: 'manual' },
] satisfies Migration[]
