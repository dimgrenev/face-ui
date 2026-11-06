import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Toc, type TocProps } from '../../../../Toc/Toc'

const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
let generation = 0
const sections = [
  { value: 'intro', label: 'Introduction' },
  { value: 'setup', label: 'Setup' },
  { value: 'tokens', label: 'Design tokens', level: 2 },
  { value: 'usage', label: 'Usage' },
]

/** A page of tall sections beside a sticky sidebar Toc; every Toc callback is recorded in order. */
const renderToc = (
  props: Pick<TocProps, 'line' | 'defaultValue'> = {},
  options: { width?: number; direction?: 'ltr' | 'rtl'; longLabel?: boolean } = {},
) => {
  events.length = 0
  history.replaceState(null, '', location.pathname)
  window.scrollTo(0, 0)
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '0',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  const items = sections.map((item) =>
    options.longLabel && item.value === 'setup'
      ? { ...item, label: 'Setup of the workspace, the providers and the command line tools' }
      : item,
  )
  flushSync(() =>
    root.render(
      <StrictMode>
        <button id="before">Before</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 40 }}>
          <aside
            key={generation++}
            id="sidebar"
            style={{ position: 'sticky', insetBlockStart: 40, flex: 'none', width: options.width ?? 240 }}
          >
            <Toc
              items={items}
              {...props}
              onValueChange={(details) => events.push({ change: details.value })}
              onSelect={({ value }) => events.push({ select: value })}
            />
          </aside>
          <main style={{ flex: 1 }}>
            {sections.map(({ value, label }) => (
              <section key={value} id={value} style={{ minHeight: '150vh' }}>
                <h2 style={{ margin: 0 }}>{label}</h2>
              </section>
            ))}
          </main>
        </div>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderToc, tocEvents: events })
export type Hooks = { renderToc: typeof renderToc }
renderToc()
