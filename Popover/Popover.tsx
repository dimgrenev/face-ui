import { forwardRef } from 'react'
import type { FloatingSurfaceProps } from '../assets/adapters/react/FloatingOverlay'
import { useFloatingOverlay } from '../assets/internal/floating-overlay'

export interface PopoverProps extends FloatingSurfaceProps {}

/** Floating interactive surface anchored to a trigger element; a click on the trigger toggles it. */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  function Popover(props, ref) {
    return useFloatingOverlay('Popover', { ...props, openOn: 'click' }, ref)
  },
)
