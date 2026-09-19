/**
 * Skeleton — a placeholder in the shape of content that is still loading.
 *
 * `<Skeleton />`
 * `<Skeleton shape="circle" />`
 * `<Skeleton shape="rect" height={160} />`
 */

import { forwardRef, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

export const skeletonAnatomy = createAnatomy('skeleton').parts('root')

export interface SkeletonProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue' | 'aria-hidden'
  > {
  /** What it stands in for: `text` a line of text, painted where a one-line Text puts its glyphs; `rect` a block as wide as its column and one control tall; `circle` an avatar one control across. */
  shape?: 'rect' | 'circle' | 'text'
  /** Width it paints, in pixels or any CSS length, in place of the shape's default (a text line or rect fills its column, so give one in a container sized by its content); a circle given only a width is as tall. */
  width?: number | string
  /** Height it paints, in pixels or any CSS length, in place of the shape's default; a circle given only a height is as wide. */
  height?: number | string
}

const given = (length: number | string | undefined) => length != null && length !== ''

/** A pulsing placeholder in the shape of loading content, hidden from assistive technology; mark the region being loaded with aria-busy. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ shape = 'text', width, height, className, style, ...rest }, ref) {
    // The stylesheet keeps a circle round from its width, so a circle given only a height takes it as its width.
    const round = shape === 'circle' && !given(width) && !given(style?.width)
    return (
      <div
        {...rest}
        ref={ref}
        {...skeletonAnatomy.getPartAttrs('root')}
        data-shape={shape}
        aria-hidden="true"
        className={cn('uf-skeleton', className)}
        style={{ width: round ? (style?.height ?? height) : width, height: round ? undefined : height, ...style }}
      />
    )
  },
)
