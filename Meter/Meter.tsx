import { forwardRef } from 'react'
import {
  RangeIndicator,
  type RangeIndicatorProps,
  type RangeIndicatorShape,
  type RangeIndicatorTone,
} from '../assets/internal/range-indicator'
export type MeterTone = RangeIndicatorTone
export type MeterShape = RangeIndicatorShape
export interface MeterProps extends RangeIndicatorProps {
  /** Finite measured value; values outside min..max are bounded. Defaults to 0. */
  value?: number
  /** Finite lower bound, strictly below max. Defaults to 0. */
  min?: number
  /** Finite upper bound, strictly above min. Defaults to 100. */
  max?: number
}
/** A measurement inside a known range, such as storage or quota usage, drawn as a bar or a ring. */
export const Meter = forwardRef<HTMLDivElement, MeterProps>(function Meter(
  { value = 0, min = 0, max = 100, ...props },
  ref,
) {
  return (
    <RangeIndicator
      {...props}
      ref={ref}
      kind="meter"
      min={min}
      max={max}
      value={value}
    />
  )
})
