/**
 * Media — unified image, video, and audio renderer.
 *
 * `<Media type="image" src="/photo.jpg" alt="A photo" />`
 * `<Media type="video" src="/clip.mp4" controls />`
 * `<Media type="audio" src="/track.mp3" controls />`
 */

import { forwardRef, useState, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const mediaAnatomy = createAnatomy('media').parts(
  'root',
  'element',
  'fallback',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaType = 'image' | 'video' | 'audio'
export type MediaVariant = 'default' | 'rounded' | 'circle' | 'thumbnail'
export type MediaLoading = 'eager' | 'lazy'
export type MediaDecoding = 'async' | 'sync' | 'auto'

export interface MediaProps {
  /** Media type. Defaults to "image". */
  type?: MediaType
  /** Source URL. */
  src: string
  /** Alt text (for images). */
  alt?: string
  /** components API compatibility: image variant. */
  variant?: MediaVariant
  /** components API compatibility aliases for image loading hints. */
  lazy?: boolean
  loading?: MediaLoading
  decoding?: MediaDecoding
  /** Poster image (for video). */
  poster?: string
  /** Show native controls (for video/audio). */
  controls?: boolean
  /** Auto-play media. */
  autoPlay?: boolean
  /** Loop playback. */
  loop?: boolean
  /** Start muted. */
  muted?: boolean
  /** Explicit width. */
  width?: number | string
  /** Explicit height. */
  height?: number | string
  /** CSS object-fit for images/video. */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
  /** Fallback content shown on error. */
  fallback?: ReactNode
  /** Called when the media fails to load. */
  onError?: () => void
  /** Called when the media finishes loading. */
  onLoad?: () => void
  /** Additional class name on the root element. */
  className?: string
  /** Wrapper-level compatibility attrs from components API. */
  id?: string
  role?: string
  /** Accessible label for the wrapper role. Sets aria-label. */
  ariaLabel?: string
  /** DOM aria-label alias for the wrapper role. */
  'aria-label'?: string
  title?: string
  tabIndex?: number
  style?: React.CSSProperties
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Media = forwardRef<HTMLDivElement, MediaProps>(
  function Media(props, ref) {
    const {
      type = 'image',
      src,
      alt = '',
      variant = 'default',
      lazy = false,
      loading,
      decoding,
      poster,
      controls,
      autoPlay,
      loop,
      muted,
      width,
      height,
      objectFit,
      fallback,
      onError,
      onLoad,
      className,
      id,
      role,
      ariaLabel,
      'aria-label': ariaLabelAttribute,
      title,
      tabIndex,
      style,
    } = props

    const [hasError, setHasError] = useState(false)

    const handleError = () => {
      setHasError(true)
      onError?.()
    }

    const sizeStyle = {
      ...(objectFit ? { objectFit } : {}),
      ...(type === 'image'
        ? {
            width: '100%',
            height: height != null ? '100%' : 'auto',
            display: 'block',
          }
        : {}),
    }

    const wrapperStyle: React.CSSProperties = {
      ...(style || {}),
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
    }

    const renderElement = () => {
      if (hasError && fallback) {
        return (
          <div {...mediaAnatomy.getPartAttrs('fallback')}>
            {fallback}
          </div>
        )
      }

      switch (type) {
        case 'video':
          return (
            <video
              {...mediaAnatomy.getPartAttrs('element')}
              src={src}
              poster={poster}
              controls={controls}
              autoPlay={autoPlay}
              loop={loop}
              muted={muted}
              style={sizeStyle}
              onError={handleError}
              onLoadedData={onLoad}
              title={title}
            />
          )

        case 'audio':
          return (
            <audio
              {...mediaAnatomy.getPartAttrs('element')}
              src={src}
              controls={controls}
              autoPlay={autoPlay}
              loop={loop}
              muted={muted}
              onError={handleError}
              onLoadedData={onLoad}
              title={title}
            />
          )

        case 'image':
        default:
          return (
            <img
              {...mediaAnatomy.getPartAttrs('element')}
              src={src}
              alt={alt}
              style={sizeStyle}
              onError={handleError}
              onLoad={onLoad}
              loading={(loading as any) ?? (lazy ? 'lazy' : undefined)}
              decoding={(decoding as any) ?? 'async'}
              className={cn('uf-image', `uf-image--${variant}`)}
              title={title}
            />
          )
      }
    }

    return (
      <div
        ref={ref}
        {...mediaAnatomy.getPartAttrs('root')}
        data-type={type}
        data-error={hasError || undefined}
        className={cn('uf-media', className)}
        id={id}
        role={role}
        aria-label={ariaLabelAttribute ?? ariaLabel}
        title={title}
        tabIndex={tabIndex}
        style={wrapperStyle}
      >
        {renderElement()}
      </div>
    )
  },
)
