import { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it, vi } from 'vitest'
import { Calendar, type CalendarProps } from '../../Calendar/Calendar'
import { interpret } from '../create-machine'
import { calendarMachine, connectCalendar } from '../machines/calendar.machine'
import { mount } from './harness'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<Calendar {...(props as CalendarProps)} />))
const day = (date: string) =>
  host.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!
const click = (node: HTMLElement) => act(async () => node.click())
const key = (node: HTMLElement, value: string) =>
  act(async () =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
const initial = (selection: string) =>
  selection === 'single' ? '2026-09-12' : { start: '2026-09-12', end: null }

it('preserves a day adapter availability override alongside whole-calendar state', () => {
  const change = vi.fn()
  const service = interpret(calendarMachine, {
    value: '2026-09-12',
    viewDate: '2026-09-01',
    focusedDate: '2026-09-12',
    onValueChange: change,
  }).start()
  try {
    const api = connectCalendar(service.getSnapshot(), (event) =>
      service.send(event),
    )
    const date = api.days.find((day) => day.date === '2026-09-13')!
    const unavailable = api.getDayProps({ ...date, isDisabled: true })
    expect(unavailable['aria-disabled']).toBe(true)
    unavailable.onClick()
    expect(change).not.toHaveBeenCalled()
    api.getDayProps(date).onClick()
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-13' })
  } finally {
    service.stop()
  }
})

it.each(['single', 'range'])(
  'readOnly keeps %s selection immutable through pointer and keyboard, while browsing remains available',
  async (selection) => {
    const change = vi.fn(),
      navigate = vi.fn()
    await render({
      selection,
      defaultValue: initial(selection),
      readOnly: true,
      onValueChange: change,
      onViewDateChange: navigate,
    })
    await click(day('2026-09-13'))
    await act(async () => day('2026-09-12').focus())
    await key(day('2026-09-12'), 'ArrowRight')
    expect(document.activeElement).toBe(day('2026-09-13'))
    await key(day('2026-09-13'), 'Enter')
    await key(day('2026-09-13'), ' ')
    expect(change).not.toHaveBeenCalled()
    expect(day('2026-09-12').closest('td')?.getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(day('2026-09-13').closest('td')?.getAttribute('aria-selected')).toBe(
      'false',
    )
    expect(
      host.querySelector('[role="grid"]')?.getAttribute('aria-readonly'),
    ).toBe('true')
    expect(day('2026-09-13').disabled).toBe(false)
    expect(day('2026-09-13').getAttribute('aria-disabled')).toBe('true')
    expect(day('2026-09-13').hasAttribute('data-disabled')).toBe(false)
    await click(
      host.querySelector<HTMLButtonElement>('[data-part="nextButton"]')!,
    )
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ viewDate: '2026-10-01' })
  },
)

it.each(['single', 'range'])(
  'disabled blocks all %s actions and derives native and accessible state',
  async (selection) => {
    const change = vi.fn(),
      navigate = vi.fn()
    await render({
      selection,
      defaultValue: initial(selection),
      disabled: true,
      onValueChange: change,
      onViewDateChange: navigate,
    })
    for (const button of host.querySelectorAll('button'))
      expect(button.disabled).toBe(true)
    await click(day('2026-09-13'))
    await key(day('2026-09-12'), 'ArrowRight')
    await key(day('2026-09-12'), 'PageDown')
    await key(day('2026-09-12'), 'Enter')
    expect(change).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(
      host.querySelector('[role="group"]')?.getAttribute('aria-disabled'),
    ).toBe('true')
    expect(day('2026-09-12').closest('td')?.getAttribute('aria-selected')).toBe(
      'true',
    )
  },
)

it.each(['disabled', 'readOnly'])(
  '%s accepts controlled updates quietly, then resumes the last accepted range without re-reading defaults',
  async (state) => {
    const change = vi.fn()
    const props = {
      selection: 'range',
      defaultValue: { start: '2026-09-01', end: '2026-09-03' },
      [state]: true,
      onValueChange: change,
    }
    await render({ ...props, value: { start: '2026-09-12', end: null } })
    await render({ ...props, value: { start: '2026-09-14', end: null } })
    expect(change).not.toHaveBeenCalled()
    await render({ ...props, [state]: false })
    await click(day('2026-09-16'))
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-14', end: '2026-09-16' },
    })
  },
)

it('changing readOnly around a controlled value never publishes a blocked attempt or silently accepts a refused one', async () => {
  const change = vi.fn(),
    props = { value: '2026-09-12', onValueChange: change }
  await render({ ...props, readOnly: true })
  await click(day('2026-09-13'))
  expect(change).not.toHaveBeenCalled()
  await render(props)
  await click(day('2026-09-13'))
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-13' })
  expect(day('2026-09-12').closest('td')?.getAttribute('aria-selected')).toBe(
    'true',
  )
  expect(day('2026-09-13').closest('td')?.getAttribute('aria-selected')).toBe(
    'false',
  )
})

it.each(['disabled', 'readOnly'])(
  'the shared machine rejects %s selection even when an adapter sends actions directly',
  (state) => {
    const change = vi.fn(),
      navigate = vi.fn()
    const service = interpret(calendarMachine, {
      value: '2026-09-12',
      viewDate: '2026-09-01',
      focusedDate: '2026-09-12',
      [state]: true,
      onValueChange: change,
      onViewDateChange: navigate,
    }).start()
    try {
      service.send({ type: 'SELECT_DATE', date: '2026-09-13' })
      service.send({ type: 'KEY_DOWN', key: 'Enter' })
      service.send({ type: 'KEY_DOWN', key: ' ' })
      expect(service.getSnapshot().context.value).toBe('2026-09-12')
      expect(change).not.toHaveBeenCalled()
      service.send({ type: 'NEXT_MONTH' })
      expect(navigate).toHaveBeenCalledTimes(state === 'disabled' ? 0 : 1)
      service.syncContext({ [state]: false })
      service.send({ type: 'SELECT_DATE', date: '2026-09-14' })
      expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-14' })
    } finally {
      service.stop()
    }
  },
)

it('live readOnly and disabled changes preserve accepted controlled values and constraints', async () => {
  const change = vi.fn()
  const props = {
    value: '2026-09-12',
    min: '2026-09-10',
    max: '2026-09-20',
    disabledDates: ['2026-09-15'],
    onValueChange: change,
  }
  const selected = (date: string) =>
    day(date).closest('td')?.getAttribute('aria-selected')
  await render(props)
  await act(async () => day('2026-09-12').focus())
  await render({ ...props, readOnly: true })
  expect(document.activeElement).toBe(day('2026-09-12'))
  await key(day('2026-09-12'), 'ArrowRight')
  expect(document.activeElement).toBe(day('2026-09-13'))
  await click(day('2026-09-13'))
  await render({ ...props, disabled: true, value: '2026-09-14' })
  await render({ ...props, value: '2026-09-14' })
  for (const date of ['2026-09-09', '2026-09-15', '2026-09-21']) {
    await click(day(date))
    expect(day(date).getAttribute('aria-disabled')).toBe('true')
  }
  expect(change).not.toHaveBeenCalled()
  await click(day('2026-09-16'))
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-16' })
  expect(selected('2026-09-14')).toBe('true')
  expect(selected('2026-09-16')).toBe('false')
})
