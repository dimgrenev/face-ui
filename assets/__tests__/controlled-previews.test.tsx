/// <reference types="vite/client" />
import { act, createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../../Checkbox/Checkbox'
import { Date as DateField } from '../../Date/Date'
import { Pagination } from '../../Pagination/Pagination'
import { Toc } from '../../Toc/Toc'
import checkbox from '../../Checkbox/Checkbox.json'
import partialSelection from '../../Checkbox/Checkbox.partial-selection.face.json'
import date from '../../Date/Date.json'
import pagination from '../../Pagination/Pagination.json'
import toc from '../../Toc/Toc.json'
import { mount } from './harness'

type CheckContext = {
  canvas: HTMLElement
  signal: AbortSignal
  assert(condition: unknown, message?: string): asserts condition
  waitFor(assertion: () => void | Promise<void>): Promise<void>
}
type ExampleModule = Record<string, unknown> & {
  userfaceExample: { checks: Array<{ id: string; name: string; run(context: CheckContext): Promise<void> }> }
}
const modules = import.meta.glob<ExampleModule>('../../{Checkbox,Date,Pagination,Toc}/*.preview.tsx', { eager: true })
const families = {
  Checkbox: { descriptor: checkbox, raw: Checkbox }, Date: { descriptor: date, raw: DateField },
  Pagination: { descriptor: pagination, raw: Pagination }, Toc: { descriptor: toc, raw: Toc },
}
type Family = keyof typeof families
function fixture(name: Family, initial: Record<string, unknown>, literal = false) {
  const { host, root } = mount()
  const reference = (families[name].descriptor as { preview?: { entryPath: string; exportName: string } }).preview
  const module = !literal && reference ? modules[`../../${name}/${reference.entryPath.replace(/^\.\//, '')}`] : undefined
  if (reference && !literal && !module) throw new Error(`The authored ${name} example does not resolve.`)
  const Component = (module ? module[reference!.exportName] : families[name].raw) as ComponentType<Record<string, unknown>>
  let props = initial, generation = 0
  const render = async (patch: Record<string, unknown> = {}) => {
    props = { ...props, ...patch }
    await act(async () => root.render(createElement(Component, { ...props, key: generation })))
  }
  return { host, root, render, definition: module?.userfaceExample, reset: async () => { generation++; await render() } }
}
const click = async (button: HTMLElement | null) => {
  expect(button, 'A real control must be available.').not.toBeNull()
  await act(async () => button!.click())
}
const dateTrigger = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[data-scope="date"][data-part="trigger"]')!
const dateContent = (host: HTMLElement) => host.ownerDocument.getElementById(dateTrigger(host).getAttribute('aria-controls') ?? '')!
const serializedDate = (host: HTMLElement) => host.querySelector<HTMLSelectElement>('select[aria-hidden="true"]')!.value
const currentPage = (host: HTMLElement) => Number(host.querySelector('[aria-current="page"]')?.getAttribute('data-page'))
const currentEntry = (host: HTMLElement) => host.querySelector('[aria-current="location"]')?.getAttribute('data-value')
async function clearDate(host: HTMLElement) {
  if (dateTrigger(host).getAttribute('aria-expanded') !== 'true') await click(dateTrigger(host))
  const clear = Array.from(dateContent(host).querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Clear')!
  await click(clear)
}
async function runCheck(f: ReturnType<typeof fixture>, signal = new AbortController().signal) {
  expect(f.definition?.checks).toHaveLength(1)
  const nativeClick = HTMLElement.prototype.click
  const spy = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(function (this: HTMLElement) {
    act(() => nativeClick.call(this))
  })
  const dispatch = EventTarget.prototype.dispatchEvent
  const keySpy = vi.spyOn(EventTarget.prototype, 'dispatchEvent').mockImplementation(function (this: EventTarget, event: Event) {
    if (!(event instanceof KeyboardEvent)) return dispatch.call(this, event)
    let accepted = false
    act(() => { accepted = dispatch.call(this, event) })
    return accepted
  })
  try {
    await f.definition!.checks[0]!.run({
      canvas: f.host, signal,
      assert(condition, message) { if (!condition) throw new Error(message) },
      async waitFor(assertion) { await act(async () => {}); await assertion() },
    })
  } finally { keySpy.mockRestore(); spy.mockRestore() }
}

describe('authored owners for ten enabled controlled Face states', () => {
  it('repeats the bounded empty Date check after the allowed month and resets its configured value', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new globalThis.Date('2026-10-18T12:00:00Z'))
    try {
      const state = date.states.find(state => state.name === 'With Validation')!
      const notify = vi.fn(), f = fixture('Date', { ...state.props, onValueChange: notify })
      await f.render()
      const document = f.host.ownerDocument, original = dateTrigger(f.host)
      expect(serializedDate(f.host)).toBe('')
      await runCheck(f); await runCheck(f)
      expect(serializedDate(f.host)).toMatch(/^2026-03-/)
      expect(dateTrigger(f.host)).toBe(original)
      expect(notify).toHaveBeenCalled()
      await f.reset()
      expect(serializedDate(f.host)).toBe('')
      expect(dateTrigger(f.host)).not.toBe(original)
      expect(f.host.ownerDocument).toBe(document)
      await runCheck(f)
      expect(serializedDate(f.host)).toMatch(/^2026-03-/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('Partial Selection commits real mixed → checked → unchecked changes', async () => {
    const f = fixture('Checkbox', partialSelection.currentState.props)
    await f.render()
    const control = f.host.querySelector<HTMLInputElement>('input')!
    expect(control.getAttribute('aria-checked')).toBe('mixed')
    await click(control); expect(control.getAttribute('aria-checked')).toBe('true')
    await click(control); expect(control.getAttribute('aria-checked')).toBe('false')
  })

  it.each(date.states.filter(state => ['DateTime', 'Time', 'Range', 'Week', 'Month', 'Year'].includes(state.name)))(
    'Date $name commits Clear through its actual portaled picker', async state => {
      const f = fixture('Date', state.props)
      await f.render(); expect(serializedDate(f.host)).not.toBe('')
      await click(dateTrigger(f.host))
      const clear = Array.from(dateContent(f.host).querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Clear')!
      await click(clear)
      expect(serializedDate(f.host)).toBe('')
    },
  )

  it.each(pagination.states.filter(state => ['Middle Page', 'Large Dataset'].includes(state.name)))(
    'Pagination $name commits a real next-page request', async state => {
      const f = fixture('Pagination', state.props); await f.render()
      const initial = currentPage(f.host)
      await click(f.host.querySelector('[data-scope="pagination"][data-part="next"]'))
      expect(currentPage(f.host)).toBe(initial + 1)
    },
  )

  it('Toc Controlled moves actual aria-current to the selected entry', async () => {
    const state = toc.states.find(state => state.name === 'Controlled')!
    const f = fixture('Toc', state.props); await f.render()
    await click(f.host.querySelector('a[data-value="setup"]'))
    expect(f.host.querySelector('[aria-current="location"]')?.getAttribute('data-value')).toBe('setup')
  })

  it('adopts changed checked inputs, forwards actual callbacks and keeps unrelated edits quiet', async () => {
    const notify = vi.fn(), f = fixture('Checkbox', { ...partialSelection.currentState.props, onCheckedChange: notify })
    await f.render(); const input = f.host.querySelector<HTMLInputElement>('input')!
    await click(input); expect(input.getAttribute('aria-checked')).toBe('true')
    expect(notify).toHaveBeenLastCalledWith({ checked: true })
    await f.render({ label: 'Renamed', value: 'submitted', checked: 'indeterminate' })
    expect(input.getAttribute('aria-checked')).toBe('true')
    await f.render({ checked: false }); expect(input.getAttribute('aria-checked')).toBe('false')
    expect(notify).toHaveBeenCalledTimes(1)
    await click(input); await f.reset()
    expect(f.host.querySelector('input')).not.toBe(input)
    expect(f.host.querySelector('input')?.getAttribute('aria-checked')).toBe('false')
  })

  it.each([
    { selection: 'range', value: { start: '2026-03-03', end: '2026-03-09' }, changed: { start: '2026-04-01', end: '2026-04-04' } },
    { value: new globalThis.Date('2026-03-03T12:30:00Z'), changed: new globalThis.Date('2026-04-01T12:30:00Z') },
  ])('retains Date interaction for equal external copies and adopts genuinely changed values: %#', async options => {
    const notify = vi.fn(), f = fixture('Date', { ...options, label: 'Date', onValueChange: notify })
    await f.render(); const trigger = dateTrigger(f.host)
    await clearDate(f.host); expect(serializedDate(f.host)).toBe('')
    const equalCopy = options.value instanceof globalThis.Date ? new globalThis.Date(options.value) : { ...options.value }
    await f.render({ value: equalCopy, label: 'Edited label', presets: [] })
    expect(serializedDate(f.host)).toBe(''); expect(dateTrigger(f.host)).toBe(trigger)
    await f.render({ value: options.changed })
    expect(serializedDate(f.host)).toContain('2026-04-01')
    expect(notify).toHaveBeenCalledTimes(1)
    await clearDate(f.host); await f.reset()
    expect(dateTrigger(f.host)).not.toBe(trigger)
    expect(serializedDate(f.host)).toContain('2026-04-01')
  })

  it('adopts page changes, forwards the page callback and preserves local navigation on presentation edits', async () => {
    const notify = vi.fn(), f = fixture('Pagination', { total: 100, page: 5, onPageChange: notify })
    await f.render(); const nav = f.host.querySelector('nav')
    await click(f.host.querySelector('[data-part="next"]'))
    await f.render({ page: 5, siblingCount: 2, 'aria-label': 'Edited pagination' })
    expect(currentPage(f.host)).toBe(6); expect(f.host.querySelector('nav')).toBe(nav)
    expect(notify).toHaveBeenLastCalledWith({ page: 6 })
    await f.render({ page: 3 }); expect(currentPage(f.host)).toBe(3)
    expect(notify).toHaveBeenCalledTimes(1)
    await click(f.host.querySelector('[data-part="next"]')); await f.reset()
    expect(currentPage(f.host)).toBe(3)
  })

  it('adopts Toc input changes while preserving real onSelect and callback payloads', async () => {
    const notify = vi.fn(), select = vi.fn(), state = toc.states.find(state => state.name === 'Controlled')!
    const f = fixture('Toc', { ...state.props, onValueChange: notify, onSelect: select }); await f.render()
    await click(f.host.querySelector('a[data-value="setup"]'))
    await f.render({ items: state.props.items.map(item => ({ ...item })), value: 'usage', line: 'end' })
    expect(currentEntry(f.host)).toBe('setup')
    expect(notify).toHaveBeenLastCalledWith({ value: 'setup' })
    expect(select.mock.calls[0]![0]).toMatchObject({ value: 'setup', event: expect.any(Object) })
    await f.render({ value: 'intro' }); expect(currentEntry(f.host)).toBe('intro')
    expect(notify).toHaveBeenCalledTimes(1)
    await click(f.host.querySelector('a[data-value="setup"]')); await f.reset()
    expect(currentEntry(f.host)).toBe('intro')
  })

  it('preserves existing uncontrolled native form reset for Checkbox and Date', async () => {
    const a = fixture('Checkbox', { defaultChecked: true, label: 'Uncontrolled' })
    await a.render(); const checkboxInput = a.host.querySelector<HTMLInputElement>('input')!
    const checkboxForm = document.createElement('form'); a.host.before(checkboxForm); checkboxForm.append(a.host)
    await click(checkboxInput); expect(checkboxInput.checked).toBe(false)
    await act(async () => checkboxForm.reset()); expect(checkboxInput.checked).toBe(true)
    const b = fixture('Date', { defaultValue: '2026-03-03', label: 'Uncontrolled' })
    await b.render(); const dateForm = document.createElement('form'); b.host.before(dateForm); dateForm.append(b.host)
    await clearDate(b.host); expect(serializedDate(b.host)).toBe('')
    await act(async () => dateForm.reset()); expect(serializedDate(b.host)).toBe('2026-03-03')
  })

  it('keeps defaultPage/defaultValue mount-only without resetting local interaction', async () => {
    const a = fixture('Pagination', { total: 100, defaultPage: 5 }); await a.render()
    await click(a.host.querySelector('[data-part="next"]')); await a.render({ defaultPage: 2 })
    expect(currentPage(a.host)).toBe(6); await a.reset(); expect(currentPage(a.host)).toBe(2)
    const b = fixture('Toc', { items: toc.states[0]!.props.items, defaultValue: 'usage' }); await b.render()
    await click(b.host.querySelector('a[data-value="setup"]')); await b.render({ defaultValue: 'intro' })
    expect(currentEntry(b.host)).toBe('setup'); await b.reset(); expect(currentEntry(b.host)).toBe('intro')
  })

  it.each([
    ['omitted total', {}],
    ['zero total', { total: 0, page: 4 }],
    ['one item', { total: 1, page: 1 }],
    ['one full page', { total: 20, pageSize: 20, page: 3 }],
    ['less than one page', { total: 7, pageSize: 10, defaultPage: 5 }],
  ] as Array<[string, Record<string, unknown>]>)('checks a valid single-page Pagination without rejecting its enabled no-op: %s', async (_name, props) => {
    const notify = vi.fn(), f = fixture('Pagination', { ...props, onPageChange: notify })
    await f.render()
    const current = f.host.querySelector<HTMLButtonElement>('[aria-current="page"]')!
    expect(current.disabled).toBe(false)
    expect(currentPage(f.host)).toBe(1)
    await click(current)
    expect(notify).not.toHaveBeenCalled()
    await runCheck(f); await runCheck(f)
    expect(currentPage(f.host)).toBe(1)
    expect(notify).not.toHaveBeenCalled()
    await f.reset()
    expect(f.host.querySelector('[aria-current="page"]')).not.toBe(current)
    await runCheck(f)
    expect(currentPage(f.host)).toBe(1)
    expect(notify).not.toHaveBeenCalled()
    if (props.defaultPage === 5) {
      await f.render({ total: 100 })
      expect(currentPage(f.host)).toBe(5)
    }
  })

  it('does not accept broken multi-page navigation as a single-page no-op', async () => {
    const f = fixture('Pagination', { total: 100, page: 5 })
    await f.render()
    f.host.querySelector<HTMLButtonElement>('[data-part="next"]')!.disabled = true
    f.host.querySelector<HTMLButtonElement>('[data-part="prev"]')!.disabled = true
    expect(f.host.querySelector('button:not(:disabled):not([aria-current="page"])')).not.toBeNull()
    await expect(runCheck(f)).rejects.toThrow(/must not offer a page change/)
    expect(currentPage(f.host)).toBe(5)
  })

  it.each(['Checkbox', 'Date', 'Pagination', 'Toc'] as const)('isolates two %s instances and leaves the raw Source controlled', async name => {
    const state: Record<string, unknown> = name === 'Checkbox' ? partialSelection.currentState.props
      : name === 'Date' ? { mode: 'month', value: '2026-06-01' }
        : name === 'Pagination' ? { total: 100, page: 5 } : toc.states.find(state => state.name === 'Controlled')!.props
    const a = fixture(name, state), b = fixture(name, state), raw = fixture(name, state, true)
    await a.render(); await b.render(); await raw.render()
    const read = (host: HTMLElement) => name === 'Checkbox' ? host.querySelector('input')?.getAttribute('aria-checked')
      : name === 'Date' ? serializedDate(host) : name === 'Pagination' ? currentPage(host) : currentEntry(host)
    const change = async (host: HTMLElement) => name === 'Date' ? clearDate(host)
      : click(host.querySelector(name === 'Checkbox' ? 'input' : name === 'Pagination' ? '[data-part="next"]' : 'a[data-value="setup"]'))
    const initial = read(a.host)
    await change(a.host); await change(raw.host)
    expect(read(a.host)).not.toBe(initial); expect(read(b.host)).toBe(initial); expect(read(raw.host)).toBe(initial)
  })

  it.each([
    ['Checkbox', partialSelection.currentState.props],
    ...date.states.filter(state => ['DateTime', 'Time', 'Range', 'Week', 'Month', 'Year', 'Read Only'].includes(state.name)).map(state => ['Date', state.props]),
    ...pagination.states.filter(state => ['Middle Page', 'Large Dataset', 'Disabled'].includes(state.name)).map(state => ['Pagination', state.props]),
    ['Toc', toc.states.find(state => state.name === 'Controlled')!.props],
    ['Checkbox', { checked: true, disabled: true }],
  ] as Array<[Family, Record<string, unknown>]>)('runs %s authored checks twice and after Reset: %#', async (name, props) => {
    const f = fixture(name, props); await f.render()
    await runCheck(f); await runCheck(f); await f.reset(); await runCheck(f)
  })

  it.each(['Checkbox', 'Date', 'Pagination', 'Toc'] as const)('aborts %s checks before any control activation', async name => {
    const f = fixture(name, name === 'Toc' ? toc.states[0]!.props : {}); await f.render()
    const controller = new AbortController(); controller.abort(new Error('Owned cancellation'))
    const before = f.host.innerHTML
    await expect(runCheck(f, controller.signal)).rejects.toThrow('Owned cancellation')
    expect(f.host.innerHTML).toBe(before)
  })
})
