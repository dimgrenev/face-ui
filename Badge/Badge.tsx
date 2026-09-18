/**
 * Badge — status indicator.
 *
 * `<Badge text="New" />`
 * `<Badge text="3" appearance="outline" />`
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

export const badgeAnatomy = createAnatomy('badge').parts('root')

export type BadgeAppearance = 'fill' | 'outline'
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
  /** Plain status text. Rich children take precedence when provided. */
  text?: string
  /** Fill or outline treatment. */
  appearance?: BadgeAppearance
  /** Semantic status tone, independent from appearance. */
  tone?: BadgeTone
  /** Custom inline content, including a status icon or formatted count. */
  children?: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(props, ref) {
    const {
      text,
      appearance = 'outline',
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
        data-appearance={appearance}
        data-tone={tone}
        className={cn('uf-badge', className)}
        {...rest}
      >
        {children ?? text}
      </Text>
    )
  },
)
