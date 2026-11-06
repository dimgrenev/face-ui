import {
  forwardRef,
  useId,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createAnatomy } from '../anatomy'
import { cn } from '../utils'
import { hasSlotContent } from '../slot-content'
import { resolveLabel } from '../runtime/labels'
import { invalidProp, readNumber } from '../runtime/props'
import { Membrane } from '../adapters/react/Membrane'
import { Text } from '../../Text/Text'

export type RangeIndicatorTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'destructive'
export type RangeIndicatorShape = 'linear' | 'circle'
export interface RangeValueDetails {
  /** Bounded current value in the caller's units. */
  value: number
  min: number
  max: number
  /** Exact percentage of the range, from 0 to 100. */
  percent: number
}
export interface RangeIndicatorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'role'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-valuenow'
> {
  /** Accessible name when no visible label is present, or an explicit name override. */
  'aria-label'?: string
  /** IDs of external naming elements; takes precedence over label and aria-label. */
  'aria-labelledby'?: string
  /** Speech-only value description; formatValue controls visible text as well. */
  'aria-valuetext'?: string
  /** Semantic feedback color, independent of the numeric value. Defaults to neutral. */
  tone?: RangeIndicatorTone
  /** Linear bar or circular ring; both display the same exact fraction. Defaults to linear. */
  shape?: RangeIndicatorShape
  /** Show formatted value text. Unknown task progress never displays a numeric value. */
  showValue?: boolean
  /** Noninteractive visible label. Name an unlabelled indicator with native aria-label or aria-labelledby. */
  label?: ReactNode
  /** Format the bounded value for visible text and aria-valuetext. Defaults to an integer percentage rounded down, also used when the result is blank or not text. */
  formatValue?: (details: RangeValueDetails) => string
  /** Membrane spacing around the complete indicator. Defaults to true. */
  membrane?: boolean
  /** Additional class name on the semantic root. */
  className?: string
}
const anatomy = {
  progress: createAnatomy('progress').parts(
    'root',
    'track',
    'indicator',
    'label',
  ),
  meter: createAnatomy('meter').parts('root', 'track', 'indicator', 'label'),
}
/** Invalid bounds (not finite, or min >= max) become 0..100 and a non-finite
 * value becomes min, both reported; a finite value outside clamps silently. */
function resolveRange(
  component: string,
  value: unknown,
  min: number,
  max: number,
): RangeValueDetails {
  if (!(Number.isFinite(min) && Number.isFinite(max) && min < max)) {
    const prop = Number.isFinite(min) ? 'max' : 'min'
    invalidProp(component, prop, prop === 'min' ? min : max, 'using 0..100')
    min = 0
    max = 100
  }
  const bounded = Math.min(
    max,
    Math.max(min, readNumber(component, 'value', value, min)),
  )
  const span = max - min
  // Halving avoids overflow for finite endpoints on opposite sides of zero.
  const ratio = Number.isFinite(span)
    ? (bounded - min) / span
    : (bounded / 2 - min / 2) / (max / 2 - min / 2)
  return { value: bounded, min, max, percent: ratio * 100 }
}
interface InternalProps extends RangeIndicatorProps {
  kind: 'progress' | 'meter'
  /** `null` is an unknown amount for progress; a meter reads it as invalid. */
  value: number | null
  min: number
  max: number
}
/** One presentation for two distinct semantics: task completion and measurement. */
export const RangeIndicator = forwardRef<HTMLDivElement, InternalProps>(
  function RangeIndicator(props, ref) {
    const {
      kind,
      value,
      min,
      max,
      tone = 'neutral',
      shape = 'linear',
      showValue = false,
      label,
      formatValue,
      membrane = true,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-valuetext': ariaValueText,
      ...rest
    } = props
    const component = kind === 'progress' ? 'Progress' : 'Meter'
    const indeterminate = kind === 'progress' && value === null
    const details = resolveRange(component, indeterminate ? min : value, min, max)
    const percentText = `${details.value === details.max ? 100 : Math.min(99, Math.floor(details.percent + Number.EPSILON * 100))}%`
    const formattedValue = indeterminate
      ? undefined
      : formatValue
        ? resolveLabel(
            formatValue(details),
            percentText,
            component,
            'formatValue()',
          )
        : percentText
    const id = useId()
    const hasLabel = hasSlotContent(label, { trimText: true })
    const labelId = hasLabel ? `${id}-label` : undefined
    const explicitLabel =
      resolveLabel(ariaLabel, '', component, 'aria-label') || undefined
    const explicitLabelledby =
      resolveLabel(ariaLabelledby, '', component, 'aria-labelledby') ||
      undefined
    const attrs = anatomy[kind].getPartAttrs
    const state = indeterminate
      ? 'indeterminate'
      : kind === 'progress'
        ? details.value === details.max
          ? 'complete'
          : 'loading'
        : details.value === details.min
          ? 'empty'
          : details.value === details.max
            ? 'full'
            : 'partial'
    const labelNode = hasLabel ? (
      <Text
        as="span"
        inset="none"
        membrane={false}
        id={labelId}
        className="uf-range-indicator__title"
        {...attrs('label')}
      >
        {label}
      </Text>
    ) : null
    const valueNode =
      showValue && !indeterminate ? (
        <Text
          as="span"
          inset="none"
          membrane={false}
          aria-hidden="true"
          className="uf-range-indicator__value"
        >
          {formattedValue}
        </Text>
      ) : null
    const track = (
      <div
        {...attrs('track')}
        data-state={state}
        className="uf-range-indicator__track"
        aria-hidden="true"
      >
        <div
          {...attrs('indicator')}
          data-state={state}
          className="uf-range-indicator__indicator"
          style={
            {
              '--uf-range-percent': indeterminate
                ? '40%'
                : `${details.percent}%`,
            } as CSSProperties
          }
        />
      </div>
    )
    return (
      <Membrane enabled={membrane} fullWidth={shape === 'linear'}>
        <div
          {...attrs('root')}
          {...rest}
          ref={ref}
          role={kind === 'progress' ? 'progressbar' : 'meter'}
          aria-valuemin={details.min}
          aria-valuemax={details.max}
          aria-valuenow={indeterminate ? undefined : details.value}
          aria-valuetext={ariaValueText ?? formattedValue}
          aria-label={explicitLabel}
          aria-labelledby={
            explicitLabelledby ?? (explicitLabel ? undefined : labelId)
          }
          data-tone={tone}
          data-shape={shape}
          data-state={state}
          className={cn('uf-range-indicator', `uf-${kind}`, className)}
        >
          {shape === 'linear' ? (
            <>
              {(labelNode || valueNode) && (
                <div className="uf-range-indicator__header">
                  {labelNode}
                  {valueNode}
                </div>
              )}
              <div className="uf-range-indicator__track-wrap">{track}</div>
            </>
          ) : (
            <>
              {labelNode}
              {track}
              {valueNode}
            </>
          )}
        </div>
      </Membrane>
    )
  },
)
