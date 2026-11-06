/**
 * Media — one image, video or audio source in a sized box.
 *
 * `<Media src="/team.jpg" alt="The team at the offsite" height={240} />`
 * `<Media type="video" src="/tour.mp4" controls><track kind="captions" src="/tour.vtt" /></Media>`
 */

import {
  forwardRef,
  useMemo,
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
import {
  useImageStatus,
  type ImageStatusProps,
} from '../assets/adapters/react/use-image-status'
import { invalidProp, readCssSize } from '../assets/runtime/props'
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
  | 'hidden'
  | 'children'
  | 'dangerouslySetInnerHTML'

interface MediaBoxProps {
  /** URL of the source; a missing or empty one counts as a failed load. */
  src: string
  /** Width of the box: a number or numeric string is pixels, or pass a CSS length. Wins over `style.width`; default: full available width. */
  width?: number | string
  /** Height of the box: a number or numeric string is pixels, or pass a CSS length. Wins over `style.height`; default: the media's own ratio. */
  height?: number | string
  /** Content shown in place of the media while its source is missing or failed to load. */
  fallback?: ReactNode
  /** Membrane spacing around the box, for media aligned with a row of controls. */
  membrane?: boolean
  /** Class of the box around the media. */
  className?: string
  /** Style of the box around the media. */
  style?: CSSProperties
  /** Hide the entire media box, including its fallback and outer spacing. */
  hidden?: boolean
}

export interface MediaImageProps
  extends
    MediaBoxProps,
    Omit<
      ImgHTMLAttributes<HTMLImageElement>,
      Owned | 'alt' | 'loading' | 'decoding'
    > {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type?: 'image'
  /** Text that stands for the image to people who cannot see it; `""` marks the image decorative. */
  alt: string
  /** Frame of the image: the system radius (default), a circle cut from its center, or a bordered thumbnail. */
  variant?: MediaVariant
  /** How the media fills a box whose height is set: `cover` crops, `contain` letterboxes. Default: cover for images, contain for video. */
  objectFit?: MediaFit
  /** `lazy` waits to fetch the image until it nears the viewport; `eager` (default) fetches it at once. */
  loading?: 'eager' | 'lazy'
  /** `async` (default) decodes the image off the main thread; `sync` shows it in the same frame as the content around it. */
  decoding?: 'async' | 'sync' | 'auto'
}

/** What video and audio players share. */
interface MediaPlayerProps extends MediaBoxProps {
  /** Shows the browser's playback controls; without them only `autoPlay` or script can play the media. */
  controls?: boolean
  /** Starts playback as soon as it can; most browsers block it unless the media is `muted`. */
  autoPlay?: boolean
  /** Starts playback over from the beginning when it reaches the end. */
  loop?: boolean
  /** Starts with the sound off. */
  muted?: boolean
  /** Names the player for assistive technology. */
  'aria-label'?: string
  /** Native `<track>` elements for captions, subtitles, descriptions or chapters. */
  children?: ReactNode
}

export interface MediaVideoProps
  extends
    MediaPlayerProps,
    Omit<
      VideoHTMLAttributes<HTMLVideoElement>,
      Owned | 'onLoad' | keyof MediaPlayerProps | 'poster' | 'playsInline'
    > {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type: 'video'
  /** How the media fills a box whose height is set: `cover` crops, `contain` letterboxes. Default: cover for images, contain for video. */
  objectFit?: MediaFit
  /** URL of the image shown until playback starts. */
  poster?: string
  /** Plays inside the page on iPhone instead of switching to fullscreen, as a background video needs. */
  playsInline?: boolean
}

export interface MediaAudioProps
  extends
    MediaPlayerProps,
    Omit<
      AudioHTMLAttributes<HTMLAudioElement>,
      Owned | 'onLoad' | keyof MediaPlayerProps
    > {
  /** Element that renders the source: `image` (default), `video` or `audio`; the other props follow it. */
  type: 'audio'
}

export type MediaProps = MediaImageProps | MediaVideoProps | MediaAudioProps

/** Every branch's own props at once: what the implementation reads. */
interface AnyMediaProps extends MediaBoxProps {
  type?: MediaType
  alt?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  role?: string
  variant?: MediaVariant
  objectFit?: MediaFit
  decoding?: MediaImageProps['decoding']
  children?: ReactNode
  hidden?: boolean
  onLoad?: ReactEventHandler<HTMLElement>
  onLoadedMetadata?: ReactEventHandler<HTMLElement>
  onSuspend?: ReactEventHandler<HTMLElement>
  onError?: ReactEventHandler<HTMLElement>
}

/**
 * Settles a player that finished before React attached (server markup, a cached source): an
 * error, or metadata in hand or fetching held off, reads as the matching event would.
 */
const readPlayer = (load: ImageStatusProps) => (node: HTMLElement | null) => {
  if (!node || !('readyState' in node)) return
  const player = node as HTMLMediaElement
  if (player.error) load.onError()
  else if (
    player.readyState >= player.HAVE_METADATA ||
    player.networkState === player.NETWORK_IDLE
  )
    load.onLoad()
}

/**
 * An image, video or audio source in a box sized by `width` and `height`, with `fallback` content
 * when it fails. Native attributes and `ref` go to the `<img>`, `<video>` or `<audio>` element;
 * `hidden` hides the whole box and its fallback.
 * The box's `data-state` is `loading`, then `loaded` or `error`; a player counts as loaded once its
 * metadata arrives or the browser holds off fetching until playback (`preload="none"`).
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
    decoding = 'async',
    children,
    hidden,
    onLoad,
    onLoadedMetadata,
    onSuspend,
    onError,
    ...native
  } = props
  const kind: MediaType = type === 'video' || type === 'audio' ? type : 'image'
  // Decidable here, unlike a field's: `<img>` is not a labelable element, so nothing outside
  // the component can name it — every naming path is a prop, and `alt` is the one HTML asks
  // for. An image named by ARIA instead, or marked presentational, is already answered for.
  const named =
    typeof alt === 'string' ||
    typeof native['aria-label'] === 'string' ||
    typeof native['aria-labelledby'] === 'string' ||
    native.role === 'presentation' ||
    native.role === 'none'
  if (kind === 'image' && !named)
    invalidProp(
      'Media',
      'alt',
      alt,
      'the image has no text alternative (alt="" marks a decorative one)',
    )
  const source = typeof src === 'string' ? src.trim() : ''
  const [status, load] = useImageStatus(source)
  const settled = useMemo(
    () => (kind === 'image' ? load.ref : readPlayer(load)),
    [kind, load],
  )
  const elementRef = useComposedRefs<HTMLElement>(
    settled,
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
        {...element}
        key={source}
        alt={alt}
        decoding={decoding}
        className="uf-image"
        onLoad={composeHandlers(onLoad, load.onLoad)}
      />
    ) : (
      <Player
        {...element}
        key={source}
        onLoadedMetadata={composeHandlers(onLoadedMetadata, load.onLoad)}
        onSuspend={composeHandlers(onSuspend, load.onLoad)}
      >
        {children}
      </Player>
    )

  const boxWidth = readCssSize('Media', 'width', width)
  const boxHeight = readCssSize('Media', 'height', height)
  const effectiveWidth = boxWidth ?? style?.width
  return (
    <Membrane
      enabled={membrane}
      as="div"
      hidden={hidden}
      fullWidth={effectiveWidth == null || effectiveWidth === '100%'}
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
          ...(boxWidth !== undefined && { width: boxWidth }),
          ...(boxHeight !== undefined && { height: boxHeight }),
        }}
      >
        {media}
        {showFallback && <div {...part('fallback')}>{fallback}</div>}
      </div>
    </Membrane>
  )
})
