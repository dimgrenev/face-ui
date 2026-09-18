/** Radio — a field of native radio inputs for one choice among visible items. */
import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
} from 'react'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import { RadioOffIcon, RadioOnIcon } from '../assets/icons'
import {
  FieldLayout,
  idList,
  useField,
  type FieldProps,
} from '../assets/internal/field'
import type { CollectionItem } from '../assets/internal/item'
import { readCollection } from '../assets/runtime/collection'
import { resolveLabel } from '../assets/runtime/labels'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

const { getPartAttrs: part } = createAnatomy('radio').parts(
  'root',
  'list',
  'item',
  'input',
  'indicator',
  'label',
)

/** Keeps the native input focusable and submitted without showing it. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
} as const

/** One choice of a Radio group; `id` and the naming ARIA attributes go to its native input. */
export interface RadioItem
  extends Omit<CollectionItem, 'icon' | 'textValue'>,
    Pick<
      InputHTMLAttributes<HTMLInputElement>,
      'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
    > {
  /** Submission value, unique within the group; an empty string is a valid choice. */
  value: string
}

interface RadioBaseProps
  extends FieldProps,
    Omit<
      HTMLAttributes<HTMLDivElement>,
      | 'children'
      | 'dangerouslySetInnerHTML'
      | 'defaultValue'
      | 'defaultChecked'
      | 'role'
      | 'aria-orientation'
    > {
  /** Choices in navigation order; an item repeating an earlier value is dropped. */
  items?: readonly RadioItem[]
  /** Controlled selection; `null`, or a value missing from `items`, checks nothing. */
  value?: string | null
  /** Uncontrolled initial selection, restored by form reset. */
  defaultValue?: string
  /** Stacks the items in a column or a row and sets aria-orientation; all four arrows move either way. */
  orientation?: 'horizontal' | 'vertical'
  /** Called once per user selection; parent updates, form reset and reselecting are silent. */
  onValueChange?: (details: { value: string }) => void
  /** Focuses the selected enabled item, else the first enabled one, on mount. */
  autoFocus?: boolean
  /** Names the group when there is no visible `label`. */
  'aria-label'?: string
  /** Ids of the elements that name the group; wins over `label` and `aria-label`. */
  'aria-labelledby'?: string
  /** Disables every item; native inputs leave the tab order and form submission. */
  disabled?: boolean
  /** Id of an external native form that owns every input. */
  form?: string
  /** Shared outer spacing around each item; toggling it keeps the native inputs. */
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
        /** Nonempty native group and FormData key; use a distinct name for each independent group in a form. */
        name?: undefined
        /** Require a selection before submission. Native group validation requires a nonempty name. */
        required?: false
      }
  )

/** A field of native radio inputs for one choice among visible items. */
export const Radio = forwardRef<HTMLDivElement, RadioProps>(function Radio(
  {
    items,
    value,
    defaultValue,
    name,
    form,
    disabled = false,
    required = false,
    autoFocus = false,
    orientation = 'vertical',
    onValueChange,
    membrane = true,
    label,
    description,
    error,
    labelPosition,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    className,
    onKeyDown,
    onFocus,
    onBlur,
    ...nativeProps
  },
  ref,
) {
  const collection = readCollection<RadioItem>(items, {
    component: 'Radio',
    key: (item) => item.value,
  })
  const [current, setValue, replaceValue] = useControllableState<
    string | null
  >({
    value,
    defaultValue: defaultValue ?? null,
    onChange: (next) => next !== null && onValueChange?.({ value: next }),
    name: ['Radio', 'value'],
  })
  const selected = collection.get(current)?.key ?? null
  const roving = useRovingFocus({
    keys: collection.keys,
    disabled: (key) => disabled || !!collection.get(key)?.disabled,
    active: selected,
    orientation: 'both',
    activateOnMove: true,
    autoFocus,
  })
  const field = useField({
    id,
    label,
    description,
    error,
    labelPosition,
    required,
    labelable: false,
    'aria-label': resolveLabel(ariaLabel, '', 'Radio', 'aria-label') || undefined,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
  })

  const listRef = useRef<HTMLDivElement>(null)
  const firstInput = useRef<HTMLInputElement | null>(null)
  const inputs = () => [
    ...(listRef.current?.querySelectorAll<HTMLInputElement>('input') ?? []),
  ]
  useEffect(() => {
    firstInput.current = inputs()[0] ?? null
  })
  useFormReset(firstInput, () => {
    // The browser restored each input's mount-time state, and React rewrites only inputs whose props change.
    for (const input of inputs()) input.checked = input.value === selected
    replaceValue()
  })
  useEffect(() => {
    if (!form || !required) return
    // Firefox can cache an empty required group's validity before an external
    // form later in the DOM is connected. Refresh after the complete commit.
    for (const input of inputs()) {
      input.required = false
      input.required = true
    }
  }, [form, required, items])

  return (
    <div
      {...nativeProps}
      {...field.controlProps}
      {...field.rootProps}
      {...part('root')}
      ref={ref}
      role="radiogroup"
      aria-orientation={orientation}
      aria-invalid={field.invalid || undefined}
      aria-disabled={nativeProps['aria-disabled'] ?? (disabled || undefined)}
      aria-required={nativeProps['aria-required'] ?? (required || undefined)}
      data-orientation={orientation}
      data-disabled={disabled ? '' : undefined}
      className={cn('uf-field uf-radio', className)}
      onKeyDown={composeHandlers(onKeyDown, roving.root.onKeyDown)}
      onFocus={composeHandlers(onFocus, roving.root.onFocus)}
      onBlur={composeHandlers(onBlur, roving.root.onBlur)}
    >
      <FieldLayout field={field}>
        <div
          {...part('list')}
          ref={listRef}
          data-orientation={orientation}
          className="uf-radio__list"
        >
          {collection.keys.map((key) => {
            const { item, disabled: itemDisabled } = collection.get(key)!
            const off = disabled || itemDisabled
            const checked = key === selected
            const stop = roving.item(key)
            return (
              <Membrane
                key={key}
                enabled={membrane}
                fullWidth={orientation === 'vertical'}
                interactive
                target="input"
              >
                <label
                  {...part('item')}
                  data-state={checked ? 'checked' : 'unchecked'}
                  data-disabled={off ? '' : undefined}
                  data-value={key}
                  data-icon-left=""
                  className="uf-radio-option uf-option uf-control"
                >
                  <input
                    {...part('input')}
                    {...stop}
                    id={item.id}
                    aria-label={item['aria-label']}
                    aria-labelledby={item['aria-labelledby']}
                    aria-describedby={idList(
                      item['aria-describedby'],
                      field.describedBy,
                    )}
                    type="radio"
                    name={name}
                    form={form}
                    value={key}
                    checked={checked}
                    disabled={off}
                    required={required}
                    data-autofocus={
                      autoFocus && stop.tabIndex === 0 ? '' : undefined
                    }
                    // A consumer's preventDefault() on the click cancels the selection, as it cancels the native one.
                    onChange={(event) => {
                      if (!event.nativeEvent.defaultPrevented) setValue(key)
                    }}
                    style={VISUALLY_HIDDEN}
                  />
                  <span
                    {...part('indicator')}
                    className="uf-radio-indicator"
                    aria-hidden="true"
                  >
                    {checked ? <RadioOnIcon /> : <RadioOffIcon />}
                  </span>
                  <Text
                    {...part('label')}
                    as="span"
                    inset="none"
                    membrane={false}
                    className="uf-radio-text"
                  >
                    {item.label}
                  </Text>
                </label>
              </Membrane>
            )
          })}
        </div>
      </FieldLayout>
    </div>
  )
})
