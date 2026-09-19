import { act, createRef, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Separator } from '../../Separator/Separator'
import { mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (props: ComponentProps<typeof Separator>) => {
  await act(async () => {
    root.render(<Separator {...props} />)
  })
}
const line = () => host.querySelector<HTMLElement>('[data-scope="separator"]')!
/** What assistive technology is told: the role and orientation attributes. */
const semantics = () => ({
  role: line().getAttribute('role'),
  orientation: line().getAttribute('aria-orientation'),
})

beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Separator prop contract', () => {
  it.each(['horizontal', 'vertical'] as const)(
    'a %s separator is decorative by default, and decorative={false} exposes it with its orientation',
    async (orientation) => {
      await render({ orientation })
      expect(semantics()).toEqual({ role: 'none', orientation: null })
      expect(line().dataset.orientation).toBe(orientation)
      await render({ orientation, decorative: false })
      expect(semantics()).toEqual({ role: 'separator', orientation })
      await render({ orientation, decorative: true })
      expect(semantics()).toEqual({ role: 'none', orientation: null })
    },
  )

  it('orientation defaults to horizontal, and a value other than vertical from a face document draws it too', async () => {
    await render({ decorative: false })
    expect(semantics()).toEqual({ role: 'separator', orientation: 'horizontal' })
    await render({ decorative: false, orientation: 'diagonal' as 'vertical' })
    expect(semantics()).toEqual({ role: 'separator', orientation: 'horizontal' })
    expect(line().dataset.orientation).toBe('horizontal')
  })

  it('role and aria-orientation come only from decorative and orientation, even when a face document passes them', async () => {
    const attributes = { role: 'button', 'aria-orientation': 'vertical' } as object
    await render({ ...attributes })
    expect(semantics()).toEqual({ role: 'none', orientation: null })
    await render({ ...attributes, decorative: false })
    expect(semantics()).toEqual({ role: 'separator', orientation: 'horizontal' })
  })

  it('membrane wraps the line in a spacing box, and membrane={false} disables that box without replacing the line', async () => {
    await render({})
    const drawn = line()
    const box = drawn.parentElement!
    expect(box.classList.contains('uf-membrane')).toBe(true)
    expect(box.hasAttribute('data-membrane-disabled')).toBe(false)
    expect(drawn.hasAttribute('data-membrane')).toBe(true)
    await render({ membrane: false })
    expect(line()).toBe(drawn)
    expect(box.hasAttribute('data-membrane-disabled')).toBe(true)
    expect(drawn.hasAttribute('data-membrane')).toBe(false)
  })

  it('native attributes, events and ref land on the line, not on its spacing box', async () => {
    const ref = createRef<HTMLDivElement>()
    const onClick = vi.fn()
    await render({
      ref,
      id: 'rule',
      className: 'section-rule',
      style: { marginBlock: 12 },
      title: 'Section break',
      'aria-label': 'Billing',
      onClick,
    })
    const drawn = line()
    expect(ref.current).toBe(drawn)
    expect(drawn.id).toBe('rule')
    expect(drawn.className).toBe('uf-separator section-rule')
    expect(drawn.style.marginBlock).toBe('12px')
    expect(drawn.title).toBe('Section break')
    expect(drawn.getAttribute('aria-label')).toBe('Billing')
    act(() => drawn.click())
    expect(onClick).toHaveBeenCalledOnce()
    const box = drawn.parentElement!
    expect([box.id, box.title, box.getAttribute('aria-label')]).toEqual(['', '', null])
    expect(box.classList.contains('section-rule')).toBe(false)
  })

  it('a focusable separator serves as a window splitter: focus, value and keys belong to the consumer', async () => {
    const onKeyDown = vi.fn((event: ReactKeyboardEvent<HTMLDivElement>) => event.currentTarget)
    await render({
      orientation: 'vertical',
      decorative: false,
      membrane: false,
      tabIndex: 0,
      'aria-label': 'Resize sidebar',
      'aria-controls': 'sidebar',
      'aria-valuenow': 240,
      'aria-valuemin': 180,
      'aria-valuemax': 420,
      onKeyDown,
    })
    const handle = host.querySelector<HTMLElement>('[role="separator"]')!
    expect(handle).toBe(line())
    act(() => handle.focus())
    expect(document.activeElement).toBe(handle)
    act(() => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onKeyDown.mock.results[0]!.value).toBe(handle)
    expect(semantics()).toEqual({ role: 'separator', orientation: 'vertical' })
    expect(
      ['aria-controls', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'].map((name) =>
        handle.getAttribute(name),
      ),
    ).toEqual(['sidebar', '240', '180', '420'])
  })
})
