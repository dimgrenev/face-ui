import React, { act, createRef, Fragment, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Select } from '../../Select/Select'
import { Icon } from '../../Icon/Icon'
import { allowConsoleError, expectDevError, libraryCss, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'

const items = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty value' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Charlie', disabled: true },
]
const abc = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]
let root: Root, host: HTMLDivElement
const trigger = () =>
  host.querySelector<HTMLButtonElement>('[role="combobox"]')!
const list = () => document.querySelector<HTMLElement>('[role="listbox"]')
const option = (value: string) =>
  list()!.querySelector<HTMLElement>(`[data-value="${value}"]`)!
const highlighted = () =>
  list()
    ?.querySelector<HTMLElement>('[data-highlighted]')
    ?.getAttribute('data-value')
const render = (props: Record<string, unknown> = {}) =>
  act(async () =>
    root.render(
      <Select items={items} surface="popover" aria-label="Plan" {...props} />,
    ),
  )
const key = (node: Element, key: string, init: KeyboardEventInit = {}) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    )
  })
const pointer = (node: Element, type: 'pointerover' | 'pointerout') =>
  act(async () => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })
    node.dispatchEvent(event)
  })
beforeEach(() => {
  ;({ host, root } = mount())
})

// The list stays open (a controlled `open` without a handler), so one click is one change.
const listOf = (host: HTMLElement) =>
  document.getElementById(
    host.querySelector('[role="combobox"]')!.getAttribute('aria-controls')!,
  )!
const shownKeys = (host: HTMLElement) => {
  const text = host.querySelector('[data-part="value"]')!.textContent ?? ''
  return text
    ? text.split(', ').map((label) => abc.find((item) => item.label === label)!.value)
    : []
}
describeControlled<string | null>({
  name: 'Select',
  prop: 'value',
  values: ['a', 'b'],
  render: (props) => (
    <Select items={abc} aria-label="Plan" surface="popover" open {...props} />
  ),
  change: (host, to) =>
    listOf(host).querySelector<HTMLElement>(`[data-value="${to}"]`)!.click(),
  read: (host) => shownKeys(host)[0] ?? null,
  normalizes: ['missing', null],
  formReset: true,
})
describeControlled<string[]>({
  name: 'Select',
  prop: 'value',
  values: [['a'], ['a', 'b']],
  render: (props) => (
    <Select
      multiple
      items={abc}
      aria-label="Teams"
      surface="popover"
      open
      {...props}
    />
  ),
  // Toggling Beta switches between the two values.
  change: (host) =>
    listOf(host).querySelector<HTMLElement>('[data-value="b"]')!.click(),
  read: shownKeys,
  normalizes: [
    ['b', 'missing', 'a'],
    ['b', 'a'],
  ],
  formReset: true,
})
describeControlled<boolean>({
  name: 'Select',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Select items={abc} aria-label="Plan" surface="popover" {...props} />
  ),
  change: (host) =>
    host.querySelector<HTMLElement>('[role="combobox"]')!.click(),
  read: (host) =>
    host
      .querySelector('[role="combobox"]')!
      .getAttribute('aria-expanded') === 'true',
  handler: 'onClick',
})
describe('Select as a field', () => {
  // The contract also renders a field with no name at all, which Select reports.
  beforeEach(() => allowConsoleError(/^Face UI Select: missing label; /))
  describeField('Select', (props) => (
    <Select items={abc} surface="popover" {...props} />
  ))
  describeField('Select multiple', (props) => (
    <Select multiple items={abc} surface="popover" {...props} />
  ))
})

describe('Select prop contract', () => {
  it('exposes a stable native trigger ref', async () => {
    const ref = vi.fn()
    await render({ ref, value: 'a' })
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
            <Select items={items} aria-label="Plan" ref={ref as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Select items={items} aria-label="Plan" ref={createRef() as any} />
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
    expect(visual.classList.contains('uf-field')).toBe(true)
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
  it('reports a combobox left without a name', async () => {
    await expectDevError(
      () => render({ 'aria-label': undefined }),
      /^Face UI Select: missing label; the combobox has no accessible name/,
    )
    expect(trigger().hasAttribute('aria-label')).toBe(false)
  })
  // The trigger is a <button>, so a `<label for>` written outside the component names it;
  // the check runs after mount, where the DOM can say so, not during the render.
  it('is silent when an external label names the trigger, and reports once when nothing does', async () => {
    const errors: string[] = []
    const print = console.error
    console.error = (...args: unknown[]) => void errors.push(args.map(String).join(' '))
    try {
      await act(async () =>
        root.render(
          <>
            <label htmlFor="plan-select">Plan</label>
            <Select id="plan-select" items={items} surface="popover" />
          </>,
        ),
      )
      expect(trigger().hasAttribute('aria-label')).toBe(false)
      expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
      expect(Array.from(trigger().labels ?? []).map((label) => label.textContent)).toEqual(['Plan'])
      expect(errors).toEqual([])

      await act(async () =>
        root.render(<Select items={items} surface="popover" />),
      )
      expect(errors).toEqual([
        'Face UI Select: missing label; the combobox has no accessible name; pass label, aria-label or aria-labelledby.',
      ])
    } finally {
      console.error = print
    }
  })
  it('has no English placeholder: an empty selection leaves the value slot empty', async () => {
    await render()
    expect(trigger().hasAttribute('data-placeholder')).toBe(true)
    expect(host.querySelector('[data-part="value"]')!.textContent).toBe('')
    await render({ placeholder: 'Pick a plan' })
    expect(host.querySelector('[data-part="value"]')!.textContent).toBe(
      'Pick a plan',
    )
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
      items: ['a', 'b', 'c', 'd'].map((value) => ({ value, label: value })),
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
    await expectDevError(
      () => render({ value: 'b', onValueChange }),
      /^Face UI Select: invalid value "b"; switching from uncontrolled to controlled/,
    )
    expect(trigger().textContent).toContain('Beta')
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('reports a requested controlled selection once and preserves the current value if the parent refuses it', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'a', onValueChange })
    await act(async () => trigger().click())
    await act(async () => option('b').click())
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'b' })
    expect(trigger().textContent).toContain('Alpha')
  })
  it('removes a highlighted option without leaving a stale active descendant', async () => {
    await render({ defaultValue: 'a' })
    await act(async () => trigger().click())
    await render({ items: [{ value: 'b', label: 'Beta' }] })
    expect(highlighted()).toBe('b')
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      option('b').id,
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
  it('closes when focus leaves the trigger and leaves focus where it went', async () => {
    const onOpenChange = vi.fn()
    await act(async () =>
      root.render(
        <>
          <Select items={items} surface="popover" aria-label="Plan" onOpenChange={onOpenChange} />
          <button id="elsewhere">Elsewhere</button>
        </>,
      ),
    )
    await act(async () => trigger().click())
    expect(document.activeElement).toBe(trigger())
    const elsewhere = document.getElementById('elsewhere')!
    await act(async () => elsewhere.focus())
    expect(list()).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false })
    expect(document.activeElement).toBe(elsewhere)
    // Escape and a choice return focus to the trigger.
    await act(async () => trigger().click())
    await act(async () => option('b').click())
    expect(document.activeElement).toBe(trigger())
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
    // It stays closed when the items become available again.
    await render({ onOpenChange })
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
  it('uses multiple as the mode even before any values are selected', async () => {
    const onValueChange = vi.fn()
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    await act(async () => option('').click())
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [''] })
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(highlighted()).not.toBeUndefined()
    await act(async () => option('').click())
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [] })
    expect(trigger().hasAttribute('data-placeholder')).toBe(true)
  })
  it('projects a selection onto the other mode without reporting it', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(option('a').getAttribute('aria-selected')).toBe('true')
    await act(async () => option('b').click())
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a', 'b'] })
    onValueChange.mockClear()
    await render({ multiple: false, onValueChange })
    expect(trigger().textContent).toContain('Alpha')
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('shows a value missing from items as unselected until the items arrive', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'pending', items: [], name: 'plan', onValueChange })
    expect(trigger().hasAttribute('data-placeholder')).toBe(true)
    expect(host.querySelector('select')!.value).toBe('')
    await render({
      value: 'pending',
      items: [{ value: 'pending', label: 'Loaded' }],
      name: 'plan',
      onValueChange,
    })
    expect(trigger().textContent).toBe('Loaded')
    expect(host.querySelector('select')!.value).toBe('pending')
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('uses textValue for rich options and ignores modifiers and composition', async () => {
    function Rich() {
      return <span>Visible label</span>
    }
    await render({
      items: [
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
      await key(trigger(), 'b', extra)
      expect(list()).toBeNull()
    }
    await key(trigger(), 'b')
    expect(highlighted()).toBe('rich')
    expect(option('rich').getAttribute('aria-label')).toBe('Beta')
  })
  it('searches the visible text of rich labels, without aria-hidden content', async () => {
    await render({
      items: [
        { value: 'a', label: 'Alpha' },
        {
          value: 'bold',
          label: (
            <>
              <span aria-hidden="true">Zzz</span>
              <strong>Bold</strong>
            </>
          ),
        },
      ],
    })
    await key(trigger(), 'b')
    expect(highlighted()).toBe('bold')
    await key(trigger(), 'Escape')
    await key(trigger(), 'z')
    expect(highlighted()).toBe('a')
  })
  it('keeps an unavailable option set focusable for form validation without disabling its proxy', async () => {
    const onOpenChange = vi.fn()
    await render({
      items: [],
      value: 'pending',
      name: 'plan',
      required: true,
      onOpenChange,
    })
    expect(trigger().disabled).toBe(false)
    expect(trigger().tabIndex).toBe(0)
    expect(trigger().getAttribute('aria-disabled')).toBe('true')
    await act(async () => trigger().click())
    await key(trigger(), 'Enter')
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(host.querySelector('select')!.disabled).toBe(false)
    await render({ items: [], value: null, required: true })
    // Interactive validation focuses the proxy; the trigger takes that focus.
    await act(async () => host.querySelector('select')!.focus())
    expect(document.activeElement).toBe(trigger())
    await render({ items: [], value: null, required: true, disabled: true })
    expect(trigger().disabled).toBe(true)
    expect(host.querySelector('select')!.disabled).toBe(true)
  })

  it('§5 #4: the proxy a validation report focuses hands focus to its own trigger', async () => {
    await act(async () =>
      root.render(
        <form>
          <Select name="plan" required aria-label="Plan" items={items} />
          <Select name="region" required aria-label="Region" items={items} />
        </form>,
      ),
    )
    const [plan] = host.querySelectorAll('select')
    await act(async () => plan.focus())
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Plan')
  })

  it('shows the browser validation message through the field until a value is chosen', async () => {
    await render({ label: 'Plan', 'aria-label': undefined, name: 'plan', required: true })
    const proxy = host.querySelector('select')!
    const message = proxy.validationMessage
    expect(message).not.toBe('')
    await act(async () => proxy.focus())
    const error = host.querySelector('[data-scope="field"][data-part="error"]')!
    expect(error.textContent).toBe(message)
    expect(trigger().getAttribute('aria-invalid')).toBe('true')
    expect(trigger().getAttribute('aria-describedby')).toBe(error.id)
    // The consumer's own error wins over the browser's.
    await render({ label: 'Plan', 'aria-label': undefined, name: 'plan', required: true, error: 'Pick a plan' })
    expect(host.querySelector('[data-part="error"]')!.textContent).toBe('Pick a plan')
    await render({ label: 'Plan', 'aria-label': undefined, name: 'plan', required: true })
    await act(async () => trigger().click())
    await act(async () => option('b').click())
    expect(host.querySelector('[data-part="error"]')).toBeNull()
    expect(trigger().hasAttribute('aria-invalid')).toBe(false)
  })

  it('renders a duplicate key once and never activates a disabled option', async () => {
    const onValueChange = vi.fn()
    await expectDevError(
      () =>
        render({
          items: [...items, { value: 'a', label: 'Duplicate' }],
          onValueChange,
        }),
      /^Face UI Select: invalid items\[4\] key "a"; dropping the duplicate/,
    )
    await act(async () => trigger().click())
    expect(list()?.querySelectorAll('[data-value="a"]')).toHaveLength(1)
    await act(async () => option('c').click())
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('drops groups and separators from its flat list with a report', async () => {
    await expectDevError(
      () =>
        render({
          items: [
            { type: 'group', label: 'Group', items: [{ value: 'x', label: 'X' }] },
            { type: 'separator' },
            ...abc,
          ],
        }),
      /^Face UI Select: invalid item type "(group|separator)"; dropping the item/,
    )
    await act(async () => trigger().click())
    expect(
      Array.from(list()!.querySelectorAll('[role="option"]'), (node) =>
        node.getAttribute('data-value'),
      ),
    ).toEqual(['a', 'b', 'c'])
  })

  it('renders hostile sizes and labels without throwing', async () => {
    await expectDevError(
      () =>
        render({
          contentMinWidth: [{}],
          placeholder: 0,
          labels: [],
          value: 0,
          defaultOpen: true,
          surface: 'sheet',
        }),
      /^Face UI Select: invalid (placeholder|labels|value)/,
    )
    expect(list()).not.toBeNull()
    expect(host.querySelector('[data-part="value"]')!.textContent).toBe('')
  })
})

describe('Select keyboard and highlight', () => {
  it('highlights enabled options in order, wraps, and opens from each end', async () => {
    await render({
      items: [
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta', disabled: true },
        { value: 'gamma', label: 'Gamma' },
        { value: 'delta', label: 'Delta' },
      ],
    })
    await key(trigger(), 'ArrowUp')
    expect(highlighted()).toBe('delta')
    await key(trigger(), 'ArrowDown')
    expect(highlighted()).toBe('alpha')
    await key(trigger(), 'ArrowDown')
    expect(highlighted()).toBe('gamma')
    await key(trigger(), 'ArrowUp')
    expect(highlighted()).toBe('alpha')
    await key(trigger(), 'Escape')
    expect(list()).toBeNull()
    await key(trigger(), 'End')
    expect(highlighted()).toBe('delta')
    await key(trigger(), 'Home')
    expect(highlighted()).toBe('alpha')
  })
  it('forgets the highlight on close: the next opening starts at the selection', async () => {
    await render({ defaultValue: 'b' })
    await key(trigger(), 'ArrowDown')
    expect(highlighted()).toBe('b')
    await key(trigger(), 'ArrowUp')
    expect(highlighted()).toBe('')
    await key(trigger(), 'Escape')
    await act(async () => trigger().click())
    expect(highlighted()).toBe('b')
  })
  it('Enter and Space choose the highlighted item; a single choice closes, multiple stays open', async () => {
    const onValueChange = vi.fn()
    await render({ onValueChange })
    await key(trigger(), 'Enter')
    await key(trigger(), 'ArrowDown')
    await key(trigger(), 'Enter')
    expect(onValueChange).toHaveBeenLastCalledWith({ value: '' })
    expect(list()).toBeNull()
    await act(async () =>
      root.render(
        <Select
          key="multiple"
          multiple
          items={items}
          surface="popover"
          aria-label="Plan"
          onValueChange={onValueChange}
        />,
      ),
    )
    await key(trigger(), ' ')
    await key(trigger(), ' ')
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a'] })
    await key(trigger(), 'End')
    await key(trigger(), 'Enter')
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a', 'b'] })
    expect(list()).not.toBeNull()
  })
  it('points aria-activedescendant at the highlighted option from the focused trigger', async () => {
    await render({ defaultValue: 'a' })
    expect(trigger().hasAttribute('aria-activedescendant')).toBe(false)
    await key(trigger(), 'ArrowDown')
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('a').id)
    expect(trigger().getAttribute('aria-controls')).toBe(list()!.id)
    expect(list()!.hasAttribute('aria-activedescendant')).toBe(false)
    await key(trigger(), 'ArrowDown')
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('').id)
    await act(async () => {
      const event = new MouseEvent('pointermove', { bubbles: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      option('b').dispatchEvent(event)
    })
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option('b').id)
    // Option ids are distinct and DOM-safe for any key, the empty one included.
    const ids = Array.from(list()!.querySelectorAll('[role="option"]'), (node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[^\s]+$/.test(id))).toBe(true)
  })
})

describe('Select typeahead', () => {
  const cities = [
    { value: 'ams', label: 'Amsterdam' },
    { value: 'ber', label: 'Berlin' },
    { value: 'bog', label: 'Bogota', disabled: true },
    { value: 'bru', label: 'Brussels' },
    { value: 'nd', label: 'New Delhi' },
    { value: 'ny', label: 'New York' },
  ]
  let now = 1000
  beforeEach(() => {
    now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const type = async (text: string, gap = 100) => {
    for (const char of text) {
      now += gap
      await key(trigger(), char)
    }
  }
  it('opens a closed list at the first match, cycles a repeated letter and skips disabled items', async () => {
    await render({ items: cities })
    await type('b')
    expect(list()).not.toBeNull()
    expect(highlighted()).toBe('ber')
    await type('b')
    expect(highlighted()).toBe('bru')
    await type('b')
    expect(highlighted()).toBe('ber')
  })
  it('matches a longer prefix and restarts after 700 ms', async () => {
    await render({ items: cities })
    await type('bru')
    expect(highlighted()).toBe('bru')
    now += 800
    await type('a')
    expect(highlighted()).toBe('ams')
  })
  it('takes Space as text during a search and as activation after it', async () => {
    const onValueChange = vi.fn()
    await render({ items: cities, onValueChange })
    await type('new')
    expect(highlighted()).toBe('nd')
    await type(' y')
    expect(highlighted()).toBe('ny')
    expect(list()).not.toBeNull()
    expect(onValueChange).not.toHaveBeenCalled()
    now += 800
    await key(trigger(), ' ')
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'ny' })
    expect(list()).toBeNull()
  })
  it('a closed list forgets the search, so Space right after a choice opens it again', async () => {
    const onValueChange = vi.fn()
    await render({ items: cities, onValueChange })
    await type('ber')
    await key(trigger(), 'Enter')
    expect(list()).toBeNull()
    await type(' ')
    expect(list()).not.toBeNull()
    expect(highlighted()).toBe('ber')
  })
})

describe('Select side surface', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('opens on hover and closes after the pointer leaves, unless the keyboard holds it', async () => {
    const onOpenChange = vi.fn()
    await render({ surface: 'side', onOpenChange })
    await pointer(trigger(), 'pointerover')
    expect(list()).not.toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: true })
    await pointer(trigger(), 'pointerout')
    await act(async () => vi.advanceTimersByTime(100))
    expect(list()).not.toBeNull()
    await act(async () => vi.advanceTimersByTime(60))
    expect(list()).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false })
    // Opened by click, the trigger holds focus: leaving with the pointer keeps the list.
    await act(async () => trigger().click())
    expect(document.activeElement).toBe(trigger())
    await pointer(trigger(), 'pointerover')
    await pointer(trigger(), 'pointerout')
    await act(async () => vi.advanceTimersByTime(500))
    expect(list()).not.toBeNull()
    // A click on an open side list keeps it open.
    await act(async () => trigger().click())
    expect(list()).not.toBeNull()
  })
  it('ignores hover outside the side surface', async () => {
    await render({ surface: 'popover' })
    await pointer(trigger(), 'pointerover')
    expect(list()).toBeNull()
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Select syncs controlled value updates without echoing onValueChange', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          value="alpha"
          surface="sheet"
          aria-label="Letter"
          items={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-scope="select"][data-part="trigger"]',
    )
    expect(trigger?.textContent).toContain('Alpha')
    expect(
      trigger?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-down"]',
      ),
    ).not.toBeNull()
    expect(libraryCss()).toContain(
      'padding-inline-end: var(--uf-select-indicator-edge-gap);',
    )

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(
      trigger?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-up"]',
      ),
    ).not.toBeNull()

    const betaOption =
      Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((option) => option.dataset.value === 'beta') ?? null
    expect(betaOption?.textContent).toContain('Beta')

    await act(async () => {
      betaOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange.mock.calls.map(([details]) => details)).toEqual([
      { value: 'beta' },
    ])
    expect(trigger?.textContent).toContain('Alpha')

    await act(async () => {
      root.render(
        <Select
          value="beta"
          surface="sheet"
          aria-label="Letter"
          items={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    expect(handleValueChange).toHaveBeenCalledTimes(1)
    expect(trigger?.textContent).toContain('Beta')
  })

  it('Select supports an icon-only trigger without shrinking the popover', async () => {
    await act(async () => {
      root.render(
        <Select
          iconOnly
          fullWidth={false}
          surface="popover"
          aria-label="Change type"
          displayValue={<Icon name="type" />}
          contentMinWidth="10rem"
          items={[
            { value: 'string', label: 'String' },
            { value: 'boolean', label: 'Boolean' },
          ]}
        />,
      )
    })

    const selectRoot = container.querySelector<HTMLElement>(
      '[data-scope="select"]',
    )
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-scope="select"][data-part="trigger"]',
    )

    expect(selectRoot?.hasAttribute('data-icon-only')).toBe(true)
    expect(trigger?.hasAttribute('data-icon-only')).toBe(true)
    expect(trigger?.querySelector('[data-part="indicator"]')).toBeNull()
    expect(
      trigger?.querySelector('.uf-select__value svg[data-icon="type"]'),
    ).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content =
      document
        .getElementById(contentId)
        ?.closest<HTMLElement>('[data-part="content"]') ?? null
    expect(content?.hasAttribute('data-icon-only')).toBe(true)
    expect(
      content?.style.getPropertyValue(
        '--face-runtime-select-content-min-width',
      ),
    ).toBe('10rem')

    const componentStyles = libraryCss()
    expect(componentStyles).toContain(
      '.uf-select[data-scope="select"][data-icon-only] [data-part="trigger"]',
    )
    expect(componentStyles).toContain('[data-icon-only]')
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

  it('Select switches auto surfaces to a bottom sheet titled by its name', async () => {
    await act(async () => {
      root.render(
        <Select
          aria-label="Plan"
          labels={{ close: 'Fermer' }}
          items={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector(
      '[data-part="content"]',
    ) as HTMLElement | null
    const backdrop = container.querySelector(
      '.uf-responsive-overlay-backdrop',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.getAttribute('role')).toBe('dialog')
    expect(
      document.getElementById(content!.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Plan')
    expect(
      content?.querySelector('button[aria-label="Fermer"]'),
    ).not.toBeNull()
    expect(content?.hidden).toBe(false)
    expect(backdrop?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-part="content"]')).toBeNull()
  })

  it('Select binds its visible label, trigger, listbox and options', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Font style"
          items={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const label = container.querySelector(
      '[data-part="label"]',
    ) as HTMLLabelElement | null
    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(label).not.toBeNull()
    expect(trigger).not.toBeNull()
    expect(label?.id).toBeTruthy()
    expect(trigger?.id).toBeTruthy()
    expect(label?.htmlFor).toBe(trigger?.id)
    expect(trigger?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)

    // A click on the label opens the list, as on the trigger.
    await act(async () => {
      label?.click()
    })

    const listbox = container.querySelector(
      '[role="listbox"]',
    ) as HTMLElement | null
    const options = Array.from(
      container.querySelectorAll<HTMLElement>('[role="option"]'),
    )
    expect(
      document
        .getElementById(trigger?.getAttribute('aria-controls') ?? '')
        ?.contains(listbox),
    ).toBe(true)
    expect(listbox?.contains(document.activeElement)).toBe(true)
    expect(listbox?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(
      document.getElementById(
        container
          .querySelector('[role="dialog"]')!
          .getAttribute('aria-labelledby')!,
      )?.textContent,
    ).toBe('Font style')
    expect(options).toHaveLength(2)
    expect(options.every((option) => Boolean(option.id))).toBe(true)
  })

  it('Select keyboard navigation highlights enabled options and binds active descendant', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Weight"
          items={[
            { value: 'thin', label: 'Thin', disabled: true },
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
            { value: 'black', label: 'Black', disabled: true },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)

    await key(trigger!, 'ArrowDown')

    let highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Regular')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await key(trigger!, 'ArrowDown')

    highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Bold')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await key(trigger!, 'Home')
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Regular')

    await key(trigger!, 'End')
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Bold')

    await key(trigger!, 'Escape')

    expect(container.querySelector('[role="listbox"]')).toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)
  })

  it('Select click selection keeps multiselect open and emits value callbacks', async () => {
    const handleValueChange = vi.fn()
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          multiple
          aria-label="Weights"
          defaultValue={[]}
          items={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })

    const regularOption =
      Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((node) => node.textContent?.includes('Regular')) ?? null
    expect(regularOption).not.toBeNull()

    await act(async () => {
      regularOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[role="listbox"]')).not.toBeNull()
    expect(trigger?.textContent).toContain('Regular')
    expect(handleValueChange).toHaveBeenLastCalledWith({ value: ['regular'] })
  })

  it('allows forcing desktop popover surfaces on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          surface="popover"
          aria-label="Letter"
          items={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content =
      document
        .getElementById(contentId)
        ?.closest<HTMLElement>('[data-part="content"]') ?? null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(
      container.querySelector('.uf-responsive-overlay-backdrop'),
    ).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Select uses the shared outside click fallback for popover dismissal', async () => {
    await act(async () => {
      root.render(
        <>
          <Select
            surface="popover"
            aria-label="Letter"
            items={[
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ]}
          />
          <button type="button" data-testid="select-outside-click">
            Outside
          </button>
        </>,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    const outside = container.querySelector(
      '[data-testid="select-outside-click"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    expect(document.getElementById(contentId)).not.toBeNull()

    await act(async () => {
      outside?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(document.getElementById(contentId)).toBeNull()
  })
})
