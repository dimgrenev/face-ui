import { act, StrictMode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { acquireFocusModality } from '../runtime/focus-modality'
import { Membrane } from '../adapters/react/Membrane'
import { mount } from './harness'

const attribute = 'data-uf-focus-modality'
const releases: Array<() => void> = []
const acquire = (doc = document) => {
  const release = acquireFocusModality(doc)
  releases.push(release)
  return release
}
const pointer = (target: EventTarget = document) =>
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }))
const key = (key: string, options: KeyboardEventInit = {}, target: EventTarget = document) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }))

afterEach(() => {
  while (releases.length) releases.pop()!()
  vi.restoreAllMocks()
})

it('keeps native initial focus and shares one capture listener pair until the last lease ends', () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const first = acquire()
  const second = acquire()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  for (const type of ['pointerdown', 'keydown', 'focusin', 'focusout']) {
    expect(add.mock.calls.filter(call => call[0] === type)).toHaveLength(1)
    expect(add.mock.calls.find(call => call[0] === type)?.[2]).toBe(true)
  }
  pointer()
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  const changes = new MutationObserver(() => {})
  changes.observe(document.documentElement, { attributes: true, attributeFilter: [attribute] })
  pointer()
  pointer()
  expect(changes.takeRecords()).toHaveLength(0)
  first()
  first()
  key('ArrowDown')
  expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  expect(changes.takeRecords()).toHaveLength(1)
  key('a')
  key('b')
  expect(changes.takeRecords()).toHaveLength(0)
  changes.disconnect()
  expect(remove.mock.calls.filter(call => call[0] === 'keydown')).toHaveLength(0)
  second()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  for (const type of ['pointerdown', 'keydown', 'focusin', 'focusout']) {
    const added = add.mock.calls.find(call => call[0] === type)!
    expect(remove.mock.calls.filter(call => call[0] === type)).toEqual([added])
  }
  pointer()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
})

it('handles keyboard navigation, activation and typeahead while ignoring modifiers and command shortcuts', () => {
  acquire()
  for (const name of ['Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape', 'a']) {
    pointer()
    key(name)
    expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  }
  for (const options of [{ shiftKey: true }, { altKey: true }, { altKey: true, shiftKey: true }]) {
    pointer()
    key('Tab', options)
    expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  }
  pointer()
  for (const name of ['Alt', 'AltGraph', 'Control', 'Meta', 'Shift', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn', 'FnLock', '']) {
    key(name)
    expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  }
  for (const options of [{ altKey: true }, { metaKey: true }, { ctrlKey: true }]) {
    key('a', options)
    expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  }
})

it('runs before target focus forwarding, including events outside Face UI and portaled layers', () => {
  acquire()
  const target = document.body.appendChild(document.createElement('button'))
  const observed: Array<string | null> = []
  target.addEventListener('pointerdown', () => {
    target.focus()
    observed.push(document.documentElement.getAttribute(attribute))
  })
  target.addEventListener('keydown', () => observed.push(document.documentElement.getAttribute(attribute)))
  key('Tab')
  pointer(target)
  key('Escape', {}, target)
  expect(observed).toEqual(['pointer', 'keyboard'])
  expect(document.activeElement).toBe(target)
  target.remove()
})

it('restores an existing marker and leaves a foreign replacement untouched', () => {
  document.documentElement.setAttribute(attribute, 'host-default')
  const first = acquire()
  expect(document.documentElement.getAttribute(attribute)).toBe('host-default')
  pointer()
  first()
  expect(document.documentElement.getAttribute(attribute)).toBe('host-default')
  const second = acquire()
  key('Tab')
  document.documentElement.setAttribute(attribute, 'host-replacement')
  second()
  expect(document.documentElement.getAttribute(attribute)).toBe('host-replacement')
  document.documentElement.removeAttribute(attribute)
  const untouched = acquire()
  document.documentElement.setAttribute(attribute, 'external-before-input')
  untouched()
  expect(document.documentElement.getAttribute(attribute)).toBe('external-before-input')
  document.documentElement.removeAttribute(attribute)
})

it('keeps document registries independent', () => {
  const other = document.implementation.createHTMLDocument('Other owner')
  const first = acquire()
  const second = acquire(other)
  pointer()
  key('Tab', {}, other)
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  expect(other.documentElement.getAttribute(attribute)).toBe('keyboard')
  first()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  expect(other.documentElement.getAttribute(attribute)).toBe('keyboard')
  second()
  expect(other.documentElement.hasAttribute(attribute)).toBe(false)
})

it('returns to native focus after window blur while sibling leases keep tracking local input', () => {
  const add = vi.spyOn(window, 'addEventListener')
  const remove = vi.spyOn(window, 'removeEventListener')
  const first = acquire()
  const second = acquire()
  expect(add.mock.calls.filter(call => call[0] === 'blur')).toHaveLength(1)
  pointer()
  window.dispatchEvent(new Event('blur'))
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  key('Tab')
  expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  first()
  expect(remove.mock.calls.filter(call => call[0] === 'blur')).toHaveLength(0)
  pointer()
  window.dispatchEvent(new Event('blur'))
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  key('ArrowDown')
  expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  second()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  const added = add.mock.calls.find(call => call[0] === 'blur')!
  expect(remove.mock.calls.filter(call => call[0] === 'blur')).toEqual([added])
  window.dispatchEvent(new Event('blur'))
  key('Tab')
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
})

it('restores the host marker on blur and preserves foreign replacements through blur and release', () => {
  document.documentElement.setAttribute(attribute, 'host-default')
  const first = acquire()
  pointer()
  window.dispatchEvent(new Event('blur'))
  expect(document.documentElement.getAttribute(attribute)).toBe('host-default')
  document.documentElement.setAttribute(attribute, 'host-replacement')
  first()
  expect(document.documentElement.getAttribute(attribute)).toBe('host-replacement')
  const second = acquire()
  key('Tab')
  document.documentElement.setAttribute(attribute, 'foreign-write')
  window.dispatchEvent(new Event('blur'))
  expect(document.documentElement.getAttribute(attribute)).toBe('foreign-write')
  second()
  expect(document.documentElement.getAttribute(attribute)).toBe('foreign-write')
  document.documentElement.removeAttribute(attribute)
})

it('resets only the blurred window document and cleans up its listener independently', () => {
  const iframe = document.body.appendChild(document.createElement('iframe'))
  const other = iframe.contentDocument!
  const otherView = other.defaultView!
  const first = acquire()
  const second = acquire(other)
  pointer()
  key('Tab', {}, other)
  window.dispatchEvent(new Event('blur'))
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  expect(other.documentElement.getAttribute(attribute)).toBe('keyboard')
  pointer()
  otherView.dispatchEvent(new Event('blur'))
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  expect(other.documentElement.hasAttribute(attribute)).toBe(false)
  second()
  key('Tab', {}, other)
  otherView.dispatchEvent(new Event('blur'))
  expect(other.documentElement.hasAttribute(attribute)).toBe(false)
  first()
  iframe.remove()
})

it('resets owned modality after settled parent focus enters an iframe without a window blur', async () => {
  acquire()
  const input = document.body.appendChild(document.createElement('input'))
  const frame = document.body.appendChild(document.createElement('iframe'))
  input.focus()
  pointer()
  frame.focus()
  await Promise.resolve()
  expect(document.activeElement).toBe(frame)
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  key('Tab')
  input.focus()
  await Promise.resolve()
  expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  pointer()
  frame.focus()
  document.documentElement.setAttribute(attribute, 'foreign-frame-owner')
  await Promise.resolve()
  expect(document.documentElement.getAttribute(attribute)).toBe('foreign-frame-owner')
  document.documentElement.removeAttribute(attribute)
  frame.remove()
  input.remove()
})

it('preserves pointer modality for local transfers and a frame focus that moves back within the same turn', async () => {
  acquire()
  const input = document.body.appendChild(document.createElement('input'))
  const button = document.body.appendChild(document.createElement('button'))
  const frame = document.body.appendChild(document.createElement('iframe'))
  input.focus()
  pointer()
  button.focus()
  await Promise.resolve()
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  frame.focus()
  button.focus()
  await Promise.resolve()
  expect(document.activeElement).toBe(button)
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  frame.remove()
  button.remove()
  input.remove()
})

it('does not reset another owner after a queued focus observation is disposed', async () => {
  const release = acquire()
  const input = document.body.appendChild(document.createElement('input'))
  const frame = document.body.appendChild(document.createElement('iframe'))
  input.focus()
  pointer()
  frame.focus()
  release()
  document.documentElement.setAttribute(attribute, 'pointer')
  await Promise.resolve()
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  document.documentElement.removeAttribute(attribute)
  frame.remove()
  input.remove()
})

it('retains a stable Membrane registration through StrictMode and spacing rerenders, then releases it', async () => {
  const view = mount()
  const ref = vi.fn()
  const show = (enabled: boolean) => act(async () => view.root.render(
    <StrictMode><Membrane enabled={enabled} ref={ref as Ref<HTMLElement>} interactive><button>Save</button></Membrane></StrictMode>,
  ))
  await show(true)
  const node = view.host.firstElementChild
  expect(ref).toHaveBeenLastCalledWith(node)
  pointer()
  for (const enabled of [false, true, false]) {
    await show(enabled)
    expect(view.host.firstElementChild).toBe(node)
    expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  }
  key('Tab')
  expect(document.documentElement.getAttribute(attribute)).toBe('keyboard')
  await act(async () => view.root.render(null))
  expect(ref).toHaveBeenLastCalledWith(null)
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  pointer()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
})

it('binds Membranes to their actual ownerDocument when a portal moves between documents', async () => {
  const view = mount()
  const other = document.implementation.createHTMLDocument('Portal owner')
  const show = (host: HTMLElement) => act(async () => view.root.render(
    createPortal(<Membrane><button>Portal action</button></Membrane>, host),
  ))
  await show(view.host)
  pointer()
  expect(document.documentElement.getAttribute(attribute)).toBe('pointer')
  await show(other.body)
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  key('Tab', {}, other)
  expect(other.documentElement.getAttribute(attribute)).toBe('keyboard')
  pointer()
  expect(document.documentElement.hasAttribute(attribute)).toBe(false)
  await act(async () => view.root.render(null))
  expect(other.documentElement.hasAttribute(attribute)).toBe(false)
})
