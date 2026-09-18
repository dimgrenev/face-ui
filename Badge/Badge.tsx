/**
 * Badge — status indicator.
 *
 * `<Badge>New</Badge>`
 * `<Badge variant="fill" tone="positive">3</Badge>`
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

export const badgeAnatomy = createAnatomy('badge').parts('root')

export type BadgeVariant = 'fill' | 'outline'
export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'destructive'

export interface BadgeProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Content of the badge: status text, a formatted count or a status icon. */
  children?: ReactNode
  /** Fill or outline treatment. Default: outline. */
  variant?: BadgeVariant
  /** Semantic status tone, independent from the variant. */
  tone?: BadgeTone
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(props, ref) {
    const {
      variant = 'outline',
      tone = 'neutral',
      children,
      className,
      ...rest
    } = props
    return (
      <Text
        ref={ref}
        as="span"
        inset="control"
        membrane
        {...badgeAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-tone={tone}
        className={cn('uf-badge', className)}
        {...rest}
      >
        {children}
      </Text>
    )
  },
)
