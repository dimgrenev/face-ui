/**
 * Steps — step-by-step wizard navigation.
 *
 * Supports linear (no skipping) and non-linear modes.
 * Only the active step's content panel is visible.
 *
 * `<Steps items={[{ label: 'Account' }, { label: 'Profile' }]} step={0} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { stepsMachine, connectSteps } from '../assets/machines/steps.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepItem {
  label: ReactNode
  content?: ReactNode
}

export interface StepsProps {
  /** Step definitions. */
  items: StepItem[]
  /** Current step index (0-based). */
  step?: number
  /** Uncontrolled initial step index. */
  defaultStep?: number
  /** Linear mode: prevents skipping steps. */
  linear?: boolean
  /** Disable the entire steps navigation. */
  disabled?: boolean
  /** Callback when the active step changes. */
  onStepChange?: (details: { step: number }) => void
  /** Additional class name on the root element. */
  className?: string
}

function getCircledStepSymbol(stepNumber: number): string {
  const symbols = [
    '①', '②', '③', '④', '⑤',
    '⑥', '⑦', '⑧', '⑨', '⑩',
    '⑪', '⑫', '⑬', '⑭', '⑮',
    '⑯', '⑰', '⑱', '⑲', '⑳',
  ]
  if (stepNumber >= 1 && stepNumber <= symbols.length) {
    return symbols[stepNumber - 1]
  }
  return String(stepNumber)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Steps = forwardRef<HTMLDivElement, StepsProps>(
  function Steps(props, ref) {
    const {
      items: rawItems,
      step,
      defaultStep = 0,
      linear = true,
      disabled = false,
      onStepChange,
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const machineStep = useControllableMachineProp(step, defaultStep)

    const { state, send } = useMachine(stepsMachine, {
      step: machineStep,
      total: items.length,
      linear,
      disabled,
      onStepChange: onStepChange ?? null,
    })

    const api = connectSteps(state, send)

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-steps', className)}>
        <div className="uf-steps-list">
          {items.map((item, index) => (
            <div key={index} {...api.getItemProps(index)} className="uf-steps-item">
              <span className="uf-membrane">
                <button
                  {...api.getTriggerProps(index)}
                  className="uf-steps-trigger uf-option uf-control"
                >
                  <span {...api.getIndicatorProps(index)} className="uf-steps-indicator">
                    {getCircledStepSymbol(index + 1)}
                  </span>
                  <Text as="span" inset="none" membrane={false} className="uf-steps-label">{item.label}</Text>
                </button>
              </span>
            </div>
          ))}
        </div>

        {items.map((item, index) =>
          item.content != null ? (
            <div key={index} {...api.getContentProps(index)}>
              {typeof item.content === 'string' || typeof item.content === 'number'
                ? (
                  <Text as="div" align="left" fullWidth>
                    {String(item.content)}
                  </Text>
                )
                : item.content}
            </div>
          ) : null,
        )}
      </div>
    )
  },
)
