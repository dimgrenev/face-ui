/**
 * Separator — visual divider.
 *
 * `<Separator />`
 * `<Separator orientation="vertical" />`
 */

import { forwardRef, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'

export const separatorAnatomy = createAnatomy('separator').parts('root')

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  membrane?: boolean
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  function Separator(props, ref) {
    const {
      orientation = 'horizontal',
      decorative = true,
      membrane = true,
      className,
      ...rest
    } = props

    const separatorNode = (
      <div
        ref={ref}
        {...separatorAnatomy.getPartAttrs('root')}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        data-orientation={orientation}
        data-membrane={membrane ? '' : undefined}
        className={cn('uf-separator', className)}
        {...rest}
      />
    )

    const membraneClassName =
      orientation === 'horizontal'
        ? 'uf-separator-membrane'
        : 'uf-separator-membrane--vertical'

    return (
      <Membrane
        enabled={membrane}
        as="div"
        fullWidth={orientation === 'horizontal'}
        className={membraneClassName}
      >
        {separatorNode}
      </Membrane>
    )
  },
)
