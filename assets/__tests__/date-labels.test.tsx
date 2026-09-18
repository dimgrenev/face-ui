import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Calendar, type CalendarProps } from '../../Calendar/Calendar'
import { Date as DateField, type DateProps } from '../../Date/Date'
import { expectDevError, mount } from './harness'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.restoreAllMocks()
})
const render = (props: Record<string, unknown>, calendar = false) =>
  act(async () =>
    root.render(
      calendar ? (
        <Calendar defaultViewDate="2026-09-01" {...(props as CalendarProps)} />
      ) : (
        <form>
          <DateField
            {...({
              defaultOpen: true,
              name: 'deadline',
              defaultValue: '2026-09-12T09:35',
              ...props,
            } as DateProps)}
          />
        </form>
      ),
    ),
  )
const buttons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
const named = (name: string) =>
  buttons().find(
    (node) =>
      node.getAttribute('aria-label') === name || node.textContent === name,
  )

it.each(['previousMonth', 'nextMonth'])(
  'Calendar labels.%s names its real navigation button',
  async (key) => {
    await render({ labels: { [key]: `Translated ${key}` } }, true)
    const button = named(`Translated ${key}`)
    expect(button).toBeDefined()
    await act(async () => button!.click())
    expect(
      document.querySelector('[role="grid"]')?.getAttribute('aria-label'),
    ).toBe(key === 'previousMonth' ? 'August 2026' : 'October 2026')
    expect(host.querySelector('[labels]')).toBeNull()
  },
)

it.each([
  ['previousMonth', 'day'],
  ['nextMonth', 'day'],
  ['previousYear', 'month'],
  ['nextYear', 'month'],
  ['previousYearPage', 'year'],
  ['nextYearPage', 'year'],
  ['calendar', 'day'],
  ['day', 'day'],
  ['month', 'month'],
  ['year', 'year'],
  ['hours', 'hours'],
  ['minutes', 'minutes'],
  ['start', 'hours'],
  ['end', 'hours'],
  ['rangeEndpoint', 'hours'],
  ['clear', 'day'],
  ['now', 'day'],
  ['close', 'day'],
] as const)(
  'Date labels.%s reaches its owned action or group in the %s view',
  async (key, openTo) => {
    const text = `Translated ${key}`
    await render({
      mode: 'datetime',
      selection: 'range',
      defaultValue: { start: '2026-09-12T09:35', end: '2026-09-15T10:00' },
      openTo,
      surface: 'sheet',
      labels: { [key]: text },
    })
    if (key === 'rangeEndpoint' || key === 'calendar')
      expect(
        document.querySelector(`[role="group"][aria-label="${text}"]`),
      ).not.toBeNull()
    else expect(named(text)).toBeDefined()
    if (['month', 'year', 'hours', 'minutes'].includes(key))
      expect(
        document.querySelector(`[role="group"][aria-label="${text}"]`),
      ).not.toBeNull()
    expect(host.querySelector('[labels]')).toBeNull()
  },
)

it('live Date labels preserve action identity, focus, selection, form and open state', async () => {
  const value = vi.fn(),
    open = vi.fn()
  const props = {
    onValueChange: value,
    onOpenChange: open,
    closeOnSelect: false,
    labels: { month: 'Months custom', clear: 'Clear custom' },
  }
  await render(props)
  const month = named('Months custom')!
  expect(month).toBeDefined()
  await act(async () => month.focus())
  await render({ ...props, labels: { month: 'Месяц', clear: 'Очистить' } })
  expect(named('Месяц')).toBe(month)
  expect(document.activeElement).toBe(month)
  expect(value).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
  expect(new FormData(host.querySelector('form')!).get('deadline')).toBe(
    '2026-09-12',
  )
  await act(async () => month.click())
  expect(
    document.querySelector('[role="group"][aria-label="Месяц"]'),
  ).not.toBeNull()
})

it.each([false, true])(
  'partial and blank labels retain meaningful defaults, calendar=%s',
  async (calendar) => {
    await render(
      {
        labels: calendar
          ? { previousMonth: ' ', nextMonth: undefined }
          : { clear: ' ', now: '', close: undefined },
        ...(calendar ? {} : { surface: 'sheet' }),
      },
      calendar,
    )
    for (const text of calendar
      ? ['Previous month', 'Next month']
      : ['Clear', 'Now', 'Close'])
      expect(named(text)).toBeDefined()
  },
)

it.each([
  [false, [], 'labels array; using defaults', 'Previous month'],
  [false, null, 'labels null; using defaults', 'Previous month'],
  [false, { clear: 12 }, 'labels.clear 12; using "Clear"', 'Clear'],
  [
    false,
    { calendar: false },
    'labels.calendar false; using "Calendar"',
    'Calendar',
  ],
  [true, 'wrong', 'labels "wrong"; using defaults', 'Previous month'],
  [
    true,
    { nextMonth: false },
    'labels.nextMonth false; using "Next month"',
    'Next month',
  ],
  [
    true,
    { previousMonth: 12 },
    'labels.previousMonth 12; using "Previous month"',
    'Previous month',
  ],
] as const)(
  'invalid label dictionaries render defaults and are reported: calendar=%s, labels=%j',
  async (calendar, labels, report, name) => {
    await expectDevError(
      () => render({ labels }, calendar),
      new RegExp(
        `^Face UI ${calendar ? 'Calendar' : 'Date'}: invalid ${report.replace(/\./g, '\\.')}\\.$`,
      ),
    )
    expect(
      named(name) ??
        document.querySelector(`[role="group"][aria-label="${name}"]`),
    ).toBeTruthy()
  },
)

it('a shared Date dictionary is also usable by Calendar without mutating the application dictionary', async () => {
  const labels = Object.freeze({
    previousMonth: 'Назад',
    nextMonth: 'Дальше',
    clear: 'Очистить',
  })
  await render({ labels }, true)
  expect(named('Назад')).toBeDefined()
  expect(named('Дальше')).toBeDefined()
  expect(labels.clear).toBe('Очистить')
  expect(named('Очистить')).toBeUndefined()
})
