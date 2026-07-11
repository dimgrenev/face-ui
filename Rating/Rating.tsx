/**
 * Rating — star rating control.
 *
 * `<Rating value={3} />`
 * `<Rating value={2.5} allowHalf max={10} />`
 */

import { forwardRef, useId, useState, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { ratingMachine, connectRating } from '../assets/machines/rating.machine'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RatingProps {
  /** Current rating value. */
  value?: number
  /** Uncontrolled initial rating value. */
  defaultValue?: number
  /** Maximum number of stars. */
  max?: number
  /** Disabled state. */
  disabled?: boolean
  /** Allow half-star increments. */
  allowHalf?: boolean
  /** Label content. */
  label?: ReactNode
  /** Accessible name used when no visible label is provided. */
  ariaLabel?: string
  /** Callback when value changes. */
  onValueChange?: (details: { value: number }) => void
  /** Additional CSS class. */
  className?: string
}

// ---------------------------------------------------------------------------
// Star icon
// ---------------------------------------------------------------------------

function StarIcon() {
  return <Icon name="star" />
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Rating = forwardRef<HTMLDivElement, RatingProps>(
  function Rating(props, ref) {
    const {
      value,
      defaultValue = 0,
      max = 5,
      disabled = false,
      allowHalf = false,
      label,
      ariaLabel = 'Rating',
      onValueChange,
      className,
    } = props

    const isControlled = value !== undefined
    const [uncontrolledValue, setUncontrolledValue] = useState<number>(() => defaultValue)
    const machineValue = isControlled ? Number(value) : uncontrolledValue

    const { state, send } = useMachine(ratingMachine, {
      value: machineValue,
      max,
      disabled,
      allowHalf,
      onValueChange: ((details: { value: number }) => {
        if (!isControlled) setUncontrolledValue(details.value)
        if (isControlled && details.value === value) return
        onValueChange?.(details)
      }) as any,
    })

    const api = connectRating(state, send)
    const labelId = useId()

    const items = Array.from({ length: max }, (_, i) => i + 1)

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        aria-label={label == null ? ariaLabel : undefined}
        aria-labelledby={label != null ? labelId : undefined}
        className={cn('uf-rating', className)}
      >
        {label != null && (
          <Text {...(api.getLabelProps() as any)} id={labelId} as="label" variant="label">
            {label}
          </Text>
        )}
        {items.map((index) => (
          <button key={index} type="button" className="uf-rating-star" {...api.getItemProps(index)}>
            <StarIcon />
          </button>
        ))}
      </div>
    )
  },
)
