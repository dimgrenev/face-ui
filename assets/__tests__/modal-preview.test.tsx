/// <reference types="vite/client" />
import { act, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal, type ModalProps } from '../../Modal/Modal'
import descriptor from '../../Modal/Modal.json'
import createProject from '../../Modal/Modal.create-project.face.json'
import recordInspector from '../../Modal/Modal.record-inspector.face.json'
import { mount } from './harness'

type CheckContext = {
  canvas: HTMLElement
  signal: AbortSignal
  assert(condition: unknown, message?: string): asserts condition
  waitFor(assertion: () => void | Promise<void>): Promise<void>
}
type ExampleModule = {
  ModalPreview: ComponentType<ModalProps>
  userfaceExample: { checks: Array<{ id: string; name: string; run(context: CheckContext): Promise<void> }> }
}
const examples = import.meta.glob<ExampleModule>('../../Modal/*.preview.tsx', { eager: true })
function selectedExample() {
  const reference = (descriptor as typeof descriptor & { preview?: { entryPath: string; exportName: string } }).preview
  const module = reference && examples[`../../Modal/${reference.entryPath.replace(/^\.\//, '')}`]
  if (reference && (!module || reference.exportName !== 'ModalPreview')) throw new Error('The declared Modal example did not resolve.')
  return { Component: module ? module.ModalPreview : Modal, definition: module ? module.userfaceExample : undefined }
}
function fixture(initialProps: ModalProps) {
  const { host, root } = mount(), { Component, definition } = selectedExample()
  let props = initialProps, generation = 0
  const render = async (patch: Partial<ModalProps> = {}) => {
    props = { ...props, ...patch }
    await act(async () => root.render(<Component key={generation} {...props} />))
  }
  const part = (name: string) => {
    const selector = `[data-scope="modal"][data-part="${name}"]`
    const contentId = host.querySelector<HTMLElement>('[data-face-modal-example]')?.dataset.contentId
    const content = contentId ? host.ownerDocument.getElementById(contentId) : null
    return host.querySelector<HTMLElement>(selector) ?? (name === 'content' ? content : content?.querySelector<HTMLElement>(selector)) ?? null
  }
  return { host, root, definition, render, part, reset: async () => { generation++; await render() } }
}

describe('authored Modal Face lifecycle', () => {
  it.each([...descriptor.states, createProject.currentState, recordInspector.currentState])('closes and reopens the actual Face state %#', async state => {
    const f = fixture(state.props as ModalProps)
    await f.render()
    expect(f.part('content')?.dataset.state).toBe('open')
    await act(async () => f.part('close')!.click())
    expect(f.part('content')).toBeNull()
    expect(f.part('trigger'), 'A closed authored example must remain reopenable.').not.toBeNull()
    await act(async () => f.part('trigger')!.click())
    expect(f.part('content')?.dataset.state).toBe('open')
  })

  it('exports real callable checks through the existing example shape', () => {
    const { definition } = selectedExample()
    expect(definition?.checks).toHaveLength(1)
    expect(definition?.checks[0]?.run).toBeTypeOf('function')
  })

  it('adopts changed open inputs without reopening a user-closed dialog on unrelated props', async () => {
    const f = fixture({ open: true, portal: false, title: 'Initial title' })
    await f.render()
    const instance = f.host.firstElementChild, trigger = f.part('trigger')
    await act(async () => f.part('close')!.click())
    await f.render({ title: 'Edited title' })
    expect(f.part('content')).toBeNull()
    await f.render({ open: false }); await f.render({ open: true })
    expect(f.part('content')?.textContent).toContain('Edited title')
    expect(f.host.firstElementChild).toBe(instance); expect(f.part('trigger')).toBe(trigger)
  })

  it('reads defaultOpen once and restores current authored inputs through a fresh Reset mount', async () => {
    const f = fixture({ defaultOpen: true, portal: false, title: 'Mount default' })
    await f.render(); const instance = f.host.firstElementChild
    await act(async () => f.part('close')!.click())
    await f.render({ defaultOpen: false }); await f.render({ defaultOpen: true })
    expect(f.part('content')).toBeNull()
    await f.reset()
    expect(f.host.firstElementChild).not.toBe(instance)
    expect(f.part('content')?.dataset.state).toBe('open')
  })

  it('keeps independent instances closed or open without shared state', async () => {
    const a = fixture({ open: true, portal: false, title: 'A' }), b = fixture({ open: true, portal: false, title: 'B' })
    await a.render(); await b.render()
    await act(async () => a.part('close')!.click())
    expect(a.part('content')).toBeNull(); expect(b.part('content')?.textContent).toContain('B')
    await a.reset()
    expect(a.part('content')?.textContent).toContain('A'); expect(b.part('content')?.textContent).toContain('B')
  })

  it('leaves the literal Modal controlled contract unchanged', async () => {
    const { host, root } = mount()
    await act(async () => root.render(<Modal open portal={false} title="Literal Source" />))
    await act(async () => host.querySelector<HTMLButtonElement>('[data-part="close"]')!.click())
    expect(host.querySelector('[data-part="content"]')?.getAttribute('data-state')).toBe('open')
  })

  it.each([true, false])('rejects repeat checks without a reopen trigger before changing open=%s', async open => {
    const f = fixture({ open, portal: false, trigger: null, title: 'No reopen trigger' }); await f.render()
    const content = f.part('content')
    const context: CheckContext = {
      canvas: f.host, signal: new AbortController().signal,
      assert(condition, message) { if (!condition) throw new Error(message) },
      async waitFor(assertion) { await act(async () => {}); await assertion() },
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(f.definition!.checks[0]!.run(context)).rejects.toThrow(/requires a configured trigger/i)
      expect(f.part('content')).toBe(content)
      expect(f.host.querySelector<HTMLElement>('[data-face-modal-example]')?.dataset.open).toBe(String(open))
    }
  })

  it.each([
    { open: true, portal: false }, { open: false, portal: false },
    { open: true, portal: true }, { open: true, portal: false, closable: false },
  ])('runs its authored check against real controls and preserves configured state: %j', async options => {
    const f = fixture({ ...options, title: 'Check dialog' }); await f.render()
    const click = HTMLElement.prototype.click
    const clicks = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(function (this: HTMLElement) {
      act(() => click.call(this))
    })
    try {
      const definition = f.definition!
      const context: CheckContext = {
        canvas: f.host, signal: new AbortController().signal,
        assert(condition, message) { expect(condition, message).toBeTruthy() },
        async waitFor(assertion) { await act(async () => {}); await assertion() },
      }
      await definition.checks[0]!.run(context)
      expect(f.host.querySelector<HTMLElement>('[data-face-modal-example]')?.dataset.open).toBe(String(options.open))
      if (options.closable === false) expect(f.part('close')).toBeNull()
      else expect(clicks).toHaveBeenCalled()
    } finally { clicks.mockRestore() }
  })
})
