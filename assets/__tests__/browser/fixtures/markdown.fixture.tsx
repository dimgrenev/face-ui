import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Markdown, type MarkdownProps } from '../../../../Markdown/Markdown'

const root = createRoot(document.getElementById('root')!)
/** Mounts the subject Markdown in a column of `width` pixels, in the given direction. */
const renderMarkdown = (
  props: MarkdownProps,
  options: { direction?: 'ltr' | 'rtl'; width?: number } = {},
) => {
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '16px',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  flushSync(() =>
    root.render(
      <StrictMode>
        <main data-testid="column" style={{ width: options.width ?? 480 }}>
          <Markdown data-testid="subject" {...props} />
        </main>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderMarkdown })
export type Hooks = { renderMarkdown: typeof renderMarkdown }
renderMarkdown({ children: '# Markdown' })
