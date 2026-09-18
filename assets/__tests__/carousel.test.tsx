import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Carousel } from '../../Carousel/Carousel'
import { libraryCss, mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Carousel advances in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Carousel defaultIndex={0}>
          <div>Slide A</div>
          <div>Slide B</div>
          <div>Slide C</div>
        </Carousel>,
      )
    })

    const slideA = container.querySelector(
      '[data-part="slide"][data-index="0"]',
    ) as HTMLElement | null
    const slideB = container.querySelector(
      '[data-part="slide"][data-index="1"]',
    ) as HTMLElement | null
    const nextButton = container.querySelector(
      '[data-scope="button"][data-part="next"]',
    ) as HTMLButtonElement | null
    const inactiveIndicator = container.querySelector(
      '[data-scope="button"][data-part="indicator-item"][data-state="inactive"] svg[data-icon="radio-off"]',
    )

    expect(slideA?.getAttribute('data-current')).toBe('')
    expect(slideB?.hasAttribute('data-current')).toBe(false)
    expect(nextButton).not.toBeNull()
    expect(inactiveIndicator).not.toBeNull()

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(slideA?.hasAttribute('data-current')).toBe(false)
    expect(slideB?.getAttribute('data-current')).toBe('')
  })

  it('Carousel data slides use responsive Media and button-scoped controls', async () => {
    await act(async () => {
      root.render(
        <Carousel
          ariaLabel="Office gallery"
          defaultIndex={0}
          slides={[
            {
              src: '/assets/media/examples/office-core/lobby-day.webp',
              alt: 'Office lobby',
            },
            {
              src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
              alt: 'Glass-block lobby',
            },
          ]}
        />,
      )
    })

    const rootNode = container.querySelector<HTMLElement>(
      '[data-scope="carousel"]',
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-scope="carousel"][data-part="viewport"]',
    )
    const controls = container.querySelector<HTMLElement>(
      '.uf-carousel-controls',
    )
    const mediaSlide = container.querySelector<HTMLElement>(
      '[data-scope="media"].uf-carousel-slideMedia',
    )
    const mediaMembrane = mediaSlide?.parentElement
    const prevSlot = container.querySelector<HTMLElement>(
      '.uf-carousel-navSlot--prev',
    )
    const nextSlot = container.querySelector<HTMLElement>(
      '.uf-carousel-navSlot--next',
    )
    const indicators = container.querySelector<HTMLElement>(
      '.uf-carousel-indicators',
    )
    const prevButton = container.querySelector<HTMLButtonElement>(
      '[data-scope="button"][data-part="prev"]',
    )
    const nextButton = container.querySelector<HTMLButtonElement>(
      '[data-scope="button"][data-part="next"]',
    )
    const indicatorButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-scope="button"][data-part="indicator-item"]',
      ),
    )
    const mediaImage = mediaSlide?.querySelector<HTMLImageElement>('img')
    const activeIndicator = container.querySelector<HTMLElement>(
      '[data-scope="button"][data-part="indicator-item"][data-state="active"] svg[data-icon="radio-on"]',
    )
    const inactiveIndicator = container.querySelector<HTMLElement>(
      '[data-scope="button"][data-part="indicator-item"][data-state="inactive"] svg[data-icon="radio-off"]',
    )

    expect(rootNode).not.toBeNull()
    expect(rootNode?.getAttribute('aria-label')).toBe('Office gallery')
    expect(viewport).not.toBeNull()
    expect(controls).not.toBeNull()
    expect(viewport?.nextElementSibling).toBe(controls)
    expect(mediaSlide).not.toBeNull()
    expect(mediaImage?.getAttribute('src')).toBe(
      '/assets/media/examples/office-core/lobby-day.webp',
    )
    expect(mediaMembrane?.classList.contains('uf-membrane')).toBe(true)
    expect(mediaMembrane?.classList.contains('uf-mediaMembrane')).toBe(true)
    expect(prevSlot?.contains(prevButton)).toBe(true)
    expect(nextSlot?.contains(nextButton)).toBe(true)
    expect(controls?.contains(indicators)).toBe(true)
    expect(prevButton?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
    expect(nextButton).not.toBeNull()
    expect(nextButton?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
    expect(indicatorButtons.length).toBeGreaterThan(0)
    expect(
      indicatorButtons.every((button) =>
        button.parentElement?.classList.contains('uf-membrane'),
      ),
    ).toBe(true)
    expect(activeIndicator).not.toBeNull()
    expect(inactiveIndicator).not.toBeNull()

    const componentStyles = libraryCss()
    expect(componentStyles).toContain('background: transparent;')
    expect(componentStyles).toContain('border: none;')
    expect(componentStyles).toContain('.uf-carousel-controls')
    expect(componentStyles).toContain(
      'grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);',
    )
    expect(componentStyles).toContain('.uf-carousel-navSlot--prev')
    expect(componentStyles).toContain('.uf-carousel-navSlot--next')
    expect(componentStyles).toContain('position: static;')
    expect(componentStyles).toContain(
      'max-width: calc(100% / var(--face-runtime-carousel-slides-per-view, 1));',
    )
    expect(componentStyles).toContain('.uf-carousel-indicators')
    expect(componentStyles).toContain('gap: 0;')
  })

  it('Carousel does not ship product-specific fallback slides', async () => {
    await act(async () => {
      root.render(<Carousel />)
    })

    expect(container.querySelector('[data-scope="media"]')).toBeNull()
    expect(container.querySelectorAll('[data-part="slide"]')).toHaveLength(0)
    expect(
      container.querySelectorAll('[data-part="indicator-item"]'),
    ).toHaveLength(0)
  })

  it('Carousel keeps slides outside the visible window inert and stops at the last window', async () => {
    await act(async () => {
      root.render(
        <Carousel ariaLabel="Multiple slides" slidesPerView={2}>
          <button>Slide one</button>
          <button>Slide two</button>
          <button>Slide three</button>
        </Carousel>,
      )
    })
    const inert = () =>
      [...container.querySelectorAll('[data-part="slide"]')].map((slide) =>
        slide.hasAttribute('inert'),
      )
    const next = container.querySelector<HTMLButtonElement>(
      '[data-scope="button"][data-part="next"]',
    )!
    expect(inert()).toEqual([false, false, true])
    await act(async () => next.click())
    expect(inert()).toEqual([true, false, false])
    expect(next.disabled).toBe(true)
  })
})
