/**
 * Input — text input control.
 *
 * Manages focus state, value changes, and clearing via the input machine.
 *
 * `<Input label="Email" placeholder="you@example.com" />`
 * `<Input value={text} onValueChange={({ value }) => setText(value)} />`
 * `<Input type="number" min={0} max={100} step={1} />`
 * `<Input textLayout="wrap" />`
 */

import { forwardRef, useRef, useCallback, useEffect, useId, useMemo, type AriaAttributes, type AriaRole, type ReactNode, type KeyboardEventHandler, type Ref, type MutableRefObject } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { inputMachine, connectInput } from '../assets/machines/input.machine'
import { cn } from '../assets/utils'
import { CloseIcon } from '../assets/icons'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputType = 'default' | 'text' | 'email' | 'number' | 'date' | 'password'
export type InputTextLayout = 'scroll' | 'wrap'
export type InputLabelOrientation = 'vertical' | 'horizontal'

export interface InputProps {
  /** Current input value. */
  value?: string
  /** components API compatibility: uncontrolled initial value. */
  defaultValue?: string
  /** Native input id. When omitted, a stable React id is generated. */
  id?: string
  /** Native input name. */
  name?: string
  /** Input type. 'default' renders a textarea-like free text. Others render <input type="...">. */
  type?: InputType
  /** Text layout for type="default": 'scroll' (single-line) or 'wrap' (multi-line auto-grow). */
  textLayout?: InputTextLayout
  /** Auto-grow textarea height in wrap mode. */
  autoGrow?: boolean
  /** Disable the input. */
  disabled?: boolean
  /** Make the input read-only. */
  readOnly?: boolean
  /** Label rendered above/beside the input. */
  label?: ReactNode
  /** Description/help text shown below the input. */
  description?: ReactNode
  /** Error message shown below the input. */
  error?: string
  /** Label placement relative to the control. */
  labelOrientation?: InputLabelOrientation
  /** Placeholder text. */
  placeholder?: string
  /** Accessible label when no visible label is provided. */
  ariaLabel?: string
  /** Role applied to the native input or textarea control. */
  controlRole?: AriaRole
  /** Native control aria-controls relationship. */
  ariaControls?: string
  /** Native control aria-activedescendant relationship. */
  ariaActiveDescendant?: string
  /** Native control aria-autocomplete mode. */
  ariaAutoComplete?: AriaAttributes['aria-autocomplete']
  /** Native control aria-expanded state. */
  ariaExpanded?: AriaAttributes['aria-expanded']
  /** Native control aria-haspopup state. */
  ariaHasPopup?: AriaAttributes['aria-haspopup']
  /** Enable/disable spellcheck. */
  spellCheck?: boolean
  /** Optional icon inside the control. */
  icon?: ReactNode
  /** Icon side inside the control. Default: left. */
  iconPosition?: 'left' | 'right'
  /** Stretch the input text area so right-side icons pin to the edge. */
  stretchText?: boolean
  /** Show required indicator (*). */
  required?: boolean
  /** Auto-focus on mount. */
  autoFocus?: boolean
  /** Native browser autocomplete hint. */
  autoComplete?: string
  /** Min value (for type="number"). */
  min?: number | string
  /** Max value (for type="number"). */
  max?: number | string
  /** Step value (for type="number"). */
  step?: number | string
  /** Minimum text length for native validation. */
  minLength?: number
  /** Maximum text length for native validation. */
  maxLength?: number
  /** Native validation pattern for single-line inputs. */
  pattern?: string
  /** Callback when the value changes (machine-based). */
  onValueChange?: (details: { value: string }) => void
  /** Native onChange handler. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Native onBlur handler. */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Native onFocus handler. */
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Native onKeyDown handler. */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>
  /** Ref to the native input or textarea control. */
  controlRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
  /** Outer membrane wrapper around control geometry. */
  membrane?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Input = forwardRef<HTMLDivElement, InputProps>(
  function Input(props, ref) {
    const {
      value,
      defaultValue,
      id,
      name,
      type = 'default',
      textLayout = 'scroll',
      autoGrow = true,
      disabled = false,
      readOnly = false,
      label,
      description,
      error = '',
      labelOrientation = 'vertical',
      placeholder,
      ariaLabel,
      controlRole,
      ariaControls,
      ariaActiveDescendant,
      ariaAutoComplete,
      ariaExpanded,
      ariaHasPopup,
      spellCheck,
      icon,
      iconPosition = 'left',
      stretchText = false,
      required = false,
      autoFocus,
      autoComplete,
      min,
      max,
      step,
      minLength,
      maxLength,
      pattern,
      onValueChange,
      onChange,
      onBlur,
      onFocus,
      onKeyDown,
      controlRef,
      membrane = false,
      className,
    } = props

    const resolvedInitial = value ?? defaultValue ?? ''
    const initialValueRef = useRef(resolvedInitial)
    const inputMachineConfig = useMemo(() => ({
      ...inputMachine,
      context: {
        ...inputMachine.context,
        value: initialValueRef.current,
      },
    }), [])

    const { state, send } = useMachine(inputMachineConfig, {
      type: type === 'default' ? 'text' : type,
      disabled,
      readOnly,
      onValueChange,
    })
    const api = connectInput(state, send)

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
    const setControlRef = useCallback((node: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRef.current = node
      if (typeof controlRef === 'function') {
        controlRef(node)
      } else if (controlRef) {
        ;(controlRef as MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current = node
      }
    }, [controlRef])

    useEffect(() => {
      if (value === undefined) return
      if (state.context.value === value) return
      send({ type: 'SYNC_VALUE', value })
    }, [send, state.context.value, value])

    // Auto-grow textarea in wrap mode
    const resizeToContent = useCallback(() => {
      if (type !== 'default') return
      if (textLayout !== 'wrap') return
      if (!autoGrow) return
      const el = inputRef.current
      if (!el || !(el instanceof HTMLTextAreaElement)) return
      const BASE_H = 32
      try { el.style.height = 'auto' } catch {}
      const next = Math.max(BASE_H, el.scrollHeight || 0)
      try {
        if (next <= BASE_H) el.style.height = ''
        else el.style.height = `${next}px`
      } catch {}
    }, [autoGrow, type, textLayout])

    useEffect(() => {
      if (type !== 'default') return
      const el = inputRef.current
      if (!el || !(el instanceof HTMLTextAreaElement)) return
      if (textLayout === 'scroll' || !autoGrow) {
        try { el.style.height = '' } catch {}
      } else {
        resizeToContent()
      }
    }, [autoGrow, type, textLayout, resizeToContent])

    useEffect(() => { resizeToContent() }, [resizeToContent, value])

    useEffect(() => {
      if (!autoFocus) return
      const el = inputRef.current
      if (el) try { el.focus() } catch {}
    }, [autoFocus, type])

    const isTextarea = type === 'default'
    const htmlType = type === 'default' ? undefined : type
    const generatedInputId = useId()
    const inputId = id ?? generatedInputId
    const descriptionId = description != null ? `${inputId}-description` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined
    const isInvalid = !!error

    const rootProps = api.getRootProps()
    const labelProps = api.getLabelProps()
    const inputProps = api.getInputProps()

    const iconNode = icon ? (
      <span className="uf-input__icon" data-position={iconPosition}>
        {typeof icon === 'string' ? <Icon name={icon as any} /> : icon}
      </span>
    ) : null

    const controlEl = isTextarea && textLayout === 'wrap' ? (
      <textarea
        ref={setControlRef as React.Ref<HTMLTextAreaElement>}
        {...(inputProps as any)}
        data-part={inputProps['data-part'] ?? 'textarea'}
        data-text-layout="wrap"
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={controlRole}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActiveDescendant}
        aria-autocomplete={ariaAutoComplete}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        spellCheck={spellCheck}
        required={required}
        name={name}
        id={inputId}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined}
        autoFocus={autoFocus}
        minLength={minLength}
        maxLength={maxLength}
        rows={1}
        wrap="soft"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          inputProps.onChange(e)
          onChange?.(e)
          resizeToContent()
        }}
        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          inputProps.onBlur()
          onBlur?.(e)
        }}
        onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          inputProps.onFocus()
          onFocus?.(e)
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          ;(onKeyDown as KeyboardEventHandler<HTMLTextAreaElement> | undefined)?.(e)
        }}
        onInput={resizeToContent as any}
      />
    ) : (
      <input
        ref={setControlRef as React.Ref<HTMLInputElement>}
        {...(inputProps as any)}
        type={htmlType}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={controlRole}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActiveDescendant}
        aria-autocomplete={ariaAutoComplete}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        spellCheck={spellCheck}
        required={required}
        name={name}
        id={inputId}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined}
        autoFocus={autoFocus}
        min={min as any}
        max={max as any}
        step={step as any}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        data-text-layout={isTextarea ? 'scroll' : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          inputProps.onChange(e)
          onChange?.(e)
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          inputProps.onBlur()
          onBlur?.(e)
        }}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
          inputProps.onFocus()
          onFocus?.(e)
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          ;(onKeyDown as KeyboardEventHandler<HTMLInputElement> | undefined)?.(e)
        }}
      />
    )

    const controlNode = (
      <span className="uf-input__control" data-stretch-text={stretchText ? '' : undefined}>
        {iconNode}
        {controlEl}
        <button type="button" className="uf-input__clear" {...api.getClearProps()}>
          <CloseIcon />
        </button>
      </span>
    )

    return (
      <div
        ref={ref}
        {...rootProps}
        data-label-orientation={labelOrientation}
        data-icon-position={icon ? iconPosition : undefined}
        data-invalid={isInvalid || undefined}
        className={cn('uf-input', className)}
      >
        {label != null && (
          <Text {...(labelProps as any)} as="label" variant="label" htmlFor={inputId}>
            {label}
            {required && <span className="uf-input__required">*</span>}
          </Text>
        )}
        {membrane ? (
          <span className="uf-membrane uf-membrane--full">{controlNode}</span>
        ) : controlNode}
        {description != null && (
          <div id={descriptionId} className="uf-input__description uf-text-body">
            {(typeof description === 'string' || typeof description === 'number') ? (
              <Text as="span" size="xs" inset="none" membrane={false}>
                {description}
              </Text>
            ) : description}
          </div>
        )}
        {error ? (
          <div id={errorId} className="uf-input__error uf-text-body" role="alert" aria-live="polite">
            <Text as="span" size="xs" inset="none" membrane={false} text={error} />
          </div>
        ) : null}
      </div>
    )
  },
)
