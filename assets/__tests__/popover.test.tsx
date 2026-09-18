import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Popover } from '../../Popover/Popover'
import { Modal } from '../../Modal/Modal'
import { Button } from '../../Button/Button'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

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

  it('Popover opens from its semantic trigger and focuses interactive content', async () => {
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Popover
          content={<button type="button">Popover action</button>}
          onOpenChange={handleOpenChange}
        >
          Open popover
        </Popover>,
      )
    })

    const trigger = container.querySelector(
      '[data-scope="overlay"][data-part="trigger"]',
    ) as HTMLElement | null
    const button = trigger as HTMLButtonElement | null
    let content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null
    const action = content?.querySelector('button') as HTMLButtonElement | null

    expect(trigger).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Open popover')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('data-state')).toBe('closed')
    expect(content?.getAttribute('data-trigger')).toBe('click')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
    expect(action?.textContent).toContain('Popover action')

    await act(async () => {
      button?.focus()
    })

    expect(document.activeElement).toBe(button)

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(trigger?.getAttribute('data-state')).toBe('open')
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hidden).toBe(false)
    expect(document.activeElement).toBe(action)

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) => node.textContent?.includes('Popover action')) ?? null

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: false })
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('data-state')).toBe('closed')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
    expect(document.activeElement).toBe(button)
  })

  it('a Button trigger inside a Modal keeps exactly one active membrane', async () => {
    await act(async () => {
      root.render(
        <Modal open title="Parent">
          <Popover aria-label="Parent options" content={<Button text="Popover action" />}>
            <Button text="Open popover" />
          </Popover>
        </Modal>,
      )
    })
    const trigger = [...document.querySelectorAll('[role="dialog"] button')].find(
      (node) => node.textContent?.includes('Open popover'),
    )!
    let active = 0
    for (let node = trigger.parentElement; node && node.getAttribute('role') !== 'dialog'; node = node.parentElement)
      if (node.matches('.uf-membrane:not([data-membrane-disabled])')) active++
    expect(active).toBe(1)
  })
})
