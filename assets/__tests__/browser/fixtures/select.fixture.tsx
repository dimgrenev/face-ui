import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Select, type SelectProps } from '../../../../Select/Select'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!),
  events: unknown[] = []
const options = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty value' },
  { value: 'locked', label: 'Locked', disabled: true },
  { value: 'b', label: 'Beta' },
  { value: 'blue', label: 'Blue' },
]
function Fixture({
  props,
  controlled,
}: {
  props: Flat<SelectProps>
  controlled: boolean
}) {
  const [value, setValue] = useState(props.defaultValue ?? null)
  return (
    <section
      style={{
        width: 320,
        maxWidth: '100%',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <button id="before" tabIndex={0}>
        Before
      </button>
      <form id="form" onSubmit={(e) => e.preventDefault()}>
        <div data-select-fixture>
          <Select
            label="Plan"
            options={options}
            {...(props as SelectProps)}
            {...(controlled ? { value: value as any } : {})}
            {...{
              onClick: (e: React.MouseEvent) => {
                events.push({ type: 'click' })
                ;(props.onClick as any)?.(e)
              },
            }}
            onValueChange={(details: {
              value: string | readonly string[] | null
            }) => {
              events.push({ type: 'value', ...details })
              if (controlled) setValue(details.value)
            }}
            onOpenChange={(details) =>
              events.push({ type: 'open', ...details })
            }
          />
        </div>
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
function renderSelect(
  props: Flat<SelectProps> = {},
  controlled = false,
  key = 'field',
) {
  flushSync(() =>
    root.render(
      <StrictMode>
        <Fixture key={key} props={props} controlled={controlled} />
      </StrictMode>,
    ),
  )
}
Object.assign(window, {
  React,
  selectEvents: events,
  renderSelect,
})
export type Hooks = { renderSelect: typeof renderSelect }
