import { useEffect, useId, useState } from 'react'
import { Modal, type ModalProps } from './Modal'

export type ModalPreviewProps = Omit<ModalProps, 'onOpenChange'>

/** A real parent for the controlled dialog, with editable authored inputs. */
export function ModalPreview({ open, defaultOpen = false, trigger, id, closable = true, ...props }: ModalPreviewProps) {
  const generatedId = useId()
  const contentId = id ?? `${generatedId}-modal-example`
  const [isOpen, setOpen] = useState(() => open ?? defaultOpen)
  useEffect(() => { if (open !== undefined) setOpen(open) }, [open])
  return <div data-face-modal-example="" data-content-id={contentId} data-open={isOpen} data-closable={closable}>
    <Modal {...props} id={contentId} open={isOpen} closable={closable}
      trigger={trigger === undefined ? 'Open dialog' : trigger}
      onOpenChange={details => setOpen(details.open)} />
  </div>
}

// Structural subset of the existing example context: no dependency on a host SDK.
interface ModalCheckContext {
  canvas: HTMLElement
  signal: AbortSignal
  assert(condition: unknown, message?: string): asserts condition
  waitFor(assertion: () => void | Promise<void>): Promise<void>
}

export const userfaceExample = { checks: [{ id: 'open-close', name: 'Configured close and reopen',
  async run(context: ModalCheckContext) {
    const { canvas, signal, waitFor } = context
    signal.throwIfAborted()
    const assert: ModalCheckContext['assert'] = context.assert
    const root = canvas.querySelector<HTMLElement>('[data-face-modal-example]')
    assert(root, 'The current Modal example must be mounted.')
    const contentId = root.dataset.contentId
    assert(contentId, 'The example must identify its own dialog.')
    const content = () => canvas.ownerDocument.getElementById(contentId)
    const trigger = root.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="trigger"]')
    const wasOpen = root.dataset.open === 'true'
    const press = (button: HTMLButtonElement) => { signal.throwIfAborted(); button.click() }
    const isOpen = () => content()?.dataset.state === 'open'
    assert(trigger, 'This close-and-reopen check requires a configured trigger; the dialog has not been changed.')
    if (root.dataset.closable === 'false') {
      assert(!content()?.querySelector('[data-scope="modal"][data-part="close"]'), 'A non-closable dialog must not offer Close.')
      return
    }
    if (!wasOpen) { press(trigger); await waitFor(() => assert(isOpen(), 'The trigger must open its dialog.')) }
    if (!isOpen()) { assert(!wasOpen, 'The configured open dialog must be visible.'); return }
    const close = content()?.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')
    assert(close, 'A closable dialog must offer Close.')
    press(close)
    await waitFor(() => assert(!isOpen(), 'Close must update the real controlled parent.'))
    press(trigger)
    await waitFor(() => assert(isOpen(), 'A closed dialog must reopen through its trigger.'))
    if (!wasOpen) {
      const restoredClose = content()?.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')
      assert(restoredClose, 'The reopened dialog must remain closable.')
      press(restoredClose)
      await waitFor(() => assert(!isOpen(), 'The check must restore the authored closed state.'))
    }
  },
}] }
