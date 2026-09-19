import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Steps',
    before: 'Malformed `items` or keys, and a `step` or `defaultStep` that is not a nonnegative integer, threw during render',
    after: 'Steps render them normalized (bad items dropped, the first of a repeated key kept, the index clamped) and report once in development',
  },
  {
    kind: 'behavior',
    component: 'Steps',
    before: 'The root group was named "Steps" by default',
    after: 'The root has no default name; name it with `aria-label` or `aria-labelledby`',
  },
  {
    kind: 'behavior',
    component: 'Steps',
    before: "The root's `onClick` ran after the step changed",
    after: '`onClick` runs first, and its `preventDefault()` cancels the change',
  },
  {
    kind: 'behavior',
    component: 'Steps',
    before: 'An uncontrolled step beyond an empty or shorter `items` list fell back for good',
    after: 'It waits for the items to arrive; only removing the current step moves it, to the last one left',
  },
] satisfies Migration[]
