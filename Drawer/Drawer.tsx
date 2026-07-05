import { forwardRef } from 'react'
import { Modal, type ModalProps } from '../Modal/Modal'
import { cn } from '../assets/utils'

export interface DrawerProps extends Omit<ModalProps, 'surface' | 'variant'> {
  side?: 'left' | 'right' | 'top' | 'bottom'
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(props, ref) {
  const {
    side = 'right',
    trigger = 'Open drawer',
    title = 'Drawer',
    children = 'Drawer content',
    className,
    ...rest
  } = props
  const surface = side === 'top' || side === 'bottom' ? 'sheet' : 'dialog'
  return (
    <Modal
      ref={ref}
      surface={surface}
      variant={side}
      trigger={trigger}
      title={title}
      className={cn('uf-drawer', className)}
      {...rest}
    >
      {children}
    </Modal>
  )
})
