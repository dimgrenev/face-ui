import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Tooltip } from '../../Tooltip/Tooltip'
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

  it('Tooltip exposes non-interactive tooltip semantics from the focusable trigger', async () => {
    await act(async () => {
      root.render(
        <Tooltip
          content="Exports the current report."
          openDelay={0}
          closeDelay={0}
        >
          Export
        </Tooltip>,
      )
    })

    const trigger = container.querySelector(
      '[data-scope="overlay"][data-part="trigger"]',
    ) as HTMLElement | null
    const button = trigger as HTMLButtonElement | null
    let content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(trigger).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Export')
    expect(trigger?.getAttribute('aria-expanded')).toBeNull()
    expect(content?.getAttribute('role')).toBe('tooltip')
    expect(content?.getAttribute('data-trigger')).toBe('hover')
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)

    await act(async () => {
      button?.focus()
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(document.activeElement).toBe(button)
    expect(trigger?.getAttribute('aria-describedby')).toBe(
      content?.id,
    )
    expect(content?.getAttribute('data-state')).toBe('open')
    expect(content?.hidden).toBe(false)

    await act(async () => {
      button?.blur()
    })

    content =
      Array.from(
        document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
      ).find((node) =>
        node.textContent?.includes('Exports the current report.'),
      ) ?? null

    expect(trigger?.getAttribute('aria-expanded')).toBeNull()
    expect(content?.getAttribute('data-state')).toBe('closed')
    expect(content?.hidden).toBe(true)
  })
})
