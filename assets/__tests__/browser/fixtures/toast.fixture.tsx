import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  createToastContext,
  type ToasterOptions,
  type ToasterProps,
  type ToastOptions,
} from '../../../../Toast/Toast'
import { Modal } from '../../../../Modal/Modal'

const root = createRoot(document.getElementById('root')!)
const clicks: string[] = []
let context = createToastContext()

/** A fresh store and region over a page-sized button, so clicks that miss the toasts are visible. */
const renderToaster = (
  props: ToasterProps = {},
  options: ToasterOptions & { direction?: 'ltr' | 'rtl'; animated?: boolean } = {},
) => {
  const { direction = 'ltr', animated = false, ...store } = options
  context = createToastContext(store)
  clicks.length = 0
  document.documentElement.dir = direction
  Object.assign(document.body.style, { margin: '0', background: 'var(--uf-color-bg)' })
  flushSync(() =>
    root.render(
      <StrictMode>
        <div className={animated ? 'uf-animated' : undefined}>
          <button
            id="page"
            style={{ position: 'fixed', inset: 0, border: 0, background: 'transparent' }}
            onClick={() => clicks.push('page')}
          >
            Page
          </button>
          <context.Toaster {...props} />
        </div>
      </StrictMode>,
    ),
  )
}
const showToast = (options: ToastOptions) => {
  flushSync(() => void context.toaster.toast(options))
}

const renderToasterInModal = () => {
  context = createToastContext()
  flushSync(() => root.render(
    <StrictMode>
      <Modal title="Work" trigger={<button>Open work</button>}>
        <button>Continue work</button>
      </Modal>
      <context.Toaster />
    </StrictMode>,
  ))
}

Object.assign(window, { renderToaster, renderToasterInModal, showToast, toastClicks: clicks })
export type Hooks = {
  renderToaster: typeof renderToaster
  renderToasterInModal: typeof renderToasterInModal
  showToast: typeof showToast
}
renderToaster()
