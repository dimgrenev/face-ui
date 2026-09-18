// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Tile } from '../../Tile/Tile'
import { Button } from '../../Button/Button'
import { Tree } from '../../Tree/Tree'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const render = async (props: React.ComponentProps<typeof Tile>) => {
  await act(async () => {
    root.render(<Tile {...props} />)
  })
}
const tile = () => host.querySelector<HTMLElement>('.uf-tile')!
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('keeps rightText beside both scalar and composed labels and preserves explicit empty children', async () => {
  await render({ text: 'Title', rightText: '⌘K' })
  expect(tile().textContent).toBe('Title⌘K')
  await render({
    text: 'Fallback',
    children: <strong>Custom</strong>,
    rightText: '⌘K',
  })
  expect(tile().textContent).toBe('Custom⌘K')
  await render({ text: 'Fallback', children: 0, rightText: 'items' })
  expect(tile().textContent).toBe('0items')
  await render({ text: 'Fallback', children: false })
  expect(tile().textContent).toBe('')
  expect(tile().querySelector('[data-part="text"]')).toBeNull()
})
it('empty slots preserve the primary control without adding layout boxes', async () => {
  await render({
    text: 'Title',
    onClick: vi.fn(),
    icon: false,
    leading: <>{false}</>,
    meta: [],
    actions: false,
  })
  for (const part of ['icon', 'leading', 'meta', 'actions'])
    expect(tile().querySelector(`[data-part="${part}"]`)).toBeNull()
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('role'),
  ).toBe('button')
})
it('does not turn a structural role into a keyboard button', async () => {
  await render({ text: 'Item', role: 'listitem' })
  expect(tile().getAttribute('role')).toBe('listitem')
  expect(tile().hasAttribute('tabindex')).toBe(false)
  expect(tile().hasAttribute('data-interactive')).toBe(false)
})
it('preserves object refs and native attributes for both compositions', async () => {
  const ref = createRef<HTMLDivElement>()
  for (const actions of [undefined, <Button key="edit" text="Edit" />]) {
    await render({
      text: 'Project',
      onClick: vi.fn(),
      actions,
      ref,
      id: 'project',
      title: 'Details',
      className: 'custom',
      style: { width: 300 },
      'aria-label': 'Open project',
      'aria-controls': 'panel',
      tabIndex: -1,
    })
    expect(ref.current).toBe(tile())
    expect(tile().title).toBe('Details')
    expect(tile().classList.contains('custom')).toBe(true)
    const control = tile().querySelector('[data-part="primary"]') ?? tile()
    expect(control.id).toBe('project')
    expect(control.getAttribute('aria-label')).toBe('Open project')
    expect(control.getAttribute('aria-controls')).toBe('panel')
    expect(control.getAttribute('tabindex')).toBe('-1')
  }
})
it.skipIf(Number.parseInt(React.version, 10) < 19)(
  'calls React 19 callback-ref cleanup on replacement and unmount',
  async () => {
    const cleanup = vi.fn()
    const ref = vi.fn((node: HTMLDivElement | null) =>
      node ? cleanup : undefined,
    )
    await render({ text: 'A', ref })
    await render({ text: 'B', ref: createRef<HTMLDivElement>() })
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(ref).toHaveBeenCalledTimes(1)
  },
)
it('chevron follows aria-expanded and remains independent of icon and label content', async () => {
  for (const children of ['Label', <strong key="label">Label</strong>]) {
    for (const expanded of [false, true, 'false', 'true'] as const) {
      await render({
        children,
        icon: 'folder',
        chevron: 'down',
        'aria-expanded': expanded,
        actions: <Button text="Edit" />,
        onClick: vi.fn(),
      })
      const control = tile().querySelector('[data-part="primary"]')!
      expect(control.getAttribute('aria-expanded')).toBe(String(expanded))
      expect(
        tile()
          .querySelector('[data-part="indicator"] svg')
          ?.getAttribute('data-icon'),
      ).toBe(`select-chevron-${String(expanded) === 'true' ? 'up' : 'down'}`)
    }
  }
  await render({
    chevron: 'right',
    'aria-label': 'Next',
    'aria-expanded': true,
  })
  expect(
    tile()
      .querySelector('[data-part="indicator"] svg')
      ?.getAttribute('data-icon'),
  ).toBe('select-chevron-right')
  await render({ text: 'Label', 'aria-expanded': false })
  expect(tile().querySelector('[data-part="indicator"]')).toBeNull()
})
it('aria-busy is the single visual state source without disabling activation', async () => {
  const onClick = vi.fn()
  for (const busy of [true, 'true', false, 'false'] as const) {
    await render({ text: 'Title', onClick, 'aria-busy': busy })
    expect(tile().hasAttribute('data-busy')).toBe(String(busy) === 'true')
    await act(async () => tile().click())
  }
  expect(onClick).toHaveBeenCalledTimes(4)
})
it('level is a finite whole depth, clamps to 0..9 and preserves other styles', async () => {
  for (const [input, expected] of [
    [-4, '0'],
    [2.8, '2'],
    [99, '9'],
    [NaN, ''],
    [Infinity, ''],
  ] as const) {
    await render({ text: 'Title', level: input, style: { color: 'red' } })
    expect(tile().style.getPropertyValue('--face-runtime-option-level')).toBe(
      expected,
    )
    expect(tile().style.color).toBe('red')
  }
})
it('interactive=false suppresses inferred activation and custom roles stay explicit', async () => {
  const onClick = vi.fn()
  await render({ text: 'Heading', onClick, interactive: false })
  await act(async () => tile().click())
  expect(onClick).not.toHaveBeenCalled()
  expect(tile().hasAttribute('role')).toBe(false)
  await render({ text: 'Tab', role: 'tab', 'aria-selected': true, onClick })
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('role'),
  ).toBe('tab')
  expect(
    tile()
      .querySelector('[data-part="primary"]')
      ?.getAttribute('aria-selected'),
  ).toBe('true')
  await render({ text: 'Current', active: true, onClick })
  expect(tile().getAttribute('aria-selected')).toBeNull()
  expect(tile().getAttribute('aria-current')).toBeNull()
})

it('Tree exposes expansion only on branches for both Tile and Button rows', async () => {
  await act(async () =>
    root.render(
      <Tree
        defaultExpandedIds={['branch']}
        items={[
          {
            id: 'branch',
            label: 'Folder',
            kind: 'tile',
            children: [
              { id: 'tile-leaf', kind: 'tile', label: 'Tile leaf' },
              { id: 'button-leaf', kind: 'button', label: 'Button leaf' },
            ],
          },
        ]}
      />,
    ),
  )
  expect(
    host
      .querySelector('[data-tree-node-id="branch"]')
      ?.getAttribute('aria-expanded'),
  ).toBe('true')
  for (const id of ['tile-leaf', 'button-leaf'])
    expect(
      host
        .querySelector(`[data-tree-node-id="${id}"]`)
        ?.hasAttribute('aria-expanded'),
    ).toBe(false)
})
it('id identifies the actual primary control for keyboard focus and ARIA references', async () => {
  await render({
    text: 'Tab',
    id: 'tab-control',
    role: 'tab',
    children: <strong>Tab</strong>,
  })
  const control = document.getElementById('tab-control')!
  control.focus()
  expect(document.activeElement).toBe(control)
  expect(control.getAttribute('role')).toBe('tab')
})

it('adding and removing actions preserves the focused primary control', async () => {
  await render({ text: 'Title', onClick: vi.fn() })
  const control = tile().querySelector<HTMLButtonElement>(
    '[data-part="primary"]',
  )!
  control.focus()
  for (const actions of [<Button key="edit" text="Edit" />, false]) {
    await render({ text: 'Title', onClick: vi.fn(), actions })
    expect(tile().querySelector('[data-part="primary"]')).toBe(control)
    expect(document.activeElement).toBe(control)
  }
})
it('region ARIA stays on the container while control naming addresses the primary button', async () => {
  await render({
    text: 'Title',
    interactive: true,
    actions: <Button text="Edit" />,
    'aria-hidden': true,
    'aria-live': 'polite',
    'aria-atomic': true,
    'aria-label': 'Open',
  })
  expect(tile().getAttribute('aria-hidden')).toBe('true')
  expect(tile().getAttribute('aria-live')).toBe('polite')
  expect(tile().getAttribute('aria-atomic')).toBe('true')
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('aria-label'),
  ).toBe('Open')
})
