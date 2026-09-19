import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Scroll, type ScrollProps } from '../../../../Scroll/Scroll'

const root = createRoot(document.getElementById('root')!)
let generation = 0
/**
 * Mounts a fresh Scroll (its viewport carries data-testid="subject") between two
 * tabbable buttons in a column `width` pixels wide. `column` puts it in a
 * 300px flex column under a 40px header, filling the rest; `wide` puts a
 * 2000px square block before the children; `update` re-renders the mounted one
 * with the new props instead.
 */
const renderScroll = (
  props: ScrollProps,
  options: { direction?: 'ltr' | 'rtl'; width?: number; column?: boolean; wide?: boolean; update?: boolean } = {},
) => {
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '16px',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  const scroll = (
    <Scroll data-testid="subject" {...props}>
      {options.wide ? (
        <>
          <div style={{ width: 2000, height: 2000 }} />
          {props.children}
        </>
      ) : (
        props.children
      )}
    </Scroll>
  )
  flushSync(() =>
    root.render(
      <StrictMode key={options.update ? generation : ++generation}>
        {/* tabIndex puts the buttons in WebKit's Tab order too. */}
        <button id="before" tabIndex={0}>
          Before
        </button>
        {options.column ? (
          <div style={{ width: options.width ?? 480, height: 300, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 40, flex: 'none' }}>Header</div>
            {scroll}
          </div>
        ) : (
          <div style={{ width: options.width ?? 480 }}>{scroll}</div>
        )}
        <button id="after" tabIndex={0}>
          After
        </button>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderScroll })
export type Hooks = { renderScroll: typeof renderScroll }
renderScroll({ children: 'Scroll' })
