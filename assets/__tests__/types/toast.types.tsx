import { Toast, Toaster, createToastContext, useToast, type ToastOptions } from '../../../Toast/Toast'

// The surface: regions, one action with the click event, closing through onClose, labels.
;<Toast title="Saved" description={<b>All good</b>} tone="positive" closable onClose={() => {}} />
;<Toast title="Saved" action={{ label: <b>Undo</b>, onClick: (event) => event.preventDefault() }} />
;<Toast title="Saved" labels={{ close: 'Закрыть уведомление' }} id="saved" aria-label="Saved" />
// @ts-expect-error dismissible is closable
;<Toast dismissible={false} />
// @ts-expect-error closeLabel is labels.close
;<Toast closeLabel="Close" />
// @ts-expect-error onDismiss is onClose
;<Toast onDismiss={() => {}} />
// @ts-expect-error title, description and action are the content; children would be ignored
;<Toast>Saved</Toast>
// @ts-expect-error every tone is a polite status
;<Toast role="alert" />
// @ts-expect-error tones are neutral, positive, warning and destructive
;<Toast tone="accent" />

// The region: logical placement, closable and labels for every toast.
;<Toaster placement="bottom-end" closable={false} labels={{ close: 'Закрыть' }} aria-label="Уведомления" />
// @ts-expect-error placement is logical: bottom-start
;<Toaster placement="bottom-left" />
// @ts-expect-error dismissible is closable
;<Toaster dismissible />
// @ts-expect-error closeLabel is labels.close
;<Toaster closeLabel="Close" />

// toast(): a required title, an optional id that updates the toast in place.
const { toast, dismiss } = useToast()
const id: string = toast({ id: 'upload', title: 'Uploading', duration: 0 })
dismiss(id)
const options: ToastOptions = { title: <b>Saved</b>, description: 'All good', tone: 'warning' }
toast(options)
// @ts-expect-error a toast needs a title
toast({ description: 'No title' })
const context = createToastContext({ maxVisible: 5, duration: 8000 })
context.toaster.toast({ title: 'Isolated' })
// @ts-expect-error defaultDuration is duration
createToastContext({ defaultDuration: 0 })
