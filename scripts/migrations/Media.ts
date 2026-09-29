import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Media', from: 'ariaLabel', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Media',
    before: '`ref`, `id`, `role`, `tabIndex` and `aria-label` went to the wrapping box, `title` to both the box and the element; other native attributes were dropped',
    after: '`ref` and native attributes go to the `<img>`, `<video>` or `<audio>` element; `className` and `style` stay on the box, while `hidden` hides the whole box and its fallback',
  },
  {
    kind: 'behavior',
    component: 'Media',
    before: '`alt` defaulted to `""`, so an image without it was silently decorative; any type accepted every prop',
    after: '`type` selects the props: an image requires `alt` (`""` marks it decorative) and takes `variant`; video and audio take player attributes and `<track>` children',
  },
  { kind: 'rename-value', component: 'Media', prop: 'variant', values: { rounded: 'default' }, codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Media',
    before: '`onLoad()` and `onError()` received no event; on video and audio `onLoad` ran on `loadeddata`',
    after: '`onLoad(event)` and `onError(event)` are the element\'s native events; video and audio report loading through the native `onLoadedData(event)`',
  },
  {
    kind: 'behavior',
    component: 'Media',
    before: 'An image in a box with a height stretched to fill it unless `objectFit` was set; a video kept its own width',
    after: 'Images default to `objectFit="cover"`; video and audio fill the box width and video keeps `contain`',
  },
  {
    kind: 'behavior',
    component: 'Media',
    before: 'A failed load replaced the element with the fallback and set `data-error` on the box; an empty `src` requested the page',
    after: 'The box carries `data-state` (`loading`, `loaded`, `error`), a player counting as loaded once its metadata arrives or the browser holds off fetching until playback; a missing or empty `src` counts as failed; the fallback shows beside the element, which is hidden',
  },
  {
    kind: 'behavior',
    component: 'Media',
    before: 'The JSON contract listed `title`',
    after: '`title` is left out of the contract, as it names nothing reliably; an image is named by `alt` and a player by `aria-label`. In TSX it still reaches the element as a native attribute',
  },
  {
    kind: 'behavior',
    component: 'Media',
    before: '`width="50"` or `height="50"` was passed as an invalid unitless CSS length and silently ignored',
    after: 'Numeric strings now mean pixels and report their normalization once in development',
  },
  { kind: 'export', from: 'Media/Media#MediaLoading', to: "`ImgHTMLAttributes<HTMLImageElement>['loading']`", codemod: 'manual' },
  { kind: 'export', from: 'Media/Media#MediaDecoding', to: "`ImgHTMLAttributes<HTMLImageElement>['decoding']`", codemod: 'manual' },
  {
    kind: 'export',
    from: 'Media/Media#mediaAnatomy',
    to: 'The `[data-scope="media"][data-part="root" | "element" | "fallback"]` attributes',
    codemod: 'manual',
  },
] satisfies Migration[]
