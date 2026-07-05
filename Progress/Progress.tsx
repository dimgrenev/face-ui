/**
 * Progress — data display indicator.
 *
 * Shows loading progress as a linear bar or circular ring with track + indicator.
 * Pass value=-1 for indeterminate state.
 *
 * `<Progress value={50} max={100} />`
 * `<Progress value={50} shape="circle" showLabel />`
 * `<Progress value={-1} label="Loading..." />`
 * `<Progress value={75} variant="success" showLabel />`
 */

import { forwardRef, useId, type CSSProperties, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { progressMachine, connectProgress } from '../assets/machines/progress.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error'
export type ProgressShape = 'linear' | 'circle'

export interface ProgressProps {
  /** Current value. Pass -1 for indeterminate. */
  value?: number
  /** Maximum value (default 100). */
  max?: number
  /** Color variant. */
  variant?: ProgressVariant
  /** Visual progress shape. */
  shape?: ProgressShape
  /** Show percentage label in the header for linear progress or beside the ring for circular progress. */
  showLabel?: boolean
  /** Optional label rendered in the header for linear progress or beside the ring for circular progress. */
  label?: ReactNode
  /** Accessible label for the progressbar when no visible label is rendered. */
  'aria-label'?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(props, ref) {
    const {
      value = 0,
      max = 100,
      variant = 'default',
      shape = 'linear',
      showLabel = false,
      label,
      'aria-label': ariaLabel,
      className,
    } = props

    const { state, send } = useMachine(progressMachine, {
      value,
      max,
    })
    const api = connectProgress(state, send)
    const generatedLabelId = useId()
    const labelId = label != null ? `${generatedLabelId}-label` : undefined
    const indicatorProps = api.getIndicatorProps()
    const displayPercent = Math.round(api.percent)
    const indicatorStyle = {
      ...(shape === 'circle' ? {} : indicatorProps.style),
      '--uf-progress-percent': api.isIndeterminate ? '40%' : `${displayPercent}%`,
    } as CSSProperties
    const labelNode = label != null ? (
      <Text
        as="span"
        inset="none"
        membrane={false}
        id={labelId}
        className="uf-progress-title"
        {...api.getLabelProps()}
      >
        {label}
      </Text>
    ) : null
    const valueNode = showLabel ? (
      <Text as="span" inset="none" membrane={false} className="uf-progress-label">
        {displayPercent}%
      </Text>
    ) : null
    const trackNode = (
      <div {...api.getTrackProps()}>
        <div {...indicatorProps} style={indicatorStyle} />
      </div>
    )

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        data-variant={variant}
        data-shape={shape}
        className={cn('uf-progress', className)}
      >
        {shape === 'linear' ? (
          <>
            {(labelNode || valueNode) ? (
              <div className="uf-progress__header">
                {labelNode}
                {valueNode}
              </div>
            ) : null}
            <div className="uf-progress__trackWrap">
              {trackNode}
            </div>
          </>
        ) : (
          <>
            {labelNode}
            {trackNode}
            {valueNode}
          </>
        )}
      </div>
    )
  },
)
