import { act, createRef, type ComponentProps } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Skeleton } from '../../Skeleton/Skeleton'
import { mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (props: ComponentProps<typeof Skeleton>) => {
  await act(async () => {
    root.render(<Skeleton {...props} />)
  })
}
const placeholder = () => host.querySelector<HTMLElement>('[data-scope="skeleton"]')!
/** The inline box size the props produce; '' leaves the shape's default in place. */
const size = () => ({ width: placeholder().style.width, height: placeholder().style.height })

beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Skeleton prop contract', () => {
  it('shape defaults to text and reaches the stylesheet as data-shape, a value that is not a shape included (it draws the default line)', async () => {
    await render({})
    expect(placeholder().dataset.shape).toBe('text')
    for (const shape of ['rect', 'circle', 'text'] as const) {
      await render({ shape })
      expect(placeholder().dataset.shape).toBe(shape)
    }
    await render({ shape: 'square' as 'rect' })
    expect(placeholder().dataset.shape).toBe('square')
  })

  it('width and height set the box in pixels or any CSS length, and leave the shape default when absent', async () => {
    await render({})
    expect(size()).toEqual({ width: '', height: '' })
    await render({ shape: 'rect', width: 16, height: 12 })
    expect(size()).toEqual({ width: '16px', height: '12px' })
    await render({ shape: 'text', width: '60%', height: '1.5rem' })
    expect(size()).toEqual({ width: '60%', height: '1.5rem' })
    await render({ shape: 'rect', width: 240 })
    expect(size()).toEqual({ width: '240px', height: '' })
  })

  it('a circle given only a height, as a prop or in style, takes it as its width and leaves its height to the stylesheet to keep round', async () => {
    await render({ shape: 'circle', height: '2rem' })
    expect(size()).toEqual({ width: '2rem', height: '' })
    await render({ shape: 'circle', width: '', style: { height: 20 } })
    expect(size()).toEqual({ width: '20px', height: '20px' })
    await render({ shape: 'circle', width: '50%' })
    expect(size()).toEqual({ width: '50%', height: '' })
    await render({ shape: 'circle', height: 20, style: { width: 30 } })
    expect(size()).toEqual({ width: '30px', height: '20px' })
    await render({ shape: 'circle', width: 64, height: 40 })
    expect(size()).toEqual({ width: '64px', height: '40px' })
    await render({ shape: 'circle', height: '' })
    expect(size()).toEqual({ width: '', height: '' })
    await render({ shape: 'text', height: 12 })
    expect(size()).toEqual({ width: '', height: '12px' })
  })

  it('a width or height in style wins over the props', async () => {
    for (const shape of ['text', 'rect', 'circle'] as const) {
      await render({ shape, width: 100, height: 40, style: { width: 30, height: 10 } })
      expect(size()).toEqual({ width: '30px', height: '10px' })
    }
  })

  it('is always hidden from assistive technology, even when a face document passes aria-hidden', async () => {
    await render({})
    expect(placeholder().getAttribute('aria-hidden')).toBe('true')
    expect(placeholder().hasAttribute('role')).toBe(false)
    await render({ ...({ 'aria-hidden': false } as object) })
    expect(placeholder().getAttribute('aria-hidden')).toBe('true')
  })

  it('native attributes, events and ref land on the placeholder', async () => {
    const ref = createRef<HTMLDivElement>()
    const onClick = vi.fn()
    await render({
      ref,
      id: 'avatar-placeholder',
      className: 'profile-skeleton',
      style: { marginBlock: 12 },
      title: 'Loading',
      'data-row': '3',
      onClick,
    } as ComponentProps<typeof Skeleton>)
    const node = placeholder()
    expect(ref.current).toBe(node)
    expect(node.id).toBe('avatar-placeholder')
    expect(node.className).toBe('uf-skeleton profile-skeleton')
    expect(node.style.marginBlock).toBe('12px')
    expect(node.title).toBe('Loading')
    expect(node.dataset.row).toBe('3')
    act(() => node.click())
    expect(onClick).toHaveBeenCalledOnce()
  })
})
