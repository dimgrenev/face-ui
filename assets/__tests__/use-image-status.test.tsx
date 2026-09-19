import { act, useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useImageStatus,
  type ImageStatus,
} from '../adapters/react/use-image-status'
import { mount, type View } from './harness'

/** Statuses in the order they reached the screen: one entry per commit. */
let committed: ImageStatus[]
let view: View

function Probe({ src, delay }: { src?: string; delay?: number }) {
  const [status, image] = useImageStatus(src, { delay })
  useLayoutEffect(() => {
    committed.push(status)
  })
  return src ? <img key={src} {...image} src={src} alt="" /> : null
}

const render = (props: { src?: string; delay?: number }) =>
  act(async () => view.root.render(<Probe {...props} />))
const image = () => view.host.querySelector('img')!
const fire = (type: 'load' | 'error', target = image()) =>
  act(async () => void target.dispatchEvent(new Event(type)))
const wait = (ms: number) => act(async () => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  committed = []
  view = mount()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useImageStatus', () => {
  it('reports the element’s load and failure, and a missing source as an error', async () => {
    await render({})
    await render({ src: '/a.png' })
    await fire('load')
    await render({ src: '/b.png' })
    await fire('error')
    expect(committed).toEqual(['error', 'loading', 'loaded', 'loading', 'error'])
  })

  it('starts over when src changes, without a frame of the previous status', async () => {
    await render({ src: '/a.png' })
    const first = image()
    await fire('load')
    await render({ src: '/b.png' })
    expect(image()).not.toBe(first)
    await fire('load', first)
    await render({ src: '/a.png' })
    expect(committed).toEqual(['loading', 'loaded', 'loading', 'loading'])
  })

  it('keeps a pending load idle for the delay, restarted when the delay changes', async () => {
    vi.useFakeTimers()
    await render({ src: '/a.png', delay: 200 })
    await wait(150)
    await render({ src: '/a.png', delay: 300 })
    await wait(299)
    expect(committed.at(-1)).toBe('idle')
    await wait(1)
    expect(committed.at(-1)).toBe('loading')
    await render({ src: '/a.png', delay: 500 })
    expect(committed.at(-1)).toBe('loading')
    await render({ src: '/b.png', delay: 300 })
    await wait(100)
    await fire('load')
    await wait(1000)
    expect(committed.slice(-2)).toEqual(['idle', 'loaded'])
    await render({ src: '/c.png', delay: 300 })
    await render({ src: '/c.png', delay: 0 })
    expect(committed.slice(-2)).toEqual(['idle', 'loading'])
  })

  it('sets no state after unmount', async () => {
    vi.useFakeTimers()
    await render({ src: '/a.png', delay: 300 })
    const detached = image()
    expect(vi.getTimerCount()).toBe(1)
    await act(async () => view.root.render(null))
    expect(vi.getTimerCount()).toBe(0)
    await fire('load', detached)
    await wait(1000)
    expect(committed).toEqual(['idle'])
  })

  it.each([
    [40, 'loaded'],
    [0, 'error'],
  ] as const)(
    'settles at once when the element already finished (naturalWidth %s)',
    async (width, status) => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(width)
      await render({ src: '/cached.png', delay: 300 })
      expect(committed.at(-1)).toBe(status)
    },
  )
})
