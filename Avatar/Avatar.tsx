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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarProps {
  /** Image source URL. */
  src?: string
  /** User name (used for initials fallback and alt text). */
  name?: string
  /** Custom fallback content when image is unavailable. */
  fallback?: ReactNode
  /** Delay in ms before showing fallback (gives image time to load). */
  fallbackDelayMs?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(props, ref) {
    const { src = '', name = '', fallback, fallbackDelayMs = 0, className } = props

    const { state, send } = useMachine(avatarMachine, {
      src,
      name,
      fallbackDelayMs,
    })
    const api = connectAvatar(state, send)

    return (
      <span ref={ref} {...api.getRootProps()} className={cn('uf-avatar', className)}>
        <img {...api.getImageProps()} />
        <span {...api.getFallbackProps()}>
          {fallback ?? api.initials}
        </span>
      </span>
    )
  },
)
