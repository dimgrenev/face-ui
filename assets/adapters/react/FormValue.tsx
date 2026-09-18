import { useRef, useEffect, useLayoutEffect, type RefObject } from 'react'
import { useFormReset } from './use-form-reset'

type Value = string | readonly string[] | null
interface FormOption {
  value: string
  label?: string
  disabled?: boolean
}
interface FormValueProps {
  name?: string
  form?: string
  value: Value
  resetValue: Value
  options?: readonly FormOption[]
  disabled?: boolean
  required?: boolean
  triggerRef: RefObject<HTMLElement | null>
  onReset: () => Value
  onChange: (value: Value) => void
}
const toValues = (value: Value): readonly string[] =>
  value === null ? [] : typeof value === 'string' ? [value] : value
function selectValues(
  select: HTMLSelectElement,
  value: Value,
  defaults = false,
) {
  const values = toValues(value)
  for (const [index, option] of Array.from(select.options).entries()) {
    // The first option is a disabled placeholder. An actual empty-string choice
    // is a different option: native required validation distinguishes the two.
    const selected =
      index === 0 ? value === null : values.includes(option.value)
    if (defaults) option.defaultSelected = selected
    else option.selected = selected
  }
  if (!defaults && value === null) select.selectedIndex = 0
}

/** Native submission, validity and reset for custom select/date controls. */
export function FormValue({
  value,
  resetValue,
  options = [],
  triggerRef,
  onReset,
  onChange,
  ...props
}: FormValueProps) {
  const ref = useRef<HTMLSelectElement | null>(null)
  const multiple = value !== null && typeof value !== 'string'
  const choices = new Map(options.map((option) => [option.value, option]))
  for (const item of [...toValues(value), ...toValues(resetValue)]) {
    if (!choices.has(item)) choices.set(item, { value: item })
  }
  const useCommitEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect
  useCommitEffect(() => {
    const select = ref.current
    if (!select) return
    selectValues(select, resetValue, true)
    selectValues(select, value)
  })
  useFormReset(ref, () => {
    const reset = onReset()
    if (ref.current) selectValues(ref.current, reset)
  })
  return (
    <select
      {...props}
      ref={ref}
      multiple={multiple}
      defaultValue={value ?? ''}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
        border: 0,
        pointerEvents: 'none',
      }}
      onInvalid={(event) => {
        event.preventDefault()
        triggerRef.current?.focus()
      }}
      onChange={(event) => {
        const next = multiple
          ? Array.from(event.target.selectedOptions, (option) => option.value)
          : event.target.selectedIndex === 0
            ? null
            : event.target.value
        // A native candidate may be rejected without a React update. Keep the
        // accepted value in the form until the owner commits its next value.
        selectValues(event.currentTarget, value)
        onChange(next)
      }}
    >
      <option value="" disabled hidden />
      {Array.from(choices.values(), (item) => (
        <option key={item.value} value={item.value} disabled={item.disabled}>
          {item.label ?? item.value}
        </option>
      ))}
    </select>
  )
}
