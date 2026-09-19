import { act, createRef, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Carousel, type CarouselProps } from '../../Carousel/Carousel'
import { describeControlled } from './harness/controlled'
import { expectDevError, mount, type View } from './harness'
import { installMatchMedia } from './harness/match-media'

const three = (props: CarouselProps = {}) => (
  <Carousel {...props}>
    <button>One</button>
    <button>Two</button>
    <button>Three</button>
  </Carousel>
)

const slides = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLElement>('[data-scope="carousel"][data-part="slide"]'),
]
/** Indexes of the slides a user can see and reach. */
const visible = (host: HTMLElement) =>
  slides(host).flatMap((slide, index) => (slide.hasAttribute('inert') ? [] : [index]))
const shown = (host: HTMLElement) =>
  Number(host.querySelector('[data-part="slide"][data-current]')?.getAttribute('data-index'))
const control = (host: HTMLElement, part: 'prev' | 'next' | 'rotation') =>
  host.querySelector<HTMLButtonElement>(`[data-scope="button"][data-part="${part}"]`)
const indicators = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLButtonElement>('[data-scope="button"][data-part="indicator-item"]'),
]
/** A press and click where a pointer lands on an icon button: on its icon. */
const click = (element: Element | null) =>
  act(async () => {
    const target = element!.querySelector('svg') ?? element!
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
const press = (target: Element, key: string) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
const focus = (element: HTMLElement) => act(async () => element.focus())
/** Accessible name of an icon-only Button: its visually hidden text. */
const nameOf = (button: Element | null) => button?.textContent

let view: View
beforeEach(() => {
  view = mount()
})
const render = (ui: ReactNode) => act(async () => view.root.render(ui))

describeControlled({
  name: 'Carousel',
  prop: 'index',
  values: [0, 2],
  render: (props) => three(props),
  change: (host, to) => {
    indicators(host)[to]!.click()
  },
  read: shown,
  normalizes: [7, 2],
  handler: 'onClick',
})

describe('Carousel children', () => {
  it('each top-level child is one slide; nested arrays flatten and empty children drop', async () => {
    await render(
      <Carousel>
        {[<b key="a">A</b>, [<b key="b">B</b>, null, false]]}
        {''}
        <b>C</b>
      </Carousel>,
    )
    expect(slides(view.host).map((slide) => slide.textContent)).toEqual(['A', 'B', 'C'])
    expect(indicators(view.host)).toHaveLength(3)
  })

  it('text children render as text slides, never as image URLs', async () => {
    await render(<Carousel>{'/photo.jpg'}{'Second'}</Carousel>)
    expect(view.host.querySelector('img')).toBeNull()
    expect(slides(view.host).map((slide) => slide.textContent)).toEqual(['/photo.jpg', 'Second'])
  })

  it('JSON Media descriptors render as Media slides', async () => {
    await render(
      <Carousel>
        {[
          { __componentName__: 'Media', src: '/a.jpg', alt: 'Lobby' },
          { __componentName__: 'Media', src: '/b.jpg', alt: 'Terrace' },
        ]}
      </Carousel>,
    )
    const images = slides(view.host).map((slide) => slide.querySelector('img'))
    expect(images.map((image) => image?.getAttribute('alt'))).toEqual(['Lobby', 'Terrace'])
    expect(images[0]?.closest('[data-scope="media"][data-part="root"]')).not.toBeNull()
  })

  it('a JSON child that is not a Media descriptor is reported and left out, leaving no empty slide', async () => {
    await expectDevError(
      () =>
        render(
          <Carousel>
            {[
              { __componentName__: 'Card', title: 'Story' },
              { __componentName__: 'Media', src: '/a.jpg', alt: 'Lobby' },
            ]}
          </Carousel>,
        ),
      /^Face UI Carousel: invalid children "Card"; JSON slides are Media descriptors; the slide is left out\.$/,
    )
    expect(slides(view.host)).toHaveLength(1)
    expect(slides(view.host)[0]!.querySelector('img')?.getAttribute('alt')).toBe('Lobby')
    expect(view.host.querySelector('button')).toBeNull()
  })

  it('without slides the region renders empty and without controls', async () => {
    await render(<Carousel />)
    expect(view.host.querySelector('[role="region"]')).not.toBeNull()
    expect(slides(view.host)).toHaveLength(0)
    expect(view.host.querySelector('button')).toBeNull()
  })

  it('a single position renders no controls', async () => {
    await render(
      <Carousel autoPlay>
        <b>Only</b>
      </Carousel>,
    )
    expect(slides(view.host)).toHaveLength(1)
    expect(visible(view.host)).toEqual([0])
    expect(view.host.querySelector('button')).toBeNull()
  })
})

describe('Carousel index', () => {
  it('slides outside the view are inert on both React majors', async () => {
    await render(three())
    expect(slides(view.host).map((slide) => slide.hasAttribute('inert'))).toEqual([false, true, true])
    await click(control(view.host, 'next'))
    expect(slides(view.host).map((slide) => slide.hasAttribute('inert'))).toEqual([true, false, true])
    expect(slides(view.host)[1]!.hasAttribute('data-current')).toBe(true)
  })

  it('a negative or fractional index is reported and normalized', async () => {
    await expectDevError(() => render(three({ index: -1 })), /^Face UI Carousel: invalid index -1; using 0\.$/)
    expect(shown(view.host)).toBe(0)
    await expectDevError(() => render(three({ index: 1.5 })), /^Face UI Carousel: invalid index 1\.5; using 1\.$/)
    expect(shown(view.host)).toBe(1)
  })

  it('an index proposal is computed from the position shown, not a stored one past the end', async () => {
    const onIndexChange = vi.fn()
    await render(three({ defaultIndex: 9, onIndexChange }))
    expect(shown(view.host)).toBe(2)
    await click(control(view.host, 'prev'))
    expect(shown(view.host)).toBe(1)
    expect(onIndexChange).toHaveBeenCalledWith({ index: 1 })
  })
})

describe('Carousel slidesPerView', () => {
  it('slidesPerView shows that many slides and stops at the last full window', async () => {
    await render(three({ slidesPerView: 2 }))
    const root = view.host.querySelector<HTMLElement>('[role="region"]')!
    expect(root.style.getPropertyValue('--face-runtime-carousel-slides-per-view')).toBe('2')
    expect(visible(view.host)).toEqual([0, 1])
    expect(indicators(view.host)).toHaveLength(2)
    await click(control(view.host, 'next'))
    expect(visible(view.host)).toEqual([1, 2])
    expect(control(view.host, 'next')!.disabled).toBe(true)
  })

  it('more slides per view than slides keeps each slide at its share and shows no controls', async () => {
    await render(
      <Carousel slidesPerView={3}>
        <b>A</b>
        <b>B</b>
      </Carousel>,
    )
    const root = view.host.querySelector<HTMLElement>('[role="region"]')!
    expect(root.style.getPropertyValue('--face-runtime-carousel-slides-per-view')).toBe('3')
    expect(visible(view.host)).toEqual([0, 1])
    expect(view.host.querySelector('button')).toBeNull()
  })

  it('a fractional or zero slidesPerView is reported and becomes a whole number from 1', async () => {
    await expectDevError(() => render(three({ slidesPerView: 2.5 })), /invalid slidesPerView 2\.5; using 2\./)
    expect(visible(view.host)).toEqual([0, 1])
    await expectDevError(() => render(three({ slidesPerView: 0 })), /invalid slidesPerView 0; using 1\./)
    expect(visible(view.host)).toEqual([0])
  })
})

describe('Carousel loop', () => {
  it('without loop, previous and next are disabled at the ends', async () => {
    await render(three())
    expect(control(view.host, 'prev')!.disabled).toBe(true)
    await click(control(view.host, 'next'))
    await click(control(view.host, 'next'))
    expect(shown(view.host)).toBe(2)
    expect(control(view.host, 'next')!.disabled).toBe(true)
    expect(control(view.host, 'prev')!.disabled).toBe(false)
  })

  it('with loop, next on the last position shows the first and previous on the first shows the last', async () => {
    const onIndexChange = vi.fn()
    await render(three({ loop: true, onIndexChange }))
    expect(control(view.host, 'prev')!.disabled).toBe(false)
    await click(control(view.host, 'prev'))
    expect(shown(view.host)).toBe(2)
    await click(control(view.host, 'next'))
    expect(shown(view.host)).toBe(0)
    expect(onIndexChange.mock.calls).toEqual([[{ index: 2 }], [{ index: 0 }]])
  })

  it('loop also wraps the keyboard: ArrowLeft on the first position shows the last', async () => {
    await render(three({ loop: true }))
    await press(control(view.host, 'next')!, 'ArrowLeft')
    expect(shown(view.host)).toBe(2)
    await render(three({ loop: false }))
    await press(control(view.host, 'next')!, 'ArrowRight')
    await press(control(view.host, 'next')!, 'ArrowRight')
    await press(control(view.host, 'next')!, 'ArrowRight')
    expect(shown(view.host)).toBe(2)
  })
})

describe('Carousel keyboard', () => {
  it('arrow keys on the carousel controls move it; Home and End jump to the ends', async () => {
    await render(three())
    const next = control(view.host, 'next')!
    await press(next, 'ArrowRight')
    expect(shown(view.host)).toBe(1)
    await press(next, 'End')
    expect(shown(view.host)).toBe(2)
    await press(control(view.host, 'prev')!, 'Home')
    expect(shown(view.host)).toBe(0)
    await press(next, 'ArrowDown')
    expect(shown(view.host)).toBe(0)
  })

  it('in right-to-left text ArrowLeft moves to the next slide', async () => {
    view.host.dir = 'rtl'
    await render(three())
    await press(control(view.host, 'next')!, 'ArrowLeft')
    expect(shown(view.host)).toBe(1)
    await press(control(view.host, 'next')!, 'ArrowRight')
    expect(shown(view.host)).toBe(0)
  })

  it('keys inside slide content are left to the content', async () => {
    await render(three())
    const inside = slides(view.host)[0]!.querySelector('button')!
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    await act(async () => inside.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(false)
    expect(shown(view.host)).toBe(0)
  })

  it('onKeyDown runs first; preventDefault() keeps the position', async () => {
    const order: string[] = []
    await render(
      three({
        onKeyDown: (event) => {
          order.push(event.key)
          event.preventDefault()
        },
      }),
    )
    await press(control(view.host, 'next')!, 'ArrowRight')
    expect(order).toEqual(['ArrowRight'])
    expect(shown(view.host)).toBe(0)
  })

  it('the indicators are one tab stop that arrows move and activate', async () => {
    const onIndexChange = vi.fn()
    await render(three({ onIndexChange }))
    expect(indicators(view.host).map((button) => button.tabIndex)).toEqual([0, -1, -1])
    await focus(indicators(view.host)[0]!)
    await press(indicators(view.host)[0]!, 'ArrowRight')
    expect(document.activeElement).toBe(indicators(view.host)[1])
    expect(shown(view.host)).toBe(1)
    expect(indicators(view.host).map((button) => button.tabIndex)).toEqual([-1, 0, -1])
    await press(indicators(view.host)[1]!, 'End')
    expect(document.activeElement).toBe(indicators(view.host)[2])
    expect(shown(view.host)).toBe(2)
    expect(onIndexChange.mock.calls).toEqual([[{ index: 1 }], [{ index: 2 }]])
  })

  it('the current indicator is marked aria-current', async () => {
    await render(three({ defaultIndex: 1 }))
    expect(indicators(view.host).map((button) => button.getAttribute('aria-current'))).toEqual([
      null,
      'true',
      null,
    ])
  })
})

describe('Carousel focus', () => {
  it('next disabled at the end hands focus to previous', async () => {
    await render(three({ defaultIndex: 1 }))
    const next = control(view.host, 'next')!
    await focus(next)
    await click(next)
    expect(next.disabled).toBe(true)
    expect(document.activeElement).toBe(control(view.host, 'prev'))
  })

  it('focus in a slide that a controlled change hides moves to the current indicator', async () => {
    await render(three({ index: 0 }))
    const inside = slides(view.host)[0]!.querySelector('button')!
    await focus(inside)
    await render(three({ index: 1 }))
    expect(slides(view.host)[0]!.hasAttribute('inert')).toBe(true)
    expect(document.activeElement).toBe(indicators(view.host)[1])
  })

  it('previous disabled at the start hands focus to next', async () => {
    await render(three({ defaultIndex: 1 }))
    const prev = control(view.host, 'prev')!
    await focus(prev)
    await click(prev)
    expect(prev.disabled).toBe(true)
    expect(document.activeElement).toBe(control(view.host, 'next'))
  })
})

describe('Carousel autoplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const wait = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

  it('autoPlay advances one position per autoPlayInterval and returns to the first after the last', async () => {
    const onIndexChange = vi.fn()
    await render(three({ autoPlay: true, autoPlayInterval: 1000, onIndexChange }))
    await wait(999)
    expect(shown(view.host)).toBe(0)
    await wait(1)
    expect(shown(view.host)).toBe(1)
    await wait(1000)
    expect(shown(view.host)).toBe(2)
    await wait(1000)
    expect(shown(view.host)).toBe(0)
    expect(onIndexChange.mock.calls).toEqual([[{ index: 1 }], [{ index: 2 }], [{ index: 0 }]])
  })

  it('without autoPlay nothing rotates and no rotation control renders', async () => {
    await render(three())
    await wait(10_000)
    expect(shown(view.host)).toBe(0)
    expect(control(view.host, 'rotation')).toBeNull()
  })

  it('autoPlayInterval defaults to 3000 milliseconds', async () => {
    await render(three({ autoPlay: true }))
    await wait(2999)
    expect(shown(view.host)).toBe(0)
    await wait(1)
    expect(shown(view.host)).toBe(1)
  })

  it('an autoPlayInterval below 100 is reported and raised to 100', async () => {
    await expectDevError(
      () => render(three({ autoPlay: true, autoPlayInterval: 10 })),
      /^Face UI Carousel: invalid autoPlayInterval 10; using 100\.$/,
    )
    await wait(99)
    expect(shown(view.host)).toBe(0)
    await wait(1)
    expect(shown(view.host)).toBe(1)
  })

  it('hovering pauses rotation until the pointer leaves', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const root = view.host.querySelector('[role="region"]')!
    // React maps pointerenter/pointerleave onto pointerover/pointerout between elements.
    await act(async () => root.dispatchEvent(new MouseEvent('pointerover', { bubbles: true })))
    await wait(5000)
    expect(shown(view.host)).toBe(0)
    expect(nameOf(control(view.host, 'rotation'))).toBe('Pause rotation')
    await act(async () =>
      root.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body })),
    )
    await wait(1000)
    expect(shown(view.host)).toBe(1)
  })

  it('focus or a press inside stops rotation until the rotation control starts it', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const rotation = control(view.host, 'rotation')!
    expect(nameOf(rotation)).toBe('Pause rotation')
    await focus(slides(view.host)[0]!.querySelector('button')!)
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(0)
    await click(rotation)
    expect(nameOf(rotation)).toBe('Pause rotation')
    await wait(1000)
    expect(shown(view.host)).toBe(1)
    await click(control(view.host, 'next'))
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(2)
  })

  it('a press on the rotation control only toggles rotation, though it focuses the control', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const rotation = control(view.host, 'rotation')!
    /** A mouse press as Chromium delivers it: the button takes focus between down and click. */
    const pressFocusing = async () => {
      await act(async () => {
        rotation.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
        rotation.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        rotation.focus()
      })
      await act(async () => {
        rotation.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
    }
    await pressFocusing()
    expect(document.activeElement).toBe(rotation)
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(0)
    await act(async () => rotation.blur())
    await pressFocusing()
    expect(nameOf(rotation)).toBe('Pause rotation')
    await wait(1000)
    expect(shown(view.host)).toBe(1)
  })

  it('keyboard focus on the rotation control stops rotation, which activating it starts again', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const rotation = control(view.host, 'rotation')!
    // Tab pressed, then focus arrives: :focus-visible matches, as after keyboard navigation.
    await press(document.body, 'Tab')
    await focus(rotation)
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(0)
    await act(async () => rotation.click())
    expect(nameOf(rotation)).toBe('Pause rotation')
    await wait(1000)
    expect(shown(view.host)).toBe(1)
  })

  it('any move the user asks for stops rotation: keys on the rotation control, an indicator', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const rotation = control(view.host, 'rotation')!
    await press(rotation, 'ArrowRight')
    expect(shown(view.host)).toBe(1)
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(1)
    await act(async () => rotation.click())
    await act(async () => indicators(view.host)[0]!.click())
    expect(shown(view.host)).toBe(0)
    expect(nameOf(rotation)).toBe('Start rotation')
    await wait(5000)
    expect(shown(view.host)).toBe(0)
  })

  it('under reduced motion rotation waits for the rotation control', async () => {
    const restore = installMatchMedia(true)
    try {
      await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
      const rotation = control(view.host, 'rotation')!
      expect(nameOf(rotation)).toBe('Start rotation')
      await wait(5000)
      expect(shown(view.host)).toBe(0)
      await click(rotation)
      await wait(1000)
      expect(shown(view.host)).toBe(1)
    } finally {
      restore()
    }
  })

  it('the slides are a polite live region except while rotating', async () => {
    await render(three({ autoPlay: true, autoPlayInterval: 1000 }))
    const viewport = view.host.querySelector('[data-scope="carousel"][data-part="viewport"]')!
    expect(viewport.getAttribute('aria-live')).toBe('off')
    await click(control(view.host, 'rotation'))
    expect(viewport.getAttribute('aria-live')).toBe('polite')
  })
})

describe('Carousel names and labels', () => {
  it('the region is named "Carousel" until aria-label or aria-labelledby names it; blank text keeps the default', async () => {
    const region = () => view.host.querySelector('[role="region"]')!
    await render(three())
    expect(region().getAttribute('aria-label')).toBe('Carousel')
    expect(region().getAttribute('aria-roledescription')).toBe('carousel')
    await render(three({ 'aria-label': 'Customer stories' }))
    expect(region().getAttribute('aria-label')).toBe('Customer stories')
    await render(three({ 'aria-label': '  ' }))
    expect(region().getAttribute('aria-label')).toBe('Carousel')
    await render(three({ 'aria-labelledby': 'heading' }))
    expect(region().getAttribute('aria-labelledby')).toBe('heading')
  })

  it('slides, indicators and controls have default English names', async () => {
    await render(three({ autoPlay: true }))
    expect(slides(view.host).map((slide) => slide.getAttribute('aria-label'))).toEqual([
      'Slide 1 of 3',
      'Slide 2 of 3',
      'Slide 3 of 3',
    ])
    expect(slides(view.host).every((slide) => slide.getAttribute('role') === 'group')).toBe(true)
    expect(slides(view.host)[0]!.getAttribute('aria-roledescription')).toBe('slide')
    expect(indicators(view.host).map(nameOf)).toEqual(['Go to slide 1', 'Go to slide 2', 'Go to slide 3'])
    expect(nameOf(control(view.host, 'prev'))).toBe('Previous slide')
    expect(nameOf(control(view.host, 'next'))).toBe('Next slide')
  })

  it('labels rename every control, slide and announced kind', async () => {
    await render(
      three({
        autoPlay: true,
        labels: {
          previous: 'Zurück',
          next: 'Weiter',
          play: 'Abspielen',
          pause: 'Anhalten',
          slide: '{index}/{count}',
          goToSlide: 'Folie {index}',
          roleCarousel: 'Karussell',
          roleSlide: 'Folie',
        },
      }),
    )
    expect(view.host.querySelector('[role="region"]')!.getAttribute('aria-roledescription')).toBe('Karussell')
    expect(slides(view.host).map((slide) => slide.getAttribute('aria-label'))).toEqual(['1/3', '2/3', '3/3'])
    expect(slides(view.host)[0]!.getAttribute('aria-roledescription')).toBe('Folie')
    expect(indicators(view.host).map(nameOf)).toEqual(['Folie 1', 'Folie 2', 'Folie 3'])
    expect(nameOf(control(view.host, 'prev'))).toBe('Zurück')
    expect(nameOf(control(view.host, 'next'))).toBe('Weiter')
    expect(nameOf(control(view.host, 'rotation'))).toBe('Anhalten')
    await click(control(view.host, 'rotation'))
    expect(nameOf(control(view.host, 'rotation'))).toBe('Abspielen')
  })

  it('labels that are not an object are reported and the defaults stay', async () => {
    await expectDevError(
      () => render(three({ labels: 'Weiter' as never })),
      /^Face UI Carousel: invalid labels "Weiter"; using defaults\.$/,
    )
    expect(nameOf(control(view.host, 'next'))).toBe('Next slide')
  })
})

describe('Carousel native attributes', () => {
  it('native attributes and ref reach the region; style keeps the carousel variables', async () => {
    const ref = createRef<HTMLDivElement>()
    await render(
      <Carousel
        ref={ref}
        id="tour"
        data-testid="tour"
        title="Tour"
        className="custom"
        style={{ color: 'red' }}
        slidesPerView={2}
      >
        <b>A</b>
        <b>B</b>
        <b>C</b>
      </Carousel>,
    )
    const root = view.host.querySelector<HTMLElement>('#tour')!
    expect(ref.current).toBe(root)
    expect(root.getAttribute('data-testid')).toBe('tour')
    expect(root.title).toBe('Tour')
    expect(root.className).toBe('uf-carousel custom')
    expect(root.style.color).toBe('red')
    expect(root.style.getPropertyValue('--face-runtime-carousel-slides-per-view')).toBe('2')
    expect(root.style.getPropertyValue('--face-runtime-carousel-index')).toBe('0')
  })

  it('role and aria-roledescription stay the carousel’s own', async () => {
    const props = { role: 'list', 'aria-roledescription': 'gallery' } as unknown as CarouselProps
    await render(three(props))
    const root = view.host.querySelector('[data-scope="carousel"][data-part="root"]')!
    expect(root.getAttribute('role')).toBe('region')
    expect(root.getAttribute('aria-roledescription')).toBe('carousel')
  })

  it('native pointer and focus handlers run alongside the carousel’s own', async () => {
    const handlers = { onFocus: vi.fn(), onPointerDown: vi.fn(), onClick: vi.fn() }
    await render(three(handlers))
    await focus(control(view.host, 'next')!)
    await click(control(view.host, 'next'))
    expect(handlers.onFocus).toHaveBeenCalledTimes(1)
    expect(handlers.onPointerDown).toHaveBeenCalledTimes(1)
    expect(handlers.onClick).toHaveBeenCalledTimes(1)
    expect(shown(view.host)).toBe(1)
  })
})
