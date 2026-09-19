/** Checkbox — a native boolean choice or an indeterminate selection summary. */
import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../assets/utils'
import {
  useCheckedInput,
  type CheckedInputAttributes,
} from '../assets/adapters/react/use-checked-input'
import { hasSlotContent } from '../assets/slot-content'
import { Text } from '../Text/Text'
import { CheckOnIcon, CheckOffIcon, MinusIcon } from '../assets/icons'
import { Membrane } from '../assets/adapters/react/Membrane'

export interface CheckboxProps extends CheckedInputAttributes {
  /** Controlled selection. Indeterminate summarizes a partially selected collection; it does not submit a value. */
  checked?: boolean | 'indeterminate'
  /** Uncontrolled initial selection, also restored by form reset. */
  defaultChecked?: boolean | 'indeterminate'
  /** Visible label content. Empty content adds no label slot; zero remains visible. */
  label?: ReactNode
  /** User selection notification; parent updates and form reset are silent. Native activation produces true or false. */
  onCheckedChange?: (details: { checked: boolean | 'indeterminate' }) => void
  /** Accessible name, including when there is no visible label. */
  'aria-label'?: string
  /** External label element IDs; takes native precedence over aria-label. */
  'aria-labelledby'?: string
  /** External description element IDs. */
  'aria-describedby'?: string
  /** Exclude the checkbox from activation, focus navigation and form submission. */
  disabled?: boolean
  /** Require an actual checked value for native form validation; mixed is not checked. */
  required?: boolean
  /** FormData key. Without a name the checkbox does not contribute a field. */
  name?: string
  /** Value submitted only when checked. It does not control selection. */
  value?: string
  /** ID of an external native form that owns the input. */
  form?: string
  /** Focus the native input on mount. */
  autoFocus?: boolean
  /** Expand the membrane and clickable label to the container width. */
  fullWidth?: boolean
  /** Shared outer spacing; toggling it preserves input identity and state. */
  membrane?: boolean
  /** CSS class on the visual label. Other native attributes and events target the input. */
  className?: string
  /** Style on the visual label; use scoped CSS for individual parts. */
  style?: CSSProperties
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      checked: checkedProp,
      defaultChecked = false,
      onCheckedChange,
      onChange,
      disabled = false,
      required = false,
      value = 'on',
      label,
      className,
      style,
      hidden,
      dir,
      lang,
      title,
      membrane = true,
      fullWidth = false,
      ...nativeProps
    },
    ref,
  ) {
    const { checked, inputProps } = useCheckedInput({
      component: 'Checkbox',
      checked: checkedProp,
      defaultChecked,
      onCheckedChange,
      onChange,
      ref,
    })
    const state =
      checked === 'indeterminate'
        ? 'indeterminate'
        : checked
          ? 'checked'
          : 'unchecked'
    const part = (name: string) => ({
      'data-scope': 'checkbox',
      'data-part': name,
      'data-state': state,
      'data-disabled': disabled || undefined,
    })
    const hasLabel = hasSlotContent(label)
    const shared = { hidden, dir, lang, title }
    return (
      <Membrane
        enabled={membrane}
        fullWidth={fullWidth}
        interactive
        target="input"
      >
        <label
          {...part('root')}
          {...shared}
          style={style}
          data-has-label={hasLabel ? '' : undefined}
          data-icon-left={hasLabel ? '' : undefined}
          data-icon-only={!hasLabel ? '' : undefined}
          data-full-width={fullWidth || undefined}
          className={cn('uf-checkbox', 'uf-option', 'uf-control', className)}
        >
          <span {...part('indicator')} aria-hidden="true">
            {checked === 'indeterminate' ? (
              <MinusIcon />
            ) : checked ? (
              <CheckOnIcon />
            ) : (
              <CheckOffIcon />
            )}
          </span>
          <input
            // Explicit, so WebKit's Tab order includes the checkbox.
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            aria-required={required || undefined}
            {...nativeProps}
            {...part('input')}
            {...shared}
            {...inputProps}
            role="checkbox"
            aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
            disabled={disabled}
            required={required}
            value={value}
          />
          {hasLabel && (
            <Text {...part('label')} as="span" inset="none" membrane={false}>
              {label}
            </Text>
          )}
        </label>
      </Membrane>
    )
  },
)
