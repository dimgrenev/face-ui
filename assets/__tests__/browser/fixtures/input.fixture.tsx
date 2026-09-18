import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Input, type InputProps } from '../../../../Input/Input'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!)
const events: { type: string; value: string }[] = []
function Fixture({
  props,
  controlled,
}: {
  props: Flat<InputProps>
  controlled: boolean
}) {
  const [value, setValue] = useState(String(props.defaultValue ?? ''))
  return (
    <section id="fixture" style={{ width: 420, padding: 16 }}>
      <button tabIndex={0} id="before">Before</button>
      <form
        id="form"
        onSubmit={(event) => {
          event.preventDefault()
          events.push({
            type: 'submit',
            value: String(new FormData(event.currentTarget).get('field')),
          })
        }}
      >
        <Input
          {...(props as InputProps)}
          name="field"
          label={
            props.label === undefined
              ? 'Field'
              : (props.label as React.ReactNode)
          }
          {...(controlled ? { value } : {})}
          onChange={(event) => {
            events.push({ type: 'change', value: event.currentTarget.value })
            if (controlled) setValue(event.currentTarget.value)
          }}
          onValueChange={({ value }) => events.push({ type: 'value', value })}
        />
        <button tabIndex={0} type="reset">Reset</button>
        <button tabIndex={0} type="submit">Submit</button>
      </form>
      <button tabIndex={0} id="after">After</button>
    </section>
  )
}
function renderInput(
  props: Flat<InputProps> = {},
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
  inputEvents: events,
  renderInput,
})
export type Hooks = { renderInput: typeof renderInput }
