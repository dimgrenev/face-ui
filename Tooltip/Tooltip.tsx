import { forwardRef } from 'react'
import {
  FloatingOverlay,
  type FloatingSurfaceProps,
  type HoverTimingProps,
} from '../assets/adapters/react/FloatingOverlay'

export interface TooltipProps extends FloatingSurfaceProps, HoverTimingProps {}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    return (
      <FloatingOverlay
        {...props}
        ref={ref}
        trigger="hover"
        interactive={false}
      />
    )
  },
)
