import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Date as DateField, type DateProps } from '../../Date/Date'
import type { DateValueExternal } from '../../assets/date-utils'
import {
  Calendar,
  type CalendarProps,
  type CalendarRangeValue,
} from '../../Calendar/Calendar'
import '../../assets/styles/index.css'

const root = createRoot(document.getElementById('root')!),
  events: unknown[] = []
class DateValidationBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? (
      <output data-date-error={this.state.error.name}>
        {this.state.error.message}
      </output>
    ) : (
      this.props.children
    )
  }
}
let validationKey = 0
function Fixture({
  props,
  controlled,
  calendar,
}: {
  props: Record<string, unknown>
  controlled: boolean
  calendar: boolean
}) {
  const [value, setValue] = useState(props.defaultValue ?? null)
  const [viewDate, setViewDate] = useState(props.defaultViewDate)
  return (
    <section
      style={{
        width: 360,
        maxWidth: '100%',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <button id="before" tabIndex={0}>
        Before
      </button>
      <form id="form" onSubmit={(event) => event.preventDefault()}>
        {calendar ? (
          <Calendar
            {...(props as CalendarProps)}
            {...(controlled
              ? { value: value as any, viewDate: viewDate as any }
              : {})}
            onValueChange={(details: {
              value: string | CalendarRangeValue
            }) => {
              events.push({ type: 'value', ...details })
              if (controlled) setValue(details.value)
            }}
            onViewDateChange={(details) => {
              events.push({ type: 'view', ...details })
              if (controlled) setViewDate(details.viewDate)
            }}
          />
        ) : (
          <DateField
            label="Deadline"
            {...(props as DateProps)}
            {...(controlled ? { value: value as any } : {})}
            onValueChange={(details: { value: DateValueExternal }) => {
              events.push({ type: 'value', ...details })
              if (controlled) setValue(details.value)
            }}
            onOpenChange={(details) =>
              events.push({ type: 'open', ...details })
            }
          />
        )}
        <button type="reset" tabIndex={0}>
          Reset
        </button>
        <button type="submit" tabIndex={0}>
          Submit
        </button>
      </form>
      <button id="after" tabIndex={0}>
        After
      </button>
      <form id="external" />
    </section>
  )
}
Object.assign(window, {
  React,
  dateEvents: events,
  renderDateValidation(props: Record<string, unknown>, calendar = false) {
    flushSync(() =>
      root.render(
        <DateValidationBoundary key={validationKey++}>
          {calendar ? (
            <Calendar {...(props as CalendarProps)} />
          ) : (
            <DateField {...(props as DateProps)} />
          )}
        </DateValidationBoundary>,
      ),
    )
  },
  renderDate(
    props: Record<string, unknown> = {},
    controlled = false,
    key = 'field',
    calendar = false,
  ) {
    flushSync(() =>
      root.render(
        <StrictMode>
          <Fixture
            key={key}
            props={props}
            controlled={controlled}
            calendar={calendar}
          />
        </StrictMode>,
      ),
    )
  },
})
