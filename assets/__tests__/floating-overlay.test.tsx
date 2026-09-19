import {
  act,
  createRef,
  Fragment,
  StrictMode,
  useState,
  type ReactNode,
} from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tooltip } from '../../Tooltip/Tooltip'
import { Popover } from '../../Popover/Popover'
import { Overlay } from '../../Overlay/Overlay'
import { Menu } from '../../Menu/Menu'
import { Select } from '../../Select/Select'
import { Modal } from '../../Modal/Modal'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expectDevError, hydrate, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { modulesOf, repo } from './governance/gates'

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
  ;({ host, root } = mount())
})
afterEach(() => {
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
    it('keeps its own data-scope, data-part and data-state over consumer attributes (K16)', async () => {
      await render(
        <Component content="Content" data-scope="x" data-part="x" data-state="open">
          <button>Trigger</button>
        </Component>,
      )
      expect(surface()?.dataset).toMatchObject({ scope: 'overlay', part: 'content', state: 'closed' })
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

it('Popover ignores hover-only props from untyped consumers', async () => {
  await render(
    <Popover {...({ openDelay: 500, closeDelay: 500, interactive: false } as any)} content="Help">
      <button>Trigger</button>
    </Popover>,
  )
  expect(surface()?.getAttribute('role')).toBe('dialog')
  await focus()
  expect(visible()).toBe(false)
  await click()
  expect(visible()).toBe(true)
})
describe('invalid props render normalized (§2 #48-58)', () => {
  const tooltip = (props: Record<string, unknown>) => (
    <Tooltip open content="Help" {...props}>
      <button>Trigger</button>
    </Tooltip>
  )
  it.each([
    { side: 'above' },
    { align: 'left' },
    { dir: 'sideways' },
    { open: null },
    { defaultOpen: 1 },
  ])('%o renders without a report', async (props) => {
    await render(tooltip(props))
    expect(surface()).not.toBeNull()
  })
  it.each([
    ['sideOffset', NaN, 'using 2'],
    ['sideOffset', Infinity, 'using 2'],
    ['sideOffset', '4', 'using 2'],
    ['openDelay', -1, 'using 0'],
    ['openDelay', Infinity, 'using 200'],
    ['openDelay', NaN, 'using 200'],
    ['openDelay', null, 'using 200'],
    ['closeDelay', '1', 'using 0'],
    ['closeDelay', 2147483648, 'using 2147483647'],
  ])('%s %s is reported and replaced (%s)', async (prop, value, outcome) => {
    await expectDevError(
      () => render(tooltip({ [prop]: value })),
      new RegExp(`^Face UI Tooltip: invalid ${prop} .*; ${outcome}\\.$`),
    )
    expect(visible()).toBe(true)
  })
  it('a negative sideOffset is a legal overlap', async () => {
    await render(tooltip({ sideOffset: -4 }))
    expect(visible()).toBe(true)
  })
  it('reports name the component that renders', async () => {
    await expectDevError(
      () =>
        render(
          <Popover open content="Help" sideOffset={'x' as any}>
            <button>Trigger</button>
          </Popover>,
        ),
      /^Face UI Popover: invalid sideOffset "x"; using 2\.$/,
    )
    await expectDevError(
      () =>
        render(
          <Overlay open content="Help" openDelay={-5}>
            <button>Trigger</button>
          </Overlay>,
        ),
      /^Face UI Overlay: invalid openDelay -5; using 0\.$/,
    )
  })
  it('hover delays of a click overlay are ignored, not reported', async () => {
    await render(
      <Overlay {...({ openOn: 'click', openDelay: -1, interactive: 'yes' } as any)} content="Help">
        <button>Trigger</button>
      </Overlay>,
    )
    await click()
    expect(visible()).toBe(true)
  })
})
it('Overlay reads interactive by truthiness and openOn other than click as hover', async () => {
  vi.useFakeTimers()
  await render(
    <Overlay {...({ openOn: 'focus', interactive: 'yes' } as any)} openDelay={0} content="Help">
      <button>Trigger</button>
    </Overlay>,
  )
  expect(surface()?.getAttribute('role')).toBe('dialog')
  expect(surface()?.getAttribute('data-trigger')).toBe('hover')
  await focus()
  expect(visible()).toBe(true)
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
  // A delay's proposal renders in a later task than its timer. act() flushes
  // that render only when its scope ends, so input inside the scope lands in the gap.
  const pointerRightAfter = (ms: number, type: 'pointerover' | 'pointerout') =>
    act(async () => {
      vi.advanceTimersByTime(ms)
      const event = new MouseEvent(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      trigger().dispatchEvent(event)
    })
  it('a pointer that leaves as the open delay fires leaves the surface closed', async () => {
    await render(
      <Tooltip content="Help" openDelay={50} closeDelay={0}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await pointer(trigger(), 'pointerover')
    await pointerRightAfter(50, 'pointerout')
    await advance(1000)
    expect(visible()).toBe(false)
  })
  it('a pointer that returns as the close delay fires leaves the surface open', async () => {
    await render(
      <Tooltip content="Help" openDelay={0} closeDelay={50}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await pointer(trigger(), 'pointerover')
    await pointer(trigger(), 'pointerout')
    await pointerRightAfter(50, 'pointerover')
    await advance(1000)
    expect(visible()).toBe(true)
  })
  it('a pointer that leaves before a controlled parent commits the open asks to close', async () => {
    const change = vi.fn()
    function App() {
      const [open, setOpen] = useState(false)
      return (
        <Tooltip
          open={open}
          openDelay={50}
          closeDelay={0}
          content="Help"
          onOpenChange={(details) => {
            change(details)
            setOpen(details.open)
          }}
        >
          <button>Trigger</button>
        </Tooltip>
      )
    }
    await render(<App />)
    await pointer(trigger(), 'pointerover')
    await pointerRightAfter(50, 'pointerout')
    expect(change.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
    expect(visible()).toBe(false)
  })
})

/** §1.3 #4: once a refused proposal is gone, the parent's own change of `open` never calls onOpenChange. */
describe('a refused hover proposal expires', () => {
  beforeEach(() => vi.useFakeTimers())
  it('the parent later opening the surface itself does not ask to close it', async () => {
    const change = vi.fn()
    const view = (open: boolean) => (
      <Tooltip open={open} openDelay={50} closeDelay={0} content="Help" onOpenChange={change}>
        <button>Trigger</button>
      </Tooltip>
    )
    await render(view(false))
    await pointer(trigger(), 'pointerover')
    await advance(50)
    await pointer(trigger(), 'pointerout')
    await advance(1000)
    expect(change.mock.calls).toEqual([[{ open: true }]])
    change.mockClear()
    await render(view(true))
    await advance(1000)
    expect(change).not.toHaveBeenCalled()
    expect(visible()).toBe(true)
  })
  it('the parent later closing the surface under the pointer does not ask to open it', async () => {
    const change = vi.fn()
    const view = (open: boolean) => (
      <Tooltip open={open} openDelay={0} closeDelay={50} content="Help" onOpenChange={change}>
        <button>Trigger</button>
      </Tooltip>
    )
    await render(view(true))
    await pointer(trigger(), 'pointerover')
    await pointer(trigger(), 'pointerout')
    await advance(50)
    await pointer(trigger(), 'pointerover')
    expect(change.mock.calls).toEqual([[{ open: false }]])
    change.mockClear()
    await render(view(false))
    await advance(1000)
    expect(change).not.toHaveBeenCalled()
    expect(visible()).toBe(false)
  })
  it('a hint the app opens stays open after an earlier refused hover', async () => {
    let show: (open: boolean) => void = () => {}
    function App() {
      const [hint, setHint] = useState(false)
      show = setHint
      return (
        <Tooltip
          open={hint}
          openDelay={50}
          closeDelay={0}
          content="Help"
          onOpenChange={({ open }) => {
            if (!open) setHint(false)
          }}
        >
          <button>Trigger</button>
        </Tooltip>
      )
    }
    await render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    await pointer(trigger(), 'pointerover')
    await advance(50)
    await pointer(trigger(), 'pointerout')
    await advance(1000)
    await act(async () => show(true))
    await advance(1000)
    expect(visible()).toBe(true)
  })
})

it('releasing controlled mode retains the last externally selected visibility', async () => {
  const change = vi.fn()
  await render(<Popover open content="Content" onOpenChange={change}><button>Trigger</button></Popover>)
  await expectDevError(
    () => render(<Popover content="Content" onOpenChange={change}><button>Trigger</button></Popover>),
    /^Face UI Popover: missing open; keeping the last controlled value\.$/,
  )
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
it('changing Overlay openOn from hover to click cancels a pending hover opening', async () => {
  vi.useFakeTimers()
  await render(<Overlay openDelay={100} content="Help"><button>Trigger</button></Overlay>)
  await focus(); await advance(20)
  await render(<Overlay openOn="click" content="Help"><button>Trigger</button></Overlay>)
  await advance(200); expect(visible()).toBe(false)
  await click(); expect(visible()).toBe(true)
})
it('external open during a pending hover opens immediately and remains on control release', async () => {
  vi.useFakeTimers()
  await render(<Tooltip openDelay={100} content="Help"><button>Trigger</button></Tooltip>)
  await focus(); await advance(20)
  await expectDevError(
    () => render(<Tooltip open openDelay={100} content="Help"><button>Trigger</button></Tooltip>),
    /^Face UI Tooltip: invalid open true; switching from uncontrolled to controlled\.$/,
  )
  expect(visible()).toBe(true)
  await expectDevError(
    () => render(<Tooltip openDelay={100} content="Help"><button>Trigger</button></Tooltip>),
    /^Face UI Tooltip: missing open; /,
  )
  await advance(200)
  expect(visible()).toBe(true)
})
it('content native pointer cancellation is respected', async () => {
  vi.useFakeTimers()
  await render(<Tooltip openDelay={0} closeDelay={20} content="Help" onPointerEnter={event => event.preventDefault()}><button>Trigger</button></Tooltip>)
  await pointer(trigger(), 'pointerover'); await pointer(trigger(), 'pointerout', surface())
  await pointer(surface()!, 'pointerover', trigger()); await advance(20)
  expect(visible()).toBe(false)
})
it('fixed Tooltip/Popover modes survive untyped openOn spreads', async () => {
  await render(<Tooltip {...{ openOn: 'click', interactive: true } as any} openDelay={0} content="Help"><button>Trigger</button></Tooltip>)
  await focus(); expect(surface()?.getAttribute('role')).toBe('tooltip')
  await render(<Popover {...{ openOn: 'hover' } as any} content="Help"><button>Trigger</button></Popover>)
  await focus(); expect(visible()).toBe(false)
  await click(); expect(visible()).toBe(true)
})

it('Tooltip appends its own description to an existing aria-describedby', async () => {
  await render(
    <Tooltip open content="Help">
      <button aria-describedby="existing">Trigger</button>
    </Tooltip>,
  )
  expect(trigger().getAttribute('aria-describedby')!.split(/\s+/)).toEqual([
    'existing',
    surface()!.id,
  ])
})

it('Tooltip on non-action text makes it focusable without inventing a button role', async () => {
  await render(
    <Tooltip content="Help" openDelay={0}>
      <span id="text-trigger">Text</span>
    </Tooltip>,
  )
  const text = host.querySelector<HTMLElement>('#text-trigger')!
  await act(async () => text.focus())
  expect(document.activeElement).toBe(text)
  expect(visible()).toBe(true)
  expect(text.hasAttribute('role')).toBe(false)
})

describe('§5 #2: a focus-opened tooltip is a dismissable layer', () => {
  /** A mouse press whose default focus move is prevented, as by a toolbar button. */
  const pressKeepingFocus = (node: Element) =>
    act(async () => {
      const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      node.dispatchEvent(event)
    })
  const shown = (role: string) =>
    [...document.querySelectorAll<HTMLElement>(`[role="${role}"]`)].some(
      (node) => !node.hidden,
    )

  it('closes on an outside press that keeps focus on its trigger', async () => {
    await render(
      <>
        <Tooltip content="Help" openDelay={0}>
          <button>Trigger</button>
        </Tooltip>
        <span id="outside">Outside</span>
      </>,
    )
    await focus()
    expect(visible()).toBe(true)
    await pressKeepingFocus(host.querySelector('#outside')!)
    expect(visible()).toBe(false)
    expect(document.activeElement).toBe(trigger())
  })

  it('closes with the popover below it on one outside press', async () => {
    await render(
      <>
        <Popover
          content={
            <Tooltip content="Copy link" openDelay={0}>
              <button id="inner">Copy</button>
            </Tooltip>
          }
        >
          <button>Share</button>
        </Popover>
        <span id="outside">Outside</span>
      </>,
    )
    await click()
    await act(async () => document.getElementById('inner')!.focus())
    expect([shown('dialog'), shown('tooltip')]).toEqual([true, true])
    await pressKeepingFocus(host.querySelector('#outside')!)
    expect([shown('dialog'), shown('tooltip')]).toEqual([false, false])
  })
})

it('§5 #5: Tooltip, Popover, Menu, Select and Modal inside <p> hydrate without recovery', async () => {
  const items = [{ value: 'a', label: 'Alpha' }]
  const ui = (
    <p>
      Billed per{' '}
      <Tooltip content="1000 tokens">
        <abbr tabIndex={0}>kT</abbr>
      </Tooltip>
      , see{' '}
      <Popover content="Source 3">
        <button>[3]</button>
      </Popover>
      , <Menu items={items}>More</Menu>{' '}
      <Select label="Plan" items={items} defaultValue="a" />{' '}
      <Modal title="Details" trigger="Open">
        Body
      </Modal>
    </p>
  )
  const server = document.body.appendChild(document.createElement('div'))
  const { recoverableErrors } = await hydrate(ui, server)
  expect(recoverableErrors).toEqual([])
  // Surfaces mount after hydration, in the portal only.
  expect(server.querySelector('[role="tooltip"], [role="dialog"], [role="menu"]')).toBeNull()
  expect(document.querySelectorAll('.uf-overlay-content')).toHaveLength(2)
  expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1)
  // A closed Modal mounts no surface at all.
  expect(document.querySelector('.uf-modal')).toBeNull()
})

const shownIn = () => {
  const node = document.querySelector<HTMLElement>('.uf-overlay-content')
  return !!node && !node.hidden
}
const dispatchPointer = (node: Element, type: 'pointerover' | 'pointerout') => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  node.dispatchEvent(event)
}
const escape = () => {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  )
}
describeControlled({
  name: 'Tooltip',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Tooltip content="Help" openDelay={0} closeDelay={0} {...props}>
      <button>Trigger</button>
    </Tooltip>
  ),
  change: (host, to) => {
    const button = host.querySelector('button')!
    if (!to) return escape()
    dispatchPointer(button, 'pointerout')
    dispatchPointer(button, 'pointerover')
  },
  read: shownIn,
})
describeControlled({
  name: 'Popover',
  prop: 'open',
  values: [false, true],
  render: (props) => (
    <Popover content="Details" {...props}>
      <button>Trigger</button>
    </Popover>
  ),
  change: (host) => host.querySelector('button')!.click(),
  read: shownIn,
})

describe('open is stored in exactly one place', () => {
  it('no machine: the overlays reach no state machine and keep open in one useControllableState', () => {
    for (const name of ['Tooltip', 'Popover', 'Overlay'])
      expect(
        modulesOf(name).filter((path) => /machines\/|use-machine|create-machine/.test(path)),
      ).toEqual([])
    const source = readFileSync(join(repo, 'assets/internal/floating-overlay.tsx'), 'utf8')
    expect(source.match(/useControllableState[<(]/g)).toHaveLength(1)
    expect(source).not.toMatch(/\buse(State|Reducer|SyncExternalStore)\b/)
  })
  it('a parent-controlled open wins over pending hover timers in both directions', async () => {
    vi.useFakeTimers()
    const change = vi.fn()
    const view = (open: boolean) => (
      <Tooltip open={open} openDelay={100} closeDelay={100} content="Help" onOpenChange={change}>
        <button>Trigger</button>
      </Tooltip>
    )
    await render(view(false))
    await pointer(trigger(), 'pointerover')
    await render(view(true))
    await advance(1000)
    expect(visible()).toBe(true)
    await pointer(trigger(), 'pointerout')
    await render(view(false))
    await advance(1000)
    expect(visible()).toBe(false)
    expect(change).not.toHaveBeenCalled()
  })
})

describe('§5 #3: an interactive hover card neither steals focus nor reopens', () => {
  const log = vi.fn()
  const card = (
    <Overlay
      interactive
      openDelay={200}
      closeDelay={300}
      onOpenChange={log}
      content={<button id="card-action">Action</button>}
    >
      <button id="card-trigger">Trigger</button>
    </Overlay>
  )
  const cardTrigger = () => document.getElementById('card-trigger')!
  const action = () => document.getElementById('card-action')!
  beforeEach(() => {
    vi.useFakeTimers()
    log.mockClear()
  })

  it('pointer leave: the card closes after closeDelay and focus stays on <body>', async () => {
    await render(card)
    await pointer(cardTrigger(), 'pointerover')
    await advance(200)
    expect(visible()).toBe(true)
    await pointer(cardTrigger(), 'pointerout', document.body)
    await advance(299)
    expect(visible()).toBe(true)
    await advance(1)
    expect(visible()).toBe(false)
    expect(document.activeElement).toBe(document.body)
    await advance(1000)
    expect(visible()).toBe(false)
    expect(log.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })

  it('Escape from inside a hover-opened card: focus returns to the trigger and the card stays closed', async () => {
    await render(card)
    await pointer(cardTrigger(), 'pointerover')
    await advance(200)
    await pointer(cardTrigger(), 'pointerout', surface())
    await pointer(surface()!, 'pointerover', cardTrigger())
    await act(async () => action().focus())
    await act(async () => {
      action().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(visible()).toBe(false)
    expect(document.activeElement).toBe(cardTrigger())
    await advance(1000)
    expect(visible()).toBe(false)
    expect(log.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })

  it('Escape from inside a focus-opened card: focus returns to the trigger and the card stays closed', async () => {
    await render(card)
    await act(async () => cardTrigger().focus())
    await advance(200)
    await act(async () => action().focus())
    await act(async () => {
      action().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect([visible(), document.activeElement]).toEqual([false, cardTrigger()])
    await advance(1000)
    expect(visible()).toBe(false)
    // A later deliberate focus is a new intent.
    await act(async () => document.body.focus())
    await act(async () => (document.activeElement as HTMLElement).blur())
    await act(async () => cardTrigger().focus())
    await advance(200)
    expect(visible()).toBe(true)
  })
})
