import { forwardRef } from 'react'
import { Drawer, type DrawerProps } from '../Drawer/Drawer'

export interface SheetProps extends Omit<DrawerProps, 'side'> {
  side?: 'bottom' | 'top'
}

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(function Sheet(props, ref) {
  const { side = 'bottom', ...rest } = props
  return <Drawer ref={ref} side={side} {...rest} />
})
