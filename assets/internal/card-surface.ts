import { cn } from '../utils'
import type { CardSurfaceOptions } from './card-surface-options'

/** Shared surface presentation; native attributes remain on the owning div.
 * Card's title/description/footer shorthand is not part of a floating surface's DOM API. */
export function getCardSurfaceProps({
  variant,
  padding,
  radius,
  border,
  hoverable,
  fullWidth,
  className,
}: CardSurfaceOptions & { className?: string }) {
  return {
    'data-card-variant': variant,
    'data-padding': padding,
    'data-radius': radius,
    'data-border': border ? 'true' : 'false',
    'data-hoverable': hoverable ? '' : undefined,
    'data-full-width': fullWidth ? '' : undefined,
    className: cn('uf-card', className),
  }
}
