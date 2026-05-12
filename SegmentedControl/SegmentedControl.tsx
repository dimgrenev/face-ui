import { forwardRef } from 'react'
import { Toggle, type ToggleItem } from '../Toggle/Toggle'

export interface SegmentedControlItem extends ToggleItem {}

export interface SegmentedControlProps {
  /** Segment options inherited from Toggle. */
  items: ToggleItem[]
  /** Currently selected segment values. */
  value?: string[]
  /** Uncontrolled initial selected segment values. */
  defaultValue?: string[]
  selectionMode?: 'single' | 'multiple'
  /** Disabled state inherited from Toggle. */
  disabled?: boolean
  /** Layout orientation inherited from Toggle. */
  orientation?: 'horizontal' | 'vertical'
  /** Callback when selected segment values change. */
  onValueChange?: (details: { value: string[] }) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper around each segment item. */
  membrane?: boolean
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(function SegmentedControl(props, ref) {
  const { selectionMode = 'single', ...rest } = props
  return <Toggle ref={ref} type={selectionMode} {...rest} />
})
