/**
 * The open-intent table of RFC §1.2 as a test matrix: every row of the idle,
 * opening and closing modes, then the additional rules. Pointer enter/leave
 * and focus are the DOM sensors that produce ENTER{key} and LEAVE.
 */
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useHoverIntent,
  type HoverIntentOptions,
} from '../adapters/react/use-hover-intent'
import { restoreFocus } from '../runtime/layers'
import { mount } from './harness'

function Harness(options: HoverIntentOptions) {
  const hover = useHoverIntent(options)
  return (
    <>
      <button id="a" {...hover.trigger('a')}>
        A
      </button>
      <button id="b" {...hover.trigger('b')}>
        B
      </button>
      <div id="content" tabIndex={-1} {...hover.content}>
        <button id="inside">Inside</button>
      </div>
      <button id="outside">Outside</button>
    </>
  )
}

let root: ReturnType<typeof mount>['root']
let propose: ReturnType<typeof vi.fn<(next: string | null) => void>>
let options: Omit<HoverIntentOptions, 'onValueChange'>
const byId = (id: string) => document.getElementById(id)!
const render = (next: Partial<HoverIntentOptions> = {}) => {
  options = { ...options, ...next }
  return act(async () =>
    root.render(
      <StrictMode>
        <Harness {...options} onValueChange={propose} />
      </StrictMode>,
    ),
  )
}
const pointer = (id: string, type: 'pointerover' | 'pointerout', pointerType = 'mouse') =>
  act(async () => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    byId(id).dispatchEvent(event)
  })
/** ENTER{key} from the pointer. */
const enter = (id: string) => pointer(id, 'pointerover')
/** LEAVE: the pointer leaves the region it was on and nothing else holds the intent. */
const leave = (id: string) => pointer(id, 'pointerout')
const focus = (id: string) => act(async () => byId(id).focus())
const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms)
  })
const proposals = () => propose.mock.calls.map(([next]) => next)

beforeEach(async () => {
  vi.useFakeTimers()
  ;({ root } = mount())
  propose = vi.fn<(next: string | null) => void>()
  options = { value: null, openDelay: 100, closeDelay: 100 }
  await render()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('idle', () => {
  it('ENTER{k} with k === value does nothing', async () => {
    await render({ value: 'a' })
    await enter('a')
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('ENTER{k} with openDelay > 0 opens k after the delay', async () => {
    await enter('a')
    await advance(99)
    expect(proposals()).toEqual([])
    await advance(1)
    expect(proposals()).toEqual(['a'])
  })
  it('ENTER{k} with openDelay 0 proposes k at once', async () => {
    await render({ openDelay: 0 })
    await enter('a')
    expect(proposals()).toEqual(['a'])
  })
  it('LEAVE with an open key and closeDelay > 0 closes after the delay', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await advance(99)
    expect(proposals()).toEqual([])
    await advance(1)
    expect(proposals()).toEqual([null])
  })
  it('LEAVE with an open key and closeDelay 0 proposes null at once', async () => {
    await render({ value: 'a', closeDelay: 0 })
    await enter('a')
    await leave('a')
    expect(proposals()).toEqual([null])
  })
  it('LEAVE with nothing open does nothing', async () => {
    await render({ openDelay: 0 })
    await focus('a')
    propose.mockClear()
    await focus('outside')
    await advance(1000)
    expect(proposals()).toEqual([])
  })
})

describe('opening(t)', () => {
  it('ENTER{k ≠ t} restarts the opening for k', async () => {
    await enter('a')
    await advance(60)
    await focus('b')
    await advance(99)
    expect(proposals()).toEqual([])
    await advance(1)
    expect(proposals()).toEqual(['b'])
  })
  it('ENTER{t} again keeps the running delay', async () => {
    await enter('a')
    await advance(60)
    await focus('a')
    await advance(40)
    expect(proposals()).toEqual(['a'])
  })
  it('LEAVE returns to idle and cancels', async () => {
    await enter('a')
    await advance(60)
    await leave('a')
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('the timer proposes t once', async () => {
    await focus('a')
    await advance(1000)
    expect(proposals()).toEqual(['a'])
  })
})

describe('closing', () => {
  beforeEach(async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await advance(50)
  })
  it('ENTER{value} returns to idle and cancels', async () => {
    await enter('a')
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('ENTER on the content counts as ENTER{value}', async () => {
    await enter('content')
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('ENTER{k ≠ value} proposes k at once (moving between triggers)', async () => {
    await enter('b')
    expect(proposals()).toEqual(['b'])
    await advance(1000)
    expect(proposals()).toEqual(['b'])
  })
  it('LEAVE does not restart the delay', async () => {
    // Focus returned by a layer holds the intent without an ENTER; its blur is a second LEAVE.
    await act(async () => restoreFocus(byId('a')))
    await focus('outside')
    await advance(49)
    expect(proposals()).toEqual([])
    await advance(1)
    expect(proposals()).toEqual([null])
  })
  it('the timer proposes null once', async () => {
    await advance(1000)
    expect(proposals()).toEqual([null])
  })
})

describe('additional rules', () => {
  it('disabled during opening returns to idle; input is ignored while disabled', async () => {
    await enter('a')
    await advance(50)
    await render({ disabled: true })
    await advance(1000)
    await enter('b')
    await focus('b')
    await advance(1000)
    expect(proposals()).toEqual([])
    await render({ disabled: false })
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('disabled during closing returns to idle', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await render({ disabled: true })
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('an external value change during opening returns to idle', async () => {
    await enter('a')
    await advance(50)
    await render({ value: 'b' })
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('an external value change during closing returns to idle', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await render({ value: null })
    await advance(1000)
    expect(proposals()).toEqual([])
  })
  it('committing its own proposal is not an external change', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await enter('b')
    // Leaving before the parent commits 'b' starts closing again...
    await leave('b')
    // ...and that commit, being the proposal, does not cancel it.
    await render({ value: 'b' })
    await advance(100)
    expect(proposals()).toEqual(['b', null])
  })
  it('a refused proposal is proposed again on the next ENTER', async () => {
    await render({ openDelay: 0 })
    await enter('a')
    await leave('a')
    await enter('a')
    expect(proposals()).toEqual(['a', 'a'])
  })
  it('focus restored by a closing layer is not ENTER', async () => {
    await act(async () => restoreFocus(byId('a')))
    await advance(1000)
    expect(proposals()).toEqual([])
    await focus('outside')
    await focus('a')
    await advance(100)
    expect(proposals()).toEqual(['a'])
  })
  it('focus: false ignores keyboard focus', async () => {
    await render({ focus: false, openDelay: 0 })
    await focus('a')
    expect(proposals()).toEqual([])
  })
  it('focus and pointer each hold the intent until both leave', async () => {
    await render({ value: 'a', closeDelay: 0 })
    await focus('a')
    await enter('a')
    await focus('outside')
    expect(proposals()).toEqual([])
    await leave('a')
    expect(proposals()).toEqual([null])
  })
  it('focus moving between a trigger and the content keeps the intent', async () => {
    await render({ value: 'a', closeDelay: 0 })
    await focus('a')
    await focus('inside')
    await focus('b')
    await advance(100)
    expect(proposals()).toEqual(['b'])
    propose.mockClear()
    await render({ value: 'b' })
    await focus('outside')
    expect(proposals()).toEqual([null])
  })
  it('touch pointers and cancelled events are not hover', async () => {
    await render({ openDelay: 0 })
    await pointer('a', 'pointerover', 'touch')
    await act(async () => {
      const event = new FocusEvent('focusin', { bubbles: true, cancelable: true })
      event.preventDefault()
      byId('b').dispatchEvent(event)
    })
    expect(proposals()).toEqual([])
  })
  it('a delay change restarts the pending interval', async () => {
    await enter('a')
    await advance(60)
    await render({ openDelay: 20 })
    await advance(19)
    expect(proposals()).toEqual([])
    await advance(1)
    expect(proposals()).toEqual(['a'])
  })
  it('unmounting cancels a pending delay', async () => {
    await enter('a')
    await act(async () => root.render(null))
    await advance(1000)
    expect(proposals()).toEqual([])
  })
})

/**
 * A proposal renders in a later task than the timer that made it. The parent
 * here commits by re-rendering, so each test puts input in that gap.
 */
describe('input that arrives before the own proposal commits', () => {
  it('LEAVE after the opening proposal closes once the open commits', async () => {
    await enter('a')
    await advance(100)
    await leave('a')
    await render({ value: 'a' })
    await advance(99)
    expect(proposals()).toEqual(['a'])
    await advance(1)
    expect(proposals()).toEqual(['a', null])
  })
  it('keyboard focus leaving after the opening proposal closes once the open commits', async () => {
    await render({ closeDelay: 0 })
    await focus('a')
    await advance(100)
    await focus('outside')
    await render({ value: 'a' })
    expect(proposals()).toEqual(['a', null])
  })
  it('ENTER after the closing proposal opens again once the close commits', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await advance(100)
    await enter('a')
    await render({ value: null })
    await advance(99)
    expect(proposals()).toEqual([null])
    await advance(1)
    expect(proposals()).toEqual([null, 'a'])
  })
  it('keyboard focus arriving after the closing proposal opens again once the close commits', async () => {
    await render({ value: 'a', openDelay: 0 })
    await enter('a')
    await leave('a')
    await advance(100)
    await focus('a')
    await render({ value: null })
    expect(proposals()).toEqual([null, 'a'])
  })
  it('focus a layer restores after the closing proposal does not reopen', async () => {
    await render({ value: 'a', openDelay: 0 })
    await enter('a')
    await leave('a')
    await advance(100)
    await act(async () => restoreFocus(byId('a')))
    await render({ value: null })
    await advance(1000)
    expect(proposals()).toEqual([null])
  })
  it('LEAVE then ENTER before the open commits keeps it open without a second proposal', async () => {
    await enter('a')
    await advance(100)
    await leave('a')
    await enter('a')
    await render({ value: 'a' })
    await advance(1000)
    expect(proposals()).toEqual(['a'])
  })
  it('ENTER then LEAVE before the close commits keeps it closed', async () => {
    await render({ value: 'a' })
    await enter('a')
    await leave('a')
    await advance(100)
    await enter('a')
    await leave('a')
    await render({ value: null })
    await advance(1000)
    expect(proposals()).toEqual([null])
  })
})
