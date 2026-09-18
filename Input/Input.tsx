/** Input — a native text field with labels, validation, and optional multiline sizing. */
import {
  forwardRef,
  useRef,
  useId,
  useMemo,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { inputMachine, connectInput } from '../assets/machines/input.machine'
import { cn } from '../assets/utils'
import { hasSlotContent } from '../assets/slot-content'
import { CloseIcon } from '../assets/icons'
import { Icon } from '../Icon/Icon'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useTextareaAutoGrow } from '../assets/adapters/react/use-textarea-auto-grow'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'

export type InputType =
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
export type InputLabelOrientation = 'vertical' | 'horizontal'
type InputControl = HTMLInputElement | HTMLTextAreaElement

interface InputSharedProps extends Omit<
  InputHTMLAttributes<InputControl>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'min'
  | 'max'
  | 'step'
  | 'pattern'
  | 'list'
  | 'multiple'
  | 'checked'
  | 'defaultChecked'
  | 'size'
  | 'height'
  | 'width'
  | 'accept'
  | 'capture'
  | 'src'
  | 'alt'
  | 'formAction'
  | 'formEncType'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
> {
  /** Hint while empty; use label or aria-label for the accessible name. */
  placeholder?: string
  /** Exclude the field from editing, focus navigation, and form submission. */
  disabled?: boolean
  /** Prevent edits while preserving focus, selection, and form submission. */
  readOnly?: boolean
  /** Require a value for native form validation and show the required indicator. */
  required?: boolean
  /** Field key used by native FormData. */
  name?: string
  /** Browser spelling assistance for editable text. */
  spellCheck?: boolean
  /** Focus the control on mount. */
  autoFocus?: boolean
  /** Native autocomplete token, such as email or current-password. */
  autoComplete?: string
  /** Minimum length for native text validation. */
  minLength?: number
  /** Maximum length for native text entry. */
  maxLength?: number
  /** Controlled value. User edits notify callbacks; the parent owns the result. */
  value?: string
  /** Uncontrolled initial value, also restored by form reset. */
  defaultValue?: string
  /** Visible label associated with the native control. */
  label?: ReactNode
  /** Help associated with the native control. Empty content adds no spacing or ARIA id. */
  description?: ReactNode
  /** Validation message; also marks the control invalid unless aria-invalid is explicit. */
  error?: ReactNode
  /** Label placement; has no effect without a label. */
  labelOrientation?: InputLabelOrientation
  /** Decorative icon from the registry or a custom element. */
  icon?: ReactNode
  /** Icon at inline start or end, following the control's text direction. */
  iconPosition?: 'start' | 'end'
  /** Offer a clear action for a nonempty, editable field. */
  clearable?: boolean
  /** Accessible name of the clear action. */
  clearLabel?: string
  /** Value notification for user edits, including clear; parent updates and reset are silent. */
  onValueChange?: (details: { value: string }) => void
  /** Outer spacing around the native control, independent of label and help. */
  membrane?: boolean
  /** Class on the outer field layout. Native attributes and events target the control. */
  className?: string
  /** Style of the outer field layout; use scoped CSS to style individual parts. */
  style?: CSSProperties
}

export type InputProps = InputSharedProps &
  (
    | {
        multiline?: false
        /** Native single-line type. Multiline fields always use textarea text semantics. */
        type?: InputType
        rows?: never
        autoGrow?: never
        /** Lower bound for numeric or temporal input types. */
        min?: number | string
        /** Upper bound for numeric or temporal input types. */
        max?: number | string
        /** Numeric or temporal increment; use any to allow arbitrary precision. */
        step?: number | string
        /** Native regular expression for single-line text validation. */
        pattern?: string
        /** Datalist id for native single-line suggestions. */
        list?: string
        /** Allow several addresses when type is email. */
        multiple?: boolean
      }
    | {
        /** Use a native textarea, including newline entry and textarea form behavior. */
        multiline: true
        type?: 'text'
        min?: never
        max?: never
        step?: never
        pattern?: never
        list?: never
        multiple?: never
        /** Minimum visible rows. A fixed row count when autoGrow is false. */
        rows?: number
        /** Grow and shrink a multiline field with its content and available width. */
        autoGrow?: boolean
      }
  )

export const Input = forwardRef<InputControl, InputProps>(
  function Input(props, ref) {
    const {
      value,
      defaultValue,
      id,
      type = 'text',
      multiline = false,
      rows = 1,
      autoGrow = true,
      disabled = false,
      readOnly = false,
      required = false,
      label,
      description,
      error,
      labelOrientation = 'vertical',
      icon,
      iconPosition = 'start',
      clearable = true,
      clearLabel = 'Clear input',
      onValueChange,
      onChange,
      onFocus,
      onBlur,
      membrane = false,
      className,
      style,
      hidden,
      dir,
      lang,
      min,
      max,
      step,
      pattern,
      list,
      multiple,
      'aria-describedby': externalDescription,
      'aria-invalid': externalInvalid,
      ...nativeProps
    } = props
    const isTextarea = multiline && type === 'text'
    const visibleRows = Number.isFinite(rows)
      ? Math.max(1, Math.trunc(rows))
      : 1
    const initialValue = useRef(value ?? defaultValue ?? '')
    const machine = useMemo(
      () => ({
        ...inputMachine,
        context: { ...inputMachine.context, value: initialValue.current },
      }),
      [],
    )
    const { state, send, syncContext } = useMachine(machine, {
      value,
      type,
      disabled,
      readOnly,
      onValueChange,
    })
    const api = connectInput(state, send)
    const inputRef = useRef<InputControl | null>(null)
    const controlRef = useComposedRefs(inputRef, ref)
    const resetValue = useRef(defaultValue ?? '')
    useFormReset(inputRef, () => {
      const next = value ?? resetValue.current
      syncContext({ value: next })
      if (inputRef.current) inputRef.current.value = next
    })
    useTextareaAutoGrow(inputRef, isTextarea && autoGrow)

    const generatedId = useId()
    const inputId = id ?? generatedId
    const hasLabel = hasSlotContent(label)
    const hasDescription = hasSlotContent(description)
    const hasError = hasSlotContent(error)
    const hasIcon = hasSlotContent(icon)
    const descriptionId = hasDescription ? `${inputId}-description` : undefined
    const errorId = hasError ? `${inputId}-error` : undefined
    const describedBy =
      [
        ...new Set(
          [externalDescription, descriptionId, errorId]
            .filter(Boolean)
            .join(' ')
            .split(/\s+/)
            .filter(Boolean),
        ),
      ].join(' ') || undefined
    const invalid = externalInvalid ?? (hasError || undefined)
    const isInvalid =
      invalid != null && invalid !== false && invalid !== 'false'
    const { type: _machineType, ...inputProps } = api.getInputProps()
    const controlProps = {
      ...nativeProps,
      ...inputProps,
      id: inputId,
      hidden,
      dir,
      lang,
      required,
      'aria-describedby': describedBy,
      'aria-invalid': invalid,
      'aria-disabled':
        nativeProps['aria-disabled'] ?? inputProps['aria-disabled'],
      'aria-readonly':
        nativeProps['aria-readonly'] ?? inputProps['aria-readonly'],
      onChange(event: ChangeEvent<InputControl>) {
        inputProps.onChange(event)
        onChange?.(event)
      },
      onFocus(event: React.FocusEvent<InputControl>) {
        inputProps.onFocus()
        onFocus?.(event)
      },
      onBlur(event: React.FocusEvent<InputControl>) {
        inputProps.onBlur()
        onBlur?.(event)
      },
    }

    const clear = () => {
      const control = inputRef.current
      if (
        !control ||
        control.disabled ||
        control.readOnly ||
        !clearable ||
        !control.value
      )
        return
      const view = control.ownerDocument.defaultView
      if (!view) return
      // Use the native edit path so both React onChange and onValueChange receive
      // the control as their source, including when the parent owns the value.
      const prototype =
        control.tagName === 'TEXTAREA'
          ? view.HTMLTextAreaElement.prototype
          : view.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
        control,
        '',
      )
      control.dispatchEvent(new view.Event('input', { bubbles: true }))
      control.focus()
    }
    const clearProps = api.getClearProps()

    return (
      <div
        {...api.getRootProps()}
        data-label-orientation={hasLabel ? labelOrientation : undefined}
        data-icon-position={hasIcon ? iconPosition : undefined}
        data-invalid={isInvalid || undefined}
        className={cn('uf-input', className)}
        style={style}
        hidden={hidden}
        dir={dir}
        lang={lang}
        aria-hidden={nativeProps['aria-hidden']}
      >
        {hasLabel && (
          <Text
            {...api.getLabelProps()}
            as="label"
            variant="label"
            htmlFor={inputId}
            membrane={false}
          >
            {label}
            {required && (
              <span className="uf-input__required" aria-hidden="true">
                *
              </span>
            )}
          </Text>
        )}
        <Membrane
          enabled={membrane}
          as="div"
          fullWidth
          interactive
          target="input, textarea"
        >
          <span className="uf-input__control">
            {hasIcon && (
              <span
                className="uf-input__icon"
                data-position={iconPosition}
                aria-hidden="true"
              >
                {typeof icon === 'string' ? <Icon name={icon} /> : icon}
              </span>
            )}
            {isTextarea ? (
              <textarea
                {...controlProps}
                ref={controlRef}
                data-part="textarea"
                data-auto-grow={autoGrow ? '' : undefined}
                rows={visibleRows}
                wrap="soft"
                style={
                  { '--face-runtime-input-rows': visibleRows } as CSSProperties
                }
              />
            ) : (
              <input
                {...controlProps}
                ref={controlRef}
                type={type}
                min={min}
                max={max}
                step={step}
                pattern={pattern}
                list={list}
                multiple={multiple}
              />
            )}
            <button
              {...clearProps}
              type="button"
              className="uf-input__clear"
              hidden={!clearable || clearProps.hidden}
              aria-label={clearLabel.trim() || 'Clear input'}
              onClick={clear}
            >
              <CloseIcon />
            </button>
          </span>
        </Membrane>
        {hasDescription && (
          <div
            id={descriptionId}
            className="uf-input__description uf-text-body"
          >
            {description}
          </div>
        )}
        {hasError && (
          <div
            id={errorId}
            className="uf-input__error uf-text-body"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    )
  },
)
