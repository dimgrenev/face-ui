/** Progress — completion of a task, with a known or unknown duration. */
import { forwardRef } from 'react'
import {
  RangeIndicator,
  type RangeIndicatorProps,
  type RangeIndicatorShape,
  type RangeIndicatorTone,
} from '../assets/internal/range-indicator'
export type ProgressTone = RangeIndicatorTone
export type ProgressShape = RangeIndicatorShape
export interface ProgressProps extends RangeIndicatorProps {
  /** Finite amount completed; values outside 0..max are bounded. Defaults to 0. */
  value?: number
  /** Finite positive total amount of work. Defaults to 100. */
  max?: number
  /** Unknown duration: omit aria-valuenow and numeric text. Defaults to false. */
  indeterminate?: boolean
}
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(
    { value = 0, max = 100, indeterminate = false, ...props },
    ref,
  ) {
    return (
      <RangeIndicator
        {...props}
        ref={ref}
        kind="progress"
        min={0}
        max={max}
        value={value}
        indeterminate={indeterminate}
      />
    )
  },
)
