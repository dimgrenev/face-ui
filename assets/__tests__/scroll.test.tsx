import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Scroll } from '../../Scroll/Scroll'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Scroll exposes a focusable labelled region with a contextual aria label', async () => {
    await act(async () => {
      root.render(
        <Scroll orientation="both" height="12rem" ariaLabel="Token audit log">
          <div>Audit row</div>
        </Scroll>,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="scroll"][data-part="root"]',
    ) as HTMLElement | null
    const viewport = container.querySelector(
      '[data-scope="scroll"][data-part="viewport"]',
    ) as HTMLElement | null

    expect(rootNode?.getAttribute('data-orientation')).toBe('both')
    expect(rootNode?.style.height).toBe('12rem')
    expect(viewport?.getAttribute('role')).toBe('region')
    expect(viewport?.getAttribute('aria-label')).toBe('Token audit log')
    expect(viewport?.tabIndex).toBe(0)
    expect(viewport?.style.overflowX).toBe('auto')
    expect(viewport?.style.overflowY).toBe('auto')
  })

  it('Scroll renders plain content through a membraned Text surface inside the scroll card', async () => {
    await act(async () => {
      root.render(
        <Scroll ariaLabel="Literary excerpt">
          Вечером в доме стало тихо.
        </Scroll>,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="scroll"][data-part="root"]',
    ) as HTMLElement | null
    const text = container.querySelector(
      '[data-scope="text"].uf-scroll__text',
    ) as HTMLElement | null
    const membrane = container.querySelector(
      '[data-scope="scroll"] [data-part="viewport"] > .uf-membrane.uf-membrane--full',
    ) as HTMLElement | null
    const componentStyles = libraryCss()

    expect(rootNode?.style.height).toBe('240px')
    expect(rootNode?.getAttribute('data-border')).toBe('true')
    expect(membrane).not.toBeNull()
    expect(text?.getAttribute('data-membrane')).toBe('')
    expect(text?.getAttribute('data-inset')).toBe('control')
    expect(text?.textContent).toBe('Вечером в доме стало тихо.')
    const componentTokens = readFileSync(
      join(process.cwd(), 'assets/styles/component-tokens.css'),
      'utf8',
    )
    expect(componentTokens).toContain(
      '--uf-scroll-card-inset: var(--uf-card-padding-default);',
    )
    expect(componentStyles).toContain('padding: var(--uf-scroll-card-inset);')
  })
})
