// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField, type DateProps } from '../../Date/Date'
import { interpret } from '../create-machine'
import { dateMachine, connectDate } from '../machines/date.machine'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root, host: HTMLDivElement
const click = (node: Element) =>
  act(async () => {
    node.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )
  })
const button = (text: string) => {
  const found = Array.from(document.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === text,
  )
  expect(found, `button ${text}`).toBeTruthy()
  return found!
}
const render = (props: DateProps) =>
  act(async () =>
    root.render(
      <form>
        <DateField {...props} />
        <button type="reset">Reset form</button>
      </form>,
    ),
  )
const open = () => click(host.querySelector('[role="combobox"]')!)
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('Date values, clock and constraints', () => {
  it('derives the clock from controlled updates and restores it when a parent refuses an edit', async () => {
    const change = vi.fn()
    const props: DateProps = {
      mode: 'datetime',
      value: '2026-09-12T09:35',
      openTo: 'hours',
      onValueChange: change,
    }
    await render(props)
    await open()
    await render({ ...props, value: '2026-09-12T16:45' })
    expect(button('16').getAttribute('aria-pressed')).toBe('true')
    await click(button('17'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: '2026-09-12T17:45',
    })
    expect(button('16').getAttribute('aria-pressed')).toBe('true')
    await click(button('Minute'))
    expect(button('45').getAttribute('aria-pressed')).toBe('true')
  })
  it.each(['time', 'datetime'] as const)(
    'edits each %s endpoint without changing the other endpoint',
    async (mode) => {
      const change = vi.fn()
      await render({
        mode,
        selection: 'range',
        defaultValue: { start: '2026-09-12T09:35', end: '2026-09-12T16:45' },
        openTo: 'hours',
        onValueChange: change,
      })
      await open()
      await click(button('10'))
      expect(change).toHaveBeenLastCalledWith({
        value: { start: '2026-09-12T10:35', end: '2026-09-12T16:45' },
      })
      await click(button('End'))
      expect(button('16').getAttribute('aria-pressed')).toBe('true')
      await click(button('17'))
      expect(change).toHaveBeenLastCalledWith({
        value: { start: '2026-09-12T10:35', end: '2026-09-12T17:45' },
      })
      expect(button('09').disabled).toBe(true)
    },
  )
  it('preserves endpoint times when a new calendar range is selected, including reverse dates', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      selection: 'range',
      defaultValue: { start: '2026-09-12T09:35', end: '2026-09-14T16:45' },
      onValueChange: change,
    })
    await open()
    await click(document.querySelector('[data-date="2026-09-20"]')!)
    await click(document.querySelector('[data-date="2026-09-18"]')!)
    expect(change).toHaveBeenLastCalledWith({
      value: { start: '2026-09-18T00:00', end: '2026-09-20T09:35' },
    })
  })
  it('resolves days and hours inside exact datetime bounds and rejects unavailable minutes', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      defaultValue: '2026-09-11T00:00',
      min: '2026-09-12T09:32',
      max: '2026-09-12T10:20',
      disabledTime: { minutes: [32] },
      onValueChange: change,
    })
    await open()
    await click(document.querySelector('[data-date="2026-09-12"]')!)
    expect(change).toHaveBeenLastCalledWith({ value: '2026-09-12T09:33' })
    await click(button('Hour'))
    expect(button('08').disabled).toBe(true)
    await click(button('10'))
    expect(change).toHaveBeenLastCalledWith({ value: '2026-09-12T10:20' })
    await click(button('Minute'))
    expect(button('25').disabled).toBe(true)
    expect(button('20').getAttribute('aria-pressed')).toBe('true')
  })
  it('uses the Date timezone for Calendar bounds and disabled dates', async () => {
    await render({
      timezone: 'Asia/Tokyo',
      defaultValue: '2026-09-12',
      min: '2026-09-11T23:30Z',
      max: '2026-09-13T23:30Z',
      disabledDates: ['2026-09-12T23:30Z'],
    })
    await open()
    expect(
      document
        .querySelector('[data-date="2026-09-11"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      document
        .querySelector('[data-date="2026-09-13"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      document
        .querySelector('[data-date="2026-09-14"]')
        ?.getAttribute('aria-disabled'),
    ).not.toBe('true')
  })
  it('restores clock state quietly on form reset', async () => {
    const change = vi.fn()
    await render({
      mode: 'time',
      defaultValue: '2026-09-12T09:35',
      onValueChange: change,
    })
    await open()
    await click(button('12'))
    await act(async () => {
      host.querySelector('form')!.reset()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(button('09').getAttribute('aria-pressed')).toBe('true')
    await click(button('Minute'))
    expect(button('35').getAttribute('aria-pressed')).toBe('true')
    expect(change).toHaveBeenCalledTimes(1)
  })
  it('does not emit duplicate changes, but explicit repeated selection can still close', () => {
    const change = vi.fn()
    const service = interpret(dateMachine, {
      value: '2026-09-12',
      onValueChange: change,
    }).start()
    service.send('OPEN')
    service.send({ type: 'SELECT_DAY', date: '2026-09-12' })
    expect(change).not.toHaveBeenCalled()
    expect(service.getSnapshot().context.open).toBe(false)
    service.send('CLEAR')
    service.send('CLEAR')
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: null })
    service.stop()
  })
  it('rejects incompatible presets and a week containing an unavailable date', () => {
    const change = vi.fn()
    const service = interpret(dateMachine, { onValueChange: change }).start()
    service.send('OPEN')
    service.send({
      type: 'APPLY_PRESET',
      value: { start: '2026-09-12', end: '2026-09-14' },
    })
    expect(change).not.toHaveBeenCalled()
    expect(service.getSnapshot().context.open).toBe(true)
    service.syncContext({ mode: 'week', disabledDates: ['2026-09-16'] })
    service.send({ type: 'SELECT_DAY', date: '2026-09-14' })
    expect(change).not.toHaveBeenCalled()
    service.stop()
  })
  it('Now edits the active time endpoint in the configured timezone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new globalThis.Date('2026-09-12T06:40:00Z'))
    const change = vi.fn()
    const service = interpret(dateMachine, {
      mode: 'time',
      selection: 'range',
      timezone: 'Asia/Tokyo',
      value: { start: '2026-09-12T09:00', end: '2026-09-12T20:00' },
      onValueChange: change,
    }).start()
    service.send('OPEN')
    service.send('SET_NOW')
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12T15:40', end: '2026-09-12T20:00' },
    })
    service.stop()
  })
  it('does not coerce malformed clock events into valid values', () => {
    const change = vi.fn()
    const service = interpret(dateMachine, {
      mode: 'time',
      value: '2026-09-12T09:35',
      onValueChange: change,
    }).start()
    service.send('OPEN')
    for (const hour of [NaN, Infinity, -1, 24, 1.5])
      service.send({ type: 'SELECT_HOUR', hour })
    for (const minute of [NaN, Infinity, -1, 60, 1.5])
      service.send({ type: 'SELECT_MINUTE', minute })
    expect(change).not.toHaveBeenCalled()
    expect(
      connectDate(service.getSnapshot(), service.send).isSelectionDisabled({
        type: 'SELECT_MINUTE',
        minute: 60,
      }),
    ).toBe(true)
    service.stop()
  })

  it('creates a time interval in two explicit endpoints and submits only complete values', async () => {
    const change = vi.fn()
    await render({
      mode: 'time',
      selection: 'range',
      name: 'window',
      required: true,
      closeOnSelect: true,
      onValueChange: change,
    })
    await open()
    await click(button('09'))
    await click(button('Minute'))
    await click(button('35'))
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    // jsdom includes a disabled selected option in FormData; browsers correctly
    // omit it. Assert the native placeholder here; Playwright checks submission.
    expect(host.querySelector('select')!.selectedOptions[0].disabled).toBe(true)
    expect(host.querySelector('form')!.checkValidity()).toBe(false)
    await click(button('End'))
    await click(button('Hour'))
    await click(button('10'))
    await click(button('Minute'))
    await click(button('45'))
    expect(
      host.querySelector('[role="combobox"]')?.getAttribute('aria-expanded'),
    ).toBe('false')
    const interval = new FormData(host.querySelector('form')!).get(
      'window',
    ) as string
    expect(interval).toMatch(
      /^\d{4}-\d{2}-\d{2}T09:35\/\d{4}-\d{2}-\d{2}T10:45$/,
    )
    expect(host.querySelector('form')!.checkValidity()).toBe(true)
    expect(change).toHaveBeenCalledTimes(4)
  })

  it('keeps date-only bounds inclusive for the full day and checks every clock button against exact bounds', () => {
    const service = interpret(dateMachine, {
      mode: 'datetime',
      value: '2026-09-12T09:35',
      min: '2026-09-12',
      max: '2026-09-12',
      closeOnSelect: false,
    }).start()
    service.send('OPEN')
    service.send({ type: 'SELECT_HOUR', hour: 23 })
    service.send({ type: 'SELECT_MINUTE', minute: 59 })
    expect(service.getSnapshot().context.value).toBe('2026-09-12T23:59')
    service.syncContext({
      min: '2026-09-12T09:32',
      max: '2026-09-12T10:20',
      disabledTime: { hours: [10], minutes: [32] },
    })
    const api = connectDate(service.getSnapshot(), service.send)
    for (let hour = 0; hour < 24; hour++)
      expect(api.isSelectionDisabled({ type: 'SELECT_HOUR', hour })).toBe(
        hour !== 9,
      )
    service.send({ type: 'SELECT_HOUR', hour: 9 })
    const minutes = connectDate(service.getSnapshot(), service.send)
    for (let minute = 0; minute < 60; minute++)
      expect(
        minutes.isSelectionDisabled({ type: 'SELECT_MINUTE', minute }),
      ).toBe(minute < 33)
    service.stop()
  })

  it('returns both edited endpoints as instants in valueFormat=date without changing the other instant', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      selection: 'range',
      timezone: 'America/New_York',
      valueFormat: 'date',
      defaultValue: {
        start: new globalThis.Date('2026-09-12T13:35:00Z'),
        end: new globalThis.Date('2026-09-12T20:45:00Z'),
      },
      openTo: 'hours',
      onValueChange: change,
    })
    await open()
    await click(button('End'))
    await click(button('17'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: {
        start: new globalThis.Date('2026-09-12T13:35:00Z'),
        end: new globalThis.Date('2026-09-12T21:45:00Z'),
      },
    })
  })

  it('validates all seven days for Now and weekly presets and rejects lossy malformed ranges', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new globalThis.Date('2026-09-14T12:00Z'))
    const change = vi.fn()
    const service = interpret(dateMachine, {
      mode: 'week',
      weekStartsOn: 1,
      min: '2026-09-15',
      onValueChange: change,
    }).start()
    service.send('OPEN')
    service.send('SET_NOW')
    expect(change).not.toHaveBeenCalled()
    service.syncContext({ min: null })
    service.send('SET_NOW')
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-14', end: '2026-09-20' },
    })
    service.send('OPEN')
    service.send({
      type: 'APPLY_PRESET',
      value: { start: '2026-09-14', end: '2026-09-19' },
    })
    service.send({
      type: 'APPLY_PRESET',
      value: { start: '2026-09-14', end: '2026-02-30' },
    })
    expect(change).toHaveBeenCalledTimes(1)
    service.stop()
  })

  it('preserves the active endpoint during controlled range updates and refusal', async () => {
    const change = vi.fn()
    const props: DateProps = {
      mode: 'time',
      selection: 'range',
      value: { start: '2026-09-12T09:35', end: '2026-09-12T16:45' },
      onValueChange: change,
    }
    await render(props)
    await open()
    await click(button('End'))
    await render({
      ...props,
      value: { start: '2026-09-12T10:15', end: '2026-09-12T18:25' },
    })
    expect(button('End').getAttribute('aria-pressed')).toBe('true')
    expect(button('18').getAttribute('aria-pressed')).toBe('true')
    await click(button('19'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-12T10:15', end: '2026-09-12T19:25' },
    })
    expect(button('18').getAttribute('aria-pressed')).toBe('true')
  })

  it('interprets date-only endpoints as midnight when comparing a time interval', () => {
    const change = vi.fn()
    const service = interpret(dateMachine, {
      mode: 'time',
      selection: 'range',
      value: { start: '2026-09-12', end: '2026-09-12' },
      onValueChange: change,
    }).start()
    service.send('OPEN')
    const api = connectDate(service.getSnapshot(), service.send)
    expect(api.isSelectionDisabled({ type: 'SELECT_HOUR', hour: 0 })).toBe(
      false,
    )
    service.send({ type: 'SELECT_HOUR', hour: 0 })
    expect(change).not.toHaveBeenCalled()
    expect(connectDate(service.getSnapshot(), service.send).value).toEqual({
      start: '2026-09-12T00:00', end: '2026-09-12T00:00',
    })
    service.stop()
  })
})
