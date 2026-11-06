import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Slider, type SliderProps } from '../../../../Slider/Slider'
const root = createRoot(document.getElementById('root')!)
const events: unknown[] = [],
  commits: unknown[] = [],
  cropEvents: unknown[] = [],
  cropCommits: unknown[] = []
let sequence = 0
const renderSlider = (
  props: SliderProps = {},
  options: {
    fresh?: boolean
    direction?: string
    theme?: string
    width?: number
    density?: number
    external?: boolean
    fieldsetDisabled?: boolean
    cancelReset?: boolean
    cancelPointer?: boolean
    cancelCapture?: boolean
    cancelKey?: boolean
    accept?: boolean
    format?: boolean
    rich?: boolean
    longFormat?: boolean
    mutateCrop?: boolean
  } = {},
) => {
  if (options.fresh) sequence++
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
        <div>
          <h1>Slider verification</h1>
          <button id="before">Before</button>
          <span id="external">External label</span>
          <span id="description">Details</span>
          <form
            id="edit"
            onReset={(event) => {
              if (options.cancelReset) event.preventDefault()
            }}
            onSubmit={(event) => event.preventDefault()}
          >
            <div
              id="frame"
              style={{
                width: options.width ?? 420,
                maxWidth: '100%',
                ...(options.density
                  ? { '--uf-control-height': `${options.density}px` }
                  : {}),
              }}
            >
              <fieldset
                disabled={options.fieldsetDisabled}
                style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}
              >
                <Slider
                  key={sequence}
                  ref={(node) => {
                    Object.assign(window, { sliderRoot: node })
                  }}
                  label={options.rich ? <strong>Font weight</strong> : 'Value'}
                  name="value"
                  cropName="clip"
                  form={options.external ? 'external-form' : undefined}
                  {...props}
                  {...(options.format && {
                    formatValue: ({ value, kind }) =>
                      `${kind === 'crop' ? 'Crop ' : ''}${value}%`,
                  })}
                  {...(options.longFormat && {
                    formatValue: ({ value }) =>
                      `${value} very long localized units`,
                  })}
                  onPointerDown={(event) => {
                    if (options.cancelPointer) event.preventDefault()
                  }}
                  onPointerDownCapture={(event) => {
                    Object.assign(window, { sliderPointerId: event.pointerId })
                    if (options.cancelCapture) event.preventDefault()
                  }}
                  onKeyDown={(event) => {
                    if (options.cancelKey) event.preventDefault()
                  }}
                  onValueChange={(next) => {
                    events.push(next.value)
                    if (options.accept)
                      renderSlider(
                        { ...props, value: next.value },
                        { ...options, fresh: false },
                      )
                  }}
                  onCropRangeChange={({ cropRange }) => {
                    cropEvents.push({ ...cropRange })
                    if (options.mutateCrop) cropRange.start = 90
                    if (options.accept)
                      renderSlider(
                        { ...props, cropRange },
                        { ...options, fresh: false },
                      )
                  }}
                  onValueCommit={(next) => commits.push(next.value)}
                  onCropRangeCommit={(next) => cropCommits.push(next.cropRange)}
                />
              </fieldset>
            </div>
            <button id="reset" type="reset">
              Reset
            </button>
          </form>
          {options.external && (
            <form
              id="external-form"
              onReset={(event) => {
                if (options.cancelReset) event.preventDefault()
              }}
            >
              <button id="external-reset" type="reset">
                External reset
              </button>
            </form>
          )}
          <button id="after">After</button>
        </div>
      </StrictMode>,
    ),
  )
}
let rendered = false
/** The hook specs call: their first render starts a fresh case. */
function renderCase(...[props, options = {}]: Parameters<typeof renderSlider>) {
  renderSlider(props, { fresh: !rendered, ...options })
  rendered = true
}
Object.assign(window, {
  renderSlider: renderCase,
  sliderEvents: events,
  sliderCommits: commits,
  sliderCropEvents: cropEvents,
  sliderCropCommits: cropCommits,
  sliderFormData: (external = false) =>
    Array.from(
      new FormData(
        document.getElementById(
          external ? 'external-form' : 'edit',
        ) as HTMLFormElement,
      ).entries(),
    ),
})
export type Hooks = { renderSlider: typeof renderCase }
renderSlider()
