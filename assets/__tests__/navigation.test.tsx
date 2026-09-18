import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Navigation, type NavigationItem } from '../../Navigation/Navigation'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { interpret } from '../create-machine'
import { navigationMachine } from '../machines/navigation.machine'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Navigation changes the active item in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Navigation
          defaultActiveId="home"
          items={[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'contact', label: 'Contact' },
          ]}
        />,
      )
    })

    const about =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('About'),
      ) ?? null
    expect(about).not.toBeNull()
    expect(about?.getAttribute('data-variant')).toBe('ghost')

    await act(async () => {
      about?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(about?.getAttribute('data-variant')).toBe('default')
  })
})

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: MatchMediaRestore | null

  beforeEach(() => {
    ;({ host: container, root } = mount())
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(() => {
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
  })

  it('Navigation switches auto surfaces to a selection sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={[
            { id: 'home', label: 'Home' },
            {
              id: 'library',
              label: 'Library',
              items: [{ id: 'typefaces', label: 'Typefaces' }],
            },
          ]}
        />,
      )
    })

    const trigger = container.querySelector(
      '.uf-navigation-sheetTrigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = document.body.querySelector(
      '.uf-navigation-sheet',
    ) as HTMLElement | null
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(panel?.textContent).toContain('Navigation')
    expect(panel?.textContent).toContain('Typefaces')
  })
})

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home' },
  {
    id: 'library',
    label: 'Library',
    items: [
      { id: 'typefaces', label: 'Typefaces', href: '#typefaces' },
      { id: 'components', label: 'Components' },
    ],
  },
  { id: 'disabled', label: 'Disabled', disabled: true },
  { id: 'settings', label: 'Settings' },
]

function keyDown(node: HTMLElement, key: string) {
  node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('Accordion and Navigation disclosure a11y baseline', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  function getNavTrigger(id: string): HTMLElement {
    const trigger = container.querySelector<HTMLElement>(
      `[role="menuitem"][data-scope="navigation"][data-part="trigger"][data-value="${id}"]`,
    )
    expect(trigger).not.toBeNull()
    return trigger as HTMLElement
  }

  function getNavContent(id: string): HTMLElement {
    const content = container.querySelector<HTMLElement>(
      `[role="menu"][data-scope="navigation"][data-part="content"][data-value="${id}"]`,
    )
    expect(content).not.toBeNull()
    return content as HTMLElement
  }

  it('wires Navigation menubar relationships and roves focus around disabled items', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={navigationItems}
          defaultActiveId="home"
          surface="inline"
        />,
      )
    })

    const navigation = container.querySelector<HTMLElement>(
      '[role="navigation"][data-scope="navigation"][data-part="root"]',
    )
    const menubar = container.querySelector<HTMLElement>(
      '[role="menubar"][data-scope="navigation"][data-part="list"]',
    )
    const home = getNavTrigger('home')
    const library = getNavTrigger('library')
    const disabled = getNavTrigger('disabled') as HTMLButtonElement
    const settings = getNavTrigger('settings')
    const libraryMenu = getNavContent('library')

    expect(navigation).not.toBeNull()
    expect(navigation?.getAttribute('aria-orientation')).toBeNull()
    expect(menubar).not.toBeNull()
    expect(menubar?.getAttribute('aria-orientation')).toBe('horizontal')
    expect(home.tabIndex).toBe(0)
    expect(library.tabIndex).toBe(-1)
    expect(disabled.tabIndex).toBe(-1)
    expect(settings.tabIndex).toBe(-1)
    expect(library.getAttribute('aria-haspopup')).toBe('menu')
    expect(library.getAttribute('aria-expanded')).toBe('false')
    expect(libraryMenu.hidden).toBe(true)

    await act(async () => {
      home.focus()
      keyDown(home, 'ArrowRight')
    })

    expect(library.tabIndex).toBe(0)
    expect(disabled.tabIndex).toBe(-1)

    await act(async () => {
      keyDown(library, 'ArrowRight')
    })

    expect(getNavTrigger('settings').tabIndex).toBe(0)
    expect(disabled.tabIndex).toBe(-1)
  })

  it('opens and closes Navigation dropdowns by keyboard and activates child links', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={navigationItems}
          defaultActiveId="home"
          surface="inline"
        />,
      )
    })

    const library = getNavTrigger('library')
    const libraryMenu = getNavContent('library')

    await act(async () => {
      library.focus()
      keyDown(library, 'Enter')
      // JSDOM does not synthesize native button clicks from keyboard events.
      library.click()
    })

    const typefaces = container.querySelector<HTMLAnchorElement>(
      'a[data-scope="navigation"][data-part="link"][data-value="typefaces"]',
    )
    const components = container.querySelector<HTMLButtonElement>(
      'button[data-scope="navigation"][data-part="link"][data-value="components"]',
    )

    expect(library.getAttribute('aria-expanded')).toBe('true')
    expect(libraryMenu.hidden).toBe(false)
    expect(typefaces).not.toBeNull()
    expect(typefaces?.getAttribute('role')).toBe('menuitem')
    expect(typefaces?.getAttribute('aria-current')).toBeNull()
    expect(components).not.toBeNull()
    expect(components?.getAttribute('role')).toBe('menuitem')

    await act(async () => {
      typefaces?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('false')
    expect(getNavContent('library').hidden).toBe(true)
    expect(
      container
        .querySelector<HTMLAnchorElement>('a[data-value="typefaces"]')
        ?.getAttribute('aria-current'),
    ).toBe('page')

    await act(async () => {
      keyDown(getNavTrigger('library'), 'ArrowDown')
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('true')
    expect(getNavContent('library').hidden).toBe(false)

    await act(async () => {
      keyDown(getNavContent('library'), 'Escape')
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('false')
    expect(getNavContent('library').hidden).toBe(true)
  })
})

describe('keyboard machine fidelity', () => {
  it('navigation roves top-level focus with arrow keys', () => {
    const svc = interpret(navigationMachine, {
      itemOrder: ['home', 'docs', 'pricing'],
      disabledIds: ['docs'],
      activeId: 'home',
    }).start()

    svc.send({ type: 'NAVIGATE_NEXT' })
    expect(svc.getSnapshot().context.focusedId).toBe('pricing')

    svc.send({ type: 'NAVIGATE_PREV' })
    expect(svc.getSnapshot().context.focusedId).toBe('home')
    svc.stop()
  })
})
