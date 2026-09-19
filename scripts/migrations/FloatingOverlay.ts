import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'FloatingOverlay', from: 'trigger', to: 'openOn', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'FloatingOverlay',
    before:
      'Its hover hook, `useHoverIntent({ enabled, open, triggerRef, contentRef, send })` from `assets/adapters/react/use-hover-intent`, sent pointer and focus events to a machine',
    after:
      '`useHoverIntent({ value, onValueChange, openDelay, closeDelay })` proposes the open key; spread `trigger(key)` on each trigger and `content` on the surface',
  },
] satisfies Migration[]
