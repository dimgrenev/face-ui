import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Scroll', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Scroll',
    before: 'Without `height`, the box was 240px tall',
    after: 'Without `height`, the box is as tall as its content or as its layout makes it (a flex or grid cell, `style.maxHeight`); pass `height={240}` to keep the former size',
  },
  {
    kind: 'behavior',
    component: 'Scroll',
    before: 'The viewport was always a tab stop and a region named "Scrollable text" or `ariaLabel`',
    after: 'It is a tab stop only while its content overflows along an axis it scrolls, or when `tabIndex` says so; a tab stop without `aria-label` or `aria-labelledby` is named "Scrollable content", and it is a region only while it is named',
  },
  {
    kind: 'behavior',
    component: 'Scroll',
    before: 'The ref and `className` went to the outer box, and no other attribute or handler was passed on',
    after: 'The ref, native attributes and handlers (`id`, `onScroll`, `aria-*`, `data-*`) go to the scrolling viewport; `className` and `style` go to the outer box, and a `role` passed is ignored',
  },
  {
    kind: 'behavior',
    component: 'Scroll',
    before: 'Text in a horizontal or both-axes Scroll wrapped at the box width (never narrower than 12 control heights), so it rarely scrolled sideways',
    after: 'Text that can scroll sideways keeps each line whole and scrolls; in a vertical Scroll it wraps as before',
  },
] satisfies Migration[]
