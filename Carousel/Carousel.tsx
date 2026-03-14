/**
 * Carousel — multi-slide content display.
 *
 * Uses core carousel machine + Face UI primitives:
 * - Button for nav and indicators
 * - Card/Text for primitive slide content fallback
 */

import { forwardRef, Children, isValidElement, type CSSProperties, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { carouselMachine, connectCarousel } from '../assets/machines/carousel.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarouselProps {
  /** Slide elements. Each child becomes one slide. */
  children?: ReactNode | ReactNode[]
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
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  function Carousel(props, ref) {
    const {
      children,
      loop = false,
      autoPlay = false,
      autoPlayInterval = 3000,
      orientation = 'horizontal',
      slidesPerView = 1,
      index,
      defaultIndex = 0,
      onIndexChange,
      className,
    } = props

    const providedSlides = Children.toArray(children)
    const slides = providedSlides.length > 0
      ? providedSlides
      : ['Build faster', 'Compose interfaces', 'Ship clean UI']
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
      '--uf-carousel-slides-per-view': String(clampedSlidesPerView),
    } as CSSProperties

    const renderSlide = (slide: ReactNode, slideIndex: number) => {
      if (isValidElement(slide)) return slide
      return (
        <Card membrane={false} className="uf-carousel-slideCard">
          <div className="uf-carousel-slideCardBody">
            <Text as="div" membrane={false} className="uf-carousel-slideTitle">
              Slide {slideIndex + 1}
            </Text>
            <Text as="div" membrane={false} variant="muted">
              {String(slide)}
            </Text>
          </div>
        </Card>
      )
    }

    return (
      <div ref={ref} {...api.getRootProps()} style={rootStyle} className={cn('uf-carousel', className)}>
        <span className="uf-membrane uf-membrane--full">
          <div {...api.getViewportProps()}>
            <div className="uf-carousel-track" style={{ transform: trackTransform }}>
              {slides.map((slide, i) => (
                <div key={i} {...api.getSlideProps(i)}>
                  {renderSlide(slide, i)}
                </div>
              ))}
            </div>
            <div className="uf-carousel-controls">
              <Button
                {...api.getPrevProps()}
                icon={<Icon name="left" size={16} />}
                iconOnly
                fullWidth={false}
                variant="ghost"
                className="uf-carousel-nav uf-carousel-navPrev"
              />
              <div {...api.getIndicatorProps()} className="uf-carousel-indicators">
                {slides.map((_, i) => (
                  <Button
                    key={i}
                    {...api.getIndicatorItemProps(i)}
                    icon={<span className="uf-carousel-indicatorDot" aria-hidden="true" />}
                    iconOnly
                    fullWidth={false}
                    variant="ghost"
                    className="uf-carousel-indicatorButton"
                  />
                ))}
              </div>
              <Button
                {...api.getNextProps()}
                icon={<Icon name="right" size={16} />}
                iconOnly
                fullWidth={false}
                variant="ghost"
                className="uf-carousel-nav uf-carousel-navNext"
              />
            </div>
          </div>
        </span>
      </div>
    )
  },
)
