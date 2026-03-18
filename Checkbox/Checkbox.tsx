/**
 * Checkbox — form control for boolean/indeterminate selection.
 *
 * `<Checkbox label="Accept terms" />`
 * `<Checkbox checked disabled />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { checkboxMachine, connectCheckbox } from '../assets/machines/checkbox.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { CheckOnIcon, CheckOffIcon, MinusIcon } from '../assets/icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckboxProps {
  /** Checked state (boolean or 'indeterminate'). */
  checked?: boolean | 'indeterminate'
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean | 'indeterminate'
  /** Disabled state. */
  disabled?: boolean
  /** Mark as required. */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Label content. */
  label?: ReactNode
  /** Callback when checked state changes. */
  onCheckedChange?: (details: { checked: boolean | 'indeterminate' }) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper (+1px outside control geometry). */
  membrane?: boolean
}

interface CheckboxLegacyProps {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const legacyProps = props as CheckboxProps & CheckboxLegacyProps
    const {
      checked,
      defaultChecked = false,
      disabled = false,
      required = false,
      name = '',
      label,
      onCheckedChange,
      className,
      membrane = true,
    } = props
    const machineChecked = useControllableMachineProp(
      checked !== undefined ? checked : undefined,
      defaultChecked,
    )

    const { state, send } = useMachine(checkboxMachine, {
      checked: machineChecked,
      disabled,
      required,
      name,
      onCheckedChange: ((details: { checked: boolean | 'indeterminate' }) => {
        try { onCheckedChange?.(details) } catch {}
      }) as any,
    })

    const api = connectCheckbox(state, send)

    const hasLabel = label != null && String(label).trim().length > 0
    const controlVisualProps = { ...(api.getControlProps() as any) }
    delete controlVisualProps.role
    delete controlVisualProps.tabIndex
    delete controlVisualProps.onClick
    delete controlVisualProps.onKeyDown
    const labelVisualProps = { ...(api.getLabelProps() as any) }
    delete labelVisualProps.onClick

    const rootNode = (
      <label
        ref={ref}
        {...api.getRootProps()}
        data-has-label={hasLabel ? '' : undefined}
        data-icon-left={hasLabel ? '' : undefined}
        data-icon-only={!hasLabel ? '' : undefined}
        className={cn(
          'uf-checkbox',
          'uf-option',
          'uf-control',
          !hasLabel && 'uf-checkbox--iconOnly',
          className,
        )}
      >
        <span {...controlVisualProps}>
          {state.matches('indeterminate')
            ? <MinusIcon />
            : state.matches('checked')
              ? <CheckOnIcon />
              : <CheckOffIcon />}
        </span>
        <input
          {...api.getHiddenInputProps()}
          onChange={(event) => {
            try { (api.getHiddenInputProps() as any).onChange?.(event) } catch {}
            try { legacyProps.onChange?.(event) } catch {}
          }}
        />
        {hasLabel && (
          <Text as="span" inset="none" membrane={false} {...labelVisualProps}>
            {label}
          </Text>
        )}
      </label>
    )

    if (!membrane) return rootNode
    return <span className="uf-membrane">{rootNode}</span>
  },
)
