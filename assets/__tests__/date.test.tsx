import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Date as DateField } from '../../Date/Date'
import { libraryCss, mount } from './harness'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'

describe('Date component', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('renders and opens without crashing in the playground baseline state', async () => {
    await act(async () => {
      root.render(<DateField label="Date" placeholder="Pick date" />)
    })

    expect(container.textContent).toContain('Date')
    expect(container.textContent).toContain('Pick date')

    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    )
    expect(content?.hidden).toBe(false)
  })

  it('writes the picked date back into the trigger label', async () => {
    await act(async () => {
      root.render(<DateField label="Date" placeholder="Pick date" />)
    })

    const trigger = container.querySelector(
      'button',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Pick date')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dayButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.uf-date__content .uf-calendar-dayButton',
      ),
    )
    const selectableDay = dayButtons.find(
      (button) => button.getAttribute('data-disabled') == null,
    )
    expect(selectableDay).toBeTruthy()

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(trigger?.textContent).not.toContain('Pick date')
  })

  it('applies the public trigger format prop in Date', async () => {
    const fixedDate = new globalThis.Date(
      globalThis.Date.UTC(2026, 2, 6, 14, 35),
    )

    await act(async () => {
      root.render(
        <div>
          <DateField
            label="Report date"
            value={fixedDate}
            timezone="UTC"
            format="yyyy/MM/dd"
          />
          <DateField
            label="Published"
            mode="datetime"
            value={fixedDate}
            timezone="UTC"
            format="MMM dd, yyyy HH:mm"
          />
        </div>,
      )
    })

    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-scope="date"][data-part="trigger"]',
      ),
    )
    expect(triggers[0]?.textContent).toContain('2026/03/06')
    expect(triggers[1]?.textContent).toContain('Mar 06, 2026 14:35')
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

  it('Date switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(<DateField />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    const calendar = content?.querySelector(
      '.uf-calendar[data-scope="calendar"]',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(calendar).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    expect(content?.textContent).toContain('Choose date')

    const componentStyles = libraryCss()
    expect(componentStyles).toMatch(
      /\.uf-date__content\[data-surface="sheet"\] \.uf-date__grid,\s*\.uf-date__content\[data-surface="sheet"\] \.uf-calendar\[data-scope="calendar"\] \{\s*width: 100%;\s*inline-size: 100%;\s*min-inline-size: 0;\s*\}/,
    )
    expect(componentStyles).toContain(
      '.uf-date__content[data-surface="sheet"] .uf-date__grid > .uf-membrane',
    )
  })

  it('Date keeps auto surfaces as a popover on wide viewports', async () => {
    restoreMatchMedia?.setMatches(false)

    await act(async () => {
      root.render(<DateField />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(content?.hidden).toBe(false)
    expect(document.querySelector('.uf-responsive-overlay-backdrop')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(container.textContent).not.toContain('Choose date')
  })

  it('Date reevaluates auto surfaces after crossing the responsive breakpoint', async () => {
    await act(async () => {
      root.render(<DateField />)
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(document.body.style.overflow).toBe('hidden')

    restoreMatchMedia?.setMatches(false)

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(document.querySelector('.uf-responsive-overlay-backdrop')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    restoreMatchMedia?.setMatches(true)

    await act(async () => {
      restoreMatchMedia?.dispatchChange()
    })

    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(
      document.querySelector('.uf-responsive-overlay-backdrop'),
    ).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Date exposes visible label and keyboard dialog trigger semantics', async () => {
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <DateField
          label="Start date"
          placeholder="Pick start"
          required
          surface="popover"
          onOpenChange={handleOpenChange}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="date"][data-part="root"]',
    ) as HTMLElement | null
    const label = container.querySelector(
      '.uf-date__label',
    ) as HTMLLabelElement | null
    const trigger = container.querySelector(
      '[data-scope="date"][data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(rootNode?.getAttribute('data-mode')).toBe('date')
    expect(rootNode?.getAttribute('data-state')).toBe('closed')
    expect(label?.tagName).toBe('LABEL')
    expect(label?.textContent).toContain('Start date')
    expect(label?.textContent).toContain('*')
    expect(trigger?.type).toBe('button')
    expect(trigger?.getAttribute('role')).toBe('combobox')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.textContent).toContain('Pick start')
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
    expect(
      document.querySelector('[data-scope="date"][role="dialog"]'),
    ).toBeNull()

    const openEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      trigger?.dispatchEvent(openEvent)
    })

    expect(openEvent.defaultPrevented).toBe(true)
    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })
    expect(rootNode?.getAttribute('data-state')).toBe('open')
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    ) as HTMLElement | null
    expect(content?.getAttribute('role')).toBe('dialog')
    expect(
      document.getElementById(content?.getAttribute('aria-labelledby') ?? '')
        ?.textContent,
    ).toBe('Start date')
    expect(content?.hidden).toBe(false)

    const closeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      content?.dispatchEvent(closeEvent)
    })

    expect(closeEvent.defaultPrevented).toBe(true)
    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: false })
    expect(rootNode?.getAttribute('data-state')).toBe('closed')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(content?.isConnected).toBe(false)
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
  })
})
