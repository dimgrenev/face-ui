import { StrictMode, type SyntheticEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Calendar, type CalendarProps } from '../../../../Calendar/Calendar'
import type { Flat } from '../helpers'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: unknown[] = []
const ref = (node: HTMLDivElement | null) => {
  Object.assign(window, { calendarRoot: node })
}
type Options = {
  label?: string
  fieldsetDisabled?: boolean
  preventFocus?: boolean
  cancelKey?: boolean
  cancelClick?: boolean
}
function Fixture({
  props,
  options,
}: {
  props: Flat<CalendarProps>
  options: Options
}) {
  const record = (name: string, event: SyntheticEvent) => {
    events.push({
      type: name,
      target: (event.currentTarget as HTMLElement).dataset.part,
      prevented: event.defaultPrevented,
    })
  }
  return (
    <div
      style={{
        padding: 16,
        width: 500,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h1>Calendar contract</h1>
      <span id="external-label">{options.label ?? 'Release dates'}</span>
      <p id="external-help">Only available days can be selected.</p>
      <button id="before" tabIndex={0}>
        Before
      </button>
      <form id="form" onSubmit={(event) => event.preventDefault()}>
        <fieldset
          disabled={options.fieldsetDisabled}
          style={{ margin: 0, border: 0, padding: 0 }}
        >
          <Calendar
            {...(props as CalendarProps)}
            ref={ref}
            {...({
              onFocusCapture: (event: SyntheticEvent) => {
                record('focus-capture', event)
                if (options.preventFocus) event.preventDefault()
              },
              onFocus: (event: SyntheticEvent) => {
                record('focus', event)
                if (options.preventFocus) event.preventDefault()
              },
              onBlurCapture: (event: SyntheticEvent) =>
                record('blur-capture', event),
              onBlur: (event: SyntheticEvent) => record('blur', event),
              onKeyDownCapture: (event: React.KeyboardEvent) => {
                record('key-capture', event)
                if (options.cancelKey) event.preventDefault()
              },
              onKeyDown: (event: SyntheticEvent) => record('key', event),
              onClickCapture: (event: SyntheticEvent) => {
                record('click-capture', event)
                if (options.cancelClick) event.preventDefault()
              },
              onClick: (event: SyntheticEvent) => record('click', event),
            } as any)}
            onValueChange={(details: any) =>
              events.push({ type: 'value', ...details })
            }
            onViewDateChange={(details) =>
              events.push({ type: 'view', ...details })
            }
          />
        </fieldset>
        <button type="submit" tabIndex={0}>
          Submit
        </button>
      </form>
      <button id="after" tabIndex={0}>
        After
      </button>
    </div>
  )
}
function renderCalendarDOM(
  props: Flat<CalendarProps> = {},
  options: Options = {},
) {
  flushSync(() =>
    root.render(
      <StrictMode>
        <Fixture props={props} options={options} />
      </StrictMode>,
    ),
  )
}
Object.assign(window, { calendarDomEvents: events, renderCalendarDOM })
export type Hooks = { renderCalendarDOM: typeof renderCalendarDOM }
