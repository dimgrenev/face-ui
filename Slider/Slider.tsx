import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type RefAttributes,
} from 'react'
import { cn } from '../assets/utils'
import { createAnatomy } from '../assets/anatomy'
import { hasSlotContent } from '../assets/slot-content'
import { createRange } from '../assets/runtime/range'
import { resolveLabel } from '../assets/runtime/labels'
import { invalidProp, readNumber } from '../assets/runtime/props'
import { readDirection, stepIntent } from '../assets/runtime/keyboard'
import { isAvailable } from '../assets/runtime/layers'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import {
  FieldLayout,
  idList,
  useField,
  type FieldProps,
} from '../assets/internal/field'

/** A slider value: one number for one thumb, or an array with one number per thumb. */
export type SliderValue = number | readonly number[]
/** What the callbacks report for a value of type `V`: a number stays a number, an array becomes `number[]`. */
export type SliderValueOf<V extends SliderValue> = V extends number
  ? number
  : number[]

/** Crop boundaries on the slider's scale. */
export interface SliderCropRange {
  /** Lower boundary; both boundaries are snapped to the step grid and sorted. */
  start: number
  /** Upper boundary; both boundaries are snapped to the step grid and sorted. */
  end: number
}
/** Accessible names of individual controls; each replaces the name the control takes from the group. */
export interface SliderLabels {
  /** Complete names of the primary thumbs in ascending order; a missing or blank entry keeps the group-derived name. */
  thumbs?: readonly string[]
  /** Complete name of the crop start boundary; blank keeps the group-derived name. */
  cropStart?: string
  /** Complete name of the crop end boundary; blank keeps the group-derived name. */
  cropEnd?: string
}
/** Payload of onValueChange and onValueCommit. */
export interface SliderValueDetails<
  V extends number | number[] = number | number[],
> {
  /** The value in the shape of `value`: a number, or a fresh array in ascending order. */
  value: V
}
/** Payload of onCropRangeChange and onCropRangeCommit. */
export interface SliderCropRangeDetails {
  /** The crop boundaries, as a fresh object. */
  cropRange: SliderCropRange
}
/** Input of formatValue. */
export interface SliderFormatDetails {
  /** The number to format. */
  value: number
  /** Index within the primary values or the two crop boundaries. */
  index: number
  /** Whether the number is a primary value or a crop boundary. */
  kind: 'value' | 'crop'
}

interface SliderBaseProps
  extends
    FieldProps,
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
      | 'aria-readonly'
      | 'aria-required'
      | 'aria-valuemin'
      | 'aria-valuemax'
      | 'aria-valuenow'
      | 'aria-valuetext'
      | 'aria-orientation'
    > {
  /** Lower end of the scale and origin of the step grid; crossed or non-finite bounds use 0..100. Defaults to 0. */
  min?: number
  /** Upper end of the scale; crossed or non-finite bounds use 0..100. Defaults to 100. */
  max?: number
  /** Distance between selectable values; End selects the last step at or below max. Defaults to 1. */
  step?: number
  /** Blocks editing, crop included, and leaves every control out of FormData. */
  disabled?: boolean
  /** Horizontal follows the text direction; vertical increases upward. Defaults to horizontal. */
  orientation?: 'horizontal' | 'vertical'
  /** Names the group and its thumbs when there is no visible label. */
  'aria-label'?: string
  /** Ids of elements that name the group and its thumbs; they take precedence over label and aria-label. */
  'aria-labelledby'?: string
  /** Complete accessible names for individual thumbs and crop boundaries. */
  labels?: SliderLabels
  /** Shows each primary value inside its thumb. */
  showValue?: boolean
  /** Text of each shown value and its aria-valuetext, units included; blank or non-text output shows the number. */
  formatValue?: (details: SliderFormatDetails) => string
  /** Adds two crop boundaries on a second rail, edited independently of the value. */
  crop?: boolean
  /** Controlled crop boundaries; undefined leaves them uncontrolled. */
  cropRange?: SliderCropRange
  /** Crop boundaries on mount, restored by form reset. Defaults to the whole scale. */
  defaultCropRange?: SliderCropRange
  /** Keeps the shown value inside the crop boundaries. Defaults to true. */
  clampToCrop?: boolean
  /** Called once per user change of the crop boundaries; prop updates, clamping and reset are silent. */
  onCropRangeChange?: (details: SliderCropRangeDetails) => void
  /** Called once when an edit of the crop boundaries ends with a change; a refused or cancelled edit is silent. */
  onCropRangeCommit?: (details: SliderCropRangeDetails) => void
  /** FormData key of the value, repeated once per thumb in ascending order. */
  name?: string
  /** FormData key of the crop boundaries, repeated for start and end while crop is on. */
  cropName?: string
  /** Id of the form that submits and resets the controls, when it is not an ancestor. */
  form?: string
  /** Shows the required marker on the label; a range always has a value, so it never blocks submission. */
  required?: boolean
  /** Focuses the first thumb on mount. */
  autoFocus?: boolean
  /** Shared outer spacing around each thumb; toggling it keeps the DOM and focus. Defaults to true. */
  membrane?: boolean
}
interface SliderValueProps<V extends SliderValue> {
  /** Controlled value: a number, or one number per thumb; callbacks answer in the same shape. Shown snapped, clamped and sorted. */
  value?: V
  /** Value on mount, restored by form reset; a number or an array, as for value. Defaults to min. */
  defaultValue?: V
  /** Called once per user change, in the shape of the value; prop updates, clamping and reset are silent. */
  onValueChange?: (details: SliderValueDetails<SliderValueOf<V>>) => void
  /** Called once when a pointer, keyboard or assistive edit ends with a changed value; a refused or cancelled edit is silent. */
  onValueCommit?: (details: SliderValueDetails<SliderValueOf<V>>) => void
}
/** Slider props; `V` is the shape of `value`, which the callbacks follow. */
export type SliderProps<V extends SliderValue = SliderValue> =
  SliderValueProps<V> & SliderBaseProps

const { getPartAttrs: part } = createAnatomy('slider').parts(
  'root',
  'track',
  'range',
  'thumb',
  'input',
  'crop',
)
type Kind = SliderFormatDetails['kind']
interface Gesture {
  kind: Kind
  index: number
  source: 'pointer' | 'key' | 'native'
  /** What the edited controls showed when the gesture began. */
  start: readonly number[]
}
const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i])
// Object.is: a NaN boundary equals itself, or a controlled NaN would re-render forever.
const sameRange = (a?: SliderCropRange, b?: SliderCropRange) =>
  Object.is(a?.start, b?.start) && Object.is(a?.end, b?.end)

/** One finite number per thumb: other entries are dropped and reported; none left reads as `[fallback]`. */
function readValues(raw: unknown, prop: string, fallback: number): number[] {
  if (!Array.isArray(raw)) return [readNumber('Slider', prop, raw, fallback)]
  const finite = raw.filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n),
  )
  if (finite.length && finite.length === raw.length) return finite
  if (!finite.length) finite.push(fallback)
  invalidProp('Slider', prop, raw, `using [${finite.join(', ')}]`)
  return finite
}

const SliderRender = forwardRef<HTMLDivElement, SliderProps>(
  function Slider(props, ref) {
    const {
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = 'horizontal',
      labels,
      showValue = false,
      formatValue,
      crop = false,
      cropRange,
      defaultCropRange,
      clampToCrop = true,
      onCropRangeChange,
      onCropRangeCommit,
      name,
      cropName,
      form,
      required,
      autoFocus = false,
      membrane = true,
      id,
      label,
      description,
      error,
      labelPosition,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
      className,
      style,
      onKeyDown,
      onKeyUp,
      onBlur,
      onPointerDown,
      ...nativeProps
    } = props
    const vertical = orientation === 'vertical'
    const grid = useMemo(() => createRange(min, max, step), [min, max, step])
    // The stored value is the intent; what the controls show is its projection onto the current
    // scale and crop, computed here and never written back, so widening the scale restores it.
    const [intent, setIntent, replaceIntent] = useControllableState<SliderValue>(
      {
        value,
        // A copy: the default is read once, so later mutation of the caller's array changes nothing.
        defaultValue: () =>
          Array.isArray(defaultValue)
            ? [...defaultValue]
            : defaultValue === undefined
              ? grid.min
              : defaultValue,
        onChange: (next) =>
          onValueChange?.({ value: next as SliderValueOf<SliderValue> }),
        name: ['Slider', 'value'],
      },
    )
    const [cropIntent, setCropIntent, replaceCropIntent] =
      useControllableState<SliderCropRange | undefined>({
        value: cropRange,
        defaultValue: () =>
          defaultCropRange && {
            start: defaultCropRange.start,
            end: defaultCropRange.end,
          },
        onChange: (next) =>
          next && onCropRangeChange?.({ cropRange: { ...next } }),
        equal: sameRange,
        name: ['Slider', 'cropRange'],
      })
    const cropProp = cropRange === undefined ? 'defaultCropRange' : 'cropRange'
    const cropOf = (range: SliderCropRange | undefined) =>
      [
        readNumber('Slider', `${cropProp}.start`, range?.start, grid.min),
        readNumber('Slider', `${cropProp}.end`, range?.end, grid.max),
      ]
        .map((n) => grid.snap(n))
        .sort((a, b) => a - b)
    const selection = cropOf(cropIntent)
    const [lower, upper] =
      crop && clampToCrop ? selection : [grid.min, grid.max]
    const valueProp = value === undefined ? 'defaultValue' : 'value'
    const valuesOf = (raw: unknown) =>
      readValues(raw, valueProp, grid.min)
        .map((n) => Math.max(lower, Math.min(upper, grid.snap(n))))
        .sort((a, b) => a - b)
    const values = valuesOf(intent)

    /** One user proposal for one control; `to` maps what it shows to the candidate. */
    const propose = (kind: Kind, index: number, to: (shown: number) => number) => {
      if (disabled) return
      const clamp = (n: number, low: number, high: number) =>
        Math.max(low, Math.min(high, grid.snap(n)))
      // Updaters read the latest proposal, so several in one task build on each other.
      if (kind === 'crop')
        setCropIntent((range) => {
          const shown = cropOf(range)
          const next = [...shown]
          next[index] = index
            ? clamp(to(shown[1]), shown[0], grid.max)
            : clamp(to(shown[0]), grid.min, shown[1])
          return same(next, shown) ? range : { start: next[0], end: next[1] }
        })
      else
        setIntent((current) => {
          const shown = valuesOf(current)
          const next = [...shown]
          next[index] = clamp(
            to(shown[index]),
            shown[index - 1] ?? lower,
            shown[index + 1] ?? upper,
          )
          if (same(next, shown)) return current
          return Array.isArray(current) ? next : next[0]
        })
    }
    const many = Array.isArray(intent)
    // Document listeners and timers outlive their render; they read the last committed one.
    const latest = useRef({ values, selection, many, propose, props })
    useIsomorphicLayoutEffect(() => {
      latest.current = { values, selection, many, propose, props }
    })

    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const formRef = useRef<HTMLInputElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const gesture = useRef<Gesture | null>(null)
    const cleanup = useRef<(() => void) | null>(null)
    const controls = () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLInputElement>(
          '[data-scope="slider"][data-part="input"]',
        ) ?? [],
      )
    const cancel = () => {
      cleanup.current?.()
      cleanup.current = null
      gesture.current = null
    }
    /** Ends the gesture; it commits only when what the edited controls show has changed. */
    const finish = () => {
      const edit = gesture.current
      cancel()
      if (!edit) return
      const { values, selection, many, props } = latest.current
      const end = edit.kind === 'value' ? values : selection
      if (same(end, edit.start)) return
      if (edit.kind === 'value')
        props.onValueCommit?.({ value: many ? [...end] : end[0] })
      else
        props.onCropRangeCommit?.({
          cropRange: { start: end[0], end: end[1] },
        })
    }
    const begin = (kind: Kind, index: number, source: Gesture['source']) => {
      const active = gesture.current
      if (
        active?.kind === kind &&
        active.index === index &&
        active.source === source
      )
        return
      finish()
      const { values, selection } = latest.current
      gesture.current = {
        kind,
        index,
        source,
        start: kind === 'value' ? values : selection,
      }
    }
    // A gesture does not survive a change of what it edits.
    const edited = [disabled, vertical, min, max, step, crop, clampToCrop, form]
    useIsomorphicLayoutEffect(() => cancel, [...edited, values.length])
    useFormReset(formRef, () => {
      cancel()
      replaceIntent()
      replaceCropIntent()
    })
    useFocusRecovery(rootRef, () => controls().find(isAvailable))

    const [size, setSize] = useState({ inline: 0, block: 0 })
    const measure = useCallback(() => {
      const root = rootRef.current
      if (!root) return
      let inline = 0,
        block = 0
      root
        .querySelectorAll<HTMLElement>('[data-part="thumb"] .uf-slider__control')
        .forEach((node) => {
          const box = node.parentElement?.hasAttribute('data-membrane-disabled')
            ? node
            : node.parentElement!
          // CSS layout sizes exclude transforms and viewport-coordinate rounding.
          const style = root.ownerDocument.defaultView!.getComputedStyle(box)
          inline = Math.max(inline, Number.parseFloat(style.width) || 0)
          block = Math.max(block, Number.parseFloat(style.height) || 0)
        })
      if (size.inline !== inline || size.block !== block)
        setSize({ inline, block })
    }, [size])
    // Value text can change width before ResizeObserver delivers its next frame.
    useIsomorphicLayoutEffect(measure)
    useIsomorphicLayoutEffect(() => {
      const root = rootRef.current
      const Observer = root?.ownerDocument.defaultView?.ResizeObserver
      if (!root || !Observer) return
      const observer = new Observer(measure)
      root
        .querySelectorAll('[data-part="thumb"] .uf-slider__control')
        .forEach((node) => observer.observe(node))
      return () => observer.disconnect()
    }, [measure, showValue, membrane, values.length])

    const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
      const input = event.target as HTMLInputElement
      if (
        event.defaultPrevented ||
        !controls().includes(input) ||
        input.matches(':disabled')
      )
        return
      const move = stepIntent(
        event,
        vertical ? 'vertical' : 'horizontal',
        readDirection(rootRef.current),
      )
      if (!move) return
      event.preventDefault()
      const kind = input.dataset.kind as Kind,
        index = Number(input.dataset.index)
      begin(kind, index, 'key')
      latest.current.propose(
        kind,
        index,
        'step' in move
          ? (shown) => grid.move(shown, move.step)
          : () => (move.to === 'min' ? -Infinity : Infinity),
      )
    }
    const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
      const target = event.target as Element
      const track = trackRef.current,
        root = rootRef.current
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.isPrimary === false ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        gesture.current?.source === 'pointer' ||
        !track ||
        !root ||
        !target.closest('[data-slider-body]')
      )
        return
      // A press on either rail edits the nearest control of that rail.
      const kind: Kind = target.closest('[data-slider-crop-track]')
        ? 'crop'
        : 'value'
      const candidates = controls().filter(
        (input) => input.dataset.kind === kind && !input.matches(':disabled'),
      )
      if (!candidates.length) return
      const dir = readDirection(root)
      /** Pointer position along the current track, from its start, and the track's length. */
      const along = (x: number, y: number) => {
        const rect = track.getBoundingClientRect()
        return [
          vertical
            ? rect.bottom - y
            : dir === 'ltr'
              ? x - rect.left
              : rect.right - x,
          vertical ? rect.height : rect.width,
        ] as const
      }
      const [point, length] = along(event.clientX, event.clientY)
      if (length <= 0) return
      const at = (input: HTMLInputElement) =>
        grid.ratio(Number(input.value)) * length
      const hit = target
        .closest('[data-slider-handle]')
        ?.querySelector('input')
      const input =
        hit && candidates.includes(hit)
          ? hit
          : candidates.reduce((nearest, next) => {
              const distance = Math.abs(point - at(next))
              const previous = Math.abs(point - at(nearest))
              // Ties go to the thumb the pointer is past, so coincident thumbs can separate.
              return distance < previous ||
                (distance === previous && point > at(next))
                ? next
                : nearest
            })
      event.preventDefault()
      const index = Number(input.dataset.index)
      begin(kind, index, 'pointer')
      input.focus({ preventScroll: true })
      if (event.isTrusted) input.setPointerCapture?.(event.pointerId)
      // Grabbing a thumb off-center keeps that offset instead of jumping.
      const offset = hit ? point - at(input) : 0
      const pointerId = event.pointerId
      const captured = input.hasPointerCapture?.(pointerId) === true
      const update = (x: number, y: number) => {
        const [position, current] = along(x, y)
        if (
          input.matches(':disabled') ||
          (captured && !input.hasPointerCapture(pointerId)) ||
          current <= 0
        )
          return cancel()
        latest.current.propose(kind, index, () =>
          grid.fromRatio((position - offset) / current),
        )
      }
      const move = (next: globalThis.PointerEvent) => {
        if (next.pointerId !== pointerId) return
        next.preventDefault()
        update(next.clientX, next.clientY)
      }
      const up = (next: globalThis.PointerEvent) => {
        if (next.pointerId !== pointerId) return
        if (captured && !input.hasPointerCapture(pointerId)) cancel()
        else finish()
      }
      const abort = (next: globalThis.PointerEvent) => {
        if (next.pointerId === pointerId) cancel()
      }
      const doc = root.ownerDocument
      doc.addEventListener('pointermove', move, { passive: false })
      doc.addEventListener('pointerup', up)
      doc.addEventListener('pointercancel', abort)
      input.addEventListener('lostpointercapture', abort)
      doc.defaultView?.addEventListener('blur', cancel)
      cleanup.current = () => {
        doc.removeEventListener('pointermove', move)
        doc.removeEventListener('pointerup', up)
        doc.removeEventListener('pointercancel', abort)
        input.removeEventListener('lostpointercapture', abort)
        if (input.hasPointerCapture?.(pointerId))
          input.releasePointerCapture(pointerId)
        doc.defaultView?.removeEventListener('blur', cancel)
      }
      update(event.clientX, event.clientY)
    }

    const generatedId = useId()
    const fieldId = id || generatedId
    // The thumbs repeat the label's content, without its required marker, through this id.
    const nameId = `${fieldId}-name`
    const field = useField({
      id: fieldId,
      label: hasSlotContent(label, { trimText: true }) ? (
        <span id={nameId}>{label}</span>
      ) : (
        label
      ),
      description,
      error,
      labelPosition,
      required,
      labelable: false,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
    })
    // Each control is named after the group, plus its own part when there are several.
    const groupRefs =
      field.labelledBy === field.labelId ? nameId : field.labelledBy
    const groupLabel = field.controlProps['aria-label']

    const renderHandle = (n: number, index: number, kind: Kind) => {
      const isCrop = kind === 'crop'
      const own = isCrop ? (index ? 'cropEnd' : 'cropStart') : undefined
      const custom = resolveLabel(
        own ? labels?.[own] : labels?.thumbs?.[index],
        '',
        'Slider',
        `labels.${own ?? 'thumbs'}`,
      )
      const suffix = isCrop
        ? ['Crop start', 'Crop end'][index]
        : values.length > 1 ? String(index + 1) : ''
      const suffixId = `${fieldId}-${kind}-${index}-name`
      // Each control's native bounds are its neighbours, so the thumbs never cross.
      const [low, high] = isCrop
        ? index ? [selection[0], grid.max] : [grid.min, selection[1]]
        : [values[index - 1] ?? lower, values[index + 1] ?? upper]
      const formatted = formatValue?.({ value: n, index, kind })
      const text =
        resolveLabel(formatted, '', 'Slider', 'formatValue') || String(n)
      const first = !isCrop && index === 0
      return (
        <span
          key={`${kind}-${index}`}
          {...part(isCrop ? 'crop' : 'thumb')}
          data-slider-handle=""
          data-crop={isCrop ? (index ? 'max' : 'min') : undefined}
          className="uf-slider__handle"
          style={{ '--uf-slider-position': grid.ratio(n) } as CSSProperties}
        >
          <Membrane enabled={membrane} interactive target="input">
            <span className="uf-slider__control">
              <input
                {...part('input')}
                ref={first ? formRef : undefined}
                type="range"
                tabIndex={0}
                data-kind={kind}
                data-index={index}
                name={isCrop ? cropName : name}
                form={form}
                min={low}
                max={high}
                step={grid.step}
                value={n}
                disabled={disabled}
                autoFocus={first && autoFocus}
                data-autofocus={first && autoFocus ? '' : undefined}
                title={showValue && !isCrop ? text : undefined}
                aria-orientation={vertical ? 'vertical' : 'horizontal'}
                aria-label={
                  custom ||
                  (groupRefs
                    ? undefined
                    : [groupLabel, suffix].filter(Boolean).join(' ') ||
                      undefined)
                }
                aria-labelledby={
                  custom || !groupRefs
                    ? undefined
                    : idList(groupRefs, suffix && suffixId)
                }
                aria-describedby={field.describedBy}
                aria-invalid={field.invalid || undefined}
                aria-valuetext={formatValue ? text : undefined}
                onChange={(event) => {
                  const input = event.currentTarget
                  if (input.matches(':disabled')) return
                  // Assistive technology and other native edits are one-step gestures.
                  const native = !gesture.current
                  if (native) begin(kind, index, 'native')
                  latest.current.propose(kind, index, () => Number(input.value))
                  if (native) setTimeout(finish, 0)
                }}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'uf-slider__visual',
                  isCrop
                    ? 'uf-slider__marker'
                    : showValue
                      ? 'uf-slider__number'
                      : 'uf-slider__dot',
                )}
              >
                {!isCrop && showValue && (
                  <bdi className="uf-slider__valueText">{text}</bdi>
                )}
              </span>
            </span>
          </Membrane>
          {suffix && (
            <span id={suffixId} className="uf-slider__name">
              {suffix}
            </span>
          )}
        </span>
      )
    }
    const start = grid.ratio(values.length > 1 ? values[0] : grid.min)
    const end = grid.ratio(values[values.length - 1])
    return (
      <div
        {...nativeProps}
        {...field.controlProps}
        {...field.rootProps}
        {...part('root')}
        ref={composedRef}
        role="group"
        className={cn('uf-field uf-slider', className)}
        data-orientation={vertical ? 'vertical' : 'horizontal'}
        data-disabled={disabled ? '' : undefined}
        data-crop={crop ? '' : undefined}
        data-show-value={showValue ? '' : undefined}
        aria-disabled={disabled || undefined}
        style={
          {
            ...(size.inline
              ? {
                  '--uf-slider-thumb-inline': `${size.inline}px`,
                  '--uf-slider-thumb-block': `${size.block}px`,
                }
              : {}),
            ...(!membrane && {
              '--uf-slider-crop-size': 'var(--uf-slider-target)',
            }),
            ...style,
          } as CSSProperties
        }
        onKeyDown={composeHandlers(onKeyDown, navigate)}
        onKeyUp={(event) => {
          onKeyUp?.(event)
          // Releasing the key ends a keyboard edit; a cancelled release discards its commit.
          if (
            gesture.current?.source === 'key' &&
            stepIntent(event, 'horizontal', 'ltr')
          )
            event.defaultPrevented ? cancel() : finish()
        }}
        onBlur={composeHandlers(onBlur, () => {
          if (gesture.current?.source === 'key') finish()
        })}
        onPointerDown={composeHandlers(onPointerDown, pointerDown)}
      >
        <FieldLayout field={field}>
          <div className="uf-slider__body" data-slider-body="">
            <div {...part('track')} ref={trackRef} className="uf-slider__track">
              <span
                {...part('range')}
                className="uf-slider__range"
                style={
                  {
                    '--uf-slider-start': start,
                    '--uf-slider-end': end,
                  } as CSSProperties
                }
              />
              {values.map((n, i) => renderHandle(n, i, 'value'))}
              {crop && (
                <div
                  className="uf-slider__crop-track"
                  data-slider-crop-track=""
                >
                  <span
                    className="uf-slider__selection"
                    style={
                      {
                        '--uf-slider-start': grid.ratio(selection[0]),
                        '--uf-slider-end': grid.ratio(selection[1]),
                      } as CSSProperties
                    }
                  />
                  {selection.map((n, i) => renderHandle(n, i, 'crop'))}
                </div>
              )}
            </div>
          </div>
        </FieldLayout>
      </div>
    )
  },
)

/** Numeric input with ordered thumbs and an optional independently editable crop interval. */
export const Slider = SliderRender as (<V extends SliderValue = number>(
  props: SliderProps<V> & RefAttributes<HTMLDivElement>,
) => ReturnType<typeof SliderRender>) &
  typeof SliderRender
