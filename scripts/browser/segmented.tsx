import { StrictMode, version } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  SegmentedControl,
  type SegmentedControlProps,
} from '../../SegmentedControl/SegmentedControl'
import '../../assets/styles/index.css'
const root = createRoot(document.getElementById('root')!)
let sequence = 0
const events: unknown[] = []
const defaultItems = [
  { value: '', label: 'None' },
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board', disabled: true },
]
function renderSegmented(props: SegmentedControlProps = {}, options: any = {}) {
  if (options.fresh) {
    sequence++
    events.length = 0
  }
  document.documentElement.dir = options.direction ?? 'ltr'
  document.documentElement.dataset.theme = options.theme ?? 'light'
  Object.assign(document.body.style, {
    margin: '16px',
    background: 'var(--uf-color-bg)',
    color: 'var(--uf-color-fg)',
  })
  flushSync(() =>
    root.render(
      <StrictMode>
        <main>
          <h1>Choice strip</h1>
          <button tabIndex={0} id="before">
            Before
          </button>
          <span id="external">View mode</span>
          <form
            id="edit"
            onSubmit={(e) => e.preventDefault()}
            onReset={(e) => {
              if (options.cancelReset) e.preventDefault()
            }}
          >
            <fieldset
              disabled={options.fieldsetDisabled}
              style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}
            >
              <div
                id="frame"
                style={{
                  width: options.width ?? 360,
                  maxWidth: '100%',
                  ...(options.density
                    ? { '--uf-control-height': `${options.density}px` }
                    : {}),
                }}
              >
                <SegmentedControl
                  key={sequence}
                  aria-label="View"
                  name="view"
                  items={defaultItems}
                  form={options.external ? 'external-form' : undefined}
                  {...props}
                  onClickCapture={(e) => {
                    if (options.cancelCapture) e.preventDefault()
                  }}
                  onClick={(e) => {
                    if (options.cancelClick) e.preventDefault()
                  }}
                  onKeyDownCapture={(e) => {
                    if (options.cancelCapture) e.preventDefault()
                  }}
                  onKeyDown={(e) => {
                    if (options.cancelKey) e.preventDefault()
                  }}
                  onValueChange={(details: any) => {
                    events.push(details.value)
                    if (options.accept)
                      renderSegmented(
                        { ...props, value: details.value },
                        { ...options, fresh: false },
                      )
                    if (options.mutate && Array.isArray(details.value))
                      details.value.push('list')
                  }}
                />
              </div>
            </fieldset>
            <button tabIndex={0} id="reset" type="reset">
              Reset
            </button>
          </form>
          <form id="external-form">
            <button tabIndex={0} type="reset" id="external-reset">
              Reset external
            </button>
          </form>
          <button tabIndex={0} id="after">
            After
          </button>
        </main>
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  renderSegmented,
  segmentedEvents: events,
  segmentedReactVersion: version,
  segmentedFormData: (external = false) =>
    Array.from(
      new FormData(
        document.getElementById(
          external ? 'external-form' : 'edit',
        ) as HTMLFormElement,
      ).entries(),
    ),
})
renderSegmented()
