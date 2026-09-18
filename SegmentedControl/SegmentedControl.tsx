import {
  forwardRef,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
} from 'react'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'
import { FormValue } from '../assets/adapters/react/FormValue'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { FieldLayout, idList, useField, type FieldProps } from '../assets/internal/field'
import type { CollectionItem } from '../assets/internal/item'
import { readCollection, readKeys } from '../assets/runtime/collection'

/** One choice of the strip; `id` and native `aria-*` name the choice's button. */
export interface SegmentedControlItem
  extends Omit<CollectionItem, 'textValue' | 'icon'>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'title'
    > {}

interface SegmentedControlBaseProps
  extends FieldProps,
    Omit<
      HTMLAttributes<HTMLDivElement>,
      | 'children'
      | 'dangerouslySetInnerHTML'
      | 'defaultValue'
      | 'defaultChecked'
      | 'role'
      | 'aria-checked'
      | 'aria-pressed'
      | 'aria-orientation'
      | 'aria-disabled'
      | 'aria-readonly'
      | 'aria-required'
    > {
  /** Choices in visual, keyboard and form order; an item with a missing or repeated `value` is skipped. */
  items?: readonly SegmentedControlItem[]
  /** Disables every choice and leaves the value out of FormData. */
  disabled?: boolean
  /** Lays the choices out in a row or a column; a single choice answers to all four arrows. */
  orientation?: 'horizontal' | 'vertical'
  /** Names the group when there is no visible label. */
  'aria-label'?: string
  /** Ids of visible elements that name the group; they take precedence over `label`. */
  'aria-labelledby'?: string
  /** FormData key; a multiple value submits one entry per choice. */
  name?: string
  /** Id of the form that submits and resets the value, when it is not an ancestor. */
  form?: string
  /** Blocks form submission until a choice is selected and marks the label. */
  required?: boolean
  /** Focuses the selected enabled choice, or the first enabled one, on mount. */
  autoFocus?: boolean
  /** Shared outer spacing around each choice; toggling it keeps DOM and focus. */
  membrane?: boolean
}
interface SegmentedControlSingleProps {
  /** Lets the user press any number of choices, and makes the value a `string[]` instead of `string | null`. */
  multiple?: false
  /** Selected key, or keys with `multiple`; keys missing from `items` select nothing until they appear. */
  value?: string | null
  /** Selection on mount, restored by form reset; same shape as `value`. */
  defaultValue?: string | null
  /** Called once per user change with the new value, a fresh array with `multiple`; never for prop updates or reset. */
  onValueChange?: (details: { value: string | null }) => void
}
interface SegmentedControlMultipleProps {
  /** Lets the user press any number of choices, and makes the value a `string[]` instead of `string | null`. */
  multiple: true
  /** Selected key, or keys with `multiple`; keys missing from `items` select nothing until they appear. */
  value?: readonly string[]
  /** Selection on mount, restored by form reset; same shape as `value`. */
  defaultValue?: readonly string[]
  /** Called once per user change with the new value, a fresh array with `multiple`; never for prop updates or reset. */
  onValueChange?: (details: { value: string[] }) => void
}
export type SegmentedControlProps = SegmentedControlBaseProps &
  (SegmentedControlSingleProps | SegmentedControlMultipleProps)

type Value = string | readonly string[] | null
const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((key, index) => key === b[index])

/** Compact choice strip: one radio choice, or independently pressed options with `multiple`. */
export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(function SegmentedControl(props, ref) {
  const {
    items,
    value,
    defaultValue,
    multiple = false,
    onValueChange,
    disabled = false,
    orientation = 'horizontal',
    name,
    form,
    required = false,
    autoFocus = false,
    membrane = true,
    label,
    description,
    error,
    labelPosition,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    className,
    onClick,
    onKeyDown,
    onFocus,
    onBlur,
    ...nativeProps
  } = props
  const collection = readCollection<SegmentedControlItem>(items, {
    component: 'SegmentedControl',
    key: (item) => item.value,
  })
  const off = (key: string) =>
    disabled || collection.get(key)?.disabled === true
  // The stored value is the intent; what is shown is its projection onto the current items and
  // mode, computed here and never written back, so late or briefly empty items keep the choice.
  const project = (intent: unknown): readonly string[] => {
    const wanted = new Set(
      typeof intent === 'string'
        ? [intent]
        : Array.isArray(intent)
          ? readKeys(intent, 'SegmentedControl', 'value')
          : [],
    )
    const keys = collection.keys.filter((key) => wanted.has(key))
    return multiple ? keys : keys.slice(0, 1)
  }
  const toValue = (keys: readonly string[]): Value =>
    multiple ? keys : (keys[0] ?? null)
  // A copy: the default is read once, so later mutation of the caller's array changes nothing.
  const [initial] = useState<Value>(() =>
    Array.isArray(defaultValue) ? [...defaultValue] : (defaultValue ?? null),
  )
  const [intent, setIntent, replaceIntent] = useControllableState<Value>({
    value,
    defaultValue: initial,
    onChange: (next) =>
      (onValueChange as ((details: { value: Value }) => void) | undefined)?.({
        value: next,
      }),
    name: ['SegmentedControl', 'value'],
  })
  const selected = project(intent)
  const propose = (keys: readonly string[]) => {
    const next = project(keys)
    if (!disabled && !same(next, selected)) setIntent(toValue(next))
  }
  const [nativeError, setNativeError] = useState<string | null>(null)
  const field = useField({
    label,
    description,
    error,
    labelPosition,
    id,
    labelable: false,
    required,
    nativeError,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  })
  const roving = useRovingFocus({
    keys: collection.keys,
    disabled: off,
    active: selected.find((key) => !off(key)) ?? null,
    orientation: multiple ? orientation : 'both',
    // Keyboard selection clicks the reached choice, so a cancelled click cancels it as well.
    activateOnMove: !multiple,
    autoFocus,
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const composedRef = useComposedRefs(rootRef, ref)
  const choose = (event: MouseEvent<HTMLDivElement>) => {
    const key = roving.keyOf(
      (event.target as Element).closest('.uf-toggle-item'),
    )
    if (key === null || event.defaultPrevented || off(key)) return
    propose(
      !multiple
        ? [key]
        : selected.includes(key)
          ? selected.filter((other) => other !== key)
          : [...selected, key],
    )
  }
  return (
    <div
      {...nativeProps}
      {...field.controlProps}
      {...field.rootProps}
      ref={composedRef}
      role={multiple ? 'group' : 'radiogroup'}
      aria-orientation={multiple ? undefined : orientation}
      aria-disabled={disabled || undefined}
      aria-invalid={!multiple && field.invalid ? true : undefined}
      data-scope="toggle"
      data-part="root"
      data-type={multiple ? 'multiple' : 'single'}
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      className={cn('uf-field uf-toggle', className)}
      onClick={composeHandlers(onClick, choose)}
      onKeyDown={composeHandlers(onKeyDown, roving.root.onKeyDown)}
      onFocus={(event) => {
        onFocus?.(event)
        roving.root.onFocus(event)
      }}
      onBlur={(event) => {
        onBlur?.(event)
        roving.root.onBlur(event)
      }}
    >
      <FieldLayout field={field}>
        <div className="uf-toggle-list" data-scope="toggle" data-part="list">
          {collection.entries.map(({ key, item }) => {
            const {
              value: _value,
              label: itemLabel,
              disabled: _disabled,
              ...itemProps
            } = item
            const checked = selected.includes(key)
            const itemDisabled = off(key)
            const tab = roving.item(key)
            return (
              <Membrane enabled={membrane} key={key} interactive>
                <button
                  {...itemProps}
                  {...tab}
                  type="button"
                  role={multiple ? undefined : 'radio'}
                  disabled={itemDisabled}
                  form={form}
                  aria-checked={multiple ? undefined : checked}
                  aria-pressed={multiple ? checked : undefined}
                  aria-disabled={itemDisabled || undefined}
                  aria-describedby={idList(
                    item['aria-describedby'],
                    field.describedBy,
                  )}
                  data-scope="toggle"
                  data-part="item"
                  data-value={key}
                  data-state={checked ? 'on' : 'off'}
                  data-disabled={itemDisabled || undefined}
                  data-orientation={orientation}
                  data-autofocus={autoFocus && tab.tabIndex === 0 ? '' : undefined}
                  className="uf-toggle-item uf-option uf-control"
                >
                  {itemLabel}
                </button>
              </Membrane>
            )
          })}
        </div>
      </FieldLayout>
      <FormValue
        name={name}
        form={form}
        disabled={disabled}
        required={required}
        options={collection.entries.map(({ key, disabled }) => ({
          value: key,
          disabled,
        }))}
        value={toValue(selected)}
        resetValue={toValue(project(initial))}
        // Interactive validation focuses the proxy; focus then goes to the group's tab stop.
        triggerRef={{
          get current() {
            return (
              rootRef.current?.querySelector<HTMLElement>(
                '.uf-toggle-item[tabindex="0"]',
              ) ?? null
            )
          },
        }}
        onReset={() => {
          replaceIntent()
          return toValue(project(value === undefined ? initial : intent))
        }}
        onChange={(candidate) => {
          const keys = project(candidate)
          // A native candidate may only add choices a user could press.
          if (keys.every((key) => selected.includes(key) || !off(key)))
            propose(keys)
        }}
        onReport={setNativeError}
      />
    </div>
  )
})
