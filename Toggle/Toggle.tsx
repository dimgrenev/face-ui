/**
 * Toggle — unified Toggle + ToggleGroup.
 *
 * Single mode: `<Toggle type="single" items={[...]} />`
 * Multiple mode: `<Toggle type="multiple" items={[...]} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { toggleMachine, connectToggle } from '../assets/machines/toggle.machine'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToggleItem {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface ToggleProps {
  /** Toggle items to render. */
  items: ToggleItem[]
  /** Currently selected values. */
  value?: string[]
  /** Uncontrolled initial selected values. */
  defaultValue?: string[]
  /** Selection mode: single or multiple. */
  type?: 'single' | 'multiple'
  /** Disabled state for the entire group. */
  disabled?: boolean
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Callback when value changes. */
  onValueChange?: (details: { value: string[] }) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper (+1px outside each toggle item). */
  membrane?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Toggle = forwardRef<HTMLDivElement, ToggleProps>(
  function Toggle(props, ref) {
    const {
      items: rawItems,
      value,
      defaultValue,
      type = 'multiple',
      disabled = false,
      orientation = 'horizontal',
      onValueChange,
      className,
      membrane = true,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const machineValue = useControllableMachineProp(
      Array.isArray(value) ? value.map((item) => String(item)) : undefined,
      Array.isArray(defaultValue) ? defaultValue.map((item) => String(item)) : [],
    )

    const { state, send } = useMachine(toggleMachine, {
      value: machineValue,
      type,
      disabled,
      orientation,
      onValueChange,
    })

    const api = connectToggle(state, send)

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-toggle', className)}>
        {items.map((item) => {
          const itemNode = (
            <button
              key={item.value}
              type="button"
              {...api.getItemProps({ value: item.value, disabled: item.disabled })}
              className={cn('uf-toggle-item', 'uf-option', 'uf-control')}
            >
              {item.label}
            </button>
          )
          if (!membrane) return itemNode
          return (
            <span key={`toggle-membrane:${item.value}`} className="uf-membrane">
              {itemNode}
            </span>
          )
        })}
      </div>
    )
  },
)
