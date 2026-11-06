import { act, createRef, version } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from '../../SegmentedControl/SegmentedControl'
import { expectDevError, formEntries, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'
import { describeRoving } from './harness/roving'

let host: HTMLDivElement, root: Root
const items = [
  { value: '', label: 'None' },
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]
const abc = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: any = {}) =>
  act(async () => root.render(<SegmentedControl items={items} {...props} />))
const buttons = () => Array.from(host.querySelectorAll('button'))
const selected = () =>
  buttons()
    .filter(
      (n) =>
        n.getAttribute('aria-checked') === 'true' ||
        n.getAttribute('aria-pressed') === 'true',
    )
    .map((n) => n.textContent)
const click = (i: number) => act(async () => buttons()[i].click())
const key = (i: number, key: string) =>
  act(async () => {
    buttons()[i].focus()
    buttons()[i].dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })

const itemOf = (host: HTMLElement, key: string) =>
  host.querySelector<HTMLButtonElement>(
    `.uf-toggle-item[data-value="${key}"]`,
  )!
const pressed = (host: HTMLElement) =>
  Array.from(
    host.querySelectorAll<HTMLElement>(
      '.uf-toggle-item[aria-checked="true"], .uf-toggle-item[aria-pressed="true"]',
    ),
    (node) => node.dataset.value!,
  )

describeControlled<string | null>({
  name: 'SegmentedControl',
  prop: 'value',
  values: ['a', 'b'],
  render: (props) => <SegmentedControl items={abc} aria-label="View" {...props} />,
  change: (host, to) => itemOf(host, to!).click(),
  read: (host) => pressed(host)[0] ?? null,
  normalizes: ['missing', null],
  handler: 'onClick',
  formReset: true,
})
describeControlled<string[]>({
  name: 'SegmentedControl',
  prop: 'value',
  values: [['a'], ['a', 'b']],
  render: (props) => (
    <SegmentedControl multiple items={abc} aria-label="Filters" {...props} />
  ),
  // Pressing Beta switches between the two values.
  change: (host) => itemOf(host, 'b').click(),
  read: pressed,
  normalizes: [['b', 'missing', 'a'], ['a', 'b']],
  handler: 'onClick',
  formReset: true,
})
describeField('SegmentedControl', (props) => (
  <SegmentedControl items={abc} {...props} />
))
describeField('SegmentedControl multiple', (props) => (
  <SegmentedControl multiple items={abc} {...props} />
))
const rovingItems = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLElement>('.uf-toggle-item'))
describeRoving({
  name: 'SegmentedControl',
  render: ({ items, defaultValue }) => (
    <SegmentedControl items={items} defaultValue={defaultValue} aria-label="View" />
  ),
  items: rovingItems,
  orientation: 'both',
  selects: true,
  activateOnMove: (host) => pressed(host)[0] ?? null,
})
describeRoving({
  name: 'SegmentedControl multiple',
  render: ({ items, defaultValue }) => (
    <SegmentedControl
      multiple
      items={items}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      aria-label="Filters"
    />
  ),
  items: rovingItems,
  orientation: 'horizontal',
  selects: true,
})

describe('selection-invariant (§5 #8): the value is the intent, the selection its projection', () => {
  it('a default that arrives with late items is selected: [] → [a] → [a,b,c] shows B', async () => {
    const cb = vi.fn()
    await render({ items: [], defaultValue: 'b', onValueChange: cb })
    expect(selected()).toEqual([])
    await render({ items: abc.slice(0, 1), defaultValue: 'b', onValueChange: cb })
    expect(selected()).toEqual([])
    await render({ items: abc, defaultValue: 'b', onValueChange: cb })
    expect(selected()).toEqual(['Beta'])
    expect(cb).not.toHaveBeenCalled()
  })

  it('a user choice survives briefly empty items and reports once', async () => {
    const cb = vi.fn()
    await render({ items: abc, defaultValue: 'a', onValueChange: cb })
    await click(2)
    await render({ items: [], onValueChange: cb })
    expect(buttons()).toEqual([])
    await render({ items: abc, onValueChange: cb })
    expect(selected()).toEqual(['Gamma'])
    expect(cb.mock.calls).toEqual([[{ value: 'c' }]])
  })

  it('multiple keeps every intended key through async items', async () => {
    const cb = vi.fn()
    await render({ multiple: true, items: [], defaultValue: ['c', 'b'], onValueChange: cb })
    await render({ multiple: true, items: abc.slice(0, 1), onValueChange: cb })
    expect(selected()).toEqual([])
    await render({ multiple: true, items: abc, onValueChange: cb })
    expect(selected()).toEqual(['Beta', 'Gamma'])
    expect(cb).not.toHaveBeenCalled()
  })

  it('form reset restores the default even while its key is missing', async () => {
    await act(async () =>
      root.render(
        <form>
          <SegmentedControl name="view" items={abc} defaultValue="a" />
        </form>,
      ),
    )
    await click(1)
    await act(async () =>
      root.render(
        <form>
          <SegmentedControl name="view" items={abc.slice(1)} defaultValue="a" />
        </form>,
      ),
    )
    await act(async () => {
      host.querySelector('form')!.reset()
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    expect(selected()).toEqual([])
    await act(async () =>
      root.render(
        <form>
          <SegmentedControl name="view" items={abc} defaultValue="a" />
        </form>,
      ),
    )
    expect(selected()).toEqual(['Alpha'])
  })
})

describe('multiple changes the value shape', () => {
  it('single reports a string or null, multiple a fresh string[]', async () => {
    const single = vi.fn()
    await render({ items: abc, onValueChange: single })
    await click(1)
    expect(single.mock.calls).toEqual([[{ value: 'b' }]])
    await act(async () => root.render(null))
    const multiple = vi.fn()
    const value = ['a']
    await render({ multiple: true, items: abc, value, onValueChange: multiple })
    await click(1)
    expect(multiple.mock.calls).toEqual([[{ value: ['a', 'b'] }]])
    expect(multiple.mock.calls[0][0].value).not.toBe(value)
    expect(Array.isArray(multiple.mock.calls[0][0].value)).toBe(true)
  })

  it('single mode is a radiogroup of radios, multiple a group of pressed buttons', async () => {
    await render({ items: abc, defaultValue: 'a' })
    expect(host.firstElementChild!.getAttribute('role')).toBe('radiogroup')
    expect(buttons()[0].getAttribute('role')).toBe('radio')
    expect(buttons()[0].getAttribute('aria-checked')).toBe('true')
    expect(buttons()[0].hasAttribute('aria-pressed')).toBe(false)
    await render({ multiple: true, items: abc, defaultValue: ['a'] })
    expect(host.firstElementChild!.getAttribute('role')).toBe('group')
    expect(buttons()[0].hasAttribute('role')).toBe(false)
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true')
    expect(buttons()[0].hasAttribute('aria-checked')).toBe(false)
  })

  it('switching mode projects the stored value without rewriting it', async () => {
    const cb = vi.fn()
    await render({ multiple: true, items: abc, defaultValue: ['c', 'b'], onValueChange: cb })
    expect(selected()).toEqual(['Beta', 'Gamma'])
    // Single mode shows the first stored key in item order.
    await render({ items: abc, onValueChange: cb })
    expect(selected()).toEqual(['Beta'])
    await render({ multiple: true, items: abc, onValueChange: cb })
    expect(selected()).toEqual(['Beta', 'Gamma'])
    expect(cb).not.toHaveBeenCalled()
    await render({ items: abc, onValueChange: cb })
    await click(0)
    expect(cb.mock.calls).toEqual([[{ value: 'a' }]])
  })

  it('a value of the other shape is projected silently', async () => {
    await render({ items: abc, value: ['c', 'a'] })
    expect(selected()).toEqual(['Alpha'])
    await render({ multiple: true, items: abc, value: 'b' })
    expect(selected()).toEqual(['Beta'])
  })
})

it('radio reselect retains its selected value without a callback', async () => {
  const cb = vi.fn()
  await render({ defaultValue: 'a', onValueChange: cb })
  await click(1)
  expect(selected()).toEqual(['Alpha'])
  expect(cb).not.toHaveBeenCalled()
})
it('forwards native root identity, description and direction', async () => {
  await render({
    id: 'mode',
    dir: 'rtl',
    'aria-label': 'Mode',
    'aria-describedby': 'hint',
  })
  const node = host.firstElementChild!
  expect(node.id).toBe('mode')
  expect(node.getAttribute('dir')).toBe('rtl')
  expect(node.getAttribute('aria-label')).toBe('Mode')
  expect(node.getAttribute('aria-describedby')).toBe('hint')
})
it('the strip is a list inside the field root, between label and help', async () => {
  await render({ label: 'View', description: 'Help', defaultValue: 'a' })
  const rootNode = host.firstElementChild!
  expect(rootNode.className).toBe('uf-field uf-toggle')
  expect(Array.from(rootNode.children, (child) => child.getAttribute('data-part'))).toEqual([
    'label',
    'list',
    'description',
    null,
    null,
  ])
  const list = rootNode.children[1]
  expect(list.className).toBe('uf-toggle-list')
  expect(list.querySelectorAll('.uf-toggle-item')).toHaveLength(3)
  expect(rootNode.children[3].getAttribute('role')).toBe('status')
  expect(rootNode.children[4].tagName).toBe('SELECT')
})
it('allows empty-string key as a keyboard target', async () => {
  await render({ defaultValue: 'a' })
  await key(1, 'Home')
  expect(document.activeElement).toBe(buttons()[0])
  expect(selected()).toEqual(['None'])
})
it('honors capture cancellation', async () => {
  await act(async () =>
    root.render(
      <div onKeyDownCapture={(e) => e.preventDefault()}>
        <SegmentedControl items={items} defaultValue="a" />
      </div>,
    ),
  )
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['Alpha'])
})
it('honors cancelled clicks', async () => {
  await act(async () =>
    root.render(
      <div onClickCapture={(e) => e.preventDefault()}>
        <SegmentedControl items={items} defaultValue="a" />
      </div>,
    ),
  )
  await click(2)
  expect(selected()).toEqual(['Alpha'])
})
it('a click on an element inside a choice selects it', async () => {
  await render({
    items: [
      { value: 'a', label: <span>Alpha</span> },
      { value: 'b', label: <span>Beta</span> },
    ],
    defaultValue: 'a',
  })
  await act(async () => buttons()[1].querySelector('span')!.click())
  expect(selected()).toEqual(['Beta'])
})
it('uses a real disabled button', async () => {
  await render({ disabled: true })
  expect(buttons()[0].disabled).toBe(true)
})
it('accepts native item names for icons, and item descriptions come first', async () => {
  await render({
    id: 'mode',
    description: 'Help',
    items: [
      { value: 'a', label: <svg />, id: 'grid', title: 'Grid view', 'aria-label': 'Grid', 'aria-labelledby': 'l', 'aria-describedby': 'tip' },
      // Untyped data: only the documented native fields reach the button.
      { value: 'b', label: 'B', onClick: 'x', 'data-x': 1 } as any,
    ],
  })
  expect(buttons()[0].id).toBe('grid')
  expect(buttons()[0].title).toBe('Grid view')
  expect(buttons()[0].getAttribute('aria-label')).toBe('Grid')
  expect(buttons()[0].getAttribute('aria-labelledby')).toBe('l')
  expect(buttons()[1].hasAttribute('data-x')).toBe(false)
  await click(1)
  expect(selected()).toEqual(['B'])
  expect(buttons()[0].getAttribute('aria-describedby')).toBe('tip mode-description')
})
it('copies callback arrays before exposing them', async () => {
  await render({
    multiple: true,
    onValueChange: ({ value }: any) => value.push('b'),
  })
  await click(1)
  expect(selected()).toEqual(['Alpha'])
})
it('reports malformed selection keys and ignores them', async () => {
  await expectDevError(
    () => render({ multiple: true, value: [4, 'a'] }),
    /^Face UI SegmentedControl: invalid value\[0\] 4; dropping it\.$/,
  )
  expect(selected()).toEqual(['Alpha'])
})
it('does not expose removed choices in the next user proposal', async () => {
  const cb = vi.fn()
  await render({ multiple: true, defaultValue: ['missing'], onValueChange: cb })
  await click(1)
  expect(cb).toHaveBeenLastCalledWith({ value: ['a'] })
})
it('multiple values are copied and canonicalized in item order', async () => {
  const initial = ['b', 'a', 'a']
  const cb = vi.fn()
  await expectDevError(
    () => render({ multiple: true, defaultValue: initial, onValueChange: cb }),
    /^Face UI SegmentedControl: invalid value\[2\] "a"; dropping the duplicate\.$/,
  )
  initial.length = 0
  await render({ multiple: true, defaultValue: initial, onValueChange: cb })
  expect(selected()).toEqual(['Alpha', 'Beta'])
  await click(0)
  expect(cb).toHaveBeenLastCalledWith({ value: ['', 'a', 'b'] })
})
it('selected unavailable choices remain selected, but cannot be changed', async () => {
  const cb = vi.fn()
  await render({
    defaultValue: 'a',
    items: [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Beta' },
    ],
    onValueChange: cb,
  })
  expect(selected()).toEqual(['Alpha'])
  await click(0)
  expect(cb).not.toHaveBeenCalled()
  expect(buttons()[1].tabIndex).toBe(0)
})
it('controlled unknown keys render no phantom selection and return when represented', async () => {
  await render({ value: 'a', items: [items[0], items[2]] })
  expect(selected()).toEqual([])
  await render({ value: 'a' })
  expect(selected()).toEqual(['Alpha'])
})
it('a controlled multiple proposal can toggle off without mutating input', async () => {
  const value = Object.freeze(['a', 'b'])
  const cb = vi.fn()
  await render({ multiple: true, value, onValueChange: cb })
  await click(1)
  expect(cb).toHaveBeenLastCalledWith({ value: ['b'] })
  expect(value).toEqual(['a', 'b'])
  expect(selected()).toEqual(['Alpha', 'Beta'])
})
it('multiple arrows move focus without changing selection', async () => {
  const cb = vi.fn()
  await render({ multiple: true, defaultValue: ['a'], onValueChange: cb })
  await key(1, 'ArrowRight')
  expect(document.activeElement).toBe(buttons()[2])
  expect(selected()).toEqual(['Alpha'])
  expect(cb).not.toHaveBeenCalled()
})
it('multiple vertical answers to the vertical arrows only', async () => {
  await render({ multiple: true, orientation: 'vertical' })
  await key(0, 'ArrowRight')
  expect(document.activeElement).toBe(buttons()[0])
  await key(0, 'ArrowDown')
  expect(document.activeElement).toBe(buttons()[1])
})
it('native bubble key handler can cancel navigation', async () => {
  await render({ defaultValue: 'a', onKeyDown: (e: any) => e.preventDefault() })
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['Alpha'])
})
it('native bubble click handler can cancel both pointer and keyboard proposals', async () => {
  await render({ defaultValue: 'a', onClick: (e: any) => e.preventDefault() })
  await click(2)
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['Alpha'])
  expect(document.activeElement).toBe(buttons()[2])
})
it('does not steal external focus on item changes', async () => {
  const external = document.createElement('button')
  document.body.append(external)
  await render({ defaultValue: 'a' })
  await act(async () => {
    buttons()[1].focus()
    external.focus()
  })
  await render({ items: [items[0], items[2]] })
  expect(document.activeElement).toBe(external)
  external.remove()
})
it('autoFocus runs only on mount, picks an enabled selected item and marks it', async () => {
  await render({ autoFocus: true, defaultValue: 'a' })
  expect(document.activeElement).toBe(buttons()[1])
  expect(buttons().map((button) => button.hasAttribute('data-autofocus'))).toEqual([
    false,
    true,
    false,
  ])
  await act(async () => buttons()[2].focus())
  await render({ autoFocus: true })
  expect(document.activeElement).toBe(buttons()[2])
})
it('late autoFocus does not steal focus', async () => {
  await render()
  await render({ autoFocus: true })
  expect(document.activeElement).toBe(document.body)
})
it('root ref and native attrs stay on the same node across membrane/orientation updates', async () => {
  const ref = createRef<HTMLDivElement>()
  await render({
    ref,
    id: 'choice',
    className: 'custom',
    style: { width: 240 },
  })
  const node = ref.current
  expect(node?.className).toBe('uf-field uf-toggle custom')
  await act(async () => buttons()[1].focus())
  const button = buttons()[1]
  await render({ ref, membrane: false, orientation: 'vertical' })
  expect(ref.current).toBe(node)
  expect(buttons()[1]).toBe(button)
  expect(document.activeElement).toBe(button)
})
it.skipIf(!version.startsWith('19.'))(
  'supports native React19 root ref cleanup',
  async () => {
    const cleanup = vi.fn()
    const ref = vi.fn(() => cleanup)
    await render({ ref })
    await act(async () => root.render(null))
    expect(cleanup).toHaveBeenCalledTimes(1)
  },
)
it('multiple group does not claim an unsupported aria-orientation or aria-invalid', async () => {
  await render({ multiple: true, orientation: 'vertical', error: 'Pick one' })
  const rootNode = host.firstElementChild!
  expect(rootNode.hasAttribute('aria-orientation')).toBe(false)
  expect(rootNode.hasAttribute('aria-invalid')).toBe(false)
  expect(rootNode.hasAttribute('data-invalid')).toBe(true)
  expect(rootNode.getAttribute('data-orientation')).toBe('vertical')
})
const form = () => host.querySelector('form')!
const data = () => formEntries(form())
const renderForm = (props: any = {}, formProps: any = {}) =>
  act(async () =>
    root.render(
      <form {...formProps}>
        <SegmentedControl items={items} {...props} />
      </form>,
    ),
  )
const reset = () =>
  act(async () => {
    form().reset()
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
it('submits single and empty-string choices, null submits nothing', async () => {
  await renderForm({ name: 'view', value: '' })
  expect(data()).toEqual([['view', '']])
  await renderForm({ name: 'view', value: null })
  // jsdom serializes disabled options; real FormData is verified in all 3 browsers.
  expect(host.querySelector('select')!.selectedOptions[0].disabled).toBe(true)
  await renderForm({ name: 'view', value: 'a' })
  expect(data()).toEqual([['view', 'a']])
})
it('multiple FormData follows item order and excludes disabled options', async () => {
  await renderForm({
    multiple: true,
    name: 'channel',
    value: ['b', 'a', ''],
    items: [items[0], { ...items[1], disabled: true }, items[2]],
  })
  expect(
    Array.from(host.querySelector('select')!.selectedOptions, (option) => [
      option.value,
      option.disabled,
    ]),
  ).toEqual([
    ['', false],
    ['a', true],
    ['b', false],
  ])
})
it('unnamed or disabled groups submit nothing', async () => {
  await renderForm({ value: 'a' })
  expect(data()).toEqual([])
  await renderForm({ name: 'view', value: 'a', disabled: true })
  expect(data()).toEqual([])
})
it('fieldset disables native buttons and form submission', async () => {
  await act(async () =>
    root.render(
      <form>
        <fieldset disabled>
          <SegmentedControl name="view" items={items} defaultValue="a" />
        </fieldset>
      </form>,
    ),
  )
  expect(buttons().every((button) => button.matches(':disabled'))).toBe(true)
  await click(2)
  expect(selected()).toEqual(['Alpha'])
  expect(data()).toEqual([])
})
it('native reset restores the original default silently', async () => {
  const cb = vi.fn()
  await renderForm({ name: 'view', defaultValue: 'a', onValueChange: cb })
  await click(2)
  await renderForm({ name: 'view', defaultValue: '', onValueChange: cb })
  await reset()
  expect(selected()).toEqual(['Alpha'])
  expect(data()).toEqual([['view', 'a']])
  expect(cb).toHaveBeenCalledTimes(1)
})
it('cancelled reset preserves accepted selection', async () => {
  await renderForm(
    { name: 'view', defaultValue: 'a' },
    { onReset: (e: any) => e.preventDefault() },
  )
  await click(2)
  await reset()
  expect(selected()).toEqual(['Beta'])
})
it('controlled reset retains the owner selection in FormData', async () => {
  await renderForm({ name: 'view', value: 'b', defaultValue: 'a' })
  await reset()
  expect(selected()).toEqual(['Beta'])
  expect(data()).toEqual([['view', 'b']])
})
it('external form owns data and reset even when rendered later', async () => {
  await act(async () =>
    root.render(
      <>
        <SegmentedControl
          items={items}
          name="view"
          form="external"
          defaultValue="a"
        />
        <form id="external" />
      </>,
    ),
  )
  expect(data()).toEqual([['view', 'a']])
  await click(2)
  await reset()
  expect(selected()).toEqual(['Alpha'])
})
it('native proxy change proposes once and reverts a refused value', async () => {
  const cb = vi.fn()
  await renderForm({ name: 'view', value: 'a', onValueChange: cb })
  const proxy = host.querySelector('select')!
  await act(async () => {
    proxy.value = 'b'
    proxy.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(cb).toHaveBeenLastCalledWith({ value: 'b' })
  expect(selected()).toEqual(['Alpha'])
  expect(data()).toEqual([['view', 'a']])
})
it('required blocks submission until a choice is made and marks the label', async () => {
  await renderForm({ name: 'view', required: true, label: 'View', items: abc })
  expect(form().checkValidity()).toBe(false)
  expect(host.querySelector('[data-part="required"]')).not.toBeNull()
  await click(0)
  expect(form().checkValidity()).toBe(true)
  await act(async () => root.render(null))
  await renderForm({ multiple: true, name: 'view', required: true, items: abc })
  expect(form().checkValidity()).toBe(false)
  await click(1)
  expect(form().checkValidity()).toBe(true)
})
it('required is exposed as aria-required on the radiogroup only', async () => {
  const group = () => host.querySelector('.uf-toggle')!
  await renderForm({ name: 'view', required: true, label: 'View', items: abc })
  expect(group().getAttribute('role')).toBe('radiogroup')
  expect(group().getAttribute('aria-required')).toBe('true')
  await renderForm({ name: 'view', label: 'View', items: abc })
  expect(group().hasAttribute('aria-required')).toBe(false)
  // role=group does not support aria-required; the proxy still validates.
  await renderForm({ multiple: true, name: 'view', required: true, items: abc })
  expect(group().getAttribute('role')).toBe('group')
  expect(group().hasAttribute('aria-required')).toBe(false)
})
it('required with no enabled choice does not block submission, as a native radio group', async () => {
  await renderForm({ name: 'view', required: true, items: [] })
  expect(form().checkValidity()).toBe(true)
  await renderForm({
    name: 'view',
    required: true,
    items: abc.map((item) => ({ ...item, disabled: true })),
  })
  expect(form().checkValidity()).toBe(true)
  await renderForm({ name: 'view', required: true, disabled: true, items: abc })
  expect(form().checkValidity()).toBe(true)
  await renderForm({ name: 'view', required: true, items: abc })
  expect(form().checkValidity()).toBe(false)
})
it('interactive validation shows the browser message as the error and focuses the tab stop', async () => {
  await renderForm({
    id: 'view',
    name: 'view',
    required: true,
    label: 'View',
    items: abc,
  })
  const proxy = host.querySelector('select')!
  await act(async () => proxy.focus())
  const error = host.querySelector('[data-part="error"]')!
  expect(error.textContent).toBe(proxy.validationMessage)
  expect(host.querySelector('.uf-toggle')!.getAttribute('aria-invalid')).toBe('true')
  expect(buttons()[0].getAttribute('aria-describedby')).toBe('view-error')
  expect(document.activeElement).toBe(buttons()[0])
  await click(1)
  await act(async () => proxy.focus())
  expect(host.querySelector('[data-part="error"]')).toBeNull()
})
it('invalid items and duplicate keys are skipped with a report', async () => {
  await expectDevError(
    () => render({ items: [{ value: 1, label: 'x' }, { value: 'y', label: 'Y' }] }),
    /^Face UI SegmentedControl: invalid items\[0\] key 1; dropping the item\.$/,
  )
  expect(buttons().map((button) => button.textContent)).toEqual(['Y'])
  await expectDevError(
    () =>
      render({
        items: [
          { value: 'x', label: 'x' },
          { value: 'x', label: 'y' },
        ],
      }),
    /^Face UI SegmentedControl: invalid items\[1\] key "x"; dropping the duplicate\.$/,
  )
  expect(buttons().map((button) => button.textContent)).toEqual(['x'])
  await expectDevError(
    () => render({ items: null }),
    /^Face UI SegmentedControl: invalid items null; using \[\]\.$/,
  )
  expect(buttons()).toEqual([])
})
it('groups and separators are dropped with a report: the strip is flat', async () => {
  await expectDevError(
    () =>
      render({
        items: [
          { value: 'a', label: 'A' },
          { type: 'separator' },
          { value: '#1', label: 'Hash' },
          { type: 'group', label: 'G', items: [{ value: 'b', label: 'Shadow' }] },
          { value: 'b', label: 'B' },
        ],
      }),
    /^Face UI SegmentedControl: invalid items\[\]\.type "(separator|group)"; dropping the item\.$/,
  )
  expect(buttons().map((button) => [button.textContent, button.tabIndex])).toEqual([
    ['A', 0],
    ['Hash', -1],
    ['B', -1],
  ])
  expect(host.textContent).not.toContain('Shadow')
  await key(0, 'ArrowRight')
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['B'])
})
it('empty items do not create phantom choices or keyboard targets', async () => {
  await render({ items: [], value: 'a' })
  expect(buttons()).toEqual([])
  expect(host.firstElementChild!.getAttribute('role')).toBe('radiogroup')
})
