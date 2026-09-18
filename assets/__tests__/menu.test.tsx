import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Button } from '../../Button/Button'
import { Menu } from '../../Menu/Menu'
import { Popover } from '../../Popover/Popover'
import { libraryCss, mount } from './harness'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { interpret } from '../create-machine'
import { connectMenu, menuMachine } from '../machines/menu.machine'

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

  it('Menu switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste' },
          ]}
        >
          Open menu
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Open menu')
  })

  it('Menu binds popup semantics and keyboard handlers to the focusable child trigger', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste' },
          ]}
        >
          <Button fullWidth={false} membrane={false}>Open menu</Button>
        </Menu>,
      )
    })

    const wrapper = container.querySelector(
      '.uf-menu-trigger',
    ) as HTMLElement | null
    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(wrapper).not.toBeNull()
    expect(trigger).not.toBeNull()
    expect(wrapper).toBe(trigger)
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('aria-controls')).toBeTruthy()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    const controlledContent = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    )
    expect(controlledContent?.getAttribute('data-scope')).toBe('menu')
    expect(controlledContent?.hidden).toBe(false)
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(controlledContent?.hidden).toBe(true)
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('Menu applies explicit popover alignment, trigger offset, and membrane surface', async () => {
    await act(async () => {
      root.render(
        <Menu
          surface="popover"
          align="start"
          sideOffset={4}
          items={[{ value: 'copy', label: 'Copy' }]}
        >
          <Button fullWidth={false} membrane={false}>Open menu</Button>
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const triggerAnchor = container.querySelector(
      '.uf-menu-trigger',
    ) as HTMLElement | null
    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(trigger).not.toBeNull()
    expect(triggerAnchor).not.toBeNull()
    expect(content).not.toBeNull()

    Object.defineProperty(triggerAnchor, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 40,
        right: 180,
        bottom: 72,
        left: 100,
        width: 80,
        height: 32,
        x: 100,
        y: 40,
        toJSON: () => {},
      }),
    })
    Object.defineProperty(content, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 0,
        right: 0,
        bottom: 100,
        left: 0,
        width: 160,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    })

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.style.left).toBe('100px')
    expect(content?.style.top).toBe('76px')

    const membrane = content?.querySelector(
      '.uf-menu-contentMembrane',
    ) as HTMLElement | null
    const panel = content?.querySelector(
      '.uf-menu-contentPanel',
    ) as HTMLElement | null
    expect(membrane).not.toBeNull()
    expect(membrane?.classList.contains('uf-membrane')).toBe(true)
    expect(membrane?.classList.contains('uf-membrane--full')).toBe(true)
    expect(panel?.getAttribute('data-scope')).toBe('card')
    expect(panel?.getAttribute('data-card-variant')).toBe('default')
    expect(panel?.getAttribute('data-padding')).toBe('membrane')
    expect(panel?.hasAttribute('data-full-width')).toBe(true)

    const componentStyles = libraryCss()
    const menuPanelBlock =
      componentStyles.match(/\.uf-menu-contentPanel\s*\{[^}]*\}/)?.[0] ?? ''
    expect(menuPanelBlock).not.toContain('max-height')
  })

  it('Menu dismisses on outside pointerdown before bubbled events can be stopped', async () => {
    await act(async () => {
      root.render(
        <>
          <Menu surface="popover" items={[{ value: 'copy', label: 'Copy' }]}>
            <Button fullWidth={false} membrane={false}>Open menu</Button>
          </Menu>
          <button
            type="button"
            data-testid="outside-stop"
            onPointerDown={(event) => event.stopPropagation()}
          >
            Outside
          </button>
        </>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const outside = container.querySelector(
      '[data-testid="outside-stop"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)

    await act(async () => {
      outside?.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.hidden).toBe(true)
  })

  it('Menu dismisses on outside click when pointerdown is not delivered', async () => {
    await act(async () => {
      root.render(
        <>
          <Menu surface="popover" items={[{ value: 'copy', label: 'Copy' }]}>
            <Button fullWidth={false} membrane={false}>Open menu</Button>
          </Menu>
          <button type="button" data-testid="outside-click">
            Outside
          </button>
        </>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    const outside = container.querySelector(
      '[data-testid="outside-click"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)

    await act(async () => {
      outside?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(content?.hidden).toBe(true)
  })

  it('Menu keeps context trigger behavior in the React adapter', async () => {
    await act(async () => {
      root.render(
        <Menu
          trigger="context"
          surface="popover"
          items={[{ value: 'inspect', label: 'Inspect' }]}
        >
          <Button fullWidth={false} membrane={false}>Context target</Button>
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Context target'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await Promise.resolve()
    })

    const content = document.body.querySelector(
      '[data-scope="menu"][data-part="content"]',
    ) as HTMLElement | null
    expect(content?.hidden).toBe(false)
    expect(content?.textContent).toContain('Inspect')
  })

  it('Menu roves focus across enabled items and selects highlighted items from the keyboard', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            { value: 'paste', label: 'Paste', disabled: true },
            { value: 'delete', label: 'Delete' },
          ]}
          onSelect={handleSelect}
        >
          <Button fullWidth={false} membrane={false}>Open menu</Button>
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    let highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    const disabledItem =
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      ).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(highlighted?.textContent).toContain('Copy')
    expect(document.activeElement).toBe(highlighted)
    expect(disabledItem?.disabled).toBe(true)

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')
    expect(document.activeElement).toBe(highlighted)

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Copy')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      )
    })
    expect(
      container.querySelector<HTMLElement>(
        '[data-scope="menu"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
    expect(handleSelect).not.toHaveBeenCalled()

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'd' }),
      )
    })
    highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Delete')

    await act(async () => {
      highlighted?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: ' ' }),
      )
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenLastCalledWith({ value: 'delete' })
    expect(
      container.querySelector<HTMLElement>(
        '[data-scope="menu"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
  })

  it('Menu typeahead uses textValue for custom group item labels', async () => {
    await act(async () => {
      root.render(
        <Menu
          items={[
            { value: 'copy', label: 'Copy' },
            {
              type: 'group',
              label: 'More',
              items: [
                {
                  value: 'preferences',
                  label: (
                    <span aria-label="Preferences">
                      <span aria-hidden="true">#</span>
                    </span>
                  ),
                  textValue: 'Preferences',
                },
              ],
            },
          ]}
        >
          <Button fullWidth={false} membrane={false}>Open menu</Button>
        </Menu>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open menu'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector<HTMLElement>(
      '[data-scope="menu"][data-part="content"]',
    )
    expect(content?.hidden).toBe(false)

    await act(async () => {
      content?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'p' }),
      )
    })

    const highlighted = container.querySelector<HTMLElement>(
      '[role="menuitem"][data-highlighted]',
    )
    expect(highlighted?.dataset.value).toBe('preferences')
  })
})

describe('keyboard machine fidelity', () => {
  it('menu roves highlighted items across enabled menuitems', () => {
    const selectedValues: string[] = []
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'paste', 'delete', 'archive'],
      disabledValues: ['paste'],
      itemLabels: {
        copy: 'Copy',
        paste: 'Paste',
        delete: 'Delete',
        archive: 'Archive',
      },
      onSelect: ({ value }) => selectedValues.push(value),
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delete')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'NAVIGATE_DOWN' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_UP' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'NAVIGATE_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'NAVIGATE_LAST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('archive')

    svc.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(selectedValues).toEqual(['archive'])
    svc.stop()
  })

  it('menu typeahead highlights enabled items by label and resets on dismiss', () => {
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'paste', 'preferences', 'delete'],
      disabledValues: ['paste'],
      itemLabels: {
        copy: 'Copy',
        paste: 'Paste',
        preferences: 'Preferences',
        delete: 'Delete',
      },
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'TYPEAHEAD', key: 'p', now: 100 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('preferences')

    svc.send({ type: 'TYPEAHEAD', key: 'd', now: 1000 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delete')

    svc.send({ type: 'DISMISS' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(svc.getSnapshot().context.highlightedValue).toBeNull()
    expect(svc.getSnapshot().context.typeaheadQuery).toBe('')
    svc.stop()
  })

  it('menu typeahead keeps value fallback when label metadata is absent', () => {
    const svc = interpret(menuMachine, {
      itemOrder: ['copy', 'custom-action'],
      disabledValues: [],
    }).start()

    svc.send({ type: 'OPEN' })
    svc.send({ type: 'TYPEAHEAD', key: 'c', now: 100 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('copy')

    svc.send({ type: 'TYPEAHEAD', key: 'c', now: 1000 })
    expect(svc.getSnapshot().context.highlightedValue).toBe('custom-action')
    svc.stop()
  })
})

describe('§5 #11: Escape belongs to the layer stack', () => {
  it('the menu content leaves Escape unhandled', () => {
    const svc = interpret(menuMachine, { itemOrder: ['copy'] }).start()
    svc.send({ type: 'OPEN_FIRST' })
    const send = vi.fn()
    const preventDefault = vi.fn()
    connectMenu(svc.getSnapshot(), send)
      .getContentProps()
      .onKeyDown({ key: 'Escape', preventDefault } as never)
    expect(send).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
    svc.stop()
  })

  it('Escape closes a menu inside a popover one layer at a time and returns focus', async () => {
    const { root } = mount()
    const onOpenChange = vi.fn()
    await act(async () =>
      root.render(
        <Popover
          defaultOpen
          onOpenChange={onOpenChange}
          content={
            <Menu surface="popover" items={[{ value: 'copy', label: 'Copy' }]}>
              More
            </Menu>
          }
        >
          <button>Share</button>
        </Popover>,
      ),
    )
    const trigger = document.querySelector<HTMLElement>('.uf-menu-trigger')!
    await act(async () => trigger.focus())
    await act(async () => {
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      )
    })
    const escape = () =>
      act(async () => {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        )
      })
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    expect(menu.contains(document.activeElement)).toBe(true)
    await escape()
    expect(menu.hidden).toBe(true)
    expect(document.activeElement).toBe(trigger)
    expect(onOpenChange).not.toHaveBeenCalled()
    await escape()
    expect(onOpenChange).toHaveBeenCalledWith({ open: false })
  })
})
