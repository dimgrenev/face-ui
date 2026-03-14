import { forwardRef } from 'react'
import { Toggle, type ToggleItem, type ToggleProps } from '../Toggle/Toggle'

export interface SegmentedControlItem extends ToggleItem {}

export interface SegmentedControlProps extends Omit<ToggleProps, 'type'> {
  selectionMode?: 'single' | 'multiple'
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(function SegmentedControl(props, ref) {
  const { selectionMode = 'single', ...rest } = props
  return <Toggle ref={ref} type={selectionMode} {...rest} />
})
