// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Avatar } from '../../Avatar/Avatar'
import { Icon } from '../../Icon/Icon'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const render = async (props: React.ComponentProps<typeof Avatar>) => {
  await act(async () => {
    root.render(<Avatar {...props} />)
  })
}
const part = (name: string) =>
  host.querySelector<HTMLElement>(`[data-part="${name}"]`)!
const event = async (type: 'load' | 'error', image = part('image')) => {
  await act(async () => {
    image.dispatchEvent(new Event(type))
  })
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  host.remove()
  vi.useRealTimers()
})

describe('Avatar prop contract', () => {
  it.each([
    ['𠮷田 太郎', '𠮷太'],
    ['a\u0301da Lovelace', 'A\u0301L'],
    ['👩🏽‍💻 Ada', '👩🏽‍💻A'],
    ['🇷🇺 Иван', '🇷🇺И'],
    ['👨‍👩‍👧‍👦', '👨‍👩‍👧‍👦'],
    ['क्षमा शर्मा', 'क्षश'],
    ['  \t\n ', ''],
    ['ßeta', 'SS'],
  ])('name %s preserves complete initial graphemes', async (name, initials) => {
    await render({ name })
    expect(part('fallback').textContent).toBe(initials)
    await render({ name, fallback: '?' })
    expect(part('fallback').textContent).toBe('?')
    await render({ name })
    expect(part('fallback').textContent).toBe(initials)
  })

  it('src follows actual image events and reloads through success, failure, and replacement', async () => {
    await render({ src: '/one.png', name: 'Ada Lovelace' })
    const oldImage = part('image')
    await event('load')
    expect(part('image').hidden).toBe(false)
    expect(part('fallback').hidden).toBe(true)
    await render({ src: '/two.png', name: 'Ada Lovelace' })
    expect(part('root').dataset.state).toBe('loading')
    expect(part('image')).not.toBe(oldImage)
    await event('load', oldImage)
    expect(part('root').dataset.state).toBe('loading')
    await event('error')
    expect(part('fallback').hidden).toBe(false)
    expect(part('image').hidden).toBe(true)
    await render({ src: '/three.png', name: 'Ada Lovelace' })
    await event('load')
    expect(part('root').dataset.state).toBe('loaded')
    await render({ src: '  ', name: 'Ada Lovelace' })
    expect(host.querySelector('img')).toBeNull()
    expect(part('fallback').hidden).toBe(false)
  })

  it('name updates initials and the complete accessible name in every image state', async () => {
    await render({ name: '  Ada   Lovelace  ' })
    expect(part('fallback').textContent).toBe('AL')
    expect(part('root').getAttribute('role')).toBe('img')
    expect(part('root').getAttribute('aria-label')).toBe('Ada Lovelace')
    await render({ name: '李雷' })
    expect(part('fallback').textContent).toBe('李')
    expect(part('root').getAttribute('aria-label')).toBe('李雷')
  })

  it('fallback replaces initials with text or rich content and can be removed after mount', async () => {
    await render({ name: 'Ada Lovelace', fallback: '?' })
    expect(part('fallback').textContent).toBe('?')
    await render({ name: 'Ada Lovelace', fallback: <Icon name="user" /> })
    expect(
      part('fallback').querySelector('svg')?.getAttribute('data-icon'),
    ).toBe('user')
    await render({ name: 'Ada Lovelace' })
    expect(part('fallback').textContent).toBe('AL')
    await render({ name: 'Ada Lovelace', fallback: 0 })
    expect(part('fallback').textContent).toBe('0')
  })

  it('fallbackDelayMs delays only pending images and restarts when the delay or source changes', async () => {
    vi.useFakeTimers()
    await render({ src: '/pending.png', name: 'Ada', fallbackDelayMs: 200 })
    expect(part('fallback').hidden).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(part('fallback').hidden).toBe(true)
    await render({ src: '/pending.png', name: 'Ada', fallbackDelayMs: 300 })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(part('fallback').hidden).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(part('fallback').hidden).toBe(false)
    await render({ src: '/another.png', name: 'Ada', fallbackDelayMs: 300 })
    expect(part('fallback').hidden).toBe(true)
    await event('error')
    expect(part('fallback').hidden).toBe(false)
    await render({ name: 'Ada', fallbackDelayMs: 300 })
    expect(part('fallback').hidden).toBe(false)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'fallbackDelayMs=%s behaves as no delay',
    async (delay) => {
      await render({ src: '/pending.png', name: 'Ada', fallbackDelayMs: delay })
      expect(part('fallback').hidden).toBe(false)
    },
  )

  it('root attributes, style, events, and ref address the same public element', async () => {
    const ref = createRef<HTMLSpanElement>()
    const onClick = vi.fn()
    await render({
      name: 'Ada',
      ref,
      className: 'identity',
      id: 'person',
      title: 'Owner',
      style: { color: 'red' },
      onClick,
      'aria-label': 'Project owner',
    })
    expect(ref.current).toBe(part('root'))
    expect(ref.current?.classList.contains('identity')).toBe(true)
    expect(ref.current?.id).toBe('person')
    expect(ref.current?.title).toBe('Owner')
    expect(ref.current?.style.color).toBe('red')
    expect(ref.current?.getAttribute('aria-label')).toBe('Project owner')
    await act(async () => {
      ref.current?.click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
    await render({ name: 'Ada', 'aria-hidden': true })
    expect(part('root').getAttribute('aria-hidden')).toBe('true')
  })
})
