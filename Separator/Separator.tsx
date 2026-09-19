/**
 * Separator — a thin line between sections or between controls in a row.
 *
 * `<Separator />`
 * `<Separator orientation="vertical" />`
 */

import { forwardRef, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'

export const separatorAnatomy = createAnatomy('separator').parts('root')

export interface SeparatorProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | 'children'
    | 'dangerouslySetInnerHTML'
    | 'defaultChecked'
    | 'defaultValue'
    | 'role'
    | 'aria-orientation'
  > {
  /** Draws a horizontal line across the available width, or a vertical line down the height of its row. */
  orientation?: 'horizontal' | 'vertical'
  /** Hides the line from assistive technology; `false` exposes it as a separator with its orientation, for a break between sections or a resize handle. */
  decorative?: boolean
  /** Insets the line by the control spacing so its ends meet the visible edges of neighbouring controls; a vertical line also keeps at least one control's height. */
  membrane?: boolean
}

/** A thin line between sections or between controls in a row, hidden from assistive technology unless `decorative` is false. */
export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  function Separator(
    {
      orientation = 'horizontal',
      decorative = true,
      membrane = true,
      className,
      ...rest
    },
    ref,
  ) {
    // Any other value from a face document draws the default line.
    const direction = orientation === 'vertical' ? 'vertical' : 'horizontal'
    return (
      <Membrane
        enabled={membrane}
        as="div"
        fullWidth={direction === 'horizontal'}
        className={
          direction === 'horizontal'
            ? 'uf-separator-membrane'
            : 'uf-separator-membrane--vertical'
        }
      >
        <div
          {...rest}
          ref={ref}
          {...separatorAnatomy.getPartAttrs('root')}
          role={decorative ? 'none' : 'separator'}
          aria-orientation={decorative ? undefined : direction}
          data-orientation={direction}
          data-membrane={membrane ? '' : undefined}
          className={cn('uf-separator', className)}
        />
      </Membrane>
    )
  },
)
