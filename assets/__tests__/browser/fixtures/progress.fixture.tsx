import { StrictMode, Fragment, type ComponentType, type RefAttributes } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Progress } from '../../../../Progress/Progress'
import { Meter, type MeterProps } from '../../../../Meter/Meter'
/** Either indicator's props; a meter given `value: null` shows how it treats raw input. */
type RangeProps = Omit<MeterProps, 'value'> & { value?: number | null }
const root = createRoot(document.getElementById('root')!)
const renderRange = (
  kind = 'progress',
  props: RangeProps = {},
  options: {
    width?: number
    zoom?: number
    direction?: string
    theme?: string
    format?: boolean
    empty?: boolean
    foreign?: boolean
  } = {},
) => {
  document.documentElement.dir = options.direction ?? 'ltr'
  document.documentElement.dataset.theme = options.theme ?? 'light'
  Object.assign(document.body.style, {
    margin: '16px',
    color: 'var(--uf-color-fg)',
    background: 'var(--uf-color-bg)',
  })
  const Component = (kind === 'meter' ? Meter : Progress) as ComponentType<
    RangeProps & RefAttributes<HTMLDivElement>
  >
  flushSync(() =>
    root.render(
      <StrictMode>
        <div>
          <h1>Range indicator verification</h1>
          <button id="before" tabIndex={0}>
            Before
          </button>
          <span id="external">External label</span>
          <span id="description">Details</span>
          <div
            id="frame"
            style={{
              width: options.width ?? 420,
              maxWidth: '100%',
              zoom: options.zoom ?? 1,
            }}
          >
            <Component
              label="Transfer"
              value={28}
              {...props}
              {...(options.format && {
                formatValue: ({ value, max }) => `${value} из ${max} файлов`,
              })}
              {...(options.empty && {
                label: (
                  <Fragment>
                    {[false, ' ', <Fragment key="empty">{null}</Fragment>]}
                  </Fragment>
                ),
              })}
              {...(options.foreign && {
                label: (
                  <span
                    data-part="track"
                    data-testid="foreign"
                    style={{
                      display: 'inline-block',
                      width: 77,
                      height: 19,
                      background: 'rgb(123, 45, 67)',
                    }}
                  >
                    Label
                  </span>
                ),
              })}
              ref={(node) => {
                ;(window as any).rangeRoot = node
              }}
            />
          </div>
          <button id="after" tabIndex={0}>
            After
          </button>
        </div>
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  renderRange,
})
export type Hooks = { renderRange: typeof renderRange }
renderRange()
