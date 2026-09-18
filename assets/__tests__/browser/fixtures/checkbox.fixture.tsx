import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Checkbox, type CheckboxProps } from '../../../../Checkbox/Checkbox'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!),
  events: { type: string; checked: boolean | string }[] = []
function Fixture({
  props,
  controlled,
}: {
  props: Flat<CheckboxProps>
  controlled: boolean | 'change'
}) {
  const [checked, setChecked] = useState<boolean | 'indeterminate'>(
    (props.defaultChecked as boolean | 'indeterminate') ?? false,
  )
  return (
    <section style={{ width: 300, padding: 20 }}>
      <button tabIndex={0} id="before">
        Before
      </button>
      <form id="form">
        <div data-checkbox-fixture>
          <Checkbox
            label="Choice"
            {...(props as CheckboxProps)}
            {...(controlled ? { checked } : {})}
            {...{
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                events.push({
                  type: 'change',
                  checked: event.currentTarget.checked,
                })
                if (controlled === 'change')
                  setChecked(event.currentTarget.checked)
              },
            }}
            onCheckedChange={({ checked }) => {
              events.push({ type: 'checked', checked })
              if (controlled === true) setChecked(checked)
            }}
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
      <form id="external" onSubmit={(e) => e.preventDefault()} />
    </section>
  )
}
function renderCheckbox(
  props: Flat<CheckboxProps> = {},
  controlled: boolean | 'change' = false,
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
  checkboxEvents: events,
  renderCheckbox,
})
export type Hooks = { renderCheckbox: typeof renderCheckbox }
