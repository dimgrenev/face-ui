import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Markdown } from '../../Markdown/Markdown'
import { renderToStaticMarkup } from 'react-dom/server'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Markdown renders styled block structure for rich content', async () => {
    await act(async () => {
      root.render(
        <Markdown
          content={[
            '# Title',
            '',
            'Paragraph with **bold** and `code`.',
            '',
            '> Quote',
            '',
            '- [x] Done',
            '- Item',
            '',
            '| Name | Value |',
            '| :--- | ---: |',
            '| Spacing | 2px |',
            '',
            '```ts',
            'const x = 1',
            '```',
          ].join('\n')}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="markdown"]',
    ) as HTMLElement | null
    expect(rootNode).not.toBeNull()
    expect(rootNode?.querySelector('h1')?.textContent).toBe('Title')
    expect(rootNode?.querySelector('blockquote')).not.toBeNull()
    expect(rootNode?.querySelector('input[type="checkbox"]')).not.toBeNull()
    expect(rootNode?.querySelector('table')).not.toBeNull()
    expect(
      rootNode?.querySelector('pre code')?.getAttribute('class'),
    ).toContain('language-ts')
  })
})

describe('content and upload integrity', () => {
  it.each([true, false])('sanitizes raw HTML with safeMode=%s', (safeMode) => {
    const html = renderToStaticMarkup(
      <Markdown
        allowRawHtml
        safeMode={safeMode}
        content={
          '<script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">link</a><iframe src="https://example.org"></iframe><input type="text" autofocus value="unsafe">'
        }
      />,
    )
    expect(html).not.toMatch(
      /<script|onerror|javascript:|<iframe|autofocus|value="unsafe"/i,
    )
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('disabled="disabled"')
  })
  it('respects raw HTML and GFM independently', () => {
    const source = '<div>Raw block</div>\n\n~~strike~~\n\n- [x] Done'
    const basic = renderToStaticMarkup(
      <Markdown content={source} gfm={false} />,
    )
    const gfm = renderToStaticMarkup(<Markdown content={source} gfm />)
    expect(basic).not.toContain('Raw block')
    expect(basic).not.toContain('<del>')
    expect(gfm).toContain('<del>strike</del>')
    expect(gfm).toContain('aria-label="Completed task"')
  })
})
