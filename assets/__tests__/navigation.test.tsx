import { act, createRef, StrictMode, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Navigation,
  type NavigationItem,
  type NavigationProps,
} from '../../Navigation/Navigation'
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
  vi.useRealTimers()
})

const ITEMS: NavigationItem[] = [
  { value: 'home', label: 'Home', href: '#home' },
  {
    value: 'products',
    label: 'Products',
    items: [
      { value: 'fonts', label: 'Fonts', href: '#fonts' },
      { value: 'off', label: 'Retired', href: '#retired', disabled: true },
      {
        type: 'group',
        label: 'Services',
        items: [
          { value: 'hosting', label: 'Hosting' },
          { value: 'support', label: 'Support', href: '#support' },
        ],
      },
    ],
  },
  { value: 'docs', label: 'Docs' },
  { value: 'about', label: 'About', items: [{ value: 'team', label: 'Team' }] },
]

const show = (ui: ReactNode) =>
  act(async () => root.render(<StrictMode>{ui}</StrictMode>))
const render = (props: Partial<NavigationProps> = {}) =>
  show(<Navigation surface="inline" items={ITEMS} {...props} />)
const byValue = (value: string) =>
  host.querySelector<HTMLElement>(
    `:is([data-part="link"], [data-part="trigger"])[data-value="${value}"]`,
  )!
const trigger = (value: string) =>
  host.querySelector<HTMLButtonElement>(`[data-part="trigger"][data-value="${value}"]`)!
const content = (value: string) =>
  document.getElementById(trigger(value).getAttribute('aria-controls')!)!
const click = (node: Element) => act(async () => (node as HTMLElement).click())
const focus = (node: HTMLElement) => act(async () => node.focus())
const press = (key: string, init: KeyboardEventInit = {}) =>
  act(async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    )
  })
const pointer = (node: Element, type: 'pointerover' | 'pointerout', pointerType = 'mouse') =>
  act(async () => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    node.dispatchEvent(event)
  })
const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms))
const current = () =>
  host.querySelector('[aria-current="page"]')?.getAttribute('data-value') ?? null
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')
const sheetTrigger = () => host.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!

// ---------------------------------------------------------------------------
// State contracts

describeControlled<string | null>({
  name: 'Navigation',
  prop: 'value',
  values: ['home', 'docs'],
  render: (props) => <Navigation surface="inline" items={ITEMS} {...props} />,
  change: (host, to) =>
    host.querySelector<HTMLElement>(`[data-part="link"][data-value="${to}"]`)!.click(),
  read: (host) =>
    host.querySelector('[aria-current="page"]')?.getAttribute('data-value') ?? null,
  normalizes: ['missing', null],
})

describeControlled<boolean>({
  name: 'Navigation',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Navigation surface="sheet" aria-label="Main" items={ITEMS} {...props} />
  ),
  change: (host, to) => {
    if (to) host.querySelector<HTMLElement>('[aria-haspopup="dialog"]')!.click()
    else document.querySelector<HTMLElement>('[data-scope="modal"][data-part="close"]')!.click()
  },
  read: (host) =>
    host.querySelector('[aria-haspopup="dialog"]')!.getAttribute('aria-expanded') === 'true',
})

describeRoving({
  name: 'Navigation bar',
  render: ({ items }) => <Navigation surface="inline" items={items} />,
  items: (host) =>
    Array.from(host.querySelectorAll<HTMLElement>('.uf-navigation-list > li > .uf-membrane > *')),
  orientation: 'horizontal',
  tabStops: 'all',
  loop: false,
})

// ---------------------------------------------------------------------------
// Items

describe('Navigation items', () => {
  it('value marks the current page with aria-current="page"; a dropdown item is never current itself', async () => {
    await render({ value: 'fonts' })
    expect(current()).toBe('fonts')
    expect(trigger('products').hasAttribute('aria-current')).toBe(false)
    expect(trigger('products').hasAttribute('data-current')).toBe(true)
    expect(trigger('about').hasAttribute('data-current')).toBe(false)
    await render({ value: 'products' })
    expect(current()).toBe(null)
  })

  it('onValueChange reports each activation of another item once, from the bar and from a dropdown', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'home', onValueChange })
    await click(byValue('home'))
    await click(byValue('docs'))
    await click(trigger('products'))
    await click(byValue('hosting'))
    expect(onValueChange.mock.calls.map(([details]) => details)).toEqual([
      { value: 'docs' },
      { value: 'hosting' },
    ])
    expect(current()).toBe('hosting')
  })

  it('href renders a real link; without href the item is a button', async () => {
    await render()
    expect(byValue('home').localName).toBe('a')
    expect(byValue('home').getAttribute('href')).toBe('#home')
    expect(byValue('docs').localName).toBe('button')
    expect(byValue('docs').getAttribute('type')).toBe('button')
  })

  it('onClick receives the click first; preventDefault() cancels only the link navigation', async () => {
    const order: string[] = []
    let event: MouseEvent | undefined
    await render({
      items: [
        {
          value: 'home',
          label: 'Home',
          href: '#elsewhere',
          onClick: (e) => {
            order.push('onClick')
            e.preventDefault()
            event = e.nativeEvent
          },
        },
      ],
      onValueChange: () => order.push('onValueChange'),
    })
    await click(byValue('home'))
    expect(order).toEqual(['onClick', 'onValueChange'])
    expect(event?.defaultPrevented).toBe(true)
    expect(current()).toBe('home')
  })

  it('disabled keeps an item visible but inert: no href, no onClick, no change, skipped by keys', async () => {
    const onClick = vi.fn()
    const onValueChange = vi.fn()
    await render({
      items: [
        { value: 'a', label: 'A', href: '#a', disabled: true, onClick },
        { value: 'b', label: 'B', disabled: true, onClick },
        { value: 'c', label: 'C', disabled: true, items: [{ value: 'x', label: 'X' }] },
      ],
      onValueChange,
    })
    expect(byValue('a').hasAttribute('href')).toBe(false)
    expect(byValue('a').getAttribute('aria-disabled')).toBe('true')
    expect((byValue('b') as HTMLButtonElement).disabled).toBe(true)
    expect(trigger('c').disabled).toBe(true)
    await click(byValue('a'))
    await click(byValue('b'))
    await click(trigger('c'))
    expect(onClick).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger('c').getAttribute('aria-expanded')).toBe('false')
  })

  it('icon renders at the start of the label; a string names a registry icon', async () => {
    await render({ items: [{ value: 'a', label: 'A', icon: 'home' }] })
    const icon = byValue('a').firstElementChild!
    expect(icon.getAttribute('data-part')).toBe('icon')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.querySelector('svg[data-icon="home"]')).not.toBeNull()
  })

  it('an item with items ignores its href and reports it', async () => {
    await expectDevError(
      () =>
        render({
          items: [{ value: 'p', label: 'P', href: '#p', items: [{ value: 'x', label: 'X' }] }],
        }),
      /^Face UI Navigation: invalid items\[\]\.href "#p"; ignoring it: "p" opens a dropdown\.$/,
    )
    expect(trigger('p').localName).toBe('button')
    expect(trigger('p').hasAttribute('href')).toBe(false)
  })

  it('a group inside a dropdown is a list named by its label', async () => {
    await render()
    const list = content('products').querySelector('ul[aria-labelledby]')!
    expect(document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe('Services')
    expect(list.querySelectorAll('[data-part="link"]')).toHaveLength(2)
  })

  it('invalid and repeated items are dropped with a report; rendering never throws', async () => {
    await expectDevError(
      () =>
        render({
          items: [
            { value: 'a', label: 'A' },
            { value: 'a', label: 'Again' },
          ],
        }),
      /^Face UI Navigation: invalid items\[1\] key "a"; dropping the duplicate\.$/,
    )
    expect(host.querySelectorAll('[data-part="link"]')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Disclosure navigation (APG): buttons open dropdowns of links

describe('Navigation dropdowns', () => {
  it('a dropdown item is a disclosure button: aria-expanded, aria-controls and a hidden list until opened', async () => {
    await render()
    const button = trigger('products')
    expect(button.localName).toBe('button')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(content('products').hidden).toBe(true)
    expect(host.querySelector('[role="menu"], [role="menubar"], [role="menuitem"]')).toBeNull()
    await click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(content('products').hidden).toBe(false)
    await click(button)
    expect(content('products').hidden).toBe(true)
  })

  it('one dropdown is open at a time', async () => {
    await render()
    await click(trigger('products'))
    await click(trigger('about'))
    expect(content('products').hidden).toBe(true)
    expect(content('about').hidden).toBe(false)
  })

  it('Down and Up on a closed trigger open it at the first or last enabled link', async () => {
    await render()
    await focus(trigger('products'))
    await press('ArrowDown')
    expect(document.activeElement).toBe(byValue('fonts'))
    await press('Escape')
    expect(content('products').hidden).toBe(true)
    expect(document.activeElement).toBe(trigger('products'))
    await press('ArrowUp')
    expect(document.activeElement).toBe(byValue('support'))
  })

  it('Down on an open trigger moves into its links; arrows, Home and End move between enabled links without wrapping', async () => {
    await render()
    await click(trigger('products'))
    await focus(trigger('products'))
    await press('ArrowDown')
    expect(document.activeElement).toBe(byValue('fonts'))
    await press('ArrowDown')
    expect(document.activeElement).toBe(byValue('hosting'))
    await press('End')
    expect(document.activeElement).toBe(byValue('support'))
    await press('ArrowDown')
    expect(document.activeElement).toBe(byValue('support'))
    await press('Home')
    expect(document.activeElement).toBe(byValue('fonts'))
    await press('ArrowUp')
    expect(document.activeElement).toBe(byValue('fonts'))
  })

  it('Escape from a link closes the dropdown and returns focus to its button', async () => {
    await render()
    await focus(trigger('products'))
    await press('ArrowDown')
    await press('Escape')
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger('products'))
  })

  it('focus leaving the item closes its dropdown; Tab from the button enters the open links first', async () => {
    await render()
    await click(trigger('products'))
    const links = Array.from(content('products').querySelectorAll<HTMLElement>('[data-part="link"]'))
    expect(links.map((link) => link.tabIndex)).toEqual([0, -1, 0, 0])
    await focus(byValue('fonts'))
    expect(content('products').hidden).toBe(false)
    await focus(byValue('docs'))
    expect(content('products').hidden).toBe(true)
    expect(document.activeElement).toBe(byValue('docs'))
  })

  it('a click on a dropdown that hover opened keeps it open; the next click closes it', async () => {
    vi.useFakeTimers()
    await render()
    await pointer(trigger('products').closest('li')!, 'pointerover')
    await advance(200)
    expect(content('products').hidden).toBe(false)
    await click(trigger('products'))
    expect(content('products').hidden).toBe(false)
    await click(trigger('products'))
    expect(content('products').hidden).toBe(true)
  })

  it('a press outside closes the dropdown without moving focus', async () => {
    const outside = document.body.appendChild(document.createElement('button'))
    await render()
    await click(trigger('products'))
    await act(async () => {
      const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      outside.dispatchEvent(event)
      outside.focus()
    })
    expect(content('products').hidden).toBe(true)
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('activating a link closes the dropdown and makes the link current', async () => {
    await render()
    await click(trigger('products'))
    await click(byValue('fonts'))
    expect(content('products').hidden).toBe(true)
    expect(current()).toBe('fonts')
  })

  it("a dropdown item's onClick receives its click before the dropdown toggles", async () => {
    const seen: boolean[] = []
    await render({
      items: [
        {
          value: 'p',
          label: 'P',
          onClick: () => seen.push(trigger('p').getAttribute('aria-expanded') === 'true'),
          items: [{ value: 'x', label: 'X' }],
        },
      ],
    })
    await click(trigger('p'))
    expect(seen).toEqual([false])
    expect(trigger('p').getAttribute('aria-expanded')).toBe('true')
  })

  it('hover opens after a pause and closes after leaving; moving onto the dropdown keeps it', async () => {
    vi.useFakeTimers()
    await render()
    const item = trigger('products').closest('li')!
    await pointer(item, 'pointerover')
    await advance(150)
    expect(content('products').hidden).toBe(true)
    await advance(50)
    expect(content('products').hidden).toBe(false)
    await pointer(item, 'pointerout')
    await advance(100)
    await pointer(item, 'pointerover')
    await advance(500)
    expect(content('products').hidden).toBe(false)
    await pointer(item, 'pointerout')
    await advance(150)
    expect(content('products').hidden).toBe(true)
  })

  it('touch, a disabled item and keyboard focus do not open by hover', async () => {
    vi.useFakeTimers()
    await render({
      items: [
        ...ITEMS,
        { value: 'locked', label: 'Locked', disabled: true, items: [{ value: 'x', label: 'X' }] },
      ],
    })
    await pointer(trigger('products').closest('li')!, 'pointerover', 'touch')
    await pointer(trigger('locked').closest('li')!, 'pointerover')
    await focus(trigger('about'))
    await advance(1000)
    expect(host.querySelectorAll('[data-part="content"]:not([hidden])')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Surfaces, sheet and naming

describe('Navigation surfaces', () => {
  it('surface="auto" shows the bar at 900px and up, and a sheet trigger below', async () => {
    media = installMatchMedia(false)
    await show(<Navigation items={ITEMS} />)
    expect(host.querySelector('.uf-navigation-list')).not.toBeNull()
    media.setMatches(true)
    await act(async () => media!.dispatchChange())
    expect(host.querySelector('.uf-navigation-list')).toBeNull()
    expect(sheetTrigger()).not.toBeNull()
  })

  it('surface="inline" keeps the bar and surface="sheet" the trigger at any width', async () => {
    media = installMatchMedia(true)
    await render()
    expect(host.querySelector('.uf-navigation-list')).not.toBeNull()
    media.setMatches(false)
    await show(<Navigation surface="sheet" items={ITEMS} />)
    expect(host.querySelector('.uf-navigation-list')).toBeNull()
    expect(sheetTrigger()).not.toBeNull()
  })

  it('the sheet is a modal bottom sheet listing links, with dropdowns as named sections', async () => {
    await show(<Navigation surface="sheet" aria-label="Main" items={ITEMS} />)
    await click(sheetTrigger())
    const sheet = dialog()!
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(sheet.getAttribute('data-variant')).toBe('bottom')
    expect(sheet.querySelector('a[href="#fonts"]')).not.toBeNull()
    const section = sheet.querySelector<HTMLElement>('ul[aria-labelledby]')!
    expect(document.getElementById(section.getAttribute('aria-labelledby')!)?.textContent).toBe('Products')
    expect(sheet.contains(document.activeElement)).toBe(true)
  })

  it('activating a link in the sheet makes it current and closes the sheet', async () => {
    const onOpenChange = vi.fn()
    await show(<Navigation surface="sheet" aria-label="Main" items={ITEMS} onOpenChange={onOpenChange} />)
    await click(sheetTrigger())
    await click(dialog()!.querySelector('[data-part="link"][data-value="hosting"]')!)
    expect(onOpenChange.mock.calls.map(([details]) => details)).toEqual([{ open: true }, { open: false }])
    await click(sheetTrigger())
    expect(dialog()!.querySelector('[aria-current="page"]')?.getAttribute('data-value')).toBe('hosting')
  })

  it('aria-label names the landmark and titles the sheet; without it the sheet is named by its trigger', async () => {
    await show(<Navigation surface="sheet" aria-label="Main" items={ITEMS} />)
    expect(host.querySelector('nav')!.getAttribute('aria-label')).toBe('Main')
    await click(sheetTrigger())
    const titled = dialog()!
    expect(document.getElementById(titled.getAttribute('aria-labelledby')!)?.textContent).toBe('Main')
    await show(<Navigation surface="sheet" items={ITEMS} labels={{ open: 'Menu' }} />)
    await click(sheetTrigger())
    expect(document.getElementById(dialog()!.getAttribute('aria-labelledby')!)).toBe(sheetTrigger())
  })

  it('labels.open names the default trigger and labels.close the sheet close button; missing keys keep defaults', async () => {
    await show(<Navigation surface="sheet" items={ITEMS} labels={{ open: 'Menü' }} />)
    expect(sheetTrigger().getAttribute('aria-label')).toBe('Menü')
    await click(sheetTrigger())
    expect(document.querySelector('[data-scope="modal"][data-part="close"]')!.getAttribute('aria-label')).toBe('Close')
    await show(<Navigation surface="sheet" items={ITEMS} labels={{ close: 'Schließen' }} />)
    expect(sheetTrigger().getAttribute('aria-label')).toBe('Open navigation')
    expect(document.querySelector('[data-scope="modal"][data-part="close"]')!.getAttribute('aria-label')).toBe('Schließen')
  })

  it('trigger replaces the default button and keeps its own props', async () => {
    const onClick = vi.fn()
    await show(
      <Navigation
        surface="sheet"
        items={ITEMS}
        trigger={
          <button type="button" className="mine" onClick={onClick}>
            Menu
          </button>
        }
      />,
    )
    const button = host.querySelector<HTMLButtonElement>('button.mine')!
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    await click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(dialog()).not.toBeNull()
  })

  it('leaving the sheet surface closes an uncontrolled sheet', async () => {
    media = installMatchMedia(true)
    const onOpenChange = vi.fn()
    await show(<Navigation items={ITEMS} aria-label="Main" onOpenChange={onOpenChange} />)
    await click(sheetTrigger())
    media.setMatches(false)
    await act(async () => media!.dispatchChange())
    media.setMatches(true)
    await act(async () => media!.dispatchChange())
    expect(sheetTrigger().getAttribute('aria-expanded')).toBe('false')
    expect(onOpenChange.mock.calls.map(([details]) => details)).toEqual([{ open: true }])
  })

  it('native attributes, className and ref go on the <nav> landmark on both surfaces', async () => {
    for (const surface of ['inline', 'sheet'] as const) {
      const ref = createRef<HTMLElement>()
      await show(
        <Navigation
          ref={ref}
          surface={surface}
          items={ITEMS}
          id="site"
          className="mine"
          data-testid="nav"
          aria-label="Site"
          style={{ color: 'red' }}
        />,
      )
      const nav = host.querySelector('nav')!
      expect(ref.current).toBe(nav)
      expect(nav.id).toBe('site')
      expect(nav.className).toBe('uf-navigation mine')
      expect(nav.getAttribute('data-testid')).toBe('nav')
      expect(nav.getAttribute('aria-label')).toBe('Site')
      expect(nav.style.color).toBe('red')
      expect(nav.getAttribute('data-surface')).toBe(surface)
    }
  })
})
