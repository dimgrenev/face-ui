/**
 * Avatar — user identity display.
 *
 * Shows an image with fallback to initials or custom fallback content.
 * Manages image loading state via the avatar machine.
 *
 * `<Avatar src="/photo.jpg" name="John Doe" />`
 * `<Avatar name="JD" fallback={<Icon />} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { avatarMachine, connectAvatar } from '../assets/machines/avatar.machine'
import { cn } from '../assets/utils'
import { Icon, type IconName } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarProps {
  /** Image source URL. */
  src?: string
  /** User name (used for initials fallback and alt text). */
  name?: string
  /** Icon content shown when no image is available. */
  icon?: IconName | ReactNode
  /** Custom fallback content when image is unavailable. */
  fallback?: ReactNode
  /** Custom media content. Rendered inside the clipped avatar circle when no image is available. */
  children?: ReactNode
  /** Delay in ms before showing fallback (gives image time to load). */
  fallbackDelayMs?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(props, ref) {
    const { src = '', name = '', icon, fallback, children, fallbackDelayMs = 0, className } = props
    const hasImageSource = src.trim().length > 0

    const { state, send } = useMachine(avatarMachine, {
      src,
      name,
      fallbackDelayMs,
    })
    const api = connectAvatar(state, send)
    const iconNode = typeof icon === 'string'
      ? <Icon name={icon} />
      : icon
    const fallbackContent = children ?? iconNode ?? fallback ?? api.initials

    return (
      <span ref={ref} {...api.getRootProps()} className={cn('uf-avatar', className)}>
        {hasImageSource ? <img key="image" {...api.getImageProps()} /> : null}
        <span key="fallback" {...api.getFallbackProps()}>
          <span className="uf-avatar__content">
            {fallbackContent}
          </span>
        </span>
      </span>
    )
  },
)
