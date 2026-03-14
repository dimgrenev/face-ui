/**
 * Progress — data display indicator.
 *
 * Shows loading progress as a bar with track + indicator.
 * Pass value=-1 for indeterminate state.
 *
 * `<Progress value={50} max={100} />`
 * `<Progress value={-1} label="Loading..." />`
 * `<Progress value={75} variant="success" showLabel />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { progressMachine, connectProgress } from '../assets/machines/progress.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error'

export interface ProgressProps {
  /** Current value. Pass -1 for indeterminate. */
  value: number
  /** Maximum value (default 100). */
  max?: number
  /** Color variant. */
  variant?: ProgressVariant
  /** Show percentage label beside the track. */
  showLabel?: boolean
  /** Optional label rendered beside the track. */
  label?: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(props, ref) {
    const {
      value,
      max = 100,
      variant = 'default',
      showLabel = false,
      label,
      className,
    } = props

    const { state, send } = useMachine(progressMachine, {
      value,
      max,
    })
    const api = connectProgress(state, send)

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        data-variant={variant}
        className={cn('uf-progress', className)}
      >
        {label != null && (
          <Text as="span" inset="none" membrane={false} {...api.getLabelProps()}>
            {label}
          </Text>
        )}
        <div {...api.getTrackProps()}>
          <div {...api.getIndicatorProps()} />
        </div>
        {showLabel && (
          <Text as="span" inset="none" membrane={false} className="uf-progress-label">
            {Math.round(api.percent)}%
          </Text>
        )}
      </div>
    )
  },
)
