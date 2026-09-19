import { Carousel, type CarouselLabels } from '../../../Carousel/Carousel'
import { Media } from '../../../Media/Media'

const labels: Partial<CarouselLabels> = { previous: 'Zurück', slide: '{index}/{count}', roleSlide: 'Folie' }
export const carousel = (
  <Carousel
    index={1}
    defaultIndex={0}
    onIndexChange={({ index }) => {
      const position: number = index
      return position
    }}
    slidesPerView={2}
    loop
    autoPlay
    autoPlayInterval={5000}
    labels={labels}
    aria-label="Product tour"
    aria-labelledby="tour-heading"
    id="tour"
    style={{ maxWidth: 640 }}
    onKeyDown={(event) => event.preventDefault()}
    ref={(node) => {
      const element: HTMLDivElement | null = node
      return void element
    }}
  >
    <Media src="/a.jpg" alt="Dashboard" />
    {'A text slide'}
    {[{ __componentName__: 'Media', src: '/b.jpg', alt: 'Reports' }]}
  </Carousel>
)

// @ts-expect-error Slides are children; slides was removed.
export const legacySlides = <Carousel slides={[{ src: '/a.jpg', alt: 'A' }]} />
// @ts-expect-error The region is named by the native aria-label.
export const legacyAriaLabel = <Carousel ariaLabel="Tour" />
// @ts-expect-error A carousel is horizontal; orientation was removed.
export const legacyOrientation = <Carousel orientation="vertical" />
// @ts-expect-error role belongs to the carousel.
export const ownRole = <Carousel role="list" />
// @ts-expect-error Strings live in labels; there are no flat *Label props.
export const flatLabel = <Carousel nextLabel="Next" />
