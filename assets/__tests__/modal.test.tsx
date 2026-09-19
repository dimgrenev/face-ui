import { act, createRef, StrictMode, useEffect, useState, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../../Button/Button'
import { Modal, type ModalProps } from '../../Modal/Modal'
import { Pagination } from '../../Pagination/Pagination'
import { expectDevError, hydrate, mount } from './harness'
import { describeControlled } from './harness/controlled'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})

const show = (ui: ReactNode) =>
  act(async () => root.render(<StrictMode>{ui}</StrictMode>))
const render = (props: Partial<ModalProps> = {}) =>
  show(
    <Modal trigger="Open" title="Dialog" {...props}>
      {props.children ?? <button id="inside">Inside</button>}
    </Modal>,
  )
const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-scope="modal"][data-part="${name}"]`)
const dialog = () => part('content')
const trigger = () => part('trigger') as HTMLButtonElement
const close = () => part('close') as HTMLButtonElement | null
const open = () => act(async () => trigger().click())
const key = (node: Element, name: string) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    )
  })
const escape = () => key(document.activeElement ?? document.body, 'Escape')
/** A mouse press on the backdrop as the layer receives it. */
const pressBackdrop = () =>
  act(async () => {
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })
    part('backdrop')!.dispatchEvent(event)
    part('backdrop')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

describeControlled<boolean>({
  name: 'Modal',
  prop: 'open',
  values: [true, false],
  render: (props) => (
    <Modal trigger="Open" title="Dialog" {...props}>
      <button>Inside</button>
    </Modal>
  ),
  change: (host, to) => {
    if (to) host.querySelector<HTMLElement>('[data-part="trigger"]')!.click()
    else
      document
        .querySelector('[role="dialog"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        )
  },
  read: (host) =>
    host.querySelector('[data-part="trigger"]')!.getAttribute('aria-expanded') === 'true',
  handler: 'onKeyDown',
})

describe('open and onOpenChange', () => {
  it('onOpenChange reports the trigger, the close button, Escape and a backdrop press once each', async () => {
    const onOpenChange = vi.fn()
    await render({ onOpenChange })
    await open()
    await act(async () => close()!.click())
    await open()
    await escape()
    await open()
    await pressBackdrop()
    expect(onOpenChange.mock.calls.map(([details]) => details)).toEqual([
      { open: true },
      { open: false },
      { open: true },
      { open: false },
      { open: true },
      { open: false },
    ])
    expect(dialog()).toBeNull()
  })

  it('defaultOpen opens the dialog on mount without reporting a change', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, onOpenChange })
    expect(dialog()?.getAttribute('data-state')).toBe('open')
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('trigger', () => {
  it('an element keeps its own props and ref, and opens the dialog', async () => {
    const ref = createRef<HTMLButtonElement>()
    await show(
      <Modal title="Dialog" trigger={<button ref={ref} id="own" className="mine">Edit</button>} />,
    )
    expect(ref.current).toBe(trigger())
    expect(trigger().id).toBe('own')
    expect(trigger().className).toBe('mine')
    await open()
    expect(dialog()).not.toBeNull()
  })

  it('text renders a Button', async () => {
    await render({ trigger: 'Edit profile' })
    expect(trigger().matches('button[data-variant]')).toBe(true)
    expect(trigger().textContent).toBe('Edit profile')
  })

  it('announces the dialog: aria-haspopup="dialog", aria-expanded, aria-controls while open', async () => {
    await render({ role: 'alertdialog' })
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().hasAttribute('aria-controls')).toBe(false)
    await open()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(dialog()!.id)
  })

  it("the element's own onClick runs first; its preventDefault() keeps the dialog closed", async () => {
    const onOpenChange = vi.fn()
    await show(
      <Modal
        title="Dialog"
        onOpenChange={onOpenChange}
        trigger={<button onClick={(event) => event.preventDefault()}>Edit</button>}
      />,
    )
    await open()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it.each([false, true])(
    "an ancestor's capture-phase preventDefault() cancels the trigger and the close button (open=%s)",
    async (isOpen) => {
      const onOpenChange = vi.fn()
      await show(
        <div onClickCapture={(event) => event.preventDefault()}>
          <Modal open={isOpen} title="Dialog" trigger="Open" onOpenChange={onOpenChange} />
        </div>,
      )
      await act(async () => (isOpen ? close()! : trigger()).click())
      expect(onOpenChange).not.toHaveBeenCalled()
    },
  )

  it('empty text renders no trigger', async () => {
    await render({ trigger: '' })
    expect(trigger()).toBeNull()
  })
})

describe('title and description', () => {
  it('title names the dialog through aria-labelledby', async () => {
    await render({ defaultOpen: true, title: 'Account settings' })
    const title = part('title')!
    expect(title.textContent).toBe('Account settings')
    expect(dialog()!.getAttribute('aria-labelledby')).toBe(title.id)
  })

  it('a native aria-label or aria-labelledby replaces the title as the name', async () => {
    await render({ defaultOpen: true, 'aria-label': 'Settings dialog' })
    expect(dialog()!.getAttribute('aria-label')).toBe('Settings dialog')
    expect(dialog()!.hasAttribute('aria-labelledby')).toBe(false)
    await render({ defaultOpen: true, 'aria-labelledby': 'heading' })
    expect(dialog()!.getAttribute('aria-labelledby')).toBe('heading')
  })

  it('an open dialog without title, aria-label or aria-labelledby is reported', async () => {
    await expectDevError(
      () => render({ defaultOpen: true, title: undefined }),
      /^Face UI Modal: missing title; the dialog has no accessible name; pass title, aria-label or aria-labelledby\.$/,
    )
    expect(part('title')).toBeNull()
  })

  it('description describes the dialog; a native aria-describedby replaces it', async () => {
    await render({ defaultOpen: true, description: 'Update workspace preferences.' })
    const description = part('description')!
    expect(description.textContent).toBe('Update workspace preferences.')
    expect(dialog()!.getAttribute('aria-describedby')).toBe(description.id)
    await render({ defaultOpen: true, description: 'Text', 'aria-describedby': 'hint' })
    expect(dialog()!.getAttribute('aria-describedby')).toBe('hint')
  })

  it('empty title and description render nothing', async () => {
    await render({ defaultOpen: true, title: '', description: '', 'aria-label': 'Named' })
    expect(part('title')).toBeNull()
    expect(part('description')).toBeNull()
    expect(dialog()!.hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('children', () => {
  it('mount when the dialog opens and unmount when it closes', async () => {
    const lifecycle: string[] = []
    function Body() {
      useEffect(() => {
        lifecycle.push('mount')
        return () => void lifecycle.push('unmount')
      }, [])
      return <button>Body</button>
    }
    await act(async () =>
      root.render(
        <Modal trigger="Open" title="Dialog">
          <Body />
        </Modal>,
      ),
    )
    expect(lifecycle).toEqual([])
    await open()
    expect(lifecycle).toEqual(['mount'])
    await escape()
    expect(lifecycle).toEqual(['mount', 'unmount'])
    expect(document.body.textContent).not.toContain('Body')
  })

  it('a child that focuses itself on opening keeps the focus', async () => {
    await render({ children: <input aria-label="Branch name" autoFocus /> })
    await open()
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Branch name"]'))
  })

  it('text renders as body copy', async () => {
    await render({ defaultOpen: true, children: 'Review the details.' })
    const body = dialog()!.querySelector('.uf-modal-body [data-scope="text"]')!
    expect(body.textContent).toBe('Review the details.')
    expect(body.getAttribute('data-variant')).toBe('body')
  })
})

describe('initial focus and focus return', () => {
  it('opening focuses [data-autofocus] before the first control', async () => {
    await render({
      children: (
        <>
          <button>First</button>
          <input aria-label="Email" data-autofocus />
        </>
      ),
    })
    await open()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Email')
  })

  it('opening focuses the first control otherwise, the close button in the header', async () => {
    await render({})
    await open()
    expect(document.activeElement).toBe(close())
  })

  it('without controls, the surface itself takes focus', async () => {
    await render({ closable: false, children: 'Read only' })
    await open()
    expect(document.activeElement).toBe(dialog())
  })

  it('closing returns focus to the trigger', async () => {
    await render({})
    trigger().focus()
    await open()
    await escape()
    expect(document.activeElement).toBe(trigger())
  })

  it('Tab and Shift+Tab stay inside the open dialog', async () => {
    await render({ defaultOpen: true, footer: <Button>Save</Button> })
    const save = [...dialog()!.querySelectorAll('button')].at(-1)!
    save.focus()
    await key(save, 'Tab')
    expect(document.activeElement).toBe(close())
    await act(async () => {
      close()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
      )
    })
    expect(document.activeElement).toBe(save)
  })
})

describe('footer', () => {
  it('renders its buttons at the end of the surface; they close nothing by themselves', async () => {
    const onOpenChange = vi.fn()
    const save = vi.fn()
    await render({
      defaultOpen: true,
      onOpenChange,
      footer: (
        <>
          <Button variant="outline">Cancel</Button>
          <Button variant="accent" onClick={save}>
            Save
          </Button>
        </>
      ),
    })
    const footer = dialog()!.querySelector<HTMLElement>('[data-part="footer"]')!
    expect(footer.getAttribute('data-align')).toBe('end')
    expect(footer).toBe(dialog()!.lastElementChild)
    const buttons = [...footer.querySelectorAll('button')]
    expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Save'])
    expect(buttons.map((button) => button.getAttribute('data-variant'))).toEqual(['outline', 'accent'])
    await act(async () => buttons[1]!.click())
    expect(save).toHaveBeenCalledOnce()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()
  })

  it('a submit button in the footer submits a form in the body by its id', async () => {
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault())
    await render({
      defaultOpen: true,
      children: (
        <form id="rename" onSubmit={(event) => submit(event.nativeEvent as SubmitEvent)}>
          <input name="title" defaultValue="Draft" />
        </form>
      ),
      footer: (
        <Button type="submit" form="rename">
          Save
        </Button>
      ),
    })
    await act(async () => dialog()!.querySelector<HTMLButtonElement>('[form="rename"]')!.click())
    expect(submit).toHaveBeenCalledOnce()
  })

  it('resolves component descriptors, as a face document passes them', async () => {
    await render({
      defaultOpen: true,
      footer: { __componentName__: 'Button', variant: 'accent', children: 'Create' },
    })
    const button = dialog()!.querySelector('[data-part="footer"] button')!
    expect(button.textContent).toBe('Create')
    expect(button.getAttribute('data-variant')).toBe('accent')
  })

  it('no footer renders no footer region', async () => {
    await render({ defaultOpen: true, footer: '' })
    expect(dialog()!.querySelector('[data-part="footer"]')).toBeNull()
  })
})

describe('role', () => {
  it('defaults to dialog; alertdialog makes the surface an alertdialog', async () => {
    await render({ defaultOpen: true })
    expect(dialog()!.getAttribute('role')).toBe('dialog')
    expect(dialog()!.getAttribute('aria-modal')).toBe('true')
    await render({ defaultOpen: true, role: 'alertdialog' })
    expect(dialog()!.getAttribute('role')).toBe('alertdialog')
  })
})

describe('closable and closeOnBackdropClick', () => {
  it('closable={false} removes the close button and keeps the dialog open on Escape and backdrop presses', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, closable: false, onOpenChange })
    expect(close()).toBeNull()
    await escape()
    await pressBackdrop()
    expect(dialog()?.getAttribute('data-state')).toBe('open')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closeOnBackdropClick={false} keeps the dialog open on a backdrop press; Escape still closes it', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, closeOnBackdropClick: false, onOpenChange })
    await pressBackdrop()
    expect(dialog()?.getAttribute('data-state')).toBe('open')
    await escape()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false })
  })

  it('a press inside the surface does not close it', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, onOpenChange })
    await act(async () => {
      const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      dialog()!.dispatchEvent(event)
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('labels', () => {
  it.each([
    [undefined, 'Close'],
    [{ close: 'Закрыть' }, 'Закрыть'],
    [{ close: '  ' }, 'Close'],
  ])('labels %j names the close button and its tooltip %s', async (labels, name) => {
    await render({ defaultOpen: true, labels })
    expect(close()!.getAttribute('aria-label')).toBe(name)
    expect(close()!.title).toBe(name)
  })

  it('a non-string labels.close is reported and keeps the default', async () => {
    await expectDevError(
      () => render({ defaultOpen: true, labels: { close: false as never } }),
      /^Face UI Modal: invalid labels\.close false; using "Close"\.$/,
    )
    expect(close()!.getAttribute('aria-label')).toBe('Close')
  })

  it('Pagination names its picker close button with its own labels.close', async () => {
    await show(<Pagination total={100} labels={{ close: 'Закрыть' }} />)
    await act(async () => host.querySelector<HTMLButtonElement>('.uf-pagination-more')!.click())
    expect(close()!.getAttribute('aria-label')).toBe('Закрыть')
  })
})

describe('placement, edge, width and height', () => {
  it('placement marks the positioner and surface; start and end follow dir', async () => {
    await render({ defaultOpen: true, placement: 'end', dir: 'rtl' })
    expect(part('positioner')!.getAttribute('data-variant')).toBe('end')
    expect(part('positioner')!.dir).toBe('rtl')
    expect(dialog()!.getAttribute('data-variant')).toBe('end')
    expect(dialog()!.dir).toBe('rtl')
  })

  it('edge="flush" squares and unborders an edge surface; a centered dialog stays inset', async () => {
    await render({ defaultOpen: true, placement: 'start', edge: 'flush' })
    expect(dialog()!.getAttribute('data-edge')).toBe('flush')
    expect(dialog()!.getAttribute('data-radius')).toBe('none')
    expect(dialog()!.getAttribute('data-border')).toBe('false')
    await render({ defaultOpen: true, placement: 'center', edge: 'flush' })
    expect(dialog()!.getAttribute('data-edge')).toBe('inset')
    expect(dialog()!.getAttribute('data-radius')).toBe('lg')
    expect(dialog()!.getAttribute('data-border')).toBe('true')
  })

  it('width and height set the surface size variables; style is kept', async () => {
    await render({ defaultOpen: true, width: 420, height: 300, style: { padding: 0 } })
    expect(dialog()!.style.getPropertyValue('--face-runtime-modal-w')).toBe('420px')
    expect(dialog()!.style.getPropertyValue('--face-runtime-modal-h')).toBe('300px')
    expect(dialog()!.style.padding).toBe('0px')
  })
})

describe('scrollLock', () => {
  it('is off by default', async () => {
    await render({ defaultOpen: true })
    expect(document.body.style.overflow).toBe('')
  })

  it('locks page scroll while open and releases it on close', async () => {
    await render({ defaultOpen: true, scrollLock: true })
    expect(document.body.style.overflow).toBe('hidden')
    await escape()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('portal', () => {
  it('renders the surface once, into document.body', async () => {
    const surfaces = new Set<HTMLElement>()
    await show(
      <Modal
        open
        title="Once"
        ref={(node) => {
          if (node) surfaces.add(node)
        }}
      />,
    )
    expect(surfaces.size).toBe(1)
    const [surface] = surfaces
    expect(surface!.parentElement!.parentElement).toBe(document.body)
    expect(host.contains(surface!)).toBe(false)
  })

  it('server render has no surface and hydrates without recovery', async () => {
    const ui = <Modal defaultOpen title="Server" trigger="Open" />
    expect(renderToString(ui)).not.toContain('Server')
    const server = document.body.appendChild(document.createElement('div'))
    const { recoverableErrors } = await hydrate(ui, server)
    expect(recoverableErrors).toEqual([])
    expect(dialog()?.getAttribute('data-state')).toBe('open')
  })

  it('portal={false} renders a static preview in place: the page stays live, focus and Escape are left alone', async () => {
    const onOpenChange = vi.fn()
    await show(
      <>
        <button id="page">Page</button>
        <Modal portal={false} trigger="Open" title="Preview" scrollLock onOpenChange={onOpenChange}>
          <button>Inside</button>
        </Modal>
      </>,
    )
    trigger().focus()
    await open()
    const surface = dialog()!
    expect(host.contains(surface)).toBe(true)
    expect(surface.closest('.uf-modal-inlineHost')!.tagName).toBe('DIV')
    expect(surface.hasAttribute('aria-modal')).toBe(false)
    expect(document.querySelectorAll('[inert]')).toHaveLength(0)
    expect(document.activeElement).toBe(trigger())
    expect(document.body.style.overflow).toBe('')
    await escape()
    await pressBackdrop()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
    await act(async () => close()!.click())
    expect(dialog()).toBeNull()
  })

  it('portal={false} server-renders an open preview in place', async () => {
    const html = renderToString(<Modal open portal={false} title="Preview" />)
    expect(html).toContain('uf-modal-inlineHost')
    expect(html).toContain('Preview')
  })
})

describe('native attributes and classes', () => {
  it('native attributes, style and ref go to the surface; its structural attributes stay', async () => {
    const ref = createRef<HTMLDivElement>()
    const onKeyDown = vi.fn()
    await render({
      defaultOpen: true,
      ref,
      id: 'settings',
      lang: 'ru',
      className: 'surface',
      style: { maxWidth: 600 },
      onKeyDown,
      'data-testid': 'dialog',
    } as Partial<ModalProps>)
    const surface = dialog()!
    expect(ref.current).toBe(surface)
    expect(surface.id).toBe('settings')
    expect(surface.lang).toBe('ru')
    expect(surface.classList.contains('surface')).toBe(true)
    expect(surface.classList.contains('uf-modal')).toBe(true)
    expect(surface.style.maxWidth).toBe('600px')
    expect(surface.getAttribute('data-testid')).toBe('dialog')
    expect(surface.tabIndex).toBe(-1)
    await key(surface, 'a')
    expect(onKeyDown).toHaveBeenCalledOnce()
  })

  it('backdropClassName and positionerClassName reach their parts', async () => {
    await render({ defaultOpen: true, backdropClassName: 'dim', positionerClassName: 'place' })
    expect(part('backdrop')!.classList.contains('dim')).toBe(true)
    expect(part('positioner')!.classList.contains('place')).toBe(true)
    expect(dialog()!.classList.contains('dim')).toBe(false)
  })
})

describe('nesting', () => {
  it('Escape closes only the top dialog', async () => {
    function App() {
      const [child, setChild] = useState(true)
      return (
        <Modal defaultOpen title="Parent">
          <Modal open={child} onOpenChange={({ open }) => setChild(open)} title="Child">
            <button>Child action</button>
          </Modal>
        </Modal>
      )
    }
    await show(<App />)
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2)
    await escape()
    const left = document.querySelectorAll('[role="dialog"]')
    expect(left).toHaveLength(1)
    expect(left[0]!.textContent).toContain('Parent')
  })
})
