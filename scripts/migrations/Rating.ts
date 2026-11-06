import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Rating', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Rating',
    before: 'Pressing the selected star again or Home cleared the value',
    after: 'Neither clears it; reset the value yourself. Show a fixed score with `readOnly`, not `disabled`',
  },
  {
    kind: 'behavior',
    component: 'Rating',
    before:
      'The root was an inline box sized to its stars; `label` was `[data-scope="rating"][data-part="label"]` inside the membrane',
    after:
      'The root is a block field (`uf-field`) with `label`, `description` and `error` as `[data-scope="field"]` parts; `membrane` spaces the stars only',
  },
  {
    kind: 'behavior',
    component: 'Rating',
    before: 'An invalid `max`, a non-finite `value`, `required` without `name` or a non-text `formatValue` result threw',
    after:
      'Each renders normalized (`max` clamped to 1..10, score 0, `required` ignored, the default text) with one development report',
  },
  {
    kind: 'behavior',
    component: 'Rating',
    before: 'Shrinking `max`, turning off `allowHalf` or leaving `readOnly` stored the rounded or bounded score',
    after: 'The stored score stays; only the shown one is bounded or rounded, so the exact score returns with the scale',
  },
] satisfies Migration[]
