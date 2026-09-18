import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Card', from: 'interactive', to: 'hoverable', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Card', from: 'footerLayout', to: 'footerAlign', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Card.Header', from: 'layout', to: 'orientation', codemod: 'auto' },
  {
    kind: 'rename-value',
    component: 'Card.Header',
    prop: 'orientation',
    values: { stack: 'vertical', bar: 'horizontal' },
    codemod: 'auto',
  },
  { kind: 'rename-prop', component: 'Card.Footer', from: 'layout', to: 'align', codemod: 'auto' },
  { kind: 'export', from: 'CardFooterLayout', to: 'CardAlign', codemod: 'auto' },
  { kind: 'export', from: 'CardActionAlign', to: 'CardAlign', codemod: 'auto' },
  {
    kind: 'export',
    from: 'CardHeaderLayout',
    to: '`CardHeaderOrientation` (`vertical` | `horizontal`)',
    codemod: 'manual',
  },
  { kind: 'text-to-children', component: 'Card', from: 'content', codemod: 'auto' },
  { kind: 'text-to-children', component: 'Card.Title', from: 'text', codemod: 'auto' },
  { kind: 'text-to-children', component: 'Card.Description', from: 'text', codemod: 'auto' },
  { kind: 'rename-value', component: 'Card.Title', prop: 'align', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  {
    kind: 'rename-value',
    component: 'Card.Description',
    prop: 'align',
    values: { left: 'start', right: 'end' },
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Card',
    before: '`content` without `title`, `description` or `footer` was wrapped in the content part',
    after: 'Children without `title`, `description` or `footer` render directly in the card; wrap them in `Card.Content` to keep the part',
  },
] satisfies Migration[]
