/** @deprecated Use SegmentedControl. Legacy type/array values map to one implementation. */
import { forwardRef } from 'react'
import {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedControlItem,
} from '../SegmentedControl/SegmentedControl'
export type ToggleItem = SegmentedControlItem
export type ToggleProps = Omit<
  SegmentedControlProps,
  'multiple' | 'value' | 'defaultValue' | 'onValueChange'
> & {
  /** Legacy selection mode; new code uses SegmentedControl multiple. */
  type?: 'single' | 'multiple'
  /** Selected choices; single mode accepts at most one. */
  value?: readonly string[]
  /** Initial choices, restored on form reset. */
  defaultValue?: readonly string[]
  /** User selection request; the returned array is independent of internal state. */
  onValueChange?: (details: { value: readonly string[] }) => void
}
export const Toggle = forwardRef<HTMLDivElement, ToggleProps>(function Toggle(
  { type = 'multiple', value, defaultValue, onValueChange, ...rest },
  ref,
) {
  for (const candidate of [value, defaultValue]) {
    if (
      candidate !== undefined &&
      (!Array.isArray(candidate) ||
        candidate.some((item) => typeof item !== 'string') ||
        (type === 'single' && candidate.length > 1))
    )
      throw new TypeError(
        'Toggle values must be string arrays with at most one choice in single mode',
      )
  }
  return type === 'single' ? (
    <SegmentedControl
      {...rest}
      ref={ref}
      value={value === undefined ? undefined : (value[0] ?? null)}
      defaultValue={defaultValue?.[0] ?? null}
      onValueChange={(details) =>
        onValueChange?.({
          value: details.value === null ? [] : [details.value],
        })
      }
    />
  ) : (
    <SegmentedControl
      {...rest}
      ref={ref}
      multiple
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    />
  )
})
