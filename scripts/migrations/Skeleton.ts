import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Skeleton', from: 'variant', to: 'shape', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Skeleton',
    prop: 'aria-hidden',
    use: 'Nothing: a skeleton is always hidden from assistive technology. Mark the region being loaded with `aria-busy`',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Skeleton',
    prop: 'children',
    use: 'Place the content after loading instead of the skeleton; a placeholder has no content',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Skeleton',
    prop: 'dangerouslySetInnerHTML',
    use: 'Place the markup after loading instead of the skeleton; a placeholder has no content',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Skeleton',
    prop: 'defaultValue',
    use: 'Nothing: a placeholder holds no value, and the attribute never did anything',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Skeleton',
    prop: 'defaultChecked',
    use: 'Nothing: a placeholder holds no value, and the attribute never did anything',
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Skeleton',
    before: 'A width or height below one control height was raised to it, so `height={12}` still drew 32px',
    after: 'width and height size the box exactly, smaller as well as larger',
  },
  {
    kind: 'behavior',
    component: 'Skeleton',
    before: 'The default text shape was a filled box four controls wide and one control tall',
    after: 'It takes the box of a one-line Text with its membrane across its column, and paints a bar as tall as the text where the glyphs will be. Set `width` for a shorter line',
  },
  {
    kind: 'behavior',
    component: 'Skeleton',
    before: 'The rect shape was a square one control across',
    after: 'It is as wide as its column and one control tall; set `height` for an image or a card',
  },
  {
    kind: 'behavior',
    component: 'Skeleton',
    before: 'A circle given only a width or only a height was one control across the other way',
    after: 'It takes the side it is given for both',
  },
  {
    kind: 'behavior',
    component: 'Skeleton',
    before: 'In forced colors the placeholder was repainted in the canvas color and disappeared',
    after: 'It is painted in GrayText',
  },
] satisfies Migration[]
