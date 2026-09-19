import { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toc, type TocItem, type TocProps } from '../../Toc/Toc'
import { expectDevError, mount } from './harness'
import { describeControlled } from './harness/controlled'

const items: readonly TocItem[] = [
  { value: 'intro', label: 'Introduction' },
  { value: 'setup', label: 'Setup' },
  { value: 'usage', label: 'Usage' },
]
let host: HTMLDivElement
let root: Root
const render = (props: TocProps = {}) =>
  act(async () => root.render(<Toc items={items} {...props} />))
const link = (value: string, scope: HTMLElement = host) =>
  scope.querySelector<HTMLAnchorElement>(`a[data-value="${value}"]`)!
const current = (scope: HTMLElement = host) =>
  scope.querySelector('[aria-current]')?.getAttribute('data-value') ?? null
/** jsdom follows a link in a later task. */
const navigated = () => new Promise((resolve) => setTimeout(resolve, 0))
/** Dispatches a click on the entry and lets jsdom follow it; true when nothing cancelled the click. */
const follow = async (value: string, init: MouseEventInit = {}) => {
  let followed = false
  await act(async () => {
    followed = link(value).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
    )
    await navigated()
  })
  return followed
}
const resetHash = async () => {
  await navigated()
  history.replaceState(null, '', location.pathname)
}

beforeEach(async () => {
  ;({ host, root } = mount())
  await resetHash()
})
afterEach(resetHash)

describeControlled<string | null>({
  name: 'Toc',
  prop: 'value',
  values: ['intro', 'setup'],
  render: (props) => <Toc items={items} {...props} />,
  change: (scope, to) => {
    link(to!, scope).click()
  },
  read: (scope) => current(scope),
  normalizes: ['missing', null],
  handler: 'onClick',
})

describe('Toc links', () => {
  it('entries are native links to #value inside a navigation landmark', async () => {
    await render()
    const nav = host.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('Table of contents')
    expect(nav.hasAttribute('role')).toBe(false)
    expect(host.querySelector('button')).toBeNull()
    expect(
      [...nav.querySelectorAll('a')].map((node) => [node.getAttribute('href'), node.textContent]),
    ).toEqual([
      ['#intro', 'Introduction'],
      ['#setup', 'Setup'],
      ['#usage', 'Usage'],
    ])
  })

  it('following an entry lets the browser update the hash and marks the entry current', async () => {
    const onValueChange = vi.fn()
    await render({ onValueChange })
    expect(current()).toBeNull()
    expect(await follow('setup')).toBe(true)
    expect(location.hash).toBe('#setup')
    expect(current()).toBe('setup')
    expect(link('setup').getAttribute('aria-current')).toBe('location')
    expect(onValueChange.mock.calls).toEqual([[{ value: 'setup' }]])
  })

  it('onSelect fires on every follow, the current entry included; onValueChange only on a change', async () => {
    const onSelect = vi.fn()
    const onValueChange = vi.fn()
    await render({ defaultValue: 'setup', onSelect, onValueChange })
    await follow('setup')
    await follow('setup')
    await follow('usage')
    expect(onSelect.mock.calls.map(([details]) => details.value)).toEqual([
      'setup',
      'setup',
      'usage',
    ])
    expect(onSelect.mock.calls[0]![0].event.type).toBe('click')
    expect(onValueChange.mock.calls).toEqual([[{ value: 'usage' }]])
  })

  it("onSelect's preventDefault() stops the jump; the entry still becomes current", async () => {
    await render({ onSelect: ({ event }) => event.preventDefault() })
    expect(await follow('usage')).toBe(false)
    expect(location.hash).toBe('')
    expect(current()).toBe('usage')
  })

  it("the root onClick runs first and its preventDefault() cancels both the follow and the jump", async () => {
    const onSelect = vi.fn()
    await render({ onClick: (event) => event.preventDefault(), onSelect })
    expect(await follow('usage')).toBe(false)
    expect(location.hash).toBe('')
    expect(current()).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('a modified or non-primary click is left to the browser and selects nothing', async () => {
    const onSelect = vi.fn()
    const onValueChange = vi.fn()
    await render({ defaultValue: 'intro', onSelect, onValueChange })
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      // jsdom ignores modifiers and would follow the link; only the component's response matters.
      await follow('usage', init)
      await resetHash()
    }
    expect(current()).toBe('intro')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('Toc keyboard', () => {
  it('Tab stops on every entry and arrow keys are left to the page', async () => {
    await render({ defaultValue: 'setup' })
    const links = [...host.querySelectorAll<HTMLAnchorElement>('a')]
    expect(links.map((node) => node.tabIndex)).toEqual([0, 0, 0])
    await act(async () => links[1]!.focus())
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      await act(async () => void links[1]!.dispatchEvent(event))
      expect(event.defaultPrevented, key).toBe(false)
    }
    expect(document.activeElement).toBe(links[1])
  })
})

describe('Toc items', () => {
  it('level nests each entry in a sublist under the previous entry of a smaller level', async () => {
    await render({
      items: [
        { value: 'a', label: 'A' },
        { value: 'a1', label: 'A1', level: 2 },
        { value: 'a1x', label: 'A1x', level: 3 },
        { value: 'a2', label: 'A2', level: 2 },
        { value: 'b', label: 'B', level: 1 },
        { value: 'b1', label: 'B1', level: 4 },
      ],
    })
    const outline = (list: Element): unknown[] =>
      [...list.children].map((item) => {
        const value = item.querySelector('a')!.getAttribute('data-value')
        const sublist = item.querySelector(':scope > ul')
        return sublist ? [value, outline(sublist)] : value
      })
    expect(outline(host.querySelector('nav > ul')!)).toEqual([
      ['a', [['a1', ['a1x']], 'a2']],
      ['b', ['b1']],
    ])
    expect([...host.querySelectorAll('ul')].every((list) => list.getAttribute('role') === 'list')).toBe(true)
    // Indentation follows the nesting, so what is seen is what is announced.
    expect(
      [...host.querySelectorAll<HTMLElement>('a')].map((node) =>
        node.style.getPropertyValue('--uf-toc-depth'),
      ),
    ).toEqual(['', '1', '2', '1', '', '1'])
  })

  it('a level that is not an integer from 1 is normalized and reported', async () => {
    await expectDevError(
      () =>
        render({
          items: [
            { value: 'a', label: 'A', level: 2.7 },
            { value: 'b', label: 'B', level: 3 },
            { value: 'c', label: 'C', level: 0 },
          ],
        }),
      /^Face UI Toc: invalid items\[[02]\]\.level (2\.7|0); using [12]\.$/,
    )
    const nested = [...host.querySelectorAll('nav > ul > li')].map((item) => item.textContent)
    expect(nested).toEqual(['AB', 'C'])
  })

  it('label takes any content and keeps it inline', async () => {
    await render({
      items: [{ value: 'hooks', label: <>Using <code>useState</code></> }],
    })
    expect(link('hooks').querySelector('.uf-toc-label > code')?.textContent).toBe('useState')
  })

  it('entries without a string value or with a repeated one are dropped and reported', async () => {
    await expectDevError(
      () =>
        render({
          items: [
            { value: 'a', label: 'A' },
            { value: 1, label: 'Number' } as unknown as TocItem,
            { value: 'a', label: 'Again' },
          ],
        }),
      /^Face UI Toc: invalid items\[[12]\] key (1|"a"); dropping the (item|duplicate)\.$/,
    )
    expect(host.querySelectorAll('a')).toHaveLength(1)
  })

  it('an empty list renders no landmark', async () => {
    await render({ items: [] })
    expect(host.querySelector('nav')).toBeNull()
  })

  it('an uncontrolled value waits for items that arrive later', async () => {
    await render({ items: [], defaultValue: 'setup' })
    await render({ items: items.slice(0, 1), defaultValue: 'setup' })
    expect(current()).toBeNull()
    await render({ items, defaultValue: 'setup' })
    expect(current()).toBe('setup')
  })
})

describe('Toc root', () => {
  it('native attributes and ref reach the nav; aria-label and aria-labelledby replace the default name', async () => {
    const ref = createRef<HTMLElement>()
    await act(async () =>
      root.render(
        <Toc
          ref={ref}
          items={items}
          id="outline"
          data-testid="toc"
          dir="rtl"
          style={{ maxWidth: 240 }}
          className="custom"
          aria-label="On this page"
        />,
      ),
    )
    const nav = host.querySelector('nav')!
    expect(ref.current).toBe(nav)
    expect(nav.id).toBe('outline')
    expect(nav.dataset.testid).toBe('toc')
    expect(nav.dir).toBe('rtl')
    expect(nav.style.maxWidth).toBe('240px')
    expect(nav.className).toBe('uf-toc custom')
    expect(nav.getAttribute('aria-label')).toBe('On this page')
    await act(async () => root.render(<Toc items={items} aria-labelledby="heading" />))
    expect(host.querySelector('nav')!.getAttribute('aria-labelledby')).toBe('heading')
  })

  it('line names the rail side on the root; none drops it', async () => {
    await render()
    expect(host.querySelector('nav')!.dataset.line).toBe('start')
    await render({ line: 'end' })
    expect(host.querySelector('nav')!.dataset.line).toBe('end')
    await render({ line: 'none' })
    expect(host.querySelector('nav')!.dataset.line).toBe('none')
  })
})
