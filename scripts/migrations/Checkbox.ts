import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Checkbox',
    before: '`ref` pointed to the `<label>`',
    after: '`ref` points to the native checkbox `<input>`; `className` and `style` still style the label',
  },
] satisfies Migration[]
