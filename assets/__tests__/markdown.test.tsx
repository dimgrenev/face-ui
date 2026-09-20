import { act, createRef, type MouseEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Markdown, type MarkdownProps } from '../../Markdown/Markdown'
import { expectDevError, mount, type View } from './harness'

let view: View
beforeEach(() => {
  view = mount()
})
const render = (props: MarkdownProps) =>
  act(async () => view.root.render(<Markdown {...props} />))
const root = () => view.host.querySelector<HTMLElement>('[data-scope="markdown"]')!
const all = (selector: string) => [...root().querySelectorAll<HTMLElement>(selector)]
const links = () =>
  Object.fromEntries(
    all('a').map((a) => [a.textContent, [a.getAttribute('target'), a.getAttribute('rel')]]),
  )
/** Every URL and event-handler attribute in the rendered block. */
const risky = () =>
  all('*').flatMap((node) =>
    [...node.attributes]
      .filter((attribute) => /^(on|href$|src$|style$|id$|class$)/i.test(attribute.name))
      .map((attribute) => `${node.localName}[${attribute.name}=${attribute.value}]`),
  )

describe('Markdown children', () => {
  it('children is the Markdown source, rendered inside the root itself', async () => {
    await render({ children: '# Title\n\nParagraph with **bold** and `code`.' })
    expect(root().localName).toBe('div')
    expect(root().getAttribute('data-part')).toBe('root')
    expect(root().innerHTML).toBe(
      '<h1>Title</h1>\n<p>Paragraph with <strong>bold</strong> and <code>code</code>.</p>\n',
    )
  })

  it('a non-string source renders nothing and reports instead of throwing', async () => {
    await expectDevError(
      () => render({ children: 42 as unknown as string }),
      /^Face UI Markdown: invalid children 42; rendering nothing\.$/,
    )
    expect(root().innerHTML).toBe('')
  })

  it('a source nested too deep to parse shows as text and reports instead of throwing', async () => {
    const deep = `${'>'.repeat(20000)} <b>deep</b>`
    await expectDevError(
      () => render({ children: deep }),
      /^Face UI Markdown: invalid children ">{60}…"; showing it as text\.$/,
    )
    expect(all('p').map((p) => p.textContent === deep)).toEqual([true])
    expect(all('*')).toHaveLength(1)
    await render({ children: '> quoted' })
    expect(root().innerHTML).toBe('<blockquote>\n<p>quoted</p>\n</blockquote>\n')
  })
})

describe('Markdown gfm', () => {
  const source = [
    '| Name | Score |',
    '| :--- | ---: |',
    '| Ada | 98 |',
    '',
    '~~old~~ https://example.com',
    'next line',
    '',
    '- [x] Done',
  ].join('\n')

  it('gfm renders tables, strikethrough, autolinks and task lists; gfm={false} leaves them text', async () => {
    await render({ children: source })
    expect(all('th, td').map((cell) => [cell.textContent, cell.getAttribute('align')])).toEqual([
      ['Name', 'left'],
      ['Score', 'right'],
      ['Ada', 'left'],
      ['98', 'right'],
    ])
    expect(all('del').map((node) => node.textContent)).toEqual(['old'])
    expect(all('a').map((a) => a.getAttribute('href'))).toEqual(['https://example.com'])
    expect(all('input[type="checkbox"]')).toHaveLength(1)
    expect(all('br')).toEqual([])

    await render({ children: source, gfm: false })
    expect(all('table, del, a, br, input')).toEqual([])
    expect(root().textContent).toContain('| :--- | ---: |')
    expect(root().textContent).toContain('~~old~~ https://example.com\nnext line')
    expect(root().textContent).toContain('[x] Done')
  })
})

describe('Markdown breaks', () => {
  const source = 'one\ntwo  \nthree\n\n- item\n  wrapped\n\n```\ncode\nblock\n```'
  /** Each paragraph's and item's text, a line break shown as `|`. */
  const lines = () =>
    all('p, li, pre').map((node) =>
      [...node.childNodes].map((child) => (child.nodeName === 'BR' ? '|' : child.textContent)).join(''),
    )

  it('breaks turns a newline inside a paragraph into a line break, with or without gfm; otherwise it is a space', async () => {
    await render({ children: source })
    expect(lines()).toEqual(['one\ntwo|three', 'item\nwrapped', 'code\nblock\n'])
    for (const gfm of [true, false]) {
      await render({ children: source, breaks: true, gfm })
      expect(lines()).toEqual(['one|two|three', 'item|wrapped', 'code\nblock\n'])
    }
  })
})

describe('Markdown html', () => {
  it('by default raw HTML shows as the text it was typed as, block or inline', async () => {
    await render({ children: '<div>Raw block</div>\n\nPress <kbd>Ctrl</kbd> & <b>go</b>' })
    expect(all('div, kbd, b')).toEqual([])
    expect(all('p').map((p) => p.textContent)).toEqual([
      '<div>Raw block</div>',
      'Press <kbd>Ctrl</kbd> & <b>go</b>',
    ])
  })

  it('html renders raw HTML through the allowlist of text and block tags', async () => {
    await render({
      html: true,
      children:
        '<details open><summary>More</summary>Hidden <kbd>Ctrl</kbd> H<sub>2</sub>O</details>\n\n<div>Raw block</div>',
    })
    expect(all('*').map((node) => node.localName)).toEqual([
      'details', 'summary', 'kbd', 'sub', 'div',
    ])
    expect(root().querySelector('details')!.open).toBe(true)
    expect(root().querySelector('div')!.textContent).toBe('Raw block')
  })

  const hostileMarkdown = [
    '[plain](javascript:alert(1))',
    '[cased](JaVaScRiPt:alert(2))',
    '[encoded](java&#x09;script:alert(3))',
    '[data](data:text/html;base64,PHNjcmlwdD5hbGVydCg0KTwvc2NyaXB0Pg==)',
    '[vb](vbscript:msgbox(5))',
    '![image](javascript:alert(6))',
    '<javascript:alert(7)>',
  ].join('\n\n')
  const hostileHtml = [
    '<script>alert(1)</script>',
    '<style>body { display: none }</style>',
    '<img src="x.png" onerror="alert(2)" style="position: fixed" id="clobber" class="evil">',
    '<a href="javascript:alert(3)" onclick="alert(4)">link</a>',
    '<iframe src="https://example.com"></iframe><form action="https://example.com"><button>Go</button></form>',
    '<svg><script>alert(5)</script></svg><object data="x.swf"></object>',
    '<input type="text" value="password" autofocus>',
  ].join('\n\n')

  it('the safe default strips javascript:, data: and other unsafe URLs from Markdown links and images', async () => {
    await render({ children: hostileMarkdown })
    expect(all('a').map((a) => a.textContent)).toEqual([
      'plain', 'cased', 'encoded', 'data', 'vb', 'javascript:alert(7)',
    ])
    expect(risky()).toEqual([])
  })

  it('the safe default never turns raw HTML into script, style, frame, form or event handler', async () => {
    await render({ children: hostileHtml })
    expect(all('*').map((node) => node.localName)).toEqual(Array(7).fill('p'))
    expect(risky()).toEqual([])
    expect(root().textContent).toContain('<script>alert(1)</script>')
  })

  it('html still strips scripts, styles, event handlers, unsafe URLs, ids, classes, frames and forms, and keeps inputs inert', async () => {
    await render({ html: true, children: `${hostileHtml}\n\n${hostileMarkdown}` })
    expect(all('script, style, iframe, form, button, svg, object')).toEqual([])
    expect(risky()).toEqual(['img[src=x.png]'])
    expect(root().textContent).not.toContain('alert(1)')
    const input = root().querySelector('input')!
    expect([input.type, input.disabled, input.value]).toEqual(['checkbox', true, 'on'])
  })
})

describe('Markdown links', () => {
  const source = [
    '[https](https://example.com)',
    '[protocol-relative](//example.org)',
    '[root](/docs)',
    '[relative](docs/setup)',
    '[anchor](#install)',
    '[mail](mailto:team@example.com)',
  ].join(' ')

  it('linkTarget opens only absolute links in a new tab', async () => {
    await render({ children: source, linkTarget: '_blank', linkRel: '' })
    expect(links()).toEqual({
      https: ['_blank', null],
      'protocol-relative': ['_blank', null],
      root: [null, null],
      relative: [null, null],
      anchor: [null, null],
      mail: [null, null],
    })
    await render({ children: source, linkRel: '' })
    expect(all('[target]')).toEqual([])
  })

  it('linkRel is the rel of every absolute link, whatever its target', async () => {
    await render({ children: source })
    expect(links()).toMatchObject({
      https: [null, 'noopener noreferrer'],
      'protocol-relative': [null, 'noopener noreferrer'],
      root: [null, null],
      relative: [null, null],
    })
    await render({ children: source, linkRel: 'nofollow ugc' })
    expect(links()).toMatchObject({ https: [null, 'nofollow ugc'], anchor: [null, null] })
    await render({ children: source, linkTarget: '_blank', linkRel: 'nofollow ugc noopener' })
    expect(links().https).toEqual(['_blank', 'nofollow ugc noopener'])
  })

  it('a link a browser reads as absolute counts as one, however it is written', async () => {
    const hrefs = [' //evil.example', '/\\evil.example', '\\\\evil.example', '/\t/evil.example', 'https:evil.example', 'HTTP://Evil.example']
    await render({
      html: true,
      linkTarget: '_blank',
      linkRel: 'nofollow ugc',
      children: `${hrefs.map((href, index) => `<a href="${href}">${index}</a>`).join(' ')} <a href="/%5Cdocs">own</a>`,
    })
    expect(links()).toEqual({
      ...Object.fromEntries(hrefs.map((_, index) => [index, ['_blank', 'nofollow ugc']])),
      own: [null, null],
    })
  })

  it('raw HTML cannot choose where a link opens', async () => {
    await render({
      html: true,
      children: '<a href="/docs" target="_blank" rel="opener">docs</a> <a href="https://example.com" target="_top">site</a>',
    })
    expect(links()).toEqual({ docs: [null, null], site: [null, 'noopener noreferrer'] })
  })

  it('a root onClick sees link clicks and can keep the page, as client-side routing does', async () => {
    const route = vi.fn((event: MouseEvent<HTMLDivElement>) => {
      const link = (event.target as Element).closest('a')
      if (link?.getAttribute('href')?.startsWith('/')) event.preventDefault()
      return link?.getAttribute('href')
    })
    await render({ children: 'Read the [guide](/guide).', onClick: route })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    root().querySelector('a')!.dispatchEvent(click)
    expect(route).toHaveReturnedWith('/guide')
    expect(click.defaultPrevented).toBe(true)
  })
})

describe('Markdown task lists', () => {
  it('a task checkbox shares a label with its task text, shows its state and cannot be changed', async () => {
    await render({
      children: '- [x] Ship **release**\n- [ ] Write tests\n  - [ ] Nested\n- Plain\n\n1. [ ] Loose\n\n   More text',
    })
    const tasks = all('input').map((input) => [
      input.closest('label')!.textContent!.trim(),
      (input as HTMLInputElement).checked,
      (input as HTMLInputElement).disabled,
      input.getAttribute('aria-label'),
    ])
    expect(tasks).toEqual([
      ['Ship release', true, true, null],
      ['Write tests', false, true, null],
      ['Nested', false, true, null],
      ['Loose', false, true, null],
    ])
    const checkbox = root().querySelector<HTMLInputElement>('input')!
    await act(async () => checkbox.click())
    expect(checkbox.checked).toBe(true)
  })
})

describe('Markdown membrane', () => {
  it('membrane is off by default and wraps the block in the spacing box when set', async () => {
    await render({ children: 'Text' })
    const wrapper = () => root().parentElement!
    expect(wrapper().matches('.uf-membrane[data-membrane-disabled]')).toBe(true)
    const node = root()
    await render({ children: 'Text', membrane: true })
    expect(wrapper().matches('.uf-membrane.uf-membrane--full:not([data-membrane-disabled])')).toBe(true)
    expect(root()).toBe(node)
  })
})

describe('Markdown native attributes', () => {
  it('native attributes and ref reach the root, which keeps its own scope and markup', async () => {
    const ref = createRef<HTMLDivElement>()
    await render({
      ref,
      id: 'answer',
      lang: 'de',
      dir: 'rtl',
      className: 'custom',
      style: { maxWidth: 480 },
      'aria-label': 'Answer',
      'data-scope': 'other',
      children: 'Hallo',
    } as MarkdownProps & { ref: typeof ref })
    const node = root()
    expect(ref.current).toBe(node)
    expect([node.id, node.lang, node.dir, node.className, node.style.maxWidth]).toEqual([
      'answer', 'de', 'rtl', 'uf-markdown custom', '480px',
    ])
    expect(node.getAttribute('aria-label')).toBe('Answer')
    expect(node.innerHTML).toBe('<p>Hallo</p>\n')
  })
})
