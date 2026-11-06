import type { Migration } from './types'

export default [
  { kind: 'remove-prop', component: 'Avatar', prop: 'icon', use: '`fallback={<Icon name="…" />}`', codemod: 'manual' },
  { kind: 'remove-prop', component: 'Avatar', prop: 'children', use: '`fallback={content}`', codemod: 'manual' },
  { kind: 'rename-prop', component: 'Avatar', from: 'fallbackDelayMs', to: 'fallbackDelay', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Avatar',
    before: 'The root, image and fallback carried `data-state="loading"` while a pending image waited out the delay',
    after: 'Only the root carries `data-state`: `idle` inside the delay, then `loading`, `loaded` or `error`',
  },
] satisfies Migration[]
