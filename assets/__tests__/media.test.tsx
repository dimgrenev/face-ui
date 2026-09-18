import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Media } from '../../Media/Media'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Media defaults to iframe-width layout with auto image height', async () => {
    await act(async () => {
      root.render(<Media src="https://example.com/image.jpg" alt="Preview" />)
    })

    const media = container.querySelector(
      '[data-scope="media"][data-part="root"]',
    ) as HTMLElement | null
    const img = container.querySelector('img') as HTMLImageElement | null
    const componentStyles = libraryCss()
    expect(media).not.toBeNull()
    expect(media?.style.width).toBe('100%')
    expect(img).not.toBeNull()
    expect(img?.style.width).toBe('100%')
    expect(img?.style.height).toBe('auto')
    expect(componentStyles).toContain('.uf-media[data-scope] {')
    expect(componentStyles).toContain('display: flex;')
    expect(componentStyles).toContain('width: 100%;')
    const runtimeSource = readFileSync(
      join(process.cwd(), 'uf.runtime.ts'),
      'utf8',
    )
    expect(runtimeSource).toContain("'Media'")
  })

  it('Media exposes wrapper aria-label when a role is provided', async () => {
    await act(async () => {
      root.render(
        <Media
          src="https://example.com/image.jpg"
          alt="Preview"
          role="img"
          ariaLabel="Architecture preview"
        />,
      )
    })

    const media = container.querySelector(
      '[data-scope="media"][data-part="root"]',
    ) as HTMLElement | null
    const img = container.querySelector('img') as HTMLImageElement | null
    expect(media?.getAttribute('role')).toBe('img')
    expect(media?.getAttribute('aria-label')).toBe('Architecture preview')
    expect(img?.getAttribute('alt')).toBe('Preview')
  })

  it('Media can opt into the system membrane without forcing it by default', async () => {
    await act(async () => {
      root.render(
        <>
          <Media src="https://example.com/default.jpg" alt="Default media" />
          <Media
            src="https://example.com/membrane.jpg"
            alt="Membrane media"
            width="100%"
            membrane
          />
        </>,
      )
    })

    const mediaNodes = Array.from(
      container.querySelectorAll('[data-scope="media"][data-part="root"]'),
    ) as HTMLElement[]
    expect(mediaNodes).toHaveLength(2)
    expect(
      mediaNodes[0]?.parentElement?.matches(
        '.uf-membrane:not([data-membrane-disabled])',
      ),
    ).toBe(false)
    expect(
      mediaNodes[1]?.parentElement?.classList.contains('uf-membrane'),
    ).toBe(true)
    expect(
      mediaNodes[1]?.parentElement?.classList.contains('uf-mediaMembrane'),
    ).toBe(true)
    expect(
      mediaNodes[1]?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)
  })

  it('Media clears a previous load error when its source changes', async () => {
    await act(async () => {
      root.render(
        <Media
          src="https://example.com/broken.jpg"
          alt="Broken preview"
          fallback={<span>Unavailable</span>}
        />,
      )
    })

    const brokenImage = container.querySelector(
      'img',
    ) as HTMLImageElement | null
    await act(async () => {
      brokenImage?.dispatchEvent(new Event('error', { bubbles: true }))
    })
    expect(container.textContent).toContain('Unavailable')

    await act(async () => {
      root.render(
        <Media
          src="https://example.com/recovered.jpg"
          alt="Recovered preview"
          fallback={<span>Unavailable</span>}
        />,
      )
    })

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/recovered.jpg',
    )
    expect(container.textContent).not.toContain('Unavailable')
  })
})
