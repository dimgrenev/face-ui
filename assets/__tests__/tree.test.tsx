import { act, createRef, StrictMode, type ReactElement } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Tree,
  type TreeItem,
  type TreeProps,
  type TreeRenderNodeDetails,
} from '../../Tree/Tree'
import { expectDevError, libraryCss, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { describeRoving } from './harness/roving'

const row = (host: HTMLElement, value: string) =>
  host.querySelector<HTMLButtonElement>(
    `[role="treeitem"][data-value="${value}"]`,
  )!
const rows = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')].map(
    (node) => node.dataset.value,
  )
const selectedOf = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]')
    ?.dataset.value ?? null
const expandedOf = (host: HTMLElement) =>
  [
    ...host.querySelectorAll<HTMLElement>(
      '[role="treeitem"][aria-expanded="true"]',
    ),
  ].map((node) => node.dataset.value!)
const arrow = (host: HTMLElement, value: string) =>
  row(host, value).querySelector<HTMLElement>('[data-part="indicator"]')!

const leaves: TreeItem[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
]
const branches: TreeItem[] = [
  { value: 'a', label: 'Alpha', items: [{ value: 'a1', label: 'Alpha one' }] },
  { value: 'b', label: 'Bravo', items: [{ value: 'b1', label: 'Bravo one' }] },
]

describeControlled<string | null>({
  name: 'Tree',
  prop: 'value',
  values: ['a', 'b'],
  render: (props) => <Tree items={leaves} {...props} />,
  change: (host, to) => row(host, to!).click(),
  read: selectedOf,
  normalizes: ['missing', null],
  handler: 'onClick',
})

describeControlled<string[]>({
  name: 'Tree',
  prop: 'expanded',
  values: [['a'], ['a', 'b']],
  // The arrow toggles without selecting, so only `expanded` changes.
  render: (props) => <Tree items={branches} {...props} />,
  change: (host) => arrow(host, 'b').click(),
  read: expandedOf,
  normalizes: [['missing', 'a'], ['a']],
  handler: 'onClick',
})

describeRoving({
  name: 'Tree',
  orientation: 'vertical',
  loop: false,
  selects: true,
  typeahead: true,
  render: ({ items, defaultValue }) => (
    <Tree items={items} defaultValue={defaultValue} />
  ),
  items: (host) => [
    ...host.querySelectorAll<HTMLElement>('[role="treeitem"]'),
  ],
})

// src ─┬─ components ─┬─ button
//      │              └─ tile
//      └─ index
// readme
const files: TreeItem[] = [
  {
    value: 'src',
    label: 'src',
    icon: 'folder',
    items: [
      {
        value: 'components',
        label: 'components',
        items: [
          { value: 'button', label: 'Button.tsx' },
          { value: 'tile', label: 'Tile.tsx' },
        ],
      },
      { value: 'index', label: 'index.ts', meta: '3' },
    ],
  },
  { value: 'readme', label: 'README.md' },
]

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: TreeProps = {}) =>
  act(async () => {
    root.render(
      <StrictMode>
        <Tree items={files} {...props} />
      </StrictMode>,
    )
  })
const show = (ui: ReactElement) =>
  act(async () => root.render(<StrictMode>{ui}</StrictMode>))
const click = (node: HTMLElement) => act(async () => node.click())
const focused = () =>
  (document.activeElement as HTMLElement | null)?.dataset.value ?? null
/** Dispatches a keydown on the focused element; true when it was prevented. */
const press = async (key: string, init: KeyboardEventInit = {}) => {
  let prevented = false
  await act(async () => {
    prevented = !document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    )
  })
  return prevented
}
const focus = (value: string) => act(async () => row(host, value).focus())

describe('items', () => {
  it('nest through items: levels, positions and a group per expanded branch', async () => {
    await render({ defaultExpanded: ['src'] })
    expect(rows(host)).toEqual(['src', 'components', 'index', 'readme'])
    const src = row(host, 'src')
    expect(src.getAttribute('aria-level')).toBe('1')
    expect(src.getAttribute('aria-posinset')).toBe('1')
    expect(src.getAttribute('aria-setsize')).toBe('2')
    const index = row(host, 'index')
    expect(index.getAttribute('aria-level')).toBe('2')
    expect(index.getAttribute('aria-posinset')).toBe('2')
    expect(index.getAttribute('aria-setsize')).toBe('2')
    const group = host.querySelector('[role="group"]')!
    expect(group.previousElementSibling?.contains(src)).toBe(true)
    expect(group.querySelectorAll('[role="treeitem"]')).toHaveLength(2)
    // Collapsed nested items are not in the document at all.
    expect(row(host, 'button')).toBeNull()
  })

  it('only branches expose aria-expanded and an arrow; an empty items list makes a leaf', async () => {
    await render({
      items: [...files, { value: 'empty', label: 'Empty', items: [] }],
      defaultExpanded: ['src', 'readme', 'empty'],
    })
    expect(row(host, 'src').getAttribute('aria-expanded')).toBe('true')
    expect(row(host, 'components').getAttribute('aria-expanded')).toBe('false')
    for (const leaf of ['index', 'readme', 'empty']) {
      expect(row(host, leaf).hasAttribute('aria-expanded')).toBe(false)
      expect(row(host, leaf).querySelector('[data-part="indicator"]')).toBeNull()
    }
    expect(expandedOf(host)).toEqual(['src'])
  })

  it('value keys the item across the whole tree: a repeat anywhere is dropped and reported', async () => {
    await expectDevError(
      () =>
        render({
          items: [...files, { value: 'button', label: 'Duplicate' }],
          defaultExpanded: ['src', 'components'],
        }),
      /^Face UI Tree: invalid items\[2\] key "button"; dropping the duplicate\.$/,
    )
    expect(rows(host)).toEqual(['src', 'components', 'button', 'tile', 'index', 'readme'])
    expect(row(host, 'button').textContent).toBe('Button.tsx')
  })

  it('malformed items render what survives and report the rest', async () => {
    await expectDevError(
      () => render({ items: 'nope' as never }),
      /^Face UI Tree: invalid items "nope"; using \[\]\.$/,
    )
    expect(rows(host)).toEqual([])
    await expectDevError(
      () =>
        expectDevError(
          () =>
            render({
              items: [{ value: 'x', label: 'X', items: 'nope' as never }, null as never],
            }),
          /^Face UI Tree: invalid items\[1\] null; dropping the item\.$/,
        ),
      /^Face UI Tree: invalid items\[0\]\.items "nope"; using \[\]\.$/,
    )
    expect(rows(host)).toEqual(['x'])
    expect(row(host, 'x').hasAttribute('aria-expanded')).toBe(false)
  })

  it('label is the row content and its name; icon and meta sit around it', async () => {
    await render({
      items: [
        { value: 'rich', label: <strong>Rich</strong>, icon: <svg data-testid="own" />, meta: '12' },
        { value: 'named', label: 'Named', icon: 'folder' },
      ],
    })
    const rich = row(host, 'rich')
    expect(rich.querySelector('[data-part="label"] strong')?.textContent).toBe('Rich')
    expect(rich.querySelector('[data-part="icon"] [data-testid="own"]')).not.toBeNull()
    expect(rich.querySelector('[data-part="icon"]')?.getAttribute('aria-hidden')).toBe('true')
    const meta = rich.querySelector('[data-part="meta"]')!
    expect(meta.textContent).toBe('12')
    expect(meta.previousElementSibling?.getAttribute('data-part')).toBe('label')
    expect(rich.textContent).toBe('Rich12')
    // A string icon names a registry icon.
    expect(
      row(host, 'named').querySelector('[data-part="icon"] svg')?.getAttribute('data-icon'),
    ).toBe('folder')
    expect(row(host, 'named').querySelector('[data-part="meta"]')).toBeNull()
  })

  it('textValue gives an element label its typeahead text', async () => {
    await render({
      items: [
        { value: 'a', label: 'Alpha' },
        { value: 'z', label: <em>Zulu</em>, textValue: 'Zulu' },
        { value: 'y', label: <em>Yankee</em> },
      ],
    })
    await focus('a')
    await press('z')
    expect(focused()).toBe('z')
    // Without textValue an element label is not searchable (a fresh tree, so no query is pending).
    ;({ host, root } = mount())
    await render({
      items: [
        { value: 'a', label: 'Alpha' },
        { value: 'y', label: <em>Yankee</em> },
      ],
    })
    await focus('a')
    await press('y')
    expect(focused()).toBe('a')
  })

  it('disabled keeps the item and everything nested in it out of selection, expansion and focus', async () => {
    const onValueChange = vi.fn()
    const onExpandedChange = vi.fn()
    await render({
      items: [
        { value: 'first', label: 'First' },
        {
          value: 'locked',
          label: 'Locked',
          disabled: true,
          items: [{ value: 'inner', label: 'Inner' }],
        },
        { value: 'last', label: 'Last', items: [{ value: 'deep', label: 'Deep' }] },
      ],
      defaultExpanded: ['locked'],
      onValueChange,
      onExpandedChange,
    })
    for (const value of ['locked', 'inner']) {
      expect(row(host, value).disabled).toBe(true)
      await click(row(host, value))
    }
    await click(arrow(host, 'locked'))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(onExpandedChange).not.toHaveBeenCalled()
    expect(expandedOf(host)).toEqual(['locked'])
    // Arrows and '*' pass over the disabled branch.
    await focus('first')
    await press('ArrowDown')
    expect(focused()).toBe('last')
    await press('*')
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith({ expanded: ['locked', 'last'] })
    await press('ArrowUp')
    expect(focused()).toBe('first')
  })
})

describe('value', () => {
  it('a click selects the row; null or a value without an item selects nothing', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'readme', onValueChange })
    expect(selectedOf(host)).toBe('readme')
    await click(row(host, 'readme'))
    expect(onValueChange).not.toHaveBeenCalled()
    await click(row(host, 'src'))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'src' })
    await render({ value: null, onValueChange })
    expect(selectedOf(host)).toBeNull()
    await render({ value: 'gone', onValueChange })
    expect(selectedOf(host)).toBeNull()
    const states = [...host.querySelectorAll('[role="treeitem"]')].map((node) =>
      node.getAttribute('aria-selected'),
    )
    expect(new Set(states)).toEqual(new Set(['false']))
  })

  it('does not expand anything to show the selection; Tab enters at the collapsed item that holds it', async () => {
    await render({ defaultValue: 'button' })
    expect(rows(host)).toEqual(['src', 'readme'])
    const stops = () =>
      [...host.querySelectorAll<HTMLElement>('[tabindex="0"]')].map((node) => node.dataset.value)
    expect(stops()).toEqual(['src'])
    // Once src opens and focus has left, the stop is the next collapsed item on the way.
    await click(arrow(host, 'src'))
    await act(async () => (document.activeElement as HTMLElement).blur())
    expect(stops()).toEqual(['components'])
    expect(selectedOf(host)).toBeNull()
  })
})

describe('expanded', () => {
  it('a click on a branch selects it and toggles it; a click on its arrow only toggles', async () => {
    const onValueChange = vi.fn()
    const onExpandedChange = vi.fn()
    await render({ onValueChange, onExpandedChange })
    await click(row(host, 'src'))
    expect(selectedOf(host)).toBe('src')
    expect(expandedOf(host)).toEqual(['src'])
    await click(arrow(host, 'components'))
    expect(selectedOf(host)).toBe('src')
    expect(expandedOf(host)).toEqual(['src', 'components'])
    await click(row(host, 'src'))
    expect(expandedOf(host)).toEqual([])
    expect(onValueChange.mock.calls).toEqual([[{ value: 'src' }]])
    expect(onExpandedChange.mock.calls).toEqual([
      [{ expanded: ['src'] }],
      [{ expanded: ['src', 'components'] }],
      [{ expanded: ['components'] }],
    ])
    // The collapsed ancestor keeps its descendants' expansion for the next time it opens.
    await click(arrow(host, 'src'))
    expect(expandedOf(host)).toEqual(['src', 'components'])
  })

  it('keeps values whose items arrive later and shows them once they are branches', async () => {
    const onExpandedChange = vi.fn()
    await render({ items: [], defaultExpanded: ['src', 'readme'], onExpandedChange })
    await render({ defaultExpanded: [], onExpandedChange })
    expect(expandedOf(host)).toEqual(['src'])
    expect(row(host, 'readme').hasAttribute('aria-expanded')).toBe(false)
    expect(onExpandedChange).not.toHaveBeenCalled()
  })

  it('reports a malformed array and keeps its string values', async () => {
    await expectDevError(
      () => render({ expanded: ['src', 3 as never] }),
      /^Face UI Tree: invalid expanded\[1\] 3; dropping it\.$/,
    )
    expect(expandedOf(host)).toEqual(['src'])
    await expectDevError(
      () => render({ expanded: 'src' as never }),
      /^Face UI Tree: invalid expanded "src"; using \[\]\.$/,
    )
    expect(expandedOf(host)).toEqual([])
  })
})

describe('keyboard (APG tree)', () => {
  it('Right expands a closed branch, then moves to its first child; on a leaf it does nothing', async () => {
    const onExpandedChange = vi.fn()
    await render({ onExpandedChange })
    await focus('src')
    expect(await press('ArrowRight')).toBe(true)
    expect(expandedOf(host)).toEqual(['src'])
    expect(focused()).toBe('src')
    expect(await press('ArrowRight')).toBe(true)
    expect(focused()).toBe('components')
    await press('ArrowDown')
    expect(focused()).toBe('index')
    // A leaf is never expanded: nothing is proposed and the page keeps the key.
    expect(await press('ArrowRight')).toBe(false)
    expect(onExpandedChange.mock.calls).toEqual([[{ expanded: ['src'] }]])
  })

  it('Left collapses an open branch, then moves to the parent; at the top it does nothing', async () => {
    await render({ defaultExpanded: ['src', 'components'] })
    await focus('tile')
    expect(await press('ArrowLeft')).toBe(true)
    expect(focused()).toBe('components')
    await press('ArrowLeft')
    expect(expandedOf(host)).toEqual(['src'])
    expect(focused()).toBe('components')
    await press('ArrowLeft')
    expect(focused()).toBe('src')
    await press('ArrowLeft')
    expect(expandedOf(host)).toEqual([])
    expect(await press('ArrowLeft')).toBe(false)
    expect(focused()).toBe('src')
  })

  it('Right and Left swap in right-to-left text', async () => {
    await show(
      <div dir="rtl">
        <Tree items={files} />
      </div>,
    )
    await focus('src')
    await press('ArrowLeft')
    expect(expandedOf(host)).toEqual(['src'])
    await press('ArrowLeft')
    expect(focused()).toBe('components')
    await press('ArrowRight')
    expect(focused()).toBe('src')
    await press('ArrowRight')
    expect(expandedOf(host)).toEqual([])
  })

  it('Up, Down, Home and End walk the visible items only, without wrapping', async () => {
    await render({ defaultExpanded: ['src'] })
    await focus('src')
    await press('End')
    expect(focused()).toBe('readme')
    await press('ArrowDown')
    expect(focused()).toBe('readme')
    await press('ArrowUp')
    expect(focused()).toBe('index')
    await press('Home')
    expect(focused()).toBe('src')
  })

  it('* expands every sibling branch of the focused item in one change; focus stays', async () => {
    const onExpandedChange = vi.fn()
    const items: TreeItem[] = [
      { value: 'x', label: 'X', items: [{ value: 'x1', label: 'X1' }] },
      { value: 'leaf', label: 'Leaf' },
      { value: 'y', label: 'Y', items: [{ value: 'y1', label: 'Y1', items: [{ value: 'y2', label: 'Y2' }] }] },
    ]
    await render({ items, defaultExpanded: ['x'], onExpandedChange })
    await focus('leaf')
    expect(await press('*', { shiftKey: true })).toBe(true)
    expect(focused()).toBe('leaf')
    expect(expandedOf(host)).toEqual(['x', 'y'])
    // Only the focused level: y1 stays closed.
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith({ expanded: ['x', 'y'] })
    await press('*')
    expect(onExpandedChange).toHaveBeenCalledTimes(1)
  })

  it('typeahead searches the visible items only', async () => {
    await render()
    await focus('src')
    // Button.tsx is inside the collapsed src.
    await press('b')
    expect(focused()).toBe('src')
    ;({ host, root } = mount())
    await render({ defaultExpanded: ['src', 'components'] })
    await focus('src')
    await press('b')
    expect(focused()).toBe('button')
  })

  it('the consumer onKeyDown runs first; preventDefault() keeps the tree from acting', async () => {
    const order: string[] = []
    await render({
      onKeyDown: (event) => {
        order.push(event.key)
        if (event.key === 'ArrowRight') event.preventDefault()
      },
    })
    await focus('src')
    await press('ArrowRight')
    expect(expandedOf(host)).toEqual([])
    await press('ArrowDown')
    expect(focused()).toBe('readme')
    expect(order).toEqual(['ArrowRight', 'ArrowDown'])
  })
})

describe('renderNode', () => {
  it('replaces the icon, label and meta after the arrow and follows expanded and selected', async () => {
    const calls: Array<[string, boolean, boolean]> = []
    const renderNode = ({ item, expanded, selected }: TreeRenderNodeDetails) => {
      calls.push([item.value, expanded, selected])
      return (
        <span data-testid="custom">
          {expanded ? 'open ' : ''}
          {selected ? 'current ' : ''}
          {item.value}
        </span>
      )
    }
    await render({ renderNode, defaultValue: 'readme' })
    const src = row(host, 'src')
    expect(src.firstElementChild?.getAttribute('data-part')).toBe('indicator')
    expect(src.querySelector('[data-part="label"], [data-part="icon"]')).toBeNull()
    expect(src.textContent).toBe('src')
    expect(row(host, 'readme').textContent).toBe('current readme')
    expect(calls).toContainEqual(['readme', false, true])
    await click(arrow(host, 'src'))
    expect(row(host, 'src').textContent).toBe('open src')
    expect(row(host, 'index').querySelector('[data-part="meta"]')).toBeNull()
  })
})

describe('root', () => {
  it('names the tree "Tree" until aria-label or aria-labelledby names it; a blank label keeps the default', async () => {
    await render()
    const tree = host.querySelector('[role="tree"]')!
    expect(tree.getAttribute('aria-label')).toBe('Tree')
    await render({ 'aria-label': 'Repository files' })
    expect(tree.getAttribute('aria-label')).toBe('Repository files')
    await render({ 'aria-label': '  ' })
    expect(tree.getAttribute('aria-label')).toBe('Tree')
    await render({ 'aria-labelledby': 'heading' })
    expect(tree.getAttribute('aria-labelledby')).toBe('heading')
  })

  it('native attributes and ref belong to the tree element; it keeps its role', async () => {
    const ref = createRef<HTMLDivElement>()
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    await render({
      ref,
      id: 'files',
      className: 'mine',
      style: { width: 240 },
      dir: 'rtl',
      title: 'Files',
      'data-testid': 'tree',
      role: 'list',
      onFocus,
      onBlur,
    } as TreeProps)
    const tree = ref.current!
    expect(tree.getAttribute('role')).toBe('tree')
    expect(tree.id).toBe('files')
    expect(tree.className).toBe('uf-tree mine')
    expect(tree.style.width).toBe('240px')
    expect(tree.dir).toBe('rtl')
    expect(tree.title).toBe('Files')
    expect(tree.dataset.testid).toBe('tree')
    await focus('src')
    expect(onFocus).toHaveBeenCalledTimes(1)
    // The roving handlers still run after the consumer's: the tab stop follows focus.
    await focus('readme')
    expect(row(host, 'readme').tabIndex).toBe(0)
    await act(async () => row(host, 'readme').blur())
    expect(onBlur).toHaveBeenCalledTimes(2)
  })

  it('variant lines marks the root for the guide rule; default draws none', async () => {
    await render({ defaultExpanded: ['src'] })
    const tree = host.querySelector<HTMLElement>('[role="tree"]')!
    expect(tree.dataset.variant).toBe('default')
    await render({ variant: 'lines', defaultExpanded: ['src'] })
    expect(tree.dataset.variant).toBe('lines')
    expect(libraryCss()).toContain('.uf-tree[data-variant="lines"] .uf-tree-group::before')
  })
})
