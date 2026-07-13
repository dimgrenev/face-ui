/**
 * Scroll — native scroll area.
 *
 * `<Scroll>{content}</Scroll>`
 * `<Scroll orientation="both">{content}</Scroll>`
 */

import { forwardRef, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const scrollAnatomy = createAnatomy('scroll').parts('root', 'viewport')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollProps {
  /** Content to make scrollable. */
  children?: ReactNode
  /** Which axes can scroll. */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Additional class name on the root element. */
  className?: string
  /** Viewport height. */
  height?: number | string
  /** Accessible label for the scrollable region. */
  ariaLabel?: string
}

function renderScrollContent(children: ReactNode) {
  if (children == null) {
    return null
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return (
      <Text as="div" fullWidth membrane inset="control" className="uf-scroll__text">
        {children}
      </Text>
    )
  }
  return children
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Scroll = forwardRef<HTMLDivElement, ScrollProps>(
  function Scroll(props, ref) {
    const {
      children,
      orientation = 'vertical',
      className,
      height = 240,
      ariaLabel = 'Scrollable text',
    } = props

    const overflowStyle = (() => {
      switch (orientation) {
        case 'horizontal':
          return { overflowX: 'auto' as const, overflowY: 'hidden' as const }
        case 'both':
          return { overflowX: 'auto' as const, overflowY: 'auto' as const }
        case 'vertical':
        default:
          return { overflowX: 'hidden' as const, overflowY: 'auto' as const }
      }
    })()

    return (
      <Card
        ref={ref}
        {...scrollAnatomy.getPartAttrs('root')}
        variant="code"
        padding="none"
        radius="md"
        data-orientation={orientation}
        className={cn('uf-scroll', className)}
        style={{ height }}
      >
        <div
          {...scrollAnatomy.getPartAttrs('viewport')}
          style={overflowStyle}
          tabIndex={0}
          role="region"
          aria-label={ariaLabel}
        >
          {renderScrollContent(children)}
        </div>
      </Card>
    )
  },
)
