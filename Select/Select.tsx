/**
 * Select — option picker (shell pattern).
 *
 * Handles open/close and value selection. Supports single and multi-select.
 * The machine manages state; the adapter renders the option list.
 *
 * `<Select options={items} placeholder="Choose..." />`
 * `<Select type="multiselect" options={items} value={['a','b']} />`
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useDismissOutside } from '../assets/adapters/react/use-dismiss-outside'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { selectAnatomy, selectMachine, connectSelect } from '../assets/machines/select.machine'
import { cn } from '../assets/utils'
import { Card } from '../Card/Card'
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

export type SelectVariant = 'default' | 'side' | 'iconOnly'

export interface SelectProps {
  /** Visual/behavioral variant. */
  variant?: SelectVariant
  /** Available options. */
  options?: SelectOption[]
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
  /** Optional override for the content shown in the trigger. */
  displayValue?: ReactNode
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
  /** Minimum width for popover content. Useful when the trigger is compact. */
  contentMinWidth?: number | string
  /** Outer membrane wrapper around trigger/option geometry. */
  membrane?: boolean
  /** Class applied directly to the trigger button. */
  triggerClassName?: string
  /** Class applied directly to the trigger value node. */
  valueClassName?: string
  /** Class applied directly to the floating content node. */
  contentClassName?: string
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

function formatSelectCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}px` : undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const SELECT_SIDE_BOUNDARY_SELECTOR = '[data-uf-select-side-boundary]'
const SELECT_SIDE_WIDTH = 240
const SELECT_SIDE_MAX_HEIGHT = 480
const SELECT_SIDE_VIEWPORT_INSET = 4
const SELECT_SIDE_GAP = 4
const SELECT_SIDE_MIN_HEIGHT = 80
const SELECT_SIDE_ACTIVE_OPTION_SELECTOR = [
  '[data-part="option"][aria-selected="true"]',
  '[data-part="option"][data-state="selected"]',
  '[data-part="option"][data-highlighted]',
  '[data-part="option"]',
].join(',')

const sideInitialStyle: CSSProperties = {
  position: 'fixed',
  top: -9999,
  left: -9999,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), Math.max(min, max))
}

type SelectSideRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>

export interface SelectSidePosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

export function computeSelectSidePosition(params: {
  triggerRect: SelectSideRect
  boundaryRect: SelectSideRect | null | undefined
  contentHeight: number
  viewportWidth: number
  viewportHeight: number
  requestedWidth?: number
  requestedMaxHeight?: number
  requestedGap?: number
  requestedInset?: number
  activeOptionCenterOffset?: number | null
}): SelectSidePosition {
  const {
    triggerRect,
    boundaryRect,
    contentHeight,
    viewportWidth,
    viewportHeight,
    requestedWidth = SELECT_SIDE_WIDTH,
    requestedMaxHeight = SELECT_SIDE_MAX_HEIGHT,
    requestedGap = SELECT_SIDE_GAP,
    requestedInset = SELECT_SIDE_VIEWPORT_INSET,
    activeOptionCenterOffset,
  } = params
  const inset = Math.max(0, requestedInset)
  const gap = Math.max(0, requestedGap)
  const viewportLeft = inset
  const viewportRight = Math.max(viewportLeft, viewportWidth - inset)
  const viewportTop = inset
  const viewportBottom = Math.max(viewportTop, viewportHeight - inset)
  const boundaryTop = boundaryRect == null
    ? viewportTop
    : clamp(boundaryRect.top, viewportTop, viewportBottom)
  const boundaryBottom = boundaryRect == null
    ? viewportBottom
    : clamp(boundaryRect.bottom, viewportTop, viewportBottom)
  const panelWidth = Math.min(
    requestedWidth,
    Math.max(SELECT_SIDE_MIN_HEIGHT, viewportRight - viewportLeft),
  )
  const verticalMin = Math.min(boundaryTop + gap, viewportBottom)
  const verticalMax = Math.max(verticalMin, boundaryBottom - gap)
  const availableHeight = Math.max(SELECT_SIDE_MIN_HEIGHT, verticalMax - verticalMin)
  const panelHeight = Math.min(
    requestedMaxHeight,
    Math.max(SELECT_SIDE_MIN_HEIGHT, contentHeight || requestedMaxHeight),
    availableHeight,
  )
  const anchorLeft = boundaryRect ? boundaryRect.right : triggerRect.right
  const anchorRight = boundaryRect ? boundaryRect.left : triggerRect.left
  const rightSpace = viewportRight - anchorLeft
  const leftSpace = anchorRight - viewportLeft
  const openLeft = rightSpace < panelWidth + gap && leftSpace > rightSpace
  const desiredLeft = openLeft
    ? anchorRight - panelWidth - gap
    : anchorLeft + gap
  const triggerCenter = triggerRect.top + triggerRect.height / 2
  const desiredTop = typeof activeOptionCenterOffset === 'number' && Number.isFinite(activeOptionCenterOffset)
    ? triggerCenter - activeOptionCenterOffset
    : triggerRect.top

  return {
    top: Math.round(clamp(desiredTop, verticalMin, verticalMax - panelHeight)),
    left: Math.round(clamp(desiredLeft, viewportLeft, viewportRight - panelWidth)),
    width: Math.round(panelWidth),
    maxHeight: Math.round(panelHeight),
  }
}

function readSelectActiveOptionCenterOffset(contentEl: HTMLElement): number | null {
  const activeOption = contentEl.querySelector(SELECT_SIDE_ACTIVE_OPTION_SELECTOR) as HTMLElement | null
  if (!activeOption || typeof activeOption.getBoundingClientRect !== 'function') return null
  const contentRect = contentEl.getBoundingClientRect()
  const optionRect = activeOption.getBoundingClientRect()
  if (
    !Number.isFinite(contentRect.top) ||
    !Number.isFinite(optionRect.top) ||
    !Number.isFinite(optionRect.height) ||
    optionRect.height <= 0
  ) {
    return null
  }
  return optionRect.top - contentRect.top + optionRect.height / 2
}

function resolveSideBoundary(triggerEl: HTMLElement | null) {
  return triggerEl?.closest(SELECT_SIDE_BOUNDARY_SELECTOR) as HTMLElement | null
}

function useSelectSidePosition(options: {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLDivElement | null>
}) {
  const { open, triggerRef, contentRef } = options
  const [style, setStyle] = useState<CSSProperties>(sideInitialStyle)

  const update = useCallback(() => {
    if (typeof window === 'undefined') return
    const triggerEl = triggerRef.current
    const contentEl = contentRef.current
    if (!triggerEl || !contentEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const contentRect = contentEl.getBoundingClientRect()
    const boundaryRect = resolveSideBoundary(triggerEl)?.getBoundingClientRect()
    const activeOptionCenterOffset = readSelectActiveOptionCenterOffset(contentEl)
    const position = computeSelectSidePosition({
      triggerRect,
      boundaryRect,
      contentHeight: contentRect.height,
      activeOptionCenterOffset,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })

    setStyle({
      position: 'fixed',
      top: position.top,
      left: position.left,
      right: 'auto',
      bottom: 'auto',
      width: position.width,
      maxWidth: `calc(100vw - ${SELECT_SIDE_VIEWPORT_INSET * 2}px)`,
      maxHeight: position.maxHeight,
      '--uf-select-content-max-height': `${position.maxHeight}px`,
      overflowY: 'auto',
    } as CSSProperties)
  }, [contentRef, triggerRef])

  useEffect(() => {
    if (!open) {
      setStyle(sideInitialStyle)
      return
    }

    update()
    const rafId = window.requestAnimationFrame(update)
    const handleWindowChange = () => update()
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleWindowChange)
        : null

    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    if (contentRef.current) resizeObserver?.observe(contentRef.current)
    const boundaryEl = resolveSideBoundary(triggerRef.current)
    if (boundaryEl) resizeObserver?.observe(boundaryEl)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [contentRef, open, triggerRef, update])

  return { style, update }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  function Select(props, ref) {
    const {
      variant = 'default',
      options: rawOptions,
      value,
      defaultValue,
      placeholder = 'Select option',
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
      contentMinWidth,
      membrane = true,
      triggerClassName,
      valueClassName,
      contentClassName,
      className,
    } = props

    const isSideVariant = variant === 'side'
    const isIconOnlyVariant = variant === 'iconOnly'
    const options = Array.isArray(rawOptions) ? rawOptions : []
    const optionOrder = options.map((option) => option.value)
    const disabledValues = options
      .filter((option) => option.disabled)
      .map((option) => option.value)
    const selectId = useId()
    const rootRef = useRef<HTMLDivElement | null>(null)
    const triggerElRef = useRef<HTMLElement | null>(null)
    const contentElRef = useRef<HTMLDivElement | null>(null)
    const dismissRefs = useMemo(() => [rootRef, contentElRef], [])
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
    const responsiveSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint)
    const resolvedSurface = isSideVariant ? 'side' : responsiveSurface
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && resolvedSurface === 'popover',
      triggerRef: triggerElRef,
      contentRef: contentElRef,
      side: 'bottom',
      align: 'start',
      sideOffset: 4,
      matchTriggerWidth: true,
    })
    const { style: sideFloatingStyle } = useSelectSidePosition({
      open: isOpen && resolvedSurface === 'side',
      triggerRef: triggerElRef,
      contentRef: contentElRef,
    })
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')
    const sideCloseTimerRef = useRef<number | null>(null)

    const clearSideCloseTimer = useCallback(() => {
      if (sideCloseTimerRef.current == null) return
      window.clearTimeout(sideCloseTimerRef.current)
      sideCloseTimerRef.current = null
    }, [])

    const openSideSelect = useCallback(() => {
      if (disabled || options.length === 0) return
      clearSideCloseTimer()
      send({ type: 'OPEN' })
    }, [clearSideCloseTimer, disabled, options.length, send])

    const scheduleSideClose = useCallback(() => {
      if (!isSideVariant) return
      clearSideCloseTimer()
      sideCloseTimerRef.current = window.setTimeout(() => {
        send({ type: 'CLOSE' })
      }, 80)
    }, [clearSideCloseTimer, isSideVariant, send])

    useEffect(() => () => clearSideCloseTimer(), [clearSideCloseTimer])

    const dismissSelect = useCallback(() => {
      send({ type: 'CLOSE' })
    }, [send])

    useDismissOutside({
      enabled: isOpen && (resolvedSurface === 'popover' || resolvedSurface === 'side'),
      refs: dismissRefs,
      onDismiss: dismissSelect,
    })

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
    const contentMinWidthValue = formatSelectCssSize(contentMinWidth)
    const baseContentStyle = resolvedSurface === 'popover'
      ? floatingStyle
      : resolvedSurface === 'side'
        ? sideFloatingStyle
        : undefined
    const contentStyle = contentMinWidthValue == null
      ? baseContentStyle
      : {
          ...baseContentStyle,
          '--face-runtime-select-content-min-width': contentMinWidthValue,
        } as CSSProperties
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
        disabled={disabled || options.length === 0}
        className={cn((triggerProps as { className?: string }).className, triggerClassName)}
        data-stretch-text={stretchText ? '' : undefined}
        data-icon-only={isIconOnlyVariant ? '' : undefined}
        onMouseEnter={isSideVariant ? openSideSelect : undefined}
        onMouseLeave={isSideVariant ? scheduleSideClose : undefined}
        onClick={isSideVariant ? openSideSelect : (triggerProps as { onClick?: () => void }).onClick}
      >
        {renderSelectLabelNode(triggerLabel, cn('uf-select__value', isPlaceholder && 'uf-select__value--placeholder', valueClassName))}
        {!isIconOnlyVariant ? (
          <span {...selectAnatomy.getPartAttrs('indicator')} className="uf-select__indicator" aria-hidden="true">
            <Icon name={isSideVariant ? 'select-chevron-right' : isOpen ? 'select-chevron-up' : 'select-chevron-down'} />
          </span>
        ) : null}
      </button>
    )
    const contentNode = (
      <Card
        variant="floating"
        padding="membrane"
        radius="base"
        className="uf-select__contentPanel"
      >
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
              onClick={(event) => {
                if (event.target !== event.currentTarget) return
                ;(optionProps as { onClick?: () => void }).onClick?.()
              }}
            >
              {optionNode}
            </span>
          )
        })}
      </Card>
    )

    const contentElement = (
      <div
        ref={handleContentRef}
        {...contentProps}
        className={cn('uf-select__content', (contentProps as { className?: string }).className, contentClassName)}
        data-surface={resolvedSurface}
        data-select-variant={variant}
        data-uf-select-side-boundary={isSideVariant ? '' : undefined}
        data-uf-select-side-panel={isSideVariant ? '' : undefined}
        style={contentStyle}
        onMouseEnter={isSideVariant ? clearSideCloseTimer : undefined}
        onMouseLeave={isSideVariant ? scheduleSideClose : undefined}
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
        data-variant={variant}
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
