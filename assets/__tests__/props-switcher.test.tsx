// @vitest-environment jsdom
import React, { act, createRef, Fragment, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Switcher } from '../../Switcher/Switcher'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
const control = () => host.querySelector<HTMLInputElement>('input')!
const render = (props: Record<string, unknown> = {}) =>
  act(async () => root.render(<Switcher {...props} />))
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Switcher prop contract', () => {
  it('ref exposes the native switch without detaching on parent updates', async () => {
    const ref = vi.fn()
    await render({ ref, label: 'Setting' })
    expect(ref.mock.calls[0][0]).toBe(control())
    ref.mockClear()
    await render({ ref, label: 'Renamed', checked: true })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'supports callback ref cleanup in StrictMode',
    async () => {
      const active = new Set<HTMLInputElement>(),
        cleanup = vi.fn()
      const ref = (node: HTMLInputElement | null) => {
        expect(node?.tagName).toBe('INPUT')
        if (node) active.add(node)
        return () => {
          if (node) active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Switcher {...({ ref } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Switcher {...({ ref: createRef<HTMLInputElement>() } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('routes field attributes to input and visual attributes to the whole field', async () => {
    await render({
      id: 'updates',
      name: 'setting',
      value: 'yes',
      form: 'settings',
      tabIndex: -1,
      title: 'Help',
      lang: 'ar',
      dir: 'rtl',
      hidden: true,
      style: { width: 180 },
      className: 'custom',
      'data-trace': 'field',
      'aria-describedby': 'help',
    })
    expect(control().id).toBe('updates')
    expect(control().getAttribute('form')).toBe('settings')
    expect(control().tabIndex).toBe(-1)
    expect(control().getAttribute('data-trace')).toBe('field')
    expect(control().getAttribute('aria-describedby')).toBe('help')
    const field = host.querySelector<HTMLElement>('.uf-switcher')!
    expect(field.hidden).toBe(true)
    expect(field.dir).toBe('rtl')
    expect(field.lang).toBe('ar')
    expect(field.title).toBe('Help')
    expect(field.style.width).toBe('180px')
    expect(field.classList.contains('custom')).toBe(true)
  })
  it('keeps explicit accessible names and native label association', async () => {
    await render({ label: 'Visible', 'aria-label': 'Complete setting name' })
    expect(control().getAttribute('aria-label')).toBe('Complete setting name')
    expect(control().hasAttribute('aria-labelledby')).toBe(false)
    expect(control().labels?.[0]?.textContent).toContain('Visible')
  })
  it('does not create empty labels for boolean or empty fragment content', async () => {
    for (const label of [false, true, '', <Fragment />]) {
      await render({ label })
      expect(host.querySelector('[data-part="label"]')).toBeNull()
    }
    await render({ label: 0 })
    expect(host.querySelector('[data-part="label"]')?.textContent).toBe('0')
    await render({ label: <strong>Rich</strong> })
    expect(host.querySelector('[data-part="label"] strong')?.textContent).toBe(
      'Rich',
    )
  })
  it('notifies native and value observers once when a visible label is activated', async () => {
    const onClick = vi.fn(),
      onChange = vi.fn(),
      onCheckedChange = vi.fn()
    await render({ label: 'Setting', onClick, onChange, onCheckedChange })
    await act(async () =>
      host.querySelector<HTMLElement>('[data-part="label"]')!.click(),
    )
    expect(control().checked).toBe(true)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: true })
    expect(onChange.mock.calls[0][0].target).toBe(control())
  })
  it('can be controlled by the native onChange handler', async () => {
    function Field() {
      const [checked, setChecked] = useState(false)
      return (
        <Switcher
          {...({
            checked,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setChecked(e.currentTarget.checked),
          } as any)}
        />
      )
    }
    await act(async () => root.render(<Field />))
    await act(async () => control().click())
    expect(control().checked).toBe(true)
  })
  it('preserves checked state and suppresses change notifications when a native click is canceled', async () => {
    const onChange = vi.fn(),
      onCheckedChange = vi.fn()
    await render({
      onClick: (e: React.MouseEvent) => e.preventDefault(),
      onChange,
      onCheckedChange,
    })
    await act(async () => control().click())
    expect(control().checked).toBe(false)
    expect(control().getAttribute('aria-checked')).toBe('false')
    expect(onChange).not.toHaveBeenCalled()
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
  it('defaultChecked is initial-only and disabled controlled changes are quiet', async () => {
    const first = vi.fn(),
      second = vi.fn()
    await render({ defaultChecked: true, onCheckedChange: first })
    expect(control().checked).toBe(true)
    await render({ defaultChecked: false, onCheckedChange: second })
    expect(control().checked).toBe(true)
    await render({ checked: false, disabled: true, onCheckedChange: second })
    expect(control().checked).toBe(false)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    await render({ disabled: false, onCheckedChange: second })
    await act(async () => control().click())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith({ checked: true })
  })
})
