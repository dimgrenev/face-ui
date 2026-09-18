import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Calendar } from '../../Calendar/Calendar'
import { normalizeISOValue } from '../date-utils'
import { allowConsoleError, mount } from './harness'

let root: Root, host: HTMLDivElement
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.useRealTimers()
})
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<Calendar {...props} />))
const day = (iso: string) =>
  host.querySelector<HTMLElement>(`[data-date="${iso}"]`)!
const click = (node: HTMLElement) => act(async () => node.click())
const selected = () =>
  host.querySelector('[data-selected]')?.getAttribute('data-date')

describe('Calendar has one civil ISO value contract', () => {
  it('ignores defaults while their values are controlled and retains the viewed month on release', async () => {
    await render({
      value: '2026-09-12',
      defaultValue: 'ignored',
      viewDate: '2025-02-01',
      defaultViewDate: 'ignored',
    })
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'February 2025',
    )
    await render({ value: '2026-09-12', defaultViewDate: 'ignored' })
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'February 2025',
    )
  })
  it('retains the last controlled value when ownership is released', async () => {
    const change = vi.fn()
    await render({ value: '2026-09-12', onValueChange: change })
    await render({ value: '2026-09-13', onValueChange: change })
    await render({ defaultValue: 'discarded default', onValueChange: change })
    expect(selected()).toBe('2026-09-13')
    expect(change).not.toHaveBeenCalled()
    await click(day('2026-09-14'))
    expect(selected()).toBe('2026-09-14')
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-14' })
  })
  it('completes an end-only range without discarding its known endpoint', async () => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: { start: null, end: '2026-09-14' },
      onValueChange: change,
    })
    await click(day('2026-09-12'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12', end: '2026-09-14' },
    })
  })
  it('adapts an uncontrolled range to single selection without resurrecting its end', async () => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: { start: '2026-09-12', end: '2026-09-14' },
      onValueChange: change,
    })
    await render({ selection: 'single', onValueChange: change })
    await click(day('2026-09-12'))
    expect(change).not.toHaveBeenCalled()
    await render({ selection: 'range', onValueChange: change })
    expect(
      host.querySelectorAll('[role="gridcell"][aria-selected="true"]'),
    ).toHaveLength(1)
    await click(day('2026-09-13'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12', end: '2026-09-13' },
    })
  })
  it('emits the exact selected ISO day once and controlled refusal preserves the value', async () => {
    const change = vi.fn()
    await render({ value: '2026-09-12', onValueChange: change })
    await click(day('2026-09-13'))
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-13' })
    expect(selected()).toBe('2026-09-12')
    await render({ value: '2026-09-13', onValueChange: change })
    expect(selected()).toBe('2026-09-13')
    await click(day('2026-09-13'))
    expect(change).toHaveBeenCalledTimes(1)
  })
  it('keeps reversed range endpoints attached to their civil dates', async () => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: { start: '2026-09-14', end: null },
      onValueChange: change,
    })
    await click(day('2026-09-12'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12', end: '2026-09-14' },
    })
    expect(
      host.querySelectorAll('[role="gridcell"][aria-selected="true"]'),
    ).toHaveLength(3)
  })
  it('emits a civil first-of-month view without selecting and honors parent refusal', async () => {
    const navigate = vi.fn(),
      change = vi.fn()
    const props = {
      value: '2026-09-12',
      viewDate: '2025-02-23',
      onViewDateChange: navigate,
      onValueChange: change,
    }
    await render(props)
    await click(host.querySelector<HTMLElement>('[data-part="nextButton"]')!)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ viewDate: '2025-03-01' })
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'February 2025',
    )
    await render({ ...props, viewDate: '2025-03-01' })
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'March 2025',
    )
    expect(change).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledTimes(1)
  })
  it('does not use a default selection as a fallback for controlled null', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T12:00Z'))
    await render({ value: null, defaultValue: '2001-02-03' })
    expect(selected()).toBeUndefined()
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'September 2026',
    )
  })
  it('reads and validates defaults only when the uncontrolled state is initialized', async () => {
    await render({ defaultValue: '2026-09-12', defaultViewDate: '2026-09-01' })
    await click(day('2026-09-13'))
    await render({
      defaultValue: 'discarded invalid default',
      defaultViewDate: 'discarded invalid default',
    })
    expect(selected()).toBe('2026-09-13')
    expect(host.querySelector('[data-part="title"]')?.textContent).toBe(
      'September 2026',
    )
  })
  it('supports year 42 as ISO and emits the same century', async () => {
    const change = vi.fn()
    await render({ defaultValue: '0042-02-10', onValueChange: change })
    await click(day('0042-02-11'))
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: '0042-02-11' })
  })
})

describe('Date rejects civil years and instants outside the picker domain', () => {
  it.each([
    '0000-12-31',
    '0000-12-31T12:00',
    new Date('0000-12-31T12:00Z'),
    new Date('+010000-01-01T12:00Z'),
  ])('does not normalize %s into a different supported year', (value) => {
    expect(normalizeISOValue(value, 'UTC')).toBeNull()
  })
  it.each(['0001-01-01T12:00Z', '9999-12-31T12:00Z'])(
    'preserves an instant at the supported edge %s',
    (value) => {
      expect(normalizeISOValue(new Date(value), 'UTC')).toBe(value.slice(0, 16))
    },
  )
})

class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? (
      <output data-error={this.state.error.name}>
        {this.state.error.message}
      </output>
    ) : (
      this.props.children
    )
  }
}
describe('Calendar rejects invalid values instead of rolling dates or dropping constraints', () => {
  const caught = (event: ErrorEvent) => {
    if (event.error instanceof RangeError) event.preventDefault()
  }
  beforeEach(() => window.addEventListener('error', caught))
  afterEach(() => window.removeEventListener('error', caught))
  it.each([
    { value: '2026-02-30' },
    { value: new Date('2026-09-12T00:00Z') },
    { defaultValue: '2026-09-12T00:00' },
    { viewDate: 'not a date' },
    { defaultViewDate: '0000-12-31' },
    { min: '2026-02-30' },
    { max: '10000-01-01' },
    { disabledDates: ['2026-09-12', '2026-02-30'] },
    { disabledDates: new Array(1) },
    { value: { start: '2026-09-12', end: '2026-09-13' } },
    { selection: 'range', value: '2026-09-12' },
    { selection: 'range', value: { start: '2026-09-12', end: '2026-02-30' } },
  ])('reports the invalid prop %j', async (props) => {
    allowConsoleError(/error boundary you provided, Boundary/)
    await act(async () =>
      root.render(
        <Boundary>
          <Calendar {...(props as any)} />
        </Boundary>,
      ),
    )
    expect(host.querySelector('output')?.dataset.error).toBe('RangeError')
  })
})
