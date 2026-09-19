import { createRef } from 'react'
import { Button } from '../../../Button/Button'
import { Modal, type ModalLabels } from '../../../Modal/Modal'

const labels: ModalLabels = { close: 'Закрыть' }
;<Modal
  ref={createRef<HTMLDivElement>()}
  defaultOpen
  onOpenChange={({ open }) => open.valueOf()}
  trigger={<button>Open</button>}
  title="Delete chat?"
  description="This cannot be undone."
  role="alertdialog"
  closable={false}
  closeOnBackdropClick={false}
  labels={labels}
  placement="end"
  edge="flush"
  width={420}
  height={600}
  scrollLock
  portal={false}
  className="surface"
  backdropClassName="backdrop"
  positionerClassName="positioner"
  style={{ padding: 0 }}
  id="dialog"
  dir="rtl"
  lang="ar"
  aria-label="Delete chat"
  data-testid="dialog"
  onKeyDown={(event) => event.preventDefault()}
  footer={<Button variant="accent">Delete</Button>}
>
  Body
</Modal>
// @ts-expect-error The close control is named through labels.close.
;<Modal closeLabel="Close" />
// @ts-expect-error Backdrop dismissal is closeOnBackdropClick.
;<Modal closeOnOverlayClick={false} />
// @ts-expect-error Initial focus follows the layer contract: [data-autofocus], then the first control.
;<Modal autoFocusOnOpen={false} />
// @ts-expect-error Footer content is the footer slot.
;<Modal actions={[{ label: 'Save' }]} />
// @ts-expect-error Placement is logical: start or end.
;<Modal placement="left" />
// @ts-expect-error A modal surface is a dialog or an alertdialog.
;<Modal role="region" />
// @ts-expect-error Open state is `open`, not the hidden attribute.
;<Modal hidden />
// @ts-expect-error The surface owns its focusability.
;<Modal tabIndex={0} />
// @ts-expect-error Labels are strings.
;<Modal labels={{ close: false }} />
// @ts-expect-error Sizes are pixel numbers.
;<Modal width="420px" />
