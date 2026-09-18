import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Separator } from '../../Separator/Separator'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Separator keeps decorative dividers hidden from landmarks and exposes semantic separators on demand', async () => {
    await act(async () => {
      root.render(
        <>
          <Separator />
          <Separator
            decorative={false}
            orientation="vertical"
            membrane={false}
          />
        </>,
      )
    })

    const wrapper = container.querySelector(
      '.uf-separator-membrane',
    ) as HTMLElement | null
    const separators = Array.from(
      container.querySelectorAll<HTMLElement>('.uf-separator[data-scope]'),
    )
    const decorative = separators[0]
    const semantic = separators[1]

    expect(wrapper).not.toBeNull()
    expect(wrapper?.classList.contains('uf-membrane--full')).toBe(true)
    expect(decorative?.getAttribute('data-orientation')).toBe('horizontal')
    expect(decorative?.getAttribute('role')).toBe('none')
    expect(decorative?.getAttribute('aria-orientation')).toBeNull()
    expect(semantic?.getAttribute('role')).toBe('separator')
    expect(semantic?.getAttribute('aria-orientation')).toBe('vertical')
    expect(semantic?.getAttribute('data-orientation')).toBe('vertical')

    const componentStyles = libraryCss()
    const tokenStyles = readFileSync(
      join(process.cwd(), 'assets/styles/tokens.css'),
      'utf8',
    )
    const galleryMetaSource = readFileSync(
      join(
        process.cwd(),
        'utils/__generated__/render_gallery.meta.generated.ts',
      ),
      'utf8',
    )
    const runtimeSource = readFileSync(
      join(process.cwd(), 'uf.runtime.ts'),
      'utf8',
    )
    expect(componentStyles).toContain('.uf-separator-membrane {')
    expect(tokenStyles).toContain('--uf-border-width-thin: 1px;')
    expect(tokenStyles).toContain(
      '--uf-separator-line-width: var(--uf-border-width-thin);',
    )
    expect(componentStyles).not.toContain(
      '--uf-separator-line-width: var(--uf-membrane);',
    )
    expect(componentStyles).toContain('inline-size: 100%;')
    expect(componentStyles).toMatch(
      /\.uf-separator\[data-scope\] \{[\s\S]*?padding: 0;[\s\S]*?\}/,
    )
    expect(componentStyles).toMatch(
      /\.uf-separator\[data-scope\]\[data-orientation="horizontal"\] \{[\s\S]*?height: var\(--uf-separator-line-width\);[\s\S]*?background: var\(--uf-color-border\);[\s\S]*?\}/,
    )
    expect(componentStyles).toMatch(
      /\.uf-separator\[data-scope\]\[data-orientation="vertical"\] \{[\s\S]*?width: var\(--uf-separator-line-width\);[\s\S]*?border-left: none;[\s\S]*?background: var\(--uf-color-border\);[\s\S]*?\}/,
    )
    expect(componentStyles).not.toContain(
      '.uf-gallery-itemSurface:has(> .uf-separator-membrane),',
    )
    expect(componentStyles).toContain(
      '.uf-gallery-itemSurface > .uf-separator-membrane',
    )
    expect(galleryMetaSource).toContain('name: "Separator"')
    expect(galleryMetaSource).toContain(
      'sampleProps: {"orientation":"horizontal","decorative":true,"membrane":true}',
    )
    expect(runtimeSource).toContain("maxWidth: '100%'")
    expect(runtimeSource).toContain("fullFrameComponents: ['face-ui-react']")
    expect(runtimeSource).toContain(
      "fullWidthComponents: ['face-ui-react', 'Accordion', 'Card', 'Carousel', 'Code', 'Media', 'Meter', 'Modal', 'Progress', 'Scroll', 'Separator', 'Slider', 'Table', 'Toc', 'Tree']",
    )
  })
})
