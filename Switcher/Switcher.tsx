import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../assets/utils'
import {
  useCheckedInput,
  type CheckedInputAttributes,
} from '../assets/adapters/react/use-checked-input'
import { hasSlotContent } from '../assets/slot-content'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'

export interface SwitcherProps extends CheckedInputAttributes {
  /** Controlled on/off setting. Parent updates do not emit change notifications. */
  checked?: boolean
  /** Uncontrolled initial setting, also restored by form reset. */
  defaultChecked?: boolean
  /** Visible label. Empty content adds no label slot; zero remains visible. */
  label?: ReactNode
  /** Truncate overflowing label text with an ellipsis. By default the full label wraps. */
  truncate?: boolean
  /** User setting change; native activation reports true or false once. */
  onCheckedChange?: (details: { checked: boolean }) => void
  /** Accessible name, including when there is no visible label. */
  'aria-label'?: string
  /** External label element IDs; takes native precedence over aria-label. */
  'aria-labelledby'?: string
  /** External description element IDs. */
  'aria-describedby'?: string
  /** Exclude the switch from activation, focus navigation and form submission. */
  disabled?: boolean
  /** Require the on state for native form validation. */
  required?: boolean
  /** FormData key. An unnamed switch does not contribute a form field. */
  name?: string
  /** Value submitted only when on; it does not control the setting. */
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

/** A native binary setting with a visible on/off track, which takes effect as soon as it is switched. */
export const Switcher = forwardRef<HTMLInputElement, SwitcherProps>(
  function Switcher(
    {
      checked: checkedProp,
      defaultChecked = false,
      onCheckedChange,
      onChange,
      disabled = false,
      required = false,
      value = 'on',
      label,
      truncate = false,
      fullWidth = false,
      membrane = true,
      className,
      style,
      hidden,
      dir,
      lang,
      title,
      ...nativeProps
    },
    ref,
  ) {
    const { checked, inputProps } = useCheckedInput({
      component: 'Switcher',
      checked: checkedProp,
      defaultChecked,
      onCheckedChange,
      onChange,
      ref,
    })
    const part = (name: string) => ({
      'data-scope': 'switcher',
      'data-part': name,
      'data-state': checked ? 'checked' : 'unchecked',
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
          className={cn('uf-switcher', className)}
          data-switch-only={!hasLabel || undefined}
          data-full-width={fullWidth || undefined}
        >
          {hasLabel && (
            <Text
              {...part('label')}
              as="span"
              inset="none"
              membrane={false}
              truncate={truncate}
            >
              {label}
            </Text>
          )}
          <span {...part('track')} aria-hidden="true">
            <span {...part('thumb')} />
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
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            required={required}
            value={value}
          />
        </label>
      </Membrane>
    )
  },
)
