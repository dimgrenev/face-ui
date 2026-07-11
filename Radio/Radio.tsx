/**
 * Radio — flat radio group with options prop.
 *
 * `<Radio options={[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]} />`
 */

import { forwardRef, useEffect, useRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { radioMachine, connectRadio } from '../assets/machines/radio.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { RadioOnIcon, RadioOffIcon } from '../assets/icons'
import type { FormControlProps } from '../assets/form-control-props'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadioOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface RadioProps extends FormControlProps {
  /** Radio options to render. */
  options?: RadioOption[]
  /** Currently selected value. */
  value?: string | null
  /** Uncontrolled initial selected value. */
  defaultValue?: string
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Callback when value changes. */
  onValueChange?: (details: { value: string }) => void
  /** Accessible label for the radio group (role="radiogroup" requires a name). */
  ariaLabel?: string
  /** ID of an element that labels the radio group. */
  ariaLabelledBy?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Radio = forwardRef<HTMLDivElement, RadioProps>(
  function Radio(props, ref) {
    const {
      options: rawOptions,
      value,
      defaultValue,
      name,
      disabled = false,
      required = false,
      orientation,
      ariaLabel,
      ariaLabelledBy,
      onValueChange,
      className,
      membrane = true,
    } = props

    const effectiveOrientation = orientation ?? 'vertical'
    const options = Array.isArray(rawOptions) ? rawOptions : []
    const itemOrder = options.map((option) => option.value)
    const disabledValues = options.filter((option) => option.disabled).map((option) => option.value)
    const isControlled = value !== undefined
    const machineValue = useControllableMachineProp(
      isControlled ? value ?? null : undefined,
      defaultValue ?? null,
    )

    const { state, send } = useMachine(radioMachine, {
      value: machineValue,
      itemOrder,
      disabledValues,
      disabled,
      orientation: effectiveOrientation,
      onValueChange: ((details: { value: string }) => {
        if (isControlled && details.value === value) return
        onValueChange?.(details)
      }) as any,
    })

    const api = connectRadio(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const targetValue = state.context.focusedValue
      if (!targetValue) return
      const root = rootRef.current
      if (!root) return
      const items = root.querySelectorAll<HTMLElement>('[role="radio"][data-value]')
      for (const item of items) {
        if (item.getAttribute('data-value') !== targetValue) continue
        if (item !== document.activeElement) {
          try { item.focus() } catch {}
        }
        break
      }
    }, [state.context.focusedValue])

    return (
      <div
        ref={(node) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node
        }}
        {...api.getRootProps()}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-orientation={effectiveOrientation}
        data-disabled={disabled ? '' : undefined}
        className={cn('uf-radio', className)}
      >
        {options.map((option) => {
          const optionDisabled = disabled || option.disabled
          const itemVisualProps = { ...(api.getItemProps({ value: option.value, disabled: option.disabled }) as any) }
          const optionNode = (
            <label
              key={option.value}
              {...itemVisualProps}
              data-value={option.value}
              data-icon-left=""
              className={cn(
                'uf-radio-option',
                'uf-option',
                'uf-control',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={state.context.value === option.value}
                readOnly
                disabled={optionDisabled}
                tabIndex={-1}
                required={required}
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
              />
              <span className="uf-radio-indicator" {...api.getIndicatorProps()}>
                {state.context.value === option.value ? <RadioOnIcon /> : <RadioOffIcon />}
              </span>
              <Text as="span" inset="none" membrane={false} className="uf-radio-text">
                {option.label}
              </Text>
            </label>
          )
          if (!membrane) return optionNode
          const isVertical = effectiveOrientation === 'vertical'
          return (
            <span
              key={`membrane:${option.value}`}
              className={cn('uf-membrane', isVertical && 'uf-membrane--full')}
            >
              {optionNode}
            </span>
          )
        })}
      </div>
    )
  },
)
