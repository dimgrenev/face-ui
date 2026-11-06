import React, { act, createRef, StrictMode, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { Radio, type RadioProps } from '../../Radio/Radio'
import contract from '../../Radio/Radio.json'
import {
  allowConsoleError,
  expectDevError,
  formEntries,
  mount,
  type View,
} from './harness'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'
import { describeRoving } from './harness/roving'

const items = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty' },
  { value: 'b', label: 'Beta' },
]
const radios = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
]
const checkedValue = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>('input:checked')?.value ?? null

describeControlled<string | null>({
  name: 'Radio',
  prop: 'value',
  values: ['a', 'b'],
  render: (props) => <Radio items={items} aria-label="Choice" {...props} />,
  change: (host, to) =>
    radios(host)
      .find((input) => input.value === to)!
      .click(),
  read: checkedValue,
  normalizes: ['missing', null],
  handler: 'onClick',
  formReset: true,
})

describe('Radio field', () => {
  // The harness focuses a radio outside act(); useRovingFocus records that focus in state.
  beforeEach(() =>
    allowConsoleError(/An update to ForwardRef\(Radio\) inside a test was not wrapped in act/),
  )
  describeField('Radio', (props) => (
    <Radio items={items} name="field-probe" {...(props as RadioProps)} />
  ))
})

describeRoving({
  name: 'Radio',
  orientation: 'both',
  selects: true,
  activateOnMove: checkedValue,
  render: (props) => <Radio aria-label="Choice" {...props} />,
  items: radios,
})

describe('Radio', () => {
  let view: View
  const inputs = () => radios(view.host)
  const render = (props: Partial<ComponentProps<typeof Radio>> = {}) =>
    act(async () =>
      view.root.render(
        <StrictMode>
          <Radio items={items} {...(props as RadioProps)} />
        </StrictMode>,
      ),
    )
  const press = (key: string) =>
    act(async () => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      )
    })
  beforeEach(() => {
    view = mount()
  })

  it('an empty string value takes part in arrows, selection and wrapping', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await act(async () => inputs()[0].focus())
    await press('ArrowDown')
    expect(inputs()[1].checked).toBe(true)
    expect(document.activeElement).toBe(inputs()[1])
    await press('ArrowRight')
    await press('ArrowDown')
    expect(document.activeElement).toBe(inputs()[0])
    await press('ArrowUp')
    await press('End')
    await press('Home')
    expect(inputs()[0].checked).toBe(true)
    expect(
      onValueChange.mock.calls.map(([details]) => details.value),
    ).toEqual(['', 'b', 'a', 'b', 'a'])
  })

  it('native group attributes reach the radiogroup; the list holds the items', async () => {
    const ref = createRef<HTMLDivElement>()
    const onFocus = vi.fn()
    const onKeyDown = vi.fn()
    await render({
      ref,
      id: 'choices',
      form: 'settings',
      name: 'choice',
      'aria-label': 'Choices',
      'aria-describedby': 'help',
      title: 'Choose',
      dir: 'rtl',
      style: { width: 320 },
      onFocus,
      onKeyDown,
    })
    const root = ref.current!
    expect(root.getAttribute('role')).toBe('radiogroup')
    expect(root.id).toBe('choices')
    expect(root.getAttribute('aria-label')).toBe('Choices')
    expect(root.getAttribute('aria-describedby')).toBe('help')
    expect(root.title).toBe('Choose')
    expect(root.dir).toBe('rtl')
    expect(root.style.width).toBe('320px')
    expect(root.className).toBe('uf-field uf-radio')
    const list = root.querySelector('[data-scope="radio"][data-part="list"]')!
    expect(list.parentElement).toBe(root)
    expect(list.querySelectorAll('[data-part="item"]')).toHaveLength(3)
    for (const input of inputs()) {
      expect(input.getAttribute('form')).toBe('settings')
      expect(input.getAttribute('data-part')).toBe('input')
      expect(input.getAttribute('aria-describedby')).toBe('help')
      // Native radios carry their own role and checked state.
      expect(input.hasAttribute('role')).toBe(false)
      expect(input.hasAttribute('aria-checked')).toBe(false)
    }
    await act(async () => inputs()[0].focus())
    await press('Tab')
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('an item id and naming attributes reach its input, before the field description', async () => {
    await render({
      id: 'plan',
      description: 'Billed monthly',
      items: [
        {
          value: 'a',
          label: <strong>Alpha</strong>,
          id: 'alpha',
          'aria-label': 'Alpha plan',
          'aria-labelledby': 'alpha-heading',
          'aria-describedby': 'alpha-help',
        },
      ],
    })
    const [input] = inputs()
    expect(input.id).toBe('alpha')
    expect(input.getAttribute('aria-label')).toBe('Alpha plan')
    expect(input.getAttribute('aria-labelledby')).toBe('alpha-heading')
    expect(input.getAttribute('aria-describedby')).toBe(
      'alpha-help plan-description',
    )
  })

  it('a repeated value keeps the first item and reports', async () => {
    const onValueChange = vi.fn()
    await expectDevError(
      () =>
        render({
          onValueChange,
          items: [
            { value: 'a', label: 'First' },
            { value: 'a', label: 'Second' },
            { value: 'b', label: 'Beta' },
          ],
        }),
      /^Face UI Radio: invalid items\[1\] key "a"; dropping the duplicate\.$/,
    )
    expect(inputs().map((input) => input.labels![0].textContent)).toEqual([
      'First',
      'Beta',
    ])
    await act(async () => inputs()[0].click())
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'a' })
  })

  it('malformed items render an empty or shorter group and report', async () => {
    await expectDevError(
      () => render({ items: 'a' as never }),
      /^Face UI Radio: invalid items "a"; using \[\]\.$/,
    )
    expect(inputs()).toHaveLength(0)
    await expectDevError(
      () => render({ items: [null, { value: 1, label: 'One' }, items[0]] as never }),
      /^Face UI Radio: invalid items\[(0\] null|1\] key 1); dropping the item\.$/,
    )
    expect(inputs().map((input) => input.value)).toEqual(['a'])
  })

  it('a non-string aria-label is ignored with a report', async () => {
    await expectDevError(
      () => render({ 'aria-label': 5 as never, label: 'Plan' }),
      /^Face UI Radio: invalid aria-label 5; ignoring it\.$/,
    )
    const root = view.host.querySelector('[role="radiogroup"]')!
    expect(root.hasAttribute('aria-label')).toBe(false)
    expect(root.getAttribute('aria-labelledby')).toBe(
      view.host.querySelector('[data-scope="field"][data-part="label"]')!.id,
    )
  })

  it('a disabled item keeps an existing selection but is never chosen', async () => {
    const onValueChange = vi.fn()
    await render({
      defaultValue: 'b',
      onValueChange,
      items: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta', disabled: true },
        { value: 'c', label: 'Gamma' },
      ],
    })
    expect(inputs()[1].checked).toBe(true)
    expect(inputs()[1].disabled).toBe(true)
    // The selection is disabled, so the first enabled item holds the tab stop.
    expect(inputs().map((input) => input.tabIndex)).toEqual([0, -1, -1])
    await act(async () => inputs()[1].click())
    await act(async () => inputs()[0].focus())
    await press('ArrowDown')
    expect(document.activeElement).toBe(inputs()[2])
    expect(onValueChange.mock.calls).toEqual([[{ value: 'c' }]])
  })

  it('disabled disables every input and arrows move nothing', async () => {
    await render({ disabled: true, defaultValue: 'a', name: 'choice' })
    const root = view.host.querySelector('[role="radiogroup"]')!
    expect(root.getAttribute('aria-disabled')).toBe('true')
    expect(root.hasAttribute('data-disabled')).toBe(true)
    expect(inputs().every((input) => input.disabled)).toBe(true)
    expect(
      [...view.host.querySelectorAll('[data-part="item"]')].every((item) =>
        item.hasAttribute('data-disabled'),
      ),
    ).toBe(true)
  })

  it('root capture and bubble listeners cancel keyboard and pointer selection', async () => {
    const onValueChange = vi.fn()
    await render({
      defaultValue: 'a',
      onValueChange,
      onKeyDownCapture: (event: React.KeyboardEvent) => event.preventDefault(),
    })
    await act(async () => inputs()[0].focus())
    await press('ArrowDown')
    expect(document.activeElement).toBe(inputs()[0])
    await render({
      defaultValue: 'a',
      onValueChange,
      onKeyDown: (event: React.KeyboardEvent) => event.preventDefault(),
      onClick: (event: React.MouseEvent) => event.preventDefault(),
    })
    await press('ArrowDown')
    await act(async () => inputs()[2].click())
    expect(inputs()[0].checked).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('autoFocus focuses the selected enabled input and marks it for layers', async () => {
    await render({ defaultValue: '', autoFocus: true })
    expect(document.activeElement).toBe(inputs()[1])
    expect(
      inputs().map((input) => input.hasAttribute('data-autofocus')),
    ).toEqual([false, true, false])
  })

  it('unchanged refs stay attached across value and items renders', async () => {
    const ref = vi.fn()
    await render({ ref, value: 'a' })
    ref.mockClear()
    await render({ ref, value: 'b', items: [...items] })
    expect(ref).not.toHaveBeenCalled()
  })

  it.skipIf(!React.version.startsWith('19.'))(
    'callback ref cleanup is honored on replacement and unmount in StrictMode',
    async () => {
      const active = new Set<Element>()
      const cleanup = vi.fn()
      const ref = (node: HTMLDivElement | null) => {
        expect(node).not.toBeNull()
        if (!node) return
        active.add(node)
        return () => {
          active.delete(node)
          cleanup()
        }
      }
      await render({ ref: ref as never })
      expect(active.size).toBe(1)
      await render({ ref: createRef<HTMLDivElement>() })
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )

  it('name, form, required and disabled items reach FormData as a native group', async () => {
    const form = document.body.appendChild(document.createElement('form'))
    form.id = 'external'
    onTestFinished(() => form.remove())
    const withGamma = [...items, { value: 'c', label: 'Gamma', disabled: true }]
    await render({
      form: 'external',
      name: 'choice',
      required: true,
      defaultValue: '',
      items: withGamma,
    })
    const root = view.host.querySelector('[role="radiogroup"]')!
    expect(root.getAttribute('aria-required')).toBe('true')
    for (const input of inputs()) {
      expect(input.required).toBe(true)
      expect(input.form).toBe(form)
    }
    expect(formEntries(form)).toEqual([['choice', '']])
    await act(async () => inputs()[2].click())
    expect(formEntries(form)).toEqual([['choice', 'b']])
    // A disabled selection stays checked but is not submitted.
    await act(async () =>
      view.root.render(
        <Radio key="remount" form="external" name="choice" value="c" items={withGamma} />,
      ),
    )
    expect(inputs()[3].checked).toBe(true)
    expect(formEntries(form)).toEqual([])
  })

  it('JSON does not invent runtime items or a selected default', async () => {
    await act(async () => view.root.render(<Radio />))
    expect(inputs()).toHaveLength(0)
    expect(contract.props.items).not.toHaveProperty('default')
    expect(contract.props.defaultValue).not.toHaveProperty('default')
  })
})
