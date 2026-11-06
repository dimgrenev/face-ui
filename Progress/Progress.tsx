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
  /** Amount completed, bounded to 0..max; `null` is an unknown amount, shown and announced without a number. Defaults to 0. */
  value?: number | null
  /** Finite positive total amount of work. Defaults to 100. */
  max?: number
}
/** Completion of a task of known or unknown duration, drawn as a linear bar or a circular ring. */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress({ value = 0, max = 100, ...props }, ref) {
    return (
      <RangeIndicator
        {...props}
        ref={ref}
        kind="progress"
        min={0}
        max={max}
        value={value}
      />
    )
  },
)
