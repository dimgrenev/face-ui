import { act, StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useRovingFocus,
  type RovingFocus,
} from '../adapters/react/use-roving-focus'
import { mount, type View } from './harness'
import { describeRoving } from './harness/roving'
import {
  RovingProbe,
  type RovingProbeItem,
  type RovingProbeProps,
} from './harness/roving-probe'

const probeItems = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLElement>('[data-value]'))
const selection = (host: HTMLElement) =>
  host.querySelector('[data-roving-probe]')!.getAttribute('data-selected')

describeRoving({
  name: 'RovingProbe (horizontal, manual)',
  orientation: 'horizontal',
  selects: true,
  render: (props) => <RovingProbe orientation="horizontal" {...props} />,
  items: probeItems,
})
describeRoving({
  name: 'RovingProbe (vertical, no loop, typeahead)',
  orientation: 'vertical',
  loop: false,
  typeahead: true,
  render: (props) => (
    <RovingProbe orientation="vertical" loop={false} typeahead {...props} />
  ),
  items: probeItems,
})
describeRoving({
  name: 'RovingProbe (both, activateOnMove)',
  orientation: 'both',
  selects: true,
  activateOnMove: selection,
  render: (props) => (
    <RovingProbe orientation="both" activateOnMove {...props} />
  ),
  items: probeItems,
})
describeRoving({
  name: "RovingProbe (tabStops: 'all')",
  orientation: 'vertical',
  tabStops: 'all',
  render: (props) => (
    <RovingProbe orientation="vertical" tabStops="all" {...props} />
  ),
  items: probeItems,
})

const ITEMS: RovingProbeItem[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
]

describe('useRovingFocus', () => {
  let view: View
  let outside: HTMLButtonElement
  beforeEach(() => {
    view = mount()
    outside = document.body.appendChild(document.createElement('button'))
  })
  afterEach(() => {
    outside.remove()
    vi.restoreAllMocks()
  })
  const show = (ui: ReactNode) =>
    act(async () => view.root.render(<StrictMode>{ui}</StrictMode>))
  const render = (props: Partial<RovingProbeProps> = {}) =>
    show(<RovingProbe orientation="horizontal" items={ITEMS} {...props} />)
  const item = (value: string, scope: ParentNode = view.host) =>
    scope.querySelector<HTMLElement>(`[data-value="${value}"]`)!
  const focused = () => document.activeElement?.getAttribute('data-value')
  const focus = (element: HTMLElement) => act(async () => element.focus())
  const press = async (key: string) => {
    let prevented = false
    await act(async () => {
      prevented = !document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      )
    })
    return prevented
  }

  it('isolates nested groups: each moves only between its own items', async () => {
    await show(
      <RovingProbe orientation="vertical" items={ITEMS} typeahead>
        <div data-inner="">
          <RovingProbe
            orientation="horizontal"
            items={[
              { value: 'p', label: 'Papa' },
              { value: 'q', label: 'Quebec' },
            ]}
          />
        </div>
      </RovingProbe>,
    )
    const inner = view.host.querySelector('[data-inner]')!
    await focus(item('p', inner))
    // Down belongs to neither: the outer group must not take it from an inner item.
    expect(await press('ArrowDown')).toBe(false)
    expect(await press('c')).toBe(false)
    expect(focused()).toBe('p')
    await press('ArrowRight')
    expect(focused()).toBe('q')
    await focus(item('a'))
    await press('ArrowDown')
    expect(focused()).toBe('b')
    expect(item('q', inner).tabIndex).toBe(0)
    expect(item('p', inner).tabIndex).toBe(-1)
  })

  it('keyOf knows only the elements currently registered for this group', async () => {
    let roving!: RovingFocus
    function Group({ keys }: { keys: string[] }) {
      roving = useRovingFocus({ keys, orientation: 'horizontal' })
      return (
        <div {...roving.root}>
          {keys.map((key) => (
            <button key={key} {...roving.item(key)} data-value={key}>
              <span />
            </button>
          ))}
        </div>
      )
    }
    await show(<Group keys={['a', 'b']} />)
    const a = item('a')
    expect(roving.keyOf(a)).toBe('a')
    expect(roving.keyOf(a.firstElementChild)).toBeNull()
    expect(roving.keyOf(null)).toBeNull()
    expect(roving.keyOf(document.body)).toBeNull()
    await show(<Group keys={['b']} />)
    expect(roving.keyOf(a)).toBeNull()
    // focus() moves focus without activating.
    const click = vi.fn()
    item('b').addEventListener('click', click)
    await act(async () => roving.focus('b'))
    expect(focused()).toBe('b')
    expect(click).not.toHaveBeenCalled()
  })

  it('skips items a disabled fieldset disables at event time, and recovers from them', async () => {
    const items = ITEMS.map((entry) =>
      entry.value === 'b' || entry.value === 'c'
        ? { ...entry, fieldset: true }
        : entry,
    )
    await render({ items, fieldsetDisabled: true })
    // jsdom focuses disabled elements that have a tabindex; browsers do not.
    const entered = vi.fn()
    view.host.addEventListener('focusin', (event) =>
      entered((event.target as HTMLElement).dataset.value),
    )
    await focus(item('a'))
    await press('ArrowRight')
    expect(focused()).toBe('d')
    expect(entered.mock.calls).toEqual([['a'], ['d']])
    await press('ArrowRight')
    expect(focused()).toBe('a')
    await render({ items, fieldsetDisabled: false })
    await press('ArrowRight')
    expect(focused()).toBe('b')
    await render({ items, fieldsetDisabled: true })
    expect(focused()).toBe('d')
  })

  it('recovers from hiding the focused item; a hidden group recovers nothing', async () => {
    const hide = (value: string) =>
      ITEMS.map((entry) =>
        entry.value === value ? { ...entry, hidden: true } : entry,
      )
    await render()
    await focus(item('b'))
    await render({ items: hide('b') })
    expect(focused()).toBe('c')
    await render({ items: hide('b'), style: { display: 'none' } })
    expect(focused()).not.toBe('d')
  })

  it('beside the items, as in a Tabs panel: the tab stop is the selection, and a lost focus recovers to it', async () => {
    const panel = (input: boolean) =>
      show(
        <RovingProbe orientation="horizontal" items={ITEMS} defaultValue="d">
          {input && <input />}
        </RovingProbe>,
      )
    await panel(true)
    const input = view.host.querySelector('input')!
    // Focus enters the root beside the items first.
    await focus(input)
    await panel(false)
    expect(focused()).toBe('d')
    await panel(true)
    await focus(item('b'))
    await focus(view.host.querySelector('input')!)
    expect(item('d').tabIndex).toBe(0)
  })

  it('arrows continue from the place of a focused item they skip', async () => {
    const items = ITEMS.map((entry) =>
      entry.value === 'b' ? { ...entry, disabled: true } : entry,
    )
    await render({ items, ariaDisabled: true })
    for (const [key, to] of [
      ['ArrowRight', 'c'],
      ['ArrowLeft', 'a'],
      ['Home', 'a'],
      ['End', 'd'],
    ]) {
      await focus(item('b'))
      await press(key)
      expect(focused()).toBe(to)
    }
  })

  it("a consumer's preventDefault() on keydown keeps the move from happening", async () => {
    await show(
      <div onKeyDownCapture={(event) => event.preventDefault()}>
        <RovingProbe orientation="horizontal" items={ITEMS} />
      </div>,
    )
    await focus(item('a'))
    await press('ArrowRight')
    expect(focused()).toBe('a')
  })

  it('scrollRef: a move scrolls only that container, and focus does not scroll', async () => {
    const focusCall = vi.spyOn(HTMLElement.prototype, 'focus')
    await render({ scroll: true })
    const list = view.host.querySelector<HTMLElement>('[role="group"]')!
    const box = (left: number, width: number, top = 0, height = 30) =>
      ({ left, right: left + width, top, bottom: top + height }) as DOMRect
    list.getBoundingClientRect = () => box(0, 100, 0, 40)
    Object.defineProperties(list, {
      clientWidth: { value: 100 },
      clientHeight: { value: 40 },
    })
    ITEMS.forEach(({ value }, index) => {
      item(value).getBoundingClientRect = () => box(index * 60, 50)
    })
    const scrolls = new Map<Element, unknown[]>()
    for (const element of [list, list.parentElement!, view.host])
      element.scrollBy = ((options: unknown) =>
        scrolls.set(element, [
          ...(scrolls.get(element) ?? []),
          options,
        ])) as Element['scrollBy']
    await focus(item('b'))
    focusCall.mockClear()
    await press('ArrowRight')
    expect(focused()).toBe('c')
    expect(focusCall.mock.calls).toEqual([[{ preventScroll: true }]])
    expect([...scrolls]).toEqual([
      [list, [{ left: 70, top: 0, behavior: 'instant' }]],
    ])
    // Without scrollRef the browser reveals the item as focus() always does.
    view = mount()
    await render()
    await focus(item('b'))
    focusCall.mockClear()
    await press('ArrowRight')
    expect(focusCall.mock.calls).toEqual([[undefined]])
  })

  it('autoFocus focuses the tab stop once, StrictMode replay included', async () => {
    const focusCall = vi.spyOn(HTMLElement.prototype, 'focus')
    await render({ autoFocus: true, defaultValue: 'c' })
    expect(focused()).toBe('c')
    expect(focusCall).toHaveBeenCalledTimes(1)
    await focus(outside)
    await render({ autoFocus: true, defaultValue: 'c' })
    expect(document.activeElement).toBe(outside)
  })
})
