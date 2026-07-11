/**
 * SegmentedControl — mode-switch strip with single or multiple selection.
 *
 * Canonical engine for the segmented/toggle control. `Toggle` is a thin
 * compatibility wrapper over this component (see Toggle/Toggle.tsx).
 *
 * `<SegmentedControl items={[...]} />`
 * `<SegmentedControl selectionMode="multiple" items={[...]} />`
 */

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { toggleMachine, connectToggle } from '../assets/machines/toggle.machine'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SegmentedControlItem {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps {
  /** Segment options. */
  items?: SegmentedControlItem[]
  /** Currently selected segment values. */
  value?: string[]
  /** Uncontrolled initial selected segment values. */
  defaultValue?: string[]
  /** Selection mode: single or multiple. */
  selectionMode?: 'single' | 'multiple'
  /** Disabled state for the entire group. */
  disabled?: boolean
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible name for the segmented group. */
  ariaLabel?: string
  /** Callback when selected segment values change. */
  onValueChange?: (details: { value: string[] }) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper around each segment item. */
  membrane?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function normalizeSegmentValue(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map((item) => String(item)) : undefined
}

function segmentValuesEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  if (left === right) return true
  if (!left || !right) return false
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(props, ref) {
    const {
      items: rawItems,
      value,
      defaultValue,
      selectionMode = 'single',
      disabled = false,
      orientation = 'horizontal',
      ariaLabel,
      onValueChange,
      className,
      membrane = true,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const controlledValue = normalizeSegmentValue(value)
    const isControlled = controlledValue !== undefined
    const machineValue = useControllableMachineProp(controlledValue, normalizeSegmentValue(defaultValue) ?? [])

    const { state, send } = useMachine(toggleMachine, {
      value: machineValue,
      type: selectionMode,
      disabled,
      orientation,
      onValueChange: ((details: { value: string[] }) => {
        if (isControlled && segmentValuesEqual(details.value, controlledValue)) return
        onValueChange?.(details)
      }) as any,
    })

    const api = connectToggle(state, send)
    const itemRefs = useRef(new Map<string, HTMLButtonElement>())
    const [focusedValue, setFocusedValue] = useState<string | null>(null)
    const enabledValues = items
      .filter((item) => !disabled && !item.disabled)
      .map((item) => item.value)
    const rovingValue = (
      (focusedValue && enabledValues.includes(focusedValue) ? focusedValue : null)
      ?? state.context.value.find((itemValue) => enabledValues.includes(itemValue))
      ?? enabledValues[0]
      ?? null
    )

    const moveFocus = useCallback((currentValue: string, direction: 'next' | 'previous' | 'first' | 'last') => {
      const values = items
        .filter((item) => !disabled && !item.disabled)
        .map((item) => item.value)
      if (values.length === 0) return

      const currentIndex = Math.max(0, values.indexOf(currentValue))
      const nextIndex = direction === 'first'
        ? 0
        : direction === 'last'
          ? values.length - 1
          : direction === 'next'
            ? (currentIndex + 1) % values.length
            : (currentIndex - 1 + values.length) % values.length
      const nextValue = values[nextIndex]
      if (!nextValue) return

      setFocusedValue(nextValue)
      itemRefs.current.get(nextValue)?.focus()
      if (selectionMode === 'single' && !state.context.value.includes(nextValue)) {
        send({ type: 'TOGGLE', value: nextValue })
      }
    }, [disabled, items, selectionMode, send, state.context.value])

    const handleItemKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, itemValue: string) => {
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
      const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

      if (event.key === nextKey) {
        event.preventDefault()
        moveFocus(itemValue, 'next')
      } else if (event.key === previousKey) {
        event.preventDefault()
        moveFocus(itemValue, 'previous')
      } else if (event.key === 'Home') {
        event.preventDefault()
        moveFocus(itemValue, 'first')
      } else if (event.key === 'End') {
        event.preventDefault()
        moveFocus(itemValue, 'last')
      }
    }, [moveFocus, orientation])

    return (
      <div
        ref={ref}
        {...api.getRootProps()}
        aria-label={ariaLabel}
        className={cn('uf-toggle', className)}
      >
        {items.map((item) => {
          const itemProps = api.getItemProps({
            value: item.value,
            disabled: item.disabled,
            tabIndex: item.value === rovingValue ? 0 : -1,
          })
          const itemNode = (
            <button
              key={item.value}
              type="button"
              {...itemProps}
              ref={(node) => {
                if (node) itemRefs.current.set(item.value, node)
                else itemRefs.current.delete(item.value)
              }}
              onFocus={() => {
                setFocusedValue(item.value)
                itemProps.onFocus()
              }}
              onKeyDown={(event) => handleItemKeyDown(event, item.value)}
              className={cn('uf-toggle-item', 'uf-option', 'uf-control')}
            >
              {item.label}
            </button>
          )
          if (!membrane) return itemNode
          return (
            <span key={`segment-membrane:${item.value}`} className="uf-membrane" data-membrane-interactive="">
              {itemNode}
            </span>
          )
        })}
      </div>
    )
  },
)
