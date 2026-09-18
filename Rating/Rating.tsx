/** Rating — a short star scale for choosing a score or reading an average. */
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { createAnatomy } from '../assets/anatomy'
import { hasSlotContent } from '../assets/slot-content'
import { resolveLabel } from '../assets/runtime/labels'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

export interface RatingValueDetails {
  value: number
  max: number
}
interface RatingBaseProps extends Omit<
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
  /** Controlled finite score, bounded to 0..max. Zero means unrated. */
  value?: number
  /** Initial uncontrolled score, restored by form reset. Defaults to 0. */
  defaultValue?: number
  /** Number of stars: an integer from 1 to 10. Defaults to 5. */
  max?: number
  /** Disable editing and native form submission, retaining the displayed score. */
  disabled?: boolean
  /** Display a precise average as a measurement, without editing or required validation. */
  readOnly?: boolean
  /** Allow half-star input steps. Readonly averages always retain exact fractions. */
  allowHalf?: boolean
  /** Noninteractive visible name; empty content falls back to native naming attributes. */
  label?: ReactNode
  /** Name override, or a name when no visible label is provided. */
  'aria-label'?: string
  /** External naming elements; takes precedence over label and aria-label. */
  'aria-labelledby'?: string
  /** Localized option names and readonly value description. Must return nonempty text. */
  formatValue?: (details: RatingValueDetails) => string
  /** One proposal per user change. Reselecting, external updates and reset are silent. */
  onValueChange?: (details: { value: number }) => void
  /** Id of an external native form that owns this score. */
  form?: string
  /** Focus the selected or first editable choice on mount. Defaults to false. */
  autoFocus?: boolean
  /** Shared membrane spacing around each choice and the label. Defaults to true. */
  membrane?: boolean
  /** Additional class name on the semantic root. */
  className?: string
}
export type RatingProps = RatingBaseProps &
  (
    | {
        /** Nonempty native form key; use a distinct name for each independent rating. */
        name: string
        /** Require a score before submitting an editable rating. Defaults to false. */
        required?: boolean
      }
    | {
        /** Omit to keep the score out of FormData. */
        name?: undefined
        required?: false
      }
  )

const { getPartAttrs: attrs } = createAnatomy('rating').parts(
  'root',
  'label',
  'list',
  'item',
  'input',
  'indicator',
)
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
function finite(value: number) {
  if (!Number.isFinite(value))
    throw new RangeError('Rating value must be finite')
  return value
}
function Star({ fill }: { fill: number }) {
  return (
    <span
      {...attrs('indicator')}
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

export const Rating = forwardRef<HTMLDivElement, RatingProps>(
  function Rating(props, ref) {
    const {
      value,
      defaultValue = 0,
      max = 5,
      disabled = false,
      readOnly = false,
      allowHalf = false,
      label,
      formatValue,
      onValueChange,
      name,
      form,
      required = false,
      autoFocus = false,
      membrane = true,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...rest
    } = props
    if (!Number.isInteger(max) || max < 1 || max > 10)
      throw new RangeError('Rating max must be an integer from 1 to 10')
    if (required && !name?.trim())
      throw new TypeError('A required Rating needs a nonempty name')
    if (formatValue !== undefined && typeof formatValue !== 'function')
      throw new TypeError('Rating formatValue must be a function')
    const [initialValue] = useState(() => finite(defaultValue))
    const [internalValue, setInternalValue] = useState(initialValue)
    const [hover, setHover] = useState<number | null>(null)
    const step = allowHalf ? 0.5 : 1
    const normalize = (score: number) => {
      const bounded = Math.max(0, Math.min(max, finite(score)))
      return readOnly ? bounded : Math.round(bounded / step) * step
    }
    const score = normalize(value === undefined ? internalValue : value)
    const preview =
      disabled || readOnly || hover === null ? score : Math.min(hover, max)
    const describe = (rating: number) => {
      const text = formatValue
        ? formatValue({ value: rating, max })
        : rating === 0
          ? 'Not rated'
          : `${rating} star${rating === 1 ? '' : 's'}`
      if (typeof text !== 'string' || !text.trim())
        throw new TypeError('Rating formatValue must return nonempty text')
      return text
    }
    const id = useId()
    const hasLabel = hasSlotContent(label, { trimText: true })
    const labelId = hasLabel ? `${id}-label` : undefined
    const explicitLabel =
      resolveLabel(ariaLabel, '', 'Rating aria-label') || undefined
    const explicitLabelledby =
      resolveLabel(ariaLabelledby, '', 'Rating aria-labelledby') || undefined
    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const formRef = useRef<HTMLInputElement>(null)
    const focused = useRef<HTMLInputElement | null>(null)
    const inputs = () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLInputElement>(
          '[data-scope="rating"][data-part="input"]',
        ) ?? [],
      )
    useFormReset(formRef, () => {
      const next = normalize(value === undefined ? initialValue : value)
      if (value === undefined) setInternalValue(next)
      setHover(null)
      // Reset's native default action also runs when React's value is unchanged.
      inputs().forEach((input) => {
        input.checked = Number(input.value) === next
      })
    })
    useCommitEffect(() => {
      // Retain the last accepted score when the parent releases control.
      if (internalValue !== score) setInternalValue(score)
    }, [internalValue, score])
    useEffect(() => {
      setHover(null)
    }, [max, allowHalf, disabled, readOnly, value])
    useEffect(() => {
      if (!form || !required || readOnly) return
      // Firefox can cache validity before a later external form is connected.
      inputs().forEach((input) => {
        input.required = false
        input.required = true
      })
    }, [form, required, readOnly, max, allowHalf])
    const mounted = useRef(false)
    useCommitEffect(() => {
      const root = rootRef.current
      if (!root) return
      const previous = focused.current
      const active = root.ownerDocument.activeElement
      const target = () =>
        inputs().find(
          (input) => input.tabIndex === 0 && !input.matches(':disabled'),
        )
      if (!mounted.current) {
        mounted.current = true
        if (autoFocus && !root.closest('[hidden], [inert]')) target()?.focus()
      } else if (
        previous &&
        !previous.isConnected &&
        active === root.ownerDocument.body &&
        !root.closest('[hidden], [inert]')
      ) {
        // Recover a removed half/max option; preserve focus on surviving choices.
        focused.current = null
        target()?.focus({ preventScroll: true })
      }
    })
    const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
      rest.onKeyDown?.(event)
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return
      const control = event.target as HTMLInputElement
      const choices = inputs()
      const index = choices.indexOf(control)
      if (index < 0 || control.matches(':disabled')) return
      const rtl =
        control.ownerDocument.defaultView?.getComputedStyle(control)
          .direction === 'rtl'
      const delta =
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
                : 0
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? choices.length - 1
            : delta
              ? (index + delta + choices.length) % choices.length
              : null
      if (nextIndex === null) return
      event.preventDefault()
      setHover(null)
      choices[nextIndex]?.focus()
      choices[nextIndex]?.click()
    }
    return (
      <div
        {...rest}
        {...attrs('root')}
        ref={composedRef}
        role={readOnly ? 'meter' : 'radiogroup'}
        aria-label={explicitLabel}
        aria-labelledby={
          explicitLabelledby ?? (explicitLabel ? undefined : labelId)
        }
        aria-disabled={disabled || undefined}
        aria-required={(!readOnly && required) || undefined}
        aria-valuemin={readOnly ? 0 : undefined}
        aria-valuemax={readOnly ? max : undefined}
        aria-valuenow={readOnly ? score : undefined}
        aria-valuetext={readOnly ? describe(score) : undefined}
        data-disabled={disabled ? '' : undefined}
        data-readonly={readOnly ? '' : undefined}
        data-half={allowHalf && !readOnly ? '' : undefined}
        className={cn('uf-rating', className)}
        onKeyDown={navigate}
      >
        {hasLabel && (
          <Text
            {...attrs('label')}
            id={labelId}
            as="span"
            inset="none"
            membrane={membrane}
            className="uf-rating__label"
          >
            {label}
          </Text>
        )}
        <div
          {...attrs('list')}
          className="uf-rating__list"
          onPointerLeave={() => setHover(null)}
        >
          {Array.from({ length: max }, (_, index) => {
            const star = index + 1
            return (
              <span key={star} className="uf-rating__star">
                {readOnly ? (
                  <Membrane enabled={membrane}>
                    <span className="uf-rating__display" />
                  </Membrane>
                ) : (
                  (allowHalf ? [star - 0.5, star] : [star]).map((choice) => (
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
                      <label {...attrs('item')} className="uf-rating__option">
                        <input
                          {...attrs('input')}
                          ref={choice === step ? formRef : undefined}
                          type="radio"
                          name={name}
                          form={form}
                          value={choice}
                          aria-label={describe(choice)}
                          checked={choice === score}
                          disabled={disabled}
                          required={required}
                          tabIndex={
                            !disabled &&
                            (choice === score ||
                              (score === 0 && choice === step))
                              ? 0
                              : -1
                          }
                          onFocus={(event) => {
                            focused.current = event.currentTarget
                            setHover(null)
                          }}
                          onChange={(event) => {
                            if (
                              event.defaultPrevented ||
                              event.nativeEvent.defaultPrevented ||
                              event.currentTarget.matches(':disabled') ||
                              choice === score
                            )
                              return
                            if (value === undefined) setInternalValue(choice)
                            setHover(null)
                            onValueChange?.({ value: choice })
                          }}
                        />
                      </label>
                    </Membrane>
                  ))
                )}
                <Star fill={Math.max(0, Math.min(1, preview - index))} />
              </span>
            )
          })}
        </div>
        {readOnly && (
          <input
            ref={formRef}
            type="hidden"
            name={name}
            form={form}
            value={score}
            disabled={disabled || score === 0}
          />
        )}
      </div>
    )
  },
)
