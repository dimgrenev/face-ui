import type {
  SegmentedControlItem,
  SegmentedControlProps,
} from '../SegmentedControl/SegmentedControl'

export {
  /** @deprecated Use SegmentedControl: Toggle is the same component, and `type="multiple"` is `multiple`. */
  SegmentedControl as Toggle,
} from '../SegmentedControl/SegmentedControl'
/** @deprecated Use SegmentedControlProps. */
export type ToggleProps = SegmentedControlProps
/** @deprecated Use SegmentedControlItem. */
export type ToggleItem = SegmentedControlItem
