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
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'dangerouslySetInnerHTML',
    use: 'Place the markup beside the separator; a separator is only a line',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'defaultValue',
    use: 'Nothing: a separator holds no value, and the attribute never did anything',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Separator',
    prop: 'defaultChecked',
    use: 'Nothing: a separator holds no value, and the attribute never did anything',
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'Outside a flex or grid row, a vertical separator with membrane drew its line 2px shorter than a control',
    after: 'The line is one control tall there. Without membrane it still takes its height only from its row or its own style',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'The line’s thickness was pinned by min and max sizes, so no className or style could widen it (a resize handle stayed 1px wide)',
    after: 'A style on the line, or a className rule that outranks the library’s, widens it. A widened resize handle is painted in the separator color unless that rule also sets its background',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'With membrane, a horizontal separator in a row kept its container’s full width and overflowed the row',
    after: 'It never overflows: it shrinks along with its siblings, so a multi-word label beside it wraps unless it is kept on one line',
  },
  {
    kind: 'behavior',
    component: 'Separator',
    before: 'In forced colors the line was repainted in the canvas color and disappeared',
    after: 'It is drawn in CanvasText',
  },
] satisfies Migration[]
