import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Toast, createToastContext } from '../../Toast/Toast'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Toast renders a production notification surface without demo scaffolding', async () => {
    const onDismiss = vi.fn()
    await act(async () => {
      root.render(
        <Toast
          title="Deployment completed"
          description="Production is healthy."
          tone="positive"
          action={{ label: 'View release' }}
          onDismiss={onDismiss}
        />,
      )
    })

    const toast = container.querySelector<HTMLElement>(
      '.uf-toast[data-scope="toast"]',
    )
    const close = container.querySelector<HTMLButtonElement>('.uf-toast-close')
    const action =
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('View release'),
      ) ?? null

    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')
    expect(toast?.getAttribute('data-tone')).toBe('positive')
    expect(toast?.textContent).toContain('Deployment completed')
    expect(toast?.textContent).toContain('Production is healthy.')
    expect(container.querySelector('.uf-toast-demo')).toBeNull()
    expect(close).not.toBeNull()
    expect(action).not.toBeNull()
    await act(async () => {
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)

    const componentStyles = libraryCss()
    expect(componentStyles).toContain('z-index: var(--uf-z-toast);')
    expect(componentStyles).toContain(
      '.uf-toast[data-scope][data-tone="positive"]',
    )
  })
})

describe('data and feedback a11y characterization', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('exposes Toast live region, status item, title, description, action, and close semantics', async () => {
    const toastContext = createToastContext({ defaultDuration: 0 })
    const handleAction = vi.fn()

    await act(async () => {
      root.render(<toastContext.Toaster />)
    })

    await act(async () => {
      toastContext.toaster.toast({
        title: 'Saved',
        description: 'Changes are available to collaborators.',
        action: {
          label: 'Undo',
          onClick: handleAction,
        },
        duration: 0,
      })
    })

    const group = container.querySelector<HTMLElement>(
      '[data-scope="toast"][data-part="root"][role="region"]',
    )
    expect(group).not.toBeNull()
    expect(group?.getAttribute('aria-label')).toBe('Notifications')
    expect(group?.getAttribute('aria-live')).toBe('polite')
    expect(group?.getAttribute('data-count')).toBe('1')
    expect(group?.getAttribute('data-placement')).toBe('bottom-center')
    expect(group?.hasAttribute('data-membrane')).toBe(false)

    const toast = container.querySelector<HTMLElement>('.uf-toast')
    expect(toast).not.toBeNull()
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')

    expect(
      toast?.querySelector('[data-scope="toast"][data-part="title"]')
        ?.textContent,
    ).toBe('Saved')
    expect(
      toast?.querySelector('[data-scope="toast"][data-part="description"]')
        ?.textContent,
    ).toBe('Changes are available to collaborators.')

    const action = toast?.querySelector<HTMLButtonElement>(
      '[data-scope="toast"][data-part="action"]',
    )
    expect(action).not.toBeNull()
    expect(action?.tagName).toBe('BUTTON')
    expect(action?.getAttribute('type')).toBe('button')
    expect(action?.textContent).toBe('Undo')

    const close = toast?.querySelector<HTMLButtonElement>(
      '[data-scope="toast"][data-part="close"]',
    )
    expect(close).not.toBeNull()
    expect(close?.tagName).toBe('BUTTON')
    expect(close?.getAttribute('type')).toBe('button')
    expect(close?.getAttribute('aria-label')).toBe('Close notification')

    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.uf-toast')).toBeNull()
  })

  it('keeps Toast error variants non-blocking polite status messages', async () => {
    const toastContext = createToastContext({ defaultDuration: 0 })

    await act(async () => {
      root.render(<toastContext.Toaster />)
    })

    await act(async () => {
      toastContext.toaster.toast({
        title: 'Render failed',
        description: 'The preview kept the last stable frame.',
        tone: 'destructive',
        duration: 0,
      })
    })

    const group = container.querySelector<HTMLElement>(
      '[data-scope="toast"][data-part="root"][role="region"]',
    )
    const toast = container.querySelector<HTMLElement>('.uf-toast')

    expect(group?.getAttribute('aria-live')).toBe('polite')
    expect(toast).not.toBeNull()
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')
    expect(toast?.getAttribute('data-tone')).toBe('destructive')
    expect(toast?.textContent).toContain('Render failed')
    expect(toast?.textContent).toContain(
      'The preview kept the last stable frame.',
    )
  })

  it('allows the internal Toast dismiss button to be disabled', async () => {
    const toastContext = createToastContext({ defaultDuration: 0 })

    await act(async () => {
      root.render(<toastContext.Toaster dismissible={false} />)
    })

    await act(async () => {
      toastContext.toaster.toast({
        title: 'Background task unavailable',
        duration: 0,
      })
    })

    expect(container.querySelector('.uf-toast')).not.toBeNull()
    expect(
      container.querySelector('[data-scope="toast"][data-part="close"]'),
    ).toBeNull()
  })
})
