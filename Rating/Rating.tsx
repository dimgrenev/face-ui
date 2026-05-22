/**
 * Rating — star rating control.
 *
 * `<Rating value={3} />`
 * `<Rating value={2.5} allowHalf max={10} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
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
      onValueChange,
      className,
    } = props

    const machineValue = useControllableMachineProp(value, defaultValue)

    const { state, send } = useMachine(ratingMachine, {
      value: machineValue,
      max,
      disabled,
      allowHalf,
      onValueChange,
    })

    const api = connectRating(state, send)

    const items = Array.from({ length: max }, (_, i) => i + 1)

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-rating', className)}>
        {label != null && (
          <Text {...(api.getLabelProps() as any)} as="label" variant="label">
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
