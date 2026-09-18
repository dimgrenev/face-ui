// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField } from '../../Date/Date'
import { Calendar } from '../../Calendar/Calendar'
import { interpret } from '../create-machine'
import { dateMachine } from '../machines/date.machine'

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
const renderDate = (props: Record<string, unknown>) =>
  act(async () => {
    root.render(<DateField {...props} />)
  })
const openDate = () =>
  click(host.querySelector('[data-scope="date"][data-part="trigger"]')!)
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Date navigation and period selection', () => {
  it('navigates year and month without changing the selected date or form value', async () => {
    const change = vi.fn()
    await renderDate({
      defaultValue: '2026-01-31',
      openTo: 'year',
      name: 'deadline',
      onValueChange: change,
    })
    await openDate()
    await click(button('2025'))
    await click(button('Feb'))
    expect(change).not.toHaveBeenCalled()
    expect(host.querySelector('select')?.value).toBe('2026-01-31')
    expect(
      document.querySelector('[data-scope="calendar"][data-part="title"]')
        ?.textContent,
    ).toBe('February 2025')
    await click(document.querySelector('[data-date="2025-02-17"]')!)
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2025-02-17' })
  })
  it('uses the range start as the initial viewed period', async () => {
    await renderDate({
      mode: 'month',
      selection: 'range',
      value: { start: '1998-02-01', end: '1998-05-01' },
      openTo: 'year',
    })
    await openDate()
    expect(button('1998')).toBeTruthy()
  })
  it.each(['month', 'year'] as const)(
    'selects both endpoints in %s mode and closes only after completion',
    (mode) => {
      const change = vi.fn()
      const service = interpret(dateMachine, {
        mode,
        selection: 'range',
        viewDate: '2026-01-01',
        closeOnSelect: true,
        onValueChange: change,
      }).start()
      service.send('OPEN')
      service.send(
        mode === 'month'
          ? { type: 'SELECT_MONTH', month: 2 }
          : { type: 'SELECT_YEAR', year: 2024 },
      )
      expect(change).toHaveBeenLastCalledWith({
        value: {
          start: mode === 'month' ? '2026-02-01' : '2024-01-01',
          end: null,
        },
      })
      expect(service.getSnapshot().context.open).toBe(true)
      service.send(
        mode === 'month'
          ? { type: 'SELECT_MONTH', month: 4 }
          : { type: 'SELECT_YEAR', year: 2026 },
      )
      expect(change).toHaveBeenLastCalledWith({
        value: {
          start: mode === 'month' ? '2026-02-01' : '2024-01-01',
          end: mode === 'month' ? '2026-04-01' : '2026-01-01',
        },
      })
      expect(service.getSnapshot().context.open).toBe(false)
      service.stop()
    },
  )
  it('keeps a complete time value when restoring a range', () => {
    const service = interpret(dateMachine, {
      mode: 'datetime',
      selection: 'range',
    }).start()
    const value = { start: '2026-09-12T09:35', end: '2026-09-13T15:47' }
    service.send({ type: 'SET_VALUE', value })
    expect(service.getSnapshot().context.value).toEqual(value)
    service.stop()
  })
})

describe('Calendar viewed month contract', () => {
  const renderCalendar = (props: Record<string, unknown>) =>
    act(async () => {
      root.render(<Calendar {...props} />)
    })
  const month = () => host.querySelector('[data-part="title"]')?.textContent
  it('controls the viewed month independently of selection and respects parent refusal', async () => {
    const change = vi.fn(),
      navigate = vi.fn()
    const props = {
      value: '2026-01-31',
      viewDate: '2025-02-01',
      onValueChange: change,
      onViewDateChange: navigate,
    }
    await renderCalendar(props)
    expect(month()).toBe('February 2025')
    expect(change).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    await click(host.querySelector('[data-part="nextButton"]')!)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      viewDate: '2025-03-01',
    })
    expect(month()).toBe('February 2025')
    await renderCalendar({ ...props, viewDate: '2024-04-01' })
    expect(month()).toBe('April 2024')
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(change).not.toHaveBeenCalled()
    expect(
      host.querySelectorAll('[data-part="day"][tabindex="0"]'),
    ).toHaveLength(1)
  })
  it('treats defaultViewDate as initial only and preserves a tab stop after navigation', async () => {
    await renderCalendar({ defaultViewDate: '2024-02-01' })
    expect(month()).toBe('February 2024')
    await click(host.querySelector('[data-part="nextButton"]')!)
    await renderCalendar({ defaultViewDate: '2030-06-01' })
    expect(month()).toBe('March 2024')
    expect(
      host.querySelectorAll('[data-part="day"][tabindex="0"]'),
    ).toHaveLength(1)
  })
  it('preserves the day on PageDown and clamps at the end of a shorter month', async () => {
    const navigate = vi.fn(),
      change = vi.fn()
    await renderCalendar({
      defaultValue: '2026-01-31',
      onViewDateChange: navigate,
      onValueChange: change,
    })
    const day = host.querySelector<HTMLElement>('[data-date="2026-01-31"]')!
    await act(async () => day.focus())
    await act(async () =>
      day.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'PageDown',
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect(month()).toBe('February 2026')
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-02-28')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      viewDate: '2026-02-01',
    })
    expect(change).not.toHaveBeenCalled()
  })
  it('round trips years below 100 without changing their century', async () => {
    const change = vi.fn()
    const value = '0042-02-10'
    await renderCalendar({ defaultValue: value, onValueChange: change })
    await click(host.querySelector('[data-date="0042-02-11"]')!)
    expect(change.mock.calls[0]?.[0].value).toBe('0042-02-11')
  })
  it('allows navigation back toward bounds from an out-of-range initial value', async () => {
    await renderCalendar({
      defaultValue: '2027-01-15',
      min: '2026-01-01',
      max: '2026-12-31',
    })
    const previous = host.querySelector<HTMLButtonElement>(
      '[data-part="prevButton"]',
    )!
    expect(previous.disabled).toBe(false)
    await click(previous)
    expect(month()).toBe('December 2026')
    expect(
      host.querySelector<HTMLButtonElement>('[data-part="nextButton"]')!
        .disabled,
    ).toBe(true)
  })
  it('retains focus when a controlled parent changes the viewed month while the grid is focused', async () => {
    await renderCalendar({
      value: '2026-01-31',
      viewDate: '2026-01-01',
    })
    await act(async () =>
      host.querySelector<HTMLElement>('[data-date="2026-01-31"]')!.focus(),
    )
    await renderCalendar({
      value: '2026-01-31',
      viewDate: '2025-02-01',
    })
    expect(document.activeElement?.getAttribute('data-date')).toBe('2025-02-28')
  })
  it('keeps an adjacent-month day under the pointer until selection commits', async () => {
    const change = vi.fn(),
      navigate = vi.fn()
    await renderCalendar({
      defaultValue: '2026-02-15',
      weekStartsOn: 1,
      onValueChange: change,
      onViewDateChange: navigate,
    })
    const previousMonthDay = host.querySelector<HTMLElement>(
      '[data-date="2026-01-31"]',
    )!
    await act(async () => previousMonthDay.focus())
    expect(month()).toBe('February 2026')
    expect(navigate).not.toHaveBeenCalled()
    expect(previousMonthDay.isConnected).toBe(true)
    expect(document.activeElement).toBe(previousMonthDay)
    await click(previousMonthDay)
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: '2026-01-31',
    })
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      viewDate: '2026-01-01',
    })
  })
})
