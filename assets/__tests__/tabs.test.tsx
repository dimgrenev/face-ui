import React, { act, createRef, version, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, it, expect, vi, describe } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Tabs } from '../../Tabs/Tabs'
import { Button } from '../../Button/Button'
import { allowConsoleError, hydrate, mount } from './harness'
let host: HTMLDivElement, root: Root
const items = [
  { value: '', label: 'Empty', content: 'Empty panel' },
  { value: 'a', label: 'Alpha', content: 'Alpha panel' },
  { value: 'b', label: 'Beta', content: 'Beta panel' },
]
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: any = {}) =>
  act(async () => root.render(<Tabs items={items} {...props} />))
const tabs = () =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
const panels = () =>
  Array.from(host.querySelectorAll<HTMLElement>('[role="tabpanel"]'))
const selected = () =>
  tabs()
    .filter((n) => n.getAttribute('aria-selected') === 'true')
    .map((n) => n.dataset.value)
const click = (i: number) => act(async () => tabs()[i].click())
const focus = (i: number) => act(async () => tabs()[i].focus())
const key = (i: number, key: string, extra = {}) =>
  act(async () => {
    tabs()[i].focus()
    tabs()[i].dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    )
  })
it('routes native identity/style/ref to root and naming/description to tablist', async () => {
  const ref = createRef<HTMLDivElement>()
  await render({
    ref,
    id: 'tabs-root',
    dir: 'rtl',
    lang: 'ru',
    title: 'Details',
    style: { width: 320 },
    'aria-label': 'Sections',
    'aria-describedby': 'hint',
  })
  const outer = host.firstElementChild as HTMLElement,
    list = host.querySelector('[role="tablist"]')!
  expect(ref.current).toBe(outer)
  expect(outer.id).toBe('tabs-root')
  expect(outer.dir).toBe('rtl')
  expect(outer.lang).toBe('ru')
  expect(outer.title).toBe('Details')
  expect(outer.style.width).toBe('320px')
  expect(outer.hasAttribute('aria-label')).toBe(false)
  expect(list.getAttribute('aria-label')).toBe('Sections')
  expect(list.getAttribute('aria-describedby')).toBe('hint')
})
it('native aria-labelledby names only the tablist', async () => {
  await render({ 'aria-labelledby': 'heading' })
  expect(
    host.querySelector('[role="tablist"]')?.getAttribute('aria-labelledby'),
  ).toBe('heading')
  expect(host.firstElementChild?.hasAttribute('aria-labelledby')).toBe(false)
})
it('selects a valid empty key by default and Home', async () => {
  await render({ defaultValue: 'a' })
  await key(1, 'Home')
  expect(document.activeElement).toBe(tabs()[0])
  expect(selected()).toEqual([''])
})
it('automatic keyboard skips disabled tabs and wraps', async () => {
  await render({ items: items.map((x, i) => ({ ...x, disabled: i === 1 })) })
  await key(0, 'ArrowRight')
  expect(selected()).toEqual(['b'])
  await key(2, 'ArrowRight')
  expect(selected()).toEqual([''])
})
it('manual keyboard moves focus without changing panel until a native click', async () => {
  await render({ defaultValue: 'a', activationMode: 'manual' })
  await key(1, 'ArrowRight')
  expect(document.activeElement).toBe(tabs()[2])
  expect(selected()).toEqual(['a'])
  await click(2)
  expect(selected()).toEqual(['b'])
})
it('vertical supports its own arrows and End', async () => {
  await render({ orientation: 'vertical' })
  await key(0, 'ArrowDown')
  expect(selected()).toEqual(['a'])
  await key(1, 'End')
  expect(selected()).toEqual(['b'])
})
it('the other axis and modified keys keep native behavior', async () => {
  await render({ defaultValue: 'a' })
  await key(1, 'ArrowDown')
  expect(selected()).toEqual(['a'])
  await key(1, 'ArrowRight', { ctrlKey: true })
  expect(selected()).toEqual(['a'])
})
it('inherits direction instead of imposing ltr', async () => {
  await act(async () =>
    root.render(
      <div dir="rtl">
        <Tabs items={items} />
      </div>,
    ),
  )
  expect(
    host
      .querySelector('[data-part="root"][data-scope="tabs"]')
      ?.getAttribute('dir'),
  ).toBeNull()
})
it('focus/click reselect do not duplicate a value callback', async () => {
  const cb = vi.fn()
  await render({ defaultValue: 'a', onValueChange: cb })
  await focus(1)
  await click(1)
  expect(cb).not.toHaveBeenCalled()
  await focus(2)
  await click(2)
  expect(cb.mock.calls).toEqual([[{ value: 'b' }]])
})
it('controlled refusal preserves panel and selected state', async () => {
  const cb = vi.fn()
  await render({ value: 'a', onValueChange: cb })
  await key(1, 'ArrowRight')
  expect(document.activeElement).toBe(tabs()[2])
  expect(selected()).toEqual(['a'])
  expect(panels()[1].hidden).toBe(false)
  expect(cb).toHaveBeenCalledWith({ value: 'b' })
})
it('controlled updates are silent and release retains the accepted value', async () => {
  const cb = vi.fn()
  await render({ value: 'a', onValueChange: cb })
  await render({ value: 'b', onValueChange: cb })
  await render({ onValueChange: cb })
  expect(selected()).toEqual(['b'])
  expect(cb).not.toHaveBeenCalled()
})
it('unknown controlled key selects no phantom panel and returns when represented', async () => {
  await render({ value: 'later' })
  expect(selected()).toEqual([])
  expect(tabs()[0].tabIndex).toBe(0)
  await render({
    value: 'later',
    items: [...items, { value: 'later', label: 'Later' }],
  })
  expect(selected()).toEqual(['later'])
})
it('default changes do not replace a user choice', async () => {
  await render({ defaultValue: 'a' })
  await click(2)
  await render({ defaultValue: '' })
  expect(selected()).toEqual(['b'])
})
it('removing uncontrolled selection chooses its nearest enabled successor silently', async () => {
  const cb = vi.fn()
  await render({ defaultValue: 'a', onValueChange: cb })
  await render({
    items: items.filter((i) => i.value !== 'a'),
    onValueChange: cb,
  })
  expect(selected()).toEqual(['b'])
  expect(cb).not.toHaveBeenCalled()
  await render({ onValueChange: cb })
  expect(selected()).toEqual(['b'])
})
it('disabling a selected item keeps its panel and makes an enabled tab the entry stop', async () => {
  await render({ defaultValue: 'a' })
  await render({
    items: items.map((i) => ({ ...i, disabled: i.value === 'a' })),
  })
  expect(selected()).toEqual(['a'])
  expect(panels()[1].hidden).toBe(false)
  expect(tabs()[1].disabled).toBe(true)
  expect(tabs()[0].tabIndex).toBe(0)
})
it('all-disabled and empty groups have no live tab stop', async () => {
  await render({ items: items.map((i) => ({ ...i, disabled: true })) })
  expect(tabs().every((n) => n.tabIndex === -1)).toBe(true)
  await render({ items: [] })
  expect(tabs()).toEqual([])
  expect(panels()).toEqual([])
})
it('root disabled retains selection, disables actions and prevents user callbacks', async () => {
  const cb = vi.fn(),
    action = vi.fn()
  await render({
    defaultValue: 'a',
    disabled: true,
    onValueChange: cb,
    actions: <Button onClick={action}>Close</Button>,
  })
  await click(2)
  expect(selected()).toEqual(['a'])
  expect(cb).not.toHaveBeenCalled()
  const button = host.querySelector<HTMLButtonElement>('fieldset button')!
  await act(async () => button.click())
  expect(action).not.toHaveBeenCalled()
  expect(button.matches(':disabled')).toBe(true)
  expect(host.querySelector('fieldset')?.hasAttribute('inert')).toBe(true)
})
it('ordinary header actions remain outside tablist and retain their own behavior', async () => {
  const cb = vi.fn()
  await render({ actions: <Button onClick={cb}>New</Button> })
  const action = host.querySelector<HTMLButtonElement>('fieldset button')!
  expect(host.querySelector('[role="tablist"]')?.contains(action)).toBe(false)
  await act(async () => action.click())
  expect(cb).toHaveBeenCalledTimes(1)
  expect(selected()).toEqual([''])
})
it('empty fragments do not create action or icon slots and zero remains visible', async () => {
  await render({
    actions: <></>,
    items: [
      {
        value: '0',
        label: 0,
        leadingIcon: false,
        trailingIcon: <></>,
        content: 0,
      },
    ],
  })
  expect(host.querySelector('fieldset')).toBeNull()
  expect(host.querySelector('.uf-tabs-tabIcon')).toBeNull()
  expect(tabs()[0].textContent).toBe('0')
  expect(panels()[0].textContent).toBe('0')
})
it('both icon slots update without replacing the tab or its accessible label', async () => {
  await render({
    items: [
      {
        value: 'a',
        label: 'File',
        leadingIcon: <svg data-icon="file" />,
        trailingIcon: <svg data-icon="status" />,
      },
    ],
  })
  const button = tabs()[0]
  expect(button.querySelectorAll('.uf-tabs-tabIcon')).toHaveLength(2)
  await render({ items: [{ value: 'a', label: 'File', leadingIcon: null }] })
  expect(tabs()[0]).toBe(button)
  expect(button.querySelectorAll('.uf-tabs-tabIcon')).toHaveLength(0)
})
it('native item names/description/title/id route to the tab and panel relationship', async () => {
  await render({
    items: [
      {
        value: 'a',
        label: <svg />,
        id: 'tab-a',
        panelId: 'panel-a',
        'aria-label': 'File',
        'aria-describedby': 'note',
        title: 'File details',
      },
    ],
  })
  expect(tabs()[0].id).toBe('tab-a')
  expect(tabs()[0].getAttribute('aria-label')).toBe('File')
  expect(tabs()[0].title).toBe('File details')
  expect(panels()[0].id).toBe('panel-a')
  expect(panels()[0].getAttribute('aria-labelledby')).toBe('tab-a')
})
it('external panels require explicit references without rendering or owning their DOM', async () => {
  await render({
    renderPanels: false,
    items: [
      { value: 'a', label: 'A', id: 'external-tab', panelId: 'external-panel' },
    ],
  })
  expect(panels()).toEqual([])
  expect(tabs()[0].getAttribute('aria-controls')).toBe('external-panel')
})
it('panel content retains input state when hidden and after item reorder', async () => {
  const rich = items.map((i) => ({
    ...i,
    content: <input defaultValue={i.value} />,
  }))
  await render({ items: rich, defaultValue: 'a' })
  const input = panels()[1].querySelector('input')!
  input.value = 'Draft'
  await click(2)
  await render({ items: [...rich].reverse() })
  await click(1)
  expect(panels()[1].querySelector('input')).toBe(input)
  expect(input.value).toBe('Draft')
})
it('membrane/variant changes preserve tab, panel and focused input identity', async () => {
  const rich = [{ value: 'a', label: 'A', content: <input /> }]
  await render({ items: rich, membrane: true })
  const button = tabs()[0],
    input = panels()[0].querySelector('input')!
  await act(async () => input.focus())
  await render({ items: rich, membrane: false, variant: 'underline' })
  expect(tabs()[0]).toBe(button)
  expect(panels()[0].querySelector('input')).toBe(input)
  expect(document.activeElement).toBe(input)
})
it('hiding a focused panel moves focus to the newly selected tab silently', async () => {
  const cb = vi.fn(),
    rich = items.map((i) => ({ ...i, content: <input /> }))
  await render({ value: 'a', items: rich, onValueChange: cb })
  await act(async () => panels()[1].querySelector('input')!.focus())
  await render({ value: 'b', items: rich, onValueChange: cb })
  expect(document.activeElement).toBe(tabs()[2])
  expect(cb).not.toHaveBeenCalled()
})
it('removing a focused panel recovers focus without a phantom change callback', async () => {
  const cb = vi.fn(),
    rich = items.map((i) => ({ ...i, content: <input /> }))
  await render({ defaultValue: 'a', items: rich, onValueChange: cb })
  await act(async () => panels()[1].querySelector('input')!.focus())
  await render({
    items: rich.filter((i) => i.value !== 'a'),
    onValueChange: cb,
  })
  expect(document.activeElement).toBe(tabs()[1])
  expect(selected()).toEqual(['b'])
  expect(cb).not.toHaveBeenCalled()
})
it('removing a focused tab recovers to the successor in manual mode', async () => {
  await render({ activationMode: 'manual', defaultValue: 'a' })
  await focus(1)
  await render({
    activationMode: 'manual',
    items: items.filter((i) => i.value !== 'a'),
  })
  expect(document.activeElement).toBe(tabs()[1])
  expect(selected()).toEqual(['b'])
})
it('outside focus is not stolen by removing a formerly focused tab', async () => {
  await render({ defaultValue: 'a' })
  await focus(1)
  const outside = document.createElement('button')
  document.body.append(outside)
  try {
    await act(async () => outside.focus())
    await render({ items: items.filter((i) => i.value !== 'a') })
    expect(document.activeElement).toBe(outside)
  } finally {
    outside.remove()
  }
})
it('capture cancellation blocks click and arrow proposals', async () => {
  await act(async () =>
    root.render(
      <div
        onClickCapture={(e) => e.preventDefault()}
        onKeyDownCapture={(e) => e.preventDefault()}
      >
        <Tabs items={items} defaultValue="a" />
      </div>,
    ),
  )
  await click(2)
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['a'])
})
it('root native handlers may cancel selection before the component acts', async () => {
  const onClick = vi.fn((e) => e.preventDefault()),
    onKeyDown = vi.fn((e) => e.preventDefault())
  await render({ defaultValue: 'a', onClick, onKeyDown })
  await click(2)
  await key(1, 'ArrowRight')
  expect(selected()).toEqual(['a'])
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(onKeyDown).toHaveBeenCalledTimes(1)
})
it('pointer focus does not activate before a cancelled click', async () => {
  await render({
    defaultValue: 'a',
    onClickCapture: (e: React.MouseEvent) => e.preventDefault(),
  })
  await act(async () => {
    tabs()[2].dispatchEvent(new Event('pointerdown', { bubbles: true }))
    tabs()[2].focus()
    tabs()[2].click()
  })
  expect(selected()).toEqual(['a'])
})
it('autoFocus is mount-only and does not report a value change', async () => {
  const cb = vi.fn()
  await render({ autoFocus: true, defaultValue: 'a', onValueChange: cb })
  expect(document.activeElement).toBe(tabs()[1])
  await act(async () => tabs()[2].focus())
  await render({ autoFocus: true, onValueChange: cb })
  expect(document.activeElement).toBe(tabs()[2])
  expect(cb.mock.calls).toEqual([[{ value: 'b' }]])
})
it('nested tabs do not activate their parent tabs', async () => {
  const cb = vi.fn()
  await render({
    onValueChange: cb,
    items: [
      {
        value: 'outer',
        label: 'Outer',
        content: <Tabs items={items} defaultValue="a" />,
      },
    ],
  })
  const inner = host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[3]
  await act(async () => inner.click())
  expect(cb).not.toHaveBeenCalled()
  expect(selected()).toEqual(['outer', 'b'])
})
it('IDs are stable, instance-unique and safe for arbitrary string keys', async () => {
  const unusual = ['', 'a b', '"', '\ud800', '😀'].map((value) => ({
    value,
    label: 'Key',
  }))
  await act(async () =>
    root.render(
      <>
        <Tabs items={unusual} />
        <Tabs items={unusual} />
      </>,
    ),
  )
  const ids = tabs().map((n) => n.id)
  expect(new Set(ids).size).toBe(10)
  expect(ids.every((id) => !/\s/.test(id))).toBe(true)
  await act(async () =>
    root.render(
      <>
        <Tabs items={[...unusual].reverse()} />
        <Tabs items={unusual} />
      </>,
    ),
  )
  expect(new Set(tabs().map((n) => n.id))).toEqual(new Set(ids))
})
it('callback refs detach once without replacing a stable root', async () => {
  const calls: Array<HTMLElement | null> = []
  const ref = (node: HTMLDivElement | null) => {
    calls.push(node)
  }
  await render({ ref })
  const first = host.firstElementChild
  await render({ ref, variant: 'underline' })
  expect(host.firstElementChild).toBe(first)
  expect(calls).toEqual([first])
  await act(async () => root.render(null))
  expect(calls).toEqual([first, null])
})
it.skipIf(!version.startsWith('19.'))(
  'React19 consumer ref cleanup replaces a null callback',
  async () => {
    const cleanup = vi.fn(),
      ref = vi.fn(() => cleanup)
    await render({ ref })
    await act(async () => root.render(null))
    expect(ref).toHaveBeenCalledTimes(1)
    expect(cleanup).toHaveBeenCalledTimes(1)
  },
)
for (const [name, props] of [
  ['duplicate keys', { items: [items[1], items[1]] }],
  ['bad value', { value: [] }],
  ['bad item key', { items: [{ value: 1, label: 'Bad' }] }],
  [
    'missing external ID',
    { renderPanels: false, items: [{ value: 'a', label: 'A' }] },
  ],
  [
    'ignored external content',
    {
      renderPanels: false,
      items: [{ value: 'a', label: 'A', panelId: 'p', content: null }],
    },
  ],
  [
    'duplicate internal IDs',
    {
      items: [
        { ...items[1], id: 'same' },
        { ...items[2], panelId: 'same' },
      ],
    },
  ],
] as const)
  it(`rejects ${name} instead of silently coercing`, async () => {
    allowConsoleError(/The above error occurred in the <ForwardRef\(Tabs\)> component/)
    await expect(render(props)).rejects.toThrow(TypeError)
  })

it('hydrates stable tab/panel IDs and persistent panels in StrictMode', async () => {
  await act(async () => root.unmount())
  const tree = (
    <StrictMode>
      <Tabs items={items} defaultValue="a" aria-label="Record sections" />
    </StrictMode>
  )
  host.innerHTML = renderToString(tree)
  const ids = tabs().map((node) => node.id)
  const { recoverableErrors } = await hydrate(tree, host)
  expect(recoverableErrors).toEqual([])
  expect(tabs().map((node) => node.id)).toEqual(ids)
  expect(selected()).toEqual(['a'])
  expect(panels().filter((node) => !node.hidden)).toHaveLength(1)
  tabs().forEach((node, index) =>
    expect(node.getAttribute('aria-controls')).toBe(panels()[index].id),
  )
  await click(2)
  expect(selected()).toEqual(['b'])
})
it('native disabled fieldset prevents selection and autofocus without custom event state', async () => {
  const change = vi.fn()
  await act(async () =>
    root.render(
      <fieldset disabled>
        <Tabs items={items} autoFocus onValueChange={change} />
      </fieldset>,
    ),
  )
  expect(tabs().every((node) => node.matches(':disabled'))).toBe(true)
  expect(tabs()).not.toContain(document.activeElement)
  await click(1)
  await key(0, 'ArrowRight')
  expect(change).not.toHaveBeenCalled()
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Tabs switches content in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Tabs
          defaultValue="b"
          items={[
            { value: 'a', label: 'Tab A', content: 'Content A' },
            { value: 'b', label: 'Tab B', content: 'Content B' },
          ]}
        />,
      )
    })

    const tabA = container.querySelector(
      '[role="tab"][data-value="a"]',
    ) as HTMLButtonElement | null
    const tabB = container.querySelector(
      '[role="tab"][data-value="b"]',
    ) as HTMLButtonElement | null
    const panelA = container.querySelector(
      '[role="tabpanel"][data-value="a"]',
    ) as HTMLElement | null
    const panelB = container.querySelector(
      '[role="tabpanel"][data-value="b"]',
    ) as HTMLElement | null

    expect(tabA).not.toBeNull()
    expect(tabB).not.toBeNull()
    expect(panelA?.hidden).toBe(true)
    expect(panelB?.hidden).toBe(false)

    await act(async () => {
      tabA?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(panelA?.hidden).toBe(false)
    expect(panelB?.hidden).toBe(true)
  })
})
