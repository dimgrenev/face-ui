import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Upload, type UploadProps } from '../../../../Upload/Upload'

const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
let generation = 0

/** What the form would send: each entry's key and, for a file, its name. */
const entries = (form: HTMLFormElement) =>
  Array.from(new FormData(form), ([key, value]) => [key, typeof value === 'string' ? value : value.name])

/**
 * Upload inside #form, after a #before button and before a Submit button; the form never
 * navigates. Every file list, rejection and submission is recorded in order.
 */
const renderUpload = (
  props: Omit<UploadProps, 'onFilesChange' | 'onReject' | 'ref'> = {},
  options: { width?: number; direction?: 'ltr' | 'rtl' } = {},
) => {
  events.length = 0
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '0',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  flushSync(() =>
    root.render(
      <StrictMode>
        <form
          key={generation++}
          id="form"
          style={{ width: options.width ?? 420, padding: 16 }}
          onSubmit={(event) => {
            event.preventDefault()
            events.push({ submit: entries(event.currentTarget) })
          }}
        >
          <button type="button" id="before">
            Before
          </button>
          <Upload
            {...props}
            onFilesChange={({ files }) => events.push({ files: files.map((entry) => entry.name) })}
            onReject={({ files }) => events.push({ reject: files.map(({ file, reason }) => [file.name, reason]) })}
          />
          <button type="submit">Submit</button>
        </form>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderUpload, uploadEvents: events })
export type Hooks = { renderUpload: typeof renderUpload }
renderUpload()
