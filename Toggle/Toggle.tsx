import type {
  SegmentedControlItem,
  SegmentedControlProps,
} from '../SegmentedControl/SegmentedControl'

export {
  /**
   * Deprecated alias of SegmentedControl: the same component, with `multiple` in place of `type="multiple"`.
   * @deprecated Use SegmentedControl.
   */
  SegmentedControl as Toggle,
} from '../SegmentedControl/SegmentedControl'
/** @deprecated Use SegmentedControlProps. */
export type ToggleProps = SegmentedControlProps
/** @deprecated Use SegmentedControlItem. */
export type ToggleItem = SegmentedControlItem
