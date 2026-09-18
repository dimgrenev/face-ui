/** One numeric editor: presentation never owns state or interaction. */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { createAnatomy } from '../assets/anatomy'
import { createRange } from '../assets/runtime/range'
import { hasSlotContent } from '../assets/slot-content'
import { resolveLabel } from '../assets/runtime/labels'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useFormReset } from '../assets/adapters/react/use-form-reset'
import { Text } from '../Text/Text'

export interface SliderCropRange {
  min: number
  max: number
}
export interface SliderLabels {
  /** Complete accessible names, in ascending thumb order. */
  thumbs?: readonly string[]
  /** Complete accessible names for crop boundaries. Defaults include the group name. */
  cropStart?: string
  cropEnd?: string
}
export interface SliderValueDetails {
  value: number[]
}
export interface SliderFormatDetails {
  value: number
  /** Index within primary values or the two crop endpoints. */
  index: number
  kind: 'value' | 'crop'
}
export interface SliderProps extends Omit<
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
  /** Controlled finite number or nonempty array. Values are snapped and sorted. */
  value?: number | readonly number[]
  /** Initial uncontrolled value(s), restored on reset. Defaults to min. */
  defaultValue?: number | readonly number[]
  /** Finite lower bound and step origin. Defaults to 0. */
  min?: number
  /** Finite upper bound, at least min. Defaults to 100. */
  max?: number
  /** Positive finite increment. End selects the last step at or below max. Defaults to 1. */
  step?: number
  /** Disable editing and submission, including crop. Defaults to false. */
  disabled?: boolean
  /** Horizontal follows text direction; vertical increases upward. Defaults to horizontal. */
  orientation?: 'horizontal' | 'vertical'
  /** Visible noninteractive name, including rich text. */
  label?: ReactNode
  /** Name when there is no visible label, or override for it. */
  'aria-label'?: string
  /** External naming elements; takes precedence over label and aria-label. */
  'aria-labelledby'?: string
  /** Specific or localized names for individual controls. */
  labels?: SliderLabels
  /** Display the value inside each primary handle. Defaults to false. */
  showValue?: boolean
  /** Nonempty visible value and accessible value text, including units. */
  formatValue?: (details: SliderFormatDetails) => string
  /** One proposal per user change. External updates, clamping and reset are silent. */
  onValueChange?: (details: SliderValueDetails) => void
  /** Accepted edit on pointerup, navigation keyup/blur or assistive input. Cancellation is silent. */
  onValueCommit?: (details: SliderValueDetails) => void
  /** Enable two editable crop boundaries independently of value presentation. Defaults to false. */
  crop?: boolean
  /** Controlled crop boundaries, sorted and snapped to the same step grid. */
  cropRange?: SliderCropRange
  /** Initial uncontrolled crop, restored on reset. Defaults to the full range. */
  defaultCropRange?: SliderCropRange
  /** Constrain primary values to the accepted crop. Defaults to true. */
  clampToCrop?: boolean
  /** User proposal for crop only; normalization of primary values is silent. */
  onCropChange?: (range: SliderCropRange) => void
  /** Accepted crop edit when the user finishes an interaction. */
  onCropCommit?: (range: SliderCropRange) => void
  /** Native form key, repeated for ordered primary values. */
  name?: string
  /** Native form key, repeated for crop start/end when crop is enabled. */
  cropName?: string
  /** External form id for all controls. */
  form?: string
  /** Focus the first primary thumb on mount. Defaults to false. */
  autoFocus?: boolean
  /** Shared spacing around handles and label. Defaults to true. */
  membrane?: boolean
  /** Additional class name on the semantic root. */
  className?: string
}
const { getPartAttrs: attrs } = createAnatomy('slider').parts(
  'root',
  'label',
  'track',
  'range',
  'thumb',
  'input',
  'crop',
)
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
const equal = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i])
function numbers(value: number | readonly number[]) {
  const entries = typeof value === 'number' ? [value] : value
  if (
    !Array.isArray(entries) ||
    !entries.length ||
    entries.some((n) => typeof n !== 'number' || !Number.isFinite(n))
  )
    throw new RangeError(
      'Slider value must be a finite number or a nonempty array of finite numbers',
    )
  return entries
}
interface Gesture {
  kind: 'value' | 'crop'
  index: number
  source: 'pointer' | 'key' | 'native'
  start: number[]
  proposed: number[]
  accepted: number[]
}
export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  function Slider(props, ref) {
    const {
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = 'horizontal',
      label,
      labels,
      showValue = false,
      formatValue,
      onValueChange,
      onValueCommit,
      crop = false,
      cropRange,
      defaultCropRange,
      clampToCrop = true,
      onCropChange,
      onCropCommit,
      name,
      cropName,
      form,
      autoFocus = false,
      membrane = true,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...rest
    } = props
    const grid = useMemo(() => createRange(min, max, step), [min, max, step])
    if (orientation !== 'horizontal' && orientation !== 'vertical')
      throw new TypeError('Slider orientation must be horizontal or vertical')
    if (formatValue !== undefined && typeof formatValue !== 'function')
      throw new TypeError('Slider formatValue must be a function')
    const normalizeCrop = (range: SliderCropRange) => {
      if (!range || typeof range !== 'object')
        throw new TypeError('Slider crop range must contain finite min and max')
      return [grid.snap(range.min), grid.snap(range.max)].sort((a, b) => a - b)
    }
    const [initial] = useState(() => ({
      value: [...numbers(defaultValue === undefined ? min : defaultValue)],
      crop:
        defaultCropRange === undefined ? { min, max } : { ...defaultCropRange },
    }))
    const [internal, setInternal] = useState(initial.value)
    const [internalCrop, setInternalCrop] = useState(initial.crop)
    const selection = normalizeCrop(
      cropRange === undefined ? internalCrop : cropRange,
    )
    const lower = crop && clampToCrop ? selection[0] : grid.min
    const upper = crop && clampToCrop ? selection[1] : grid.max
    const normalize = (next: number | readonly number[]) =>
      numbers(next)
        .map((n) => Math.max(lower, Math.min(upper, grid.snap(n))))
        .sort((a, b) => a - b)
    const values = normalize(value === undefined ? internal : value)
    const id = useId()
    const hasLabel = hasSlotContent(label, { trimText: true })
    const labelId = hasLabel ? `${id}-label` : undefined
    const explicitLabel =
      resolveLabel(ariaLabel, '', 'Slider aria-label') || undefined
    const labelledby =
      resolveLabel(ariaLabelledby, '', 'Slider aria-labelledby') ||
      (!explicitLabel ? labelId : undefined)
    if (
      labels?.thumbs &&
      (labels.thumbs.length !== values.length ||
        labels.thumbs.some((n) => typeof n !== 'string' || !n.trim()))
    )
      throw new TypeError(
        'Slider labels.thumbs must contain one nonempty name per thumb',
      )
    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const formRef = useRef<HTMLInputElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const focused = useRef<HTMLInputElement | null>(null)
    const gesture = useRef<Gesture | null>(null)
    const cleanup = useRef<(() => void) | null>(null)
    const latest = useRef({ values, selection, props })
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
    const finish = () => {
      const edit = gesture.current
      cancel()
      if (!edit) return
      const current = latest.current
      const accepted =
        edit.kind === 'value' ? current.values : current.selection
      if (!equal(accepted, edit.accepted) || equal(edit.start, accepted)) return
      if (edit.kind === 'value')
        current.props.onValueCommit?.({ value: [...accepted] })
      else current.props.onCropCommit?.({ min: accepted[0], max: accepted[1] })
    }
    useCommitEffect(() => {
      latest.current = { values, selection, props }
      if (!equal(internal, values)) setInternal(values)
      if (
        internalCrop.min !== selection[0] ||
        internalCrop.max !== selection[1]
      )
        setInternalCrop({ min: selection[0], max: selection[1] })
      const edit = gesture.current
      const accepted = edit?.kind === 'value' ? values : selection
      if (edit && equal(accepted, edit.proposed)) edit.accepted = [...accepted]
    })
    useCommitEffect(
      () => cancel,
      [
        disabled,
        orientation,
        min,
        max,
        step,
        crop,
        clampToCrop,
        values.length,
        form,
      ],
    )
    useFormReset(formRef, () => {
      cancel()
      const nextCrop = normalizeCrop(
        cropRange === undefined ? initial.crop : cropRange,
      )
      const resetLow = crop && clampToCrop ? nextCrop[0] : grid.min
      const resetHigh = crop && clampToCrop ? nextCrop[1] : grid.max
      const next = numbers(value === undefined ? initial.value : value)
        .map((n) => Math.max(resetLow, Math.min(resetHigh, grid.snap(n))))
        .sort((a, b) => a - b)
      if (value === undefined) setInternal(next)
      if (cropRange === undefined)
        setInternalCrop({ min: nextCrop[0], max: nextCrop[1] })
      controls().forEach((input) => {
        input.value = String(
          (input.dataset.kind === 'value' ? next : nextCrop)[
            Number(input.dataset.index)
          ],
        )
      })
    })
    const mounted = useRef(false)
    useCommitEffect(() => {
      const root = rootRef.current
      if (!root) return
      const target = () =>
        controls().find((input) => !input.matches(':disabled'))
      if (!mounted.current) {
        mounted.current = true
        if (autoFocus && !root.closest('[hidden], [inert]')) target()?.focus()
      } else if (
        focused.current &&
        !focused.current.isConnected &&
        root.ownerDocument.activeElement === root.ownerDocument.body &&
        !root.closest('[hidden], [inert]')
      ) {
        focused.current = null
        target()?.focus({ preventScroll: true })
      }
    })
    const [size, setSize] = useState({ inline: 0, block: 0 })
    const measure = useCallback(() => {
      const root = rootRef.current
      if (!root) return
      const boxes = Array.from(
        root.querySelectorAll<HTMLElement>(
          '[data-part="thumb"] .uf-slider__control',
        ),
      ).map((node) => {
        const box = node.parentElement?.hasAttribute('data-membrane-disabled')
          ? node
          : node.parentElement!
        // CSS layout sizes exclude transforms and viewport-coordinate rounding.
        const style = root.ownerDocument.defaultView!.getComputedStyle(box)
        return {
          width: Number.parseFloat(style.width) || 0,
          height: Number.parseFloat(style.height) || 0,
        }
      })
      const inline = Math.max(0, ...boxes.map((box) => box.width))
      const block = Math.max(0, ...boxes.map((box) => box.height))
      if (size.inline !== inline || size.block !== block)
        setSize({ inline, block })
    }, [size])
    // Value text can change width before ResizeObserver delivers its next frame.
    useCommitEffect(measure)
    useCommitEffect(() => {
      const root = rootRef.current
      if (!root) return
      const Observer = root.ownerDocument.defaultView?.ResizeObserver
      if (!Observer) return
      const observer = new Observer(measure)
      root
        .querySelectorAll('[data-part="thumb"] .uf-slider__control')
        .forEach((node) => observer.observe(node))
      return () => observer.disconnect()
    }, [measure, showValue, membrane, values.length])
    const begin = (
      kind: Gesture['kind'],
      index: number,
      source: Gesture['source'],
    ) => {
      if (
        gesture.current?.kind === kind &&
        gesture.current.index === index &&
        gesture.current.source === source
      )
        return
      finish()
      const start = [
        ...(kind === 'value'
          ? latest.current.values
          : latest.current.selection),
      ]
      gesture.current = {
        kind,
        index,
        source,
        start,
        proposed: start,
        accepted: start,
      }
    }
    const propose = (
      kind: Gesture['kind'],
      index: number,
      candidate: number,
    ) => {
      if (latest.current.props.disabled) return
      const current =
        kind === 'value' ? latest.current.values : latest.current.selection
      const acceptedCrop = latest.current.selection
      const constrain =
        latest.current.props.crop && latest.current.props.clampToCrop !== false
      const minimum = constrain ? acceptedCrop[0] : grid.min
      const maximum = constrain ? acceptedCrop[1] : grid.max
      const low =
        kind === 'value'
          ? (current[index - 1] ?? minimum)
          : index === 0
            ? grid.min
            : current[0]
      const high =
        kind === 'value'
          ? (current[index + 1] ?? maximum)
          : index === 0
            ? current[1]
            : grid.max
      const next = [...current]
      next[index] = Math.max(low, Math.min(high, grid.snap(candidate)))
      if (equal(next, current)) return
      if (gesture.current) gesture.current.proposed = next
      if (kind === 'value') {
        if (latest.current.props.value === undefined) setInternal(next)
        latest.current.props.onValueChange?.({ value: [...next] })
      } else {
        const range = { min: next[0], max: next[1] }
        if (latest.current.props.cropRange === undefined) setInternalCrop(range)
        latest.current.props.onCropChange?.({ ...range })
      }
    }
    const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
      rest.onKeyDown?.(event)
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return
      const input = event.target as HTMLInputElement
      if (!controls().includes(input) || input.matches(':disabled')) return
      const rtl =
        input.ownerDocument.defaultView?.getComputedStyle(rootRef.current!)
          .direction === 'rtl'
      const delta =
        event.key === 'ArrowUp'
          ? 1
          : event.key === 'ArrowDown'
            ? -1
            : event.key === 'ArrowRight'
              ? rtl
                ? -1
                : 1
              : event.key === 'ArrowLeft'
                ? rtl
                  ? 1
                  : -1
                : event.key === 'PageUp'
                  ? 10
                  : event.key === 'PageDown'
                    ? -10
                    : 0
      if (!delta && event.key !== 'Home' && event.key !== 'End') return
      event.preventDefault()
      const kind = input.dataset.kind as Gesture['kind'],
        index = Number(input.dataset.index)
      begin(kind, index, 'key')
      propose(
        kind,
        index,
        event.key === 'Home'
          ? Number(input.min)
          : event.key === 'End'
            ? Number(input.max)
            : grid.move(Number(input.value), delta),
      )
    }
    const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
      rest.onPointerDown?.(event)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.isPrimary === false ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        gesture.current?.source === 'pointer'
      )
        return
      const track = trackRef.current,
        root = rootRef.current
      if (
        !track ||
        !root ||
        !(event.target as Element).closest('[data-slider-body]')
      )
        return
      const available = controls().filter(
        (input) => !input.matches(':disabled'),
      )
      if (!available.length) return
      const rtl =
        root.ownerDocument.defaultView?.getComputedStyle(root).direction ===
        'rtl'
      const rect = track.getBoundingClientRect()
      const vertical = orientation === 'vertical'
      const length = vertical ? rect.height : rect.width
      if (length <= 0) return
      const coordinate = (x: number, y: number) =>
        vertical ? rect.bottom - y : rtl ? rect.right - x : x - rect.left
      const point = coordinate(event.clientX, event.clientY)
      const hit = (event.target as Element)
        .closest('[data-slider-handle]')
        ?.querySelector<HTMLInputElement>('input')
      const trackKind = (event.target as Element).closest(
        '[data-slider-crop-track]',
      )
        ? 'crop'
        : 'value'
      const candidates = available.filter(
        (input) => input.dataset.kind === trackKind,
      )
      if (!candidates.length) return
      const input =
        hit && available.includes(hit)
          ? hit
          : candidates.reduce((nearest, next) => {
              const distance = Math.abs(
                point - grid.ratio(Number(next.value)) * length,
              )
              const previous = Math.abs(
                point - grid.ratio(Number(nearest.value)) * length,
              )
              return distance < previous ||
                (distance === previous &&
                  point > grid.ratio(Number(next.value)) * length)
                ? next
                : nearest
            }, candidates[0])
      if (!input) return
      event.preventDefault()
      const kind = input.dataset.kind as Gesture['kind'],
        index = Number(input.dataset.index)
      begin(kind, index, 'pointer')
      input.focus({ preventScroll: true })
      if (event.isTrusted) input.setPointerCapture?.(event.pointerId)
      const offset = hit ? point - grid.ratio(Number(input.value)) * length : 0
      const pointerId = event.pointerId
      const captured = input.hasPointerCapture?.(pointerId) === true
      const update = (x: number, y: number) => {
        if (
          input.matches(':disabled') ||
          (captured && !input.hasPointerCapture(pointerId))
        ) {
          cancel()
          return
        }
        const currentRect = track.getBoundingClientRect()
        const currentLength = vertical ? currentRect.height : currentRect.width
        if (currentLength <= 0) {
          cancel()
          return
        }
        const position = vertical
          ? currentRect.bottom - y
          : rtl
            ? currentRect.right - x
            : x - currentRect.left
        propose(
          kind,
          index,
          grid.fromRatio((position - offset) / currentLength),
        )
      }
      const move = (next: globalThis.PointerEvent) => {
        if (next.pointerId !== pointerId) return
        next.preventDefault()
        update(next.clientX, next.clientY)
      }
      const up = (next: globalThis.PointerEvent) => {
        if (next.pointerId === pointerId) {
          if (captured && !input.hasPointerCapture(pointerId)) cancel()
          else finish()
        }
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
    const describe = (n: number, index: number, kind: Gesture['kind']) => {
      const text = formatValue
        ? formatValue({ value: n, index, kind })
        : String(n)
      if (typeof text !== 'string' || !text.trim())
        throw new TypeError('Slider formatValue must return nonempty text')
      return text
    }
    const renderHandle = (n: number, index: number, kind: Gesture['kind']) => {
      const isCrop = kind === 'crop'
      const suffix = isCrop
        ? index === 0
          ? 'Crop start'
          : 'Crop end'
        : values.length > 1
          ? String(index + 1)
          : ''
      const custom = isCrop
        ? index === 0
          ? labels?.cropStart
          : labels?.cropEnd
        : labels?.thumbs?.[index]
      const customName =
        custom === undefined
          ? undefined
          : resolveLabel(custom, '', 'Slider control label')
      if (custom !== undefined && !customName)
        throw new TypeError('Slider control labels must be nonempty')
      const suffixId = `${id}-${kind}-${index}-name`
      const low = isCrop
        ? index === 0
          ? grid.min
          : selection[0]
        : (values[index - 1] ?? lower)
      const high = isCrop
        ? index === 0
          ? selection[1]
          : grid.max
        : (values[index + 1] ?? upper)
      const text = describe(n, index, kind)
      return (
        <span
          key={`${kind}-${index}`}
          {...attrs(isCrop ? 'crop' : 'thumb')}
          data-slider-handle=""
          data-crop={isCrop ? (index === 0 ? 'min' : 'max') : undefined}
          className="uf-slider__handle"
          style={{ '--uf-slider-position': grid.ratio(n) } as CSSProperties}
        >
          <Membrane enabled={membrane} interactive target="input">
            <span className="uf-slider__control">
              <input
                {...attrs('input')}
                ref={!isCrop && index === 0 ? formRef : undefined}
                type="range"
                tabIndex={0}
                data-kind={kind}
                data-index={index}
                name={isCrop ? cropName : name}
                form={form}
                min={low}
                max={high}
                step={step}
                value={n}
                disabled={disabled}
                title={showValue && !isCrop ? text : undefined}
                aria-orientation={orientation}
                aria-label={
                  customName ||
                  (!labelledby
                    ? [explicitLabel, suffix].filter(Boolean).join(' ') ||
                      undefined
                    : undefined)
                }
                aria-labelledby={
                  !customName && labelledby
                    ? [labelledby, suffix ? suffixId : undefined]
                        .filter(Boolean)
                        .join(' ')
                    : undefined
                }
                aria-describedby={rest['aria-describedby']}
                aria-invalid={rest['aria-invalid']}
                aria-errormessage={rest['aria-errormessage']}
                aria-valuetext={formatValue ? text : undefined}
                onFocus={(event) => {
                  focused.current = event.currentTarget
                }}
                onChange={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.nativeEvent.defaultPrevented ||
                    event.currentTarget.matches(':disabled')
                  )
                    return
                  const native = !gesture.current
                  if (native) begin(kind, index, 'native')
                  propose(kind, index, Number(event.currentTarget.value))
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
                {isCrop ? null : showValue ? (
                  <bdi className="uf-slider__valueText">{text}</bdi>
                ) : null}
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
        {...rest}
        {...attrs('root')}
        ref={composedRef}
        role="group"
        className={cn('uf-slider', className)}
        data-orientation={orientation}
        data-disabled={disabled ? '' : undefined}
        data-crop={crop ? '' : undefined}
        data-show-value={showValue ? '' : undefined}
        aria-label={labelledby ? undefined : explicitLabel}
        aria-labelledby={labelledby}
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
            ...rest.style,
          } as CSSProperties
        }
        onKeyDown={navigate}
        onKeyUp={(event) => {
          rest.onKeyUp?.(event)
          if (
            gesture.current?.source === 'key' &&
            /^(Arrow|Page|Home$|End$)/.test(event.key)
          )
            event.defaultPrevented ? cancel() : finish()
        }}
        onBlur={(event) => {
          rest.onBlur?.(event)
          if (gesture.current?.source === 'key') finish()
        }}
        onPointerDown={pointerDown}
      >
        {hasLabel && (
          <Text
            {...attrs('label')}
            id={labelId}
            membrane={membrane}
            className="uf-slider__label"
          >
            {label}
          </Text>
        )}
        <div className="uf-slider__body" data-slider-body="">
          <div {...attrs('track')} ref={trackRef} className="uf-slider__track">
            <span
              {...attrs('range')}
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
              <div className="uf-slider__crop-track" data-slider-crop-track="">
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
      </div>
    )
  },
)
