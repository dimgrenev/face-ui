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
  /** What it stands in for: `text` a line of Text across its column, `rect` a block as wide as its column and one control tall, `circle` an avatar one control across. */
  shape?: 'rect' | 'circle' | 'text'
  /** Width of the box it takes, in pixels or any CSS length, in place of the shape's default; a circle given only a width is as tall. */
  width?: number | string
  /** Height of the box it takes, in pixels or any CSS length, in place of the shape's default; a circle given only a height is as wide. */
  height?: number | string
}

/** A pulsing placeholder in the shape of loading content, hidden from assistive technology; mark the region being loaded with aria-busy. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ shape = 'text', width, height, className, style, ...rest }, ref) {
    const circle = shape === 'circle'
    return (
      <div
        {...rest}
        ref={ref}
        {...skeletonAnatomy.getPartAttrs('root')}
        data-shape={shape}
        aria-hidden="true"
        className={cn('uf-skeleton', className)}
        style={{
          width: circle ? (width ?? height) : width,
          height: circle ? (height ?? width) : height,
          ...style,
        }}
      />
    )
  },
)
