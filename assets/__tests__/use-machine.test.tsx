import { act, Fragment, StrictMode, Suspense } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

// Suspense hides committed content by destroying its layout effects (the
// machine stops) while the passive useSyncExternalStore subscription stays.
// Revealing it replays the layout effects: the machine must resume where it
// was, with its subscriber still attached. React 19 StrictMode also replays
// passive effects on reveal, which masks a lost subscriber, so both modes run.
describe.each([
  ['StrictMode', StrictMode],
  ['no StrictMode', Fragment],
])('Suspense hide and reveal (%s)', (_, Mode) => {
  const TICK = 1000
  let suspended: Promise<void> | null = null
  let release = () => {}
  function Gate() {
    if (suspended) throw suspended
    return null
  }

  function suspenseFixture() {
    const entry = vi.fn()
    const cleanup = vi.fn()
    const effect = vi.fn(() => cleanup)
    const machine = createMachine<{
      context: { count: number; left: number }
      state: 'idle' | 'counting' | 'done'
      event: { type: 'INCREMENT' } | { type: 'COUNT' } | { type: 'TICK' }
    }>({
      id: 'suspense',
      initial: 'idle',
      context: { count: 0, left: 0 },
      states: {
        idle: {
          entry: [entry],
          effects: ['observe'],
          on: {
            INCREMENT: {
              actions: [
                (ctx) => {
                  ctx.count++
                },
              ],
            },
            COUNT: 'counting',
          },
        },
        counting: {
          entry: [
            (ctx) => {
              ctx.left = 3
            },
          ],
          effects: ['interval'],
          on: {
            TICK: [
              {
                guard: (ctx) => ctx.left > 1,
                actions: [
                  (ctx) => {
                    ctx.left--
                  },
                ],
              },
              {
                target: 'done',
                actions: [
                  (ctx) => {
                    ctx.left = 0
                  },
                ],
              },
            ],
          },
        },
        done: {},
      },
      implementations: {
        effects: {
          observe: effect,
          interval: (_ctx, send) => {
            const id = setInterval(() => send('TICK'), TICK)
            return () => clearInterval(id)
          },
        },
      },
    })
    function Probe() {
      const { state, send } = useMachine(machine)
      return (
        <>
          <output>{`${state.value}:${state.context.left}`}</output>
          <button onClick={() => send('INCREMENT')}>
            {state.context.count}
          </button>
          <button onClick={() => send('COUNT')}>count</button>
        </>
      )
    }
    const render = () =>
      act(async () =>
        root.render(
          <Mode>
            <Suspense fallback={<i>loading</i>}>
              <Probe />
              <Gate />
            </Suspense>
          </Mode>,
        ),
      )
    const hide = async () => {
      suspended = new Promise<void>((resolve) => {
        release = () => {
          suspended = null
          resolve()
        }
      })
      await render()
      expect(container.querySelector('i')?.textContent).toBe('loading')
    }
    const reveal = async () => {
      await act(async () => release())
      expect(container.querySelector('i')).toBeNull()
    }
    return { entry, effect, cleanup, render, hide, reveal }
  }

  const output = () => container.querySelector('output')!.textContent
  const button = (index: number) => container.querySelectorAll('button')[index]
  const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

  afterEach(() => {
    suspended = null
    vi.useRealTimers()
  })

  it('keeps re-rendering after re-suspending; entry runs once, one effect stays armed', async () => {
    const { entry, effect, cleanup, render, hide, reveal } = suspenseFixture()
    await render()
    await act(async () => button(0).click())
    expect(button(0).textContent).toBe('1')

    await hide()
    await reveal()
    await act(async () => button(0).click())

    expect(button(0).textContent).toBe('2')
    expect(entry).toHaveBeenCalledTimes(1)
    expect(effect.mock.calls.length - cleanup.mock.calls.length).toBe(1)
  })

  it('keeps a timer-driven state across hide and reveal and re-arms its timer', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { render, hide, reveal } = suspenseFixture()
    await render()
    await act(async () => button(1).click())
    await advance(TICK)
    expect(output()).toBe('counting:2')

    await hide()
    // A hidden machine is stopped: its interval is cleared, nothing ticks.
    await advance(TICK * 5)
    await reveal()
    expect(output()).toBe('counting:2')

    await advance(TICK)
    expect(output()).toBe('counting:1')
    await advance(TICK)
    expect(output()).toBe('done:0')
  })
})
