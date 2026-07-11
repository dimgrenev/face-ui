/**
 * Carousel — multi-slide content display.
 *
 * Uses core carousel machine + Face UI primitives:
 * - Button for nav and indicators
 * - Media for fallback slide content
 */

import { forwardRef, Children, isValidElement, type CSSProperties, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { carouselMachine, connectCarousel } from '../assets/machines/carousel.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Media } from '../Media/Media'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarouselProps {
  /** Slide elements. Each child becomes one slide. */
  children?: ReactNode | ReactNode[]
  /** Data-driven image slides. Composed children take precedence when both are provided. */
  slides?: CarouselMediaSlide[]
  /** Enable infinite looping. */
  loop?: boolean
  /** Enable automatic slide advancement. */
  autoPlay?: boolean
  /** Interval in ms between auto-play transitions. */
  autoPlayInterval?: number
  /** Slide orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Number of slides visible at once. */
  slidesPerView?: number
  /** Controlled current slide index. */
  index?: number
  /** Uncontrolled initial slide index. */
  defaultIndex?: number
  /** Callback when the active slide changes. */
  onIndexChange?: (details: { index: number }) => void
  /** Accessible name for the carousel region. */
  ariaLabel?: string
  className?: string
}

export interface CarouselMediaSlide {
  src: string
  alt?: string
}

type CarouselSlideInput = ReactNode | CarouselMediaSlide

function isCarouselMediaSlide(slide: CarouselSlideInput): slide is CarouselMediaSlide {
  if (slide == null || typeof slide !== 'object' || isValidElement(slide)) return false
  return 'src' in slide && typeof (slide as unknown as { src?: unknown }).src === 'string'
}

function preserveButtonScope<T extends { 'data-scope'?: string }>(props: T): Omit<T, 'data-scope'> {
  const { 'data-scope': _scope, ...rest } = props
  return rest
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  function Carousel(props, ref) {
    const {
      children,
      slides: mediaSlides = [],
      loop = false,
      autoPlay = false,
      autoPlayInterval = 3000,
      orientation = 'horizontal',
      slidesPerView = 1,
      index,
      defaultIndex = 0,
      onIndexChange,
      ariaLabel = 'Carousel',
      className,
    } = props

    const providedSlides = Children.toArray(children)
    const slides: CarouselSlideInput[] = providedSlides.length > 0
      ? providedSlides as CarouselSlideInput[]
      : Array.isArray(mediaSlides) ? mediaSlides : []
    const total = slides.length
    const clampedSlidesPerView = Math.max(1, Math.floor(slidesPerView))
    const machineIndex = useControllableMachineProp(
      typeof index === 'number' ? index : undefined,
      typeof defaultIndex === 'number' ? defaultIndex : 0,
    )

    const { state, send } = useMachine(carouselMachine, {
      index: machineIndex,
      total,
      loop,
      autoPlay,
      autoPlayInterval,
      orientation,
      slidesPerView: clampedSlidesPerView,
      onIndexChange: onIndexChange ?? null,
    })
    const api = connectCarousel(state, send)

    const axis = orientation === 'vertical' ? 'Y' : 'X'
    const stepPercent = 100 / clampedSlidesPerView
    const trackTransform = `translate${axis}(-${api.index * stepPercent}%)`
    const rootStyle = {
      '--face-runtime-carousel-slides-per-view': String(clampedSlidesPerView),
    } as CSSProperties

    const renderSlide = (slide: CarouselSlideInput, slideIndex: number) => {
      if (isValidElement(slide)) return slide
      if (isCarouselMediaSlide(slide)) {
        const mediaSlide = slide
        return (
          <Media
            src={mediaSlide.src}
            alt={mediaSlide.alt ?? `Slide ${slideIndex + 1}`}
            objectFit="cover"
            width="100%"
            membrane
            className="uf-carousel-slideMedia"
          />
        )
      }
      return (
        <Media
          src={String(slide)}
          alt={`Slide ${slideIndex + 1}`}
          objectFit="cover"
          width="100%"
          membrane
          className="uf-carousel-slideMedia"
        />
      )
    }

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        aria-label={ariaLabel}
        style={rootStyle}
        className={cn('uf-carousel', className)}
      >
        <div {...api.getViewportProps()}>
          <div className="uf-carousel-track" style={{ transform: trackTransform }}>
            {slides.map((slide, i) => (
              <div key={i} {...api.getSlideProps(i)}>
                {renderSlide(slide, i)}
              </div>
            ))}
          </div>
        </div>
        <div className="uf-carousel-controls">
          <div className="uf-carousel-navSlot uf-carousel-navSlot--prev">
            <Button
              {...preserveButtonScope(api.getPrevProps())}
              icon="arrow-left"
              iconOnly
              fullWidth={false}
              className="uf-carousel-nav uf-carousel-navPrev"
            />
          </div>
          <div {...api.getIndicatorProps()} className="uf-carousel-indicators">
            {slides.map((_, i) => (
              <Button
                key={i}
                {...preserveButtonScope(api.getIndicatorItemProps(i))}
                icon={api.index === i ? 'radio-on' : 'radio-off'}
                iconOnly
                fullWidth={false}
                className="uf-carousel-indicatorButton"
              />
            ))}
          </div>
          <div className="uf-carousel-navSlot uf-carousel-navSlot--next">
            <Button
              {...preserveButtonScope(api.getNextProps())}
              icon="arrow-right"
              iconOnly
              fullWidth={false}
              className="uf-carousel-nav uf-carousel-navNext"
            />
          </div>
        </div>
      </div>
    )
  },
)
