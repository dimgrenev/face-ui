// @vitest-environment jsdom
import {
  act,
  createRef,
  Fragment,
  StrictMode,
  useState,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tooltip } from '../../Tooltip/Tooltip'
import { Popover } from '../../Popover/Popover'
import { Overlay } from '../../Overlay/Overlay'

let root: Root, host: HTMLDivElement
const render = async (node: ReactNode) => act(async () => root.render(node))
const surface = () => document.querySelector<HTMLElement>('.uf-overlay-content')
const trigger = () => host.querySelector<HTMLButtonElement>('button')!
const visible = () => !!surface() && !surface()!.hidden
const click = async () => act(async () => trigger().click())
const focus = async () => act(async () => trigger().focus())
const blur = async () => act(async () => trigger().blur())
const advance = async (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms)
  })
const pointer = async (
  node: Element,
  type: 'pointerover' | 'pointerout',
  relatedTarget: EventTarget | null = null,
  pointerType = 'mouse',
) =>
  act(async () => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      relatedTarget,
    })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    node.dispatchEvent(event)
  })
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

for (const [name, Component] of [
  ['Tooltip', Tooltip],
  ['Popover', Popover],
] as const)
  describe(name, () => {
    it('owns native attributes, native title, style, class and ref on one semantic surface', async () => {
      const ref = createRef<HTMLDivElement>()
      await render(
        <Component
          open
          content="Content"
          ref={ref}
          id="surface"
          title="Native title"
          lang="ru"
          dir="rtl"
          className="custom"
          style={{ opacity: 0.4 }}
          aria-label="Label"
          data-test="native"
        >
          <button>Trigger</button>
        </Component>,
      )
      expect(ref.current).toBe(surface())
      expect(surface()?.classList.contains('custom')).toBe(true)
      expect(surface()?.style.opacity).toBe('0.4')
      for (const [attr, value] of Object.entries({
        id: 'surface',
        title: 'Native title',
        lang: 'ru',
        dir: 'rtl',
        'aria-label': 'Label',
        'data-test': 'native',
      }))
        expect(surface()?.getAttribute(attr)).toBe(value)
      expect(surface()?.textContent).toBe('Content')
      await render(null)
      expect(ref.current).toBeNull()
    })
    it.each(
      [null, undefined, false, '', '   ', [], <Fragment />].map(
        (content, index) => [index, content] as const,
      ),
    )(
      'empty content case %i has no layer or extra ARIA relation',
      async (_index, content) => {
        await render(
          <Component open content={content}>
            <button aria-describedby="existing">Trigger</button>
          </Component>,
        )
        expect(surface()).toBeNull()
        expect(trigger().getAttribute('aria-describedby')).toBe('existing')
        expect(trigger().hasAttribute('aria-controls')).toBe(false)
      },
    )
    it.each(
      [0, <Fragment>Help</Fragment>, ['One', 'Two']].map(
        (content, index) => [index, content] as const,
      ),
    )(
      'meaningful content case %i remains rendered',
      async (_index, content) => {
        await render(
          <Component open content={content}>
            <button>Trigger</button>
          </Component>,
        )
        expect(visible()).toBe(true)
        expect(surface()?.textContent?.length).toBeGreaterThan(0)
      },
    )
    it('empty trigger exposes no orphan layer', async () => {
      await render(<Component open content="Content" />)
      expect(surface()).toBeNull()
      expect(host.textContent).toBe('')
    })
    it('defaultOpen initializes once and later changes do not reset the state', async () => {
      const change = vi.fn()
      await render(
        <Component defaultOpen content="Content" onOpenChange={change}>
          <button>Trigger</button>
        </Component>,
      )
      expect(visible()).toBe(true)
      expect(change).not.toHaveBeenCalled()
      await render(
        <Component defaultOpen={false} content="Content" onOpenChange={change}>
          <button>Trigger</button>
        </Component>,
      )
      expect(visible()).toBe(true)
      expect(change).not.toHaveBeenCalled()
    })
    it('external controlled updates are silent and override defaultOpen', async () => {
      const change = vi.fn()
      for (const open of [false, true, false, true]) {
        await render(
          <Component
            open={open}
            defaultOpen
            content="Content"
            onOpenChange={change}
          >
            <button>Trigger</button>
          </Component>,
        )
        expect(visible()).toBe(open)
        expect(change).not.toHaveBeenCalled()
      }
    })
    it('hidden closes uncontrolled state quietly and removes global dismissal', async () => {
      const change = vi.fn()
      await render(
        <Component defaultOpen content="Content" onOpenChange={change}>
          <button>Trigger</button>
        </Component>,
      )
      await render(
        <Component hidden defaultOpen content="Content" onOpenChange={change}>
          <button>Trigger</button>
        </Component>,
      )
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
      })
      expect(visible()).toBe(false)
      expect(change).not.toHaveBeenCalled()
      await render(
        <Component defaultOpen content="Content" onOpenChange={change}>
          <button>Trigger</button>
        </Component>,
      )
      expect(visible()).toBe(false)
    })
    it('controlled visibility resumes after hidden is removed', async () => {
      for (const hidden of [false, true, false]) {
        await render(
          <Component open hidden={hidden} content="Content">
            <button>Trigger</button>
          </Component>,
        )
        expect(visible()).toBe(!hidden)
      }
    })
    it('preserves trigger identity and ref through an unwrapped fragment', async () => {
      const ref = createRef<HTMLButtonElement>()
      await render(
        <Component open content="Content">
          <Fragment>
            <button id="my-trigger" ref={ref}>
              Trigger
            </button>
          </Fragment>
        </Component>,
      )
      expect(ref.current).toBe(trigger())
      expect(trigger().id).toBe('my-trigger')
      await render(null)
      expect(ref.current).toBeNull()
    })
  })

it('Popover rejects hover-only props at runtime for untyped consumers', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  for (const props of [
    { openDelay: 1 },
    { closeDelay: 1 },
    { interactive: true },
  ]) {
    expect(() =>
      renderToString(
        <Popover {...(props as any)} content="Help">
          Trigger
        </Popover>,
      ),
    ).toThrow(/Click overlays/)
  }
})
it.each([
  { side: 'above' },
  { align: 'left' },
  { sideOffset: -1 },
  { sideOffset: NaN },
  { sideOffset: Infinity },
  { sideOffset: '4' },
  { open: null },
  { defaultOpen: 1 },
  { dir: 'sideways' },
  { openDelay: -1 },
  { openDelay: Infinity },
  { openDelay: NaN },
  { openDelay: null },
  { closeDelay: '1' },
  { closeDelay: 2147483648 },
])(
  'rejects invalid props %s instead of broken positions or overflowing timers',
  (props) => {
    expect(() =>
      renderToString(
        <Tooltip {...(props as any)} content="Help">
          Trigger
        </Tooltip>,
      ),
    ).toThrow()
  },
)
it('legacy hovercard validates interactive and click discrimination', () => {
  expect(() =>
    renderToString(
      <Overlay {...({ interactive: 'yes' } as any)} content="Help">
        Trigger
      </Overlay>,
    ),
  ).toThrow(/interactive/)
  expect(() =>
    renderToString(
      <Overlay
        {...({ trigger: 'click', interactive: true } as any)}
        content="Help"
      >
        Trigger
      </Overlay>,
    ),
  ).toThrow(/Click overlays/)
})
it('Popover uses its trigger for an accessible name unless the caller provides one', async () => {
  await render(
    <Popover open content="Content">
      <button>Trigger label</button>
    </Popover>,
  )
  expect(surface()?.getAttribute('aria-labelledby')).toBe(trigger().id)
  await render(
    <Popover open aria-label="Details" content="Content">
      <button>Trigger label</button>
    </Popover>,
  )
  expect(surface()?.getAttribute('aria-labelledby')).toBeNull()
  await render(
    <Popover
      open
      aria-labelledby="heading"
      content={<h2 id="heading">Heading</h2>}
    >
      <button>Trigger label</button>
    </Popover>,
  )
  expect(surface()?.getAttribute('aria-labelledby')).toBe('heading')
})
it('Popover controlled refusal supports repeated open and close requests', async () => {
  const change = vi.fn()
  for (const open of [false, true]) {
    await render(
      <Popover open={open} content="Content" onOpenChange={change}>
        <button>Trigger</button>
      </Popover>,
    )
    change.mockClear()
    await click()
    await click()
    expect(change.mock.calls).toEqual([[{ open: !open }], [{ open: !open }]])
    expect(visible()).toBe(open)
  }
})
it('a controlled parent can accept interaction requests without duplicate callbacks', async () => {
  const change = vi.fn()
  function Controlled() {
    const [open, setOpen] = useState(false)
    return (
      <Popover
        open={open}
        content="Content"
        onOpenChange={(details) => {
          change(details)
          setOpen(details.open)
        }}
      >
        <button>Trigger</button>
      </Popover>
    )
  }
  await render(
    <StrictMode>
      <Controlled />
    </StrictMode>,
  )
  await click()
  expect(visible()).toBe(true)
  await click()
  expect(visible()).toBe(false)
  expect(change.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
})
it.each(['capture', 'bubble'])(
  'trigger %s cancellation prevents Popover activation',
  async (phase) => {
    await render(
      <Popover content="Content">
        <button
          {...{
            [phase === 'capture' ? 'onClickCapture' : 'onClick']: (
              event: React.MouseEvent,
            ) => event.preventDefault(),
          }}
        >
          Trigger
        </button>
      </Popover>,
    )
    await click()
    expect(visible()).toBe(false)
  },
)
it('surface keyboard handlers can cancel Escape without suppressing native events', async () => {
  const handler = vi.fn((event: React.KeyboardEvent) => event.preventDefault())
  await render(
    <Popover defaultOpen content={<button>Action</button>} onKeyDown={handler}>
      <button>Trigger</button>
    </Popover>,
  )
  await act(async () => {
    surface()!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  expect(handler).toHaveBeenCalledOnce()
  expect(visible()).toBe(true)
})

describe('hover timing and combined intent', () => {
  beforeEach(() => vi.useFakeTimers())
  it('uses the default 200ms delay and cancels it on early leave', async () => {
    await render(
      <Tooltip content="Help">
        <button>Trigger</button>
      </Tooltip>,
    )
    await pointer(trigger(), 'pointerover')
    await advance(199)
    expect(visible()).toBe(false)
    await pointer(trigger(), 'pointerout')
    await advance(1000)
    expect(visible()).toBe(false)
    await pointer(trigger(), 'pointerover')
    await advance(200)
    expect(visible()).toBe(true)
  })
  it('honors opening and closing delay boundaries, and re-entry cancels closing', async () => {
    const change = vi.fn()
    await render(
      <Tooltip
        content="Help"
        openDelay={50}
        closeDelay={80}
        onOpenChange={change}
      >
        <button>Trigger</button>
      </Tooltip>,
    )
    await focus()
    await advance(49)
    expect(visible()).toBe(false)
    await advance(1)
    expect(visible()).toBe(true)
    await blur()
    await advance(79)
    expect(visible()).toBe(true)
    await focus()
    await advance(100)
    expect(visible()).toBe(true)
    await blur()
    await advance(80)
    expect(visible()).toBe(false)
    expect(change.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })
  it('live delay changes restart the pending opening and closing interval', async () => {
    const view = (openDelay: number, closeDelay: number) => (
      <Tooltip content="Help" openDelay={openDelay} closeDelay={closeDelay}>
        <button>Trigger</button>
      </Tooltip>
    )
    await render(view(100, 100))
    await focus()
    await advance(30)
    await render(view(20, 100))
    await advance(19)
    expect(visible()).toBe(false)
    await advance(1)
    expect(visible()).toBe(true)
    await blur()
    await advance(30)
    await render(view(20, 10))
    await advance(9)
    expect(visible()).toBe(true)
    await advance(1)
    expect(visible()).toBe(false)
  })
  it('focus and pointer each keep the surface open until both leave', async () => {
    await render(
      <Tooltip content="Help" openDelay={0}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await focus()
    await pointer(trigger(), 'pointerover')
    await blur()
    expect(visible()).toBe(true)
    await pointer(trigger(), 'pointerout')
    expect(visible()).toBe(false)
    await focus()
    await pointer(trigger(), 'pointerover')
    await pointer(trigger(), 'pointerout')
    expect(visible()).toBe(true)
    await blur()
    expect(visible()).toBe(false)
  })
  it('surface native pointer handler is called without replacing hover persistence', async () => {
    const enter = vi.fn()
    await render(
      <Tooltip
        content="Help"
        openDelay={0}
        closeDelay={50}
        onPointerEnter={enter}
      >
        <button>Trigger</button>
      </Tooltip>,
    )
    await pointer(trigger(), 'pointerover')
    await pointer(trigger(), 'pointerout', surface())
    await pointer(surface()!, 'pointerover', trigger())
    await advance(100)
    expect(enter).toHaveBeenCalledOnce()
    expect(visible()).toBe(true)
    await pointer(surface()!, 'pointerout')
    await advance(50)
    expect(visible()).toBe(false)
  })
  it('ignores touch pointer hover events', async () => {
    await render(
      <Tooltip content="Help" openDelay={0}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await pointer(trigger(), 'pointerover', null, 'touch')
    await advance(1000)
    expect(visible()).toBe(false)
  })
  it('trigger focus handler can cancel opening', async () => {
    await render(
      <Tooltip content="Help" openDelay={0}>
        <button onFocus={(event) => event.preventDefault()}>Trigger</button>
      </Tooltip>,
    )
    await focus()
    expect(visible()).toBe(false)
  })
  it('removing content cancels the pending opening without phantom callbacks', async () => {
    const change = vi.fn()
    await render(
      <Tooltip content="Help" openDelay={50} onOpenChange={change}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await focus()
    await advance(20)
    await render(
      <Tooltip content={null} openDelay={50} onOpenChange={change}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await advance(100)
    expect(surface()).toBeNull()
    expect(change).not.toHaveBeenCalled()
  })
})

it('releasing controlled mode retains the last externally selected visibility', async () => {
  const change = vi.fn()
  await render(<Popover open content="Content" onOpenChange={change}><button>Trigger</button></Popover>)
  await render(<Popover content="Content" onOpenChange={change}><button>Trigger</button></Popover>)
  expect(visible()).toBe(true)
  await click(); expect(visible()).toBe(false)
  expect(change.mock.calls).toEqual([[{ open: false }]])
})
it('losing content closes uncontrolled visibility and does not reopen restored content', async () => {
  const change = vi.fn()
  const view = (content: ReactNode) => <Popover defaultOpen content={content} onOpenChange={change}><button>Trigger</button></Popover>
  await render(view('First')); expect(visible()).toBe(true)
  await render(view(null)); expect(surface()).toBeNull()
  await render(view('Restored')); expect(visible()).toBe(false)
  expect(change).not.toHaveBeenCalled()
})
it('a hidden trigger is not activated by a pending timer after unmount', async () => {
  vi.useFakeTimers()
  const change = vi.fn()
  await render(<Tooltip openDelay={100} content="Help" onOpenChange={change}><button>Trigger</button></Tooltip>)
  await focus(); await advance(20); await render(null); await advance(200)
  expect(change).not.toHaveBeenCalled()
})
it('hovercard focus can move between trigger and content before leaving the pair', async () => {
  await render(<Overlay interactive openDelay={0} content={<button>Action</button>}><button>Trigger</button></Overlay>)
  await focus(); expect(surface()?.getAttribute('role')).toBe('dialog')
  await act(async () => surface()!.querySelector('button')!.focus())
  expect(visible()).toBe(true)
  const outside = document.createElement('button'); document.body.append(outside)
  await act(async () => outside.focus())
  expect(visible()).toBe(false); outside.remove()
})
it('changing legacy hover to click cancels a pending hover opening', async () => {
  vi.useFakeTimers()
  await render(<Overlay openDelay={100} content="Help"><button>Trigger</button></Overlay>)
  await focus(); await advance(20)
  await render(<Overlay trigger="click" content="Help"><button>Trigger</button></Overlay>)
  await advance(200); expect(visible()).toBe(false)
  await click(); expect(visible()).toBe(true)
})
it('external open during a pending hover opens immediately and remains on control release', async () => {
  vi.useFakeTimers()
  await render(<Tooltip openDelay={100} content="Help"><button>Trigger</button></Tooltip>)
  await focus(); await advance(20)
  await render(<Tooltip open openDelay={100} content="Help"><button>Trigger</button></Tooltip>)
  expect(visible()).toBe(true)
  await render(<Tooltip openDelay={100} content="Help"><button>Trigger</button></Tooltip>)
  expect(visible()).toBe(true)
})
it('content native pointer cancellation is respected', async () => {
  vi.useFakeTimers()
  await render(<Tooltip openDelay={0} closeDelay={20} content="Help" onPointerEnter={event => event.preventDefault()}><button>Trigger</button></Tooltip>)
  await pointer(trigger(), 'pointerover'); await pointer(trigger(), 'pointerout', surface())
  await pointer(surface()!, 'pointerover', trigger()); await advance(20)
  expect(visible()).toBe(false)
})
it('fixed Tooltip/Popover modes survive untyped trigger spreads', async () => {
  await render(<Tooltip {...{ trigger: 'click', interactive: true } as any} openDelay={0} content="Help"><button>Trigger</button></Tooltip>)
  await focus(); expect(surface()?.getAttribute('role')).toBe('tooltip')
  await render(<Popover {...{ trigger: 'hover' } as any} content="Help"><button>Trigger</button></Popover>)
  await focus(); expect(visible()).toBe(false)
  await click(); expect(visible()).toBe(true)
})
