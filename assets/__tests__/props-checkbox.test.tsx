// @vitest-environment jsdom
import React, { act, createRef, Fragment, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../../Checkbox/Checkbox'
import contract from '../../Checkbox/Checkbox.json'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
const control = () => host.querySelector<HTMLInputElement>('input')!
const render = (props: Record<string, unknown> = {}) =>
  act(async () => root.render(<Checkbox {...props} />))
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Checkbox prop contract', () => {
  it('ref exposes the native control and stays attached across checked/label updates', async () => {
    const ref = vi.fn()
    await render({ ref, label: 'Choice' })
    expect(ref.mock.calls[0][0]).toBe(control())
    ref.mockClear()
    await render({ ref, label: 'Updated', checked: true })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'native callback ref cleanup works in StrictMode',
    async () => {
      const active = new Set<HTMLInputElement>(),
        cleanup = vi.fn()
      const ref = (node: HTMLInputElement | null) => {
        expect(node).not.toBeNull()
        if (!node) return
        expect(node.tagName).toBe('INPUT')
        active.add(node)
        return () => {
          active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Checkbox {...({ ref } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Checkbox {...({ ref: createRef<HTMLInputElement>() } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('forwards native attributes to the input and layout styles to the visual label', async () => {
    await render({
      id: 'choice',
      name: 'permission',
      value: 'edit',
      form: 'settings',
      style: { width: 250 },
      className: 'custom',
      dir: 'rtl',
      lang: 'ar',
      title: 'Permission',
      'aria-describedby': 'help',
      hidden: true,
    })
    const label = host.querySelector('label')!
    expect(control().id).toBe('choice')
    expect(control().value).toBe('edit')
    expect(control().getAttribute('form')).toBe('settings')
    expect(control().getAttribute('aria-describedby')).toBe('help')
    expect(label.style.width).toBe('250px')
    expect(label.classList.contains('custom')).toBe(true)
    expect(label.hidden).toBe(true)
    expect(label.dir).toBe('rtl')
    expect(label.lang).toBe('ar')
    expect(control().style.width).not.toBe('250px')
  })
  it('native click, key and change callbacks are not overwritten', async () => {
    const onClick = vi.fn(),
      onKeyDown = vi.fn(),
      onChange = vi.fn(),
      onCheckedChange = vi.fn()
    await render({ onClick, onKeyDown, onChange, onCheckedChange })
    await act(async () => control().click())
    await act(async () =>
      control().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      ),
    )
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: true })
  })
  it('a parent can control the checkbox through the native onChange event', async () => {
    function Parent() {
      const [checked, setChecked] = useState(false)
      return (
        <Checkbox
          {...{
            checked,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
              setChecked(event.currentTarget.checked),
          }}
        />
      )
    }
    await act(async () => root.render(<Parent />))
    await act(async () => control().click())
    expect(control().checked).toBe(true)
  })
  it('empty labels create no label slot; zero and rich content remain visible', async () => {
    for (const label of [
      false,
      true,
      null,
      undefined,
      '',
      [],
      <Fragment>{false}</Fragment>,
    ]) {
      await render({ label, 'aria-label': 'Choice' })
      expect(host.querySelector('[data-part="label"]')).toBeNull()
      expect(host.querySelector('[data-icon-only]')).not.toBeNull()
    }
    for (const label of [0, <strong>Rich</strong>]) {
      await render({ label })
      expect(host.querySelector('[data-part="label"]')?.textContent).toBe(
        label === 0 ? '0' : 'Rich',
      )
    }
  })
  it('explicit native names are not overridden by a generated aria-labelledby', async () => {
    await render({
      label: 'Visible label',
      'aria-label': 'Full accessible label',
    })
    expect(control().getAttribute('aria-label')).toBe('Full accessible label')
    expect(control().getAttribute('aria-labelledby')).toBeNull()
    expect(control().labels?.[0]?.textContent).toContain('Visible label')
  })
  it('a rejected controlled change restores mixed DOM state as well as ARIA', async () => {
    const onCheckedChange = vi.fn()
    await render({ checked: 'indeterminate', onCheckedChange })
    await act(async () => control().click())
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: true })
    expect(control().indeterminate).toBe(true)
    expect(control().checked).toBe(false)
    expect(control().getAttribute('aria-checked')).toBe('mixed')
  })
  it('defaultChecked is initial only; disabled controlled updates and callback replacement stay silent', async () => {
    const first = vi.fn(),
      second = vi.fn()
    await render({ defaultChecked: 'indeterminate', onCheckedChange: first })
    await act(async () => control().click())
    expect(first).toHaveBeenCalledExactlyOnceWith({ checked: true })
    await render({ defaultChecked: false, onCheckedChange: second })
    expect(control().checked).toBe(true)
    await render({
      checked: 'indeterminate',
      disabled: true,
      onCheckedChange: second,
    })
    expect(control().indeterminate).toBe(true)
    expect(second).not.toHaveBeenCalled()
  })
  it('consumer preventDefault can cancel pointer activation without an internal value change', async () => {
    const onCheckedChange = vi.fn()
    await render({
      onCheckedChange,
      onClick: (event: React.MouseEvent) => event.preventDefault(),
    })
    await act(async () => {
      control().click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(control().checked).toBe(false)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
  it('JSON does not invent a controlled null value outside the checked domain', () => {
    expect(contract.props.checked).not.toHaveProperty('default')
  })
})
