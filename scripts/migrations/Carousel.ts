import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Carousel',
    prop: 'slides',
    use: 'One child per slide: `<Media src alt />` for each former `{ src, alt }` (in JSON, `{ "__componentName__": "Media", "src": …, "alt": … }`)',
    codemod: 'manual',
  },
  { kind: 'export', from: 'Carousel/Carousel#CarouselMediaSlide', to: '`MediaImageProps` of the `Media` children', codemod: 'manual' },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-controllable-machine-prop#useControllableMachineProp',
    to: '`useControllableState` from `assets/adapters/react/use-controllable-state`',
    codemod: 'manual',
  },
  { kind: 'rename-prop', component: 'Carousel', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Carousel',
    prop: 'orientation',
    use: 'Remove it; a carousel moves horizontally. Content that scrolls vertically belongs in `Scroll`',
    codemod: 'auto',
    values: { horizontal: '' },
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'A text or number child became an image whose URL was that text',
    after: 'A text child is a text slide; images are `Media` children',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'Control names, slide names, the rotation button text and the announced kinds were fixed English strings',
    after: '`labels` renames them: `previous`, `next`, `play`, `pause`, `slide` (`{index}`, `{count}`), `goToSlide` (`{index}`), `roleCarousel`, `roleSlide`',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'The root took only `className`; every indicator was a tab stop marked `aria-pressed`; one slide still showed two disabled arrows and a dot',
    after: 'The root takes native attributes; the indicators are one tab stop whose arrows move and activate, the current one marked `aria-current`; a single position shows no controls',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'Without `loop`, autoplay stopped at the last slide while its button still read "Pause rotation"; focus paused it, a click did not',
    after: 'Autoplay returns to the first slide after the last; any press or focus inside stops it until the rotation control starts it, hover pauses it; the rotation control is an icon button named `labels.play`/`labels.pause`',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'In right-to-left text the track slid the wrong way and showed nothing; arrows and swipes did not mirror',
    after: 'The track, the arrow icons, ArrowLeft/ArrowRight and swipes follow text direction; the track follows the pointer while dragged',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: '`slidesPerView` above the number of slides stretched the slides to fill the width',
    after: 'Each slide keeps its `1 / slidesPerView` share; a fractional or zero `slidesPerView` is reported and becomes a whole number from 1',
  },
  {
    kind: 'behavior',
    component: 'Carousel',
    before: 'The root and viewport carried `data-state` (`idle`, `dragging`, `auto-playing`); slides carried `aria-hidden` and `data-state`',
    after: 'Slides outside the view are `inert` (also on React 19) and marked by the absence of `data-current`; the root carries no state attribute',
  },
] satisfies Migration[]
