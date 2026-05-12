/**
 * Select — option picker (shell pattern).
 *
 * Handles open/close and value selection. Supports single and multi-select.
 * The machine manages state; the adapter renders the option list.
 *
 * `<Select options={items} placeholder="Choose..." />`
 * `<Select type="multiselect" options={items} value={['a','b']} />`
 */
import { forwardRef, useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { selectMachine, connectSelect } from '../assets/machines/select.machine'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface SelectProps {
  /** Available options. */
  options: SelectOption[]
  /** Current selected value. String for single, string[] for multiselect. */
  value?: string | string[] | null
  /** Uncontrolled initial selected value. */
  defaultValue?: string | string[] | null
  /** Placeholder text when no value is selected. */
  placeholder?: string
  /** Disable the select. */
  disabled?: boolean
  /** Selection mode. */
  type?: 'select' | 'multiselect'
  /** Label rendered above/beside the select. */
  label?: ReactNode
  /** Label placement relative to the control. */
  labelOrientation?: 'vertical' | 'horizontal'
  /** Accessible label (aria-label). */
  ariaLabel?: string
  /** Optional override for the text shown in the trigger. */
  displayValue?: string
  /** Stretch the value area so the arrow pins to the right edge. */
  stretchText?: boolean
  /** Callback when value changes. */
  onValueChange?: (details: { value: string | string[] | null }) => void
  /** Legacy value-change alias. */
  onChange?: (value: string | string[] | null) => void
  /** Callback when open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Preferred content surface. Auto switches to bottom sheet on compact viewports. */
  surface?: ResponsiveOverlaySurface
  /** Breakpoint where auto surfaces switch from popover to sheet. */
  surfaceBreakpoint?: number
  /** Optional title used for the mobile sheet header. */
  surfaceTitle?: ReactNode
  /** Outer membrane wrapper around trigger/option geometry. */
  membrane?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayValue(
  value: string | string[] | null,
  options: SelectOption[],
): ReactNode {
  if (value == null) return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return value
      .map((v) => {
        const opt = options.find((o) => o.value === v)
        return opt ? opt.label : v
      })
      .reduce<ReactNode[]>((acc, label, i) => {
        if (i > 0) acc.push(', ')
        acc.push(label)
        return acc
      }, [])
  }
  const opt = options.find((o) => o.value === value)
  return opt ? opt.label : value
}

function selectValuesEqual(
  left: string | string[] | null | undefined,
  right: string | string[] | null | undefined,
): boolean {
  if (Object.is(left, right)) return true
  if (!Array.isArray(left) || !Array.isArray(right)) return false
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

function renderSelectLabelNode(node: ReactNode, className?: string) {
  if (node == null) return null
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return (
      <Text as="span" membrane={false} inset="none" className={className}>
        {String(node)}
      </Text>
    )
  }
  return (
    <span className={className}>
      {node}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  function Select(props, ref) {
    const {
      options: rawOptions,
      value,
      defaultValue,
      placeholder,
      disabled = false,
      type = 'select',
      label,
      labelOrientation = 'vertical',
      ariaLabel,
      displayValue: displayValueOverride,
      stretchText = false,
      onValueChange,
      onOpenChange,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      surfaceTitle,
      membrane = true,
      className,
    } = props

    const options = Array.isArray(rawOptions) ? rawOptions : []
    const optionOrder = options.map((option) => option.value)
    const disabledValues = options
      .filter((option) => option.disabled)
      .map((option) => option.value)
    const selectId = useId()
    const rootRef = useRef<HTMLDivElement | null>(null)
    const triggerElRef = useRef<HTMLElement | null>(null)
    const contentElRef = useRef<HTMLDivElement | null>(null)
    const machineValue = useControllableMachineProp(
      value !== undefined ? value : undefined,
      defaultValue ?? (type === 'multiselect' ? [] : null),
    )

    const { state, send } = useMachine(selectMachine, {
      value: machineValue,
      optionOrder,
      disabledValues,
      disabled,
      type,
      onValueChange: ((details: { value: string | string[] | null }) => {
        if (value !== undefined && selectValuesEqual(details?.value, value)) return
        try { onValueChange?.(details) } catch {}
        if (typeof props.onChange === 'function') {
          try { props.onChange(details?.value ?? null) } catch {}
        }
      }) as any,
      onOpenChange,
    })
    const api = connectSelect(state, send)
    const isOpen = state.matches('open')
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint)
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && resolvedSurface === 'popover',
      triggerRef: triggerElRef,
      contentRef: contentElRef,
      side: 'bottom',
      align: 'start',
      sideOffset: 4,
      matchTriggerWidth: true,
    })
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')

    useEffect(() => {
      if (!isOpen || resolvedSurface !== 'popover') return

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node | null
        if (!target) return
        if (rootRef.current?.contains(target)) return
        if (contentElRef.current?.contains(target)) return
        send({ type: 'CLOSE' })
      }

      document.addEventListener('mousedown', handlePointerDown)
      return () => {
        document.removeEventListener('mousedown', handlePointerDown)
      }
    }, [isOpen, resolvedSurface, send])

    const mergedRef = useCallback((node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref && typeof ref === 'object') ref.current = node
    }, [ref])

    const computedDisplay = getDisplayValue(state.context.value, options)
    const triggerLabel = displayValueOverride ?? computedDisplay ?? placeholder ?? 'Select…'
    const isPlaceholder = computedDisplay == null && !displayValueOverride
    const triggerId = `uf-select:${selectId}:trigger`
    const labelId = label != null ? `uf-select:${selectId}:label` : undefined
    const contentId = `uf-select:${selectId}:listbox`
    const highlightedOptionIndex = state.context.highlightedValue == null
      ? -1
      : options.findIndex((option) => (
        option.value === state.context.highlightedValue && !option.disabled
      ))
    const activeDescendantId = highlightedOptionIndex >= 0
      ? `${contentId}:option:${highlightedOptionIndex}`
      : undefined
    const contentProps = api.getContentProps({
      id: contentId,
      labelId,
      ariaLabel,
      activeDescendantId,
    })
    const triggerProps = api.getTriggerProps({
      id: triggerId,
      contentId,
      labelId,
      ariaLabel,
      activeDescendantId,
    })
    const sheetTitle = surfaceTitle ?? label ?? ariaLabel ?? 'Select option'
    const handleTriggerRef = useCallback((node: HTMLButtonElement | null) => {
      triggerElRef.current = node
    }, [])
    const handleContentRef = useCallback((node: HTMLDivElement | null) => {
      contentElRef.current = node
    }, [])
    const triggerNode = (
      <button
        {...triggerProps}
        ref={handleTriggerRef}
        type="button"
        data-stretch-text={stretchText ? '' : undefined}
      >
        {renderSelectLabelNode(triggerLabel, cn('uf-select__value', isPlaceholder && 'uf-select__value--placeholder'))}
        <span className="uf-select__arrow" aria-hidden="true">
          <Icon name="down" size={16} />
        </span>
      </button>
    )
    const contentNode = (
      <div className="uf-select__contentPanel">
        {resolvedSurface === 'sheet' ? (
          <ResponsiveSheetHeader
            title={sheetTitle}
            onClose={() => send({ type: 'CLOSE' })}
          />
        ) : null}
        {options.map((option, index) => {
          const optionProps = api.getOptionProps({
            value: option.value,
            disabled: option.disabled,
            id: `${contentId}:option:${index}`,
          })
          const optionNode = (
            <div
              key={option.value}
              {...optionProps}
              className={cn(
                'uf-select-option',
                'uf-option',
                'uf-control',
                (optionProps as { className?: string }).className,
              )}
            >
              {renderSelectLabelNode(option.label, 'uf-select-optionLabel')}
            </div>
          )
          if (!membrane) return optionNode
          return (
            <span
              key={`option-membrane:${option.value}`}
              className="uf-membrane uf-membrane--full uf-select__optionMembrane"
              data-membrane-interactive=""
              data-membrane-hover=""
              onClick={(event) => {
                if (event.target !== event.currentTarget) return
                ;(optionProps as { onClick?: () => void }).onClick?.()
              }}
            >
              {optionNode}
            </span>
          )
        })}
      </div>
    )

    const contentElement = (
      <div
        ref={handleContentRef}
        {...contentProps}
        className={cn('uf-select__content', (contentProps as { className?: string }).className)}
        data-surface={resolvedSurface}
        style={resolvedSurface === 'popover' ? floatingStyle : undefined}
      >
        {membrane ? (
          <span className="uf-membrane uf-membrane--full uf-select__contentMembrane">
            {contentNode}
          </span>
        ) : contentNode}
      </div>
    )

    const renderedContent = !isOpen
      ? null
      : resolvedSurface === 'sheet' || typeof document === 'undefined'
        ? contentElement
        : createPortal(contentElement, document.body)

    return (
      <div
        ref={mergedRef}
        {...api.getRootProps()}
        data-label-orientation={labelOrientation}
        className={cn('uf-select', className)}
      >
        {label != null && (
          <Text as="label" variant="label" id={labelId} htmlFor={triggerId} data-part="label">
            {label}
          </Text>
        )}
        <div className="uf-select-wrapper">
          {membrane ? (
            <span className="uf-membrane uf-membrane--full">{triggerNode}</span>
          ) : triggerNode}

          {isOpen && resolvedSurface === 'sheet' ? (
            <div
              className="uf-responsive-overlay-backdrop"
              data-state={isOpen ? 'open' : 'closed'}
              onClick={() => send({ type: 'CLOSE' })}
            />
          ) : null}

          {renderedContent}
        </div>
      </div>
    )
  },
)
