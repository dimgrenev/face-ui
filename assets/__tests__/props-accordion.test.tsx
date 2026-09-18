// @vitest-environment jsdom
import { act, createRef, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Accordion, type AccordionProps } from '../../Accordion/Accordion'
import { Button } from '../../Button/Button'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
const items = ['a', 'b', 'a\u0001b'].map((value) => ({
  value,
  label: value,
  content: value,
}))
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
const render = (props: Record<string, unknown> = {}) =>
  act(async () => {
    root.render(<Accordion items={items} {...(props as AccordionProps)} />)
  })
const triggers = () => [
  ...host.querySelectorAll<HTMLButtonElement>('button[data-scope="accordion"]'),
]
const expanded = () =>
  triggers()
    .filter((node) => node.getAttribute('aria-expanded') === 'true')
    .map((node) => node.dataset.value)
const click = (index: number) => act(async () => triggers()[index].click())

it('renders an empty accordion without invented items or callbacks', async () => {
  const change = vi.fn()
  await render({ items: undefined, onExpandedChange: change })
  expect(triggers()).toEqual([])
  expect(change).not.toHaveBeenCalled()
})

it('controlled empty wins over a nonempty default and rejected clicks stay closed', async () => {
  const change = vi.fn()
  await render({
    expandedIds: [],
    defaultExpandedIds: ['a'],
    onExpandedChange: change,
  })
  expect(expanded()).toEqual([])
  await click(0)
  expect(expanded()).toEqual([])
  expect(change).toHaveBeenCalledExactlyOnceWith({ expandedIds: ['a'] })
})

it('controlled arrays do not collide when string values contain separators', async () => {
  await render({ expandedIds: ['a', 'b'] })
  await render({ expandedIds: ['a\u0001b'] })
  expect(expanded()).toEqual(['a\u0001b'])
})

it('multiple=false actually permits only one expanded section', async () => {
  await render({ defaultExpandedIds: ['a', 'b'], multiple: false })
  expect(expanded()).toHaveLength(1)
})

it('removing an expanded item cannot let the final remaining panel collapse', async () => {
  await render({ defaultExpandedIds: ['a', 'b'], collapsible: false })
  await render({ items: [items[1]], collapsible: false })
  await click(0)
  expect(expanded()).toEqual(['b'])
})

it('non-collapsible last open trigger exposes its disabled action but remains focusable', async () => {
  await render({ defaultExpandedIds: ['a'], collapsible: false })
  expect(triggers()[0].getAttribute('aria-disabled')).toBe('true')
  expect(triggers()[0].disabled).toBe(false)
})

it('false icon overrides the root icon without leaving an empty icon slot', async () => {
  await render({ icon: 'folder', items: [{ ...items[0], icon: false }] })
  expect(host.querySelector('.uf-accordion-icon')).toBeNull()
  expect(triggers()[0].hasAttribute('data-icon-start')).toBe(false)
})

it('native identity, direction, style and hidden belong to the root ref', async () => {
  const ref = createRef<HTMLDivElement>()
  await render({
    ref,
    id: 'settings',
    dir: 'rtl',
    style: { width: 280 },
    hidden: true,
  })
  expect(ref.current?.id).toBe('settings')
  expect(ref.current?.dir).toBe('rtl')
  expect(ref.current?.style.width).toBe('280px')
  expect(ref.current?.hidden).toBe(true)
})

it('capture cancellation prevents expansion', async () => {
  const change = vi.fn(),
    capture = vi.fn((event: Event) => event.preventDefault())
  await render({ onClickCapture: capture, onExpandedChange: change })
  await click(0)
  expect(capture).toHaveBeenCalledOnce()
  expect(expanded()).toEqual([])
  expect(change).not.toHaveBeenCalled()
})

it('keyed content preserves input state after content reordering', async () => {
  const a = <input key="a" aria-label="A" defaultValue="a" />
  const b = <input key="b" aria-label="B" defaultValue="b" />
  await render({
    items: [{ ...items[0], content: [a, b] }],
    defaultExpandedIds: ['a'],
  })
  const node = host.querySelector<HTMLInputElement>('[aria-label="A"]')!
  node.value = 'edited'
  await render({ items: [{ ...items[0], content: [b, a] }] })
  expect(host.querySelector('[aria-label="A"]')).toBe(node)
  expect(node.isConnected).toBe(true)
  expect(node.value).toBe('edited')
})

it('whitespace in a valid item string does not create invalid ARIA ID tokens', async () => {
  await render({ items: [{ ...items[0], value: 'settings panel' }] })
  expect(triggers()[0].id).not.toMatch(/\s/)
  expect(triggers()[0].getAttribute('aria-controls')).not.toMatch(/\s/)
})

it('default changes do not overwrite uncontrolled expansion or emit callbacks', async () => {
  const change = vi.fn()
  await render({ defaultExpandedIds: ['a'], onExpandedChange: change })
  await render({ defaultExpandedIds: ['b'], onExpandedChange: change })
  expect(expanded()).toEqual(['a'])
  expect(change).not.toHaveBeenCalled()
})

it('deduplicates visible expansion and ignores absent items when deciding whether collapse is allowed', async () => {
  const change = vi.fn()
  await render({
    defaultExpandedIds: ['missing', 'a', 'a'],
    collapsible: false,
    onExpandedChange: change,
  })
  await click(0)
  expect(expanded()).toEqual(['a'])
  expect(change).not.toHaveBeenCalled()
  await click(1)
  expect(expanded()).toEqual(['a', 'b'])
  expect(change).toHaveBeenCalledExactlyOnceWith({ expandedIds: ['a', 'b'] })
})

it('async items, reorder, and mode changes project the same stored intent quietly', async () => {
  const change = vi.fn(),
    ids = Object.freeze(['b', 'a'])
  await render({ items: [], defaultExpandedIds: ids, onExpandedChange: change })
  await render({ items, multiple: false, onExpandedChange: change })
  expect(expanded()).toEqual(['b'])
  await render({
    items: [...items].reverse(),
    multiple: true,
    onExpandedChange: change,
  })
  expect(expanded()).toEqual(['b', 'a'])
  expect(change).not.toHaveBeenCalled()
})

it('controlled ownership may be acquired and released without reviving the default', async () => {
  const change = vi.fn()
  await render({ defaultExpandedIds: ['a'], onExpandedChange: change })
  await render({ expandedIds: ['b'], onExpandedChange: change })
  expect(expanded()).toEqual(['b'])
  await render({ onExpandedChange: change })
  await click(0)
  expect(expanded()).toEqual(['a', 'b'])
  expect(change).toHaveBeenCalledExactlyOnceWith({ expandedIds: ['b', 'a'] })
})

it('the latest callback can accept controlled proposals and cannot mutate stored state', async () => {
  const old = vi.fn(),
    current = vi.fn((details: { expandedIds: string[] }) =>
      details.expandedIds.push('b'),
    )
  await render({ onExpandedChange: old })
  await render({ onExpandedChange: current })
  await click(0)
  expect(old).not.toHaveBeenCalled()
  expect(current).toHaveBeenCalledOnce()
  expect(expanded()).toEqual(['a'])
})

it('explicitly disabled triggers cannot change even when already expanded', async () => {
  const change = vi.fn()
  await render({
    items: [{ ...items[0], disabled: true }, items[1]],
    defaultExpandedIds: ['a'],
    onExpandedChange: change,
  })
  await click(0)
  expect(triggers()[0].disabled).toBe(true)
  expect(expanded()).toEqual(['a'])
  await render({ disabled: true, onExpandedChange: change })
  expect(triggers().every((node) => node.disabled)).toBe(true)
  await click(1)
  expect(change).not.toHaveBeenCalled()
})

it('collapsible=false permits an explicitly empty value and external updates', async () => {
  const change = vi.fn()
  await render({
    expandedIds: [],
    collapsible: false,
    onExpandedChange: change,
  })
  expect(expanded()).toEqual([])
  await render({
    expandedIds: ['b'],
    collapsible: false,
    onExpandedChange: change,
  })
  expect(triggers()[1].getAttribute('aria-disabled')).toBe('true')
  await render({
    expandedIds: ['b'],
    collapsible: true,
    onExpandedChange: change,
  })
  expect(triggers()[1].hasAttribute('aria-disabled')).toBe(false)
  expect(change).not.toHaveBeenCalled()
})

it.each(
  [null, false, '', <Fragment />, <Fragment>{false}</Fragment>].map(
    (icon, index) => ({ icon, index }),
  ),
)(
  'empty icon content removes the shared icon slot ($index)',
  async ({ icon }) => {
    await render({ icon: 'folder', items: [{ ...items[0], icon }] })
    expect(host.querySelector('.uf-accordion-icon')).toBeNull()
    await render({ icon: 'folder', items: [{ ...items[0], icon: undefined }] })
    expect(
      host.querySelector('.uf-accordion-icon svg[data-icon="folder"]'),
    ).not.toBeNull()
  },
)

it('heading levels and optional regions update without remounting triggers or contents', async () => {
  await render({
    defaultExpandedIds: ['a'],
    items: [{ ...items[0], region: true }],
  })
  const trigger = triggers()[0],
    heading = trigger.parentElement!,
    content = host.querySelector<HTMLElement>('[data-part="content"]')!
  expect(heading.getAttribute('role')).toBe('heading')
  expect(heading.getAttribute('aria-level')).toBe('3')
  expect(heading.children).toHaveLength(1)
  expect(content.getAttribute('role')).toBe('region')
  expect(content.getAttribute('aria-labelledby')).toBe(trigger.id)
  await render({ headingLevel: 2, items: [{ ...items[0], region: false }] })
  expect(triggers()[0]).toBe(trigger)
  expect(trigger.parentElement).toBe(heading)
  expect(heading.getAttribute('aria-level')).toBe('2')
  expect(content.isConnected).toBe(true)
  expect(content.hasAttribute('role')).toBe(false)
  expect(content.hasAttribute('aria-labelledby')).toBe(false)
})

it('collapse, icon changes and item reorder retain mounted panel input state', async () => {
  const a = { ...items[0], content: <input defaultValue="initial" /> }
  await render({ defaultExpandedIds: ['a'], items: [a, items[1]] })
  const input = host.querySelector('input')!
  input.value = 'edited'
  await click(0)
  expect(input.isConnected).toBe(true)
  await render({ icon: 'folder', items: [items[1], a] })
  await click(1)
  expect(host.querySelector('input')).toBe(input)
  expect(input.value).toBe('edited')
})

it('empty, escaped, Unicode and malformed UTF-16 identities remain distinct without whitespace IDREFs', async () => {
  const values = ['', ' ', '_20_', 'a:b', 'a_b', 'секция', '\ud800']
  await render({
    items: values.map((value) => ({ value, label: 'Section', content: value })),
  })
  const ids = triggers().map((node) => node.id)
  expect(new Set(ids).size).toBe(values.length)
  for (const trigger of triggers()) {
    expect(trigger.id).not.toMatch(/\s/)
    expect(
      document.getElementById(trigger.getAttribute('aria-controls')!)?.dataset
        .scope,
    ).toBe('accordion')
  }
  await click(0)
  expect(expanded()).toEqual([''])
})

it('native root attributes and event currentTarget share the forwarded ref', async () => {
  const ref = createRef<HTMLDivElement>(),
    focus = vi.fn(),
    key = vi.fn()
  await render({
    ref,
    className: 'custom',
    lang: 'ru',
    title: 'Settings',
    role: 'group',
    'aria-label': 'Sections',
    'aria-describedby': 'hint',
    'data-owner': 'test',
    onFocus: (event: { currentTarget: HTMLElement }) =>
      focus(event.currentTarget),
    onKeyDown: key,
  })
  expect(ref.current?.classList.contains('custom')).toBe(true)
  expect(ref.current?.lang).toBe('ru')
  expect(ref.current?.title).toBe('Settings')
  expect(ref.current?.getAttribute('aria-describedby')).toBe('hint')
  expect(ref.current?.dataset.owner).toBe('test')
  await act(async () => triggers()[0].focus())
  expect(focus).toHaveBeenCalledWith(ref.current)
  await act(async () =>
    triggers()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
  expect(document.activeElement).toBe(triggers()[1])
  expect(key).toHaveBeenCalledOnce()
})

it('capture can cancel arrows while native modifier shortcuts remain untouched', async () => {
  const capture = (event: Event) => event.preventDefault()
  await render({ onKeyDownCapture: capture })
  await act(async () => triggers()[0].focus())
  await act(async () =>
    triggers()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
  expect(document.activeElement).toBe(triggers()[0])
  await render()
  const modified = new KeyboardEvent('keydown', {
    key: 'ArrowDown',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  })
  await act(async () => triggers()[0].dispatchEvent(modified))
  expect(modified.defaultPrevented).toBe(false)
  expect(document.activeElement).toBe(triggers()[0])
})

it.each([
  { items: {} },
  { items: [null] },
  { items: [{ ...items[0], value: 1 }] },
  { items: [items[0], items[0]] },
  { items: [{ ...items[0], label: '' }] },
  { expandedIds: null },
  { expandedIds: ['a', 1] },
  { defaultExpandedIds: 'a' },
  { headingLevel: 0 },
  { headingLevel: 7 },
  { headingLevel: 2.5 },
  { items: [{ ...items[0], label: '   ' }] },
  { expandedIds: new Array(2) },
])('rejects malformed API data with a component-owned error (%j)', (props) => {
  expect(() =>
    renderToStaticMarkup(
      <Accordion {...(props as unknown as AccordionProps)} />,
    ),
  ).toThrow(/Accordion/)
})

it('SSR observes controlled empty, single expansion and heading/region semantics', () => {
  const html = renderToStaticMarkup(
    <Accordion
      items={items}
      expandedIds={['b', 'a']}
      multiple={false}
      headingLevel={4}
    />,
  )
  expect(html.match(/aria-expanded="true"/g)).toHaveLength(1)
  expect(html).toContain('aria-level="4"')
  expect(html).not.toContain('role="region"')
  expect(
    renderToStaticMarkup(
      <Accordion items={items} expandedIds={[]} defaultExpandedIds={['a']} />,
    ),
  ).not.toContain('aria-expanded="true"')
})

it('a keyed root Fragment can intentionally reset panel state', async () => {
  await render({
    items: [
      {
        ...items[0],
        content: (
          <Fragment key="old">
            <input defaultValue="before" />
          </Fragment>
        ),
      },
    ],
  })
  const input = host.querySelector('input')!
  input.value = 'edited'
  await render({
    items: [
      {
        ...items[0],
        content: (
          <Fragment key="new">
            <input defaultValue="after" />
          </Fragment>
        ),
      },
    ],
  })
  expect(host.querySelector('input')).not.toBe(input)
  expect(host.querySelector('input')?.value).toBe('after')
})

it('removing or disabling the focused trigger recovers focus to the next enabled section without opening it', async () => {
  const change = vi.fn()
  await render({ onExpandedChange: change })
  await act(async () => triggers()[1].focus())
  await render({ items: [items[0], items[2]], onExpandedChange: change })
  expect(document.activeElement).toBe(triggers()[1])
  await render({
    items: [items[0], { ...items[2], disabled: true }],
    onExpandedChange: change,
  })
  expect(document.activeElement).toBe(triggers()[0])
  expect(expanded()).toEqual([])
  expect(change).not.toHaveBeenCalled()
  await act(async () => triggers()[0].blur())
  await render({ items: [items[1]], onExpandedChange: change })
  expect(document.activeElement).not.toBe(triggers()[0])
})

it.each(['empty', 'disabled'])(
  'clears obsolete focus ownership after the list becomes $0',
  async (mode) => {
    const outside = document.createElement('button')
    document.body.append(outside)
    try {
      await render()
      await act(async () => triggers()[0].focus())
      await render(mode === 'empty' ? { items: [] } : { disabled: true })
      outside.focus()
      await render()
      expect(document.activeElement).toBe(outside)
    } finally {
      outside.remove()
    }
  },
)

it.each(['root', 'item'])(
  'disabled %s disclosure preserves the membrane of independent panel actions',
  async (level) => {
    const action = vi.fn()
    await render({
      disabled: level === 'root',
      defaultExpandedIds: ['a'],
      items: [
        {
          ...items[0],
          disabled: level === 'item',
          content: <Button onClick={action}>Panel action</Button>,
        },
      ],
    })
    const button = host.querySelector<HTMLButtonElement>('.uf-button')!
    expect(button.disabled).toBe(false)
    await act(async () =>
      button.parentElement!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
      ),
    )
    expect(action).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(button)
    expect(triggers()[0].disabled).toBe(true)
    expect(expanded()).toEqual(['a'])
  },
)
