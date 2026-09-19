import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Toast', from: 'dismissible', to: 'closable', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Toast', from: 'closeLabel', key: 'close', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Toast', from: 'onDismiss', to: 'onClose', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Toast',
    before: 'The close button rendered without `onDismiss` and did nothing',
    after: 'The close button, and Escape inside the toast, appear only when `onClose` can be called',
  },
  {
    kind: 'behavior',
    component: 'Toast',
    before: 'Clicking the action always closed the toast; `action.onClick` received no event',
    after: '`action.onClick(event)` runs first; `event.preventDefault()` keeps the toast open',
  },
  {
    kind: 'behavior',
    component: 'Toast',
    before: 'Only the first toast of a series closed itself, and hovering did not pause it',
    after: 'Every toast closes after its own `duration`; a pointer over a toast, focus in the region or a background window pauses all of them, keeping the time left',
  },
  {
    kind: 'behavior',
    component: 'Toast',
    before: 'Toasts beyond `maxVisible` were dropped',
    after: 'They wait behind the newest ones with their time stopped and appear as those close',
  },
  {
    kind: 'behavior',
    component: 'Toast',
    before: '`createToastContext({ defaultDuration })`; its `toaster` exposed the machine service',
    after: '`createToastContext({ duration })`; its `toaster` is `{ toast, dismiss }`, the object `useToast()` returns',
  },
] satisfies Migration[]
