/** Switcher — a native binary setting with a visible on/off track. */
import {
  forwardRef,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  switcherMachine,
  connectSwitcher,
} from '../assets/machines/switcher.machine'
import { cn } from '../assets/utils'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import {
  useCheckedInput,
  syncCheckedInput,
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

export const Switcher = forwardRef<HTMLInputElement, SwitcherProps>(
  function Switcher(props, ref) {
    const {
      checked,
      defaultChecked = false,
      disabled = false,
      required = false,
      name,
      value = 'on',
      label,
      truncate = false,
      fullWidth = false,
      membrane = true,
      onCheckedChange,
      onChange,
      className,
      style,
      hidden,
      dir,
      lang,
      title,
      ...nativeProps
    } = props
    const initial = useRef({
      checked: checked ?? defaultChecked,
      defaultChecked,
    })
    const machineConfig = useMemo(
      () => ({
        ...switcherMachine,
        initial: initial.current.checked
          ? ('checked' as const)
          : ('unchecked' as const),
        context: {
          ...switcherMachine.context,
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
      value,
      onCheckedChange,
    })
    const inputRef = useRef<HTMLInputElement>(null)
    const composedRef = useComposedRefs(inputRef, ref)
    useCheckedInput(inputRef, state.context.checked)
    useFormReset(inputRef, () => {
      const next =
        checked !== undefined ? checked : initial.current.defaultChecked
      syncContext({ checked: next })
      syncCheckedInput(inputRef.current, next)
    })
    const api = connectSwitcher(state, send),
      inputProps = api.getInputProps(),
      hasLabel = hasSlotContent(label)
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
          className={cn('uf-switcher', className)}
          data-switch-only={!hasLabel || undefined}
          data-full-width={fullWidth || undefined}
        >
          {hasLabel && (
            <Text
              {...api.getLabelProps()}
              as="span"
              inset="none"
              membrane={false}
              truncate={truncate}
            >
              {label}
            </Text>
          )}
          <span {...api.getTrackProps()} aria-hidden="true">
            <span {...api.getThumbProps()} />
          </span>
          <input
            {...nativeProps}
            {...inputProps}
            ref={composedRef}
            checked={undefined}
            defaultChecked={initial.current.checked}
            name={name}
            value={value}
            hidden={hidden}
            dir={dir}
            lang={lang}
            title={title}
            aria-disabled={
              nativeProps['aria-disabled'] ?? inputProps['aria-disabled']
            }
            aria-required={
              nativeProps['aria-required'] ?? inputProps['aria-required']
            }
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
        </label>
      </Membrane>
    )
  },
)
