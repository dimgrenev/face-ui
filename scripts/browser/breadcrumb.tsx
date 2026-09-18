import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Breadcrumb, type BreadcrumbProps } from '../../Breadcrumb/Breadcrumb'
import '../../assets/styles/index.css'
const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: unknown[] = []
let firstRender = true
const renderBreadcrumb = (
  options: {
    maxItems?: number | null
    callbacks?: boolean
    actions?: boolean
    cancelCapture?: boolean
    props?: BreadcrumbProps
  } = {},
) => {
  if (!firstRender) history.replaceState(null, '', location.pathname)
  firstRender = false
  events.length = 0
  const items = [
    'Home',
    'Library',
    'Collection',
    'Chapter',
    'Section',
    'Current',
  ].map((label, index) => ({
    label,
    href: index < 5 && !options.actions ? `#${label.toLowerCase()}` : undefined,
    onClick:
      options.callbacks && index < 5
        ? (event?: React.MouseEvent<HTMLElement>) => {
            events.push({
              label,
              target: event?.currentTarget.tagName,
              type: event?.type,
            })
            event?.preventDefault()
          }
        : undefined,
  }))
  flushSync(() =>
    root.render(
      <main>
        <h1>Breadcrumb behavior verification</h1>
        <button id="before" tabIndex={0}>
          Before
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            events.push('submit')
          }}
          onClickCapture={
            options.cancelCapture
              ? (event) => event.preventDefault()
              : undefined
          }
        >
          <Breadcrumb
            items={items}
            maxItems={options.maxItems}
            {...options.props}
          />
        </form>
        <button id="after" tabIndex={0}>
          After
        </button>
      </main>,
    ),
  )
}
Object.assign(window, { renderBreadcrumb, breadcrumbEvents: events })
renderBreadcrumb()
