import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Radio, type RadioProps } from '../../../../Radio/Radio'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!),
  events: { type: string; value: string | null }[] = []
const defaults = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]
function Fixture({
  props,
  controlled,
}: {
  props: Flat<RadioProps>
  /** `true` accepts onValueChange, `'change'` accepts native change, `'refuse'` keeps the value. */
  controlled: boolean | 'change' | 'refuse'
}) {
  const [value, setValue] = useState<string | null>(
    (props.defaultValue as string) ?? null,
  )
  return (
    <section style={{ width: 400, padding: 20 }} dir={props.dir as string}>
      <button id="before" tabIndex={0}>
        Before
      </button>
      <form
        id="form"
        onSubmit={(event) => {
          event.preventDefault()
          const data = [...new FormData(event.currentTarget).entries()]
          events.push({ type: 'submit', value: new URLSearchParams(data as string[][]).toString() })
        }}
      >
        <div data-radio-fixture>
          <Radio
            items={defaults}
            {...(props as RadioProps)}
            {...(controlled ? { value } : {})}
            onChange={(event) => {
              const input = event.target as HTMLInputElement
              events.push({ type: 'change', value: input.value })
              if (controlled === 'change') setValue(input.value)
            }}
            onValueChange={({ value }) => {
              events.push({ type: 'value', value })
              if (controlled === true) setValue(value)
            }}
          />
        </div>
        <button type="reset" tabIndex={0}>
          Reset
        </button>
      </form>
      <button id="after" tabIndex={0}>
        After
      </button>
      <form id="external" />
      <fieldset data-native style={{ display: 'flex' }}>
        <legend>Native reference</legend>
        {defaults.map((option) => (
          <label key={option.value}>
            {option.label}
            <input type="radio" name="native" value={option.value} />
          </label>
        ))}
      </fieldset>
    </section>
  )
}
function renderRadio(
  props: Flat<RadioProps> = {},
  controlled: boolean | 'change' | 'refuse' = false,
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
  radioEvents: events,
  renderRadio,
})
export type Hooks = { renderRadio: typeof renderRadio }
