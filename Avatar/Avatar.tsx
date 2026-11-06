/** Avatar — a person's image, with initials or custom content until it loads. */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { splitGraphemes } from 'unicode-segmenter/grapheme'
import { useImageStatus } from '../assets/adapters/react/use-image-status'
import { readNumber } from '../assets/runtime/props'
import { cn } from '../assets/utils'

export interface AvatarProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Image URL; the fallback stands in while it is missing, pending or broken. */
  src?: string
  /** The person's full name: the accessible name, and the initials when `fallback` is absent. */
  name?: string
  /** Text or rich content shown instead of initials while the image is unavailable. */
  fallback?: ReactNode
  /** Milliseconds a pending image waits before the fallback shows; a missing or broken image shows it at once. */
  fallbackDelay?: number
}

/** The longest delay a timer can wait. */
const MAX_DELAY = 2_147_483_647

/** A string prop's trimmed text; any other value reads as absent. */
const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** First grapheme of the first and last words, upper-cased by the same rules on server and client, independent of ICU. */
function initials(name: string) {
  const words = name.split(' ')
  return (words.length > 2 ? [words[0]!, words[words.length - 1]!] : words)
    .map((word) => splitGraphemes(word).next().value ?? '')
    .join('')
    .toUpperCase()
}

/** A person's image with initials or custom fallback content while it is missing, pending or broken. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, name, fallback, fallbackDelay = 0, className, ...rest },
  ref,
) {
  const source = textOf(src)
  const label = textOf(name).replace(/\s+/g, ' ')
  const [status, image] = useImageStatus(source, {
    delay: readNumber('Avatar', 'fallbackDelay', fallbackDelay, 0, { min: 0, max: MAX_DELAY }),
  })

  return (
    <span
      ref={ref}
      data-scope="avatar"
      data-part="root"
      data-state={status}
      role={label || rest['aria-label'] || rest['aria-labelledby'] ? 'img' : undefined}
      aria-label={label || undefined}
      className={cn('uf-avatar', className)}
      {...rest}
    >
      {source ? (
        <img
          key={source}
          {...image}
          data-scope="avatar"
          data-part="image"
          src={source}
          alt=""
          hidden={status !== 'loaded'}
        />
      ) : null}
      <span
        data-scope="avatar"
        data-part="fallback"
        hidden={status === 'idle' || status === 'loaded'}
      >
        <span className="uf-avatar__content">{fallback ?? initials(label)}</span>
      </span>
    </span>
  )
})
