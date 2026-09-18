import type { Migration } from './types'

const machine = 'Use `Tabs`; the state machine is internal'

export default [
  {
    kind: 'remove-prop',
    component: 'Tabs',
    prop: 'withLine',
    use: '`variant="underline"`',
    codemod: 'auto',
    values: { true: 'variant="underline"', false: '' },
  },
  {
    kind: 'remove-prop',
    component: 'Tabs',
    prop: 'items[].actionIcon',
    use: 'Put controls in `actions`; the other `action*` fields and `onAction` go with it',
    codemod: 'manual',
  },
  { kind: 'export', from: 'assets/machines/tabs.machine#tabsMachine', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#tabsAnatomy', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#connectTabs', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#TabsSchema', to: machine, codemod: 'manual' },
] satisfies Migration[]
