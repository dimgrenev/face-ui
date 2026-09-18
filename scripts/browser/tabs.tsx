import { StrictMode, version } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Tabs } from '../../Tabs/Tabs'
import { Button } from '../../Button/Button'
import '../../assets/styles/index.css'
const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
let sequence = 0
const defaults = [
  { value: '', label: 'Overview', content: 'Overview content' },
  { value: 'a', label: 'Activity', content: 'Activity content' },
  { value: 'b', label: 'Billing', content: 'Billing content' },
]
function renderTabs(props: any = {}, options: any = {}) {
  if (options.fresh) {
    sequence++
    events.length = 0
  }
  document.documentElement.dataset.theme = options.theme ?? 'light'
  document.documentElement.dir = options.direction ?? 'ltr'
  Object.assign(document.body.style, {
    margin: '16px',
    background: 'var(--uf-color-bg)',
    color: 'var(--uf-color-fg)',
    fontFamily: 'var(--uf-font-family-base)',
  })
  const items = (props.items ?? defaults).map((item: any) =>
    options.inputs
      ? {
          ...item,
          content: (
            <label>
              Draft {item.value}
              <input
                aria-label={`Draft ${item.value}`}
                defaultValue="Initial"
              />
            </label>
          ),
        }
      : item,
  )
  flushSync(() =>
    root.render(
      <StrictMode>
        <main>
          <h1>Tabs</h1>
          <button tabIndex={0} id="before">
            Before
          </button>
          <span id="heading">Record sections</span>
          <p id="description">Read and edit a record</p>
          <Tabs
            key={sequence}
            aria-label="Record sections"
            {...props}
            items={items}
            onClickCapture={
              options.cancelClick ? (e) => e.preventDefault() : undefined
            }
            onKeyDownCapture={
              options.cancelKeys ? (e) => e.preventDefault() : undefined
            }
            actions={
              options.actions
                ? (Array.isArray(options.actions)
                    ? options.actions
                    : ['Close selected']
                  ).map((text: string) => (
                    <Button
                      key={text}
                      text={text}
                      icon="close"
                      onClick={() => events.push('action')}
                    />
                  ))
                : undefined
            }
            onValueChange={(details) => {
              events.push(details)
              if (options.accept)
                renderTabs(
                  { ...props, value: details.value },
                  { ...options, fresh: false },
                )
            }}
          />
          <button tabIndex={0} id="after">
            After
          </button>
        </main>
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  renderTabs,
  tabsEvents: events,
  tabsReactVersion: version,
})
