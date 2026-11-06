import { act, createRef, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Media, type MediaProps } from '../../Media/Media'
import { expectDevError, libraryCss, mount, type View } from './harness'

let view: View
beforeEach(() => {
  view = mount()
})
const render = (ui: ReactNode) => act(async () => view.root.render(ui))
const root = () =>
  view.host.querySelector<HTMLElement>(
    '[data-scope="media"][data-part="root"]',
  )!
const element = () =>
  view.host.querySelector<HTMLElement>(
    '[data-scope="media"][data-part="element"]',
  )!
const fallback = () =>
  view.host.querySelector<HTMLElement>(
    '[data-scope="media"][data-part="fallback"]',
  )
const fire = (target: Element, type: string) =>
  act(async () => {
    target.dispatchEvent(new Event(type))
  })

describe('Media type', () => {
  it('type picks the element: an image by default, a video or an audio player', async () => {
    await render(<Media src="/a.jpg" alt="Lobby" />)
    expect(element().tagName).toBe('IMG')
    expect(root().getAttribute('data-type')).toBe('image')
    await render(<Media type="video" src="/a.mp4" controls />)
    expect(element().tagName).toBe('VIDEO')
    expect(root().getAttribute('data-type')).toBe('video')
    await render(<Media type="audio" src="/a.mp3" controls />)
    expect(element().tagName).toBe('AUDIO')
    expect(root().getAttribute('data-type')).toBe('audio')
  })

  it('variant frames images only', async () => {
    await render(<Media src="/a.jpg" alt="" />)
    expect(root().getAttribute('data-variant')).toBe('default')
    await render(<Media src="/a.jpg" alt="" variant="circle" />)
    expect(root().getAttribute('data-variant')).toBe('circle')
    const video = {
      type: 'video',
      src: '/a.mp4',
      variant: 'circle',
    } as unknown as MediaProps
    await render(<Media {...video} />)
    expect(root().hasAttribute('data-variant')).toBe(false)
    const css = libraryCss()
    expect(css).toContain('.uf-media[data-scope][data-variant="circle"] {')
    expect(css).toContain('.uf-media[data-scope][data-variant="thumbnail"] {')
  })
})

describe('Media source and fallback', () => {
  it('hidden removes the complete boundary, including fallback, for every media kind', async () => {
    const cases: ReactNode[] = [
      <Media src="/broken.jpg" alt="Preview" fallback="Unavailable" hidden width={200} height={100} />,
      <Media type="video" src="/broken.mp4" fallback="Unavailable" hidden width={200} height={100} />,
      <Media type="audio" src="/broken.mp3" fallback="Unavailable" hidden width={200} height={100} />,
    ]
    for (const media of cases) {
      await render(media)
      const boundary = root().parentElement!
      expect(boundary.classList.contains('uf-membrane')).toBe(true)
      expect(boundary.hidden).toBe(true)
      expect(element().hidden).toBe(true)
      await fire(element(), 'error')
      expect(fallback()?.textContent).toBe('Unavailable')
      expect(boundary.hidden).toBe(true)
    }
    await render(<Media src="/broken.jpg" alt="Preview" fallback="Unavailable" width={200} height={100} />)
    expect(root().parentElement?.hidden).toBe(false)
  })

  it('src reaches the element; a missing or empty src shows the fallback at once', async () => {
    await render(<Media src="/a.jpg" alt="Lobby" fallback="Unavailable" />)
    expect(element().getAttribute('src')).toBe('/a.jpg')
    expect(fallback()).toBeNull()
    expect(root().getAttribute('data-state')).toBe('loading')
    await render(<Media src="  " alt="Lobby" fallback="Unavailable" />)
    expect(element().hasAttribute('src')).toBe(false)
    expect(element().hidden).toBe(true)
    expect(fallback()?.textContent).toBe('Unavailable')
    expect(root().getAttribute('data-state')).toBe('error')
  })

  it('a failed load shows the fallback in place of the element', async () => {
    await render(
      <Media
        src="/broken.jpg"
        alt="Lobby"
        fallback={<span>Unavailable</span>}
      />,
    )
    expect(element().hidden).toBe(false)
    await fire(element(), 'error')
    expect(element().hidden).toBe(true)
    expect(fallback()?.textContent).toBe('Unavailable')
    expect(root().getAttribute('data-state')).toBe('error')
  })

  it('without a fallback a failed image stays in place with its alt text', async () => {
    await render(<Media src="/broken.jpg" alt="Lobby" />)
    await fire(element(), 'error')
    expect(element().hidden).toBe(false)
    expect(element().getAttribute('alt')).toBe('Lobby')
    expect(fallback()).toBeNull()
  })

  it('a failed video shows the fallback too', async () => {
    await render(<Media type="video" src="/broken.mp4" fallback="No video" />)
    await fire(element(), 'error')
    expect(element().hidden).toBe(true)
    expect(fallback()?.textContent).toBe('No video')
  })

  it('a new src starts over after a failure', async () => {
    await render(
      <Media src="/broken.jpg" alt="Preview" fallback="Unavailable" />,
    )
    await fire(element(), 'error')
    expect(fallback()).not.toBeNull()
    await render(
      <Media src="/recovered.jpg" alt="Preview" fallback="Unavailable" />,
    )
    expect(element().getAttribute('src')).toBe('/recovered.jpg')
    expect(element().hidden).toBe(false)
    expect(fallback()).toBeNull()
  })
})

describe('Media events', () => {
  it('onLoad receives the native load event and the image is marked loaded', async () => {
    const onLoad = vi.fn(
      (event: { type: string; currentTarget: EventTarget }) => [
        event.type,
        event.currentTarget,
      ],
    )
    await render(<Media src="/a.jpg" alt="" onLoad={onLoad} />)
    await fire(element(), 'load')
    expect(onLoad.mock.results[0]!.value).toEqual(['load', element()])
    expect(root().getAttribute('data-state')).toBe('loaded')
  })

  it('onError receives the native error event before the fallback shows', async () => {
    const onError = vi.fn((event: { type: string }) => [event.type, fallback()])
    await render(
      <Media
        src="/broken.jpg"
        alt=""
        fallback="Unavailable"
        onError={onError}
      />,
    )
    await fire(element(), 'error')
    expect(onError.mock.results[0]!.value).toEqual(['error', null])
    expect(fallback()).not.toBeNull()
  })

  it('onError runs first; preventDefault() keeps the element instead of the fallback', async () => {
    await render(
      <Media
        src="/broken.jpg"
        alt=""
        fallback="Unavailable"
        onError={(event) => event.preventDefault()}
      />,
    )
    await fire(element(), 'error')
    expect(fallback()).toBeNull()
    expect(element().hidden).toBe(false)
  })

  it('a player is loaded once its metadata arrives; onLoadedMetadata receives the native event', async () => {
    const onLoadedMetadata = vi.fn((event: { type: string }) => event.type)
    await render(
      <Media type="video" src="/a.mp4" onLoadedMetadata={onLoadedMetadata} />,
    )
    expect(root().getAttribute('data-state')).toBe('loading')
    await fire(element(), 'loadedmetadata')
    expect(onLoadedMetadata.mock.results[0]!.value).toBe('loadedmetadata')
    expect(root().getAttribute('data-state')).toBe('loaded')
  })

  it('a player whose browser holds off fetching until playback is not left loading', async () => {
    await render(<Media type="audio" src="/a.mp3" controls preload="none" />)
    expect(root().getAttribute('data-state')).toBe('loading')
    await fire(element(), 'suspend')
    expect(root().getAttribute('data-state')).toBe('loaded')
    // Playback of a broken source still shows the failure.
    await fire(element(), 'error')
    expect(root().getAttribute('data-state')).toBe('error')
  })

  it('a player that settled before React attached reports its state at once', async () => {
    const proto = HTMLMediaElement.prototype
    const original = {
      readyState: Object.getOwnPropertyDescriptor(proto, 'readyState'),
      error: Object.getOwnPropertyDescriptor(proto, 'error'),
    }
    const stub = (name: keyof typeof original, value: unknown) =>
      Object.defineProperty(proto, name, {
        configurable: true,
        get: () => value,
      })
    try {
      stub('readyState', proto.HAVE_ENOUGH_DATA)
      await render(<Media type="video" src="/cached.mp4" />)
      expect(root().getAttribute('data-state')).toBe('loaded')
      stub('readyState', proto.HAVE_NOTHING)
      stub('error', { code: 4 })
      await render(<Media type="video" src="/broken.mp4" fallback="No video" />)
      expect(root().getAttribute('data-state')).toBe('error')
      expect(fallback()?.textContent).toBe('No video')
    } finally {
      for (const [name, descriptor] of Object.entries(original)) {
        if (descriptor) Object.defineProperty(proto, name, descriptor)
        else delete (proto as unknown as Record<string, unknown>)[name]
      }
    }
  })

  it('onLoadedData and the other native media events reach the player', async () => {
    const onLoadedData = vi.fn((event: { type: string }) => event.type)
    await render(
      <Media type="video" src="/a.mp4" onLoadedData={onLoadedData} />,
    )
    await fire(element(), 'loadeddata')
    expect(onLoadedData.mock.results[0]!.value).toBe('loadeddata')
  })
})

describe('Media alt', () => {
  it('alt names the image; alt="" marks it decorative', async () => {
    await render(<Media src="/a.jpg" alt="Team at the offsite" />)
    expect(element().getAttribute('alt')).toBe('Team at the offsite')
    await render(<Media src="/a.jpg" alt="" />)
    expect(element().getAttribute('alt')).toBe('')
  })

  it('an image without alt, as JSON can send, is reported and still renders', async () => {
    const json = { src: '/a.jpg' } as unknown as MediaProps
    await expectDevError(
      () => render(<Media {...json} />),
      /^Face UI Media: missing alt; the image has no text alternative \(alt="" marks a decorative one\)\.$/,
    )
    expect(element().tagName).toBe('IMG')
    expect(element().hasAttribute('alt')).toBe(false)
    // Players are named by aria-label and need no alt; any other console.error fails the test.
    await render(<Media type="video" src="/a.mp4" />)
    expect(element().tagName).toBe('VIDEO')
  })

  it('stays silent when ARIA names the image or marks it presentational', async () => {
    // TypeScript requires alt; these are the JSON paths, where ARIA names the image instead.
    // An unexpected console.error fails the test, so rendering is the assertion.
    const named = { src: '/a.jpg', 'aria-label': 'Team at the offsite' }
    await render(<Media {...(named as unknown as MediaProps)} />)
    expect(element().getAttribute('aria-label')).toBe('Team at the offsite')
    const referenced = { src: '/a.jpg', 'aria-labelledby': 'media-caption' }
    await render(
      <>
        <span id="media-caption">Team at the offsite</span>
        <Media {...(referenced as unknown as MediaProps)} />
      </>,
    )
    expect(element().getAttribute('aria-labelledby')).toBe('media-caption')
    const decorative = { src: '/a.jpg', role: 'presentation' }
    await render(<Media {...(decorative as unknown as MediaProps)} />)
    expect(element().getAttribute('role')).toBe('presentation')
  })
})

describe('Media box', () => {
  it('width and height size the box and win over style', async () => {
    await render(
      <Media
        src="/a.jpg"
        alt=""
        width={120}
        height="8rem"
        style={{ width: 10, height: 10, color: 'red' }}
      />,
    )
    expect(root().style.width).toBe('120px')
    expect(root().style.height).toBe('8rem')
    expect(root().style.color).toBe('red')
    expect(element().getAttribute('width')).toBeNull()
  })

  it('normalizes unitless numeric strings for both dimensions', async () => {
    await expectDevError(
      () => render(<Media src="/a.jpg" alt="" width="50" />),
      /^Face UI Media: invalid width "50"; using 50px\.$/,
    )
    await expectDevError(
      () => render(<Media src="/a.jpg" alt="" width={50} height="25" />),
      /^Face UI Media: invalid height "25"; using 25px\.$/,
    )
    expect(root().style.width).toBe('50px')
    expect(root().style.height).toBe('25px')
  })

  it('without width or height the box takes the full width and the media its own ratio', async () => {
    await render(<Media src="/a.jpg" alt="" />)
    expect(root().style.width).toBe('')
    expect(root().style.height).toBe('')
    const css = libraryCss()
    expect(css).toContain('.uf-media[data-scope] > [data-part="element"] {')
    expect(css).toMatch(/\.uf-media\[data-scope\] \{[^}]*width: 100%;/)
  })

  it('objectFit sets how the media fills the box; images default to cover', async () => {
    await render(<Media src="/a.jpg" alt="" height={200} objectFit="contain" />)
    expect(element().style.objectFit).toBe('contain')
    await render(<Media src="/a.jpg" alt="" height={200} />)
    expect(element().style.objectFit).toBe('')
    expect(libraryCss()).toMatch(
      /\.uf-media\[data-scope\]\[data-type="image"\] > \[data-part="element"\] \{\s*object-fit: cover;/,
    )
  })

  it('className and style go to the box; other native attributes and ref to the media element', async () => {
    const ref = createRef<
      HTMLImageElement | HTMLVideoElement | HTMLAudioElement
    >()
    await render(
      <Media
        ref={ref}
        src="/a.jpg"
        alt="Lobby"
        className="hero"
        style={{ color: 'red' }}
        id="lobby"
        title="The lobby"
        tabIndex={0}
        loading="lazy"
        crossOrigin="anonymous"
        data-testid="lobby"
        aria-describedby="caption"
      />,
    )
    expect(ref.current).toBe(element())
    expect(root().className).toBe('uf-media hero')
    expect(root().style.color).toBe('red')
    expect(root().hasAttribute('title')).toBe(false)
    expect(element().id).toBe('lobby')
    expect(element().getAttribute('title')).toBe('The lobby')
    expect(element().tabIndex).toBe(0)
    expect(element().getAttribute('loading')).toBe('lazy')
    expect(element().getAttribute('crossorigin')).toBe('anonymous')
    expect(element().getAttribute('data-testid')).toBe('lobby')
    expect(element().getAttribute('aria-describedby')).toBe('caption')
  })

  it('player attributes reach the player: controls, poster, autoPlay, loop, muted, playsInline', async () => {
    await render(
      <Media
        type="video"
        src="/a.mp4"
        poster="/a.jpg"
        controls
        autoPlay
        loop
        muted
        playsInline
      />,
    )
    const video = element() as HTMLVideoElement
    expect(video.getAttribute('poster')).toBe('/a.jpg')
    expect(video.hasAttribute('controls')).toBe(true)
    expect(video.hasAttribute('autoplay')).toBe(true)
    expect(video.hasAttribute('loop')).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.hasAttribute('playsinline')).toBe(true)
    await render(<Media type="audio" src="/a.mp3" controls loop />)
    expect(element().tagName).toBe('AUDIO')
    expect(element().hasAttribute('controls')).toBe(true)
    expect(element().hasAttribute('loop')).toBe(true)
    await render(<Media type="video" src="/a.mp4" />)
    expect(element().hasAttribute('controls')).toBe(false)
  })

  it('aria-label names a video player', async () => {
    await render(
      <Media type="video" src="/tour.mp4" controls aria-label="Product tour" />,
    )
    expect(element().getAttribute('aria-label')).toBe('Product tour')
    expect(element().hasAttribute('controls')).toBe(true)
  })

  it('images decode asynchronously unless decoding says otherwise', async () => {
    await render(<Media src="/a.jpg" alt="" />)
    expect(element().getAttribute('decoding')).toBe('async')
    await render(<Media src="/a.jpg" alt="" decoding="sync" />)
    expect(element().getAttribute('decoding')).toBe('sync')
  })

  it('video and audio children render inside the player as tracks', async () => {
    await render(
      <Media type="video" src="/tour.mp4">
        <track kind="captions" src="/tour.vtt" srcLang="en" />
      </Media>,
    )
    expect(element().querySelector('track')?.getAttribute('kind')).toBe(
      'captions',
    )
  })

  it('membrane wraps the box in the system spacing only when on', async () => {
    await render(
      <>
        <Media src="/default.jpg" alt="" />
        <Media src="/membrane.jpg" alt="" width="100%" membrane />
      </>,
    )
    const boxes = [
      ...view.host.querySelectorAll('[data-scope="media"][data-part="root"]'),
    ]
    expect(
      boxes[0]!.parentElement!.hasAttribute('data-membrane-disabled'),
    ).toBe(true)
    expect(
      boxes[1]!.parentElement!.hasAttribute('data-membrane-disabled'),
    ).toBe(false)
    expect(
      boxes[1]!.parentElement!.classList.contains('uf-membrane--full'),
    ).toBe(true)
  })
})
