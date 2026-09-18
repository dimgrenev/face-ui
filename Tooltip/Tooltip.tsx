import { forwardRef } from 'react'
import {
  useFloatingOverlay,
  type FloatingSurfaceProps,
  type HoverTimingProps,
} from '../assets/adapters/react/FloatingOverlay'

export interface TooltipProps extends FloatingSurfaceProps, HoverTimingProps {}

/** Non-interactive floating text hint anchored to a trigger element, shown on hover and keyboard focus. */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    return useFloatingOverlay(
      'Tooltip',
      { ...props, openOn: 'hover', interactive: false },
      ref,
    )
  },
)
