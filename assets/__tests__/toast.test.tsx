import { act, createRef, type ComponentProps } from 'react'
import { renderToString } from 'react-dom/server'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast, Toaster as SharedToaster, createToastContext, useToast } from '../../Toast/Toast'
import { createToaster } from '../../Toast/toaster'
import { expectDevError, hydrate, libraryCss, mount } from './harness'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.useRealTimers()
})

const q = <E extends Element = HTMLElement>(selector: string, scope: ParentNode = host) =>
  scope.querySelector<E & HTMLElement>(selector)
const part = (name: string, scope: ParentNode = host) =>
  q(`[data-scope="toast"][data-part="${name}"]`, scope)
const texts = () =>
  Array.from(host.querySelectorAll('[data-scope="toast"][data-part="title"]'), (node) => node.textContent)
const key = (target: Element, key: string, init: KeyboardEventInit = {}) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  })
const click = (target: Element | null) =>
  act(async () => {
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms)
  })

describe('Toast surface', () => {
  const render = (props: ComponentProps<typeof Toast>) =>
    act(async () => {
      root.render(<Toast {...props} />)
    })

  it('title is the bold main line and names the status; no title renders no title part', async () => {
    await render({ title: 'Deployment completed' })
    const toast = part('root')!
    expect(toast.getAttribute('role')).toBe('status')
    expect(toast.getAttribute('aria-atomic')).toBe('true')
    expect(part('title')!.textContent).toBe('Deployment completed')
    expect(toast.getAttribute('aria-labelledby')).toBe(part('title')!.id)
    expect(libraryCss()).toMatch(/\.uf-toast-title \{[^}]*font-weight: var\(--uf-font-weight-bold\)/)
    await render({ title: '' })
    expect(part('title')).toBeNull()
    expect(part('root')!.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('description is the text under the title and describes the status; 0 renders, empty renders nothing', async () => {
    await render({ title: 'Saved', description: 'Visible to collaborators.' })
    expect(part('description')!.textContent).toBe('Visible to collaborators.')
    expect(part('root')!.getAttribute('aria-describedby')).toBe(part('description')!.id)
    expect(part('title')!.compareDocumentPosition(part('description')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await render({ title: 'Saved', description: 0 })
    expect(part('description')!.textContent).toBe('0')
    await render({ title: 'Saved', description: '' })
    expect(part('description')).toBeNull()
    expect(part('root')!.hasAttribute('aria-describedby')).toBe(false)
  })

  it.each(['neutral', 'positive', 'warning', 'destructive'] as const)(
    'tone %s colors the border and stays a polite status',
    async (tone) => {
      await render({ title: 'Status', tone })
      expect(part('root')!.dataset.tone).toBe(tone)
      expect(part('root')!.getAttribute('role')).toBe('status')
      if (tone !== 'neutral')
        expect(libraryCss()).toContain(`.uf-toast[data-scope][data-tone="${tone}"]`)
    },
  )

  it('tone defaults to neutral', async () => {
    await render({ title: 'Status' })
    expect(part('root')!.dataset.tone).toBe('neutral')
  })

  it('closable gives a close button and Escape inside the toast; both call onClose once', async () => {
    const onClose = vi.fn()
    await render({ title: 'Saved', onClose })
    const close = part('close')!
    expect(close.tagName).toBe('BUTTON')
    expect(close.getAttribute('type')).toBe('button')
    await click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
    await key(close, 'Escape')
    expect(onClose).toHaveBeenCalledTimes(2)
    await key(close, 'Escape', { isComposing: true })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closable={false} removes the close button and Escape, while the action still closes', async () => {
    const onClose = vi.fn()
    await render({ title: 'Saved', closable: false, onClose, action: { label: 'Undo' } })
    expect(part('close')).toBeNull()
    await key(part('root')!, 'Escape')
    expect(onClose).not.toHaveBeenCalled()
    await click(part('action'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('without onClose nothing can close the toast, so no close button is shown', async () => {
    await render({ title: 'Saved', closable: true })
    expect(part('close')).toBeNull()
  })

  it('labels.close names the close button; blank text keeps the default and a non-object is reported', async () => {
    const onClose = vi.fn()
    await render({ title: 'Saved', onClose })
    expect(part('close')!.getAttribute('aria-label')).toBe('Close notification')
    await render({ title: 'Saved', onClose, labels: { close: 'Закрыть уведомление' } })
    expect(part('close')!.getAttribute('aria-label')).toBe('Закрыть уведомление')
    await render({ title: 'Saved', onClose, labels: { close: '  ' } })
    expect(part('close')!.getAttribute('aria-label')).toBe('Close notification')
    await expectDevError(
      () => render({ title: 'Saved', onClose, labels: 'x' as never }),
      /^Face UI Toast: invalid labels "x"; using defaults\.$/,
    )
    expect(part('close')!.getAttribute('aria-label')).toBe('Close notification')
  })

  it('action renders one button; its onClick gets the click event and runs before onClose', async () => {
    const calls: unknown[] = []
    await render({
      title: 'Saved',
      action: { label: 'Undo', onClick: (event) => calls.push([event.type, event.currentTarget]) },
      onClose: () => calls.push('close'),
    })
    const action = part('action')!
    expect(action.tagName).toBe('BUTTON')
    expect(action.getAttribute('type')).toBe('button')
    expect(action.textContent).toBe('Undo')
    await click(action)
    expect(calls).toEqual([['click', action], 'close'])
  })

  it("action onClick's preventDefault keeps the toast open", async () => {
    const onClose = vi.fn()
    await render({ title: 'Saved', onClose, action: { label: 'Details', onClick: (event) => event.preventDefault() } })
    await click(part('action'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('an action without a label renders no button', async () => {
    await render({ title: 'Saved', action: { label: '' } })
    expect(part('action')).toBeNull()
  })

  it('native attributes, className, style and ref land on the surface; role stays status', async () => {
    const ref = createRef<HTMLDivElement>()
    await act(async () => {
      root.render(
        <Toast
          ref={ref}
          title="Saved"
          id="saved"
          className="custom"
          style={{ maxWidth: 320 }}
          aria-label="Saved notice"
          data-origin="test"
          {...({ role: 'alert' } as object)}
        />,
      )
    })
    const toast = part('root')!
    expect(ref.current).toBe(toast)
    expect(toast.id).toBe('saved')
    expect(toast.classList.contains('custom')).toBe(true)
    expect(toast.classList.contains('uf-toast')).toBe(true)
    expect(toast.style.maxWidth).toBe('320px')
    expect(toast.getAttribute('aria-label')).toBe('Saved notice')
    expect(toast.dataset.origin).toBe('test')
    expect(toast.getAttribute('role')).toBe('status')
  })

  it("the consumer's onKeyDown runs first and its preventDefault keeps Escape from closing", async () => {
    const onClose = vi.fn()
    const onKeyDown = vi.fn((event: { preventDefault(): void }) => event.preventDefault())
    await render({ title: 'Saved', onClose, onKeyDown })
    await key(part('root')!, 'Escape')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('toaster store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  const ids = (store: ReturnType<typeof createToaster>) => store.getSnapshot().map((toast) => toast.id)

  it('two toasts close independently after their own duration', () => {
    const store = createToaster()
    store.toast({ id: 'a', title: 'A', duration: 1000 })
    vi.advanceTimersByTime(300)
    store.toast({ id: 'b', title: 'B', duration: 1000 })
    vi.advanceTimersByTime(699)
    expect(ids(store)).toEqual(['a', 'b'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual(['b'])
    vi.advanceTimersByTime(299)
    expect(ids(store)).toEqual(['b'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual([])
  })

  it('pause keeps the time each toast has left and resume finishes it', () => {
    const store = createToaster()
    store.toast({ id: 'a', title: 'A', duration: 1000 })
    store.toast({ id: 'b', title: 'B', duration: 2000 })
    vi.advanceTimersByTime(600)
    store.pause()
    vi.advanceTimersByTime(10_000)
    expect(ids(store)).toEqual(['a', 'b'])
    store.resume()
    vi.advanceTimersByTime(399)
    expect(ids(store)).toEqual(['a', 'b'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual(['b'])
    store.pause()
    store.pause()
    vi.advanceTimersByTime(5000)
    store.resume()
    vi.advanceTimersByTime(999)
    expect(ids(store)).toEqual(['b'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual([])
  })

  it('duration 0 keeps a toast until it is dismissed; the store duration is the default', () => {
    const store = createToaster({ duration: 200 })
    store.toast({ id: 'kept', title: 'Kept', duration: 0 })
    store.toast({ id: 'default', title: 'Default' })
    vi.advanceTimersByTime(200)
    expect(ids(store)).toEqual(['kept'])
    vi.advanceTimersByTime(1e9)
    expect(ids(store)).toEqual(['kept'])
    store.dismiss('kept')
    expect(ids(store)).toEqual([])
    expect(createToaster().toast({ title: 'x' })).toMatch(/^toast-\d+$/)
  })

  it('the library default duration is 5000 ms', () => {
    const store = createToaster()
    store.toast({ id: 'a', title: 'A' })
    vi.advanceTimersByTime(4999)
    expect(ids(store)).toEqual(['a'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual([])
  })

  it.each([
    ['"50"', '50', /invalid duration "50"; using 5000/, 5000],
    ['-1', -1, /invalid duration -1; using 0/, Infinity],
    ['1e12', 1e12, /invalid duration 1000000000000; using 2147483647/, 2_147_483_647],
  ])('duration %s is normalized and reported', (_, duration, report, closesAt) => {
    const store = createToaster()
    expectDevError(() => store.toast({ id: 'a', title: 'A', duration: duration as number }), report)
    if (Number.isFinite(closesAt)) {
      vi.advanceTimersByTime(closesAt - 1)
      expect(ids(store)).toEqual(['a'])
      vi.advanceTimersByTime(1)
    } else vi.advanceTimersByTime(1e9)
    expect(ids(store)).toEqual(Number.isFinite(closesAt) ? [] : ['a'])
  })

  it('maxVisible shows the newest toasts; older ones wait with their time stopped and return', () => {
    const store = createToaster({ maxVisible: 2 })
    store.toast({ id: 'a', title: 'A', duration: 1000 })
    vi.advanceTimersByTime(400)
    store.toast({ id: 'b', title: 'B', duration: 0 })
    store.toast({ id: 'c', title: 'C', duration: 0 })
    expect(ids(store)).toEqual(['b', 'c'])
    vi.advanceTimersByTime(10_000)
    store.dismiss('c')
    expect(ids(store)).toEqual(['a', 'b'])
    vi.advanceTimersByTime(599)
    expect(ids(store)).toEqual(['a', 'b'])
    vi.advanceTimersByTime(1)
    expect(ids(store)).toEqual(['b'])
  })

  it('maxVisible is an integer from 1; other values are reported', () => {
    expectDevError(() => createToaster({ maxVisible: 0 }), /invalid maxVisible 0; using 1/)
    expectDevError(() => createToaster({ maxVisible: '2' as never }), /invalid maxVisible "2"; using 3/)
  })

  it('toast with the id of a shown toast updates it in place and restarts its timer', () => {
    const store = createToaster()
    store.toast({ id: 'a', title: 'A', duration: 0 })
    store.toast({ id: 'job', title: 'Uploading', duration: 0 })
    store.toast({ id: 'b', title: 'B', duration: 0 })
    const before = store.getSnapshot()
    expect(store.toast({ id: 'job', title: 'Uploaded', tone: 'positive', duration: 1000 })).toBe('job')
    const after = store.getSnapshot()
    expect(after).not.toBe(before)
    expect(after.map((toast) => [toast.id, toast.title])).toEqual([
      ['a', 'A'],
      ['job', 'Uploaded'],
      ['b', 'B'],
    ])
    vi.advanceTimersByTime(1000)
    expect(ids(store)).toEqual(['a', 'b'])
    store.toast({ id: '', title: 'Blank id' })
    expect(ids(store)).toHaveLength(3)
  })

  it('dismiss removes one toast; an unknown id changes nothing', () => {
    const store = createToaster()
    const listener = vi.fn()
    store.subscribe(listener)
    store.toast({ id: 'a', title: 'A' })
    const snapshot = store.getSnapshot()
    store.dismiss('missing')
    expect(store.getSnapshot()).toBe(snapshot)
    expect(listener).toHaveBeenCalledTimes(1)
    store.pause()
    store.resume()
    expect(store.getSnapshot()).toBe(snapshot)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('Toaster', () => {
  let context: ReturnType<typeof createToastContext>
  beforeEach(() => {
    vi.useFakeTimers()
    context = createToastContext()
  })
  const region = () => part('group')!
  const renderToaster = (props: ComponentProps<typeof context.Toaster> = {}) =>
    act(async () => {
      root.render(
        <>
          <button id="outside">Outside</button>
          <context.Toaster {...props} />
        </>,
      )
    })
  const show = (options: Parameters<typeof context.toaster.toast>[0]) =>
    act(async () => {
      context.toaster.toast(options)
    })
  const pointerOver = (target: Element, pointerType = 'mouse') =>
    act(async () => {
      const event = new MouseEvent('pointerover', { bubbles: true })
      Object.defineProperty(event, 'pointerType', { value: pointerType })
      target.dispatchEvent(event)
    })
  const outside = () => q<HTMLButtonElement>('#outside')!

  it('is a polite named region that is always present; a native aria-label renames it', async () => {
    await renderToaster()
    expect(region().getAttribute('role')).toBe('region')
    expect(region().getAttribute('aria-live')).toBe('polite')
    expect(region().getAttribute('aria-label')).toBe('Notifications (F8)')
    expect(region().children).toHaveLength(0)
    await renderToaster({ 'aria-label': 'Уведомления' })
    expect(region().getAttribute('aria-label')).toBe('Уведомления')
  })

  it('native attributes, className, style and ref land on the region', async () => {
    const ref = createRef<HTMLDivElement>()
    await act(async () => {
      root.render(<context.Toaster ref={ref} id="toasts" className="custom" style={{ zIndex: 5 }} />)
    })
    expect(ref.current).toBe(region())
    expect(region().id).toBe('toasts')
    expect(region().classList.contains('uf-toaster')).toBe(true)
    expect(region().classList.contains('custom')).toBe(true)
    expect(region().style.zIndex).toBe('5')
  })

  it('shows every toast() call and closes each after its own duration', async () => {
    await renderToaster()
    await show({ title: 'First', duration: 1000 })
    await advance(500)
    await show({ title: 'Second', duration: 1000 })
    expect(texts()).toEqual(['First', 'Second'])
    await advance(500)
    expect(texts()).toEqual(['Second'])
    await advance(500)
    expect(texts()).toEqual([])
  })

  it('renders title, description, tone and action of each toast', async () => {
    const onClick = vi.fn()
    await renderToaster()
    await show({ title: 'Saved', description: 'All good.', tone: 'positive', action: { label: 'Undo', onClick } })
    expect(part('root')!.dataset.tone).toBe('positive')
    expect(part('description')!.textContent).toBe('All good.')
    await click(part('action'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(texts()).toEqual([])
  })

  it.each([
    ['bottom-center', ['Old', 'New']],
    ['bottom-start', ['Old', 'New']],
    ['bottom-end', ['Old', 'New']],
    ['top-start', ['New', 'Old']],
    ['top-center', ['New', 'Old']],
    ['top-end', ['New', 'Old']],
  ] as const)('placement %s puts the newest toast nearest its edge in reading order', async (placement, order) => {
    await renderToaster({ placement })
    await show({ title: 'Old' })
    await show({ title: 'New' })
    expect(region().dataset.placement).toBe(placement)
    expect(texts()).toEqual(order)
  })

  it('placement defaults to bottom-center', async () => {
    await renderToaster()
    expect(region().dataset.placement).toBe('bottom-center')
  })

  it('a pointer over any toast pauses every timer; leaving resumes with the time left', async () => {
    await renderToaster()
    await show({ title: 'A', duration: 1000 })
    await show({ title: 'B', duration: 2000 })
    await advance(600)
    await pointerOver(part('title')!)
    await advance(5000)
    expect(texts()).toEqual(['A', 'B'])
    await pointerOver(outside())
    await advance(399)
    expect(texts()).toEqual(['A', 'B'])
    await advance(1)
    expect(texts()).toEqual(['B'])
    await pointerOver(part('root')!, 'touch')
    await advance(1000)
    expect(texts()).toEqual([])
  })

  it('a pointer leaving the window from a toast resumes the timers', async () => {
    await renderToaster()
    await show({ title: 'A', duration: 1000 })
    await pointerOver(part('root')!)
    await act(async () => {
      part('root')!.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: null }))
    })
    await advance(1000)
    expect(texts()).toEqual([])
  })

  it('focus inside the region pauses every timer; focus leaving resumes', async () => {
    await renderToaster()
    await show({ title: 'A', duration: 1000 })
    await act(async () => part('close')!.focus())
    await advance(5000)
    expect(texts()).toEqual(['A'])
    await act(async () => outside().focus())
    await advance(1000)
    expect(texts()).toEqual([])
  })

  it('the window in the background pauses every timer', async () => {
    await renderToaster()
    await show({ title: 'A', duration: 1000 })
    await act(async () => void window.dispatchEvent(new FocusEvent('blur')))
    await advance(5000)
    expect(texts()).toEqual(['A'])
    await act(async () => void window.dispatchEvent(new FocusEvent('focus')))
    await advance(1000)
    expect(texts()).toEqual([])
  })

  it('closable and labels reach every toast', async () => {
    await renderToaster({ labels: { close: 'Закрыть уведомление' } })
    await show({ title: 'A', duration: 0 })
    await show({ title: 'B', duration: 0 })
    expect(
      Array.from(host.querySelectorAll('[data-part="close"]'), (button) => button.getAttribute('aria-label')),
    ).toEqual(['Закрыть уведомление', 'Закрыть уведомление'])
    await click(part('close'))
    expect(texts()).toEqual(['B'])
    await renderToaster({ closable: false })
    expect(part('close')).toBeNull()
    await key(part('root')!, 'Escape')
    expect(texts()).toEqual(['B'])
  })

  it('F8 moves focus to the region when it holds toasts, and leaves the key alone otherwise', async () => {
    await renderToaster()
    outside().focus()
    const empty = new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true })
    await act(async () => void outside().dispatchEvent(empty))
    expect(empty.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(outside())
    await show({ title: 'A', duration: 0 })
    await key(outside(), 'F8', { shiftKey: true })
    expect(document.activeElement).toBe(outside())
    await key(outside(), 'F8')
    expect(document.activeElement).toBe(region())
  })

  it('Escape on a focused toast closes it; focus moves to its neighbour, then back to where it came from', async () => {
    await renderToaster()
    await show({ id: 'a', title: 'A', duration: 0 })
    await show({ id: 'b', title: 'B', duration: 0 })
    outside().focus()
    await key(outside(), 'F8')
    const first = region().children[0] as HTMLElement
    await act(async () => first.focus())
    await key(first, 'Escape')
    expect(texts()).toEqual(['B'])
    expect(document.activeElement).toBe(region().children[0])
    await key(document.activeElement!, 'Escape')
    expect(texts()).toEqual([])
    expect(document.activeElement).toBe(outside())
  })

  it('a toast closed with the pointer does not pull focus to another toast, and the timers resume', async () => {
    await renderToaster()
    await show({ title: 'A', duration: 0 })
    await show({ title: 'B', duration: 1000 })
    const close = part('close')!
    await act(async () => {
      close.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      close.focus()
    })
    await click(close)
    expect(texts()).toEqual(['B'])
    expect(region().contains(document.activeElement)).toBe(false)
    await advance(1000)
    expect(texts()).toEqual([])
  })

  it('stores from createToastContext are independent of each other and of useToast', async () => {
    const other = createToastContext()
    await act(async () => {
      root.render(
        <>
          <context.Toaster />
          <other.Toaster />
        </>,
      )
    })
    await act(async () => {
      other.useToast().toast({ title: 'Other', duration: 0 })
    })
    const [first, second] = Array.from(host.querySelectorAll('[data-part="group"]'))
    expect(first!.children).toHaveLength(0)
    expect(second!.textContent).toContain('Other')
    expect(other.useToast()).toBe(other.toaster)
  })

  it('useToast shows toasts in the shared Toaster', async () => {
    let api: ReturnType<typeof useToast> | undefined
    const Probe = () => {
      api = useToast()
      return null
    }
    await act(async () => {
      root.render(
        <>
          <Probe />
          <SharedToaster />
        </>,
      )
    })
    let id = ''
    await act(async () => {
      id = api!.toast({ title: 'Shared', duration: 0 })
    })
    expect(texts()).toEqual(['Shared'])
    await act(async () => api!.dismiss(id))
    expect(texts()).toEqual([])
  })

  it('the server renders an empty region; hydration shows the toasts already in the store', async () => {
    context.toaster.toast({ title: 'Early', duration: 0 })
    const html = renderToString(<context.Toaster />)
    expect(html).toContain('role="region"')
    expect(html).not.toContain('Early')
    const target = document.body.appendChild(document.createElement('div'))
    const { recoverableErrors } = await hydrate(<context.Toaster />, target)
    expect(recoverableErrors).toEqual([])
    expect(target.textContent).toContain('Early')
  })
})
