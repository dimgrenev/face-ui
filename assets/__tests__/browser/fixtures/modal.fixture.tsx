import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Button } from '../../../../Button/Button'
import { Modal, type ModalProps } from '../../../../Modal/Modal'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '0',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: Array<{ open: boolean }> = []
Object.assign(window, { modalEvents: events })

type Options = {
  /** Serializable Modal props; the trigger is an "Open dialog" button unless `external`. */
  props?: Omit<ModalProps, 'trigger' | 'children' | 'footer' | 'onOpenChange'>
  /** Body: plain controls, a child that focuses itself, a `[data-autofocus]` control, or text only. */
  body?: 'controls' | 'self-focus' | 'data-autofocus' | 'text'
  /** A second dialog opens from inside the first. */
  nested?: boolean
  /** Opened by an outside button through controlled `open`, without a trigger. */
  external?: boolean
  /** Makes the document scroll. */
  tall?: boolean
  dir?: 'ltr' | 'rtl'
}

function Body({ body = 'controls' }: Pick<Options, 'body'>) {
  if (body === 'text') return <>Read-only details.</>
  return (
    <>
      <button>First action</button>
      {body === 'self-focus' && <input aria-label="Branch name" autoFocus />}
      {body === 'data-autofocus' && <input aria-label="Email" data-autofocus />}
    </>
  )
}

function Fixture({ props, body, nested, external, tall }: Options) {
  const [open, setOpen] = useState(false)
  const onOpenChange = (details: { open: boolean }) => {
    events.push(details)
    if (external) setOpen(details.open)
  }
  return (
    <>
      <button id="before">Before</button>
      {external && (
        <button id="opener" onClick={() => setOpen(true)}>
          Show dialog
        </button>
      )}
      <Modal
        title="Dialog"
        {...(external ? { open } : { trigger: <button>Open dialog</button> })}
        {...props}
        onOpenChange={onOpenChange}
        footer={<Button variant="accent">Save</Button>}
      >
        <Body body={body} />
        {nested && (
          <Modal title="Child" trigger={<button>Open child</button>}>
            <button>Child action</button>
          </Modal>
        )}
      </Modal>
      {tall && <div style={{ height: 3000 }}>Tall page</div>}
    </>
  )
}

function renderModal(options: Options = {}) {
  events.length = 0
  document.documentElement.dir = options.dir ?? 'ltr'
  flushSync(() => root.render(<StrictMode><Fixture {...options} /></StrictMode>))
}
Object.assign(window, { renderModal })
export type Hooks = { renderModal: typeof renderModal }
