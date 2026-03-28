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

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'destructive'
export type BadgeAppearance = 'fill' | 'outline'
type LegacyBadgeVariant = BadgeVariant | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  text?: string
  variant?: LegacyBadgeVariant
  appearance?: BadgeAppearance
  children?: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(props, ref) {
    const {
      text,
      variant: variantProp = 'default',
      appearance: appearanceProp = 'fill',
      children,
      className,
      ...rest
    } = props
    const appearance = variantProp === 'outline' ? 'outline' : appearanceProp
    const variant = variantProp === 'outline' ? 'default' : variantProp
    return (
      <Text
        ref={ref}
        as="span"
        inset="control"
        membrane
        {...badgeAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-appearance={appearance}
        className={cn('uf-badge', className)}
        {...rest}
      >
        {children ?? text}
      </Text>
    )
  },
)
