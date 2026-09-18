/** Radio — a flat group of native controls for one mutually exclusive choice. */
import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  radioMachine,
  connectRadio,
  getRadioNavigationValue,
} from '../assets/machines/radio.machine'
import { cn } from '../assets/utils'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { Text } from '../Text/Text'
import { RadioOnIcon, RadioOffIcon } from '../assets/icons'
import { Membrane } from '../assets/adapters/react/Membrane'

export interface RadioOption extends Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> {
  /** Unique submission value within this group. An empty string is a valid choice. */
  value: string
  /** Visible label; native option ARIA attributes can supply an alternate name or description. */
  label: ReactNode
  /** Prevent choosing this option while retaining an existing selection. */
  disabled?: boolean
}
interface RadioBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'role'
  | 'aria-orientation'
> {
  /** Visible options in navigation order. Empty or missing options render an empty group. */
  options?: ReadonlyArray<RadioOption>
  /** Controlled selection; null means no selection. Parent updates do not emit a change. */
  value?: string | null
  /** Uncontrolled initial selection, restored by form reset. */
  defaultValue?: string
  /** Visual arrangement and ARIA orientation. Both arrow pairs remain available. */
  orientation?: 'horizontal' | 'vertical'
  /** Notify once for a user selection; reselecting, parent updates and reset are silent. */
  onValueChange?: (details: { value: string }) => void
  /** Focus the selected enabled option, or the first enabled option, on mount. */
  autoFocus?: boolean
  /** Accessible group name when there is no external visible heading. */
  'aria-label'?: string
  /** Ids of visible headings that name this group. */
  'aria-labelledby'?: string
  /** Disable every option; native inputs leave focus navigation and form submission. */
  disabled?: boolean
  /** Id of an external native form that owns all options. */
  form?: string
  /** Shared outer spacing around each option; preserves native controls when toggled. */
  membrane?: boolean
}
export type RadioProps = RadioBaseProps &
  (
    | {
        /** Nonempty native group and FormData key; use a distinct name for each independent group in a form. */
        name: string
        /** Require a selection before submission. Native group validation requires a nonempty name. */
        required?: boolean
      }
    | {
        /** Omit to keep the group out of FormData. */
        name?: undefined
        /** A required native radio group must have a nonempty name. */
        required?: false
      }
  )

export const Radio = forwardRef<HTMLDivElement, RadioProps>(
  function Radio(props, ref) {
    const {
      options: rawOptions,
      value,
      defaultValue,
      name,
      form,
      disabled = false,
      required = false,
      autoFocus = false,
      orientation = 'vertical',
      onValueChange,
      className,
      membrane = true,
      ...nativeProps
    } = props
    const options = Array.isArray(rawOptions) ? rawOptions : []
    const machineValue = useControllableMachineProp(value, defaultValue ?? null)
    const { state, send, syncContext } = useMachine(radioMachine, {
      value: machineValue,
      itemOrder: options.map((option) => option.value),
      disabledValues: options
        .filter((option) => option.disabled)
        .map((option) => option.value),
      disabled,
      orientation,
      onValueChange,
    })
    const api = connectRadio(state, send)
    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const formInputRef = useRef<HTMLInputElement>(null)
    const resetValue = useRef(defaultValue ?? null)
    useFormReset(formInputRef, () => {
      const next = value !== undefined ? value : resetValue.current
      syncContext({ value: next })
      rootRef.current
        ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
        .forEach((input) => {
          input.checked = input.value === next
        })
    })
    useEffect(() => {
      if (!form || !required) return
      // Firefox can cache an empty required group's validity before an external
      // form later in the DOM is connected. Refresh after the complete commit.
      rootRef.current
        ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
        .forEach((input) => {
          input.required = false
          input.required = true
        })
    }, [form, required, options])

    const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
      nativeProps.onKeyDown?.(event)
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return
      const control = event.target as HTMLInputElement
      if (
        control.tagName !== 'INPUT' ||
        control.type !== 'radio' ||
        control.disabled ||
        control.closest('[data-scope="radio"][data-part="root"]') !==
          rootRef.current
      )
        return
      const rtl =
        control.ownerDocument.defaultView?.getComputedStyle(control)
          .direction === 'rtl'
      const direction =
        event.key === 'ArrowDown'
          ? 1
          : event.key === 'ArrowUp'
            ? -1
            : event.key === 'ArrowRight'
              ? rtl
                ? -1
                : 1
              : event.key === 'ArrowLeft'
                ? rtl
                  ? 1
                  : -1
                : null
      if (direction === null) return
      event.preventDefault()
      const nextValue = getRadioNavigationValue(
        state.context,
        control.value,
        direction,
      )
      if (nextValue === undefined) return
      const next = [
        ...(rootRef.current?.querySelectorAll<HTMLInputElement>(
          'input[type="radio"]',
        ) ?? []),
      ].find((input) => input.value === nextValue)
      // Native activation keeps keyboard and pointer on one change/event path.
      // Space and Enter retain their browser behavior.
      next?.focus()
      next?.click()
    }

    return (
      <div
        {...nativeProps}
        {...api.getRootProps()}
        ref={composedRef}
        onKeyDown={navigate}
        aria-disabled={nativeProps['aria-disabled'] ?? (disabled || undefined)}
        aria-required={nativeProps['aria-required'] ?? (required || undefined)}
        className={cn('uf-radio', className)}
      >
        {options.map((option, index) => {
          const {
            value: optionValue,
            label,
            disabled: optionDisabled,
            ...optionNativeProps
          } = option
          const item = { value: optionValue, disabled: optionDisabled }
          const inputProps = api.getInputProps(item)
          return (
            <Membrane
              key={optionValue}
              enabled={membrane}
              fullWidth={orientation === 'vertical'}
              interactive
              target="input"
            >
              <label
                {...api.getItemProps(item)}
                data-icon-left=""
                className="uf-radio-option uf-option uf-control"
              >
                <input
                  {...optionNativeProps}
                  {...inputProps}
                  ref={index === 0 ? formInputRef : undefined}
                  type="radio"
                  name={name}
                  form={form}
                  value={optionValue}
                  checked={state.context.value === optionValue}
                  disabled={disabled || optionDisabled}
                  required={required}
                  onKeyDown={undefined}
                  autoFocus={autoFocus && inputProps.tabIndex === 0}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clip: 'rect(0,0,0,0)',
                    whiteSpace: 'nowrap',
                    borderWidth: 0,
                  }}
                />
                <span
                  className="uf-radio-indicator"
                  {...api.getIndicatorProps()}
                  aria-hidden="true"
                >
                  {state.context.value === optionValue ? (
                    <RadioOnIcon />
                  ) : (
                    <RadioOffIcon />
                  )}
                </span>
                <Text
                  {...api.getLabelProps(item)}
                  as="span"
                  inset="none"
                  membrane={false}
                  className="uf-radio-text"
                >
                  {label}
                </Text>
              </label>
            </Membrane>
          )
        })}
      </div>
    )
  },
)
