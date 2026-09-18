// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField, type DateProps } from '../../Date/Date'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root, host: HTMLDivElement
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
const render = (props: Record<string, unknown>) =>
  act(async () =>
    root.render(
      <form>
        <DateField {...(props as DateProps)} defaultOpen name="deadline" />
      </form>,
    ),
  )
const buttons = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  )
const button = (label: string) =>
  buttons().find((node) => node.textContent === label)
const click = (node: HTMLElement) => act(async () => node.click())
const submitted = () =>
  new FormData(host.querySelector('form')!).get('deadline')

it('renders explicitly supplied actions without a second visibility prop', async () => {
  const change = vi.fn()
  await render({
    presets: [{ id: 'release', label: 'Release', value: '2026-09-12' }],
    onValueChange: change,
    closeOnSelect: false,
  })
  expect(button('Release')).toBeDefined()
  await click(button('Release')!)
  expect(submitted()).toBe('2026-09-12')
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-12' })
})
it('does not replace an explicitly empty array with invented business periods', async () => {
  await render({ presets: [] })
  expect(button('Today')).toBeUndefined()
  expect(button('Yesterday')).toBeUndefined()
  expect(button('Last 7 days')).toBeUndefined()
})
it('preserves action identity and focus through label, value and order changes', async () => {
  const change = vi.fn()
  await render({
    closeOnSelect: false,
    onValueChange: change,
    presets: [
      { id: 'release', label: 'Release', value: '2026-09-12' },
      { id: 'review', label: 'Review', value: '2026-09-13' },
    ],
  })
  const release = button('Release')!
  release.focus()
  await render({
    closeOnSelect: false,
    onValueChange: change,
    presets: [
      { id: 'review', label: 'Проверка', value: '2026-09-13' },
      { id: 'release', label: 'Релиз', value: '2026-09-14' },
    ],
  })
  expect(button('Релиз')).toBe(release)
  expect(document.activeElement).toBe(release)
  expect(change).not.toHaveBeenCalled()
  await click(release)
  expect(submitted()).toBe('2026-09-14')
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: '2026-09-14' })
})
it('supports distinct actions with the same localized label and coinciding values', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  await render({
    presets: [
      { id: 'billing', label: 'Next period', value: '2026-09-12' },
      { id: 'reporting', label: 'Next period', value: '2026-09-12' },
    ],
  })
  expect(
    buttons().filter((node) => node.textContent === 'Next period'),
  ).toHaveLength(2)
  expect(errors.mock.calls.flat().join(' ')).not.toContain('same key')
})
it('localizes built-in actions and makes clearing an empty value unavailable', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-12T12:30Z'))
  const change = vi.fn()
  await render({
    labels: { clear: 'Очистить', now: 'Сейчас' },
    closeOnSelect: false,
    onValueChange: change,
  })
  expect(button('Очистить')).toBeDefined()
  expect(button('Сейчас')).toBeDefined()
  expect(button('Очистить')!.disabled).toBe(true)
  await click(button('Сейчас')!)
  expect(submitted()).toBe('2026-09-12')
  expect(button('Очистить')!.disabled).toBe(false)
  await click(button('Очистить')!)
  expect(change.mock.calls).toEqual([
    [{ value: '2026-09-12' }],
    [{ value: null }],
  ])
  expect(button('Очистить')!.disabled).toBe(true)
})
it('showClear/showNow independently control shortcuts while explicit presets stay usable', async () => {
  const props = {
    presets: [{ id: 'release', label: 'Release', value: '2026-09-12' }],
  }
  await render({ ...props, showClear: false, showNow: true })
  expect(button('Clear')).toBeUndefined()
  expect(button('Now')).toBeDefined()
  expect(button('Release')).toBeDefined()
  await render({ ...props, showClear: true, showNow: false })
  expect(button('Clear')).toBeDefined()
  expect(button('Now')).toBeUndefined()
  await render({ ...props, showClear: false, showNow: false })
  expect(button('Clear')).toBeUndefined()
  expect(button('Now')).toBeUndefined()
  expect(button('Release')).toBeDefined()
})

it('clears an incomplete range once and disables the empty range action', async () => {
  const change = vi.fn()
  await render({
    selection: 'range',
    defaultValue: { start: null, end: '2026-09-12' },
    onValueChange: change,
  })
  expect(button('Clear')!.disabled).toBe(false)
  await click(button('Clear')!)
  expect(change).toHaveBeenCalledExactlyOnceWith({
    value: { start: null, end: null },
  })
  expect(button('Clear')!.disabled).toBe(true)
  await click(button('Clear')!)
  expect(change).toHaveBeenCalledTimes(1)
})
it('keeps built-in actions named when custom labels are blank', async () => {
  await render({ labels: { clear: ' ', now: '' }, defaultValue: '2026-09-12' })
  expect(button('Clear')).toBeDefined()
  expect(button('Now')).toBeDefined()
})
it('converts a native Date preset into the owning timezone with the field precision', async () => {
  const change = vi.fn()
  await render({
    timezone: 'Asia/Tokyo',
    valueFormat: 'date',
    onValueChange: change,
    closeOnSelect: false,
    presets: [
      { id: 'release', label: 'Release', value: new Date('2026-09-11T23:30Z') },
    ],
  })
  await click(button('Release')!)
  expect(submitted()).toBe('2026-09-12')
  expect(change).toHaveBeenCalledTimes(1)
  expect(change.mock.calls[0][0].value).toBeInstanceOf(Date)
  expect(change.mock.calls[0][0].value.toISOString()).toBe(
    '2026-09-11T15:00:00.000Z',
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
describe('invalid preset configuration names the owning action', () => {
  const caught = (event: ErrorEvent) => {
    if (event.error instanceof RangeError) event.preventDefault()
  }
  beforeEach(() => window.addEventListener('error', caught))
  afterEach(() => window.removeEventListener('error', caught))
  it.each([
    [{ presets: new Array(1) }, 'presets[0]'],
    [{ presets: [{ label: 'Release', value: '2026-09-12' }] }, 'presets[0].id'],
    [
      { presets: [{ id: 'release', label: ' ', value: '2026-09-12' }] },
      'presets[0].label',
    ],
    [
      { presets: [{ id: 'release', label: 'Release', value: null }] },
      'presets[0].value',
    ],
    [
      { presets: [{ id: 'release', label: 'Release', value: '2026-02-30' }] },
      'presets[0].value',
    ],
    [
      {
        presets: [
          {
            id: 'release',
            label: 'Release',
            value: { start: '2026-09-12', end: null },
          },
        ],
      },
      'presets[0].value',
    ],
    [
      {
        selection: 'range',
        presets: [{ id: 'release', label: 'Release', value: '2026-09-12' }],
      },
      'presets[0].value',
    ],
    [
      {
        selection: 'range',
        presets: [
          {
            id: 'release',
            label: 'Release',
            value: { start: null, end: null },
          },
        ],
      },
      'presets[0].value',
    ],
    [
      {
        presets: [
          { id: 'release', label: 'A', value: '2026-09-12' },
          { id: 'release', label: 'B', value: '2026-09-13' },
        ],
      },
      'presets[1].id',
    ],
  ])('rejects %j', async (props, prop) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () =>
      root.render(
        <Boundary>
          <DateField {...(props as DateProps)} />
        </Boundary>,
      ),
    )
    const error = host.querySelector('[data-error="RangeError"]')
    expect(error).not.toBeNull()
    expect(error!.textContent).toContain(prop)
  })
})
