import { act, createRef, type UIEvent } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Scroll, type ScrollProps } from '../../Scroll/Scroll'
import { expectDevError, hydrate, mount, type View } from './harness'

let view: View
beforeEach(() => {
  view = mount()
})
const render = (props: ScrollProps) =>
  act(async () => view.root.render(<Scroll {...props} />))
const $ = (selector: string) => view.host.querySelector<HTMLElement>(selector)
const root = () => $('[data-scope="scroll"][data-part="root"]')!
const viewport = () => $('[data-scope="scroll"][data-part="viewport"]')!
const content = () => $('[data-scope="scroll"][data-part="content"]')!

/**
 * jsdom has no layout: element sizes come from `sizes`. The ResizeObserver
 * double delivers its first observation right after `observe()`, as the
 * browser does, and later ones when `resize()` says the layout changed.
 */
const sizes = new Map<Element, Partial<Record<'scrollWidth' | 'clientWidth' | 'scrollHeight' | 'clientHeight', number>>>()
const observers = new Set<{ callback: ResizeObserverCallback; observer: ResizeObserver }>()
const resize = () =>
  act(async () => {
    for (const { callback, observer } of observers) callback([], observer)
  })
/** Content `scroll` by `client` pixels along each axis; the default fits in 100 × 100. */
const measure = (
  scroll: { width?: number; height?: number },
  client: { width?: number; height?: number } = {},
) =>
  sizes.set(viewport(), {
    scrollWidth: scroll.width ?? 100,
    clientWidth: client.width ?? 100,
    scrollHeight: scroll.height ?? 100,
    clientHeight: client.height ?? 100,
  })

function useLayoutDouble() {
  beforeEach(() => {
    for (const key of ['scrollWidth', 'clientWidth', 'scrollHeight', 'clientHeight'] as const)
      vi.spyOn(Element.prototype, key, 'get').mockImplementation(function (this: Element) {
        return sizes.get(this)?.[key] ?? 0
      })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.add({ callback, observer: this as unknown as ResizeObserver })
        }
        observe() {
          const entry = [...observers].find(({ observer }) => observer === (this as unknown))
          queueMicrotask(() => entry && observers.has(entry) && entry.callback([], entry.observer))
        }
        unobserve() {}
        disconnect() {
          for (const entry of observers) if (entry.observer === (this as unknown)) observers.delete(entry)
        }
      },
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    sizes.clear()
    observers.clear()
  })
}

describe('Scroll children', () => {
  it('elements render inside the scrolling viewport as given', async () => {
    await render({ children: <ul><li>Row</li></ul> })
    expect(content().parentElement).toBe(viewport())
    expect(content().innerHTML).toBe('<ul><li>Row</li></ul>')
  })

  it('text and numbers render as one Text block that keeps the line breaks', async () => {
    await render({ children: 'First line\nSecond line' })
    const text = content().querySelector('[data-scope="text"]')!
    expect(text.classList).toContain('uf-scroll__text')
    expect(text.textContent).toBe('First line\nSecond line')
    await render({ children: 42 })
    expect(content().querySelector('[data-scope="text"]')!.textContent).toBe('42')
  })

  it('text wraps only while the content cannot scroll sideways', async () => {
    const nowrap = () => content().querySelector('.uf-scroll__text')!.classList.contains('uf-scroll__text--nowrap')
    await render({ children: 'a b c' })
    expect(nowrap()).toBe(false)
    await render({ children: 'a b c', orientation: 'horizontal' })
    expect(nowrap()).toBe(true)
    await render({ children: 'a b c', orientation: 'both' })
    expect(nowrap()).toBe(true)
  })
})

describe('Scroll orientation', () => {
  const overflow = () => [viewport().style.overflowX, viewport().style.overflowY]

  it('scrolls vertically by default and clips sideways overflow', async () => {
    await render({ children: 'x' })
    expect(overflow()).toEqual(['hidden', 'auto'])
    expect(root().dataset.orientation).toBe('vertical')
  })

  it('horizontal scrolls sideways and clips vertical overflow; both scrolls along both axes', async () => {
    await render({ children: 'x', orientation: 'horizontal' })
    expect(overflow()).toEqual(['auto', 'hidden'])
    expect(root().dataset.orientation).toBe('horizontal')
    await render({ children: 'x', orientation: 'both' })
    expect(overflow()).toEqual(['auto', 'auto'])
    expect(root().dataset.orientation).toBe('both')
  })

  it('an unknown orientation from JSON renders vertical', async () => {
    await render({ children: 'x', orientation: 'diagonal' as ScrollProps['orientation'] })
    expect(overflow()).toEqual(['hidden', 'auto'])
    expect(root().dataset.orientation).toBe('vertical')
  })
})

describe('Scroll height', () => {
  it('a number is pixels and a string any CSS length, on the outer box', async () => {
    await render({ children: 'x', height: 240 })
    expect(root().style.height).toBe('240px')
    await render({ children: 'x', height: '50vh' })
    expect(root().style.height).toBe('50vh')
    expect(viewport().style.height).toBe('')
  })

  it('without height the box sets none and takes its height from its content or layout', async () => {
    await render({ children: 'x' })
    expect(root().style.height).toBe('')
  })

  it('height replaces style.height and keeps the rest of style', async () => {
    await render({ children: 'x', height: 120, style: { height: 300, maxHeight: 400 } })
    expect(root().style.height).toBe('120px')
    expect(root().style.maxHeight).toBe('400px')
    await render({ children: 'x', style: { height: 300 } })
    expect(root().style.height).toBe('300px')
  })
})

describe('Scroll tab stop and name', () => {
  useLayoutDouble()
  const state = () => ({
    tabIndex: viewport().getAttribute('tabindex'),
    role: viewport().getAttribute('role'),
    name: viewport().getAttribute('aria-label'),
  })

  it('a region that fits is no tab stop, landmark or name, yet stays focusable by script', async () => {
    await render({ children: 'x' })
    measure({})
    await resize()
    expect(state()).toEqual({ tabIndex: '-1', role: null, name: null })
    viewport().focus()
    expect(document.activeElement).toBe(viewport())
  })

  it('a region that overflows is a tab stop named "Scrollable content" by default', async () => {
    await render({ children: 'x' })
    measure({ height: 500 })
    await resize()
    expect(state()).toEqual({ tabIndex: '0', role: 'region', name: 'Scrollable content' })
  })

  it('aria-label names it; blank text keeps the default; aria-labelledby names it instead', async () => {
    await render({ children: 'x', 'aria-label': 'Build log' })
    measure({ height: 500 })
    await resize()
    expect(state()).toEqual({ tabIndex: '0', role: 'region', name: 'Build log' })
    await render({ children: 'x', 'aria-label': '  ' })
    expect(state().name).toBe('Scrollable content')
    await render({ children: 'x', 'aria-labelledby': 'heading' })
    expect(viewport().getAttribute('aria-labelledby')).toBe('heading')
    expect(state().role).toBe('region')
  })

  it('a named region that fits stays a named region, not a tab stop', async () => {
    await render({ children: 'x', 'aria-label': 'Build log' })
    measure({})
    await resize()
    expect(state()).toEqual({ tabIndex: '-1', role: 'region', name: 'Build log' })
    await render({ children: 'x', 'aria-labelledby': 'heading' })
    expect(state()).toEqual({ tabIndex: '-1', role: 'region', name: null })
  })

  it('a non-string aria-label reports and names the tab stop with the default', async () => {
    await render({ children: 'x' })
    measure({ height: 500 })
    await resize()
    await expectDevError(
      () => render({ children: 'x', 'aria-label': 7 as unknown as string }),
      /^Face UI Scroll: invalid aria-label 7; using "Scrollable content"\.$/,
    )
    expect(state().name).toBe('Scrollable content')
  })

  it('overflow along the clipped axis does not make a tab stop, until orientation lets it scroll', async () => {
    await render({ children: 'x' })
    measure({ width: 500 })
    await resize()
    expect(state().tabIndex).toBe('-1')
    // Nothing resizes: the new orientation alone makes the same overflow scrollable.
    await render({ children: 'x', orientation: 'horizontal' })
    expect(state()).toEqual({ tabIndex: '0', role: 'region', name: 'Scrollable content' })
    await render({ children: 'x', orientation: 'vertical' })
    expect(state().tabIndex).toBe('-1')
  })

  it('content that grows past the viewport makes it a tab stop, and shrinking back removes it', async () => {
    await render({ children: 'x' })
    measure({})
    await resize()
    expect(state().tabIndex).toBe('-1')
    measure({ height: 500 })
    await resize()
    expect(state().tabIndex).toBe('0')
    measure({})
    await resize()
    expect(state()).toEqual({ tabIndex: '-1', role: null, name: null })
  })

  it('a tabIndex from the consumer wins: -1 keeps an overflowing region out of the Tab order and unnamed, 0 makes a fitting one a named stop', async () => {
    await render({ children: 'x', tabIndex: -1 })
    measure({ height: 500 })
    await resize()
    expect(state()).toEqual({ tabIndex: '-1', role: null, name: null })
    await render({ children: 'x', tabIndex: 0 })
    measure({})
    await resize()
    expect(state()).toEqual({ tabIndex: '0', role: 'region', name: 'Scrollable content' })
  })

  it('without ResizeObserver the region never becomes a tab stop', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    await render({ children: 'x' })
    measure({ height: 500 })
    expect(state()).toEqual({ tabIndex: '-1', role: null, name: null })
  })
})

describe('Scroll native attributes and ref', () => {
  it('the ref is the scrolling viewport', async () => {
    const ref = createRef<HTMLDivElement>()
    await act(async () => view.root.render(<Scroll ref={ref}>x</Scroll>))
    expect(ref.current).toBe(viewport())
    await act(async () => view.root.render(null))
    expect(ref.current).toBeNull()
  })

  it('native attributes and handlers go to the viewport', async () => {
    const targets: EventTarget[] = []
    const onScroll = vi.fn((event: UIEvent<HTMLDivElement>) => void targets.push(event.currentTarget))
    await render({
      children: 'x',
      id: 'log',
      title: 'Log',
      dir: 'rtl',
      'aria-describedby': 'hint',
      onScroll,
      ...({ 'data-testid': 'log' } as object),
    })
    const node = viewport()
    expect([node.id, node.title, node.dir, node.getAttribute('aria-describedby'), node.dataset.testid])
      .toEqual(['log', 'Log', 'rtl', 'hint', 'log'])
    await act(async () => node.dispatchEvent(new Event('scroll')))
    expect(onScroll).toHaveBeenCalledOnce()
    expect(targets).toEqual([node])
    expect(root().id).toBe('')
  })

  it('className and style go to the outer box', async () => {
    await render({ children: 'x', className: 'feed', style: { maxHeight: 180 } })
    expect(root().classList).toContain('feed')
    expect(root().classList).toContain('uf-scroll')
    expect(root().style.maxHeight).toBe('180px')
    expect(viewport().classList).not.toContain('feed')
    expect(viewport().style.maxHeight).toBe('')
  })

  it('the component owns the role: a role passed anyway is ignored', async () => {
    await render({ children: 'x', 'aria-label': 'Feed', ...({ role: 'log' } as object) })
    expect(viewport().getAttribute('role')).toBe('region')
    await render({ children: 'x', ...({ role: 'log' } as object) })
    expect(viewport().getAttribute('role')).toBeNull()
  })
})

describe('Scroll server rendering', () => {
  it('renders no tab stop on the server and hydrates without a mismatch', async () => {
    const ui = <Scroll height={120}>{'First line\nSecond line'}</Scroll>
    const html = renderToString(ui)
    expect(html).toContain('tabindex="-1"')
    expect(html).not.toContain('role=')
    const host = document.body.appendChild(document.createElement('div'))
    const { recoverableErrors } = await hydrate(ui, host)
    expect(host.querySelector('[data-part="viewport"]')!.getAttribute('tabindex')).toBe('-1')
    expect(recoverableErrors).toEqual([])
  })
})
