import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Icon } from '../../Icon/Icon'
import { Panel } from '../../Panel/Panel'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Panel renders product navigation items and changes selection', async () => {
    await act(async () => {
      root.render(
        <Panel
          surface="inline"
          defaultSelectedId="overview"
          items={[
            {
              id: 'overview',
              label: 'Overview',
              icon: 'layout-sidebar-left-open',
            },
            { id: 'projects', label: 'Projects', icon: 'folder' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
          ]}
        />,
      )
    })

    expect(container.textContent).toContain('Overview')
    expect(container.textContent).toContain('Projects')
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.uf-sidebar-itemButton'),
    )
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.getAttribute('data-selected')).toBe('')
    expect(
      buttons[0]?.querySelector('svg[data-icon="layout-sidebar-left-open"]'),
    ).not.toBeNull()

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buttons[0]?.getAttribute('data-selected')).toBeNull()
    expect(buttons[1]?.getAttribute('data-selected')).toBe('')
  })

  it('Panel items API renders rows as system buttons with membranes and nesting levels', async () => {
    await act(async () => {
      root.render(
        <Panel
          surface="inline"
          defaultSelectedId="leaf"
          items={[
            {
              id: 'parent',
              label: 'Parent',
              icon: <Icon name="folder" />,
              items: [{ id: 'child', label: 'Child' }],
            },
            {
              id: 'leaf',
              label: 'Leaf',
              icon: <Icon name="component" />,
            },
          ]}
        />,
      )
    })

    const rows = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.uf-sidebar-itemButton'),
    )
    expect(rows).toHaveLength(3)
    expect(
      rows.every((row) => row.getAttribute('data-scope') === 'button'),
    ).toBe(true)
    expect(
      rows.every((row) => row.parentElement?.classList.contains('uf-membrane')),
    ).toBe(true)
    expect(rows[0]?.getAttribute('data-selector')).toBe('')
    expect(rows[1]?.style.getPropertyValue('--face-runtime-option-level')).toBe(
      '1',
    )
    expect(rows[2]?.getAttribute('data-selected')).toBe('')
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

  it('Panel switches auto surfaces to a left drawer on compact viewports', async () => {
    await act(async () => {
      root.render(<Panel items={[]} />)
    })

    const trigger = container.querySelector(
      '.uf-sidebar-sheetTrigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const panel = document.body.querySelector(
      '.uf-sidebar-sheet',
    ) as HTMLElement | null
    expect(panel?.getAttribute('data-placement')).toBe('left')
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
  })
})
