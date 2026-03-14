import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { cn } from '../assets/utils'

export type SliderLeading = 'none' | 'icon' | 'text' | 'iconText'

export interface SliderCropRange {
  min: number
  max: number
}

export interface SliderAdvancedProps {
  rootRef?: Ref<HTMLDivElement>
  value?: number[]
  defaultValue?: number[]
  scalarValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: ReactNode
  className?: string
  leading?: SliderLeading
  leadingIcon?: ReactNode
  leadingText?: string
  crop?: boolean
  defaultCropRange?: SliderCropRange
  cropRange?: SliderCropRange
  cropLocksValue?: boolean
  onChange?: (value: number) => void
  onValueChange?: (details: { value: number[] }) => void
  onCropChange?: (range: SliderCropRange) => void
}

type DragKind = null | 'thumb' | 'crop-min' | 'crop-max'

const EDGE_GAP_PX = 2
const MARKER_W_PX = 10
const BUFFER_PX = 2

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function resolveScalar(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (Array.isArray(input)) {
    const first = Number(input[0])
    if (Number.isFinite(first)) return first
  }
  return undefined
}

export function SliderAdvanced({
  rootRef,
  value,
  defaultValue,
  scalarValue,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  label,
  className,
  leading = 'none',
  leadingIcon,
  leadingText,
  crop = false,
  defaultCropRange,
  cropRange,
  cropLocksValue = true,
  onChange,
  onValueChange,
  onCropChange,
}: SliderAdvancedProps) {
  const mn = Math.min(Number(min) || 0, Number(max) || 100)
  const mx = Math.max(Number(min) || 0, Number(max) || 100)
  const safeStep = Number.isFinite(Number(step)) && Number(step) > 0 ? Number(step) : 1

  const snapToStep = (n: number) => {
    const snapped = mn + Math.round((clamp(n, mn, mx) - mn) / safeStep) * safeStep
    return clamp(snapped, mn, mx)
  }

  const controlledValue = resolveScalar(scalarValue ?? value)
  const defaultScalar = resolveScalar(defaultValue) ?? mn
  const isControlled = controlledValue !== undefined

  const cropEnabled = Boolean(crop)
  const cropLocks = cropEnabled && Boolean(cropLocksValue)
  const isCropControlled = cropEnabled && cropRange !== undefined

  const normalizeCrop = (next: SliderCropRange): SliderCropRange => {
    const a = snapToStep(Number(next?.min))
    const b = snapToStep(Number(next?.max))
    let lo = Math.min(a, b)
    let hi = Math.max(a, b)
    const minGap = safeStep
    if ((mx - mn) >= minGap && (hi - lo) < minGap) hi = clamp(lo + minGap, mn, mx)
    lo = clamp(lo, mn, mx)
    hi = clamp(hi, mn, mx)
    if (hi < lo) hi = lo
    return { min: lo, max: hi }
  }

  const [internalValue, setInternalValue] = useState<number>(() => snapToStep(isControlled ? controlledValue as number : defaultScalar))
  const [internalCrop, setInternalCrop] = useState<SliderCropRange>(() => {
    const initialCrop = defaultCropRange ?? { min: mn, max: mx }
    return normalizeCrop(initialCrop)
  })
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [dragCrop, setDragCrop] = useState<SliderCropRange | null>(null)
  const [thumbW, setThumbW] = useState(34)
  const [bodyW, setBodyW] = useState(0)

  const bodyRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const thumbMeasureRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const dragKindRef = useRef<DragKind>(null)
  const dragOffsetRef = useRef(0)

  useEffect(() => {
    if (!isControlled || draggingRef.current) return
    setInternalValue(snapToStep(controlledValue as number))
  }, [controlledValue, isControlled, mn, mx, safeStep])

  useEffect(() => {
    if (isControlled || draggingRef.current) return
    setInternalValue((prev) => snapToStep(prev))
  }, [isControlled, mn, mx, safeStep])

  useEffect(() => {
    if (!cropEnabled) return
    const next = normalizeCrop(isCropControlled ? (cropRange as SliderCropRange) : internalCrop)
    if (!isCropControlled) {
      setInternalCrop((prev) => (prev.min === next.min && prev.max === next.max ? prev : next))
    }
  }, [cropEnabled, isCropControlled, cropRange?.min, cropRange?.max, internalCrop, mn, mx, safeStep])

  const committedCrop = useMemo<SliderCropRange>(() => {
    if (!cropEnabled) return { min: mn, max: mx }
    return normalizeCrop(isCropControlled ? (cropRange as SliderCropRange) : internalCrop)
  }, [cropEnabled, isCropControlled, cropRange, internalCrop, mn, mx, safeStep])

  const renderCrop = cropEnabled && dragCrop && (dragKindRef.current === 'crop-min' || dragKindRef.current === 'crop-max')
    ? dragCrop
    : committedCrop

  const committedValue = isControlled ? (controlledValue as number) : internalValue
  const renderValueRaw = dragKindRef.current === 'thumb' && typeof dragValue === 'number' ? dragValue : committedValue
  const normalizeValueToCrop = (next: number, cropNow: SliderCropRange) => {
    const base = snapToStep(next)
    if (!cropLocks) return base
    return clamp(base, cropNow.min, cropNow.max)
  }
  const renderValue = cropLocks
    ? normalizeValueToCrop(renderValueRaw, renderCrop)
    : snapToStep(renderValueRaw)

  useEffect(() => {
    if (!cropLocks || draggingRef.current) return
    const normalized = normalizeValueToCrop(committedValue, committedCrop)
    if (!Number.isFinite(normalized) || normalized === committedValue) return
    if (!isControlled) setInternalValue(normalized)
    onChange?.(normalized)
    onValueChange?.({ value: [normalized] })
  }, [cropLocks, committedValue, committedCrop.min, committedCrop.max, isControlled, onChange, onValueChange])

  const decimals = useMemo(() => {
    const match = String(safeStep).match(/\.(\d+)/)
    return match ? Math.min(6, Math.max(0, match[1]?.length ?? 0)) : 0
  }, [safeStep])

  const formatValue = useMemo(() => {
    return (next: number) => {
      if (!Number.isFinite(next)) return '—'
      return decimals > 0 ? Number(next).toFixed(decimals) : String(Math.round(next))
    }
  }, [decimals])

  const measureLabel = formatValue(renderValueRaw)

  useLayoutEffect(() => {
    const el = thumbMeasureRef.current
    if (!el) return
    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (!Number.isFinite(width) || width <= 0) return
      setThumbW((prev) => {
        const next = Math.max(24, Number(width.toFixed(2)))
        return prev === next ? prev : next
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    return () => observer.disconnect()
  }, [measureLabel])

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (!Number.isFinite(width) || width <= 0) return
      setBodyW((prev) => {
        const next = Number(width.toFixed(2))
        return prev === next ? prev : next
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geom = useMemo(() => {
    const trackW = bodyW - (EDGE_GAP_PX * 2)
    const thumbUsable = trackW - thumbW
    const markerUsable = trackW - MARKER_W_PX
    return {
      ok: Number.isFinite(trackW) && trackW > 0 && Number.isFinite(thumbUsable) && thumbUsable > 0 && Number.isFinite(markerUsable) && markerUsable > 0,
      trackW,
      thumbUsable,
      markerUsable,
    }
  }, [bodyW, thumbW])

  const tFromValue = (next: number) => {
    const range = mx - mn
    if (!Number.isFinite(next) || !Number.isFinite(range) || range <= 0) return 0
    return clamp((next - mn) / range, 0, 1)
  }

  const valueFromT = (t: number) => {
    const range = mx - mn
    if (!Number.isFinite(range) || range <= 0) return mn
    return snapToStep(mn + clamp(t, 0, 1) * range)
  }

  const cropLeftPx = useMemo(() => {
    if (!cropEnabled || !geom.ok) return 0
    const lo = clamp(Math.min(renderCrop.min, renderCrop.max), mn, mx)
    const tLo = tFromValue(lo)
    const pad = MARKER_W_PX + BUFFER_PX
    const usable = geom.thumbUsable - (pad * 2)
    const thumbLeftAtLo = pad + tLo * usable
    return clamp(thumbLeftAtLo - pad, 0, geom.trackW - MARKER_W_PX)
  }, [cropEnabled, geom.ok, geom.thumbUsable, geom.trackW, mn, mx, renderCrop.min, renderCrop.max])

  const cropRightPx = useMemo(() => {
    if (!cropEnabled || !geom.ok) return 0
    const hi = clamp(Math.max(renderCrop.min, renderCrop.max), mn, mx)
    const tHi = tFromValue(hi)
    const pad = MARKER_W_PX + BUFFER_PX
    const usable = geom.thumbUsable - (pad * 2)
    const thumbLeftAtHi = pad + tHi * usable
    return clamp(thumbLeftAtHi + thumbW + BUFFER_PX, 0, geom.trackW - MARKER_W_PX)
  }, [cropEnabled, geom.ok, geom.thumbUsable, geom.trackW, mn, mx, renderCrop.min, renderCrop.max, thumbW])

  const emitValue = (next: number) => {
    if (disabled) return
    const normalized = cropLocks ? normalizeValueToCrop(next, renderCrop) : snapToStep(next)
    if (!isControlled) setInternalValue(normalized)
    onChange?.(normalized)
    onValueChange?.({ value: [normalized] })
  }

  const emitCrop = (next: SliderCropRange) => {
    if (!cropEnabled || disabled) return
    const normalized = normalizeCrop(next)
    if (!isCropControlled) setInternalCrop(normalized)
    onCropChange?.(normalized)
  }

  const startThumbDrag = (clientX: number, rect: DOMRect | ReturnType<NonNullable<HTMLDivElement['getBoundingClientRect']>>) => {
    draggingRef.current = true
    dragKindRef.current = 'thumb'
    setDragValue(Number.isFinite(renderValue) ? renderValue : null)

    if (geom.ok) {
      const downX = (clientX - rect.left) - EDGE_GAP_PX
      const tCur = tFromValue(renderValue)
      const pad = cropLocks ? (MARKER_W_PX + BUFFER_PX) : 0
      const usable = cropLocks ? (geom.thumbUsable - (pad * 2)) : geom.thumbUsable
      const thumbLeft = cropLocks ? (pad + tCur * usable) : (tCur * usable)
      const thumbRight = thumbLeft + thumbW
      const hitThumb = downX >= thumbLeft && downX <= thumbRight
      dragOffsetRef.current = hitThumb ? clamp(downX - thumbLeft, 0, thumbW) : thumbW / 2

      if (!hitThumb) {
        const desiredLeft = downX - dragOffsetRef.current
        const left = cropLocks ? clamp(desiredLeft, pad, pad + usable) : clamp(desiredLeft, 0, usable)
        const tThumb = cropLocks
          ? clamp((left - pad) / Math.max(1e-9, usable), 0, 1)
          : clamp(left / Math.max(1e-9, usable), 0, 1)
        const next = valueFromT(tThumb)
        setDragValue(next)
        emitValue(next)
      }
    } else {
      dragOffsetRef.current = thumbW / 2
    }

    const onMove = (nextEvent: PointerEvent) => {
      if (!draggingRef.current || dragKindRef.current !== 'thumb' || !geom.ok) return
      const x = (nextEvent.clientX - rect.left) - EDGE_GAP_PX
      const desiredLeft = x - dragOffsetRef.current
      const pad = cropLocks ? (MARKER_W_PX + BUFFER_PX) : 0
      const usable = cropLocks ? (geom.thumbUsable - (pad * 2)) : geom.thumbUsable
      const left = cropLocks ? clamp(desiredLeft, pad, pad + usable) : clamp(desiredLeft, 0, usable)
      const tThumb = cropLocks
        ? clamp((left - pad) / Math.max(1e-9, usable), 0, 1)
        : clamp(left / Math.max(1e-9, usable), 0, 1)
      const next = valueFromT(tThumb)
      setDragValue(next)
      emitValue(next)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      draggingRef.current = false
      dragKindRef.current = null
      dragOffsetRef.current = 0
      setDragValue(null)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
  }

  const startCropDrag = (
    which: 'min' | 'max',
    clientX: number,
    rect: DOMRect | ReturnType<NonNullable<HTMLDivElement['getBoundingClientRect']>>,
  ) => {
    draggingRef.current = true
    dragKindRef.current = which === 'min' ? 'crop-min' : 'crop-max'
    setDragCrop(committedCrop)

    if (geom.ok) {
      const downX = (clientX - rect.left) - EDGE_GAP_PX
      const markerLeft = which === 'min' ? cropLeftPx : cropRightPx
      dragOffsetRef.current = clamp(downX - markerLeft, 0, MARKER_W_PX)
    } else {
      dragOffsetRef.current = MARKER_W_PX / 2
    }

    const onMove = (nextEvent: PointerEvent) => {
      if (!draggingRef.current || !geom.ok) return
      const x = (nextEvent.clientX - rect.left) - EDGE_GAP_PX
      const desiredLeft = x - dragOffsetRef.current
      let markerLeft = clamp(desiredLeft, 0, geom.markerUsable)

      const currentValue = Number(dragKindRef.current === 'thumb' && typeof dragValue === 'number' ? dragValue : renderValue)
      const tCur = tFromValue(currentValue)
      const pad = cropEnabled ? (MARKER_W_PX + BUFFER_PX) : 0
      const usable = cropEnabled ? (geom.thumbUsable - (pad * 2)) : geom.thumbUsable
      const thumbLeft = cropEnabled ? (pad + tCur * usable) : (tCur * usable)
      const thumbRight = thumbLeft + thumbW
      const otherLeft = which === 'min' ? cropRightPx : cropLeftPx
      const minSpanPx = MARKER_W_PX + (BUFFER_PX * 2) + thumbW

      if (which === 'min') markerLeft = Math.min(markerLeft, otherLeft - minSpanPx)
      else markerLeft = Math.max(markerLeft, otherLeft + minSpanPx)

      if (cropLocks) {
        if (which === 'min') markerLeft = Math.min(markerLeft, (thumbLeft - BUFFER_PX) - MARKER_W_PX)
        else markerLeft = Math.max(markerLeft, thumbRight + BUFFER_PX)
      }

      markerLeft = clamp(markerLeft, 0, geom.markerUsable)

      const thumbLeftAtBoundary = which === 'min'
        ? (markerLeft + MARKER_W_PX + BUFFER_PX)
        : (markerLeft - thumbW - BUFFER_PX)

      const pad2 = cropEnabled ? (MARKER_W_PX + BUFFER_PX) : 0
      const usable2 = cropEnabled ? (geom.thumbUsable - (pad2 * 2)) : geom.thumbUsable
      const t = cropEnabled
        ? clamp((thumbLeftAtBoundary - pad2) / Math.max(1e-9, usable2), 0, 1)
        : clamp(thumbLeftAtBoundary / Math.max(1e-9, usable2), 0, 1)

      const nextValue = valueFromT(t)
      const nextCrop = normalizeCrop(which === 'min'
        ? { min: nextValue, max: (dragCrop ?? committedCrop).max }
        : { min: (dragCrop ?? committedCrop).min, max: nextValue })

      setDragCrop(nextCrop)
      emitCrop(nextCrop)

      if (cropLocks) {
        const clampedValue = normalizeValueToCrop(currentValue, nextCrop)
        setDragValue(clampedValue)
        emitValue(clampedValue)
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      draggingRef.current = false
      dragKindRef.current = null
      dragOffsetRef.current = 0
      setDragCrop(null)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return

    event.preventDefault()
    event.stopPropagation()
    inputRef.current?.focus?.()

    try {
      const target = event.target as HTMLElement | null
      if (cropEnabled && target?.closest?.('.uf-slider-cropMarker--left')) {
        startCropDrag('min', event.clientX, rect)
        return
      }
      if (cropEnabled && target?.closest?.('.uf-slider-cropMarker--right')) {
        startCropDrag('max', event.clientX, rect)
        return
      }
    } catch {
      // no-op
    }

    startThumbDrag(event.clientX, rect)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const next = Number(event.target.value)
    emitValue(next)
  }

  const sliderClasses = cn(
    'uf-slider',
    'uf-slider--advanced',
    disabled && 'uf-slider--disabled',
    cropEnabled && 'uf-slider--crop',
    className,
  )

  const resolvedLeadingIcon = typeof leadingIcon === 'string'
    ? <Icon name={leadingIcon} />
    : leadingIcon

  const leadingNode = (() => {
    if (leading === 'none') return null
    const iconNode = resolvedLeadingIcon ? <span className="uf-slider-leadingIcon">{resolvedLeadingIcon}</span> : null
    const textNode = leadingText ? (
      <Text membrane={false} variant="body" className="uf-slider-leadingText">
        {leadingText}
      </Text>
    ) : null
    if (leading === 'icon') return iconNode
    if (leading === 'text') return textNode
    if (!iconNode && !textNode) return null
    return (
      <span className="uf-slider-leadingIconText">
        {iconNode}
        {textNode}
      </span>
    )
  })()

  return (
    <div ref={rootRef} className={sliderClasses}>
      {label != null && (
        <Text as="label" variant="label">
          {label}
        </Text>
      )}

      <div
        className="uf-slider-row"
        style={{
          ['--uf-slider-t' as string]: String(tFromValue(renderValue)),
          ['--uf-slider-crop-left-px' as string]: `${Number(cropLeftPx).toFixed(2)}px`,
          ['--uf-slider-crop-right-px' as string]: `${Number(cropRightPx).toFixed(2)}px`,
          ['--uf-slider-crop-thumb-pad' as string]: `${MARKER_W_PX + BUFFER_PX}px`,
          ['--uf-slider-thumb-w' as string]: `${thumbW}px`,
        } as CSSProperties}
      >
        {leadingNode ? <div className="uf-slider-leading">{leadingNode}</div> : null}

        <div
          ref={bodyRef}
          className="uf-slider-body"
          aria-disabled={disabled ? 'true' : 'false'}
          onPointerDown={handlePointerDown}
        >
          <div className="uf-slider-track" aria-hidden="true">
            {cropEnabled ? (
              <div className="uf-slider-trackAllowed" aria-hidden="true">
                <div className="uf-slider-fill" />
              </div>
            ) : (
              <div className="uf-slider-fill" />
            )}
          </div>

          <div ref={thumbMeasureRef} className="uf-slider-thumbMeasure" aria-hidden="true">
            <Button
              membrane={false}
              type="button"
              tabIndex={-1}
              fullWidth={false}
              align="center"
              variant="outline"
              text={measureLabel}
              className="uf-slider-thumbButton uf-slider-thumbButton--measure"
            />
          </div>

          <div className="uf-slider-thumbButtonWrap" aria-hidden="true">
            <Button
              membrane={false}
              type="button"
              tabIndex={-1}
              fullWidth={false}
              align="center"
              variant="outline"
              text={formatValue(renderValue)}
              className="uf-slider-thumbButton"
            />
          </div>

          <input
            ref={inputRef}
            type="range"
            min={cropLocks ? renderCrop.min : mn}
            max={cropLocks ? renderCrop.max : mx}
            value={Number(renderValue)}
            step={safeStep}
            disabled={disabled}
            onChange={handleInputChange}
            className="uf-slider-input"
            aria-label={typeof label === 'string' ? label : 'Slider'}
          />

          {cropEnabled && (
            <>
              <button
                type="button"
                className="uf-slider-cropMarker uf-slider-cropMarker--left"
                aria-label="Crop start"
              >
                <Icon name="crop" />
              </button>
              <button
                type="button"
                className="uf-slider-cropMarker uf-slider-cropMarker--right"
                aria-label="Crop end"
              >
                <Icon name="crop" style={{ transform: 'scaleX(-1)' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
