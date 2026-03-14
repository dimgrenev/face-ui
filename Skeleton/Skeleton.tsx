/**
 * Skeleton — loading placeholder.
 *
 * `<Skeleton />`
 * `<Skeleton width={200} height={20} />`
 * `<Skeleton variant="circle" />`
 */

import { forwardRef, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

export const skeletonAnatomy = createAnatomy('skeleton').parts('root')

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
  variant?: 'text' | 'circle' | 'rect'
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(props, ref) {
    const { width, height, variant = 'text', className, style, ...rest } = props
    return (
      <div
        ref={ref}
        {...skeletonAnatomy.getPartAttrs('root')}
        data-variant={variant}
        aria-hidden="true"
        className={cn('uf-skeleton', className)}
        style={{ width, height, ...style }}
        {...rest}
      />
    )
  },
)
