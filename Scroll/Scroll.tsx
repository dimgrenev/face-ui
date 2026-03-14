/**
 * Scroll — scroll area with custom scrollbar styling hooks.
 *
 * `<Scroll>{content}</Scroll>`
 * `<Scroll type="always" orientation="both">{content}</Scroll>`
 */

import { forwardRef, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const scrollAnatomy = createAnatomy('scroll').parts(
  'root',
  'viewport',
  'scrollbar',
  'thumb',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrollbarVisibility = 'auto' | 'always' | 'hover' | 'scroll'

export interface ScrollProps {
  /** Content to make scrollable. */
  children: ReactNode
  /** When scrollbars are visible. */
  type?: ScrollbarVisibility
  /** Which axes can scroll. */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Additional class name on the root element. */
  className?: string
  /** Viewport height. */
  height?: number | string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Scroll = forwardRef<HTMLDivElement, ScrollProps>(
  function Scroll(props, ref) {
    const {
      children,
      type = 'auto',
      orientation = 'vertical',
      className,
      height = 160,
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
      <div
        ref={ref}
        {...scrollAnatomy.getPartAttrs('root')}
        data-type={type}
        data-orientation={orientation}
        className={cn('uf-scroll', className)}
        style={{ height }}
      >
        <div
          {...scrollAnatomy.getPartAttrs('viewport')}
          style={overflowStyle}
          tabIndex={0}
          role="region"
          aria-label="Scrollable content"
        >
          {children}
        </div>
      </div>
    )
  },
)
