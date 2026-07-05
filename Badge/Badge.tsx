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

export type BadgeVariant = 'default' | 'primary' | 'secondary'
export type BadgeAppearance = 'fill' | 'outline'
export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'destructive'
type LegacyBadgeVariant = BadgeVariant | BadgeTone | 'outline'

const badgeTones = new Set<BadgeTone>(['neutral', 'accent', 'positive', 'warning', 'destructive'])

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  text?: string
  variant?: LegacyBadgeVariant
  appearance?: BadgeAppearance
  tone?: BadgeTone
  children?: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(props, ref) {
    const {
      text,
      variant: variantProp = 'default',
      appearance: appearanceProp = 'outline',
      tone: toneProp,
      children,
      className,
      ...rest
    } = props
    const legacyTone = badgeTones.has(variantProp as BadgeTone) && !['default', 'primary', 'secondary'].includes(variantProp)
      ? variantProp as BadgeTone
      : undefined
    const appearance = variantProp === 'outline' ? 'outline' : appearanceProp
    const variant = variantProp === 'outline' || legacyTone ? 'default' : variantProp as BadgeVariant
    const tone = toneProp ?? legacyTone ?? 'neutral'
    return (
      <Text
        ref={ref}
        as="span"
        inset="control"
        membrane
        {...badgeAnatomy.getPartAttrs('root')}
        data-variant={variant}
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
