import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Button } from '../../../../Button/Button'
import { Modal, type ModalProps } from '../../../../Modal/Modal'
import { FaceUiOverlayProvider } from '../../../adapters/react/overlay-context'

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

function ScopedFixture({ transformed = false, externalPortal = false }: {
  transformed?: boolean
  externalPortal?: boolean
}) {
  const [scopeRoot, setScopeRoot] = useState<HTMLElement | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null)
  const [externalContainer, setExternalContainer] = useState<HTMLDivElement | null>(null)
  const [neighborClicks, setNeighborClicks] = useState(0)
  return <div style={{ display: 'flex', gap: 24, padding: 24 }}>
    <section data-instance="A" ref={setScopeRoot} style={{ width: 420, height: 360, border: '1px solid',
      transform: transformed ? 'translate(64px, 20px) scale(0.8)' : undefined }}>
      <FaceUiOverlayProvider scopeRoot={scopeRoot} portalContainer={externalPortal ? externalContainer : portalContainer}>
        <Modal title="Scoped dialog" trigger="Open scoped dialog" scrollLock>
          <button>A inside</button>
        </Modal>
        <button>A neighbor</button>
      </FaceUiOverlayProvider>
      <div data-portal="A" ref={setPortalContainer} />
    </section>
    <section data-instance="B" style={{ width: 420, height: 360, border: '1px solid' }}>
      <button onClick={() => setNeighborClicks((count) => count + 1)}>B action</button>
      <output data-b-clicks>{neighborClicks}</output>
    </section>
    <div data-portal="external" ref={setExternalContainer} />
  </div>
}

function renderScopedModal(options: { transformed?: boolean; externalPortal?: boolean } = {}) {
  flushSync(() => root.render(<StrictMode><ScopedFixture {...options} /></StrictMode>))
}
Object.assign(window, { renderModal, renderScopedModal })
export type Hooks = { renderModal: typeof renderModal; renderScopedModal: typeof renderScopedModal }
