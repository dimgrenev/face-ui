import { forwardRef } from 'react'
import { Modal, type ModalProps } from '../Modal/Modal'

export interface DrawerProps extends Omit<ModalProps, 'surface' | 'variant'> {
  side?: 'left' | 'right' | 'top' | 'bottom'
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(props, ref) {
  const { side = 'right', ...rest } = props
  const surface = side === 'top' || side === 'bottom' ? 'sheet' : 'dialog'
  return <Modal ref={ref} surface={surface} variant={side} {...rest} />
})
