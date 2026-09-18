import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Button',
    prop: 'selector',
    use: '`chevron="down"`, or `chevron="end"` with `selectorDirection="side"`',
    codemod: 'auto',
    transform: 'button-chevron',
  },
  {
    kind: 'remove-prop',
    component: 'Button',
    prop: 'selectorDirection',
    use: 'The `chevron` value',
    codemod: 'auto',
    transform: 'button-chevron',
  },
  { kind: 'rename-prop', component: 'Button', from: 'selectorOpen', to: 'aria-expanded', codemod: 'auto' },
  { kind: 'rename-value', component: 'Button', prop: 'iconPosition', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'export', from: 'ButtonSelectorDirection', to: '`ButtonChevron` (`down` | `end`)', codemod: 'manual' },
  { kind: 'text-to-children', component: 'Button', from: 'text', codemod: 'auto' },
  { kind: 'rename-value', component: 'Button', prop: 'align', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  { kind: 'rename-prop', component: 'Button', from: 'rightText', to: 'meta', codemod: 'auto' },
  { kind: 'rename-value', component: 'Button', prop: 'chevron', values: { right: 'end' }, codemod: 'auto' },
  { kind: 'rename-prop', component: 'Button', from: 'level', to: 'indent', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Button',
    before: '`chevron="right"` and `align="left"`/`"right"` pointed to the physical side in right-to-left text',
    after: '`chevron="end"` mirrors and `align="start"`/`"end"` follow the text direction',
  },
] satisfies Migration[]
