import {
  act,
  StrictMode,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '../../Modal/Modal'
import { Overlay } from '../../Overlay/Overlay'
import { Popover } from '../../Popover/Popover'
import { Tooltip } from '../../Tooltip/Tooltip'
import { useLayer } from '../adapters/react/use-layer'
import {
  isRestoringFocus,
  layerContains,
  registerLayer,
  restoreFocus,
  type Layer,
} from '../runtime/layers'
import { mount } from './harness'

const render = async (ui: ReactNode) => {
  const { root } = mount()
  await act(async () => root.render(<StrictMode>{ui}</StrictMode>))
}
const byId = (id: string) => document.getElementById(id) as HTMLElement
const pointerEvent = (type: string, pointerType: string) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}
/**
 * A press as a browser dispatches it: pointerdown (React commits in between),
 * then unless it was prevented the mousedown focus move, then the click.
 */
const press = async (node: Element, pointerType = 'mouse') => {
  let prevented = false
  await act(async () => {
    prevented = !node.dispatchEvent(pointerEvent('pointerdown', pointerType))
  })
  await act(async () => {
    if (!prevented) {
      const focusable = node.closest<HTMLElement>('button, input, [tabindex]')
      if (focusable) focusable.focus()
      else (document.activeElement as HTMLElement | null)?.blur()
    }
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
const key = async (node: Element, name: string) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    )
  })
const focus = async (node: HTMLElement) => act(async () => node.focus())
/** Open surfaces by ARIA role: FloatingOverlay keeps closed surfaces hidden. */
const open = (role: 'dialog' | 'tooltip') =>
  [...document.querySelectorAll<HTMLElement>(`[role="${role}"]`)].some(
    (node) => !node.hidden && !node.closest('[hidden]'),
  )

afterEach(() => {
  vi.useRealTimers()
})

describe('the outside press walks the stack', () => {
  const stack: Array<() => void> = []
  const nodes = (...ids: string[]) => {
    for (const id of ids)
      document.body.append(Object.assign(document.createElement('div'), { id }))
  }
  const layer = (id: string, extra: Partial<Layer> = {}) => {
    const onOutside = vi.fn()
    const entry: Layer = { elements: () => [byId(id)], onOutside, ...extra }
    stack.push(registerLayer(document, entry))
    return onOutside
  }
  afterEach(() => {
    for (const unregister of stack.splice(0)) unregister()
    document.body.replaceChildren()
  })

  it('dismisses every layer above the nearest modal the press is outside of', async () => {
    nodes('page', 'base', 'dialog', 'popover', 'tooltip')
    const base = layer('base')
    const dialog = layer('dialog', { modal: () => byId('dialog') })
    const popover = layer('popover')
    layer('tooltip', { onOutside: undefined })
    await press(byId('page'))
    expect(popover).toHaveBeenCalledTimes(1)
    expect(dialog).toHaveBeenCalledTimes(1)
    // Below the modal floor, content is inert and never reached.
    expect(base).not.toHaveBeenCalled()
  })

  it('stops at the first layer that contains the press', async () => {
    nodes('parent', 'child', 'top')
    const parent = layer('parent')
    const child = layer('child')
    const top = layer('top')
    await press(byId('child'))
    expect([top, child, parent].map((fn) => fn.mock.calls.length)).toEqual([
      1, 0, 0,
    ])
  })

  it('a mouse press dismisses on pointerdown and its click does not dismiss again', async () => {
    nodes('page', 'popover')
    const popover = layer('popover')
    await act(async () =>
      byId('page').dispatchEvent(pointerEvent('pointerdown', 'mouse')),
    )
    expect(popover).toHaveBeenCalledTimes(1)
    await act(async () =>
      byId('page').dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    expect(popover).toHaveBeenCalledTimes(1)
    // A click without a press (keyboard, assistive technology) dismisses.
    await act(async () =>
      byId('page').dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    expect(popover).toHaveBeenCalledTimes(2)
  })

  it('a touch press waits for its click; a cancelled touch (scroll) never dismisses', async () => {
    nodes('page', 'popover')
    const popover = layer('popover')
    await act(async () => {
      byId('page').dispatchEvent(pointerEvent('pointerdown', 'touch'))
      byId('page').dispatchEvent(pointerEvent('pointercancel', 'touch'))
    })
    expect(popover).not.toHaveBeenCalled()
    await act(async () =>
      byId('page').dispatchEvent(pointerEvent('pointerdown', 'touch')),
    )
    expect(popover).not.toHaveBeenCalled()
    await act(async () =>
      byId('page').dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    expect(popover).toHaveBeenCalledTimes(1)
  })

  it('Escape reaches only the top layer', async () => {
    nodes('parent', 'child')
    const onEscape = [vi.fn(), vi.fn()]
    layer('parent', { onEscape: onEscape[0] })
    layer('child', { onEscape: onEscape[1] })
    await key(document.body, 'Escape')
    expect(onEscape.map((fn) => fn.mock.calls.length)).toEqual([0, 1])
  })

  it('layerContains follows nested portals but not unrelated layers above', () => {
    nodes('parent', 'child', 'unrelated', 'elsewhere')
    const trigger = byId('parent').appendChild(document.createElement('button'))
    const parent: Layer = { elements: () => [byId('parent')] }
    stack.push(registerLayer(document, parent))
    stack.push(
      registerLayer(document, { elements: () => [byId('child'), trigger] }),
    )
    stack.push(registerLayer(document, { elements: () => [byId('unrelated')] }))
    expect(
      ['parent', 'child', 'unrelated', 'elsewhere'].map((id) =>
        layerContains(parent, byId(id)),
      ),
    ).toEqual([true, true, false, false])
  })

  it('restoreFocus marks the focus it moves as programmatic', () => {
    const button = document.body.appendChild(document.createElement('button'))
    const seen: boolean[] = []
    button.addEventListener('focus', () => seen.push(isRestoringFocus()))
    restoreFocus(button)
    button.blur()
    button.focus()
    expect(seen).toEqual([true, false])
    expect(isRestoringFocus()).toBe(false)
  })
})

describe('nested components', () => {
  const shareWithTooltip = (
    <>
      <button id="outside">Outside</button>
      <Popover
        content={
          <>
            <p id="text">Body</p>
            <Tooltip content="Copy link" openDelay={0}>
              <button id="inner">Copy</button>
            </Tooltip>
          </>
        }
      >
        <button id="trigger">Share</button>
      </Popover>
    </>
  )

  it('Popover ⊃ focus-opened Tooltip: an outside press closes both and leaves focus alone', async () => {
    await render(shareWithTooltip)
    await act(async () => byId('trigger').click())
    await focus(byId('inner'))
    expect([open('dialog'), open('tooltip')]).toEqual([true, true])
    await press(byId('outside'))
    expect([open('dialog'), open('tooltip')]).toEqual([false, false])
    expect(document.activeElement).toBe(byId('outside'))
  })

  it('Popover ⊃ Tooltip: a press inside the popover keeps it open', async () => {
    await render(shareWithTooltip)
    await act(async () => byId('trigger').click())
    await focus(byId('inner'))
    await press(byId('text'))
    expect(open('dialog')).toBe(true)
  })

  it('Modal + focus-opened Tooltip: a backdrop press still closes the modal', async () => {
    const onOpenChange = vi.fn()
    await render(
      <Modal open title="Edit" onOpenChange={onOpenChange}>
        <Tooltip content="Hint" openDelay={0}>
          <button id="act">Act</button>
        </Tooltip>
      </Modal>,
    )
    await focus(byId('act'))
    expect(open('tooltip')).toBe(true)
    await press(document.querySelector('.uf-modal-backdrop')!)
    expect(onOpenChange).toHaveBeenCalledWith({ open: false })
  })

  it('Modal ⊃ Popover: closing from the backdrop returns focus the popover held', async () => {
    function App() {
      const [isOpen, setOpen] = useState(false)
      return (
        <Modal
          open={isOpen}
          onOpenChange={(details) => setOpen(details.open)}
          title="Edit"
          trigger={<button id="opener">Open</button>}
        >
          <Popover content={<button id="nested">Nested</button>}>
            <button id="more">More</button>
          </Popover>
        </Modal>
      )
    }
    await render(<App />)
    await act(async () => byId('opener').click())
    await act(async () => byId('more').click())
    expect(document.activeElement).toBe(byId('nested'))
    await press(document.querySelector('.uf-modal-backdrop')!)
    expect(open('dialog')).toBe(false)
    expect(document.activeElement).toBe(byId('opener'))
  })

  it('touch: a scroll attempt keeps the popover; a tap outside closes it', async () => {
    await render(shareWithTooltip)
    await act(async () => byId('trigger').click())
    await act(async () => {
      byId('outside').dispatchEvent(pointerEvent('pointerdown', 'touch'))
      byId('outside').dispatchEvent(pointerEvent('pointercancel', 'touch'))
    })
    expect(open('dialog')).toBe(true)
    await press(byId('outside'), 'touch')
    expect(open('dialog')).toBe(false)
  })
})

describe('initial focus', () => {
  it('Modal: [data-autofocus] in pre-mounted content wins over the first tabbable', async () => {
    function App() {
      const [isOpen, setOpen] = useState(false)
      return (
        <>
          <button id="opener" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal
            open={isOpen}
            onOpenChange={(details) => setOpen(details.open)}
            title="Edit"
          >
            <input name="email" data-autofocus />
          </Modal>
        </>
      )
    }
    await render(<App />)
    await act(async () => byId('opener').click())
    expect(document.activeElement).toBe(
      document.querySelector('input[name="email"]'),
    )
  })

  it('controlled Popover: focus a child took itself is kept', async () => {
    function SelfFocus({ on }: { on: boolean }) {
      const ref = useRef<HTMLInputElement>(null)
      useEffect(() => {
        if (on) ref.current?.focus()
      }, [on])
      return <input ref={ref} name="search" />
    }
    function App() {
      const [isOpen, setOpen] = useState(false)
      return (
        <Popover
          open={isOpen}
          onOpenChange={(details) => setOpen(details.open)}
          content={
            <>
              <button>First</button>
              <SelfFocus on={isOpen} />
            </>
          }
        >
          <button id="trigger">Search</button>
        </Popover>
      )
    }
    await render(<App />)
    await act(async () => byId('trigger').click())
    expect(document.activeElement).toBe(
      document.querySelector('input[name="search"]'),
    )
  })
})

describe('useLayer', () => {
  type HarnessProps = {
    open: boolean
    modal?: boolean
    initialFocus?: boolean
    children?: ReactNode
  }
  function Harness(props: HarnessProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    useLayer({
      enabled: props.open,
      contentRef,
      triggerRef,
      modal: props.modal,
      autoFocus: true,
      initialFocus: props.initialFocus ? () => byId('initial') : undefined,
      restoreFocus: true,
    })
    return (
      <>
        <button id="page">Page</button>
        <p id="blank">Blank</p>
        <button id="trigger" ref={triggerRef}>
          Trigger
        </button>
        <div id="content" ref={contentRef} tabIndex={-1} hidden={!props.open}>
          {props.children}
        </div>
      </>
    )
  }
  const view = () => {
    const { root } = mount()
    return async (props: HarnessProps, key = 0) =>
      act(async () => root.render(<Harness key={key} {...props} />))
  }

  it('focuses [data-autofocus], then initialFocus(), then the first tabbable, then the surface', async () => {
    const cases: Array<[HarnessProps, string]> = [
      [
        {
          open: true,
          initialFocus: true,
          children: (
            <>
              <button id="first" />
              <button id="initial" />
              <button id="marked" data-autofocus="" />
            </>
          ),
        },
        'marked',
      ],
      [
        {
          open: true,
          initialFocus: true,
          children: (
            <>
              <button id="first" />
              <button id="initial" />
              <button id="marked" data-autofocus="" hidden />
            </>
          ),
        },
        'initial',
      ],
      [{ open: true, children: <button id="first" /> }, 'first'],
      [{ open: true }, 'content'],
    ]
    const renderHarness = view()
    for (const [index, [props, expected]] of cases.entries()) {
      // Pre-mounted and hidden first, as overlay surfaces are.
      await renderHarness({ ...props, open: false }, index)
      await renderHarness(props, index)
      expect(document.activeElement?.id).toBe(expected)
    }
  })

  it('returns focus only when the layer owned it', async () => {
    const renderHarness = view()
    const content = <button id="inside" />
    await renderHarness({ open: true, children: content })
    expect(document.activeElement?.id).toBe('inside')
    // The user moves on; closing must not pull focus back.
    await focus(byId('page'))
    await renderHarness({ open: false, children: content })
    expect(document.activeElement?.id).toBe('page')
    // Focus inside, then lost to <body> (the control was removed): still owned.
    await renderHarness({ open: true, children: content })
    await act(async () => byId('inside').blur())
    await renderHarness({ open: false, children: content })
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('non-modal: an outside press forfeits the return until focus comes back inside', async () => {
    const renderHarness = view()
    const props = { open: true, children: <button id="inside" /> }
    await renderHarness(props)
    // Focus falls to <body>, still owned, but the press went outside.
    await press(byId('blank'))
    expect(document.activeElement).toBe(document.body)
    await renderHarness({ ...props, open: false })
    expect(document.activeElement).toBe(document.body)
    // A refused outside press, then the user returns inside and closes.
    await renderHarness(props)
    await press(byId('blank'))
    await focus(byId('inside'))
    await renderHarness({ ...props, open: false })
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('modal: a press outside keeps focus inside and returns it on close', async () => {
    const renderHarness = view()
    const props = { open: true, modal: true, children: <button id="inside" /> }
    await renderHarness(props)
    await press(byId('blank'))
    expect(document.activeElement?.id).toBe('inside')
    await renderHarness({ ...props, open: false })
    expect(document.activeElement?.id).toBe('trigger')
  })
})

describe('interactive hover card', () => {
  const hoverCard = (
    <Overlay interactive openDelay={200} content={<button>Action</button>}>
      <button
        id="card-trigger"
        onFocus={() => focusLog.push(isRestoringFocus())}
      >
        Trigger
      </button>
    </Overlay>
  )
  const focusLog: boolean[] = []
  const hover = async (type: 'pointerover' | 'pointerout') =>
    act(async () => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        relatedTarget: type === 'pointerout' ? document.body : null,
      })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      byId('card-trigger').dispatchEvent(event)
    })
  const advance = async (ms: number) =>
    act(async () => {
      vi.advanceTimersByTime(ms)
    })

  it('closing after the pointer leaves neither steals focus nor reopens', async () => {
    vi.useFakeTimers()
    await render(hoverCard)
    await hover('pointerover')
    await advance(250)
    expect(open('dialog')).toBe(true)
    await hover('pointerout')
    await advance(300)
    expect([open('dialog'), document.activeElement]).toEqual([
      false,
      document.body,
    ])
  })

  it('Escape from the content returns focus to the trigger as a programmatic restore', async () => {
    vi.useFakeTimers()
    await render(hoverCard)
    await focus(byId('card-trigger'))
    await advance(250)
    const action = document.querySelector<HTMLElement>(
      '[role="dialog"] button',
    )!
    await focus(action)
    focusLog.length = 0
    await key(action, 'Escape')
    expect(open('dialog')).toBe(false)
    expect(document.activeElement).toBe(byId('card-trigger'))
    expect(focusLog).toEqual([true])
  })
})
