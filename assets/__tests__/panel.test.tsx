import { act, createRef, StrictMode, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Panel, type PanelItem, type PanelProps } from '../../Panel/Panel'
import { expectDevError, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { describeRoving } from './harness/roving'

let host: HTMLDivElement, root: Root
let media: MatchMediaRestore | null = null
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  media?.()
  media = null
})

const ITEMS: PanelItem[] = [
  { value: 'overview', label: 'Overview', icon: 'home', href: '#overview' },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'settings',
    items: [
      { value: 'profile', label: 'Profile', href: '#profile' },
      {
        value: 'billing',
        label: 'Billing',
        items: [{ value: 'invoices', label: 'Invoices' }],
      },
    ],
  },
  { value: 'files', label: 'Files', icon: 'folder' },
]

const show = (ui: ReactNode) =>
  act(async () => root.render(<StrictMode>{ui}</StrictMode>))
const render = (props: Partial<PanelProps> = {}) =>
  show(<Panel surface="inline" items={ITEMS} {...props} />)
const row = (value: string, scope: ParentNode = host) =>
  scope.querySelector<HTMLElement>(
    `:is([data-part="link"], [data-part="trigger"])[data-value="${value}"]`,
  )
const nav = () => host.querySelector('nav')!
const toggle = () => host.querySelector<HTMLButtonElement>('.uf-sidebar-toggleButton')
const click = (node: Element) => act(async () => (node as HTMLElement).click())
const current = (scope: ParentNode = host) =>
  scope.querySelector('[aria-current="page"]')?.getAttribute('data-value') ?? null
const expandedGroups = (scope: ParentNode = host) =>
  Array.from(scope.querySelectorAll('[data-part="trigger"][aria-expanded="true"]')).map(
    (node) => node.getAttribute('data-value'),
  )
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')
const sheetTrigger = () => host.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!

// ---------------------------------------------------------------------------
// State contracts

describeControlled<string | null>({
  name: 'Panel',
  prop: 'value',
  values: ['overview', 'files'],
  render: (props) => <Panel surface="inline" items={ITEMS} {...props} />,
  change: (host, to) =>
    host.querySelector<HTMLElement>(`[data-part="link"][data-value="${to}"]`)!.click(),
  read: (host) =>
    host.querySelector('[aria-current="page"]')?.getAttribute('data-value') ?? null,
  normalizes: ['missing', null],
})

describeControlled<readonly string[]>({
  name: 'Panel',
  prop: 'expanded',
  values: [[], ['settings']],
  render: (props) => <Panel surface="inline" items={ITEMS} {...props} />,
  change: (host) =>
    host.querySelector<HTMLElement>('[data-part="trigger"][data-value="settings"]')!.click(),
  read: (host) =>
    Array.from(host.querySelectorAll('[data-part="trigger"][aria-expanded="true"]')).map(
      (node) => node.getAttribute('data-value')!,
    ),
})

describeControlled<boolean>({
  name: 'Panel',
  prop: 'collapsed',
  values: [false, true],
  render: (props) => <Panel surface="inline" items={ITEMS} {...props} />,
  change: (host) => host.querySelector<HTMLElement>('.uf-sidebar-toggleButton')!.click(),
  read: (host) => host.querySelector('nav')!.getAttribute('data-state') === 'collapsed',
})

describeControlled<boolean>({
  name: 'Panel',
  prop: 'open',
  values: [false, true],
  render: (props) => <Panel surface="sheet" aria-label="Workspace" items={ITEMS} {...props} />,
  change: (host, to) => {
    if (to) host.querySelector<HTMLElement>('[aria-haspopup="dialog"]')!.click()
    else document.querySelector<HTMLElement>('[data-scope="modal"][data-part="close"]')!.click()
  },
  read: (host) =>
    host.querySelector('[aria-haspopup="dialog"]')!.getAttribute('aria-expanded') === 'true',
})

describeRoving({
  name: 'Panel rows',
  render: ({ items }) => <Panel surface="inline" collapsible={false} items={items} />,
  items: (host) =>
    Array.from(host.querySelectorAll<HTMLElement>('.uf-sidebar-content > li > .uf-membrane > *')),
  orientation: 'vertical',
  tabStops: 'all',
  loop: false,
})

// ---------------------------------------------------------------------------
// Rows

describe('Panel rows', () => {
  it('value marks the current row with aria-current="page"; a group is never current itself', async () => {
    await render({ value: 'profile' })
    expect(current()).toBe('profile')
    expect(row('settings')!.hasAttribute('aria-current')).toBe(false)
    await render({ value: 'settings' })
    expect(current()).toBe(null)
    expect(host.querySelector('[aria-pressed], [aria-selected]')).toBeNull()
  })

  it('onValueChange reports each activation of another row once', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'overview', onValueChange })
    await click(row('overview')!)
    await click(row('files')!)
    expect(onValueChange.mock.calls.map(([details]) => details)).toEqual([{ value: 'files' }])
  })

  it('href renders a real link; without href the row is a button', async () => {
    await render()
    expect(row('overview')!.localName).toBe('a')
    expect(row('overview')!.getAttribute('href')).toBe('#overview')
    expect(row('files')!.localName).toBe('button')
  })

  it('onClick receives the click first; preventDefault() cancels only the link navigation', async () => {
    const order: string[] = []
    let prevented = false
    await render({
      items: [
        {
          value: 'a',
          label: 'A',
          href: '#a',
          onClick: (event) => {
            order.push('onClick')
            event.preventDefault()
            prevented = event.defaultPrevented
          },
        },
      ],
      onValueChange: () => order.push('onValueChange'),
    })
    await click(row('a')!)
    expect(order).toEqual(['onClick', 'onValueChange'])
    expect(prevented).toBe(true)
    expect(current()).toBe('a')
  })

  it('disabled keeps a row visible but inert', async () => {
    const onClick = vi.fn()
    const onValueChange = vi.fn()
    await render({
      items: [
        { value: 'a', label: 'A', href: '#a', disabled: true, onClick },
        { value: 'b', label: 'B', disabled: true, onClick },
      ],
      onValueChange,
    })
    expect(row('a')!.hasAttribute('href')).toBe(false)
    expect(row('a')!.getAttribute('aria-disabled')).toBe('true')
    expect((row('b') as HTMLButtonElement).disabled).toBe(true)
    await click(row('a')!)
    await click(row('b')!)
    expect(onClick).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('icon renders at the start of the row; a string names a registry icon', async () => {
    await render()
    const icon = row('overview')!.firstElementChild!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.querySelector('svg[data-icon="home"]')).not.toBeNull()
  })

  it('nesting indents rows by level', async () => {
    await render({ defaultExpanded: ['settings', 'billing'] })
    const level = (value: string) =>
      row(value)!.style.getPropertyValue('--face-runtime-option-level')
    expect([level('overview'), level('profile'), level('invoices')]).toEqual(['0', '1', '2'])
  })

  it('a group ignores its href and reports it', async () => {
    await expectDevError(
      () => render({ items: [{ value: 'g', label: 'G', href: '#g', items: [{ value: 'x', label: 'X' }] }] }),
      /^Face UI Panel: invalid items\[\]\.href "#g"; ignoring it: "g" is a group\.$/,
    )
    expect(row('g')!.localName).toBe('button')
  })

  it('invalid and repeated items are dropped with a report; rendering never throws', async () => {
    await expectDevError(
      () => render({ items: [{ value: 'a', label: 'A' }, { value: 'a', label: 'Again' }] }),
      /^Face UI Panel: invalid items\[1\] key "a"; dropping the duplicate\.$/,
    )
    expect(host.querySelectorAll('[data-part="link"]')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Groups

describe('Panel groups', () => {
  it('a group button shows its rows only while expanded, and aria-expanded tells the truth', async () => {
    await render({ defaultExpanded: [] })
    const group = row('settings')!
    expect(group.getAttribute('aria-expanded')).toBe('false')
    expect(row('profile')).toBeNull()
    await click(group)
    expect(group.getAttribute('aria-expanded')).toBe('true')
    const list = document.getElementById(group.getAttribute('aria-controls')!)!
    expect(list.contains(row('profile'))).toBe(true)
    await click(group)
    expect(group.getAttribute('aria-expanded')).toBe('false')
    expect(row('profile')).toBeNull()
  })

  it('onExpandedChange reports each toggle once with a fresh list', async () => {
    const onExpandedChange = vi.fn()
    await render({ defaultExpanded: [], onExpandedChange })
    await click(row('settings')!)
    await click(row('billing')!)
    await click(row('settings')!)
    expect(onExpandedChange.mock.calls.map(([details]) => details)).toEqual([
      { expanded: ['settings'] },
      { expanded: ['settings', 'billing'] },
      { expanded: ['billing'] },
    ])
  })

  it('without defaultExpanded, the groups holding the current row start expanded', async () => {
    await render({ defaultValue: 'invoices' })
    expect(expandedGroups()).toEqual(['settings', 'billing'])
    expect(current()).toBe('invoices')
    await show(<Panel surface="inline" items={ITEMS} defaultValue="files" key="other" />)
    expect(expandedGroups()).toEqual([])
  })

  it('a collapsed group holding the current row is marked data-current', async () => {
    await render({ value: 'profile', defaultExpanded: [] })
    expect(row('settings')!.hasAttribute('data-current')).toBe(true)
    await click(row('settings')!)
    expect(row('settings')!.hasAttribute('data-current')).toBe(false)
  })

  it('expanded shows the rows of known groups only; unknown values show nothing', async () => {
    await render({ expanded: ['billing', 'missing'] })
    expect(row('invoices')).toBeNull()
    await render({ expanded: ['settings', 'billing'] })
    expect(row('invoices')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rail

describe('Panel rail', () => {
  it('width sizes the expanded panel and collapsedWidth the rail; numbers are pixels', async () => {
    await render({ width: 280, collapsedWidth: '4rem' })
    expect(nav().style.width).toBe('280px')
    await click(toggle()!)
    expect(nav().style.width).toBe('4rem')
    await show(<Panel key="fill" surface="inline" items={ITEMS} width="100%" />)
    expect(nav().style.width).toBe('100%')
  })

  it('collapsed hides labels visually but keeps them as accessible names, and hides group rows', async () => {
    await render({ defaultCollapsed: true, defaultExpanded: ['settings'] })
    const label = row('overview')!.querySelector('[data-part="label"]')!
    expect(label.className).toBe('uf-visually-hidden')
    expect(row('overview')!.textContent).toBe('Overview')
    expect(row('settings')!.getAttribute('aria-expanded')).toBe('false')
    expect(row('profile')).toBeNull()
  })

  it('a group in the rail opens the panel at that group', async () => {
    const onCollapsedChange = vi.fn()
    const onExpandedChange = vi.fn()
    await render({ defaultCollapsed: true, defaultExpanded: [], onCollapsedChange, onExpandedChange })
    await click(row('settings')!)
    expect(onCollapsedChange.mock.calls.map(([details]) => details)).toEqual([{ collapsed: false }])
    expect(onExpandedChange.mock.calls.map(([details]) => details)).toEqual([{ expanded: ['settings'] }])
    expect(nav().getAttribute('data-state')).toBe('expanded')
    expect(row('profile')).not.toBeNull()
  })

  it('labels.expand and labels.collapse name the rail toggle', async () => {
    await render({ labels: { expand: 'Aufklappen', collapse: 'Zuklappen' } })
    expect(toggle()!.getAttribute('aria-label')).toBe('Zuklappen')
    await click(toggle()!)
    expect(toggle()!.getAttribute('aria-label')).toBe('Aufklappen')
  })

  it('collapsible={false} removes the toggle and leaves collapsing to collapsed', async () => {
    await render({ collapsible: false })
    expect(toggle()).toBeNull()
    expect(host.querySelector('[data-part="header"]')).toBeNull()
    await show(<Panel key="rail" surface="inline" items={ITEMS} collapsible={false} collapsed />)
    expect(nav().getAttribute('data-state')).toBe('collapsed')
  })

  it('there is no hidden keyboard shortcut: "[" leaves the panel as it is', async () => {
    await render()
    await act(async () => {
      row('files')!.focus()
      row('files')!.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true }))
    })
    expect(nav().getAttribute('data-state')).toBe('expanded')
    expect(host.querySelector('[data-part="footer"]')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Surfaces

describe('Panel surfaces', () => {
  it('surface="auto" is inline at 900px and up and a sheet trigger below; inline and sheet are fixed', async () => {
    media = installMatchMedia(false)
    await show(<Panel items={ITEMS} />)
    expect(host.querySelector('.uf-sidebar-content')).not.toBeNull()
    media.setMatches(true)
    await act(async () => media!.dispatchChange())
    expect(host.querySelector('.uf-sidebar-content')).toBeNull()
    expect(sheetTrigger()).not.toBeNull()
    await render()
    expect(host.querySelector('.uf-sidebar-content')).not.toBeNull()
    media.setMatches(false)
    await show(<Panel surface="sheet" items={ITEMS} />)
    expect(host.querySelector('.uf-sidebar-content')).toBeNull()
  })

  it('the sheet is a modal drawer at the start edge that never collapses', async () => {
    await show(<Panel surface="sheet" aria-label="Workspace" defaultCollapsed items={ITEMS} />)
    await click(sheetTrigger())
    const sheet = dialog()!
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(sheet.getAttribute('data-variant')).toBe('start')
    expect(sheet.querySelector('.uf-sidebar-toggleButton')).toBeNull()
    expect(row('overview', sheet)!.querySelector('.uf-sidebar-itemLabel')).not.toBeNull()
    expect(sheet.contains(document.activeElement)).toBe(true)
  })

  it('activating a row in the sheet makes it current and closes it; toggling a group keeps it open', async () => {
    const onOpenChange = vi.fn()
    await show(
      <Panel surface="sheet" aria-label="Workspace" items={ITEMS} defaultExpanded={[]} onOpenChange={onOpenChange} />,
    )
    await click(sheetTrigger())
    await click(row('settings', dialog()!)!)
    expect(row('profile', dialog()!)).not.toBeNull()
    await click(row('profile', dialog()!)!)
    expect(onOpenChange.mock.calls.map(([details]) => details)).toEqual([{ open: true }, { open: false }])
    await click(sheetTrigger())
    expect(current(dialog()!)).toBe('profile')
  })

  it('aria-label names the landmark and titles the sheet; labels.open and labels.close name its buttons', async () => {
    await show(<Panel surface="sheet" aria-label="Workspace" items={ITEMS} labels={{ open: 'Menü', close: 'Schließen' }} />)
    expect(nav().getAttribute('aria-label')).toBe('Workspace')
    expect(sheetTrigger().getAttribute('aria-label')).toBe('Menü')
    await click(sheetTrigger())
    expect(document.getElementById(dialog()!.getAttribute('aria-labelledby')!)?.textContent).toBe('Workspace')
    expect(document.querySelector('[data-scope="modal"][data-part="close"]')!.getAttribute('aria-label')).toBe('Schließen')
    await show(<Panel surface="sheet" items={ITEMS} />)
    await click(sheetTrigger())
    expect(document.getElementById(dialog()!.getAttribute('aria-labelledby')!)).toBe(sheetTrigger())
  })

  it('trigger replaces the default button and keeps its own props', async () => {
    const onClick = vi.fn()
    await show(<Panel surface="sheet" items={ITEMS} trigger={<button type="button" className="mine" onClick={onClick}>Menu</button>} />)
    const button = host.querySelector<HTMLButtonElement>('button.mine')!
    await click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('native attributes, className, style and ref go on the <nav> landmark on both surfaces', async () => {
    for (const surface of ['inline', 'sheet'] as const) {
      const ref = createRef<HTMLElement>()
      await show(
        <Panel
          ref={ref}
          surface={surface}
          items={ITEMS}
          id="side"
          className="mine"
          data-testid="panel"
          aria-label="Sections"
          style={{ color: 'red' }}
        />,
      )
      expect(ref.current).toBe(nav())
      expect(nav().id).toBe('side')
      expect(nav().className).toBe('uf-sidebar mine')
      expect(nav().getAttribute('data-testid')).toBe('panel')
      expect(nav().getAttribute('aria-label')).toBe('Sections')
      expect(nav().style.color).toBe('red')
    }
  })
})
