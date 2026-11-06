import { StrictMode, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Rating, type RatingProps } from '../../../../Rating/Rating'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!)
const events: number[] = []
let sequence = 0
const ref = (node: HTMLDivElement | null) => {
  Object.assign(window, { ratingRoot: node })
}
const renderRating = (
  props: Flat<RatingProps> = {},
  options: {
    fresh?: boolean
    direction?: string
    theme?: string
    width?: number
    zoom?: number
    empty?: boolean
    format?: boolean
    external?: boolean
    unnamed?: boolean
    fieldsetDisabled?: boolean
    cancelReset?: boolean
    cancelClick?: boolean
    cancelCapture?: boolean
    cancelKey?: boolean
    accept?: boolean
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
          <h1>Rating verification</h1>
          <button tabIndex={0} id="before">
            Before
          </button>
          <span id="external">External label</span>
          <span id="description">Details</span>
          <form
            id="review"
            onSubmit={(event) => {
              event.preventDefault()
              Object.assign(window, { ratingSubmitted: true })
            }}
            onReset={(event) => {
              if (options.cancelReset) event.preventDefault()
            }}
          >
            <div
              id="frame"
              style={{
                width: options.width ?? 420,
                maxWidth: '100%',
                zoom: options.zoom ?? 1,
              }}
            >
              <fieldset
                disabled={options.fieldsetDisabled}
                style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}
              >
                <legend>Review score</legend>
                <Rating
                  key={sequence}
                  ref={ref}
                  label="Your rating"
                  name={options.unnamed ? undefined : 'score'}
                  form={options.external ? 'external-form' : undefined}
                  {...(props as RatingProps)}
                  {...(options.empty && {
                    label: (
                      <Fragment>
                        {[false, ' ', <Fragment key="empty" />]}
                      </Fragment>
                    ),
                  })}
                  {...(options.format && {
                    formatValue: ({ value, max }) => `${value} из ${max} звёзд`,
                  })}
                  onClick={(event) => {
                    if (options.cancelClick) event.preventDefault()
                  }}
                  onClickCapture={(event) => {
                    if (options.cancelCapture) event.preventDefault()
                  }}
                  onKeyDown={(event) => {
                    if (options.cancelKey) event.preventDefault()
                  }}
                  onValueChange={({ value }) => {
                    events.push(value)
                    if (options.accept)
                      renderRating(
                        { ...props, value },
                        { ...options, fresh: false },
                      )
                  }}
                />
              </fieldset>
            </div>
            <button tabIndex={0} id="reset" type="reset">
              Reset
            </button>
            <button tabIndex={0} id="submit" type="submit">
              Submit
            </button>
          </form>
          {options.external && (
            <form
              id="external-form"
              onReset={(event) => {
                if (options.cancelReset) event.preventDefault()
              }}
            >
              <button tabIndex={0} id="external-reset" type="reset">
                External reset
              </button>
            </form>
          )}
          <button tabIndex={0} id="after">
            After
          </button>
        </div>
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  renderRating,
  ratingEvents: events,
  ratingFormData: (external = false) =>
    Array.from(
      new FormData(
        document.getElementById(
          external ? 'external-form' : 'review',
        ) as HTMLFormElement,
      ).entries(),
    ),
})
export type Hooks = { renderRating: typeof renderRating }
renderRating()
