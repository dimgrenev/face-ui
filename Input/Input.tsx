import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { hasSlotContent } from '../assets/slot-content'
import { CloseIcon } from '../assets/icons'
import { Icon } from '../Icon/Icon'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useTextareaAutoGrow } from '../assets/adapters/react/use-textarea-auto-grow'
import { Membrane } from '../assets/adapters/react/Membrane'
import {
  FieldLayout,
  useField,
  type FieldProps,
} from '../assets/internal/field'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { readNumber } from '../assets/runtime/props'

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
type InputControl = HTMLInputElement | HTMLTextAreaElement

/** Names of Input's own controls. */
export type InputLabels = Pick<CommonLabels, 'clear'>
const defaultLabels: InputLabels = Object.freeze({ clear: 'Clear input' })

interface InputSharedProps
  extends
    FieldProps,
    Omit<
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
  /** Decorative icon from the registry or a custom element. */
  icon?: ReactNode
  /** Icon at inline start or end, following the control's text direction. */
  iconPosition?: 'start' | 'end'
  /** Offer a clear action for a nonempty, editable field. */
  clearable?: boolean
  /** Accessible names of the field's own controls. */
  labels?: Partial<InputLabels>
  /** Value notification for user edits, including clear; parent updates and reset are silent. */
  onValueChange?: (details: { value: string }) => void
  /** Stretch the field to its container; false keeps the control's native width. */
  fullWidth?: boolean
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
        /** Use a native textarea, including newline entry and textarea form behavior. */
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
        /** Native single-line type. Multiline fields always use textarea text semantics. */
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

/** A native text field with a label, help and error text, an optional clear action and multiline sizing. */
export const Input = forwardRef<InputControl, InputProps>(
  function Input(props, ref) {
    const {
      value: valueProp,
      defaultValue = '',
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
      labelPosition,
      icon,
      iconPosition = 'start',
      clearable = true,
      labels,
      onValueChange,
      onChange,
      fullWidth = true,
      membrane = true,
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
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...nativeProps
    } = props
    const [value, setValue, replaceValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: (next: string) => onValueChange?.({ value: next }),
      name: ['Input', 'value'],
    })
    const field = useField({
      id,
      label,
      description,
      error,
      labelPosition,
      labelable: true,
      required,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
    })
    const isTextarea = multiline && type === 'text'
    const inputRef = useRef<InputControl | null>(null)
    const controlRef = useComposedRefs(inputRef, ref)
    useFormReset(inputRef, () => replaceValue())
    useTextareaAutoGrow(inputRef, isTextarea && autoGrow)
    // dir="auto" resolves from the typed text. The icon and clear button follow it through a
    // dir attribute: builds lower :dir() to :lang(), which cannot see a direction from the value.
    const [autoDirection, setAutoDirection] = useState<string>()
    useIsomorphicLayoutEffect(() => {
      const control = inputRef.current
      setAutoDirection(
        (dir === 'auto' && control && getComputedStyle(control).direction) ||
          undefined,
      )
    }, [dir, value])

    const hasIcon = hasSlotContent(icon)
    const clearName = resolveLabels(defaultLabels, labels, 'Input').clear
    const visibleRows = isTextarea
      ? readNumber('Input', 'rows', rows, 1, { integer: true, min: 1 })
      : 1
    const canClear = clearable && !disabled && !readOnly && value !== ''
    const controlProps = {
      'aria-disabled': disabled || undefined,
      'aria-readonly': readOnly || undefined,
      ...nativeProps,
      ...field.controlProps,
      'aria-invalid': ariaInvalid ?? (field.invalid || undefined),
      'data-scope': 'input',
      hidden,
      dir,
      lang,
      disabled,
      readOnly,
      required,
      value,
      ref: controlRef,
      onChange: composeHandlers(onChange, (event: ChangeEvent<InputControl>) =>
        setValue(event.currentTarget.value),
      ),
    }

    const clear = () => {
      const control = inputRef.current
      if (!control || !canClear) return
      const view = control.ownerDocument.defaultView!
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

    return (
      <div
        {...field.rootProps}
        data-scope="input"
        data-part="root"
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-icon-position={hasIcon ? iconPosition : undefined}
        data-full-width={fullWidth || undefined}
        className={cn('uf-field', 'uf-input', className)}
        style={style}
        hidden={hidden}
        dir={dir}
        lang={lang}
        aria-hidden={nativeProps['aria-hidden']}
      >
        <FieldLayout field={field}>
          <Membrane
            enabled={membrane}
            as="div"
            fullWidth={fullWidth}
            interactive
            target="input, textarea"
          >
            <span className="uf-input__control" dir={autoDirection}>
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
                  data-part="input"
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
                type="button"
                // Explicit, so WebKit's Tab order includes the button.
                tabIndex={0}
                data-scope="input"
                data-part="clear"
                className="uf-input__clear"
                hidden={!canClear}
                aria-label={clearName}
                onClick={clear}
              >
                <CloseIcon />
              </button>
            </span>
          </Membrane>
        </FieldLayout>
      </div>
    )
  },
)
