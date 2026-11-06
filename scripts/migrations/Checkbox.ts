import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Checkbox',
    before: '`ref` pointed to the `<label>`',
    after: '`ref` points to the native checkbox `<input>`; `className` and `style` still style the label',
  },
  {
    kind: 'behavior',
    component: 'Checkbox',
    before: '`onCheckedChange` ran before the native `onChange`',
    after: '`onChange` runs first, and its `preventDefault()` cancels the change',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-checked-input#syncCheckedInput',
    to: '`useCheckedInput(options)`, which owns the checked state and writes the input',
    codemod: 'manual',
  },
] satisfies Migration[]
