import { act, createRef, version } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, it, expect, vi } from 'vitest'
import { SegmentedControl } from '../../SegmentedControl/SegmentedControl'
import { formEntries, mount } from './harness'
let host: HTMLDivElement, root: Root
const items = [
  { value: '', label: 'None' },
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
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
})
it('allows empty-string key as a keyboard target', async () => {
  await render({ defaultValue: 'a' })
  await key(1, 'Home')
  expect(document.activeElement).toBe(buttons()[0])
  expect(selected()).toEqual(['None'])
})
it('both radio arrow pairs select the next choice', async () => {
  await render({ defaultValue: 'a' })
  await key(1, 'ArrowDown')
  expect(selected()).toEqual(['Beta'])
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
it('uses a real disabled button', async () => {
  await render({ disabled: true })
  expect(buttons()[0].disabled).toBe(true)
})
it('accepts native item names for icons', async () => {
  await render({
    items: [{ value: 'a', label: <svg />, id: 'grid', 'aria-label': 'Grid' }],
  })
  expect(buttons()[0].id).toBe('grid')
  expect(buttons()[0].getAttribute('aria-label')).toBe('Grid')
})
it('copies callback arrays before exposing them', async () => {
  await render({
    multiple: true,
    onValueChange: ({ value }: any) => value.push('b'),
  })
  await click(1)
  expect(selected()).toEqual(['Alpha'])
})
it('does not silently stringify malformed selection values', () => {
  expect(() =>
    renderToString(<SegmentedControl items={items} value={[4] as any} />),
  ).toThrow()
})
it('does not expose removed choices in the next user proposal', async () => {
  const cb = vi.fn()
  await render({ multiple: true, defaultValue: ['missing'], onValueChange: cb })
  await click(1)
  expect(cb).toHaveBeenLastCalledWith({ value: ['a'] })
})
it('multiple mode exposes pressed button semantics', async () => {
  await render({ multiple: true, defaultValue: ['a'] })
  expect(buttons()[1].getAttribute('role')).toBeNull()
  expect(buttons()[1].getAttribute('aria-pressed')).toBe('true')
})
it('a refused controlled proposal never leaks into DOM or the next proposal', async () => {
  const cb = vi.fn()
  await render({ value: 'a', onValueChange: cb })
  await click(2)
  expect(selected()).toEqual(['Alpha'])
  await click(2)
  expect(cb.mock.calls).toEqual([[{ value: 'b' }], [{ value: 'b' }]])
})
it('owner updates are silent and releasing control retains the last accepted value', async () => {
  const cb = vi.fn()
  await render({ value: 'a', onValueChange: cb })
  await render({ value: 'b', onValueChange: cb })
  await render({ onValueChange: cb })
  expect(selected()).toEqual(['Beta'])
  expect(cb).not.toHaveBeenCalled()
})
it('defaultValue is mount-only, including after user changes', async () => {
  await render({ defaultValue: 'a' })
  await click(2)
  await render({ defaultValue: '' })
  expect(selected()).toEqual(['Beta'])
})
it('multiple values are copied and canonicalized in item order', async () => {
  const initial = ['b', 'a', 'a']
  const cb = vi.fn()
  await render({ multiple: true, defaultValue: initial, onValueChange: cb })
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
it('removed uncontrolled choices do not reappear when items return', async () => {
  await render({ defaultValue: 'a' })
  await render({ items: [items[0], items[2]] })
  await render()
  expect(selected()).toEqual([])
})
it('controlled unknown keys render no phantom selection and return when represented', async () => {
  await render({ value: 'a', items: [items[0], items[2]] })
  expect(selected()).toEqual([])
  await render({ value: 'a' })
  expect(selected()).toEqual(['Alpha'])
})
it('switching multiple to single keeps the first choice in item order', async () => {
  await render({ multiple: true, defaultValue: ['b', 'a'] })
  await render()
  expect(selected()).toEqual(['Alpha'])
  await render({ multiple: true })
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
it('multiple only handles arrows on its visual axis', async () => {
  await render({ multiple: true, orientation: 'vertical' })
  await key(0, 'ArrowRight')
  expect(document.activeElement).toBe(buttons()[0])
  await key(0, 'ArrowDown')
  expect(document.activeElement).toBe(buttons()[1])
})
it('modified shortcuts are not intercepted', async () => {
  await render({ defaultValue: 'a' })
  await act(async () => {
    buttons()[1].focus()
    buttons()[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  expect(selected()).toEqual(['Alpha'])
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
it('skips disabled choices and wraps including empty keys', async () => {
  await render({ items: [items[0], { ...items[1], disabled: true }, items[2]] })
  await key(0, 'ArrowRight')
  expect(document.activeElement).toBe(buttons()[2])
  await key(2, 'ArrowRight')
  expect(document.activeElement).toBe(buttons()[0])
})
it('recovers focus when its current choice is removed', async () => {
  await render({ defaultValue: 'a' })
  await act(async () => buttons()[1].focus())
  await render({ items: [items[0], items[2]] })
  expect(document.activeElement).toBe(buttons()[0])
})
it('recovers focus when its current choice becomes disabled', async () => {
  await render({ defaultValue: 'a' })
  await act(async () => buttons()[1].focus())
  await render({ items: [items[0], { ...items[1], disabled: true }, items[2]] })
  expect(document.activeElement).toBe(buttons()[0])
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
it('autoFocus runs only on mount and picks an enabled selected item', async () => {
  await render({ autoFocus: true, defaultValue: 'a' })
  expect(document.activeElement).toBe(buttons()[1])
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
it('multiple group does not claim an unsupported aria-orientation', async () => {
  await render({ multiple: true, orientation: 'vertical' })
  expect(host.firstElementChild!.hasAttribute('aria-orientation')).toBe(false)
  expect(host.firstElementChild!.getAttribute('data-orientation')).toBe(
    'vertical',
  )
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
it('invalid item shapes and duplicate keys fail explicitly', () => {
  for (const items of [
    [{ value: 1, label: 'x' }],
    [
      { value: 'x', label: 'x' },
      { value: 'x', label: 'y' },
    ],
    null,
  ])
    expect(() =>
      renderToString(<SegmentedControl items={items as any} />),
    ).toThrow()
})
it('empty items do not create phantom choices or keyboard targets', async () => {
  await render({ items: [], value: 'a' })
  expect(buttons()).toEqual([])
  expect(host.firstElementChild!.getAttribute('role')).toBe('radiogroup')
})

it('Toggle adapts legacy single arrays with native names and no radio deselection',async()=>{
  const {Toggle}=await import('../../Toggle/Toggle')
  const cb=vi.fn()
  await act(async()=>root.render(<Toggle type="single" defaultValue={['a']} items={items} aria-label="Legacy view" onValueChange={cb}/>))
  await click(1)
  expect(cb).not.toHaveBeenCalled()
  await click(2)
  expect(cb).toHaveBeenLastCalledWith({value:['b']})
  expect(host.firstElementChild!.getAttribute('aria-label')).toBe('Legacy view')
})
it('Toggle multiple defaults to independent pressed buttons',async()=>{
  const {Toggle}=await import('../../Toggle/Toggle')
  await act(async()=>root.render(<Toggle defaultValue={['a']} items={items}/>))
  await click(2)
  expect(selected()).toEqual(['Alpha','Beta'])
  expect(buttons()[2].getAttribute('aria-pressed')).toBe('true')
})
