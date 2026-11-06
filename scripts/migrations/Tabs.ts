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
  {
    kind: 'remove-prop',
    component: 'Tabs',
    prop: 'items[].leadingIcon',
    use: '`items[].icon`',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Tabs',
    prop: 'items[].trailingIcon',
    use: 'Put a status mark in `label`, or a control in `actions`',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Tabs',
    before: 'A `value` missing from `items` selected no tab and showed no panel',
    after: 'The first enabled tab shows until the key appears; nothing is reported to `onValueChange`',
  },
  {
    kind: 'behavior',
    component: 'Tabs',
    before: 'A `defaultValue` missing from the first `items` was replaced by the first enabled tab for good',
    after: 'It waits until `items` contain it; only removing the selected tab moves the selection, to its neighbour',
  },
  {
    kind: 'behavior',
    component: 'Tabs',
    before: 'In automatic mode any focus on a tab selected it',
    after: 'Arrow keys, Home and End select; focus from a script or the Tab key does not',
  },
  {
    kind: 'behavior',
    component: 'Tabs',
    before: 'Invalid or duplicate item keys, external items without `panelId` or with `content`, and empty or repeated ids threw a TypeError',
    after: 'Tabs renders: bad items are dropped (first key wins) and reported, a tab without `panelId` in external mode gets no `aria-controls` and is reported, external `content` is ignored',
  },
  { kind: 'export', from: 'assets/machines/tabs.machine#tabsMachine', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#tabsAnatomy', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#connectTabs', to: machine, codemod: 'manual' },
  { kind: 'export', from: 'assets/machines/tabs.machine#TabsSchema', to: machine, codemod: 'manual' },
] satisfies Migration[]
