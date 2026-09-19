import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Code, type CodeProps } from '../../../../Code/Code'

const root = createRoot(document.getElementById('root')!)
let generation = 0
/**
 * Mounts a fresh subject Code between two tabbable buttons, and optionally a
 * reference Code below it, in a column of `width` pixels.
 */
const renderCode = (
  props: CodeProps,
  options: { direction?: 'ltr' | 'rtl'; width?: number; reference?: CodeProps } = {},
) => {
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '16px',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  flushSync(() =>
    root.render(
      <StrictMode key={++generation}>
        <button id="before" tabIndex={0}>
          Before
        </button>
        <div style={{ width: options.width ?? 480, display: 'grid', gap: 16 }}>
          <Code data-testid="subject" {...props} />
          {options.reference && <Code data-testid="reference" {...options.reference} />}
        </div>
        <button id="after" tabIndex={0}>
          After
        </button>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderCode })
export type Hooks = { renderCode: typeof renderCode }
renderCode({ children: 'npm install' })
