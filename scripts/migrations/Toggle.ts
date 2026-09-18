import type { Migration } from './types'

const machine = 'Use `SegmentedControl`; the state machine is internal'

export default [
  { kind: 'export', from: 'assets/machines/toggle.machine#toggleMachine', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#toggleAnatomy', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#connectToggle', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/toggle.machine#ToggleSchema', to: machine, codemod: 'manual' },
] satisfies Migration[]
