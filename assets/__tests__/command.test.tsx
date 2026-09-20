import { act, createRef, useState, type ReactElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Command,
  type CommandItemEntry,
  type CommandProps,
} from '../../Command/Command'
import { matchesSearch } from '../runtime/search'
import { expectDevError, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'

const items: CommandItemEntry[] = [
  { value: 'copy', label: 'Copy', keywords: ['clipboard'] },
  { value: 'paste', label: 'Paste', disabled: true },
  { value: 'cut', label: 'Cut' },
]

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

const show = (ui: ReactElement) => act(async () => root.render(ui))
const render = (props: Partial<CommandProps> = {}) =>
  show(<Command aria-label="Commands" surface="inline" items={items} {...props} />)
const input = () => document.querySelector<HTMLInputElement>('[role="combobox"]')!
const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]')!
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')]
const values = () => options().map((option) => option.dataset.value)
const option = (value: string) =>
  document.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`)!
const highlighted = () =>
  options().find((node) => node.getAttribute('aria-selected') === 'true')?.dataset.value ?? null
const empty = () => document.querySelector('[data-scope="command"][data-part="empty"]')
const trigger = () => document.querySelector<HTMLButtonElement>('.uf-command__trigger')!
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')

const setText = (field: HTMLInputElement, text: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}
const type = (text: string) => act(async () => setText(input(), text))
/** Dispatches a keydown on the focused element (else the field) and returns it. */
const press = async (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  const target = document.activeElement !== document.body ? document.activeElement! : input()
  await act(async () => void target.dispatchEvent(event))
  return event
}
const pointer = (node: Element, type: string, pointerType = 'mouse') =>
  act(async () => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    node.dispatchEvent(event)
  })
const click = (node: Element) => act(async () => void (node as HTMLElement).click())

// ---------------------------------------------------------------------------
// State triads
// ---------------------------------------------------------------------------

describeControlled<string>({
  name: 'Command',
  prop: 'search',
  values: ['', 'cu'],
  render: (props) => (
    <Command aria-label="Commands" surface="inline" items={items} {...props} />
  ),
  change: (host, to) => setText(host.querySelector('input')!, to),
  read: (host) => host.querySelector('input')!.value,
})

describeControlled<boolean>({
  name: 'Command',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Command aria-label="Commands" surface="dialog" items={items} {...props} />
  ),
  change: (host, to) => {
    if (to) host.querySelector<HTMLElement>('.uf-command__trigger')!.click()
    else
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
  },
  read: (host) =>
    host.querySelector('.uf-command__trigger')!.getAttribute('aria-expanded') === 'true',
})

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------

describe('Command items', () => {
  it('items: commands render as options in list order, keyed by value', async () => {
    await render()
    expect(values()).toEqual(['copy', 'paste', 'cut'])
    expect(options().map((node) => node.textContent)).toEqual(['Copy', 'Paste', 'Cut'])
    expect(new Set(options().map((node) => node.id)).size).toBe(3)
    expect(input().getAttribute('aria-controls')).toBe(listbox().id)
  })

  it('items: an item without a string value, or repeating one, is dropped with a report', async () => {
    await expectDevError(
      () =>
        render({
          items: [
            { value: 'a', label: 'A' },
            { value: 1 as unknown as string, label: 'One' },
            { value: 'a', label: 'Again' },
          ],
        }),
      /^Face UI Command: invalid items\[\d\] key/,
    )
    expect(values()).toEqual(['a'])
    expect(option('a').textContent).toBe('A')
  })

  it('items[].label: rich content renders, and textValue is what the search reads (never "[object Object]")', async () => {
    await render({
      items: [
        { value: 'bold', label: <strong>Bold text</strong>, textValue: 'Bold text' },
        { value: 'plain', label: 'Plain' },
      ],
    })
    expect(option('bold').querySelector('strong')?.textContent).toBe('Bold text')
    await type('object')
    expect(values()).toEqual([])
    await type('bold')
    expect(values()).toEqual(['bold'])
  })

  it('items[].textValue: a rich label without it is reported and found by its keywords only', async () => {
    await expectDevError(
      () =>
        render({
          items: [{ value: 'star', label: <em>Favourite</em>, keywords: ['star'] }],
        }),
      /^Face UI Command: missing textValue; the search finds item "star" by its keywords only\.$/,
    )
    await type('favourite')
    expect(values()).toEqual([])
    await type('star')
    expect(values()).toEqual(['star'])
  })

  it('items[].keywords: the search finds an item by a word that is not shown', async () => {
    await render()
    await type('clip')
    expect(values()).toEqual(['copy'])
    expect(option('copy').textContent).not.toContain('clip')
  })

  it('items[].disabled: the item stays listed but arrows skip it and neither a click nor Enter picks it', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })
    expect(option('paste').getAttribute('aria-disabled')).toBe('true')
    expect(option('paste').hasAttribute('data-disabled')).toBe(true)
    await press('ArrowDown')
    expect(highlighted()).toBe('cut')
    await click(option('paste'))
    await click(option('paste').parentElement!)
    await type('paste')
    expect(highlighted()).toBeNull()
    expect(input().hasAttribute('aria-activedescendant')).toBe(false)
    await press('Enter')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('items[].icon: an icon renders at the start of the option and stays out of its name', async () => {
    await render({ items: [{ value: 'new', label: 'New file', icon: 'plus' }] })
    const icon = option('new').querySelector('[data-part="icon"]')!
    expect(icon.getAttribute('data-position')).toBe('start')
    expect(icon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(option('new').textContent).toBe('New file')
  })

  it('items group: a group item renders a group in place, named by its heading', async () => {
    await render({
      items: [
        { value: 'open', label: 'Open' },
        { type: 'group', label: 'Edit', items: [{ value: 'copy', label: 'Copy' }] },
        { value: 'close', label: 'Close' },
      ],
    })
    expect(values()).toEqual(['open', 'copy', 'close'])
    const group = listbox().querySelector<HTMLElement>('[role="group"]')!
    const heading = document.getElementById(group.getAttribute('aria-labelledby')!)!
    expect(heading.textContent).toBe('Edit')
    expect(heading.getAttribute('aria-hidden')).toBe('true')
    expect(heading.dataset.part).toBe('groupLabel')
    expect(group.contains(option('copy'))).toBe(true)
  })

  it('items group: a group without a matching item hides with its heading', async () => {
    await render({
      items: [
        { type: 'group', label: 'Edit', items: [{ value: 'copy', label: 'Copy' }] },
        { type: 'group', label: 'View', items: [{ value: 'zoom', label: 'Zoom' }] },
      ],
    })
    await type('zoom')
    expect(listbox().querySelectorAll('[role="group"]')).toHaveLength(1)
    expect(listbox().textContent).toBe('ViewZoom')
  })

  it('items group: arrows and Enter follow the order on screen across groups', async () => {
    const onSelect = vi.fn()
    await render({
      onSelect,
      items: [
        { type: 'group', label: 'B', items: [{ value: 'b1', label: 'B1' }] },
        { value: 'loose', label: 'Loose' },
        { type: 'group', label: 'A', items: [{ value: 'a1', label: 'A1' }] },
      ],
    })
    expect(values()).toEqual(['b1', 'loose', 'a1'])
    await press('ArrowDown')
    await press('ArrowDown')
    expect(highlighted()).toBe('a1')
    await press('Enter')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: 'a1' })
  })
})

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

describe('Command search', () => {
  it('search: every word must occur in the item text or a keyword, ignoring case and accents', async () => {
    await render({
      items: [
        { value: 'agent', label: 'Create a new agent', keywords: ['bot'] },
        { value: 'cafe', label: 'Café menu' },
        { value: 'tree', label: 'Ёлка' },
      ],
    })
    await type('AGENT new')
    expect(values()).toEqual(['agent'])
    await type('agent bot')
    expect(values()).toEqual(['agent'])
    await type('cafe')
    expect(values()).toEqual(['cafe'])
    await type('елка')
    expect(values()).toEqual(['tree'])
    await type('agent cafe')
    expect(values()).toEqual([])
  })

  it('search: a blank search lists every item', async () => {
    await render({ defaultSearch: '   ' })
    expect(values()).toEqual(['copy', 'paste', 'cut'])
    expect(matchesSearch('', [])).toBe(true)
  })

  it('search: filtering reads the current items, so a changed label, keyword or disabled flag is never stale (§5 #13)', async () => {
    const onSelect = vi.fn()
    const first: CommandItemEntry[] = [
      { value: 'a', label: 'Alpha', keywords: ['first'] },
      { value: 'b', label: 'Beta' },
    ]
    await render({ items: first, defaultSearch: 'gamma', onSelect })
    expect(values()).toEqual([])
    // Same values, new label: the search finds the new text.
    await render({ items: [{ value: 'a', label: 'Gamma' }, first[1]], onSelect })
    expect(values()).toEqual(['a'])
    // New keywords replace the old ones.
    await type('first')
    expect(values()).toEqual([])
    await render({ items: [{ value: 'a', label: 'Gamma', keywords: ['first'] }, first[1]], onSelect })
    expect(values()).toEqual(['a'])
    // A newly disabled item is no longer picked.
    await render({ items: [{ value: 'a', label: 'Gamma', keywords: ['first'], disabled: true }, first[1]], onSelect })
    await press('Enter')
    await click(option('a'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('search: a parent that refuses an edit keeps the list filtered by its own search', async () => {
    const onSearchChange = vi.fn()
    await render({ search: 'cu', onSearchChange })
    await type('c')
    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith({ search: 'c' })
    expect(input().value).toBe('cu')
    expect(values()).toEqual(['cut'])
  })

  it('search: a value that is not text shows an empty search and is reported', async () => {
    await expectDevError(
      () => render({ search: null as unknown as string }),
      /^Face UI Command: invalid search null; using ""\.$/,
    )
    expect(input().value).toBe('')
    expect(values()).toEqual(['copy', 'paste', 'cut'])
  })
})

// ---------------------------------------------------------------------------
// Highlight and keyboard
// ---------------------------------------------------------------------------

describe('Command highlight', () => {
  it('the first enabled item is highlighted and is the active descendant of the field', async () => {
    await render({ items: [{ value: 'x', label: 'X', disabled: true }, ...items] })
    expect(highlighted()).toBe('copy')
    expect(option('copy').hasAttribute('data-highlighted')).toBe(true)
    expect(input().getAttribute('aria-activedescendant')).toBe(option('copy').id)
    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect(input().getAttribute('aria-autocomplete')).toBe('list')
  })

  it('ArrowDown and ArrowUp move over enabled items and wrap at the ends', async () => {
    await render()
    const down = await press('ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    expect(highlighted()).toBe('cut')
    await press('ArrowDown')
    expect(highlighted()).toBe('copy')
    await press('ArrowUp')
    expect(highlighted()).toBe('cut')
    expect(input().getAttribute('aria-activedescendant')).toBe(option('cut').id)
  })

  it('Home, End and modified arrows stay with the text field', async () => {
    await render()
    for (const [key, init] of [
      ['Home', {}],
      ['End', {}],
      ['ArrowDown', { altKey: true }],
    ] as const) {
      const event = await press(key, init)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(highlighted()).toBe('copy')
  })

  it('a new search highlights its first enabled item', async () => {
    await render()
    await press('ArrowDown')
    expect(highlighted()).toBe('cut')
    await type('c')
    expect(highlighted()).toBe('copy')
  })

  it('a highlight whose item is filtered out or disabled falls back to the first enabled item', async () => {
    await render()
    await press('ArrowDown')
    await render({ items: [items[0], items[1], { ...items[2], disabled: true }] as CommandItemEntry[] })
    expect(highlighted()).toBe('copy')
  })

  it('pointer movement highlights an enabled item; touch and disabled items do not', async () => {
    await render()
    await pointer(option('cut').parentElement!, 'pointermove', 'touch')
    expect(highlighted()).toBe('copy')
    await pointer(option('paste').parentElement!, 'pointermove')
    expect(highlighted()).toBe('copy')
    await pointer(option('cut').parentElement!, 'pointermove')
    expect(highlighted()).toBe('cut')
  })

  it('a new search scrolls the list back to its top', async () => {
    await render()
    listbox().scrollTop = 40
    await type('c')
    expect(listbox().scrollTop).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// onSelect
// ---------------------------------------------------------------------------

describe('Command onSelect', () => {
  it('onSelect: Enter picks the highlighted item with { value }', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })
    await press('ArrowDown')
    const enter = await press('Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: 'cut' })
  })

  it('onSelect: a click picks the item, and pressing the list keeps focus in the search', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })
    await act(async () => input().focus())
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    await act(async () => void option('cut').dispatchEvent(down))
    expect(down.defaultPrevented).toBe(true)
    await click(option('cut'))
    // The row's spacing picks it too.
    await click(option('copy').parentElement!)
    expect(onSelect.mock.calls).toEqual([[{ value: 'cut' }], [{ value: 'copy' }]])
    expect(document.activeElement).toBe(input())
    // The field itself takes presses as usual.
    const inField = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    await act(async () => void input().dispatchEvent(inField))
    expect(inField.defaultPrevented).toBe(false)
  })

  it('onSelect: Enter with nothing listed does nothing and leaves the key to the form', async () => {
    const onSelect = vi.fn()
    await render({ onSelect, defaultSearch: 'zzz' })
    const enter = await press('Enter')
    expect(enter.defaultPrevented).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('onSelect: Enter that ends an IME composition picks nothing', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })
    await press('Enter', { isComposing: true })
    await press('Enter', { keyCode: 229 } as KeyboardEventInit)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Strings and naming
// ---------------------------------------------------------------------------

describe('Command strings and naming', () => {
  it('labels.empty: replaces the list when no item matches, and when there are none', async () => {
    await render()
    expect(empty()).toBeNull()
    await type('zzz')
    expect(empty()?.textContent).toBe('No results found.')
    // Outside the listbox: a listbox holds options only.
    expect(listbox().contains(empty())).toBe(false)
    await render({ items: [], labels: { empty: 'Nothing here' } })
    await type('')
    expect(empty()?.textContent).toBe('Nothing here')
  })

  it('placeholder: no default; it hints in the field and the trigger and names the search without aria-label', async () => {
    await show(<Command surface="inline" items={items} placeholder="Find a command" />)
    expect(input().placeholder).toBe('Find a command')
    expect(input().hasAttribute('aria-label')).toBe(false)
    expect(listbox().getAttribute('aria-label')).toBe('Find a command')
    await show(<Command surface="inline" items={items} aria-label="Commands" />)
    expect(input().hasAttribute('placeholder')).toBe(false)
    await show(<Command surface="dialog" items={items} placeholder="Find a command" />)
    expect(trigger().textContent).toBe('Find a command')
    expect(trigger().getAttribute('aria-label')).toBe('Find a command')
  })

  it('aria-label names the field, its list, the dialog and the trigger', async () => {
    await show(<Command surface="dialog" defaultOpen items={items} aria-label="Search docs" />)
    for (const node of [input(), listbox(), dialog()!, trigger()])
      expect(node.getAttribute('aria-label')).toBe('Search docs')
  })

  it('aria-labelledby names every part and wins over aria-label', async () => {
    await show(
      <Command
        surface="dialog"
        defaultOpen
        items={items}
        aria-label="Ignored"
        aria-labelledby="heading"
      />,
    )
    for (const node of [input(), listbox(), dialog()!, trigger()])
      expect(node.getAttribute('aria-labelledby')).toBe('heading')
    for (const node of [listbox(), dialog()!, trigger()])
      expect(node.hasAttribute('aria-label')).toBe(false)
  })

  it('a search without aria-label, aria-labelledby or placeholder is reported unnamed', async () => {
    await expectDevError(
      () => show(<Command surface="inline" items={items} />),
      /^Face UI Command: missing aria-label; the search has no accessible name/,
    )
    expect(listbox().hasAttribute('aria-label')).toBe(false)
  })

  // The search is an <input> and the palette trigger a <button>: both labelable, so a `<label>`
  // the consumer wrote outside names them, which no render can see; the check asks the DOM.
  it('is silent when an external label names the search or the palette trigger', async () => {
    const errors: string[] = []
    const print = console.error
    console.error = (...args: unknown[]) => void errors.push(args.map(String).join(' '))
    try {
      await show(
        <>
          <label htmlFor="palette">Commands</label>
          <Command id="palette" surface="inline" items={items} />
        </>,
      )
      expect(input().hasAttribute('aria-label')).toBe(false)
      expect(input().hasAttribute('aria-labelledby')).toBe(false)
      expect(Array.from(input().labels ?? []).map((label) => label.textContent)).toEqual([
        'Commands',
      ])
      expect(errors).toEqual([])

      // The closed palette shows only its trigger, which a wrapping label names just as well.
      await show(
        <label>
          Commands
          <Command surface="dialog" items={items} />
        </label>,
      )
      expect(trigger().hasAttribute('aria-label')).toBe(false)
      expect(Array.from(trigger().labels ?? [])).toHaveLength(1)
      expect(errors).toEqual([])
    } finally {
      console.error = print
    }
  })

  // The check follows the named element: unnamed is still reported before the palette opens.
  it('reports the palette trigger left unnamed while it is still closed', async () => {
    await expectDevError(
      () => show(<Command surface="dialog" items={items} />),
      /^Face UI Command: missing aria-label; the search has no accessible name/,
    )
    expect(trigger().hasAttribute('aria-label')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Native attributes
// ---------------------------------------------------------------------------

describe('Command native attributes', () => {
  it('native attributes and ref go on the search field; className and style on the box', async () => {
    const ref = createRef<HTMLInputElement>()
    await show(
      <Command
        ref={ref}
        aria-label="Commands"
        surface="inline"
        items={items}
        id="palette-search"
        data-testid="palette"
        aria-describedby="hint"
        inputMode="search"
        className="custom"
        style={{ maxWidth: 480 }}
      />,
    )
    expect(ref.current).toBe(input())
    expect(input().id).toBe('palette-search')
    expect(input().dataset.testid).toBe('palette')
    expect(input().getAttribute('aria-describedby')).toBe('hint')
    expect(input().getAttribute('inputmode')).toBe('search')
    const box = document.querySelector<HTMLElement>('[data-scope="command"][data-part="root"]')!
    expect(box.classList.contains('custom')).toBe(true)
    expect(box.style.maxWidth).toBe('480px')
    expect(input().classList.contains('custom')).toBe(false)
  })

  it('onKeyDown runs first, and its preventDefault() cancels the built-in key', async () => {
    const onSelect = vi.fn()
    const seen: string[] = []
    await render({
      onSelect,
      onKeyDown: (event) => {
        seen.push(event.key)
        if (event.key === 'Enter') event.preventDefault()
      },
    })
    await press('ArrowDown')
    expect(highlighted()).toBe('cut')
    await press('Enter')
    expect(onSelect).not.toHaveBeenCalled()
    expect(seen).toEqual(['ArrowDown', 'Enter'])
  })

  it('autoFocus focuses the search field on mount', async () => {
    await render({ autoFocus: true })
    expect(document.activeElement).toBe(input())
  })
})

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

describe('Command surface', () => {
  let media: MatchMediaRestore | null = null
  afterEach(() => {
    media?.()
    media = null
  })

  it('surface inline: the search shows in the page, and open changes nothing', async () => {
    await render({ open: false })
    expect(input()).not.toBeNull()
    expect(dialog()).toBeNull()
    expect(document.querySelector('.uf-command__trigger')).toBeNull()
    expect(document.querySelector('.uf-command')!.getAttribute('data-surface')).toBe('inline')
  })

  it('surface auto: a dialog below 900px, inline above', async () => {
    media = installMatchMedia(true)
    await render({ surface: 'auto' })
    expect(document.querySelector('[role="combobox"]')).toBeNull()
    expect(trigger()).not.toBeNull()
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 899px)')
    media.setMatches(false)
    await act(async () => media!.dispatchChange())
    expect(document.querySelector('.uf-command__trigger')).toBeNull()
    expect(input()).not.toBeNull()
  })

  it('surface dialog: the trigger opens a modal dialog focused on the search, with the page scroll locked', async () => {
    const onOpenChange = vi.fn()
    await render({ surface: 'dialog', onOpenChange })
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[role="combobox"]')).toBeNull()
    await click(trigger())
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
    expect(dialog()!.getAttribute('aria-modal')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(dialog()!.id)
    expect(document.activeElement).toBe(input())
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('dialog: picking an item closes it and focus returns to the trigger', async () => {
    const onSelect = vi.fn()
    await render({ surface: 'dialog', onSelect })
    await act(async () => trigger().focus())
    await click(trigger())
    await press('Enter')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: 'copy' })
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger())
    expect(document.body.style.overflow).toBe('')
  })

  it('dialog: a controlled parent may keep it open after a pick, for a follow-up list', async () => {
    function Palette() {
      const [page, setPage] = useState<'root' | 'theme'>('root')
      return (
        <Command
          aria-label="Commands"
          surface="dialog"
          open
          onOpenChange={() => {}}
          items={
            page === 'root'
              ? [{ value: 'theme', label: 'Change theme…' }]
              : [{ value: 'dark', label: 'Dark' }]
          }
          onSelect={({ value }) => value === 'theme' && setPage('theme')}
        />
      )
    }
    await show(<Palette />)
    await press('Enter')
    expect(dialog()).not.toBeNull()
    expect(values()).toEqual(['dark'])
  })

  it('dialog: a press on the backdrop closes it once', async () => {
    const onOpenChange = vi.fn()
    await render({ surface: 'dialog', defaultOpen: true, onOpenChange })
    const backdrop = document.querySelector('.uf-responsive-overlay-backdrop')!
    await pointer(backdrop, 'pointerdown')
    await click(backdrop)
    expect(onOpenChange.mock.calls).toEqual([[{ open: false }]])
    expect(dialog()).toBeNull()
  })

  it('§5 #11: Escape in the dialog field closes the dialog', async () => {
    const onOpenChange = vi.fn()
    await render({ surface: 'dialog', defaultOpen: true, onOpenChange })
    expect(document.activeElement).toBe(input())
    const escape = await press('Escape')
    expect(escape.defaultPrevented).toBe(true)
    expect(onOpenChange.mock.calls).toEqual([[{ open: false }]])
    expect(document.querySelector('[role="combobox"]')).toBeNull()
  })

  it('§5 #11: an inline field keeps focus and its keyboard after Escape', async () => {
    await render()
    await act(async () => input().focus())
    const escape = await press('Escape')
    expect(escape.defaultPrevented).toBe(false)
    await press('ArrowDown')
    expect(document.activeElement).toBe(input())
    expect(highlighted()).toBe('cut')
  })

  it('dialog trigger: shows the search, else the placeholder', async () => {
    await render({ surface: 'dialog', placeholder: 'Search…', defaultSearch: 'cu' })
    expect(trigger().textContent).toBe('cu')
    expect(trigger().querySelector('.uf-command__triggerLabel--placeholder')).toBeNull()
    await show(<Command key="fresh" surface="dialog" items={items} placeholder="Search…" />)
    expect(trigger().textContent).toBe('Search…')
    expect(trigger().querySelector('.uf-command__triggerLabel--placeholder')).not.toBeNull()
  })
})

describe('Command without data', () => {
  it('renders with no items and reports hostile items', async () => {
    await render({ items: undefined })
    expect(options()).toHaveLength(0)
    expect(empty()?.textContent).toBe('No results found.')
    await expectDevError(
      () => render({ items: 'x' as unknown as CommandItemEntry[] }),
      /^Face UI Command: invalid items "x"; using \[\]\.$/,
    )
    expect(host.querySelector('[role="combobox"]')).not.toBeNull()
  })
})
