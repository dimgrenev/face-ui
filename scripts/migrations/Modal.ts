import type { Migration } from './types'

export default [
  { kind: 'move-to-labels', component: 'Modal', from: 'closeLabel', key: 'close', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Modal', from: 'closeOnOverlayClick', to: 'closeOnBackdropClick', codemod: 'auto' },
  { kind: 'rename-value', component: 'Modal', prop: 'placement', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Modal',
    prop: 'autoFocusOnOpen',
    use: 'Nothing: opening always moves focus inside, to focus a child already took, else `[data-autofocus]`, else the first control; `portal={false}` previews never take focus',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Modal',
    prop: 'actions',
    use: '`footer` with Button elements, e.g. `footer={<><Button variant="outline" onClick={cancel}>Cancel</Button><Button variant="accent" onClick={save}>Save</Button></>}`; the last button is no longer made accent for you',
    codemod: 'manual',
  },
  { kind: 'export', from: 'ModalAction', to: 'Button props in `footer`', codemod: 'manual' },
  {
    kind: 'behavior',
    component: 'Modal',
    before: 'The close button was named "Close modal"',
    after: 'It is named "Close"; `labels.close` renames it',
  },
  {
    kind: 'behavior',
    component: 'Modal',
    before: 'A closed Modal kept its body mounted and hidden, so a child with `autoFocus` never received focus when it opened',
    after: 'The surface mounts when the dialog opens and unmounts after it fades out; child state resets on every opening',
  },
  {
    kind: 'behavior',
    component: 'Modal',
    before: 'An open `portal={false}` Modal still held focus and took Escape and outside presses, like a portaled one',
    after: 'An in-place Modal is a static preview: the page, Escape and focus are left alone and `scrollLock` does nothing',
  },
  {
    kind: 'behavior',
    component: 'Modal',
    before: '`edge="flush"` squared and unbordered a centered dialog',
    after: '`edge` applies to edge placements only; a centered dialog stays inset',
  },
  {
    kind: 'behavior',
    component: 'Modal',
    before: '`placement="left"`/`"right"` sat on the right/left in right-to-left documents',
    after: '`start`/`end` follow the dialog direction (`dir`, else the document), and the surface slides in from that side',
  },
  {
    kind: 'behavior',
    component: 'Modal',
    before: 'A dialog without a title had no accessible name and no warning',
    after: 'An open dialog without `title`, `aria-label` or `aria-labelledby` is reported once in development',
  },
] satisfies Migration[]
