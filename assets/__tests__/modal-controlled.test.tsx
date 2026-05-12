// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '../../Modal/Modal'

function keyDown(node: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
}

function click(node: HTMLElement | null | undefined) {
  node?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

describe('Modal controlled a11y baseline', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0)
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
    delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  function getContent(): HTMLElement {
    const content = container.querySelector<HTMLElement>('[data-scope="modal"][data-part="content"]')
    expect(content).not.toBeNull()
    return content as HTMLElement
  }

  function getTrigger(): HTMLButtonElement {
    const trigger = container.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="trigger"]')
    expect(trigger).not.toBeNull()
    return trigger as HTMLButtonElement
  }

  function getBackdrop(): HTMLElement {
    const backdrop = container.querySelector<HTMLElement>('[data-scope="modal"][data-part="backdrop"]')
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
          variant="center"
          surface="dialog"
        >
          <button type="button">Secondary action</button>
        </Modal>,
      )
    })

    const content = getContent()
    const title = container.querySelector<HTMLElement>('[data-scope="modal"][data-part="title"]')
    const description = container.querySelector<HTMLElement>('[data-scope="modal"][data-part="description"]')
    const close = container.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')

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
          surface="dialog"
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
    const close = container.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')

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
          surface="dialog"
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
    const close = container.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')
    const buttons = Array.from(content.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
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

  it('keeps non-closable alertdialog open on Escape and backdrop click', async () => {
    const onOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Modal
          trigger="Open alert"
          title="Delete locked project"
          description="Owner approval is required."
          closable={false}
          surface="dialog"
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
    const close = container.querySelector<HTMLButtonElement>('[data-scope="modal"][data-part="close"]')

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
