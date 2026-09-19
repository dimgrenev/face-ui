import React, { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Avatar } from '../../Avatar/Avatar'
import { Icon } from '../../Icon/Icon'
import { expectDevError, hydrate, libraryCss, mount } from './harness'

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
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
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

  it('src follows the image element and starts over when it changes', async () => {
    await render({ src: '/one.png', name: 'Ada Lovelace' })
    expect(part('root').dataset.state).toBe('loading')
    expect(part('image').hidden).toBe(true)
    expect(part('fallback').hidden).toBe(false)
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
    expect(part('root').dataset.state).toBe('error')
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
    await render({ name: 'Grace Brewster Murray Hopper', src: '/grace.png' })
    await event('load')
    expect(part('fallback').textContent).toBe('GH')
    expect(part('root').getAttribute('aria-label')).toBe('Grace Brewster Murray Hopper')
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

  it('fallbackDelay holds back the fallback of a pending image only, restarting on a new delay or source', async () => {
    vi.useFakeTimers()
    await render({ src: '/pending.png', name: 'Ada', fallbackDelay: 200 })
    expect(part('root').dataset.state).toBe('idle')
    expect(part('fallback').hidden).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(part('fallback').hidden).toBe(true)
    await render({ src: '/pending.png', name: 'Ada', fallbackDelay: 300 })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(part('fallback').hidden).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(part('fallback').hidden).toBe(false)
    expect(part('root').dataset.state).toBe('loading')
    await render({ src: '/another.png', name: 'Ada', fallbackDelay: 300 })
    expect(part('fallback').hidden).toBe(true)
    await event('error')
    expect(part('fallback').hidden).toBe(false)
    await render({ src: '/fast.png', name: 'Ada', fallbackDelay: 300 })
    await event('load')
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(part('fallback').hidden).toBe(true)
    await render({ name: 'Ada', fallbackDelay: 300 })
    expect(part('fallback').hidden).toBe(false)
    await render({ src: '/pending.png', name: 'Ada', fallbackDelay: 300 })
    await act(async () => root.render(null))
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, '50', null])(
    'fallbackDelay=%s behaves as no delay and is reported',
    async (delay) => {
      await expectDevError(
        () => render({ src: '/pending.png', name: 'Ada', fallbackDelay: delay as number }),
        /^Face UI Avatar: invalid fallbackDelay .*; using 0\.$/,
      )
      expect(part('fallback').hidden).toBe(false)
    },
  )

  it('src and name that are not strings read as absent', async () => {
    await render({ src: null, name: 0 } as never)
    expect(host.querySelector('img')).toBeNull()
    expect(part('root').getAttribute('role')).toBeNull()
    expect(part('fallback').textContent).toBe('')
  })

  it.each([
    [{ src: '/ada.png', name: 'Ada Lovelace' }, 'loading', false],
    [{ name: 'Ada Lovelace' }, 'error', false],
    [{ src: '/ada.png', name: 'Ada Lovelace', fallbackDelay: 300 }, 'idle', true],
  ] as const)(
    'server renders %o with the fallback decided by props alone and hydrates it unchanged',
    async (props, state, fallbackHidden) => {
      host = document.body.appendChild(document.createElement('div'))
      host.innerHTML = renderToString(<Avatar {...props} />)
      const html = host.innerHTML
      expect(part('root').dataset.state).toBe(state)
      expect(part('fallback').hidden).toBe(fallbackHidden)
      expect(part('fallback').textContent).toBe('AL')
      expect(host.querySelector('img')?.hidden ?? true).toBe(true)
      const { recoverableErrors } = await hydrate(<Avatar {...props} />, host)
      expect(recoverableErrors).toEqual([])
      expect(host.innerHTML).toBe(html)
    },
  )

  it.each([
    [40, 'loaded'],
    [0, 'error'],
  ] as const)(
    'hydration picks up an image that finished first (naturalWidth %s)',
    async (width, state) => {
      host = document.body.appendChild(document.createElement('div'))
      const ui = <Avatar src="/ada.png" name="Ada Lovelace" fallbackDelay={300} />
      host.innerHTML = renderToString(ui)
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(width)
      await hydrate(ui, host)
      expect(part('root').dataset.state).toBe(state)
      expect(part('image').hidden).toBe(state !== 'loaded')
      expect(part('fallback').hidden).toBe(state === 'loaded')
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

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Avatar centers icon fallback content inside a square control box', async () => {
    await act(async () => {
      root.render(<Avatar fallback={<Icon name="user" />} />)
    })

    const avatar = container.querySelector<HTMLElement>('[data-scope="avatar"]')
    const icon = avatar?.querySelector<SVGElement>(
      '.uf-avatar__content > svg[data-icon="user"]',
    )
    expect(avatar).not.toBeNull()
    expect(icon).not.toBeNull()
    expect(avatar?.querySelector('[data-part="image"]')).toBeNull()

    const componentStyles = libraryCss()
    expect(componentStyles).toContain('block-size: var(--uf-control-height);')
    expect(componentStyles).toContain(
      '[data-scope="avatar"] [data-part="fallback"]',
    )
    expect(componentStyles).toContain('display: flex;')
    expect(componentStyles).toContain(
      '.uf-avatar__content > :is(svg, img, .uf-icon)',
    )
  })
})
