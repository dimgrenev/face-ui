import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Steps, type StepsProps } from '../../../../Steps/Steps'
import { Button } from '../../../../Button/Button'
import { Select } from '../../../../Select/Select'
const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
let generation = 0
const foreign = (suffix: string) => (
  <div data-foreign={suffix}>
    <Button onClick={() => events.push('panel-action')}>Action {suffix}</Button>
    <Select
      label={`Project ${suffix}`}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]}
    />
  </div>
)
const renderSteps = (
  props: StepsProps = {},
  options: {
    reset?: boolean
    fields?: boolean
    foreign?: boolean
    reverse?: boolean
    count?: number
    long?: boolean
    cancelClick?: boolean
    cancelKey?: boolean
    width?: number
    zoom?: number
    direction?: string
    theme?: string
  } = {},
) => {
  if (options.reset) {
    generation++
    events.length = 0
  }
  document.documentElement.dir = options.direction ?? 'ltr'
  document.documentElement.dataset.theme = options.theme ?? 'light'
  Object.assign(document.body.style, {
    margin: '16px',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  const items = Array.from({ length: options.count ?? 3 }, (_, index) => ({
    key: index,
    label: options.long
      ? `Step ${index + 1} ${'LongUnbrokenName'.repeat(8)}`
      : (['Account', 'Profile', 'Review'][index] ?? `Step ${index + 1}`),
    content: options.foreign ? (
      foreign(String(index))
    ) : options.fields ? (
      <input
        name={`field-${index}`}
        aria-label={`Field ${index + 1}`}
        defaultValue={`Value ${index + 1}`}
      />
    ) : (
      `Content ${index + 1}`
    ),
  }))
  if (options.reverse) items.reverse()
  flushSync(() =>
    root.render(
      <StrictMode>
        <div key={generation}>
          <h1>Steps verification</h1>
          <button id="before" tabIndex={0}>
            Before
          </button>
          <form
            id="form"
            onSubmit={(e) => {
              e.preventDefault()
              events.push('submit')
            }}
          >
            <div
              style={{
                width: options.width ?? 440,
                maxWidth: '100%',
                zoom: options.zoom ?? 1,
              }}
            >
              <Steps
                items={items}
                {...props}
                ref={(node) => {
                  ;(window as any).stepsRoot = node
                }}
                onStepChange={(detail) => events.push(detail)}
                onClickCapture={(e) => {
                  if (options.cancelClick) e.preventDefault()
                }}
                onKeyDownCapture={(e) => {
                  if (options.cancelKey) e.preventDefault()
                }}
              />
            </div>
          </form>
          <button id="after" tabIndex={0}>
            After
          </button>
          {options.foreign && foreign('reference')}
        </div>
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  renderSteps,
  stepsEvents: events,
})
export type Hooks = { renderSteps: typeof renderSteps }
renderSteps()
