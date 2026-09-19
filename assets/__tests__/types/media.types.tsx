import { createRef } from 'react'
import { Media, type MediaProps } from '../../../Media/Media'

const player = createRef<HTMLVideoElement>()
export const image = (
  <Media
    src="/a.jpg"
    alt="Dashboard"
    variant="circle"
    objectFit="contain"
    width={96}
    height="6rem"
    fallback={<span>Unavailable</span>}
    membrane
    className="hero"
    style={{ maxWidth: 320 }}
    loading="lazy"
    decoding="sync"
    srcSet="/a@2x.jpg 2x"
    onLoad={(event) => {
      const target: EventTarget = event.currentTarget
      return target
    }}
    onError={(event) => event.preventDefault()}
  />
)
export const decorative = <Media src="/a.jpg" alt="" />
export const video = (
  <Media
    type="video"
    ref={player}
    src="/a.mp4"
    poster="/a.jpg"
    controls
    autoPlay
    muted
    loop
    playsInline
    objectFit="cover"
    aria-label="Product tour"
    onLoadedData={(event) => event.currentTarget}
  >
    <track kind="captions" src="/a.vtt" />
  </Media>
)
export const audio = <Media type="audio" src="/a.mp3" controls preload="none" />
export const props: MediaProps = { type: 'audio', src: '/a.mp3' }

// @ts-expect-error An image needs alt; alt="" marks a decorative one.
export const missingAlt = <Media src="/a.jpg" />
// @ts-expect-error The native aria-label replaces ariaLabel.
export const legacyAriaLabel = <Media src="/a.jpg" alt="" ariaLabel="Photo" />
// @ts-expect-error Player attributes belong to video and audio (checked once type is written out).
export const imageControls = <Media type="image" src="/a.jpg" alt="" controls />
// @ts-expect-error variant frames images only.
export const videoVariant = <Media type="video" src="/a.mp4" variant="circle" />
// @ts-expect-error Media elements fire no load event; use onLoadedData.
export const videoOnLoad = <Media type="video" src="/a.mp4" onLoad={() => {}} />
// @ts-expect-error Audio has no picture to fit.
export const audioFit = <Media type="audio" src="/a.mp3" objectFit="cover" />
// @ts-expect-error rounded was folded into the default frame.
export const rounded = <Media src="/a.jpg" alt="" variant="rounded" />
// @ts-expect-error An image takes no children (checked once type is written out).
export const imageChildren = <Media type="image" src="/a.jpg" alt="">caption</Media>
