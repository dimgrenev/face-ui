import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { CollectionItem, ItemGroup, ItemSeparator } from '../internal/item'
import {
  domId,
  move,
  nearest,
  readCollection,
  readKeys,
  typeahead,
  visibleKeys,
  type CollectionSpec,
  type Typeahead,
} from '../runtime/collection'

let errors: MockInstance<typeof console.error>
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errors.mockRestore())
const reports = () => errors.mock.calls.map(([message]) => message)

interface Node extends CollectionItem {
  items?: readonly Node[]
}
const tabs: CollectionSpec<CollectionItem> = {
  component: 'Tabs',
  key: (item) => item.value,
}
const tree: CollectionSpec<Node> = {
  component: 'Tree',
  key: (item) => item.value,
  children: (item) => item.items,
}
const keysOf = (items: unknown) =>
  readCollection(items, tabs).entries.map((entry) => entry.key)

describe('readCollection', () => {
  it('reads a flat list in order with defaults for text and disabled', () => {
    const c = readCollection(
      [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta', disabled: true },
        { value: '', label: 7 },
      ],
      tabs,
    )
    expect(c.keys).toEqual(['a', 'b', ''])
    expect(c.entries.map(({ key, parent, level, disabled, text }) => [key, parent, level, disabled, text]))
      .toEqual([
        ['a', null, 1, false, 'Alpha'],
        ['b', null, 1, true, 'Beta'],
        ['', null, 1, false, '7'],
      ])
    expect(c.get('b')?.item).toEqual({ value: 'b', label: 'Beta', disabled: true })
    expect(c.get('missing')).toBeUndefined()
    expect(c.get(null)).toBeUndefined()
    expect(c.children(null)).toBe(c.children(null))
    expect(reports()).toEqual([])
  })

  it.each([
    [null, 'null'],
    ['tabs', '"tabs"'],
    [{ value: 'a' }, 'object'],
    [3, '3'],
  ])('reads the non-array %o as empty and reports it', (items, shown) => {
    const c = readCollection(items, tabs)
    expect(c.entries).toEqual([])
    expect(c.keys).toEqual([])
    expect(reports()).toEqual([`Face UI Tabs: invalid items ${shown}; using [].`])
  })

  it('reads undefined as an empty list silently', () => {
    expect(readCollection(undefined, tabs).entries).toEqual([])
    expect(reports()).toEqual([])
  })

  it('names the prop from the spec', () => {
    readCollection('x', { ...tabs, component: 'Select', prop: 'options' })
    expect(reports()).toEqual(['Face UI Select: invalid options "x"; using [].'])
  })

  it('drops non-object items and reports each', () => {
    expect(keysOf([null, 'a', 5, { value: 'b', label: 'B' }, [], undefined])).toEqual(['b'])
    expect(reports()).toEqual([
      'Face UI Tabs: invalid items[0] null; dropping the item.',
      'Face UI Tabs: invalid items[1] "a"; dropping the item.',
      'Face UI Tabs: invalid items[2] 5; dropping the item.',
      'Face UI Tabs: invalid items[4] array; dropping the item.',
      'Face UI Tabs: missing items[5]; dropping the item.',
    ])
  })

  it('drops items whose key is not a string', () => {
    expect(keysOf([{ value: 1 }, { label: 'no key' }, { value: null }, { value: 'ok' }])).toEqual(['ok'])
    expect(reports()).toEqual([
      'Face UI Tabs: invalid items[0] key 1; dropping the item.',
      'Face UI Tabs: missing items[1] key; dropping the item.',
      'Face UI Tabs: invalid items[2] key null; dropping the item.',
    ])
  })

  it('keeps the first of duplicate keys and reports the rest', () => {
    const c = readCollection(
      [
        { value: 'a', label: 'First' },
        { value: 'a', label: 'Second' },
        { value: 'b', label: 'B' },
        { value: 'a', label: 'Third' },
      ],
      tabs,
    )
    expect(c.keys).toEqual(['a', 'b'])
    expect(c.get('a')?.text).toBe('First')
    expect(reports()).toEqual([
      'Face UI Tabs: invalid items[1] key "a"; dropping the duplicate.',
      'Face UI Tabs: invalid items[3] key "a"; dropping the duplicate.',
    ])
  })

  it('gives positional lists `#<index>` keys: silent when missing, reported when invalid', () => {
    const crumbs: CollectionSpec<{ key?: unknown; label: string }> = {
      component: 'Breadcrumb',
      key: (item) => item.key,
      positional: true,
    }
    const c = readCollection(
      [
        { label: 'Home' },
        { key: 'docs', label: 'Docs' },
        { key: 7, label: 'Seven' },
        { key: 'docs', label: 'Again' },
        { label: 'Last' },
      ],
      crumbs,
    )
    expect(c.keys).toEqual(['#0', 'docs', '#2', '#4'])
    expect(reports()).toEqual([
      'Face UI Breadcrumb: invalid items[2] key 7; using "#2".',
      'Face UI Breadcrumb: invalid items[3] key "docs"; dropping the duplicate.',
    ])
  })

  it('reads text from the spec, then textValue, then a string or number label', () => {
    const icon = { $$typeof: Symbol.for('react.element') }
    const items = [
      { value: 'a', label: 'Label', textValue: 'Text value' },
      { value: 'b', label: icon },
      { value: 'c', label: icon, textValue: 'Custom' },
      { value: 'd', label: 'Kept', textValue: 5 },
    ]
    expect(readCollection(items, tabs).entries.map((entry) => entry.text)).toEqual([
      'Text value',
      '',
      'Custom',
      'Kept',
    ])
    const spec = { ...tabs, text: (item: CollectionItem) => (item.value === 'b' ? 'Spec' : undefined) }
    expect(readCollection(items, spec).entries.map((entry) => entry.text)).toEqual([
      'Text value',
      'Spec',
      'Custom',
      'Kept',
    ])
  })

  it('reads disabled from the spec when given', () => {
    const c = readCollection(
      [
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', locked: true },
      ],
      { ...tabs, disabled: (item) => 'locked' in item },
    )
    expect(c.entries.map((entry) => entry.disabled)).toEqual([false, true])
  })

  it('reads a tree depth-first with parents, levels and children', () => {
    const items: Node[] = [
      {
        value: 'src',
        label: 'src',
        items: [
          { value: 'app', label: 'app', items: [{ value: 'main', label: 'main.ts' }] },
          { value: 'lib', label: 'lib', items: [] },
        ],
      },
      { value: 'readme', label: 'README' },
    ]
    const c = readCollection(items, tree)
    expect(c.entries.map(({ key, parent, level }) => [key, parent, level])).toEqual([
      ['src', null, 1],
      ['app', 'src', 2],
      ['main', 'app', 3],
      ['lib', 'src', 2],
      ['readme', null, 1],
    ])
    expect(c.keys).toEqual(['src', 'readme'])
    expect(c.children('src').map((entry) => entry.key)).toEqual(['app', 'lib'])
    expect(c.children('lib')).toEqual([])
    expect(c.children('unknown')).toEqual([])
    expect(reports()).toEqual([])
  })

  it('reports invalid nested items with their path; keys stay unique across levels', () => {
    const c = readCollection(
      [
        { value: 'a', label: 'A', items: 'nope' },
        { value: 'b', label: 'B', items: null },
        { value: 'c', label: 'C', items: [null, { value: 'a', label: 'dup' }, { value: 'd', label: 'D' }] },
      ],
      tree,
    )
    expect(c.entries.map((entry) => entry.key)).toEqual(['a', 'b', 'c', 'd'])
    expect(reports()).toEqual([
      'Face UI Tree: invalid items[0].items "nope"; using [].',
      'Face UI Tree: invalid items[2].items[0] null; dropping the item.',
      'Face UI Tree: invalid items[2].items[1] key "a"; dropping the duplicate.',
    ])
  })

  it('drops an item nested inside itself instead of recursing forever', () => {
    const loop: { key?: string; label: string; items: unknown[] } = { label: 'Loop', items: [] }
    loop.items.push(loop)
    const c = readCollection([loop], {
      component: 'Navigation',
      key: (item: typeof loop) => item.key,
      positional: true,
      children: (item) => item.items,
    })
    expect(c.entries.map((entry) => entry.key)).toEqual(['#0'])
    expect(reports()).toEqual(['Face UI Navigation: invalid items[0].items[0] object; dropping the item.'])
  })

  it('keys groups and separators by position, never enables them, and nests group items', () => {
    type MenuEntry = CollectionItem | ItemSeparator | ItemGroup<CollectionItem | ItemSeparator>
    const items: MenuEntry[] = [
      { value: 'new', label: 'New' },
      { type: 'separator' },
      {
        type: 'group',
        label: 'Recent',
        items: [
          { value: 'one', label: 'One' },
          { type: 'separator' },
          { value: 'two', label: 'Two', disabled: true },
        ],
      },
    ]
    const c = readCollection(items, { component: 'Menu', key: (item) => (item as CollectionItem).value })
    expect(c.entries.map(({ key, parent, level, disabled, text }) => [key, parent, level, disabled, text]))
      .toEqual([
        ['new', null, 1, false, 'New'],
        ['#1', null, 1, true, ''],
        ['#2', null, 1, true, ''],
        ['one', '#2', 2, false, 'One'],
        ['#2#1', '#2', 2, true, ''],
        ['two', '#2', 2, true, 'Two'],
      ])
    expect(c.entries.filter((entry) => !entry.disabled).map((entry) => entry.key)).toEqual(['new', 'one'])
    expect(reports()).toEqual([])
  })
})

describe('visibleKeys', () => {
  const c = readCollection(
    [
      {
        value: 'a',
        label: 'A',
        items: [
          { value: 'a1', label: 'A1', items: [{ value: 'a1x', label: 'A1x' }] },
          { value: 'a2', label: 'A2' },
        ],
      },
      { value: 'b', label: 'B', items: [{ value: 'b1', label: 'B1' }] },
    ],
    tree,
  )

  it('lists top-level keys when nothing is expanded', () => {
    expect(visibleKeys(c, new Set())).toEqual(['a', 'b'])
  })

  it('descends only into expanded entries whose ancestors are expanded', () => {
    expect(visibleKeys(c, new Set(['a']))).toEqual(['a', 'a1', 'a2', 'b'])
    expect(visibleKeys(c, new Set(['a', 'a1', 'b']))).toEqual(['a', 'a1', 'a1x', 'a2', 'b', 'b1'])
    expect(visibleKeys(c, new Set(['a1', 'b', 'unknown']))).toEqual(['a', 'b', 'b1'])
  })
})

describe('readKeys', () => {
  it('returns a clean array as is', () => {
    const value = ['a', 'b', '']
    expect(readKeys(value, 'Tree', 'expanded')).toBe(value)
    expect(reports()).toEqual([])
  })

  it('reads undefined as [] silently', () => {
    expect(readKeys(undefined, 'Tree', 'expanded')).toEqual([])
    expect(reports()).toEqual([])
  })

  it.each([
    [null, 'null'],
    ['a', '"a"'],
    [{}, 'object'],
  ])('reads the non-array %o as [] and reports it', (value, shown) => {
    expect(readKeys(value, 'Accordion', 'expanded')).toEqual([])
    expect(reports()).toEqual([`Face UI Accordion: invalid expanded ${shown}; using [].`])
  })

  it('drops non-strings and repeated keys, reporting each', () => {
    expect(readKeys(['a', 1, 'b', null, 'a'], 'Select', 'value')).toEqual(['a', 'b'])
    expect(reports()).toEqual([
      'Face UI Select: invalid value[1] 1; dropping it.',
      'Face UI Select: invalid value[3] null; dropping it.',
      'Face UI Select: invalid value[4] "a"; dropping the duplicate.',
    ])
  })
})

describe('move', () => {
  const keys = ['a', 'b', 'c']

  it.each([
    ['a', 'next', 'b'],
    ['b', 'prev', 'a'],
    ['b', 'first', 'a'],
    ['b', 'last', 'c'],
    ['c', 'next', 'a'],
    ['a', 'prev', 'c'],
  ] as const)('from %s, %s reaches %s (looping)', (from, to, expected) => {
    expect(move(keys, from, to)).toBe(expected)
  })

  it('stays at the edge without loop', () => {
    expect(move(keys, 'c', 'next', false)).toBe('c')
    expect(move(keys, 'a', 'prev', false)).toBe('a')
    expect(move(keys, 'a', 'next', false)).toBe('b')
  })

  it('enters at the first or last key from null or an unknown key', () => {
    expect(move(keys, null, 'next')).toBe('a')
    expect(move(keys, null, 'prev')).toBe('c')
    expect(move(keys, 'gone', 'next', false)).toBe('a')
    expect(move(keys, 'gone', 'prev', false)).toBe('c')
  })

  it('returns null for an empty list and handles a single key', () => {
    for (const to of ['next', 'prev', 'first', 'last'] as const) {
      expect(move([], 'a', to)).toBeNull()
      expect(move(['a'], 'a', to)).toBe('a')
    }
  })
})

describe('nearest', () => {
  it('takes the key now at the removed key’s index', () => {
    expect(nearest(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c')
    expect(nearest(['a', 'b', 'c'], ['b', 'c'], 'a')).toBe('b')
  })

  it('falls back to the previous (last) key when the removed key was at the end', () => {
    expect(nearest(['a', 'b', 'c'], ['a', 'b'], 'c')).toBe('b')
    expect(nearest(['a', 'b', 'c', 'd'], ['a'], 'c')).toBe('a')
  })

  it('returns the first key for a key that was not in the previous list', () => {
    expect(nearest(['a', 'b'], ['a', 'b'], 'z')).toBe('a')
  })

  it('returns null for an empty list', () => {
    expect(nearest(['a'], [], 'a')).toBeNull()
  })
})

describe('typeahead', () => {
  const fruit = ['Apple', 'Banana', 'blueberry', 'Cherry', 'Blackberry', '  Bean', 'Avocado'].map(
    (text) => ({ key: text.trim().toLowerCase(), text, disabled: false }),
  )
  /** Types `chars` 100 ms apart from `from`, returning each match. */
  const type = (chars: string, from: string | null = null, candidates = fruit) => {
    let state: Typeahead | null = null
    const matches: (string | null)[] = []
    Array.from(chars).forEach((char, index) => {
      const [next, match] = typeahead(state, char, 1000 + index * 100, candidates, from)
      state = next
      if (match !== null) from = match
      matches.push(match)
    })
    return { matches, state: state as Typeahead | null }
  }

  it('matches the start of the text, case-insensitively, ignoring leading spaces', () => {
    expect(type('a').matches).toEqual(['apple'])
    expect(type('C').matches).toEqual(['cherry'])
    expect(type('be').matches).toEqual(['banana', 'bean'])
  })

  it('accumulates a query within the window and keeps a current item that still matches', () => {
    const { matches, state } = type('bl')
    expect(matches).toEqual(['banana', 'blueberry'])
    expect(state).toEqual({ query: 'bl', at: 1100 })
    expect(type('bla').matches).toEqual(['banana', 'blueberry', 'blackberry'])
    expect(type('blu', 'blueberry').matches).toEqual(['blackberry', 'blackberry', 'blueberry'])
  })

  it('cycles through items starting with a repeated character', () => {
    expect(type('bbbbb').matches).toEqual(['banana', 'blueberry', 'blackberry', 'bean', 'banana'])
    expect(type('aa', 'apple').matches).toEqual(['avocado', 'apple'])
  })

  it('starts after the current item for a single character', () => {
    expect(type('b', 'blueberry').matches).toEqual(['blackberry'])
    expect(type('c', 'cherry').matches).toEqual(['cherry'])
  })

  it('starts a new query after 700 ms; exactly 700 ms still continues', () => {
    const [first] = typeahead(null, 'b', 0, fruit, null)
    expect(typeahead(first, 'l', 700, fruit, 'banana')).toEqual([{ query: 'bl', at: 700 }, 'blueberry'])
    expect(typeahead(first, 'c', 701, fruit, 'banana')).toEqual([{ query: 'c', at: 701 }, 'cherry'])
  })

  it('skips disabled candidates', () => {
    const candidates = fruit.map((c) => ({ ...c, disabled: c.key === 'banana' || c.key === 'blueberry' }))
    expect(type('bb', null, candidates).matches).toEqual(['blackberry', 'bean'])
  })

  it('returns no match but keeps the query when nothing matches', () => {
    expect(type('bz')).toEqual({ matches: ['banana', null], state: { query: 'bz', at: 1100 } })
    expect(typeahead(null, 'x', 0, [], null)).toEqual([{ query: 'x', at: 0 }, null])
  })

  it('does not start a query with whitespace but accepts it inside one', () => {
    expect(typeahead(null, ' ', 0, fruit, 'apple')).toEqual([{ query: '', at: 0 }, null])
    const items = ['New Orleans', 'New York', 'Newark'].map((text) => ({ key: text, text, disabled: false }))
    expect(type('new y', null, items).matches).toEqual(['New Orleans', 'New Orleans', 'New Orleans', 'New Orleans', 'New York'])
  })
})

describe('domId', () => {
  it('encodes each code point in hex, joined by dashes', () => {
    expect(domId('tabs-:r0:', 'tab', 'ab')).toBe('tabs-:r0:-tab-61-62')
    expect(domId('tabs-1', 'panel', 'a b')).toBe('tabs-1-panel-61-20-62')
    expect(domId('tabs-1', 'tab', '😀')).toBe('tabs-1-tab-1f600')
    expect(domId('tabs-1', 'tab', '')).toBe('tabs-1-tab-')
  })

  it('maps distinct keys to distinct ids without whitespace', () => {
    const keys = ['', '0', '1', '10', '1-0', 'a', 'a b', 'a-b', 'ab', '😀', '\n']
    const ids = keys.map((key) => domId('s', 'p', key))
    expect(new Set(ids).size).toBe(keys.length)
    for (const id of ids) expect(id).not.toMatch(/\s/)
  })
})
