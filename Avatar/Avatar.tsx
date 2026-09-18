/**
 * Avatar — user identity display.
 *
 * Shows an image with fallback to initials or custom fallback content.
 * Manages image loading state via the avatar machine.
 *
 * `<Avatar src="/photo.jpg" name="John Doe" />`
 * `<Avatar name="JD" fallback={<Icon />} />`
 */

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { avatarMachine, connectAvatar } from '../assets/machines/avatar.machine'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Image source URL. */
  src?: string
  /** Person's full name, used for initials and the accessible name. */
  name?: string
  /** Text or rich content shown instead of initials while the image is unavailable. */
  fallback?: ReactNode
  /** Delay for a pending image. Missing/failed images show fallback immediately. */
  fallbackDelayMs?: number
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(props, ref) {
    const {
      src = '',
      name = '',
      fallback,
      fallbackDelayMs = 0,
      className,
      ...rest
    } = props
    const imageSource = src.trim()
    const accessibleName = name.trim().replace(/\s+/g, ' ')
    const delay = Number.isFinite(fallbackDelayMs)
      ? Math.max(0, fallbackDelayMs)
      : 0
    const previous = useRef({ src: imageSource, delay })

    const { state, send } = useMachine(avatarMachine, {
      src: imageSource,
      name: accessibleName,
      fallbackDelayMs: delay,
    })
    const api = connectAvatar(state, send)
    useIsomorphicLayoutEffect(() => {
      if (
        previous.current.src !== imageSource ||
        (api.isLoading && previous.current.delay !== delay)
      ) {
        send({ type: 'SRC_CHANGE', src: imageSource })
      }
      previous.current = { src: imageSource, delay }
    }, [imageSource, delay, api.isLoading, send])

    return (
      <span
        ref={ref}
        {...api.getRootProps()}
        role={
          accessibleName || rest['aria-label'] || rest['aria-labelledby']
            ? 'img'
            : undefined
        }
        aria-label={accessibleName || undefined}
        className={cn('uf-avatar', className)}
        {...rest}
      >
        {imageSource ? (
          <img key={imageSource} {...api.getImageProps(imageSource)} alt="" />
        ) : null}
        <span key="fallback" {...api.getFallbackProps()}>
          <span className="uf-avatar__content">{fallback ?? api.initials}</span>
        </span>
      </span>
    )
  },
)
