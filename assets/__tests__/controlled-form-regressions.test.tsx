// @vitest-environment jsdom
import React, { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Checkbox } from '../../Checkbox/Checkbox'
import { Switcher } from '../../Switcher/Switcher'
import { Input } from '../../Input/Input'

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

for (const [name, Component, role] of [
  ['Checkbox', Checkbox, 'checkbox'],
  ['Switcher', Switcher, 'switch'],
] as const) {
  it(`${name} accepts controlled updates while disabled without emitting change`, async () => {
    const onCheckedChange = vi.fn()
    await act(async () =>
      root.render(
        <StrictMode>
          <Component
            checked={false}
            disabled
            label="Choice"
            onCheckedChange={onCheckedChange}
          />
        </StrictMode>,
      ),
    )
    await act(async () =>
      root.render(
        <StrictMode>
          <Component
            checked
            disabled
            label="Choice"
            onCheckedChange={onCheckedChange}
          />
        </StrictMode>,
      ),
    )
    expect(
      container.querySelector(`[role="${role}"]`)?.getAttribute('aria-checked'),
    ).toBe('true')
    expect(onCheckedChange).not.toHaveBeenCalled()
    await act(async () =>
      root.render(
        <StrictMode>
          <Component checked label="Choice" onCheckedChange={onCheckedChange} />
        </StrictMode>,
      ),
    )
    await act(async () =>
      container.querySelector<HTMLElement>(`[role="${role}"]`)!.click(),
    )
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: false })
    expect(
      container.querySelector(`[role="${role}"]`)?.getAttribute('aria-checked'),
    ).toBe('true')
  })
}

it('does not echo parent input updates or call a removed callback', async () => {
  const onValueChange = vi.fn()
  await act(async () =>
    root.render(<Input value="first" onValueChange={onValueChange} />),
  )
  await act(async () =>
    root.render(<Input value="second" onValueChange={onValueChange} />),
  )
  expect(onValueChange).not.toHaveBeenCalled()
  expect(container.querySelector('input')?.value).toBe('second')
  await act(async () => root.render(<Input value="second" />))
  const input = container.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, 'third')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(onValueChange).not.toHaveBeenCalled()
  expect(input.value).toBe('second')
})
