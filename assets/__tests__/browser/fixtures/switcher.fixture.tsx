import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Switcher, type SwitcherProps } from '../../../../Switcher/Switcher'
import type { Flat } from '../helpers'
const root = createRoot(document.getElementById('root')!),
  events: Record<string, unknown>[] = []
function Fixture({
  props,
  controlled,
}: {
  props: Flat<SwitcherProps>
  controlled: boolean | 'change'
}) {
  const [checked, setChecked] = useState(Boolean(props.defaultChecked))
  return (
    <section style={{ width: 300, padding: 20 }}>
      <button id="before" tabIndex={0}>
        Before
      </button>
      <form
        id="form"
        onSubmit={(e) => {
          e.preventDefault()
          events.push({ type: 'submit' })
        }}
      >
        <div data-switcher-fixture>
          <Switcher
            label="Setting"
            {...(props as SwitcherProps)}
            {...(controlled ? { checked } : {})}
            {...{
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                events.push({
                  type: 'change',
                  checked: e.currentTarget.checked,
                })
                if (controlled === 'change') setChecked(e.currentTarget.checked)
              },
              onClick: (e: React.MouseEvent<HTMLInputElement>) => {
                events.push({
                  type: 'click',
                  target: (e.target as HTMLElement).tagName,
                })
                ;(
                  props.onClick as
                    | ((e: React.MouseEvent<HTMLInputElement>) => void)
                    | undefined
                )?.(e)
              },
              onCheckedChange: ({ checked }: { checked: boolean }) => {
                events.push({ type: 'checked', checked })
                if (controlled === true) setChecked(checked)
              },
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
function renderSwitcher(
  props: Flat<SwitcherProps> = {},
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
  React,
  switcherEvents: events,
  renderSwitcher,
})
export type Hooks = { renderSwitcher: typeof renderSwitcher }
