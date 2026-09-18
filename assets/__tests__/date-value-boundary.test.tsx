import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField, type DateProps } from '../../Date/Date'
import { normalizeISOValue, parseDateLike } from '../date-utils'
import { allowConsoleError, mount } from './harness'

let root: Root, host: HTMLDivElement
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: Record<string, unknown>) =>
  act(async () =>
    root.render(
      <form>
        <DateField
          {...(props as DateProps)}
          name="deadline"
          format="yyyy-MM-dd HH:mm"
        />
      </form>,
    ),
  )
const reset = () =>
  act(async () => {
    host.querySelector('form')!.reset()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
const formValue = () =>
  new FormData(host.querySelector('form')!).get('deadline')
const click = (node: Element) =>
  act(async () =>
    node.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
const open = () => click(host.querySelector('[role="combobox"]')!)
const day = (iso: string) => document.querySelector(`[data-date="${iso}"]`)!

describe('Date has an explicit input grammar', () => {
  it.each([
    ' 2026-09-12 ',
    '09/12/2026',
    'September 12, 2026',
    '2026',
    '2026-09',
    '2026-9-12',
    '2026-09-12 09:35',
    '2026-09-12T24:00Z',
  ])(
    'rejects ambiguous or unsupported input %s without interpreting it in the browser zone',
    (value) => {
      expect(normalizeISOValue(value, 'UTC')).toBeNull()
      expect(parseDateLike(value)).toBeNull()
    },
  )
  it.each([
    '2026-09-12T09:35+03:00',
    '2026-09-12T09:35+0300',
    '2026-09-12T06:35Z',
    '2026-09-12T03:05-03:30',
  ])('retains the explicit instant %s', (value) => {
    expect(normalizeISOValue(value, 'UTC')).toBe('2026-09-12T06:35')
  })
})

describe('Date uses the same value model for display, interaction and forms', () => {
  it('keeps an uncontrolled civil value and reset default when the timezone changes', async () => {
    const change = vi.fn()
    const props = {
      mode: 'datetime',
      defaultValue: new Date('2026-09-11T23:30Z'),
      timezone: 'Asia/Tokyo',
      onValueChange: change,
    }
    await render(props)
    expect(formValue()).toBe('2026-09-12T08:30')
    await render({ ...props, timezone: 'America/Los_Angeles' })
    expect(formValue()).toBe('2026-09-12T08:30')
    await reset()
    expect(formValue()).toBe('2026-09-12T08:30')
    expect(change).not.toHaveBeenCalled()
  })
  it('reprojects a controlled instant in the new timezone and retains that civil value after release', async () => {
    const change = vi.fn()
    const props = {
      mode: 'datetime',
      value: new Date('2026-09-11T23:30Z'),
      timezone: 'Asia/Tokyo',
      onValueChange: change,
    }
    await render(props)
    expect(formValue()).toBe('2026-09-12T08:30')
    await render({ ...props, timezone: 'America/Los_Angeles' })
    expect(formValue()).toBe('2026-09-11T16:30')
    await reset()
    expect(formValue()).toBe('2026-09-11T16:30')
    await render({ ...props, value: undefined, timezone: 'UTC' })
    expect(formValue()).toBe('2026-09-11T16:30')
    expect(change).not.toHaveBeenCalled()
  })
  it('accepts a real Date created in another realm', async () => {
    const foreignDate = runInNewContext("new Date('2026-09-11T23:30Z')")
    expect(foreignDate instanceof Date).toBe(false)
    expect(normalizeISOValue(foreignDate, 'Asia/Tokyo')).toBe(
      '2026-09-12T08:30',
    )
    await render({ value: foreignDate, timezone: 'Asia/Tokyo' })
    expect(formValue()).toBe('2026-09-12')
  })
  it('preserves synchronous acceptance of a native candidate by a controlled parent', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<string | null>('2026-09-12')
      return (
        <form>
          <DateField
            name="deadline"
            value={value}
            onValueChange={({ value }) => flushSync(() => setValue(value))}
          />
        </form>
      )
    }
    await act(async () => root.render(<Controlled />))
    const proxy = host.querySelector('select')!
    await act(async () => {
      proxy.add(new Option('Next day', '2026-09-13'))
      proxy.value = '2026-09-13'
      proxy.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(formValue()).toBe('2026-09-13')
    await reset()
    expect(formValue()).toBe('2026-09-13')
  })
  it.each([' 2026-09-12 ', '2026-09-14'])(
    'restores the accepted form value when a native proxy attempts %s',
    async (attempted) => {
      const change = vi.fn()
      await render({
        defaultValue: '2026-09-12',
        disabledDates: ['2026-09-14'],
        onValueChange: change,
      })
      const proxy = host.querySelector('select')!
      await act(async () => {
        proxy.add(new Option(attempted, attempted))
        proxy.value = attempted
        proxy.dispatchEvent(new Event('change', { bubbles: true }))
      })
      expect(change).not.toHaveBeenCalled()
      expect(proxy.value).toBe('2026-09-12')
      expect(formValue()).toBe('2026-09-12')
    },
  )
  it('rejects a native interval with extra segments instead of committing its first two', async () => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: { start: '2026-09-12', end: '2026-09-13' },
      onValueChange: change,
    })
    const proxy = host.querySelector('select')!
    await act(async () => {
      const attempted = '2026-09-14/2026-09-15/ignored'
      proxy.add(new Option(attempted, attempted))
      proxy.value = attempted
      proxy.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(change).not.toHaveBeenCalled()
    expect(formValue()).toBe('2026-09-12/2026-09-13')
  })
  it.each(['date', 'month', 'year'])(
    '%s drops the clock after converting an instant into its owning timezone',
    async (mode) => {
      await render({
        mode,
        value: new Date('2026-09-11T23:30:00Z'),
        timezone: 'Asia/Tokyo',
      })
      expect(formValue()).toBe('2026-09-12')
    },
  )
  it.each(['time', 'datetime'])(
    '%s initializes a civil day at midnight and submits the clock shown',
    async (mode) => {
      await render({ mode, value: '2026-09-12' })
      expect(formValue()).toBe('2026-09-12T00:00')
    },
  )
  it('orders external range endpoints before display and form serialization', async () => {
    await render({
      selection: 'range',
      value: { start: '2026-09-14', end: '2026-09-12' },
    })
    expect(formValue()).toBe('2026-09-12/2026-09-14')
  })
  it('completes an end-only Date range with the known end retained', async () => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: { start: null, end: '2026-09-14' },
      onValueChange: change,
    })
    await open()
    await click(day('2026-09-12'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12', end: '2026-09-14' },
    })
    expect(formValue()).toBe('2026-09-12/2026-09-14')
  })
  it('adapts selection without losing the selected date or resurrecting an old edited end', async () => {
    const change = vi.fn()
    await render({
      defaultValue: '2026-09-12',
      closeOnSelect: false,
      onValueChange: change,
    })
    await open()
    await click(day('2026-09-13'))
    change.mockClear()
    await render({
      selection: 'range',
      closeOnSelect: false,
      onValueChange: change,
    })
    expect(change).not.toHaveBeenCalled()
    await click(day('2026-09-14'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-13', end: '2026-09-14' },
    })
    await render({
      selection: 'single',
      closeOnSelect: false,
      onValueChange: change,
    })
    expect(formValue()).toBe('2026-09-13')
    await render({
      selection: 'range',
      closeOnSelect: false,
      onValueChange: change,
    })
    change.mockClear()
    await click(day('2026-09-15'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-13', end: '2026-09-15' },
    })
  })
  it('drops an obsolete clock on a mode change and does not resurrect it on the return to time', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      defaultValue: '2026-09-12T09:35',
      onValueChange: change,
    })
    await render({ mode: 'date', onValueChange: change })
    expect(formValue()).toBe('2026-09-12')
    await render({ mode: 'time', onValueChange: change })
    expect(formValue()).toBe('2026-09-12T00:00')
    expect(change).not.toHaveBeenCalled()
  })
  it('reads defaults once, ignores controlled defaults, and retains the accepted value on release', async () => {
    const change = vi.fn()
    await render({
      value: '2026-09-12',
      defaultValue: 'ignored invalid default',
      onValueChange: change,
    })
    await render({
      value: '2026-09-13',
      defaultValue: 'ignored invalid default',
      onValueChange: change,
    })
    await render({
      defaultValue: 'ignored late default',
      onValueChange: change,
    })
    expect(formValue()).toBe('2026-09-13')
    expect(change).not.toHaveBeenCalled()
  })
  it('reset after released ownership empties a required field instead of restoring an ignored default', async () => {
    const valid = () => host.querySelector('form')!.checkValidity()
    await render({ value: '2026-09-12', defaultValue: 'ignored' })
    await render({ value: '2026-09-13', defaultValue: 'ignored' })
    await render({ defaultValue: 'ignored', required: true })
    expect(formValue()).toBe('2026-09-13')
    expect(valid()).toBe(true)
    await reset()
    expect(host.querySelector('select')!.value).toBe('')
    expect(valid()).toBe(false)
  })
  it('resets through the active mode precision rather than restoring a hidden clock', async () => {
    const change = vi.fn()
    await render({
      defaultValue: '2026-09-12T09:35',
      mode: 'datetime',
      onValueChange: change,
    })
    await render({ mode: 'date', onValueChange: change })
    await open()
    await click(day('2026-09-13'))
    change.mockClear()
    await reset()
    expect(formValue()).toBe('2026-09-12')
    expect(change).not.toHaveBeenCalled()
  })
  it.each([
    ['month', 'Dec'],
    ['year', '9999'],
  ])('%s terminates an all-disabled search at the last supported day', async (mode, label) => {
    const change = vi.fn()
    await render({
      mode,
      defaultValue: '9999-12-31',
      min: '9999-12-31',
      max: '9999-12-31',
      disabledDates: ['9999-12-31'],
      onValueChange: change,
    })
    await open()
    const choice = [
      ...document.querySelectorAll<HTMLButtonElement>('.uf-date__grid button'),
    ].find((node) => node.textContent === label)!
    expect(choice.disabled).toBe(true)
    expect(change).not.toHaveBeenCalled()
  })
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
describe('Date rejects malformed configuration rather than dropping values or constraints', () => {
  const caught = (event: ErrorEvent) => {
    if (event.error instanceof RangeError) event.preventDefault()
  }
  beforeEach(() => window.addEventListener('error', caught))
  afterEach(() => window.removeEventListener('error', caught))
  it.each([
    [{ value: '2026-02-30' }, 'value'],
    [{ value: ' 2026-09-12 ' }, 'value'],
    [{ value: new Date(NaN) }, 'value'],
    [{ value: { start: '2026-09-12', end: null } }, 'value'],
    [{ selection: 'range', value: '2026-09-12' }, 'value'],
    [{ mode: 'week', value: '2026-09-12' }, 'value'],
    [{ selection: 'range', value: { start: '2026-09-12' } }, 'value'],
    [
      { selection: 'range', value: { start: '2026-09-12', end: 'bad' } },
      'value.end',
    ],
    [{ defaultValue: 'bad' }, 'defaultValue'],
    [{ min: 'bad' }, 'min'],
    [{ max: new Date(NaN) }, 'max'],
    [{ disabledDates: ['2026-02-30'] }, 'disabledDates[0]'],
    [{ disabledDates: '2026-09-12' }, 'disabledDates'],
    [{ disabledDates: new Array(1) }, 'disabledDates[0]'],
    [{ disabledTime: { hours: new Array(1) } }, 'disabledTime.hours'],
    [{ disabledTime: { minutes: new Array(1) } }, 'disabledTime.minutes'],
    [{ disabledTime: { hours: [24] } }, 'disabledTime.hours'],
    [{ disabledTime: { minutes: [-1] } }, 'disabledTime.minutes'],
    [{ disabledTime: { minutes: [0.5] } }, 'disabledTime.minutes'],
  ])('rejects %j with the owning prop in its error', async (props, prop) => {
    allowConsoleError(/error boundary you provided, Boundary/)
    await act(async () =>
      root.render(
        <Boundary>
          <DateField {...(props as DateProps)} />
        </Boundary>,
      ),
    )
    const output = host.querySelector('[data-error="RangeError"]')
    expect(output, String(prop)).not.toBeNull()
    expect(output!.textContent).toContain(prop)
  })
})
