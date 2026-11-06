/** Rating — a star scale field for choosing a score, or for showing an average read-only. */
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import {
  FieldLayout,
  useField,
  type FieldProps,
} from '../assets/internal/field'
import { resolveLabel } from '../assets/runtime/labels'
import { invalidProp, readNumber } from '../assets/runtime/props'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'

/** The score `formatValue` names. */
export interface RatingValueDetails {
  /** A choice, or the shown score; 0 means unrated. */
  value: number
  /** Number of stars on the scale. */
  max: number
}

interface RatingBaseProps
  extends FieldProps,
    Omit<
      HTMLAttributes<HTMLDivElement>,
      | 'children'
      | 'dangerouslySetInnerHTML'
      | 'defaultValue'
      | 'defaultChecked'
      | 'contentEditable'
      | 'suppressContentEditableWarning'
      | 'role'
      | 'aria-disabled'
      | 'aria-required'
      | 'aria-readonly'
      | 'aria-valuemin'
      | 'aria-valuemax'
      | 'aria-valuenow'
      | 'aria-valuetext'
    > {
  /** Controlled score, shown within 0..max; 0 means unrated. Editable stars show it rounded to the nearest choice. */
  value?: number
  /** Uncontrolled initial score, restored by form reset. Defaults to 0. */
  defaultValue?: number
  /** Number of stars, an integer from 1 to 10. Defaults to 5. */
  max?: number
  /** Blocks choosing, focus and form submission; the score stays visible. */
  disabled?: boolean
  /** Shows the score as a meter with its exact fraction: not editable or focusable, submitted with the form, never required. */
  readOnly?: boolean
  /** Adds a half-star choice before each star; a read-only score keeps its exact fraction either way. */
  allowHalf?: boolean
  /** Names the group when there is no visible `label`. */
  'aria-label'?: string
  /** Ids of the elements that name the group; wins over `label` and `aria-label`. */
  'aria-labelledby'?: string
  /** Names each choice and the read-only score; blank or non-text results use the default "3 stars" and "Not rated". */
  formatValue?: (details: RatingValueDetails) => string
  /** Called once per user choice; parent updates, form reset and reselecting are silent. */
  onValueChange?: (details: { value: number }) => void
  /** Id of an external native form that owns the score. */
  form?: string
  /** Focuses the selected choice, else the first one, on mount. */
  autoFocus?: boolean
  /** Shared outer spacing around each star; toggling it keeps the native inputs. */
  membrane?: boolean
}
export type RatingProps = RatingBaseProps &
  (
    | {
        /** Nonempty native form key; use a distinct name for each independent rating in a form. */
        name: string
        /** Requires a score before an editable rating's form submits; ignored without a nonempty `name`. */
        required?: boolean
      }
    | {
        /** Nonempty native form key; use a distinct name for each independent rating in a form. */
        name?: undefined
        /** Requires a score before an editable rating's form submits; ignored without a nonempty `name`. */
        required?: false
      }
  )

const { getPartAttrs: part } = createAnatomy('rating').parts(
  'root',
  'list',
  'item',
  'input',
  'indicator',
)
const defaultText = (score: number) =>
  score === 0 ? 'Not rated' : `${score} star${score === 1 ? '' : 's'}`

function Star({ fill }: { fill: number }) {
  return (
    <span
      {...part('indicator')}
      className="uf-rating__glyph"
      aria-hidden="true"
    >
      <Icon name="star" />
      <span
        className="uf-rating__fill"
        style={{ '--uf-rating-fill': fill } as CSSProperties}
      >
        <Icon name="star" />
      </span>
    </span>
  )
}

/** A star scale field for choosing a score, or for showing an average read-only. */
export const Rating = forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value,
    defaultValue = 0,
    max: maxProp = 5,
    disabled = false,
    readOnly = false,
    allowHalf = false,
    formatValue,
    onValueChange,
    name,
    form,
    required: requiredProp = false,
    autoFocus = false,
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
  const max = readNumber('Rating', 'max', maxProp, 5, {
    integer: true,
    min: 1,
    max: 10,
  })
  const unnamed = !String(name ?? '').trim()
  if (requiredProp && unnamed)
    invalidProp('Rating', 'name', name, 'ignoring required')
  const required = !!requiredProp && !unnamed && !readOnly
  const [current, setValue, replaceValue] = useControllableState<number>({
    value:
      value === undefined ? undefined : readNumber('Rating', 'value', value, 0),
    defaultValue: () => readNumber('Rating', 'defaultValue', defaultValue, 0),
    onChange: (next) => onValueChange?.({ value: next }),
    name: ['Rating', 'value'],
  })
  // The stored score stays as given; the shown one is bounded, and rounded to a choice when editable.
  const step = allowHalf ? 0.5 : 1
  const bounded = Math.max(0, Math.min(max, current))
  const score = readOnly ? bounded : Math.round(bounded / step) * step
  const stars = Array.from({ length: max }, (_, index) => index + 1)
  const choices = (star: number) =>
    readOnly ? [] : allowHalf ? [star - 0.5, star] : [star]
  const keys = stars.flatMap(choices).map(String)
  const [hover, setHover] = useState<number | null>(null)
  const preview =
    hover !== null && !disabled && keys.includes(String(hover)) ? hover : score
  const describe = (choice: number) =>
    resolveLabel(
      formatValue?.({ value: choice, max }),
      '',
      'Rating',
      'formatValue',
    ) || defaultText(choice)

  const listRef = useRef<HTMLDivElement>(null)
  const formInput = useRef<HTMLInputElement | null>(null)
  const radios = () => [
    ...(listRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    ) ?? []),
  ]
  // Declared before useRovingFocus, so it runs first: a removed choice (max shrank, half
  // steps turned off) hands focus to the tab stop, the shown score, as Tab would enter it.
  useFocusRecovery(listRef, () =>
    listRef.current?.querySelector<HTMLElement>('input[tabindex="0"]'),
  )
  const roving = useRovingFocus({
    keys,
    disabled: () => disabled,
    active: score ? String(score) : null,
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
    'aria-label':
      resolveLabel(ariaLabel, '', 'Rating', 'aria-label') || undefined,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
  })
  useEffect(() => {
    formInput.current = listRef.current?.querySelector('input') ?? null
  })
  useFormReset(formInput, () => {
    // The browser restored each radio's mount-time state, and React rewrites only inputs whose props change.
    for (const input of radios()) input.checked = input.value === String(score)
    replaceValue()
  })
  useEffect(() => {
    if (!form || !required) return
    // Firefox can cache an empty required group's validity before an external
    // form later in the DOM is connected. Refresh after the complete commit.
    for (const input of radios()) {
      input.required = false
      input.required = true
    }
  }, [form, required, max, allowHalf])

  return (
    <div
      {...nativeProps}
      {...field.controlProps}
      {...field.rootProps}
      {...part('root')}
      ref={ref}
      role={readOnly ? 'meter' : 'radiogroup'}
      aria-invalid={(!readOnly && field.invalid) || undefined}
      aria-disabled={disabled || undefined}
      aria-required={required || undefined}
      aria-valuemin={readOnly ? 0 : undefined}
      aria-valuemax={readOnly ? max : undefined}
      aria-valuenow={readOnly ? score : undefined}
      aria-valuetext={readOnly ? describe(score) : undefined}
      data-disabled={disabled ? '' : undefined}
      data-readonly={readOnly ? '' : undefined}
      data-half={allowHalf && !readOnly ? '' : undefined}
      className={cn('uf-field uf-rating', className)}
      onKeyDown={composeHandlers(onKeyDown, roving.root.onKeyDown)}
      onFocus={composeHandlers(onFocus, roving.root.onFocus)}
      onBlur={composeHandlers(onBlur, roving.root.onBlur)}
    >
      <FieldLayout field={field}>
        <div
          {...part('list')}
          ref={listRef}
          className="uf-rating__list"
          onPointerLeave={() => setHover(null)}
        >
          {stars.map((star) => (
            <span key={star} className="uf-rating__star">
              {readOnly && (
                <Membrane enabled={membrane}>
                  <span className="uf-rating__display" />
                </Membrane>
              )}
              {choices(star).map((choice) => {
                const stop = roving.item(String(choice))
                return (
                  <Membrane
                    key={choice}
                    enabled={membrane}
                    interactive
                    target="input"
                    onPointerEnter={(event) => {
                      if (
                        event.pointerType !== 'touch' &&
                        !event.currentTarget.querySelector('input:disabled')
                      )
                        setHover(choice)
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === 'touch') setHover(null)
                    }}
                  >
                    <label {...part('item')} className="uf-rating__option">
                      <input
                        {...part('input')}
                        {...stop}
                        type="radio"
                        name={name}
                        form={form}
                        value={choice}
                        aria-label={describe(choice)}
                        aria-describedby={field.describedBy}
                        checked={choice === score}
                        disabled={disabled}
                        required={required}
                        data-autofocus={
                          autoFocus && stop.tabIndex === 0 ? '' : undefined
                        }
                        onFocus={() => setHover(null)}
                        // A consumer's preventDefault() on the click cancels the choice, as it cancels the native one.
                        onChange={(event) => {
                          if (!event.nativeEvent.defaultPrevented)
                            setValue(choice)
                        }}
                      />
                    </label>
                  </Membrane>
                )
              })}
              <Star fill={Math.max(0, Math.min(1, preview - star + 1))} />
            </span>
          ))}
          {readOnly && (
            <input
              type="hidden"
              name={name}
              form={form}
              value={score}
              disabled={disabled || score === 0}
            />
          )}
        </div>
      </FieldLayout>
    </div>
  )
})
