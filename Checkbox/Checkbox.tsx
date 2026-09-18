/** Checkbox — a native boolean choice or an indeterminate selection summary. */
import {
  forwardRef,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  checkboxMachine,
  connectCheckbox,
} from '../assets/machines/checkbox.machine'
import { cn } from '../assets/utils'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import {
  useCheckedInput,
  syncCheckedInput,
  type CheckedInputAttributes,
} from '../assets/adapters/react/use-checked-input'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
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

function initialCheckboxState(
  checked: boolean | 'indeterminate',
): 'unchecked' | 'checked' | 'indeterminate' {
  return checked === 'indeterminate'
    ? 'indeterminate'
    : checked
      ? 'checked'
      : 'unchecked'
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const {
      checked,
      defaultChecked = false,
      disabled = false,
      required = false,
      name,
      value = 'on',
      label,
      onCheckedChange,
      onChange,
      className,
      style,
      hidden,
      dir,
      lang,
      title,
      membrane = true,
      fullWidth = false,
      ...nativeProps
    } = props
    const initial = useRef({
      checked: checked ?? defaultChecked,
      defaultChecked,
    })
    const machineConfig = useMemo(
      () => ({
        ...checkboxMachine,
        initial: initialCheckboxState(initial.current.checked),
        context: {
          ...checkboxMachine.context,
          checked: initial.current.checked,
        },
      }),
      [],
    )
    const { state, send, syncContext } = useMachine(machineConfig, {
      checked,
      disabled,
      required,
      name: name ?? '',
      onCheckedChange,
    })
    const api = connectCheckbox(state, send)
    const inputRef = useRef<HTMLInputElement>(null)
    const composedRef = useComposedRefs(inputRef, ref)
    useCheckedInput(inputRef, state.context.checked)
    useFormReset(inputRef, () => {
      const next =
        checked !== undefined ? checked : initial.current.defaultChecked
      syncContext({ checked: next })
      syncCheckedInput(inputRef.current, next)
    })
    const hasLabel = hasSlotContent(label)
    const inputProps = api.getInputProps()
    return (
      <Membrane
        enabled={membrane}
        fullWidth={fullWidth}
        interactive
        target="input"
      >
        <label
          {...api.getRootProps()}
          hidden={hidden}
          dir={dir}
          lang={lang}
          title={title}
          style={style}
          data-has-label={hasLabel ? '' : undefined}
          data-icon-left={hasLabel ? '' : undefined}
          data-icon-only={!hasLabel ? '' : undefined}
          data-full-width={fullWidth || undefined}
          className={cn('uf-checkbox', 'uf-option', 'uf-control', className)}
        >
          <span {...api.getIndicatorProps()} aria-hidden="true">
            {state.context.checked === 'indeterminate' ? (
              <MinusIcon />
            ) : state.context.checked === true ? (
              <CheckOnIcon />
            ) : (
              <CheckOffIcon />
            )}
          </span>
          <input
            {...nativeProps}
            {...inputProps}
            ref={composedRef}
            // Commit both checked properties together while preserving native
            // click rollback. React's controlled restoration precedes rollback.
            checked={undefined}
            defaultChecked={initial.current.checked === true}
            name={name}
            value={value}
            aria-disabled={
              nativeProps['aria-disabled'] ?? inputProps['aria-disabled']
            }
            aria-required={
              nativeProps['aria-required'] ?? inputProps['aria-required']
            }
            hidden={hidden}
            dir={dir}
            lang={lang}
            title={title}
            tabIndex={disabled ? -1 : (nativeProps.tabIndex ?? 0)}
            onChange={(event) => {
              if (event.nativeEvent.defaultPrevented) {
                event.stopPropagation()
                return
              }
              inputProps.onChange(event)
              onChange?.(event)
            }}
          />
          {hasLabel && (
            <Text
              {...api.getLabelProps()}
              as="span"
              inset="none"
              membrane={false}
            >
              {label}
            </Text>
          )}
        </label>
      </Membrane>
    )
  },
)
