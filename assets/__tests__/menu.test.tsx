import { act, createRef, type ReactElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Menu, type MenuItemEntry, type MenuProps } from '../../Menu/Menu'
import { Popover } from '../../Popover/Popover'
import { expectDevError, libraryCss, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { installMatchMedia } from './harness/match-media'

const items: MenuItemEntry[] = [
  { value: 'copy', label: 'Copy' },
  { value: 'paste', label: 'Paste', disabled: true },
  { value: 'delete', label: 'Delete', tone: 'destructive' },
  { value: 'archive', label: 'Archive' },
]

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

const show = (ui: ReactElement) => act(async () => root.render(ui))
const render = (props: Partial<MenuProps> = {}) =>
  show(
    <Menu items={items} surface="popover" {...props}>
      {props.children ?? <button type="button">Actions</button>}
    </Menu>,
  )
const trigger = () => host.querySelector<HTMLElement>('.uf-menu-trigger')!
const menu = () => document.querySelector<HTMLElement>('[role="menu"]')
const item = (value: string) =>
  menu()!.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!
const focused = () =>
  (document.activeElement as HTMLElement | null)?.getAttribute('data-value') ??
  null
const click = (node: Element) =>
  act(async () => {
    ;(node as HTMLElement).click()
  })
const key = (node: Element, key: string, init: KeyboardEventInit = {}) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    )
  })
const press = (key_: string, init?: KeyboardEventInit) =>
  key(document.activeElement!, key_, init)
const pointer = (node: Element, type: string, init: MouseEventInit = {}) =>
  act(async () => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })
    node.dispatchEvent(event)
  })
const contextMenu = (node: Element, clientX = 0, clientY = 0) =>
  act(async () => {
    node.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }),
    )
  })

describeControlled<boolean>({
  name: 'Menu',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Menu items={items} surface="popover" {...props}>
      <button type="button">Actions</button>
    </Menu>
  ),
  change: (host) => host.querySelector<HTMLElement>('.uf-menu-trigger')!.click(),
  read: (host) =>
    host.querySelector('.uf-menu-trigger')!.getAttribute('aria-expanded') === 'true',
})

describe('Menu openOn', () => {
  it('openOn click: a trigger click toggles the menu and the native context menu stays', async () => {
    await render()
    const native = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    await act(async () => void trigger().dispatchEvent(native))
    expect(native.defaultPrevented).toBe(false)
    expect(menu()).toBeNull()
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu')
    await click(trigger())
    expect(menu()).not.toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(menu()!.id)
    await click(trigger())
    expect(menu()).toBeNull()
  })

  it('openOn context: the context menu opens it instead of the native one; a click does not', async () => {
    const onOpenChange = vi.fn()
    await render({ openOn: 'context', onOpenChange })
    await click(trigger())
    expect(menu()).toBeNull()
    // A context area is no menu button.
    expect(trigger().hasAttribute('aria-haspopup')).toBe(false)
    expect(trigger().hasAttribute('aria-expanded')).toBe(false)
    const native = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    await act(async () => void trigger().dispatchEvent(native))
    expect(native.defaultPrevented).toBe(true)
    expect(menu()).not.toBeNull()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
    // A context menu has no trigger to name it.
    expect(menu()!.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('openOn context: a second context menu while open keeps it open and takes focus back from the area', async () => {
    const onOpenChange = vi.fn()
    await show(
      <Menu items={items} openOn="context" surface="popover" onOpenChange={onOpenChange}>
        <div>Canvas</div>
      </Menu>,
    )
    await contextMenu(trigger(), 10, 10)
    expect(document.activeElement).toBe(menu())
    // Pressing the area focuses it before its context menu fires.
    await act(async () => trigger().focus())
    await contextMenu(trigger(), 40, 40)
    expect(document.activeElement).toBe(menu())
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
  })
})

describe('Menu placement', () => {
  const TRIGGER = { top: 400, left: 100, width: 80, height: 32 }
  const CONTENT = { width: 160, height: 100 }
  beforeEach(() => {
    const rect = (x: number, y: number, width: number, height: number) =>
      ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON() {} }) as DOMRect
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const node = this as HTMLElement
      if (node.matches('.uf-menu-trigger'))
        return rect(TRIGGER.left, TRIGGER.top, TRIGGER.width, TRIGGER.height)
      if (node.matches('.uf-menu-content')) return rect(0, 0, CONTENT.width, CONTENT.height)
      if (node.style.position === 'fixed')
        return rect(parseFloat(node.style.left), parseFloat(node.style.top), 0, 0)
      return rect(0, 0, 0, 0)
    })
  })
  const placed = () => {
    const surface = document.querySelector<HTMLElement>('.uf-menu-content')!
    return [parseFloat(surface.style.left), parseFloat(surface.style.top), surface.dataset.side]
  }

  it('side, align and sideOffset place a click menu: default below, end-aligned, 4px away', async () => {
    await render()
    await click(trigger())
    expect(placed()).toEqual([180 - 160, 432 + 4, 'bottom'])
    await click(trigger())
    await render({ side: 'top', align: 'start', sideOffset: 10 })
    await click(trigger())
    expect(placed()).toEqual([100, 400 - 100 - 10, 'top'])
    await click(trigger())
    await render({ side: 'right', align: 'start', sideOffset: 0 })
    await click(trigger())
    expect(placed()).toEqual([180, 400, 'right'])
  })

  it("align follows the trigger's direction: in right-to-left text, start aligns the right edges", async () => {
    await show(
      <div dir="rtl">
        <Menu items={items} surface="popover" align="start">
          <button type="button">Actions</button>
        </Menu>
      </div>,
    )
    await click(trigger())
    expect(placed()).toEqual([180 - 160, 436, 'bottom'])
    expect(document.querySelector('.uf-menu-content')!.getAttribute('dir')).toBe('rtl')
    await click(trigger())
    // The native dir of the menu wins over the trigger's.
    await show(
      <div dir="rtl">
        <Menu items={items} surface="popover" align="start" dir="ltr">
          <button type="button">Actions</button>
        </Menu>
      </div>,
    )
    await click(trigger())
    expect(placed()).toEqual([100, 436, 'bottom'])
    expect(menu()!.getAttribute('dir')).toBe('ltr')
  })

  it('a context menu opens at the pointer and ignores side, align and sideOffset', async () => {
    await render({ openOn: 'context', side: 'top', align: 'end', sideOffset: 30 })
    await contextMenu(trigger(), 300, 200)
    expect(placed()).toEqual([300, 200, 'bottom'])
    // A second context menu moves the open menu to the new point.
    await contextMenu(trigger(), 320, 240)
    expect(placed()).toEqual([320, 240, 'bottom'])
  })

  it('sideOffset that is not a finite number falls back to 4 with a report', async () => {
    await expectDevError(() => render({ sideOffset: Number.NaN }), /^Face UI Menu: invalid sideOffset NaN; using 4\.$/)
    await click(trigger())
    expect(placed()[1]).toBe(436)
  })
})

describe('Menu trigger (children)', () => {
  it('text becomes a Button trigger; without children nothing renders and no "Options" fallback exists', async () => {
    await show(<Menu items={items} surface="popover">More</Menu>)
    expect(trigger().tagName).toBe('BUTTON')
    expect(trigger().textContent).toBe('More')
    await show(<Menu items={items} surface="popover" defaultOpen />)
    expect(host.innerHTML).toBe('')
    expect(document.body.textContent).not.toContain('Options')
    expect(menu()).toBeNull()
  })

  it("keeps the trigger element's props and ref; its onClick preventDefault() cancels opening", async () => {
    const ref = createRef<HTMLButtonElement>()
    let prevent = true
    const onOpenChange = vi.fn()
    await show(
      <Menu items={items} surface="popover" onOpenChange={onOpenChange}>
        <button
          ref={ref}
          id="own"
          type="button"
          className="own"
          onClick={(event) => prevent && event.preventDefault()}
        >
          Actions
        </button>
      </Menu>,
    )
    expect(ref.current).toBe(trigger())
    expect(trigger().id).toBe('own')
    expect(trigger().classList.contains('own')).toBe(true)
    await click(trigger())
    expect(menu()).toBeNull()
    prevent = false
    await click(trigger())
    expect(menu()).not.toBeNull()
    // The menu is named by the trigger's own id.
    expect(menu()!.getAttribute('aria-labelledby')).toBe('own')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
  })
})

describe('Menu items', () => {
  it('renders items, separators and labelled groups in order with menu roles', async () => {
    await render({
      defaultOpen: true,
      items: [
        { value: 'new', label: 'New' },
        { type: 'separator' },
        { type: 'group', label: <em>Recent</em>, items: [{ value: 'one', label: 'One' }] },
        { type: 'group', label: '', items: [{ value: 'two', label: 'Two' }] },
      ],
    })
    const children = [...menu()!.children].map((node) => node.getAttribute('role') ?? node.firstElementChild?.getAttribute('role'))
    expect(children).toEqual(['menuitem', 'separator', 'group', 'group'])
    const [labelled, bare] = menu()!.querySelectorAll('[role="group"]')
    const heading = document.getElementById(labelled.getAttribute('aria-labelledby')!)!
    expect(heading.textContent).toBe('Recent')
    // The heading names the group without being read twice.
    expect(heading.getAttribute('aria-hidden')).toBe('true')
    expect(bare.hasAttribute('aria-labelledby')).toBe(false)
    expect(bare.querySelector('[data-part="group-label"]')).toBeNull()
    expect(item('one').closest('[role="group"]')).toBe(labelled)
  })

  it('drops a non-object, keyless or repeated item with a report instead of crashing', async () => {
    const reports = vi.spyOn(console, 'error').mockImplementation(() => {})
    await render({
      defaultOpen: true,
      items: [
        { value: 'a', label: 'A' },
        null,
        { label: 'No value' },
        { value: 'a', label: 'Again' },
      ] as unknown as MenuItemEntry[],
    })
    expect(reports.mock.calls.map(([message]) => message)).toEqual([
      'Face UI Menu: invalid items[1] null; dropping the item.',
      'Face UI Menu: missing items[2] key; dropping the item.',
      'Face UI Menu: invalid items[3] key "a"; dropping the duplicate.',
    ])
    reports.mockRestore()
    expect([...menu()!.querySelectorAll('[data-part="item"]')].map((node) => node.textContent)).toEqual(['A'])
    await expectDevError(
      () => render({ defaultOpen: true, items: 'copy' as unknown as MenuItemEntry[] }),
      /^Face UI Menu: invalid items "copy"; using \[\]\.$/,
    )
    expect(menu()!.children).toHaveLength(0)
  })

  it('item.disabled: arrows and letters skip it and a click selects nothing', async () => {
    const onSelect = vi.fn()
    await render({ defaultOpen: true, onSelect })
    expect((item('paste') as HTMLButtonElement).disabled).toBe(true)
    expect(item('paste').getAttribute('data-disabled')).not.toBeNull()
    await act(async () => item('copy').focus())
    await press('ArrowDown')
    expect(focused()).toBe('delete')
    await press('p')
    expect(focused()).toBe('delete')
    await click(item('paste'))
    expect(onSelect).not.toHaveBeenCalled()
    expect(menu()).not.toBeNull()
  })

  it('item.textValue: typeahead finds an item whose label is not plain text', async () => {
    await render({
      defaultOpen: true,
      items: [
        { value: 'copy', label: 'Copy' },
        { value: 'prefs', label: <span aria-label="Preferences">⚙</span>, textValue: 'Preferences' },
        { value: 'glyph', label: <span>Print</span> },
      ],
    })
    await act(async () => item('copy').focus())
    await press('p')
    expect(focused()).toBe('prefs')
    // Without textValue a rich label has no text to match.
    await press('r')
    expect(focused()).toBe('prefs')
  })

  it('item.icon: a registry name or an element renders before the label, hidden from the name', async () => {
    await render({
      defaultOpen: true,
      items: [
        { value: 'copy', label: 'Copy', icon: 'copy' },
        { value: 'own', label: 'Own', icon: <svg data-own /> },
        { value: 'plain', label: 'Plain' },
      ],
    })
    const icon = item('copy').querySelector('[data-part="icon"]')!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.nextElementSibling?.textContent).toBe('Copy')
    expect(icon.querySelector('svg')).not.toBeNull()
    expect(item('own').querySelector('[data-part="icon"] [data-own]')).not.toBeNull()
    expect(item('plain').querySelector('[data-part="icon"]')).toBeNull()
  })

  it('item.href: the item is a link that navigates unless onSelect prevents it; Space activates it', async () => {
    let prevent = true
    const onSelect = vi.fn(({ event }: { value: string; event: { preventDefault(): void } }) => {
      if (prevent) event.preventDefault()
    })
    const linkItems: MenuItemEntry[] = [
      { value: 'docs', label: 'Docs', href: '#docs' },
      { value: 'off', label: 'Off', href: '#off', disabled: true },
    ]
    window.location.hash = ''
    await render({ defaultOpen: true, items: linkItems, onSelect })
    expect(item('docs').tagName).toBe('A')
    expect(item('docs').getAttribute('href')).toBe('#docs')
    expect(item('docs').getAttribute('role')).toBe('menuitem')
    // A disabled link cannot be followed.
    expect(item('off').hasAttribute('href')).toBe(false)
    expect(item('off').getAttribute('aria-disabled')).toBe('true')
    await click(item('docs'))
    expect(window.location.hash).toBe('')
    expect(menu()).toBeNull()
    prevent = false
    await render({ defaultOpen: false, items: linkItems, onSelect })
    await key(trigger(), 'ArrowDown')
    expect(focused()).toBe('docs')
    await press(' ')
    expect(window.location.hash).toBe('#docs')
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls.map(([details]) => details.value)).toEqual(['docs', 'docs'])
    window.location.hash = ''
  })

  it('item.checked: a menuitemcheckbox that announces its state and shows a check while true', async () => {
    await render({
      defaultOpen: true,
      items: [
        { value: 'grid', label: 'Grid', checked: true },
        { value: 'rulers', label: 'Rulers', checked: false },
        { value: 'plain', label: 'Plain' },
      ],
    })
    expect(item('grid').getAttribute('role')).toBe('menuitemcheckbox')
    expect(item('grid').getAttribute('aria-checked')).toBe('true')
    expect(item('rulers').getAttribute('aria-checked')).toBe('false')
    expect(item('grid').querySelector('[data-part="indicator"]')).not.toBeNull()
    expect(item('plain').getAttribute('role')).toBe('menuitem')
    expect(item('plain').hasAttribute('aria-checked')).toBe(false)
    expect(item('plain').querySelector('[data-part="indicator"]')).toBeNull()
    expect(libraryCss()).toMatch(/\.uf-menu-item\[aria-checked="false"\] \.uf-menu-itemCheck \{\s*visibility: hidden;/)
  })

  it('item.tone: destructive colors the item as a destructive action', async () => {
    await render({ defaultOpen: true })
    expect(item('delete').getAttribute('data-tone')).toBe('destructive')
    expect(item('copy').hasAttribute('data-tone')).toBe(false)
    expect(libraryCss()).toMatch(/\.uf-menu-item\[data-tone="destructive"\] \{\s*color: var\(--uf-color-destructive\);/)
  })
})

describe('Menu onSelect', () => {
  it('reports the value and click event of an activated item, closes, and returns focus to the trigger', async () => {
    const onSelect = vi.fn()
    const onOpenChange = vi.fn()
    await render({ onSelect, onOpenChange })
    await key(trigger(), 'Enter')
    expect(focused()).toBe('copy')
    await press('End')
    await click(document.activeElement!)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [{ value, event }] = onSelect.mock.calls[0]
    expect(value).toBe('archive')
    expect(event.type).toBe('click')
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(trigger())
    expect(onOpenChange.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })
})

describe('Menu disabled', () => {
  it('disables the trigger and closes an open menu without reporting a change', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, onOpenChange })
    expect(menu()).not.toBeNull()
    await render({ defaultOpen: true, onOpenChange, disabled: true })
    expect(menu()).toBeNull()
    expect((trigger() as HTMLButtonElement).disabled).toBe(true)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    // It stays closed when enabled again.
    await render({ defaultOpen: true, onOpenChange })
    expect(menu()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('a controlled open menu shows closed while disabled, and a context area keeps its native menu', async () => {
    await render({ open: true, disabled: true })
    expect(menu()).toBeNull()
    await show(
      <Menu key="context" items={items} openOn="context" disabled>
        <div>Canvas</div>
      </Menu>,
    )
    const native = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    await act(async () => void trigger().dispatchEvent(native))
    expect(native.defaultPrevented).toBe(false)
    expect(menu()).toBeNull()
  })
})

describe('Menu surface', () => {
  it('sheet: a modal dialog titled by aria-label with a close button from labels.close, locking scroll', async () => {
    const onOpenChange = vi.fn()
    await render({ surface: 'sheet', 'aria-label': 'Chat actions', labels: { close: 'Fermer' }, onOpenChange })
    await click(trigger())
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Chat actions')
    expect(dialog.contains(menu())).toBe(true)
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger().getAttribute('aria-controls')).toBe(dialog.id)
    expect(document.body.style.overflow).toBe('hidden')
    const close = dialog.querySelector<HTMLElement>('button[aria-label="Fermer"]')!
    // The close button sits outside the menu, which holds only items.
    expect(menu()!.contains(close)).toBe(false)
    await click(close)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(onOpenChange.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })

  it('sheet without aria-label is titled by text children and otherwise named by the trigger', async () => {
    await show(<Menu items={items} surface="sheet" defaultOpen>Account</Menu>)
    let dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Account')
    await show(<Menu key="icon" items={items} surface="sheet" defaultOpen><button type="button" aria-label="More" /></Menu>)
    dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-labelledby')).toBe(trigger().id)
    expect(dialog.querySelector('.uf-responsive-sheetClose')!.getAttribute('aria-label')).toBe('Close')
  })

  it('auto: a bottom sheet below 900px and a popover above', async () => {
    const media = installMatchMedia(true)
    try {
      await show(<Menu items={items} defaultOpen><button type="button">Actions</button></Menu>)
      expect(document.querySelector('.uf-menu-content')!.getAttribute('data-surface')).toBe('sheet')
      await act(async () => {
        media.setMatches(false)
        media.dispatchChange()
      })
      expect(document.querySelector('.uf-menu-content')!.getAttribute('data-surface')).toBe('popover')
      expect(document.querySelector('[role="dialog"]')).toBeNull()
    } finally {
      media()
    }
  })
})

describe('Menu naming, labels and native attributes', () => {
  it('aria-label names the menu; without it a click menu is named by its trigger', async () => {
    await render({ defaultOpen: true, 'aria-label': 'Chat actions' })
    expect(menu()!.getAttribute('aria-label')).toBe('Chat actions')
    expect(menu()!.hasAttribute('aria-labelledby')).toBe(false)
    await render({ defaultOpen: true, 'aria-label': ' ' })
    expect(menu()!.hasAttribute('aria-label')).toBe(false)
    expect(menu()!.getAttribute('aria-labelledby')).toBe(trigger().id)
    await render({ defaultOpen: true, 'aria-labelledby': 'heading' })
    expect(menu()!.getAttribute('aria-labelledby')).toBe('heading')
  })

  it('labels: a dictionary that is not an object is reported and the default close name kept', async () => {
    await expectDevError(
      () => render({ surface: 'sheet', defaultOpen: true, labels: 'Fermer' as never }),
      /^Face UI Menu: invalid labels "Fermer"; using defaults\.$/,
    )
    expect(document.querySelector('.uf-responsive-sheetClose')!.getAttribute('aria-label')).toBe('Close')
  })

  it('className and style go on the floating surface; native attributes and ref on the menu list', async () => {
    const ref = createRef<HTMLDivElement>()
    await show(
      <Menu
        items={items}
        surface="popover"
        defaultOpen
        ref={ref}
        className="own"
        style={{ minWidth: 300 }}
        id="list"
        data-testid="menu"
        title="Actions"
      >
        <button type="button">Actions</button>
      </Menu>,
    )
    const surface = document.querySelector<HTMLElement>('.uf-menu-content')!
    expect(surface.classList.contains('own')).toBe(true)
    expect(surface.style.minWidth).toBe('300px')
    // The floating position still wins over consumer style.
    expect(surface.style.position).toBe('fixed')
    expect(ref.current).toBe(menu())
    expect(menu()!.id).toBe('list')
    expect(menu()!.dataset.testid).toBe('menu')
    expect(menu()!.title).toBe('Actions')
    expect(trigger().getAttribute('aria-controls')).toBe('list')
  })

  it("the list's own onKeyDown runs first and its preventDefault() cancels the built-in keys", async () => {
    let prevent = true
    const onKeyDown = vi.fn((event: { preventDefault(): void }) => prevent && event.preventDefault())
    await render({ defaultOpen: true, onKeyDown })
    await act(async () => item('copy').focus())
    await press('ArrowDown')
    expect(focused()).toBe('copy')
    prevent = false
    await press('ArrowDown')
    expect(focused()).toBe('delete')
    expect(onKeyDown).toHaveBeenCalledTimes(2)
  })
})

describe('Menu keyboard and focus', () => {
  it('Enter, Space, ArrowDown and Home on the trigger open at the first item; ArrowUp and End at the last', async () => {
    for (const [name, expected] of [
      ['Enter', 'copy'],
      [' ', 'copy'],
      ['ArrowDown', 'copy'],
      ['Home', 'copy'],
      ['ArrowUp', 'archive'],
      ['End', 'archive'],
    ] as const) {
      await render()
      await act(async () => trigger().focus())
      await press(name)
      expect([name, focused()]).toEqual([name, expected])
      expect(item(expected).hasAttribute('data-highlighted')).toBe(true)
      await press('Escape')
      expect(menu()).toBeNull()
      expect(document.activeElement).toBe(trigger())
    }
  })

  it('a pointer click opens with focus on the list; arrows and letters then enter the items', async () => {
    for (const [name, expected] of [
      ['ArrowDown', 'copy'],
      ['ArrowUp', 'archive'],
      ['d', 'delete'],
    ] as const) {
      await render()
      await click(trigger())
      expect(document.activeElement).toBe(menu())
      expect(menu()!.querySelector('[data-highlighted]')).toBeNull()
      await press(name)
      expect([name, focused()]).toEqual([name, expected])
      await click(trigger())
    }
  })

  it('arrows, Home and End move between enabled items and wrap at the ends', async () => {
    await render()
    await key(trigger(), 'ArrowDown')
    const path: Array<string | null> = []
    for (const name of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
      await press(name)
      path.push(focused())
    }
    expect(path).toEqual(['delete', 'archive', 'copy', 'archive', 'copy', 'archive'])
    expect(menu()!.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('typing moves focus to the next item starting with the typed text', async () => {
    await render({
      items: [
        { value: 'print', label: 'Print' },
        { value: 'paste', label: 'Paste' },
        { value: 'preview', label: 'Preview' },
      ],
    })
    await key(trigger(), 'ArrowDown')
    await press('p')
    expect(focused()).toBe('paste')
    await press('p')
    expect(focused()).toBe('preview')
  })

  it('Escape closes and returns focus to the trigger; an outside press closes without taking focus', async () => {
    const outside = document.body.appendChild(document.createElement('button'))
    try {
      await render()
      await key(trigger(), 'ArrowDown')
      await press('Escape')
      expect(menu()).toBeNull()
      expect(document.activeElement).toBe(trigger())
      await key(trigger(), 'ArrowDown')
      await act(async () => {
        outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
        outside.focus()
      })
      expect(menu()).toBeNull()
      expect(document.activeElement).toBe(outside)
    } finally {
      outside.remove()
    }
  })

  it('Escape closes a menu inside a popover one layer at a time', async () => {
    const onOpenChange = vi.fn()
    await show(
      <Popover
        defaultOpen
        onOpenChange={onOpenChange}
        content={
          <Menu surface="popover" items={items}>
            More
          </Menu>
        }
      >
        <button type="button">Share</button>
      </Popover>,
    )
    const more = document.querySelector<HTMLElement>('.uf-menu-trigger')!
    await key(more, 'ArrowDown')
    expect(menu()!.contains(document.activeElement)).toBe(true)
    await press('Escape')
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(more)
    expect(onOpenChange).not.toHaveBeenCalled()
    await press('Escape')
    expect(onOpenChange).toHaveBeenCalledWith({ open: false })
  })

  it('Tab closes a popover menu and puts focus back on the trigger before the browser moves it on', async () => {
    const onOpenChange = vi.fn()
    await render({ onOpenChange })
    await key(trigger(), 'ArrowDown')
    let during: Element | null = null
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    await act(async () => {
      document.activeElement!.dispatchEvent(tab)
      // The browser's default action starts from the element focused now.
      during = document.activeElement
    })
    expect(tab.defaultPrevented).toBe(false)
    expect(during).toBe(trigger())
    expect(menu()).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false })
  })

  it('Tab stays inside a sheet', async () => {
    await render({ surface: 'sheet' })
    await key(trigger(), 'ArrowDown')
    await press('Tab')
    expect(menu()).not.toBeNull()
  })

  it('the pointer moves the highlight with focus; leaving an item clears it', async () => {
    await render()
    await click(trigger())
    await pointer(item('delete'), 'pointermove')
    expect(focused()).toBe('delete')
    expect(item('delete').hasAttribute('data-highlighted')).toBe(true)
    // Keyboard navigation continues from the hovered item.
    await press('ArrowDown')
    expect(focused()).toBe('archive')
    await pointer(item('archive'), 'pointerout', { relatedTarget: menu() })
    expect(document.activeElement).toBe(menu())
    expect(menu()!.querySelector('[data-highlighted]')).toBeNull()
    // A disabled item takes no hover focus.
    await pointer(item('paste'), 'pointermove')
    expect(document.activeElement).toBe(menu())
  })

  it('focus moves to a neighbour when the focused item is removed while open', async () => {
    await render({ defaultOpen: true })
    await act(async () => item('delete').focus())
    await render({ defaultOpen: true, items: items.filter((entry) => (entry as { value?: string }).value !== 'delete') })
    expect(focused()).toBe('archive')
  })
})
