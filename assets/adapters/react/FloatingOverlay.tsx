/** Props of Tooltip, Popover and the Overlay compat alias; the shared implementation is internal. */
import { forwardRef } from 'react'
import { useFloatingOverlay } from '../../internal/floating-overlay'
import type { FloatingOverlayProps } from './floating-overlay-props'

export type {
  FloatingSurfaceProps,
  HoverTimingProps,
  FloatingOverlayProps,
} from './floating-overlay-props'

/** Tooltip, Popover or hover card chosen by `openOn` and `interactive`; the implementation behind Overlay. */
export const FloatingOverlay = forwardRef<HTMLDivElement, FloatingOverlayProps>(
  function FloatingOverlay(props, ref) {
    return useFloatingOverlay('Overlay', props, ref)
  },
)
