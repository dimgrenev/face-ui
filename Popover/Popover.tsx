import { forwardRef } from 'react'
import {
  FloatingOverlay,
  type FloatingSurfaceProps,
} from '../assets/adapters/react/FloatingOverlay'

export interface PopoverProps extends FloatingSurfaceProps {}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  function Popover(props, ref) {
    return <FloatingOverlay {...props} ref={ref} trigger="click" />
  },
)
