/**
 * Scroll — native scroll area.
 *
 * `<Scroll>{content}</Scroll>`
 * `<Scroll type="always" orientation="both">{content}</Scroll>`
 */

import { forwardRef, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const scrollAnatomy = createAnatomy('scroll').parts('root', 'viewport')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScrollbarVisibility = 'auto' | 'always' | 'hover' | 'scroll'

export interface ScrollProps {
  /** Content to make scrollable. */
  children?: ReactNode
  /** Legacy visibility hint. Native scrollbar rendering is browser-owned. */
  type?: ScrollbarVisibility
  /** Which axes can scroll. */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Additional class name on the root element. */
  className?: string
  /** Viewport height. */
  height?: number | string
  /** Accessible label for the scrollable region. */
  ariaLabel?: string
}

const DEFAULT_SCROLL_TEXT = [
  'По мотивам Чехова: «Вся Россия - наш сад».',
  'Вечером в доме стало так тихо, что слышно было, как в соседней комнате остывает самовар. Лампа горела ровно, но каждый ее круг света казался тревожным: за столом сидели люди, которые давно знали правду и все еще делали вид, будто можно отложить разговор до завтра.',
  'Она смотрела в окно, где чернели ветви, и думала не о дороге, не о деньгах, не о письме, лежавшем в ящике, а о том странном мгновении, когда прошлое вдруг становится вещью: его можно потрогать, потерять, продать или оставить чужим людям.',
  'Он сказал несколько простых слов, почти будничных, и от этого всем стало тяжелее. Никто не спорил. В передней скрипнула дверь, где-то в саду ударил топор, и в этой сухой паузе каждый понял: прежняя жизнь уже закончилась, только в комнате еще продолжали сидеть как прежде.',
  'Потом заговорили о погоде, о поезде, о мелких расходах. Так всегда бывает в минуты, когда главное произнесено без голоса. Человек берется за пустяки, чтобы не видеть, как под ногами меняется земля.',
].join('\n\n')

function renderScrollContent(children: ReactNode) {
  if (children == null || typeof children === 'string' || typeof children === 'number') {
    const text = String(children ?? DEFAULT_SCROLL_TEXT)
    return (
      <Text as="div" fullWidth membrane inset="control" className="uf-scroll__text">
        {text}
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
      type = 'auto',
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
          aria-label={ariaLabel}
        >
          {renderScrollContent(children)}
        </div>
      </div>
    )
  },
)
