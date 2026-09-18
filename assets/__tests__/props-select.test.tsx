// @vitest-environment jsdom
import React, { act, createRef, Fragment, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Select } from '../../Select/Select'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const options = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty value' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Charlie', disabled: true },
]
let root: Root, host: HTMLDivElement
const trigger = () =>
  host.querySelector<HTMLButtonElement>('[role="combobox"]')!
const list = () => document.querySelector<HTMLElement>('[role="listbox"]')
const highlighted = () =>
  list()
    ?.querySelector<HTMLElement>('[data-highlighted]')
    ?.getAttribute('data-value')
const render = (props: Record<string, unknown> = {}) =>
  act(async () =>
    root.render(<Select options={options} surface="popover" {...props} />),
  )
const key = (node: Element, key: string) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Select prop contract', () => {
  it('exposes a stable native trigger ref', async () => {
    const ref = vi.fn()
    await render({ ref })
    expect(ref.mock.calls[0][0]).toBe(trigger())
    ref.mockClear()
    await render({ ref, value: 'b', membrane: false })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'honors ref cleanup in StrictMode',
    async () => {
      const active = new Set<Element>(),
        cleanup = vi.fn()
      const ref = (node: Element | null) => {
        expect(node?.tagName).toBe('BUTTON')
        if (node) active.add(node)
        return () => {
          if (node) active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Select options={options} ref={ref as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Select options={options} ref={createRef() as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('routes native identification and focus attributes to the trigger and visual styles to the root', async () => {
    await render({
      id: 'plan',
      'aria-label': 'Billing plan',
      'aria-describedby': 'help',
      tabIndex: -1,
      title: 'Choose plan',
      dir: 'rtl',
      lang: 'ar',
      style: { width: 260 },
      className: 'custom',
    })
    expect(trigger().id).toBe('plan')
    expect(trigger().getAttribute('aria-label')).toBe('Billing plan')
    expect(trigger().getAttribute('aria-describedby')).toBe('help')
    expect(trigger().tabIndex).toBe(-1)
    const visual = host.querySelector<HTMLElement>('.uf-select')!
    expect(visual.classList.contains('custom')).toBe(true)
    expect(visual.style.width).toBe('260px')
    expect(visual.dir).toBe('rtl')
    expect(visual.lang).toBe('ar')
  })
  it('lets native click and keyboard handlers cancel opening', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
    const onKeyDown = vi.fn((event: React.KeyboardEvent) =>
      event.preventDefault(),
    )
    await render({ onClick, onKeyDown })
    await act(async () => trigger().click())
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(list()).toBeNull()
    await key(trigger(), 'ArrowDown')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(list()).toBeNull()
  })
  it('does not emit label slots for empty React content', async () => {
    for (const label of [false, true, '', <Fragment />]) {
      await render({ label })
      expect(host.querySelector('[data-part="label"]')).toBeNull()
      expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
    }
    await render({ label: 0 })
    expect(host.querySelector('[data-part="label"]')?.textContent).toBe('0')
  })
  it('distinguishes an empty string selection and a zero display override from a placeholder', async () => {
    await render({ value: '' })
    expect(trigger().textContent).toContain('Empty value')
    expect(trigger().hasAttribute('data-placeholder')).toBe(false)
    await render({ value: null, displayValue: 0 })
    expect(trigger().textContent).toBe('0')
    expect(host.querySelector('.uf-select__value--placeholder')).toBeNull()
  })
  it('can navigate away from an option whose value is an empty string', async () => {
    await render({ defaultValue: '' })
    await act(async () => trigger().click())
    expect(highlighted()).toBe('')
    await key(trigger(), 'ArrowDown')
    expect(highlighted()).toBe('b')
    await key(trigger(), 'ArrowUp')
    expect(highlighted()).toBe('')
  })
  it('handles a key once when it originates inside the listbox', async () => {
    await render({
      options: ['a', 'b', 'c', 'd'].map((value) => ({ value, label: value })),
    })
    await act(async () => trigger().click())
    await key(list()!.querySelector('[role="option"]')!, 'ArrowDown')
    expect(highlighted()).toBe('b')
  })
  it('keeps uncontrolled defaults initial-only and parent controlled changes quiet', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await render({ defaultValue: 'b', onValueChange })
    expect(trigger().textContent).toContain('Alpha')
    await render({ value: 'b', onValueChange })
    expect(trigger().textContent).toContain('Beta')
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('reports a requested controlled selection once and preserves the current value if the parent refuses it', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'a', onValueChange })
    await act(async () => trigger().click())
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="b"]')!.click(),
    )
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'b' })
    expect(trigger().textContent).toContain('Alpha')
  })
  it('removes a highlighted option without leaving a stale active descendant', async () => {
    await render({ defaultValue: 'a' })
    await act(async () => trigger().click())
    await render({ options: [{ value: 'b', label: 'Beta' }] })
    expect(highlighted()).toBe('b')
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      list()!.querySelector('[data-value="b"]')!.id,
    )
  })
  it('lets the parent own opening and closing without echoing external updates', async () => {
    const onOpenChange = vi.fn()
    await render({ open: false, onOpenChange })
    await act(async () => trigger().click())
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
    expect(list()).toBeNull()
    onOpenChange.mockClear()
    await render({ open: true, onOpenChange })
    expect(list()).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    await key(trigger(), 'Escape')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false })
    expect(list()).not.toBeNull()
    onOpenChange.mockClear()
    await render({ open: false, onOpenChange })
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
  it('uses defaultOpen only on mount and closes unavailable lists quietly', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, onOpenChange })
    expect(list()).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    await key(trigger(), 'Escape')
    expect(list()).toBeNull()
    await render({ defaultOpen: true, onOpenChange })
    expect(list()).toBeNull()
    await act(async () => trigger().click())
    onOpenChange.mockClear()
    await render({ defaultOpen: true, disabled: true, onOpenChange })
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(trigger().disabled).toBe(true)
  })
  it('uses multiple as the mode even before any values are selected', async () => {
    const onValueChange = vi.fn()
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value=""]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [''] })
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(highlighted()).not.toBeUndefined()
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value=""]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [] })
    expect(trigger().hasAttribute('data-placeholder')).toBe(true)
  })
  it('preserves a selection when the uncontrolled mode changes and keeps unknown values until options arrive', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(
      list()?.querySelector('[data-value="a"]')?.getAttribute('aria-selected'),
    ).toBe('true')
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="b"]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a', 'b'] })
    onValueChange.mockClear()
    await render({ multiple: false, onValueChange })
    expect(trigger().textContent).toContain('Alpha')
    expect(onValueChange).not.toHaveBeenCalled()
    await render({ value: 'pending', options: [] })
    expect(trigger().textContent).toBe('pending')
    await render({
      value: 'pending',
      options: [{ value: 'pending', label: 'Loaded' }],
    })
    expect(trigger().textContent).toBe('Loaded')
  })
  it('uses textValue for rich options and ignores modifiers and composition', async () => {
    function Rich() {
      return <span>Visible label</span>
    }
    await render({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'rich', label: <Rich />, textValue: 'Beta' },
      ],
    })
    for (const extra of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { isComposing: true },
    ]) {
      await act(async () =>
        trigger().dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'b',
            bubbles: true,
            cancelable: true,
            ...extra,
          }),
        ),
      )
      expect(list()).toBeNull()
    }
    await key(trigger(), 'b')
    expect(highlighted()).toBe('rich')
    expect(
      list()?.querySelector('[data-value="rich"]')?.getAttribute('aria-label'),
    ).toBe('Beta')
  })
  it('keeps an unavailable option set focusable for form validation without disabling its saved value', async () => {
    await render({
      options: [],
      value: 'pending',
      name: 'plan',
      required: true,
    })
    expect(trigger().disabled).toBe(false)
    expect(trigger().tabIndex).toBe(0)
    expect(trigger().getAttribute('aria-disabled')).toBe('true')
    await act(async () => trigger().click())
    expect(list()).toBeNull()
    expect(host.querySelector('select')!.disabled).toBe(false)
    expect(host.querySelector('select')!.value).toBe('pending')
    await render({ options: [], value: null, required: true })
    await act(async () =>
      host
        .querySelector('select')!
        .dispatchEvent(new Event('invalid', { cancelable: true })),
    )
    expect(document.activeElement).toBe(trigger())
    await render({ options: [], value: null, required: true, disabled: true })
    expect(trigger().disabled).toBe(true)
    expect(host.querySelector('select')!.disabled).toBe(true)
  })

  it('renders a duplicate key once and never activates a disabled option', async () => {
    const onValueChange = vi.fn()
    await render({
      options: [...options, { value: 'a', label: 'Duplicate' }],
      onValueChange,
    })
    await act(async () => trigger().click())
    expect(list()?.querySelectorAll('[data-value="a"]')).toHaveLength(1)
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="c"]')!.click(),
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
