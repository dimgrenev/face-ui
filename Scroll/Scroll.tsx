/**
 * Scroll — a framed box whose content scrolls natively.
 *
 * `<Scroll height={240} aria-label="Activity">{content}</Scroll>`
 * `<Scroll orientation="both" style={{ maxHeight: 180 }}>{rows}</Scroll>`
 */

import {
  forwardRef,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { getCardSurfaceProps } from '../assets/internal/card-surface'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useScrollable } from '../assets/adapters/react/use-scrollable'
import { resolveLabel } from '../assets/runtime/labels'
import { readCssSize } from '../assets/runtime/props'
import { Text } from '../Text/Text'

export const scrollAnatomy = createAnatomy('scroll').parts('root', 'viewport', 'content')

export interface ScrollProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'role'
  | 'tabIndex'
  | 'hidden'
  | 'autoFocus'
  | 'defaultValue'
  | 'defaultChecked'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Content to scroll; text keeps its line breaks and wraps only while the content cannot scroll sideways. */
  children?: ReactNode
  /** Axes the content scrolls along; overflow along the other axis is clipped. */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Height of the box: a number or numeric string is pixels, or pass a CSS length. Wins over `style.height`; without it the box follows its content or layout. */
  height?: number | string
  /** Names the scrolling region; a tab stop without `aria-label` or `aria-labelledby` is named "Scrollable content". */
  'aria-label'?: string
  /** Class name of the outer box; the other native attributes and the ref go to the scrolling viewport. */
  className?: string
  /** Style of the outer box: `maxHeight` lets it grow with its content up to a limit; `height`, when set, replaces `style.height`. */
  style?: CSSProperties
}

const OVERFLOW = {
  vertical: { overflowX: 'hidden', overflowY: 'auto' },
  horizontal: { overflowX: 'auto', overflowY: 'hidden' },
  both: { overflowX: 'auto', overflowY: 'auto' },
} as const satisfies Record<string, CSSProperties>

/** A tab stop needs a name until a native aria-label or aria-labelledby gives one (K14). */
const defaultRootLabels = Object.freeze({ region: 'Scrollable content' })

/** A framed box whose content scrolls natively; it is a named tab stop only while it can scroll. */
export const Scroll = forwardRef<HTMLDivElement, ScrollProps>(function Scroll(
  {
    children,
    orientation = 'vertical',
    height,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    className,
    style,
    ...rest
  },
  ref,
) {
  const axes = orientation === 'horizontal' || orientation === 'both' ? orientation : 'vertical'
  const boxHeight = readCssSize('Scroll', 'height', height)
  const overflow = OVERFLOW[axes]
  const viewportRef = useRef<HTMLDivElement>(null)
  const viewportRefs = useComposedRefs(viewportRef, ref)
  // An orientation change moves the overflow without resizing anything.
  const scrollable = useScrollable(viewportRef, [axes])
  // A tab stop while it scrolls; still focusable after, so a focused region that stops scrolling keeps focus.
  // Unmeasured (server HTML, no ResizeObserver), no tabindex leaves the browser's own rule for scrollers.
  const stop = scrollable === undefined ? undefined : scrollable ? 0 : -1
  const labelledBy =
    typeof ariaLabelledBy === 'string' && ariaLabelledBy.trim() ? ariaLabelledBy : undefined
  // Blank text cannot erase the name of a tab stop; without one, only the consumer's name makes a region.
  const name = resolveLabel(
    ariaLabel,
    stop === 0 && !labelledBy ? defaultRootLabels.region : '',
    'Scroll',
    'aria-label',
  )

  return (
    <div
      {...scrollAnatomy.getPartAttrs('root')}
      {...getCardSurfaceProps({
        variant: 'code',
        padding: 'none',
        radius: 'md',
        border: true,
        hoverable: false,
        fullWidth: true,
        className: cn('uf-scroll', className),
      })}
      data-orientation={axes}
      style={boxHeight === undefined ? style : { ...style, height: boxHeight }}
    >
      <div
        {...rest}
        // Scroll owns the viewport's role, tab stop, visibility and content: values passed anyway are dropped.
        hidden={undefined}
        dangerouslySetInnerHTML={undefined}
        ref={viewportRefs}
        {...scrollAnatomy.getPartAttrs('viewport')}
        role={name || labelledBy ? 'region' : undefined}
        aria-label={name || undefined}
        aria-labelledby={labelledBy}
        tabIndex={stop}
        style={overflow}
      >
        <div {...scrollAnatomy.getPartAttrs('content')}>
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text
              as="div"
              fullWidth
              membrane
              inset="control"
              className={cn('uf-scroll__text', axes !== 'vertical' && 'uf-scroll__text--nowrap')}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
})
