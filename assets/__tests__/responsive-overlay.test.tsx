// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Command } from '../../Command/Command'
import { Date } from '../../Date/Date'
import { Menu } from '../../Menu/Menu'
import { Modal } from '../../Modal/Modal'
import { Navigation } from '../../Navigation/Navigation'
import { Panel } from '../../Panel/Panel'
import { Select } from '../../Select/Select'

interface MatchMediaStub {
  matches: boolean
  listeners: Set<(event: MediaQueryListEvent) => void>
}

function installMatchMedia(matches: boolean): () => void {
  const original = window.matchMedia
  const stub: MatchMediaStub = {
    matches,
    listeners: new Set(),
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: stub.matches,
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.delete(listener)
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.add(listener)
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }))

  return () => {
    window.matchMedia = original
  }
}

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: (() => void) | null

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
    container.remove()
  })

  it('Select switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector('[data-part="content"]') as HTMLElement | null
    const backdrop = container.querySelector('.uf-responsive-overlay-backdrop') as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(backdrop?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Select option')

    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(true)
  })

  it('Date switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(<Date />)
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector('[data-part="content"]') as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Choose date')
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

    const trigger = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Open menu')) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector('[data-scope="menu"][data-part="content"]') as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Open menu')
  })

  it('allows forcing desktop popover surfaces on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          surface="popover"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector('[data-part="content"]') as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(container.querySelector('.uf-responsive-overlay-backdrop')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Command switches auto surfaces to a dialog on compact viewports', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          items={[
            { id: 'copy', label: 'Copy' },
            { id: 'paste', label: 'Paste' },
            { id: 'cut', label: 'Cut' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    expect(container.querySelector('[role="combobox"]')).toBeNull()

    const trigger = container.querySelector('.uf-command__trigger') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const input = container.querySelector('[role="combobox"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Command')

    const pasteButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-command-item')).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(pasteButton).not.toBeNull()

    await act(async () => {
      pasteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.uf-command__dialog[data-state=\"open\"]')).toBeNull()
  })

  it('Panel switches auto surfaces to a left drawer on compact viewports', async () => {
    await act(async () => {
      root.render(<Panel items={[]} previewPreset="workspace" />)
    })

    const trigger = container.querySelector('.uf-sidebar-sheetTrigger button') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = container.querySelector('.uf-sidebar-sheet') as HTMLElement | null
    expect(panel?.getAttribute('data-placement')).toBe('left')
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Navigation switches auto surfaces to a selection sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={[
            { id: 'home', label: 'Home' },
            { id: 'library', label: 'Library', items: [{ id: 'typefaces', label: 'Typefaces' }] },
          ]}
        />,
      )
    })

    const trigger = container.querySelector('.uf-navigation-sheetTrigger button') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = container.querySelector('.uf-navigation-sheet') as HTMLElement | null
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(container.textContent).toContain('Navigation')
    expect(container.textContent).toContain('Typefaces')
  })

  it('Modal switches auto center surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Modal
          trigger="Open modal"
          title="Responsive modal"
          surface="auto"
          variant="center"
        >
          Body
        </Modal>,
      )
    })

    const trigger = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Open modal')) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const positioner = container.querySelector('[data-part="positioner"]') as HTMLElement | null
    expect(positioner?.getAttribute('data-variant')).toBe('bottom')
  })
})
