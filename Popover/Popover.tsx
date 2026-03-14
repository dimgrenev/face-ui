import { forwardRef } from 'react'
import { Overlay, type OverlayProps } from '../Overlay/Overlay'

export interface PopoverProps extends Omit<OverlayProps, 'trigger' | 'interactive'> {
  interactive?: boolean
}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(props, ref) {
  const { interactive = true, ...rest } = props
  return <Overlay ref={ref} trigger="click" interactive={interactive} {...rest} />
})
