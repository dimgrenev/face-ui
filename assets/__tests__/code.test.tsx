import { act, createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Code, type CodeProps } from '../../Code/Code'
import { expectDevError, mount, type View } from './harness'
import { describeControlled } from './harness/controlled'

const source = (count: number) =>
  Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n')

let view: View
beforeEach(() => {
  view = mount()
})
const render = (props: CodeProps) =>
  act(async () => view.root.render(<Code {...props} />))
const $ = <E extends Element = HTMLElement>(selector: string) =>
  view.host.querySelector<E>(selector)
const root = () => $('[data-scope="code"][data-part="root"]')!
const pre = () => $<HTMLPreElement>('[data-scope="code"][data-part="pre"]')!
const lines = () => [
  ...view.host.querySelectorAll<HTMLElement>('[data-scope="code"][data-part="line"]'),
]
/** Line text without the gutter or the trailing line break. */
const lineText = (line: HTMLElement) =>
  [...line.childNodes]
    .filter((node) => !(node instanceof Element && node.matches('[data-part="lineNumber"]')))
    .map((node) => node.textContent)
    .join('')
    .replace(/\n$/, '')
const button = (name: string) =>
  [...view.host.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === name,
  ) ?? null
const status = () => $('[role="status"]')!

describe('Code children', () => {
  it('children is the source, one line per line break; a final break closes the last line', async () => {
    await render({ children: 'const a = 1\r\nconst b = 2\n' })
    expect(lines().map(lineText)).toEqual(['const a = 1', 'const b = 2'])
    await render({ children: '' })
    expect(lines().map(lineText)).toEqual([''])
  })

  it('a non-string source renders empty and reports instead of throwing', async () => {
    await expectDevError(
      () => render({ children: 42 as unknown as string }),
      /^Face UI Code: invalid children 42; rendering an empty source\.$/,
    )
    expect(lines().map(lineText)).toEqual([''])
  })
})

describe('Code copy', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>()
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  })
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard')
    vi.unstubAllGlobals()
    vi.useRealTimers()
    writeText.mockReset()
  })
  const copy = () =>
    act(async () => {
      button('Copy code')!.click()
    })

  it('copies children verbatim and confirms only after the clipboard accepts it', async () => {
    vi.useFakeTimers()
    writeText.mockResolvedValue(undefined)
    await render({ children: 'npm install\n', showLineNumbers: true })
    const icon = () => button('Copy code')!.querySelector('[data-icon]')!.getAttribute('data-icon')
    expect([status().textContent, icon()]).toEqual(['', 'copy'])
    await copy()
    expect(writeText).toHaveBeenCalledWith('npm install\n')
    expect([status().textContent, icon()]).toEqual(['Copied', 'check'])
    await act(async () => vi.advanceTimersByTime(1999))
    expect([status().textContent, icon()]).toEqual(['Copied', 'check'])
    await act(async () => vi.advanceTimersByTime(1))
    expect([status().textContent, icon()]).toEqual(['', 'copy'])
  })

  it('every successful copy announces labels.copied again, as a new node', async () => {
    writeText.mockResolvedValue(undefined)
    await render({ children: 'npm install', labels: { copied: 'Скопировано' } })
    await copy()
    const first = status().firstElementChild
    expect(first?.textContent).toBe('Скопировано')
    await copy()
    expect(status().textContent).toBe('Скопировано')
    expect(status().firstElementChild).not.toBe(first)
    expect(status().childElementCount).toBe(1)
  })

  it('a refused clipboard confirms nothing', async () => {
    writeText.mockRejectedValue(new Error('Denied'))
    Object.assign(document, { execCommand: () => false })
    await render({ children: 'secret' })
    const icon = button('Copy code')!.innerHTML
    await copy()
    expect(writeText).toHaveBeenCalledWith('secret')
    expect(status().textContent).toBe('')
    expect(button('Copy code')!.innerHTML).toBe(icon)
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('without a title the copy button sits beside a one-line source and in a header above a longer one', async () => {
    await render({ children: 'npm install\n' })
    expect($('.uf-code-header')).toBeNull()
    expect(button('Copy code')!.closest('.uf-code-actions')?.parentElement).toBe(root())
    await render({ children: 'npm install\nnpm test' })
    expect($('.uf-code-header')?.nextElementSibling).toBe(pre())
    expect($('.uf-code-title')).toBeNull()
    expect(button('Copy code')!.closest('.uf-code-header')).not.toBeNull()
  })
})

describe('Code props', () => {
  it('title fills the header; an empty title renders none', async () => {
    await render({ children: 'x', title: <b>app.ts</b> })
    expect($('.uf-code-header .uf-code-title')?.innerHTML).toContain('<b>app.ts</b>')
    expect(button('Copy code')!.closest('.uf-code-header')).not.toBeNull()
    await render({ children: 'x', title: '' })
    expect($('.uf-code-header')).toBeNull()
  })

  it('before measurement the source has no tabindex, leaving the browser its own rule for scrollers', async () => {
    // jsdom has no ResizeObserver, which is also the server HTML and the no-support case.
    // A -1 here would take an overflowing source out of the Tab order and never put it back.
    await render({ children: source(40) })
    expect(pre().hasAttribute('tabindex')).toBe(false)
  })

  it('language names the language-* class of the code element', async () => {
    await render({ children: 'ls', language: 'bash' })
    expect($('pre > code')!.className).toBe('language-bash')
    await render({ children: 'ls' })
    expect($('pre > code')!.hasAttribute('class')).toBe(false)
  })

  it('tokenizedLines color the lines they spell; a line they do not spell yet renders plain, silently', async () => {
    const tokenizedLines = [
      [
        { content: 'const', color: 'rgb(255, 0, 0)' },
        { content: ' a = 1' },
      ],
      [{ content: 'stale line' }],
    ]
    // A highlighter catching up with a streamed source is a normal state, not a defect: no report.
    await render({ children: 'const a = 1\nconst b = 2\nconst c = 3', tokenizedLines })
    const [first, second, third] = lines()
    expect(first!.querySelector('span')!.style.color).toBe('rgb(255, 0, 0)')
    expect(lineText(first!)).toBe('const a = 1')
    expect([second!.children.length, third!.children.length]).toEqual([0, 0])
    expect([lineText(second!), lineText(third!)]).toEqual(['const b = 2', 'const c = 3'])
  })

  it('tokenizedLines without children color nothing, and a non-array is reported', async () => {
    await render({ tokenizedLines: [[{ content: 'orphan' }]] })
    expect(lines().map(lineText)).toEqual([''])
    await expectDevError(
      () =>
        render({
          children: 'a',
          tokenizedLines: 'a' as unknown as CodeProps['tokenizedLines'],
        }),
      /^Face UI Code: invalid tokenizedLines "a"; rendering plain text\.$/,
    )
    expect(lines().map(lineText)).toEqual(['a'])
  })

  it('showLineNumbers adds a gutter number to every line, hidden from assistive technology', async () => {
    await render({ children: source(3) })
    expect($('[data-part="lineNumber"]')).toBeNull()
    await render({ children: source(3), showLineNumbers: true })
    const numbers = lines().map((line) => line.querySelector('[data-part="lineNumber"]')!)
    expect(numbers.map((number) => number.textContent)).toEqual(['1', '2', '3'])
    expect(numbers.every((number) => number.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(lines().map(lineText)).toEqual(['line 1', 'line 2', 'line 3'])
  })

  it('highlightedLines render the whole line numbers they list, from 1, as <mark>; anything else is reported', async () => {
    await render({ children: source(3), highlightedLines: [2, 7] })
    expect(lines().map((line) => line.tagName)).toEqual(['SPAN', 'MARK', 'SPAN'])
    await expectDevError(
      () => render({ children: source(3), highlightedLines: 2 as unknown as number[] }),
      /^Face UI Code: invalid highlightedLines 2; marking no line\.$/,
    )
    expect(lines().map((line) => line.tagName)).toEqual(['SPAN', 'SPAN', 'SPAN'])
    await expectDevError(
      () =>
        render({
          children: source(3),
          highlightedLines: ['1', 2.5, 0, 3] as unknown as number[],
        }),
      /^Face UI Code: invalid highlightedLines array; marking only its whole line numbers from 1\.$/,
    )
    expect(lines().map((line) => line.tagName)).toEqual(['SPAN', 'SPAN', 'MARK'])
  })

  it('the source reads left to right in any page direction and is never machine-translated', async () => {
    await render({ children: 'x', dir: 'rtl' })
    expect(root().getAttribute('dir')).toBe('rtl')
    expect(pre().getAttribute('dir')).toBe('ltr')
    expect(pre().getAttribute('translate')).toBe('no')
  })

  it('native attributes and ref reach the root; the component keeps its own structure', async () => {
    const ref = createRef<HTMLDivElement>()
    const onCopy = vi.fn()
    await act(async () =>
      view.root.render(
        <Code
          ref={ref}
          id="snippet"
          role="region"
          aria-label="Install command"
          data-testid="snippet"
          data-scope="other"
          className="custom"
          style={{ maxWidth: 320 }}
          onCopy={onCopy}
        >
          npm install
        </Code>,
      ),
    )
    expect(ref.current).toBe(root())
    expect(root().id).toBe('snippet')
    expect(root().getAttribute('role')).toBe('region')
    expect(root().getAttribute('aria-label')).toBe('Install command')
    expect(root().dataset.testid).toBe('snippet')
    expect(root().className).toBe('uf-card uf-code custom')
    expect(root().style.maxWidth).toBe('320px')
    expect(root().hasAttribute('title')).toBe(false)
    root().dispatchEvent(new Event('copy', { bubbles: true }))
    expect(onCopy).toHaveBeenCalledTimes(1)
  })
})

describe('Code collapse', () => {
  const toggle = () => button('Expand code') ?? button('Collapse code')

  it('a source longer than collapsedLines collapses to them; one that fits shows in full', async () => {
    await render({ children: source(4), collapsedLines: 3, defaultCollapsed: true })
    expect(root().dataset.state).toBe('collapsed')
    expect(pre().style.getPropertyValue('--uf-code-collapsed-lines')).toBe('3')
    expect(toggle()?.textContent).toBe('Expand code')
    await render({ children: source(3), collapsedLines: 3, defaultCollapsed: true })
    expect(root().hasAttribute('data-state')).toBe(false)
    expect(toggle()).toBeNull()
    // The intent survives while the source is short and applies when it grows again.
    await render({ children: source(4), collapsedLines: 3, defaultCollapsed: true })
    expect(root().dataset.state).toBe('collapsed')
  })

  it('collapsedLines defaults to 8 and reads an integer from 1', async () => {
    await render({ children: source(8), defaultCollapsed: true })
    expect(toggle()).toBeNull()
    await render({ children: source(9), defaultCollapsed: true })
    expect(root().dataset.state).toBe('collapsed')
    await expectDevError(
      () => render({ children: source(2), collapsedLines: 0, defaultCollapsed: true }),
      /^Face UI Code: invalid collapsedLines 0; using 1\.$/,
    )
    expect(root().dataset.state).toBe('collapsed')
    await expectDevError(
      () => render({ children: source(3), collapsedLines: 2.5 }),
      /^Face UI Code: invalid collapsedLines 2\.5; using 2\.$/,
    )
    // Truncated to 2, three lines still collapse (the mount default stays collapsed).
    expect(root().dataset.state).toBe('collapsed')
  })

  it('collapsing only clips the view: every line stays readable, so the toggle names its action without aria-expanded', async () => {
    await render({ children: source(12), defaultCollapsed: true })
    expect(root().dataset.state).toBe('collapsed')
    expect(lines().map(lineText)).toEqual(source(12).split('\n'))
    expect(pre().closest('[aria-hidden], [hidden], [inert]')).toBeNull()
    expect(pre().querySelectorAll('[aria-hidden], [hidden], [inert]')).toHaveLength(0)
    expect(toggle()?.textContent).toBe('Expand code')
    expect(toggle()?.hasAttribute('aria-expanded')).toBe(false)
    await act(async () => toggle()!.click())
    expect(toggle()?.textContent).toBe('Collapse code')
    expect(toggle()?.hasAttribute('aria-expanded')).toBe(false)
  })

  it('a controlled collapsed source that stops fitting is projected, never rewritten', async () => {
    const onCollapsedChange = vi.fn()
    await render({ children: source(2), collapsed: true, collapsedLines: 3, onCollapsedChange })
    expect(toggle()).toBeNull()
    await render({ children: source(5), collapsed: true, collapsedLines: 3, onCollapsedChange })
    expect(root().dataset.state).toBe('collapsed')
    expect(onCollapsedChange).not.toHaveBeenCalled()
  })

  it('labels name the copy and collapse buttons and the confirmation', async () => {
    await render({
      children: source(9),
      labels: { copy: 'Копировать', expand: 'Развернуть', collapse: 'Свернуть', copied: 'Скопировано' },
    })
    expect(button('Копировать')?.title).toBe('Копировать')
    expect(button('Свернуть')?.title).toBe('Свернуть')
    await act(async () => button('Свернуть')!.click())
    expect(button('Развернуть')).not.toBeNull()
    await expectDevError(
      () => render({ children: 'x', labels: { copy: 7 as unknown as string } }),
      /^Face UI Code: invalid labels\.copy 7; using "Copy code"\.$/,
    )
    expect(button('Copy code')).not.toBeNull()
  })
})

describeControlled<boolean>({
  name: 'Code',
  prop: 'collapsed',
  values: [false, true],
  render: (props) => <Code {...props}>{source(12)}</Code>,
  change: (host) => {
    const toggle = [...host.querySelectorAll('button')].find((button) =>
      /^(Expand|Collapse) code$/.test(button.textContent ?? ''),
    )
    toggle!.click()
  },
  read: (host) =>
    host.querySelector('[data-scope="code"][data-part="root"]')?.getAttribute('data-state') ===
    'collapsed',
})
