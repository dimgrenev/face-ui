import { forwardRef } from 'react'
import { Overlay, type OverlayProps } from '../Overlay/Overlay'

export interface TooltipProps extends Omit<OverlayProps, 'trigger' | 'interactive'> {}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(props, ref) {
  return <Overlay ref={ref} trigger="hover" interactive={false} {...props} />
})
