import { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField } from '../../Date/Date'
import { interpret } from '../create-machine'
import { dateMachine, connectDate } from '../machines/date.machine'
import { getDefaultViews } from '../date-utils'
import { mount } from './harness'

let root: Root, host: HTMLDivElement
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<DateField defaultOpen {...props} />))
const button = (name: string) => {
  const found = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ).find(
    (node) =>
      node.textContent?.trim() === name ||
      node.getAttribute('aria-label') === name,
  )
  expect(found, `button ${name}`).toBeDefined()
  return found!
}
const click = (node: Element) =>
  act(async () =>
    node.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    ),
  )
const key = (node: Element, key: string, extra = {}) =>
  act(async () =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    ),
  )
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Date mode and choice model', () => {
  it('makes all appropriate views reachable from mode alone', () => {
    expect(getDefaultViews('date')).toEqual(['day', 'month', 'year'])
    expect(getDefaultViews('week')).toEqual(['day', 'month', 'year'])
    expect(getDefaultViews('datetime')).toEqual([
      'day',
      'month',
      'year',
      'hours',
      'minutes',
    ])
    expect(getDefaultViews('time')).toEqual(['hours', 'minutes'])
    expect(getDefaultViews('month')).toEqual(['month', 'year'])
    expect(getDefaultViews('year')).toEqual(['year'])
  })
  it('honors openTo=year for a date without a second views prop', async () => {
    await render({ defaultValue: '1998-02-12', openTo: 'year' })
    expect(button('1998').getAttribute('aria-pressed')).toBe('true')
    await click(button('1999'))
    await click(button('Mar'))
    expect(
      document.querySelector('[data-part="title"][data-scope="calendar"]')
        ?.textContent,
    ).toBe('March 1999')
  })
  it('does not create a switch to the only available view', async () => {
    await render({ mode: 'year', defaultValue: '2026-01-01' })
    expect(document.querySelector('[data-part="viewSwitch"]')).toBeNull()
  })
  it('changes mode quietly and cannot retain an unsupported current view', async () => {
    const onValueChange = vi.fn()
    await render({
      mode: 'date',
      defaultValue: '2026-09-12T09:35',
      onValueChange,
    })
    await render({
      mode: 'time',
      defaultValue: '2026-09-12T09:35',
      onValueChange,
    })
    expect(document.querySelector('[data-scope="calendar"]')).toBeNull()
    expect(button('00').getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(button('00'))
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('normalizes machine views by mode and rejects an incompatible view request', () => {
    const service = interpret(dateMachine, { mode: 'time' }).start()
    service.send('OPEN')
    let api = connectDate(service.getSnapshot(), service.send)
    expect(api.view).toBe('hours')
    expect(api.views).toEqual(['hours', 'minutes'])
    service.send({ type: 'SET_VIEW', view: 'day' })
    api = connectDate(service.getSnapshot(), service.send)
    expect(api.view).toBe('hours')
    service.stop()
  })
  it('pages the entire year grid without committing or clearing selection', async () => {
    const onValueChange = vi.fn()
    await render({
      mode: 'year',
      value: '2026-01-01',
      onValueChange,
      name: 'year',
    })
    await click(button('Next 12 years'))
    expect(button('2038').getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelector('select')?.value).toBe('2026-01-01')
    expect(onValueChange).not.toHaveBeenCalled()
    await click(button('2038'))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
      value: '2038-01-01',
    })
  })
  it('keeps year pages inside years 1–9999 and min/max navigation bounds', async () => {
    await render({
      mode: 'year',
      value: '0001-01-01',
      min: '0001-01-01',
      max: '0012-12-31',
    })
    expect(button('Previous 12 years').disabled).toBe(true)
    expect(button('Next 12 years').disabled).toBe(true)
    expect(button('1')).toBeDefined()
    expect(button('12')).toBeDefined()
    await act(async () =>
      root.render(
        <DateField key="last" defaultOpen mode="year" value="9999-01-01" />,
      ),
    )
    expect(button('Next 12 years').disabled).toBe(true)
    expect(button('9999')).toBeDefined()
    expect(
      Array.from(
        document.querySelectorAll('.uf-date__grid--year button'),
      ).every((node) => Number(node.textContent) <= 9999),
    ).toBe(true)
  })
  it('shows the selected month rather than the first month of a navigated year', async () => {
    await render({ mode: 'month', value: '2026-09-12' })
    expect(button('Sep').getAttribute('aria-pressed')).toBe('true')
    expect(button('Jan').getAttribute('aria-pressed')).toBe('false')
    await click(button('Next year'))
    expect(
      Array.from(
        document.querySelectorAll('.uf-date__grid--month button'),
      ).every((node) => node.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
    await click(button('Previous year'))
    expect(button('Sep').getAttribute('aria-pressed')).toBe('true')
  })
  it('represents a period range across all its selected months', async () => {
    await render({
      mode: 'month',
      selection: 'range',
      value: { start: '2026-03-01', end: '2026-05-01' },
    })
    for (const name of ['Mar', 'Apr', 'May'])
      expect(button(name).getAttribute('aria-pressed')).toBe('true')
    for (const name of ['Feb', 'Jun'])
      expect(button(name).getAttribute('aria-pressed')).toBe('false')
  })
  it('exposes all 60 exact minutes instead of hiding off-step values', async () => {
    const onValueChange = vi.fn()
    await render({
      mode: 'time',
      defaultValue: '2026-09-12T09:35',
      openTo: 'minutes',
      onValueChange,
    })
    expect(
      document.querySelectorAll('.uf-date__grid--time button'),
    ).toHaveLength(60)
    await click(button('17'))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
      value: '2026-09-12T09:17',
    })
  })
  it('uses one keyboard entry, skips disabled choices and follows RTL columns', async () => {
    const onValueChange = vi.fn()
    await render({
      mode: 'time',
      defaultValue: '2026-09-12T09:33',
      openTo: 'minutes',
      disabledTime: { minutes: [39] },
      dir: 'rtl',
      onValueChange,
    })
    const grid = document.querySelector<HTMLElement>('.uf-date__grid--time')!
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)
    await act(async () => button('33').focus())
    await key(button('33'), 'ArrowDown')
    expect(document.activeElement).toBe(button('45'))
    await key(button('45'), 'ArrowRight')
    expect(document.activeElement).toBe(button('44'))
    // Modified arrows stay with the browser (history navigation).
    await key(button('44'), 'ArrowRight', { altKey: true })
    expect(document.activeElement).toBe(button('44'))
    await key(button('44'), 'Home')
    expect(document.activeElement).toBe(button('42'))
    await key(button('42'), 'End', { ctrlKey: true })
    expect(document.activeElement).toBe(button('59'))
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('preserves keyboard position across year pages without selecting a year', async () => {
    const onValueChange = vi.fn()
    await render({ mode: 'year', defaultValue: '2026-01-01', onValueChange })
    await act(async () => button('2026').focus())
    await key(button('2026'), 'PageDown')
    expect(document.activeElement).toBe(button('2038'))
    await key(button('2038'), 'PageUp')
    expect(document.activeElement).toBe(button('2026'))
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
