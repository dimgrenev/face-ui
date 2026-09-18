// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Calendar, type CalendarProps } from '../../Calendar/Calendar'
import { Date as DateField, type DateProps } from '../../Date/Date'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<Calendar {...(props as CalendarProps)} />))
const group = () =>
  host.querySelector<HTMLDivElement>(
    '[data-scope="calendar"][data-part="root"]',
  )!
const day = (date: string) =>
  host.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!
const click = (node: HTMLElement) => act(async () => node.click())

it('routes native identity, presentation and accessible names to the existing group and ref', async () => {
  const ref = createRef<HTMLDivElement>()
  const props = {
    ref,
    defaultValue: '2026-09-12',
    id: 'deadline-calendar',
    className: 'calendar-extra',
    style: { width: 280 },
    dir: 'rtl',
    lang: 'ru',
    title: 'Deadline',
    'aria-label': 'Release calendar',
    'aria-describedby': 'help',
    'data-owner': 'release',
  }
  await render(props)
  const node = group()
  expect(ref.current).toBe(node)
  expect(node.id).toBe('deadline-calendar')
  expect(node.classList.contains('calendar-extra')).toBe(true)
  expect(node.style.width).toBe('280px')
  expect(node.dir).toBe('rtl')
  expect(node.lang).toBe('ru')
  expect(node.title).toBe('Deadline')
  expect(node.getAttribute('aria-label')).toBe('Release calendar')
  expect(node.getAttribute('aria-describedby')).toBe('help')
  expect(node.dataset.owner).toBe('release')
  await render({
    ...props,
    hidden: true,
    'aria-labelledby': 'label',
    style: { width: 300 },
  })
  expect(group()).toBe(node)
  expect(ref.current).toBe(node)
  expect(node.hidden).toBe(true)
  expect(node.style.width).toBe('300px')
  expect(node.getAttribute('aria-labelledby')).toBe('label')
})

it('delivers native focus and keyboard events on the group without replacing internal focus tracking', async () => {
  const events: string[] = [],
    capture = vi.fn(),
    bubble = vi.fn()
  await render({
    defaultValue: '2026-09-12',
    onFocusCapture: (event: Event) => {
      capture(event.currentTarget)
      event.preventDefault()
    },
    onFocus: (event: Event) => {
      bubble(event.currentTarget)
      event.preventDefault()
    },
    onBlurCapture: () => events.push('blur-capture'),
    onBlur: () => events.push('blur'),
    onKeyDown: (event: KeyboardEvent) => {
      expect(event.currentTarget).toBe(group())
      events.push(event.key)
    },
  })
  await act(async () => day('2026-09-12').focus())
  expect(capture).toHaveBeenCalledWith(group())
  expect(bubble).toHaveBeenCalledWith(group())
  await act(async () =>
    day('2026-09-12').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
  expect(document.activeElement).toBe(day('2026-09-13'))
  expect(events).toContain('ArrowRight')
  await act(async () => day('2026-09-13').blur())
  expect(events).toContain('blur-capture')
  expect(events).toContain('blur')
})

it('allows native capture cancellation before selection and month navigation', async () => {
  const change = vi.fn(),
    navigate = vi.fn(),
    capture = vi.fn((event: Event) => event.preventDefault())
  const props = {
    defaultValue: '2026-09-12',
    onValueChange: change,
    onViewDateChange: navigate,
    onClickCapture: capture,
  }
  await render(props)
  await click(day('2026-09-13'))
  await click(
    host.querySelector<HTMLButtonElement>('[data-part="nextButton"]')!,
  )
  expect(capture).toHaveBeenCalledTimes(2)
  expect(change).not.toHaveBeenCalled()
  expect(navigate).not.toHaveBeenCalled()
  await render({ ...props, onClickCapture: undefined })
  await click(day('2026-09-13'))
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-13' })
})

it.each(['single', 'range'])(
  'accepts a null initial %s value without making later defaults reactive',
  async (selection) => {
    const change = vi.fn()
    await render({
      selection,
      defaultValue: null,
      defaultViewDate: '2026-09-01',
      onValueChange: change,
    })
    expect(host.querySelector('[aria-selected="true"]')).toBeNull()
    await click(day('2026-09-12'))
    await render({
      selection,
      defaultValue: null,
      defaultViewDate: '2026-09-01',
      onValueChange: change,
    })
    expect(
      day('2026-09-12').getAttribute('data-range-start') ??
        day('2026-09-12').getAttribute('data-selected'),
    ).toBeTruthy()
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value:
        selection === 'range'
          ? { start: '2026-09-12', end: null }
          : '2026-09-12',
    })
  },
)

it('reads frozen shared holiday arrays without mutating caller data in Calendar and Date', async () => {
  const holidays = Object.freeze(['2026-09-12'])
  await render({ disabledDates: holidays, defaultViewDate: '2026-09-01' })
  expect(day('2026-09-12').getAttribute('aria-disabled')).toBe('true')
  await act(async () =>
    root.render(
      <DateField
        {...({
          defaultOpen: true,
          defaultValue: '2026-09-12',
          disabledDates: holidays,
        } as unknown as DateProps)}
      />,
    ),
  )
  expect(
    document
      .querySelector('[data-date="2026-09-12"]')
      ?.getAttribute('aria-disabled'),
  ).toBe('true')
  expect(holidays).toEqual(['2026-09-12'])
})
