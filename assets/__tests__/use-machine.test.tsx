import { act, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMachine } from '../create-machine'
import { useMachine } from '../adapters/react/use-machine'
import { mount } from './harness'

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  ;({ host: container, root } = mount())
})

function fixture() {
  const cleanup = vi.fn()
  const effect = vi.fn(() => cleanup)
  const machine = createMachine<{
    context: { count: number; disabled: boolean }
    state: 'idle'
    event: { type: 'INCREMENT' }
  }>({
    id: 'lifecycle',
    initial: 'idle',
    context: { count: 0, disabled: false },
    states: {
      idle: {
        effects: ['observe'],
        on: {
          INCREMENT: {
            guard: (ctx) => !ctx.disabled,
            actions: [
              (ctx) => {
                ctx.count++
              },
            ],
          },
        },
      },
    },
    implementations: { effects: { observe: effect } },
  })
  function Probe({ disabled = false }: { disabled?: boolean }) {
    const { state, send } = useMachine(machine, { disabled })
    return (
      <button onClick={() => send('INCREMENT')}>{state.context.count}</button>
    )
  }
  return { Probe, effect, cleanup }
}

it('keeps one live service after StrictMode replay and syncs later props', async () => {
  const { Probe, effect, cleanup } = fixture()
  await act(async () =>
    root.render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    ),
  )
  expect(effect.mock.calls.length - cleanup.mock.calls.length).toBe(1)
  await act(async () => container.querySelector('button')!.click())
  expect(container.textContent).toBe('1')
  await act(async () =>
    root.render(
      <StrictMode>
        <Probe disabled />
      </StrictMode>,
    ),
  )
  await act(async () => container.querySelector('button')!.click())
  expect(container.textContent).toBe('1')
  await act(async () => root.render(null))
  expect(cleanup).toHaveBeenCalledTimes(effect.mock.calls.length)
})

it('does not start machine effects during server rendering', () => {
  const { Probe, effect } = fixture()
  renderToString(<Probe />)
  expect(effect).not.toHaveBeenCalled()
})
