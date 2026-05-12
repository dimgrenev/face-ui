/**
 * Slider — range input with single or multiple thumbs.
 *
 * `<Slider value={[50]} />`
 * `<Slider value={[20, 80]} label="Price range" />`
 * `<Slider variant="advanced" defaultValue={[42]} crop leading="iconText" leadingIcon="crop" leadingText="Crop" />`
 */

import React, { forwardRef, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { sliderMachine, connectSlider } from '../assets/machines/slider.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import {
  SliderAdvanced,
  type SliderCropRange,
  type SliderLeading,
} from './SliderAdvanced'

export type SliderVariant = 'simple' | 'advanced'

export interface SliderProps {
  /** Simple machine-driven slider or advanced slider from the legacy components library. */
  variant?: SliderVariant
  /** Current value(s). Single thumb = [n], range = [min, max]. */
  value?: number[] | number
  /** Uncontrolled initial value(s). */
  defaultValue?: number[] | number
  /** Legacy scalar value for the advanced slider. */
  scalarValue?: number
  /** Minimum value. */
  min?: number
  /** Maximum value. */
  max?: number
  /** Step increment. */
  step?: number
  /** Disabled state. */
  disabled?: boolean
  /** Orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Label content. */
  label?: ReactNode
  /** Accessible label for thumb controls when a visible label is not rendered. */
  'aria-label'?: string
  /** Callback when value changes. */
  onValueChange?: (details: { value: number[] }) => void
  /** Legacy scalar callback for the advanced slider. */
  onChange?: (value: number) => void
  /** Leading content mode for the advanced slider. */
  leading?: SliderLeading
  /** Leading icon for the advanced slider. */
  leadingIcon?: ReactNode
  /** Leading text for the advanced slider. */
  leadingText?: string
  /** Enables crop handles for the advanced slider. */
  crop?: boolean
  /** Uncontrolled initial crop range for the advanced slider. */
  defaultCropRange?: SliderCropRange
  /** Controlled crop range for the advanced slider. */
  cropRange?: SliderCropRange
  /** Clamps the value to the crop range. */
  cropLocksValue?: boolean
  /** Advanced slider crop callback. */
  onCropChange?: (range: SliderCropRange) => void
  /** Additional CSS class. */
  className?: string
}

function normalizeValues(input: unknown): number[] | undefined {
  if (Array.isArray(input)) {
    const next = input
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
    return next.length > 0 ? next : undefined
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    return [input]
  }

  return undefined
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  function Slider({
    variant = 'simple',
    value,
    defaultValue,
    scalarValue,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = 'horizontal',
    label,
    'aria-label': ariaLabel,
    onValueChange,
    onChange,
    leading = 'none',
    leadingIcon,
    leadingText,
    crop = false,
    defaultCropRange,
    cropRange,
    cropLocksValue = true,
    onCropChange,
    className,
  }, ref) {
    const controlledValue = normalizeValues(value)
    const defaultValues = normalizeValues(defaultValue)

    const advancedFeaturesRequested =
      variant === 'advanced' ||
      scalarValue !== undefined ||
      typeof onChange === 'function' ||
      leading !== 'none' ||
      leadingIcon != null ||
      leadingText != null ||
      crop ||
      defaultCropRange != null ||
      cropRange != null ||
      cropLocksValue !== true

    const canRenderAdvanced =
      orientation === 'horizontal' &&
      (controlledValue?.length ?? defaultValues?.length ?? 1) <= 1

    if (advancedFeaturesRequested && canRenderAdvanced) {
      return (
        <SliderAdvanced
          rootRef={ref}
          value={controlledValue}
          defaultValue={defaultValues}
          scalarValue={scalarValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          label={label}
          aria-label={ariaLabel}
          onValueChange={onValueChange}
          onChange={onChange}
          leading={leading}
          leadingIcon={leadingIcon}
          leadingText={leadingText}
          crop={crop}
          defaultCropRange={defaultCropRange}
          cropRange={cropRange}
          cropLocksValue={cropLocksValue}
          onCropChange={onCropChange}
          className={className}
        />
      )
    }

    const initialValue = defaultValues
      ?? (typeof scalarValue === 'number' && Number.isFinite(scalarValue) ? [scalarValue] : [0])
    const machineValue = useControllableMachineProp(controlledValue, initialValue)

    const handleValueChange = (details: { value: number[] }) => {
      try { onValueChange?.(details) } catch {}
      if (typeof onChange === 'function') {
        try { onChange(Number(details?.value?.[0] ?? 0)) } catch {}
      }
    }

    const { state, send } = useMachine(sliderMachine, {
      value: machineValue,
      min,
      max,
      step,
      disabled,
      orientation,
      onValueChange: handleValueChange,
    })

    const api = connectSlider(state, send)
    const trackRef = useRef<HTMLDivElement | null>(null)
    const isDragging = state.matches('dragging')
    const renderedValues = state.context.value.length > 0 ? state.context.value : initialValue
    const thumbLabelBase = typeof ariaLabel === 'string' && ariaLabel.trim()
      ? ariaLabel
      : (typeof label === 'string' && label.trim() ? label : 'Slider')

    useEffect(() => {
      if (controlledValue !== undefined) return
      if (state.context.value.length > 0) return
      if (!Array.isArray(initialValue) || initialValue.length === 0) return
      send({ type: 'SET_VALUE', value: initialValue })
    }, [controlledValue, initialValue, send, state.context.value.length])

    const getValueFromPointer = useCallback((event: PointerEvent | { clientX: number; clientY: number }) => {
      const el = trackRef.current
      if (!el) return min
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return min
      const ratio = orientation === 'horizontal'
        ? (event.clientX - rect.left) / rect.width
        : (rect.bottom - event.clientY) / rect.height
      const clamped = Math.min(1, Math.max(0, ratio))
      return min + clamped * (max - min)
    }, [max, min, orientation])

    useEffect(() => {
      if (!isDragging || disabled) return undefined

      const onPointerMove = (event: PointerEvent) => {
        const nextValue = getValueFromPointer(event)
        send({ type: 'DRAG', value: nextValue })
      }
      const onPointerUp = () => {
        send({ type: 'DRAG_END' })
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      return () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
      }
    }, [disabled, getValueFromPointer, isDragging, send])

    const handleTrackPointerDown = (event: { clientX: number; clientY: number }) => {
      if (disabled) return
      const currentValues = renderedValues
      const nextValue = getValueFromPointer(event)
      const nearestIndex = currentValues
        .map((current, index) => ({ index, distance: Math.abs(current - nextValue) }))
        .sort((left, right) => left.distance - right.distance)[0]?.index ?? 0
      send({ type: 'DRAG_START', index: nearestIndex })
      send({ type: 'DRAG', value: nextValue })
    }

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-slider', className)}>
        {label != null && (
          <Text {...(api.getLabelProps() as any)} as="label" variant="label">
            {label}
          </Text>
        )}
        <div
          {...api.getTrackProps()}
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className={cn('uf-slider-trackHitArea')}
        >
          <div {...api.getRangeProps()} />
          {renderedValues.map((_, index) => {
            const ariaLabel = renderedValues.length > 1
              ? `${thumbLabelBase} ${index + 1}`
              : thumbLabelBase
            return (
              <div key={index} {...api.getThumbProps(index)} aria-label={ariaLabel} />
            )
          })}
        </div>
      </div>
    )
  },
)

export type {
  SliderCropRange,
  SliderLeading,
}
