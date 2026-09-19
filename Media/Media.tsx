/**
 * Media — one image, video or audio source in a sized box.
 *
 * `<Media src="/team.jpg" alt="The team at the offsite" height={240} />`
 * `<Media type="video" src="/tour.mp4" controls><track kind="captions" src="/tour.vtt" /></Media>`
 */

import {
  forwardRef,
  type AudioHTMLAttributes,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactEventHandler,
  type ReactNode,
  type Ref,
  type VideoHTMLAttributes,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useImageStatus } from '../assets/adapters/react/use-image-status'
import { hasSlotContent } from '../assets/slot-content'

const { getPartAttrs: part } = createAnatomy('media').parts(
  'root',
  'element',
  'fallback',
)

export type MediaType = 'image' | 'video' | 'audio'
export type MediaVariant = 'default' | 'circle' | 'thumbnail'
type MediaFit = 'cover' | 'contain' | 'fill' | 'none'

/** Native attributes the box owns (`className`, `style`) or Media declares itself. */
type Owned =
  | 'src'
  | 'width'
  | 'height'
  | 'className'
  | 'style'
  | 'children'
  | 'dangerouslySetInnerHTML'

interface MediaBoxProps {
  /** URL of the source; a missing or empty one counts as a failed load. */
  src: string
  /** Width of the box, pixels or a CSS length; wins over `style.width`. Default: the full available width. */
  width?: number | string
  /** Height of the box, pixels or a CSS length, which the media then fills; wins over `style.height`. Default: the media's own ratio. */
  height?: number | string
  /** Content shown in place of the media while its source is missing or failed to load. */
  fallback?: ReactNode
  /** Membrane spacing around the box, for media aligned with a row of controls. */
  membrane?: boolean
  /** Class of the box around the media; every other native attribute goes to the media element. */
  className?: string
  /** Style of the box around the media; every other native attribute goes to the media element. */
  style?: CSSProperties
}

export interface MediaImageProps
  extends MediaBoxProps,
    Omit<ImgHTMLAttributes<HTMLImageElement>, Owned | 'alt'> {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type?: 'image'
  /** Text that stands for the image to people who cannot see it; `""` marks the image decorative. */
  alt: string
  /** Frame of the image: the system radius (default), a circle cut from its center, or a bordered thumbnail. */
  variant?: MediaVariant
  /** How the media fills a box whose height is set: `cover` crops, `contain` letterboxes. Default: cover for images, contain for video. */
  objectFit?: MediaFit
}

export interface MediaVideoProps
  extends MediaBoxProps,
    Omit<VideoHTMLAttributes<HTMLVideoElement>, Owned | 'onLoad'> {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type: 'video'
  /** How the media fills a box whose height is set: `cover` crops, `contain` letterboxes. Default: cover for images, contain for video. */
  objectFit?: MediaFit
  /** Native `<track>` captions and `<source>` alternatives inside the player. */
  children?: ReactNode
}

export interface MediaAudioProps
  extends MediaBoxProps,
    Omit<AudioHTMLAttributes<HTMLAudioElement>, Owned | 'onLoad'> {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type: 'audio'
  /** Native `<track>` captions and `<source>` alternatives inside the player. */
  children?: ReactNode
}

export type MediaProps = MediaImageProps | MediaVideoProps | MediaAudioProps

/** Every branch's own props at once: what the implementation reads. */
interface AnyMediaProps extends MediaBoxProps {
  type?: MediaType
  alt?: string
  variant?: MediaVariant
  objectFit?: MediaFit
  children?: ReactNode
  hidden?: boolean
  onLoad?: ReactEventHandler<HTMLElement>
  onLoadedData?: ReactEventHandler<HTMLElement>
  onError?: ReactEventHandler<HTMLElement>
}

/**
 * An image, video or audio source in a box sized by `width` and `height`, with `fallback` content
 * when it fails. Native attributes and `ref` go to the `<img>`, `<video>` or `<audio>` element;
 * images decode asynchronously unless `decoding` says otherwise.
 */
export const Media = forwardRef<
  HTMLImageElement | HTMLVideoElement | HTMLAudioElement,
  MediaProps
>(function Media(props: AnyMediaProps, ref) {
  const {
    type = 'image',
    src,
    width,
    height,
    fallback,
    membrane = false,
    className,
    style,
    alt,
    variant = 'default',
    objectFit,
    children,
    hidden,
    onLoad,
    onLoadedData,
    onError,
    ...native
  } = props
  const kind: MediaType = type === 'video' || type === 'audio' ? type : 'image'
  const source = typeof src === 'string' ? src.trim() : ''
  const [status, load] = useImageStatus(source)
  const elementRef = useComposedRefs<HTMLElement>(
    load.ref,
    ref as Ref<HTMLElement>,
  )
  const showFallback = status === 'error' && hasSlotContent(fallback)

  const element = {
    ...native,
    ...part('element'),
    ref: elementRef,
    src: source || undefined,
    hidden: showFallback || hidden,
    style: objectFit ? { objectFit } : undefined,
    onError: composeHandlers(onError, load.onError),
  }
  const Player = kind === 'audio' ? 'audio' : 'video'
  const media =
    kind === 'image' ? (
      <img
        decoding="async"
        {...element}
        key={source}
        alt={alt}
        className="uf-image"
        onLoad={composeHandlers(onLoad, load.onLoad)}
      />
    ) : (
      <Player
        {...element}
        key={source}
        onLoadedData={composeHandlers(onLoadedData, load.onLoad)}
      >
        {children}
      </Player>
    )

  const boxWidth = width ?? style?.width
  return (
    <Membrane
      enabled={membrane}
      as="div"
      fullWidth={boxWidth == null || boxWidth === '100%'}
      className="uf-mediaMembrane"
    >
      <div
        {...part('root')}
        data-type={kind}
        data-variant={kind === 'image' ? variant : undefined}
        data-state={status}
        className={cn('uf-media', className)}
        style={{
          ...style,
          ...(width != null && { width }),
          ...(height != null && { height }),
        }}
      >
        {media}
        {showFallback && <div {...part('fallback')}>{fallback}</div>}
      </div>
    </Membrane>
  )
})
