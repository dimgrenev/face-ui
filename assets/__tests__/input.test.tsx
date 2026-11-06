import React, { act, createRef, StrictMode, useState } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Input } from '../../Input/Input'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'
import { expectDevError, mount } from './harness'

let root: Root
let host: HTMLDivElement
const field = () =>
  host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!
const clear = () =>
  host.querySelector<HTMLButtonElement>('[data-part="clear"]')!
const part = (name: string) =>
  host.querySelector(`[data-scope="field"][data-part="${name}"]`)
const render = async (props: Record<string, unknown>) => {
  await act(async () => root.render(<Input {...props} />))
}
/** A user edit: the browser changes the value, then fires input. */
const edit = (
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  init?: EventInit & { isComposing?: boolean },
) => {
  const prototype =
    input.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, ...init }))
}
const enter = (value: string) => act(async () => edit(field(), value))
beforeEach(() => {
  ;({ host, root } = mount())
})

describeControlled<string>({
  name: 'Input',
  prop: 'value',
  values: ['Alpha', 'Beta'],
  render: (props) => <Input aria-label="Field" {...props} />,
  change: (host, to) => edit(host.querySelector('input')!, to),
  read: (host) => host.querySelector('input')!.value,
  handler: 'onChange',
  formReset: true,
})

describeField('Input', (props) => <Input {...props} />)

describe('Input prop contract', () => {
  for (const multiline of [false, true]) {
    it(`editing and clear deliver one native change, then one value change (${multiline ? 'textarea' : 'input'})`, async () => {
      const calls: unknown[][] = []
      function Controlled() {
        const [value, setValue] = useState('Initial')
        return (
          <Input
            {...{ multiline }}
            clearable
            value={value}
            onChange={(event) => {
              calls.push(['change', event.target, event.target.value])
              setValue(event.target.value)
            }}
            onValueChange={(details) => calls.push(['value', details])}
          />
        )
      }
      await act(async () => root.render(<Controlled />))
      await enter('Edited')
      expect(calls).toEqual([
        ['change', field(), 'Edited'],
        ['value', { value: 'Edited' }],
      ])
      calls.length = 0
      await act(async () => clear().click())
      expect(field().value).toBe('')
      expect(calls).toEqual([
        ['change', field(), ''],
        ['value', { value: '' }],
      ])
      expect(document.activeElement).toBe(field())
    })
  }

  it('a removed callback is never called', async () => {
    const old = vi.fn(),
      next = vi.fn(),
      native = vi.fn()
    await render({ value: 'First', onValueChange: old, onChange: native })
    await render({ value: 'Second', onValueChange: next })
    await enter('Attempt')
    expect(field().value).toBe('Second')
    expect(next).toHaveBeenCalledExactlyOnceWith({ value: 'Attempt' })
    expect(old).not.toHaveBeenCalled()
    expect(native).not.toHaveBeenCalled()
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

  it('the visible error describes the control and a separate polite status announces changes', async () => {
    await render({ id: 'name', label: 'Name', error: 'Required' })
    expect(part('error')!.id).toBe('name-error')
    expect(part('error')!.hasAttribute('role')).toBe(false)
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(host.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull()
    expect(field().getAttribute('aria-describedby')).toBe('name-error')
  })

  it('an empty icon adds no affordance; zero remains content', async () => {
    await render({ icon: <></> })
    expect(host.querySelector('.uf-input__icon')).toBeNull()
    await render({ icon: 0 })
    expect(host.querySelector('.uf-input__icon')?.textContent).toBe('0')
  })

  it('clearable is opt-in and labels.clear, disabled and readOnly govern the same native action', async () => {
    await render({ defaultValue: 'Draft' })
    expect(clear().hidden).toBe(true)
    await render({ clearable: true, labels: { clear: 'Очистить поле' } })
    expect(clear().hidden).toBe(false)
    expect(clear().getAttribute('aria-label')).toBe('Очистить поле')
    await render({ clearable: true, labels: { clear: '  ' } })
    expect(clear().getAttribute('aria-label')).toBe('Clear input')
    for (const state of ['disabled', 'readOnly']) {
      await render({ clearable: true, [state]: true })
      expect(clear().hidden).toBe(true)
      await act(async () => clear().click())
      expect(field().value).toBe('Draft')
    }
  })

  it('invalid labels and rows are reported and replaced by defaults', async () => {
    await expectDevError(
      () => render({ labels: 'Clear', defaultValue: 'Draft' }),
      /^Face UI Input: invalid labels "Clear"; using defaults\.$/,
    )
    expect(clear().getAttribute('aria-label')).toBe('Clear input')
    await expectDevError(
      () => render({ multiline: true, rows: 2.5 }),
      /^Face UI Input: invalid rows 2\.5; using 2\.$/,
    )
    expect((field() as HTMLTextAreaElement).rows).toBe(2)
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
    const layout = host.querySelector<HTMLElement>('.field-layout')!
    expect(layout.style.width).toBe('280px')
    expect(layout.classList).toContain('uf-field')
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

  it('fullWidth and membrane default on; either can be turned off without remounting the control', async () => {
    await render({ defaultValue: 'Draft' })
    const control = field()
    const layout = host.querySelector('.uf-input')!
    const membrane = host.querySelector('.uf-membrane')!
    expect(layout.hasAttribute('data-full-width')).toBe(true)
    expect(membrane.classList).toContain('uf-membrane--full')
    expect(membrane.hasAttribute('data-membrane-disabled')).toBe(false)
    await render({ fullWidth: false, membrane: false })
    expect(field()).toBe(control)
    expect(layout.hasAttribute('data-full-width')).toBe(false)
    expect(membrane.hasAttribute('data-membrane-disabled')).toBe(true)
  })

  it('labelPosition start sets the field layout', async () => {
    await render({ label: 'Name', labelPosition: 'start' })
    expect(host.querySelector('.uf-input')!.getAttribute('data-label-position')).toBe('start')
    expect(part('label')!.className).toBe('uf-field__label')
  })
})

describe('Input editing', () => {
  /** Counts programmatic writes to the control's value; a user edit writes through the prototype. */
  function countWrites(node: HTMLInputElement) {
    let writes = 0
    const own = Object.getOwnPropertyDescriptor(node, 'value')
    const base = own ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
    Object.defineProperty(node, 'value', {
      configurable: true,
      get() {
        return base.get!.call(this)
      },
      set(value) {
        writes++
        base.set!.call(this, value)
      },
    })
    return () => writes
  }
  function Accepting() {
    const [value, setValue] = useState('Hello world')
    return (
      <Input
        aria-label="Field"
        value={value}
        onValueChange={({ value }) => setValue(value)}
      />
    )
  }

  for (const [mode, ui] of [
    ['uncontrolled', <Input aria-label="Field" defaultValue="Hello world" />],
    ['controlled', <Accepting />],
  ] as const) {
    it(`keeps the caret and never rewrites the control while it is edited (${mode})`, async () => {
      await act(async () => root.render(ui))
      const input = field() as HTMLInputElement
      const writes = countWrites(input)
      await act(async () => {
        edit(input, 'HelloX world')
        input.setSelectionRange(6, 6)
      })
      expect(input.value).toBe('HelloX world')
      expect(input.selectionStart).toBe(6)
      // IME composition: intermediate input events carry isComposing.
      await act(async () => {
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
        edit(input, 'HelloXk world', { isComposing: true })
        input.setSelectionRange(7, 7)
      })
      await act(async () => {
        edit(input, 'HelloXか world', { isComposing: true })
        input.setSelectionRange(7, 7)
      })
      await act(async () => {
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'か' }))
      })
      expect(input.value).toBe('HelloXか world')
      expect(input.selectionStart).toBe(7)
      expect(writes()).toBe(0)
    })
  }

  it('a refused edit restores the shown value', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'second', onValueChange })
    await enter('third')
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'third' })
    expect(field().value).toBe('second')
  })
})
