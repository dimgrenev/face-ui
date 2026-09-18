import type { Migration } from './types'

const machine = 'Use `SegmentedControl`; the state machine is internal'

export default [
  { kind: 'export', from: 'assets/machines/toggle.machine#toggleMachine', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#toggleAnatomy', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#connectToggle', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#ToggleSchema', to: machine, codemod: 'manual' },
  {
    kind: 'remove-prop',
    component: 'Toggle',
    prop: 'type',
    use: '`multiple` instead of `"multiple"`; omit `"single"`',
    codemod: 'auto',
    values: { multiple: 'multiple', single: '' },
  },
  {
    kind: 'behavior',
    component: 'Toggle',
    before: 'Without `type`, Toggle pressed independent options',
    after: 'Toggle is `SegmentedControl`: without `multiple` it selects one choice, so add `multiple` where `type` was omitted',
  },
  {
    kind: 'retype-prop',
    component: 'Toggle',
    prop: 'value',
    before: 'an array in both modes',
    after: 'A string or `null` without `multiple`, as is `onValueChange`\'s `details.value`; an array with it',
    codemod: 'manual',
  },
  {
    kind: 'retype-prop',
    component: 'Toggle',
    prop: 'defaultValue',
    before: 'an array in both modes',
    after: 'A string or `null` without `multiple`; an array with it',
    codemod: 'manual',
  },
] satisfies Migration[]
