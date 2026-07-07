import { forwardRef } from 'react'
import { Modal, type ModalProps } from '../Modal/Modal'
import { cn } from '../assets/utils'

export type DrawerEdge = 'inset' | 'flush'

export interface DrawerProps extends Omit<ModalProps, 'surface' | 'variant'> {
  side?: 'left' | 'right' | 'top' | 'bottom'
  edge?: DrawerEdge
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(props, ref) {
  const {
    side = 'right',
    edge,
    trigger = 'Open drawer',
    title = 'Drawer',
    children = 'Drawer content',
    className,
    positionerClassName,
    ...rest
  } = props
  const resolvedEdge = edge ?? (side === 'top' || side === 'bottom' ? 'inset' : 'flush')
  const surface = side === 'top' || side === 'bottom' ? 'sheet' : 'dialog'
  return (
    <Modal
      ref={ref}
      surface={surface}
      variant={side}
      trigger={trigger}
      title={title}
      className={cn('uf-drawer', `uf-drawer--${resolvedEdge}`, className)}
      positionerClassName={cn(
        'uf-drawer-positioner',
        `uf-drawer-positioner--${resolvedEdge}`,
        positionerClassName,
      )}
      data-drawer-edge={resolvedEdge}
      {...rest}
    >
      {children}
    </Modal>
  )
})
