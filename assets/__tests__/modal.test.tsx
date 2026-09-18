import { act } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '../../Modal/Modal'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

function keyDown(node: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  node.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  )
}

function click(node: HTMLElement | null | undefined) {
  node?.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  )
}

describe('Modal controlled a11y baseline', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) =>
      window.clearTimeout(id),
    )
    ;({ host: container, root } = mount())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function getContent(): HTMLElement {
    const content = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="content"]',
    )
    expect(content).not.toBeNull()
    return content as HTMLElement
  }

  function getTrigger(): HTMLButtonElement {
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-scope="modal"][data-part="trigger"]',
    )
    expect(trigger).not.toBeNull()
    return trigger as HTMLButtonElement
  }

  function getBackdrop(): HTMLElement {
    const backdrop = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="backdrop"]',
    )
    expect(backdrop).not.toBeNull()
    return backdrop as HTMLElement
  }

  it('syncs controlled open state to dialog roles and labelled content', async () => {
    await act(async () => {
      root.render(
        <Modal
          open
          title="Account settings"
          description="Update workspace preferences."
        >
          <button type="button">Secondary action</button>
        </Modal>,
      )
    })

    const content = getContent()
    const title = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="title"]',
    )
    const description = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="description"]',
    )
    const close = document.body.querySelector<HTMLButtonElement>(
      '[data-scope="modal"][data-part="close"]',
    )

    expect(content.hidden).toBe(false)
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.getAttribute('aria-modal')).toBe('true')
    expect(content.getAttribute('data-state')).toBe('open')
    expect(content.getAttribute('data-variant')).toBe('center')
    expect(title?.textContent).toBe('Account settings')
    expect(description?.textContent).toBe('Update workspace preferences.')
    expect(content.getAttribute('aria-labelledby')).toBe(title?.id)
    expect(content.getAttribute('aria-describedby')).toBe(description?.id)
    expect(close?.type).toBe('button')
    expect(close?.hidden).toBe(false)
  })

  it('hands focus into an opened dialog and restores the trigger on Escape', async () => {
    const onOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Modal
          trigger="Open settings"
          title="Settings"
          description="Edit settings."
          onOpenChange={onOpenChange}
        >
          <button type="button">Inside action</button>
        </Modal>,
      )
    })

    const trigger = getTrigger()

    await act(async () => {
      trigger.focus()
      click(trigger)
    })
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    const content = getContent()
    const close = document.body.querySelector<HTMLButtonElement>(
      '[data-scope="modal"][data-part="close"]',
    )

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(content.hidden).toBe(false)
    expect(content.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(close)
    expect(onOpenChange).toHaveBeenCalledWith({ open: true })

    await act(async () => {
      keyDown(content, 'Escape')
    })

    expect(content.hidden).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(onOpenChange).toHaveBeenCalledWith({ open: false })
  })

  it('contains Tab and Shift+Tab focus inside open content', async () => {
    await act(async () => {
      root.render(
        <Modal
          open
          title="Focus test"
          actions={[
            { label: 'Cancel', variant: 'outline' },
            { label: 'Save', variant: 'accent' },
          ]}
        >
          <input aria-label="Name" defaultValue="Ada" />
          <button type="button">Inline action</button>
        </Modal>,
      )
    })

    const content = getContent()
    const close = document.body.querySelector<HTMLButtonElement>(
      '[data-scope="modal"][data-part="close"]',
    )
    const buttons = Array.from(
      content.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
    )
    const lastButton = buttons[buttons.length - 1]

    expect(close).not.toBeNull()
    expect(lastButton?.textContent).toBe('Save')

    await act(async () => {
      lastButton.focus()
      keyDown(lastButton, 'Tab')
    })

    expect(document.activeElement).toBe(close)

    await act(async () => {
      keyDown(close as HTMLButtonElement, 'Tab', { shiftKey: true })
    })

    expect(document.activeElement).toBe(lastButton)
  })

  it('renders primitive body copy through Text and keeps footer actions grouped at the end', async () => {
    await act(async () => {
      root.render(
        <Modal
          open
          title="Create workspace"
          actions={[
            { label: 'Cancel', variant: 'outline' },
            { label: 'Create', variant: 'accent' },
          ]}
        >
          Review the workspace details before creating it.
        </Modal>,
      )
    })

    const content = getContent()
    const body = content.querySelector<HTMLElement>('.uf-modal-body')
    const bodyText = body?.querySelector<HTMLElement>('[data-scope="text"]')
    const footer = content.querySelector<HTMLElement>('.uf-modal-actionsBar')
    const actions = footer?.querySelector<HTMLElement>('[data-part="actions"]')
    const buttons = Array.from(
      actions?.querySelectorAll<HTMLButtonElement>(
        'button[data-scope="button"][data-part="root"]',
      ) ?? [],
    )

    expect(bodyText?.textContent).toContain('Review the workspace details')
    expect(bodyText?.getAttribute('data-membrane')).not.toBeNull()
    expect(bodyText?.getAttribute('data-inset')).toBe('control')
    expect(footer?.getAttribute('data-align')).toBe('end')
    expect(actions?.getAttribute('data-align')).toBe('end')
    expect(
      buttons.map((button) => button.getAttribute('data-variant')),
    ).toEqual(['outline', 'accent'])
  })

  it('keeps non-closable alertdialog open on Escape and backdrop click', async () => {
    const onOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Modal
          trigger="Open alert"
          role="alertdialog"
          title="Delete locked project"
          description="Owner approval is required."
          closable={false}
          onOpenChange={onOpenChange}
        >
          <button type="button">Acknowledge</button>
        </Modal>,
      )
    })

    const trigger = getTrigger()

    await act(async () => {
      click(trigger)
    })

    const content = getContent()
    const backdrop = getBackdrop()
    const close = document.body.querySelector<HTMLButtonElement>(
      '[data-scope="modal"][data-part="close"]',
    )

    expect(content.hidden).toBe(false)
    expect(content.getAttribute('role')).toBe('alertdialog')
    expect(close).toBeNull()

    await act(async () => {
      keyDown(content, 'Escape')
      click(backdrop)
    })

    expect(content.hidden).toBe(false)
    expect(backdrop.hidden).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(onOpenChange).toHaveBeenCalledWith({ open: true })
    expect(onOpenChange).not.toHaveBeenCalledWith({ open: false })
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Modal opens from trigger and closes from close button', async () => {
    await act(async () => {
      root.render(
        <Modal trigger="Open modal" title="Smoke modal">
          Modal content
        </Modal>,
      )
    })

    const trigger = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Open modal'),
    )
    const content = document.body.querySelector(
      '[data-scope="modal"][data-part="content"]',
    ) as HTMLElement | null

    expect(trigger).not.toBeNull()
    expect(content?.hidden).toBe(true)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(false)
    expect(document.body.textContent).toContain('Smoke modal')

    const closeButton = document.body.querySelector(
      '[data-scope="modal"][data-part="close"]',
    ) as HTMLButtonElement | null
    expect(closeButton).not.toBeNull()

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(true)
  })

  it('Modal renders as a bounded open dialog without compatibility aliases', async () => {
    await act(async () => {
      root.render(
        <Modal open portal={false} title="Preview modal">
          Visible preview content
        </Modal>,
      )
    })

    const content = container.querySelector(
      '[data-scope="modal"][data-part="content"]',
    ) as HTMLElement | null
    const runtimeSource = readFileSync(
      join(process.cwd(), 'uf.runtime.ts'),
      'utf8',
    )
    expect(content).not.toBeNull()
    expect(content?.hidden).toBe(false)
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.getAttribute('data-card-variant')).toBe('default')
    expect(content?.getAttribute('data-border')).toBe('true')
    expect(content?.getAttribute('data-radius')).toBe('lg')
    expect(container.textContent).toContain('Preview modal')
    expect(container.textContent).toContain('Visible preview content')
    expect(runtimeSource).toContain("'Modal'")
  })

  it('Modal keeps inset edge surfaces rounded and bordered', async () => {
    await act(async () => {
      root.render(
        <Modal open portal={false} placement="bottom" title="Bottom modal">
          Modal content
        </Modal>,
      )
    })

    const content = container.querySelector(
      '[data-scope="modal"][data-part="content"]',
    ) as HTMLElement | null
    expect(content).not.toBeNull()
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.classList.contains('uf-modal--edge-inset')).toBe(true)
    expect(content?.getAttribute('data-edge')).toBe('inset')
    expect(content?.getAttribute('data-card-variant')).toBe('default')
    expect(content?.getAttribute('data-border')).toBe('true')
    expect(content?.getAttribute('data-radius')).toBe('lg')
  })

  it('Modal disables the Card border for flush square edge surfaces', async () => {
    await act(async () => {
      root.render(
        <Modal
          open
          portal={false}
          placement="right"
          edge="flush"
          title="Right modal"
        >
          Modal content
        </Modal>,
      )
    })

    const content = container.querySelector(
      '[data-scope="modal"][data-part="content"]',
    ) as HTMLElement | null
    expect(content).not.toBeNull()
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.classList.contains('uf-modal--edge-flush')).toBe(true)
    expect(content?.getAttribute('data-radius')).toBe('none')
    expect(content?.getAttribute('data-edge')).toBe('flush')
    expect(content?.getAttribute('data-border')).toBe('false')
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

  it('Modal edge placement contains focus and restores trigger focus', async () => {
    await act(async () => {
      root.render(
        <Modal
          trigger="Open inspector"
          title="Responsive inspector"
          placement="right"
          edge="flush"
          actions={[
            { label: 'Cancel', variant: 'outline' },
            { label: 'Save', variant: 'accent' },
          ]}
        >
          <button type="button">Inner action</button>
        </Modal>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('Open inspector'),
      ) ?? null
    expect(trigger).not.toBeNull()

    trigger?.focus()
    expect(document.activeElement).toBe(trigger)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialog = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="content"]',
    )
    const positioner = document.body.querySelector<HTMLElement>(
      '[data-scope="modal"][data-part="positioner"]',
    )
    const buttons = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>('button') || [],
    )
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const close =
      dialog?.querySelector<HTMLButtonElement>('[data-part="close"]') ?? null

    expect(dialog?.hidden).toBe(false)
    expect(dialog?.getAttribute('data-edge')).toBe('flush')
    expect(positioner?.getAttribute('data-variant')).toBe('right')
    expect(dialog?.contains(document.activeElement)).toBe(true)
    expect(close).toBe(first)
    expect(last?.textContent).toContain('Save')

    last?.focus()
    const forwardTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      last?.dispatchEvent(forwardTab)
    })
    expect(forwardTab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)

    first?.focus()
    const backwardTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      first?.dispatchEvent(backwardTab)
    })
    expect(backwardTab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)

    await act(async () => {
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(
      document.body.querySelector<HTMLElement>(
        '[data-scope="modal"][data-part="content"]',
      )?.hidden,
    ).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps center placement centered on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Modal trigger="Open modal" title="Responsive modal">
          Body
        </Modal>,
      )
    })

    const trigger =
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Open modal'),
      ) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const positioner = document.body.querySelector(
      '[data-scope="modal"][data-part="positioner"]',
    ) as HTMLElement | null
    expect(positioner?.getAttribute('data-variant')).toBe('center')
  })
})
