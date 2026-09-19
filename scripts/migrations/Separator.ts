import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'role',
    use: '`decorative={false}` for `role="separator"`; `decorative` for `role="none"`. A role passed anyway is ignored',
    codemod: 'auto',
    values: { separator: 'decorative={false}', none: 'decorative', presentation: 'decorative' },
  },
  {
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'aria-orientation',
    use: 'Set `orientation` to the direction the line is drawn in; a separator that is not decorative announces it. A passed `aria-orientation` is ignored',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'children',
    use: 'Place the text beside the separator; a separator is only a line',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'Outside a flex or grid row a vertical separator was 0 tall without membrane, and its line 2px shorter than a control with membrane',
    after: 'The line is at least `--uf-control-height` tall and stretches with its row; membrane only adds its spacing around it',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'The line’s min and max width and height were pinned, so a className or style could not widen or lengthen it (a resize handle stayed 1px wide)',
    after: 'Only the thickness is set; a className or style sizes the line directly, and a widened line is painted in the separator color unless that rule also sets its background',
  },
] satisfies Migration[]
