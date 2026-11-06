import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Badge',
    prop: 'appearance',
    use: '`variant="fill"`; omit `"outline"`, the default',
    codemod: 'auto',
    values: { fill: 'variant="fill"', outline: '' },
  },
  { kind: 'text-to-children', component: 'Badge', from: 'text', codemod: 'auto' },
  { kind: 'export', from: 'BadgeAppearance', to: 'BadgeVariant', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Badge',
    before: 'The root carried the fill or outline treatment as `data-appearance`',
    after: 'The root carries it as `data-variant`',
  },
] satisfies Migration[]
