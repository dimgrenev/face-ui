import { act, StrictMode, type ReactElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Orientation } from '../../runtime/keyboard'
import { hydrate, mount, type View } from './index'

export interface RovingItem {
  value: string
  label: string
  disabled?: boolean
}

export interface RovingSpec {
  /** Suite name, such as `'Tabs'`. */
  name: string
  /** Renders the component with `items`; `defaultValue` is its initial selection where it has one. */
  render: (props: {
    items: readonly RovingItem[]
    defaultValue?: string
  }) => ReactElement
  /** The focusable element of every item, in item order, disabled ones included. */
  items: (host: HTMLElement) => HTMLElement[]
  /** The arrows the component answers to. */
  orientation: Orientation
  /** `'all'` when every enabled item is in the tab order; default `'one'`. */
  tabStops?: 'one' | 'all'
  /** Arrows wrap at the ends; default true. */
  loop?: boolean
  /** The component has a selection, and it is the tab stop while focus is outside. */
  selects?: boolean
  /** Keyboard moves select the reached item: reads the selected value from the DOM. */
  activateOnMove?: (host: HTMLElement) => string | null
  /** Printable keys move focus to the next item whose label starts with them. */
  typeahead?: boolean
}

// The first item is disabled, so "first" and wrapping must skip it.
const ITEMS: readonly RovingItem[] = [
  { value: 'a', label: 'Alpha', disabled: true },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
]

const AXES: Record<
  Orientation,
  { next: string[]; prev: string[]; cross: string[] }
> = {
  horizontal: {
    next: ['ArrowRight'],
    prev: ['ArrowLeft'],
    cross: ['ArrowDown', 'ArrowUp'],
  },
  vertical: {
    next: ['ArrowDown'],
    prev: ['ArrowUp'],
    cross: ['ArrowRight', 'ArrowLeft'],
  },
  both: {
    next: ['ArrowDown', 'ArrowRight'],
    prev: ['ArrowUp', 'ArrowLeft'],
    cross: [],
  },
}

/**
 * The keyboard focus contract of one useRovingFocus group, run in StrictMode: server/client
 * tab stop parity, arrows along the orientation (RTL included), Home/End, wrapping, disabled
 * items, foreign keys, the tab stop after focus leaves, activation on move and its cancellation,
 * typeahead, and recovery when the focused item is removed or disabled.
 */
export function describeRoving(spec: RovingSpec) {
  const { orientation, tabStops = 'one', loop = true, selects = false } = spec
  const axis = AXES[orientation]

  describe(`${spec.name}: roving focus contract`, () => {
    let view: View
    let shown = ITEMS
    let outside: HTMLButtonElement
    beforeEach(() => {
      view = mount()
      shown = ITEMS
      outside = document.body.appendChild(document.createElement('button'))
    })
    afterEach(() => outside.remove())

    const render = (
      props: { items?: readonly RovingItem[]; defaultValue?: string } = {},
      wrap = (ui: ReactElement): ReactNode => ui,
    ) => {
      shown = props.items ?? ITEMS
      return act(async () =>
        view.root.render(
          <StrictMode>
            {wrap(spec.render({ ...props, items: shown }))}
          </StrictMode>,
        ),
      )
    }
    const node = (value: string) =>
      spec.items(view.host)[shown.findIndex((item) => item.value === value)]
    const valueOf = (element: Element | null, host: HTMLElement = view.host) =>
      shown[spec.items(host).indexOf(element as HTMLElement)]?.value ?? null
    const focused = () => valueOf(document.activeElement)
    const stops = (host: HTMLElement = view.host) =>
      spec
        .items(host)
        .filter((element) => element.tabIndex === 0)
        .map((element) => valueOf(element, host))
    const focus = (element: HTMLElement) => act(async () => element.focus())
    /** Dispatches a keydown on the focused element; true when the component prevented it. */
    const press = async (key: string, init: KeyboardEventInit = {}) => {
      let prevented = false
      await act(async () => {
        prevented = !document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
            ...init,
          }),
        )
      })
      return prevented
    }

    it('server and client render the same tab stops', async () => {
      const ui = (
        <StrictMode>
          {spec.render({ items: ITEMS, ...(selects && { defaultValue: 'c' }) })}
        </StrictMode>
      )
      const server = document.createElement('div')
      server.innerHTML = renderToString(ui)
      const expected =
        tabStops === 'all' ? ['b', 'c', 'd'] : [selects ? 'c' : 'b']
      expect(stops(server)).toEqual(expected)
      const host = document.body.appendChild(document.createElement('div'))
      const { recoverableErrors } = await hydrate(ui, host)
      expect(recoverableErrors).toEqual([])
      expect(stops(host)).toEqual(expected)
    })

    it('arrows, Home and End move focus between enabled items', async () => {
      await render()
      for (const [next, prev] of axis.next.map((key, i) => [
        key,
        axis.prev[i],
      ])) {
        await focus(node('b'))
        expect(await press(next)).toBe(true)
        expect(focused()).toBe('c')
        if (tabStops === 'one') expect(stops()).toEqual(['c'])
        await press(next)
        expect(focused()).toBe('d')
        expect(await press(next)).toBe(true)
        expect(focused()).toBe(loop ? 'b' : 'd')
        await press('Home')
        expect(focused()).toBe('b')
        expect(await press(prev)).toBe(true)
        expect(focused()).toBe(loop ? 'd' : 'b')
        await press('End')
        expect(focused()).toBe('d')
        await press(prev)
        expect(focused()).toBe('c')
      }
    })

    it('other arrows and keys with Alt, Ctrl or Meta are left alone', async () => {
      await render()
      await focus(node('c'))
      for (const key of axis.cross) expect(await press(key)).toBe(false)
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey'])
        expect(await press(axis.next[0], { [modifier]: true })).toBe(false)
      expect(focused()).toBe('c')
    })

    if (orientation !== 'vertical')
      it('right and left swap in RTL', async () => {
        await render({}, (ui) => <div dir="rtl">{ui}</div>)
        await focus(node('b'))
        await press('ArrowLeft')
        expect(focused()).toBe('c')
        await press('ArrowRight')
        expect(focused()).toBe('b')
      })

    if (tabStops === 'one')
      it(`after focus leaves, the tab stop is ${selects ? 'the selection' : 'the last focused item'}`, async () => {
        await render(selects ? { defaultValue: 'd' } : {})
        await focus(node('b'))
        await press(axis.next[0])
        expect(stops()).toEqual(['c'])
        await focus(outside)
        expect(stops()).toEqual([selects && !spec.activateOnMove ? 'd' : 'c'])
      })

    if (spec.activateOnMove) {
      const read = spec.activateOnMove
      it("a move activates the reached item; the consumer's preventDefault() cancels it", async () => {
        await render({ defaultValue: 'b' })
        await focus(node('b'))
        await press(axis.next[0])
        expect(read(view.host)).toBe('c')
        view = mount()
        await render({ defaultValue: 'b' }, (ui) => (
          <div onClickCapture={(event) => event.preventDefault()}>{ui}</div>
        ))
        await focus(node('b'))
        await press(axis.next[0])
        expect(focused()).toBe('c')
        expect(read(view.host)).toBe('b')
      })
    }

    if (spec.typeahead)
      it('printable keys move focus by typeahead; a leading Space stays activation', async () => {
        await render()
        await focus(node('b'))
        expect(await press(' ')).toBe(false)
        expect(await press('d')).toBe(true)
        expect(focused()).toBe('d')
        // "da" matches nothing: focus stays, the key is still consumed.
        expect(await press('a')).toBe(true)
        expect(focused()).toBe('d')
        view = mount()
        await render()
        await focus(node('c'))
        // Alpha is disabled.
        await press('a')
        expect(focused()).toBe('c')
      })

    it('focus moves to a neighbour when the focused item is removed or disabled', async () => {
      await render()
      await focus(node('c'))
      // The item that takes its place.
      await render({ items: ITEMS.filter((item) => item.value !== 'c') })
      expect(focused()).toBe('d')
      // Nothing takes the last item's place: the one before it.
      await render()
      await render({ items: ITEMS.filter((item) => item.value !== 'd') })
      expect(focused()).toBe('c')
      await render({
        items: ITEMS.map((item) =>
          item.value === 'c' ? { ...item, disabled: true } : item,
        ),
      })
      expect(focused()).toBe('d')
    })
  })
}
