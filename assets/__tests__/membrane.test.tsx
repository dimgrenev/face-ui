// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Membrane } from '../adapters/react/Membrane'
import { Button } from '../../Button/Button'
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

it('forwards a control padding click once, with focus, modifiers and the actual target', async () => {
  const onClick = vi.fn()
  const onParentClick = vi.fn()
  await act(async () =>
    root.render(
      <div onClick={onParentClick}>
        <Button onClick={onClick} text="Save" />
      </div>,
    ),
  )
  const membrane = container.querySelector('.uf-membrane')!
  const button = container.querySelector('button')!
  await act(async () =>
    membrane.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    ),
  )
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(onClick.mock.calls[0][0].shiftKey).toBe(true)
  expect(onParentClick).toHaveBeenCalledTimes(1)
  expect(onParentClick.mock.calls[0][0].target).toBe(button)
  expect(document.activeElement).toBe(button)
})

it('keeps content membranes passive, including nested buttons and blank content', async () => {
  const onClick = vi.fn()
  await act(async () =>
    root.render(
      <Membrane>
        <div>
          <span>Content</span>
          <button onClick={onClick}>Delete</button>
        </div>
      </Membrane>,
    ),
  )
  await act(async () => {
    container.querySelector<HTMLElement>('.uf-membrane')!.click()
    container
      .querySelector('div > span')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(onClick).not.toHaveBeenCalled()
})

it('does not steal a nested action or activate disabled controls', async () => {
  const row = vi.fn()
  const action = vi.fn()
  await act(async () =>
    root.render(
      <Membrane interactive>
        <div onClick={row}>
          <button
            onClick={(event) => {
              event.stopPropagation()
              action()
            }}
          >
            Action
          </button>
        </div>
      </Membrane>,
    ),
  )
  await act(async () => container.querySelector('button')!.click())
  expect(action).toHaveBeenCalledTimes(1)
  expect(row).not.toHaveBeenCalled()
  await act(async () =>
    root.render(<Button disabled onClick={row} text="Save" />),
  )
  await act(async () =>
    container.querySelector<HTMLElement>('.uf-membrane')!.click(),
  )
  expect(row).not.toHaveBeenCalled()
})

it('focuses the explicit input target instead of a layout wrapper', async () => {
  await act(async () => root.render(<Input membrane label="Name" />))
  const input = container.querySelector('input')!
  const membrane = input.closest('.uf-membrane') as HTMLElement
  await act(async () => membrane.click())
  expect(document.activeElement).toBe(input)
})

it('forwards through an inactive child membrane to its actual control', async () => {
  const onClick = vi.fn()
  await act(async () =>
    root.render(
      <Membrane interactive>
        <Button membrane={false} text="Choose month" onClick={onClick} />
      </Membrane>,
    ),
  )
  await act(async () =>
    container.querySelector<HTMLElement>('.uf-membrane')!.click(),
  )
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(container.querySelector('button'))
})
