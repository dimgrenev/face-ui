import React, { act, createRef, StrictMode, useState } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Input } from '../../Input/Input'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

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
  ;({ host, root } = mount())
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

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Input syncs controlled value updates from props', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Input type="text" value="Alpha" onValueChange={handleValueChange} />,
      )
    })

    const input = container.querySelector(
      '.uf-input input',
    ) as HTMLInputElement | null
    expect(input?.value).toBe('Alpha')
    expect(handleValueChange).not.toHaveBeenCalled()

    await act(async () => {
      root.render(
        <Input type="text" value="Beta" onValueChange={handleValueChange} />,
      )
    })

    const updatedInput = container.querySelector(
      '.uf-input input',
    ) as HTMLInputElement | null
    expect(updatedInput?.value).toBe('Beta')
    expect(handleValueChange).not.toHaveBeenCalled()
  })

  it('Input exposes the native textarea through ref', async () => {
    const controlRef = React.createRef<HTMLInputElement | HTMLTextAreaElement>()

    await act(async () => {
      root.render(<Input value="Note" multiline ref={controlRef} />)
    })

    expect(controlRef.current).toBeInstanceOf(HTMLTextAreaElement)
    expect(controlRef.current?.value).toBe('Note')
  })
})

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: MatchMediaRestore | null

  beforeEach(() => {
    ;({ host: container, root } = mount())
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(() => {
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
  })

  it('Input binds visible labels, descriptions and invalid disabled state to the native control', async () => {
    await act(async () => {
      root.render(
        <Input
          id="profile-notes"
          label="Profile notes"
          description="Shown to workspace admins."
          error="Profile notes are required."
          disabled
          multiline
        />,
      )
    })

    const label = container.querySelector(
      '.uf-input label',
    ) as HTMLLabelElement | null
    const textarea = container.querySelector(
      '.uf-input textarea',
    ) as HTMLTextAreaElement | null
    const description = container.querySelector(
      '.uf-input__description',
    ) as HTMLElement | null
    const error = container.querySelector(
      '.uf-input__error',
    ) as HTMLElement | null

    expect(label).not.toBeNull()
    expect(textarea).not.toBeNull()
    expect(label?.htmlFor).toBe('profile-notes')
    expect(textarea?.id).toBe('profile-notes')
    expect(textarea?.getAttribute('aria-label')).toBeNull()
    expect(textarea?.disabled).toBe(true)
    expect(textarea?.getAttribute('aria-disabled')).toBe('true')
    expect(textarea?.getAttribute('aria-invalid')).toBe('true')
    expect(textarea?.getAttribute('aria-describedby')).toBe(
      'profile-notes-description profile-notes-error',
    )
    expect(description?.id).toBe('profile-notes-description')
    expect(description?.textContent).toContain('Shown to workspace admins.')
    expect(error?.id).toBe('profile-notes-error')
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.hasAttribute('aria-live')).toBe(false)
    expect(error?.textContent).toContain('Profile notes are required.')
  })
})

describe('controlled form regressions', () => {
  let root: Root
  let container: HTMLDivElement
  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('does not echo parent input updates or call a removed callback', async () => {
    const onValueChange = vi.fn()
    await act(async () =>
      root.render(<Input value="first" onValueChange={onValueChange} />),
    )
    await act(async () =>
      root.render(<Input value="second" onValueChange={onValueChange} />),
    )
    expect(onValueChange).not.toHaveBeenCalled()
    expect(container.querySelector('input')?.value).toBe('second')
    await act(async () => root.render(<Input value="second" />))
    const input = container.querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'third')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onValueChange).not.toHaveBeenCalled()
    expect(input.value).toBe('second')
  })
})
