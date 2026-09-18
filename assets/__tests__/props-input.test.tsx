// @vitest-environment jsdom
import React, { act, createRef, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Input } from '../../Input/Input'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let host: HTMLDivElement
const field = () =>
  host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!
const clear = () =>
  host.querySelector<HTMLButtonElement>('[data-part="clear"]')!
const render = async (props: Record<string, unknown>) => {
  await act(async () => root.render(<Input {...props} />))
}
const enter = async (value: string) => {
  const input = field()
  const prototype =
    input.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Input prop contract', () => {
  for (const multiline of [false, true]) {
    it(`editing and clear deliver one native change and one value change (${multiline ? 'textarea' : 'input'})`, async () => {
      const native = vi.fn(),
        values = vi.fn()
      function Controlled() {
        const [value, setValue] = useState('Initial')
        return (
          <Input
            {...{ multiline }}
            value={value}
            onChange={(event) => {
              native(event.target, event.target.value)
              setValue(event.target.value)
            }}
            onValueChange={values}
          />
        )
      }
      await act(async () => root.render(<Controlled />))
      await enter('Edited')
      expect(native).toHaveBeenCalledExactlyOnceWith(field(), 'Edited')
      expect(values).toHaveBeenCalledExactlyOnceWith({ value: 'Edited' })
      native.mockClear()
      values.mockClear()
      await act(async () => clear().click())
      expect(field().value).toBe('')
      expect(native).toHaveBeenCalledExactlyOnceWith(field(), '')
      expect(values).toHaveBeenCalledExactlyOnceWith({ value: '' })
      expect(document.activeElement).toBe(field())
    })
  }

  it('controlled parent updates are silent, and current callbacks replace removed callbacks', async () => {
    const old = vi.fn(),
      next = vi.fn(),
      native = vi.fn()
    await render({ value: 'First', onValueChange: old, onChange: native })
    await render({ value: 'Second', onValueChange: next })
    expect(field().value).toBe('Second')
    expect(old).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
    expect(native).not.toHaveBeenCalled()
    await enter('Attempt')
    expect(field().value).toBe('Second')
    expect(next).toHaveBeenCalledExactlyOnceWith({ value: 'Attempt' })
    expect(old).not.toHaveBeenCalled()
    expect(native).not.toHaveBeenCalled()
  })

  it('defaultValue is the uncontrolled initial value across rerenders and unrelated props', async () => {
    await render({ defaultValue: 'Initial' })
    await enter('Draft')
    await render({ defaultValue: 'Replacement', label: 'Name', icon: 'search' })
    expect(field().value).toBe('Draft')
  })

  it('ordinary ref targets the native control and follows multiline changes', async () => {
    const ref = createRef<HTMLInputElement | HTMLTextAreaElement>()
    await render({ ref, defaultValue: 'Draft' })
    expect(ref.current).toBe(field())
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    await render({ ref, multiline: true })
    expect(ref.current).toBe(field())
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    expect(field().value).toBe('Draft')
  })

  it.skipIf(!React.version.startsWith('19.'))(
    'native callback ref cleanup survives StrictMode, replacement, and unmount',
    async () => {
      const active = new Set<Element>()
      const events: string[] = []
      const ref = (node: Element | null) => {
        expect(node).not.toBeNull()
        if (!node) return
        expect(active.has(node)).toBe(false)
        active.add(node)
        events.push('attach')
        return () => {
          expect(active.delete(node)).toBe(true)
          events.push('cleanup')
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Input ref={ref} />
          </StrictMode>,
        ),
      )
      await act(async () =>
        root.render(
          <StrictMode>
            <Input {...{ multiline: true }} ref={ref} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      expect(active.has(field())).toBe(true)
      await act(async () => root.render(null))
      expect(active.size).toBe(0)
      expect(events.filter((e) => e === 'attach')).toHaveLength(
        events.filter((e) => e === 'cleanup').length,
      )
    },
  )

  it('standard ARIA, role, ids, form participation, and native metadata reach the native control', async () => {
    await render({
      id: 'query',
      name: 'query',
      role: 'combobox',
      'aria-label': 'Search',
      'aria-controls': 'results',
      'aria-expanded': true,
      'aria-activedescendant': 'result-1',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      form: 'external-form',
      inputMode: 'search',
      enterKeyHint: 'search',
      title: 'Search projects',
      tabIndex: 3,
      'data-owner': 'projects',
    })
    for (const [name, value] of Object.entries({
      id: 'query',
      name: 'query',
      role: 'combobox',
      'aria-label': 'Search',
      'aria-controls': 'results',
      'aria-expanded': 'true',
      'aria-activedescendant': 'result-1',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      form: 'external-form',
      inputmode: 'search',
      enterkeyhint: 'search',
      title: 'Search projects',
      tabindex: '3',
      'data-owner': 'projects',
    })) {
      expect(field().getAttribute(name), name).toBe(value)
    }
  })

  it('description and error ids compose with external descriptions without dropping or duplicating ids', async () => {
    await render({
      id: 'name',
      label: 'Name',
      required: true,
      description: 'Help',
      error: 'Required',
      'aria-describedby': 'outside name-description outside',
    })
    expect(field().getAttribute('aria-describedby')?.split(/\s+/)).toEqual([
      'outside',
      'name-description',
      'name-error',
    ])
    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector<HTMLLabelElement>('label')?.htmlFor).toBe('name')
    expect(
      host.querySelector('.uf-input__required')?.getAttribute('aria-hidden'),
    ).toBe('true')
    await render({ id: 'name', label: 'Name', 'aria-describedby': 'outside' })
    expect(field().getAttribute('aria-describedby')).toBe('outside')
    expect(field().hasAttribute('aria-invalid')).toBe(false)
  })

  it('empty slots do not create affordances or descriptions; scalar zero remains content', async () => {
    await render({ label: false, description: <></>, error: '', icon: <></> })
    expect(host.querySelector('label')).toBeNull()
    expect(host.querySelector('.uf-input__description')).toBeNull()
    expect(host.querySelector('.uf-input__icon')).toBeNull()
    expect(field().hasAttribute('aria-describedby')).toBe(false)
    await render({ label: 0, description: 0, icon: 0 })
    expect(host.querySelector('label')?.textContent).toBe('0')
    expect(host.querySelector('.uf-input__description')?.textContent).toBe('0')
    expect(host.querySelector('.uf-input__icon')?.textContent).toBe('0')
  })

  it('clearable, clearLabel, disabled and readOnly govern the same native action', async () => {
    await render({ defaultValue: 'Draft', clearable: false })
    expect(clear().hidden).toBe(true)
    await render({ clearable: true, clearLabel: 'Очистить поле' })
    expect(clear().hidden).toBe(false)
    expect(clear().getAttribute('aria-label')).toBe('Очистить поле')
    for (const state of ['disabled', 'readOnly']) {
      await render({ [state]: true })
      expect(clear().hidden).toBe(true)
      await act(async () => clear().click())
      expect(field().value).toBe('Draft')
    }
  })

  it('className and style affect the field layout while focus/input events target its native control', async () => {
    const focus = vi.fn(),
      blur = vi.fn(),
      key = vi.fn(),
      input = vi.fn()
    await render({
      className: 'field-layout',
      style: { width: 280 },
      onFocus: focus,
      onBlur: blur,
      onKeyDown: key,
      onInput: input,
    })
    expect(host.querySelector<HTMLElement>('.field-layout')?.style.width).toBe(
      '280px',
    )
    await act(async () => {
      field().focus()
      field().dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
      field().blur()
    })
    await enter('Draft')
    expect(focus).toHaveBeenCalledTimes(1)
    expect(blur).toHaveBeenCalledTimes(1)
    expect(key).toHaveBeenCalledTimes(1)
    expect(input).toHaveBeenCalledTimes(1)
  })
  it('explicit ARIA states remain native attributes without mutating editability', async () => {
    await render({
      'aria-invalid': 'grammar',
      'aria-disabled': true,
      'aria-readonly': true,
    })
    expect(field().getAttribute('aria-invalid')).toBe('grammar')
    expect(field().getAttribute('aria-disabled')).toBe('true')
    expect(field().getAttribute('aria-readonly')).toBe('true')
    expect(field().disabled).toBe(false)
    expect(field().readOnly).toBe(false)
    expect(host.querySelector('.uf-input')?.hasAttribute('data-invalid')).toBe(
      true,
    )
    await render({ error: 'Message', 'aria-invalid': false })
    expect(field().getAttribute('aria-invalid')).toBe('false')
    expect(host.querySelector('.uf-input')?.hasAttribute('data-invalid')).toBe(
      false,
    )
  })
  it('textarea does not leak input-only attributes from untyped consumers', async () => {
    await render({
      multiline: true,
      min: 1,
      max: 10,
      step: 2,
      pattern: 'abc',
      list: 'items',
      multiple: true,
    })
    for (const attribute of [
      'type',
      'min',
      'max',
      'step',
      'pattern',
      'list',
      'multiple',
    ])
      expect(field().hasAttribute(attribute)).toBe(false)
  })
})
