import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Carousel, type CarouselProps } from '../../../../Carousel/Carousel'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '16px',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: number[] = []
// Every render mounts a fresh carousel, so its default* props apply.
let generation = 0

/** Three slides, each holding a link, between two buttons; every proposed index is recorded. */
const renderCarousel = (
  props: Pick<CarouselProps, 'slidesPerView' | 'loop' | 'autoPlay' | 'autoPlayInterval' | 'defaultIndex'> = {},
  options: { direction?: 'ltr' | 'rtl' } = {},
) => {
  events.length = 0
  document.documentElement.dir = options.direction ?? 'ltr'
  flushSync(() =>
    root.render(
      <StrictMode>
        <button id="before" tabIndex={0}>
          Before
        </button>
        <div style={{ width: 480, marginBlock: 16 }}>
          <Carousel
            key={generation++}
            aria-label="Tour"
            {...props}
            onIndexChange={({ index }) => events.push(index)}
          >
            {['One', 'Two', 'Three'].map((name, index) => (
              <div
                key={name}
                data-slide={name}
                style={{ height: 120, background: ['#fde2e2', '#e2f5e2', '#e2e8fd'][index] }}
              >
                {/* WebKit leaves links without an explicit tabIndex out of the Tab order. */}
                <a href={`#${name}`} tabIndex={0}>
                  {name}
                </a>
              </div>
            ))}
          </Carousel>
        </div>
        <button id="after" tabIndex={0}>
          After
        </button>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderCarousel, carouselEvents: events })
export type Hooks = { renderCarousel: typeof renderCarousel }
renderCarousel()
