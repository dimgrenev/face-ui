import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Calendar, type CalendarProps } from '../../Calendar/Calendar'
import { Date as DateField, type DateProps } from '../../Date/Date'
import { interpret } from '../create-machine'
import { dateMachine } from '../machines/date.machine'
import { mount } from './harness'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.useRealTimers()
})

it.each(['date', 'datetime'] as const)(
  'Date %s applies range availability to Now',
  (mode) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T10:20:00Z'))
    const change = vi.fn(),
      value =
        mode === 'date'
          ? { start: '2026-09-12', end: null }
          : { start: '2026-09-12T09:35', end: '2026-09-17T10:00' }
    const service = interpret(dateMachine, {
      mode,
      selection: 'range',
      value,
      rangePart: 'end',
      disabledDates: ['2026-09-14'],
      closeOnSelect: true,
      onValueChange: change,
    }).start()
    try {
      service.send({ type: 'OPEN' })
      service.send({ type: 'SET_NOW' })
      if (mode === 'date') {
        expect(change).toHaveBeenCalledExactlyOnceWith({
          value: { start: '2026-09-16', end: null },
        })
      } else {
        expect(change).not.toHaveBeenCalled()
        service.syncContext({ excludeDisabledDates: false })
        service.send({ type: 'SET_NOW' })
        expect(change).toHaveBeenCalledExactlyOnceWith({
          value: { ...value, end: '2026-09-16T10:20' },
        })
        expect(service.getSnapshot().matches('closed')).toBe(true)
      }
    } finally {
      service.stop()
    }
  },
)

it.each(['APPLY_PRESET', 'SET_VALUE', 'SELECT_RANGE'] as const)(
  'week %s keeps its exact seven-day invariant for atomic range routes',
  (type) => {
    const change = vi.fn()
    const service = interpret(dateMachine, {
      mode: 'week',
      weekStartsOn: 1,
      excludeDisabledDates: false,
      onValueChange: change,
    }).start()
    try {
      service.send({ type: 'OPEN' })
      for (const value of [
        { start: '2026-09-07', end: null },
        { start: '2026-09-07', end: '2026-09-12' },
        { start: '2026-09-08', end: '2026-09-14' },
      ])
        service.send({ type, value })
      expect(change).not.toHaveBeenCalled()
      service.syncContext({ disabledDates: ['2026-09-10'] })
      service.send({ type, value: { start: '2026-09-07', end: '2026-09-13' } })
      expect(change).not.toHaveBeenCalled()
      service.syncContext({ disabledDates: [] })
      service.send({ type, value: { start: '2026-09-07', end: '2026-09-13' } })
      expect(change).toHaveBeenCalledExactlyOnceWith({
        value: { start: '2026-09-07', end: '2026-09-13' },
      })
    } finally {
      service.stop()
    }
  },
)

it.each(['date', 'datetime'] as const)(
  'Date %s repairs an end-only anchor after live constraints make it unavailable',
  (mode) => {
    const change = vi.fn(),
      suffix = mode === 'datetime' ? 'T09:35' : ''
    const service = interpret(dateMachine, {
      mode,
      selection: 'range',
      value: { start: null, end: `2026-09-16${suffix}` },
      onValueChange: change,
    }).start()
    try {
      service.syncContext({ disabledDates: ['2026-09-16'] })
      expect(change).not.toHaveBeenCalled()
      service.send({ type: 'OPEN' })
      service.send({ type: 'SELECT_DAY', date: '2026-09-12' })
      expect(change).toHaveBeenCalledExactlyOnceWith({
        value: { start: `2026-09-12${suffix}`, end: null },
      })
    } finally {
      service.stop()
    }
  },
)

it('disabledTime constrains endpoint clocks, not the minutes inside an interval', () => {
  const change = vi.fn(),
    value = { start: '2026-09-12T09:00', end: '2026-09-16T15:00' }
  const service = interpret(dateMachine, {
    mode: 'datetime',
    selection: 'range',
    disabledTime: { hours: [12] },
    onValueChange: change,
  }).start()
  try {
    service.send({ type: 'SET_VALUE', value })
    expect(change).toHaveBeenCalledExactlyOnceWith({ value })
    service.send({
      type: 'SET_VALUE',
      value: { ...value, end: '2026-09-16T12:00' },
    })
    expect(change).toHaveBeenCalledTimes(1)
  } finally {
    service.stop()
  }
})

it('range constraints handle the entire supported civil domain and still constrain endpoints in endpoint-only mode', () => {
  const change = vi.fn(),
    value = { start: '0001-01-01', end: '9999-12-31' }
  const service = interpret(dateMachine, {
    selection: 'range',
    disabledDates: ['5000-06-14'],
    onValueChange: change,
  }).start()
  try {
    service.send({ type: 'SET_VALUE', value })
    expect(change).not.toHaveBeenCalled()
    service.syncContext({ excludeDisabledDates: false })
    service.send({ type: 'SET_VALUE', value })
    expect(change).toHaveBeenCalledExactlyOnceWith({ value })
    for (const constraints of [
      { min: '0002-01-01' },
      { max: '9998-12-31' },
      { disabledDates: ['0001-01-01'] },
    ]) {
      service.syncContext({
        min: null,
        max: null,
        disabledDates: [],
        ...constraints,
        value: null,
      })
      service.send({ type: 'SET_VALUE', value })
      expect(change).toHaveBeenCalledTimes(1)
    }
  } finally {
    service.stop()
  }
})
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<Calendar {...(props as CalendarProps)} />))
const day = (date: string) =>
  host.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!
const click = (date: string) => act(async () => day(date).click())

it.each([
  [{ start: '2026-09-12', end: null }, '2026-09-16', '2026-09-17'],
  [{ start: '2026-09-16', end: null }, '2026-09-12', '2026-09-11'],
  [{ start: null, end: '2026-09-16' }, '2026-09-12', '2026-09-11'],
] as const)(
  'Calendar restarts a range across a forbidden interior without trapping its anchor: %j',
  async (value, next, last) => {
    const change = vi.fn()
    await render({
      selection: 'range',
      defaultValue: value,
      disabledDates: ['2026-09-14'],
      onValueChange: change,
    })
    await click(next)
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: next, end: null },
    })
    expect(day('2026-09-14').closest('td')?.getAttribute('aria-selected')).toBe(
      'false',
    )
    expect(day(next).getAttribute('data-range-start')).toBe('true')
    await click(last)
    expect(change.mock.calls[1]).toEqual([
      {
        value: {
          start: next < last ? next : last,
          end: next < last ? last : next,
        },
      },
    ])
  },
)

it('Calendar endpoint-only constraints are explicit and changing the policy is quiet', async () => {
  const change = vi.fn(),
    props = {
      selection: 'range',
      defaultValue: { start: '2026-09-12', end: null },
      disabledDates: ['2026-09-14'],
      onValueChange: change,
    }
  await render({ ...props, excludeDisabledDates: false })
  await click('2026-09-16')
  expect(change).toHaveBeenCalledExactlyOnceWith({
    value: { start: '2026-09-12', end: '2026-09-16' },
  })
  await render({ ...props, excludeDisabledDates: true })
  expect(change).toHaveBeenCalledTimes(1)
  expect(day('2026-09-14').closest('td')?.getAttribute('aria-selected')).toBe(
    'true',
  )
  await click('2026-09-12')
  await click('2026-09-16')
  expect(change.mock.calls.at(-1)).toEqual([
    { value: { start: '2026-09-16', end: null } },
  ])
})

it.each([
  { disabledDates: ['2026-09-12'] },
  { min: '2026-09-13' },
  { max: '2026-09-11' },
])(
  'Calendar can repair an anchor made unavailable by live constraints: %j',
  async (constraints) => {
    const change = vi.fn(),
      props = {
        selection: 'range',
        defaultValue: { start: '2026-09-12', end: null },
        onValueChange: change,
      }
    await render(props)
    await render({ ...props, ...constraints })
    const date = 'max' in constraints ? '2026-09-10' : '2026-09-16'
    expect(change).not.toHaveBeenCalled()
    await click(date)
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: date, end: null },
    })
  },
)

it.each(['date', 'datetime', 'month', 'year'] as const)(
  'Date %s restarts across a gap and closeOnSelect waits for a genuinely completed candidate',
  (mode) => {
    const change = vi.fn(),
      year = mode === 'year'
    const initial = year
      ? '2025-01-01'
      : mode === 'datetime'
        ? '2026-09-12T09:35'
        : '2026-09-12'
    const next = year
      ? '2026-01-01'
      : mode === 'month'
        ? '2026-10-01'
        : mode === 'datetime'
          ? '2026-09-16T09:35'
          : '2026-09-16'
    const service = interpret(dateMachine, {
      mode,
      selection: 'range',
      value: { start: initial, end: null },
      disabledDates: [year ? '2025-06-14' : '2026-09-14'],
      closeOnSelect: true,
      onValueChange: change,
    }).start()
    try {
      service.send({ type: 'OPEN' })
      service.send(
        year
          ? { type: 'SELECT_YEAR', year: 2026 }
          : mode === 'month'
            ? { type: 'SELECT_MONTH', month: 10 }
            : { type: 'SELECT_DAY', date: '2026-09-16' },
      )
      expect(change).toHaveBeenCalledExactlyOnceWith({
        value: { start: next, end: null },
      })
      expect(service.getSnapshot().matches('open')).toBe(true)
      service.send(
        year
          ? { type: 'SELECT_YEAR', year: 2027 }
          : mode === 'month'
            ? { type: 'SELECT_MONTH', month: 11 }
            : { type: 'SELECT_DAY', date: '2026-09-17' },
      )
      expect(service.getSnapshot().matches('closed')).toBe(true)
      expect(change).toHaveBeenCalledTimes(2)
    } finally {
      service.stop()
    }
  },
)

it.each(['APPLY_PRESET', 'SET_VALUE', 'SELECT_RANGE'] as const)(
  'Date %s rejects an atomic forbidden interval and accepts the explicit endpoint policy',
  (type) => {
    const change = vi.fn(),
      value = { start: '2026-09-12', end: '2026-09-16' }
    const service = interpret(dateMachine, {
      selection: 'range',
      disabledDates: ['2026-09-14'],
      closeOnSelect: true,
      onValueChange: change,
    }).start()
    try {
      service.send({ type: 'OPEN' })
      service.send({ type, value })
      expect(change).not.toHaveBeenCalled()
      expect(service.getSnapshot().matches('open')).toBe(true)
      service.syncContext({ ...{ excludeDisabledDates: false } })
      service.send({ type, value })
      expect(change).toHaveBeenCalledExactlyOnceWith({ value })
    } finally {
      service.stop()
    }
  },
)

it('Date time edits cannot republish an externally supplied range across unavailable days', () => {
  const change = vi.fn(),
    value = { start: '2026-09-12T09:35', end: '2026-09-16T10:00' }
  const service = interpret(dateMachine, {
    mode: 'datetime',
    selection: 'range',
    value,
    disabledDates: ['2026-09-14'],
    onValueChange: change,
  }).start()
  try {
    service.send({ type: 'OPEN' })
    service.send({ type: 'SELECT_MINUTE', minute: 40 })
    expect(change).not.toHaveBeenCalled()
    expect(service.getSnapshot().context.value).toEqual(value)
    service.syncContext({ ...{ excludeDisabledDates: false } })
    service.send({ type: 'SELECT_MINUTE', minute: 40 })
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { ...value, start: '2026-09-12T09:40' },
    })
  } finally {
    service.stop()
  }
})

it('range ARIA belongs to range and week grids and changes with live selection', async () => {
  const multiselectable = () =>
    document
      .querySelector('[role="grid"]')!
      .getAttribute('aria-multiselectable')
  for (const calendar of [true, false])
    for (const selection of ['single', 'range', 'single']) {
      const value =
        selection === 'range' ? { start: null, end: null } : null
      await act(async () =>
        root.render(
          calendar ? (
            <Calendar
              {...({ selection, value, viewDate: '2026-09-01' } as CalendarProps)}
            />
          ) : (
            <DateField {...({ selection, value, open: true } as DateProps)} />
          ),
        ),
      )
      expect(multiselectable()).toBe(selection === 'range' ? 'true' : null)
    }
  await act(async () =>
    root.render(
      <DateField
        mode="week"
        open
        value={{ start: '2026-09-07', end: '2026-09-13' }}
      />,
    ),
  )
  expect(multiselectable()).toBe('true')
  expect(
    document.querySelectorAll('[role="gridcell"][aria-selected="true"]'),
  ).toHaveLength(7)
})
