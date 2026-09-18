/**
 * Select — option picker (shell pattern).
 *
 * Handles open/close and value selection. Supports single and multi-select.
 * The machine manages state; the adapter renders the option list.
 *
 * `<Select options={items} placeholder="Choose..." />`
 * `<Select multiple options={items} value={['a','b']} />`
 */
import {
  forwardRef,
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { createPortal } from 'react-dom'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { hasSlotContent } from '../assets/slot-content'
import { FormValue } from '../assets/adapters/react/FormValue'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import {
  selectAnatomy,
  selectMachine,
  connectSelect,
  getSelectInitialHighlight,
  type SelectValue,
} from '../assets/machines/select.machine'
import { cn } from '../assets/utils'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectOption {
  /** Stable unique key. Empty string is a valid choice; null means no selection. */
  value: string
  /** Option content. Keep interactive controls outside the listbox. */
  label: ReactNode
  /** Plain accessible/search text for icons or custom React components. */
  textValue?: string
  /** Exclude this option from pointer, keyboard and form selection. */
  disabled?: boolean
}
export type SelectSurface = 'auto' | 'popover' | 'sheet' | 'side'
interface SelectSharedProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'type'
  | 'role'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-activedescendant'
  | 'aria-haspopup'
  | 'aria-required'
  | 'aria-disabled'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'formAction'
  | 'formEncType'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
  | 'popoverTarget'
  | 'popoverTargetAction'
> {
  /** Disable focus, interaction and native form submission. */
  disabled?: boolean
  /** Native form key; multiple values produce repeated entries. */
  name?: string
  /** Associate this field with a form by id. */
  form?: string
  /** Accessible field name when a visible label is not appropriate. */
  'aria-label'?: string
  /** Available choices, with unique values. */
  options?: readonly SelectOption[]
  /** Hint shown when no value or display override is present. */
  placeholder?: string
  /** Visible field label; native aria-label/aria-labelledby override its accessible name. */
  label?: ReactNode
  /** Label placement. Has no effect without a label. */
  labelOrientation?: 'vertical' | 'horizontal'
  /** Replace selected labels in the trigger, for example with a count or icon. */
  displayValue?: ReactNode
  /** A square trigger without a chevron. Supply an accessible field name. */
  iconOnly?: boolean
  /** Fill the available inline width. Defaults to true. */
  fullWidth?: boolean
  /** Expand the value area and align the chevron to the inline end. */
  stretchText?: boolean
  /** Require at least one selection for native form validation. */
  required?: boolean
  /** Controlled popup visibility. Disabled/empty lists cannot be opened. */
  open?: boolean
  /** Uncontrolled initial popup visibility. */
  defaultOpen?: boolean
  /** User requests to open or close the popup. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Auto uses a sheet on compact viewports; side is a hover/click inspector picker. */
  surface?: SelectSurface
  /** Viewport breakpoint used only by surface="auto". */
  surfaceBreakpoint?: number
  /** Mobile sheet heading. Falls back to the field label or accessible name. */
  surfaceTitle?: ReactNode
  /** Accessible name for the sheet close button. */
  closeLabel?: string
  /** Minimum popover width, capped by the viewport. Does not resize side/sheet surfaces. */
  contentMinWidth?: number | string
  /** Shared membrane around the trigger and option geometry. */
  membrane?: boolean
  /** Class on the native trigger button; className/style belong to the visual root. */
  triggerClassName?: string
  /** Class on the trigger value slot. */
  valueClassName?: string
  /** Class on the floating surface. */
  contentClassName?: string
}
interface SelectSingleProps {
  /** Select one option. */
  multiple?: false
  /** Selected option, or null for no selection. */
  value?: string | null
  /** Initial selection, restored on form reset. */
  defaultValue?: string | null
  onValueChange?: (details: { value: string | null }) => void
}
interface SelectMultipleProps {
  /** Select any number of options; selection does not close the popup. */
  multiple: true
  /** Selected options; an empty array means no selection. */
  value?: readonly string[]
  /** Initial selections, restored on form reset. */
  defaultValue?: readonly string[]
  onValueChange?: (details: { value: readonly string[] }) => void
}
export type SelectProps = SelectSharedProps &
  (SelectSingleProps | SelectMultipleProps)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayValue(
  value: SelectValue,
  options: readonly SelectOption[],
): ReactNode {
  if (value == null) return null
  if (typeof value !== 'string') {
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

function normalizeSelectValue(
  value: SelectValue,
  multiple: boolean,
): SelectValue {
  if (multiple)
    return value === null
      ? []
      : typeof value === 'string'
        ? [value]
        : [...new Set(value)]
  return typeof value === 'string' || value === null
    ? value
    : (value[0] ?? null)
}

function selectValuesEqual(
  left: SelectValue | undefined,
  right: SelectValue | undefined,
): boolean {
  if (Object.is(left, right)) return true
  if (!Array.isArray(left) || !Array.isArray(right)) return false
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

function renderSelectLabelNode(node: ReactNode, className?: string) {
  if (!hasSlotContent(node)) return null
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text as="span" membrane={false} inset="none" className={className}>
        {String(node)}
      </Text>
    )
  }
  return <span className={className}>{node}</span>
}

function formatSelectCssSize(
  value: number | string | undefined,
): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? `${value}px` : undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function optionText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number')
        return String(child)
      if (
        isValidElement<{
          children?: ReactNode
          'aria-hidden'?: boolean | 'true' | 'false'
        }>(child)
      ) {
        if (
          child.props['aria-hidden'] === true ||
          child.props['aria-hidden'] === 'true'
        )
          return ''
        return optionText(child.props.children)
      }
      return ''
    })
    .join('')
}
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const SELECT_SIDE_BOUNDARY_SELECTOR = '[data-uf-select-side-boundary]'
const SELECT_SIDE_WIDTH = 240
const SELECT_SIDE_MAX_HEIGHT = 480
const SELECT_SIDE_VIEWPORT_INSET = 4
const SELECT_SIDE_GAP = 4
const SELECT_SIDE_MIN_HEIGHT = 80
const SELECT_SIDE_VISIBLE_OPTION_COUNT = 5
const SELECT_SIDE_OPTION_SELECTOR = '[data-part="option"]'
const SELECT_SIDE_ACTIVE_OPTION_SELECTOR = [
  '[data-part="option"][aria-selected="true"]',
  '[data-part="option"][data-state="selected"]',
  '[data-part="option"][data-highlighted]',
  '[data-part="option"]',
]

const sideInitialStyle: CSSProperties = {
  position: 'fixed',
  top: -9999,
  left: -9999,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), Math.max(min, max))
}

type SelectSideRect = Pick<
  DOMRect,
  'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'
>

export interface SelectSidePosition {
  top: number
  left: number
  width: number
  maxHeight: number
  initialScrollTop: number
}

export function computeSelectSideOptionViewportHeight(params: {
  contentHeight: number
  optionBottomOffsets: number[]
  visibleOptionLimit?: number
}): number {
  const contentHeight = Math.max(0, params.contentHeight)
  const optionBottomOffsets = params.optionBottomOffsets.filter(
    (value) => Number.isFinite(value) && value > 0,
  )
  const visibleOptionLimit = Math.max(
    1,
    Math.floor(params.visibleOptionLimit ?? SELECT_SIDE_VISIBLE_OPTION_COUNT),
  )
  if (optionBottomOffsets.length <= visibleOptionLimit) return contentHeight

  const lastOptionBottom =
    optionBottomOffsets[optionBottomOffsets.length - 1] || contentHeight
  const visibleOptionsBottom =
    optionBottomOffsets[visibleOptionLimit - 1] || contentHeight
  const trailingInset = Math.max(0, contentHeight - lastOptionBottom)
  return Math.min(contentHeight, visibleOptionsBottom + trailingInset)
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
  direction?: 'ltr' | 'rtl'
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
    direction = 'ltr',
  } = params
  const inset = Math.max(0, requestedInset)
  const gap = Math.max(0, requestedGap)
  const viewportLeft = inset
  const viewportRight = Math.max(viewportLeft, viewportWidth - inset)
  const viewportTop = inset
  const viewportBottom = Math.max(viewportTop, viewportHeight - inset)
  const boundaryTop =
    boundaryRect == null
      ? viewportTop
      : clamp(boundaryRect.top, viewportTop, viewportBottom)
  const boundaryBottom =
    boundaryRect == null
      ? viewportBottom
      : clamp(boundaryRect.bottom, viewportTop, viewportBottom)
  const panelWidth = Math.min(
    requestedWidth,
    Math.max(SELECT_SIDE_MIN_HEIGHT, viewportRight - viewportLeft),
  )
  const verticalMin = Math.min(boundaryTop + gap, viewportBottom)
  const verticalMax = Math.max(verticalMin, boundaryBottom - gap)
  const availableHeight = Math.max(
    SELECT_SIDE_MIN_HEIGHT,
    verticalMax - verticalMin,
  )
  const panelHeight = Math.min(
    requestedMaxHeight,
    Math.max(SELECT_SIDE_MIN_HEIGHT, contentHeight || requestedMaxHeight),
    availableHeight,
  )
  const anchorLeft = boundaryRect ? boundaryRect.right : triggerRect.right
  const anchorRight = boundaryRect ? boundaryRect.left : triggerRect.left
  const rightSpace = viewportRight - anchorLeft
  const leftSpace = anchorRight - viewportLeft
  const openLeft =
    direction === 'rtl'
      ? leftSpace >= panelWidth + gap || leftSpace >= rightSpace
      : rightSpace < panelWidth + gap && leftSpace > rightSpace
  // When neither side fits, keep the trigger exposed for hover followed by click.
  if (Math.max(leftSpace, rightSpace) < panelWidth + gap) {
    const below = Math.max(0, verticalMax - triggerRect.bottom - gap)
    const above = Math.max(0, triggerRect.top - gap - verticalMin)
    const openBelow = below >= panelHeight || below >= above
    const height = Math.max(1, Math.min(panelHeight, openBelow ? below : above))
    const top = openBelow
      ? triggerRect.bottom + gap
      : triggerRect.top - gap - height
    const scrollTop =
      typeof activeOptionCenterOffset === 'number' &&
      Number.isFinite(activeOptionCenterOffset)
        ? clamp(
            activeOptionCenterOffset - height / 2,
            0,
            contentHeight - height,
          )
        : 0
    return {
      top: Math.round(clamp(top, verticalMin, verticalMax - height)),
      left: Math.round(
        clamp(
          direction === 'rtl'
            ? triggerRect.right - panelWidth
            : triggerRect.left,
          viewportLeft,
          viewportRight - panelWidth,
        ),
      ),
      width: Math.round(panelWidth),
      maxHeight: Math.round(height),
      initialScrollTop: Math.round(scrollTop),
    }
  }
  const desiredLeft = openLeft
    ? anchorRight - panelWidth - gap
    : anchorLeft + gap
  const triggerCenter = triggerRect.top + triggerRect.height / 2
  const hasActiveOptionOffset =
    typeof activeOptionCenterOffset === 'number' &&
    Number.isFinite(activeOptionCenterOffset)
  const desiredTop = hasActiveOptionOffset
    ? triggerCenter -
      (contentHeight > panelHeight
        ? Math.min(activeOptionCenterOffset, panelHeight / 2)
        : activeOptionCenterOffset)
    : triggerRect.top

  const top = clamp(desiredTop, verticalMin, verticalMax - panelHeight)
  const maxScrollTop = Math.max(0, contentHeight - panelHeight)
  const scrollTop = hasActiveOptionOffset
    ? clamp(top + activeOptionCenterOffset - triggerCenter, 0, maxScrollTop)
    : 0

  return {
    top: Math.round(top),
    left: Math.round(
      clamp(desiredLeft, viewportLeft, viewportRight - panelWidth),
    ),
    width: Math.round(panelWidth),
    maxHeight: Math.max(1, Math.round(panelHeight)),
    initialScrollTop: Math.round(scrollTop),
  }
}

function readSelectSideContentMetrics(contentEl: HTMLElement): {
  contentHeight: number
  maxVisibleHeight: number
  activeOptionCenterOffset: number | null
  scrollViewport: HTMLElement
} {
  const scrollViewport =
    (contentEl.querySelector(
      '.uf-select__contentPanel',
    ) as HTMLElement | null) || contentEl
  const viewportRect = scrollViewport.getBoundingClientRect()
  const scale =
    viewportRect.height > 0 && scrollViewport.offsetHeight > 0
      ? viewportRect.height / scrollViewport.offsetHeight
      : 1
  const scrollTop = scrollViewport.scrollTop
  const contentHeight = Math.max(
    scrollViewport.scrollHeight,
    scrollViewport.offsetHeight,
  )
  const options = Array.from(
    contentEl.querySelectorAll(SELECT_SIDE_OPTION_SELECTOR),
  ) as HTMLElement[]
  const optionBottomOffsets = options.map((option) => {
    const optionRect = option.getBoundingClientRect()
    return (optionRect.bottom - viewportRect.top) / scale + scrollTop
  })
  const maxVisibleHeight = computeSelectSideOptionViewportHeight({
    contentHeight,
    optionBottomOffsets,
  })
  const activeOption = SELECT_SIDE_ACTIVE_OPTION_SELECTOR.map((selector) =>
    contentEl.querySelector<HTMLElement>(selector),
  ).find(Boolean)
  if (
    !activeOption ||
    typeof activeOption.getBoundingClientRect !== 'function'
  ) {
    return {
      contentHeight,
      maxVisibleHeight,
      activeOptionCenterOffset: null,
      scrollViewport,
    }
  }
  const optionRect = activeOption.getBoundingClientRect()
  if (
    !Number.isFinite(viewportRect.top) ||
    !Number.isFinite(optionRect.top) ||
    !Number.isFinite(optionRect.height) ||
    optionRect.height <= 0
  ) {
    return {
      contentHeight,
      maxVisibleHeight,
      activeOptionCenterOffset: null,
      scrollViewport,
    }
  }
  return {
    contentHeight,
    maxVisibleHeight,
    activeOptionCenterOffset:
      (optionRect.top - viewportRect.top + optionRect.height / 2) / scale +
      scrollTop,
    scrollViewport,
  }
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
  const initialScrollSyncedRef = useRef(false)
  const pendingScrollRef = useRef(0)

  const update = useCallback(() => {
    if (typeof window === 'undefined') return
    const triggerEl = triggerRef.current
    const contentEl = contentRef.current
    if (!triggerEl || !contentEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const boundaryRect = resolveSideBoundary(triggerEl)?.getBoundingClientRect()
    const contentMetrics = readSelectSideContentMetrics(contentEl)
    const position = computeSelectSidePosition({
      triggerRect,
      boundaryRect,
      direction:
        getComputedStyle(triggerEl).direction === 'rtl' ? 'rtl' : 'ltr',
      contentHeight: contentMetrics.contentHeight,
      requestedMaxHeight: contentMetrics.maxVisibleHeight,
      activeOptionCenterOffset: contentMetrics.activeOptionCenterOffset,
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
      overflowY: 'visible',
    } as CSSProperties)
    pendingScrollRef.current = position.initialScrollTop
  }, [contentRef, triggerRef])

  useCommitEffect(() => {
    if (!open || style === sideInitialStyle || initialScrollSyncedRef.current)
      return
    const viewport = contentRef.current?.querySelector<HTMLElement>(
      '.uf-select__contentPanel',
    )
    if (!viewport) return
    viewport.scrollTop = pendingScrollRef.current
    initialScrollSyncedRef.current = true
  }, [open, style, contentRef])

  useEffect(() => {
    if (!open) {
      initialScrollSyncedRef.current = false
      setStyle(sideInitialStyle)
      return
    }

    update()
    const rafId = window.requestAnimationFrame(update)
    const handleWindowChange = () => update()
    const handleWindowScroll = (event: Event) => {
      const target = event.target
      if (target instanceof Node && contentRef.current?.contains(target)) {
        return
      }
      update()
    }
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleWindowChange)
        : null

    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    if (contentRef.current) resizeObserver?.observe(contentRef.current)
    const boundaryEl = resolveSideBoundary(triggerRef.current)
    if (boundaryEl) resizeObserver?.observe(boundaryEl)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowScroll, true)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowScroll, true)
    }
  }, [contentRef, open, triggerRef, update])

  return { style, update }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(props, ref) {
    const {
      options: rawOptions,
      value,
      defaultValue,
      multiple = false,
      placeholder = 'Select option',
      disabled = false,
      name,
      form,
      required = false,
      label,
      labelOrientation = 'vertical',
      displayValue,
      iconOnly = false,
      fullWidth = true,
      stretchText = false,
      onValueChange,
      open,
      defaultOpen = false,
      onOpenChange,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      surfaceTitle,
      closeLabel = 'Close',
      contentMinWidth,
      membrane = true,
      triggerClassName,
      valueClassName,
      contentClassName,
      className,
      style,
      id,
      dir,
      lang,
      hidden,
      title,
      onClick,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onBlur,
      'aria-label': ariaLabel,
      'aria-labelledby': labelledBy,
      ...rest
    } = props
    const options = useMemo(() => {
      const seen = new Set<string>()
      // Deterministic rendering for JSON consumers too: the first unique value owns a choice.
      return (Array.isArray(rawOptions) ? rawOptions : []).filter((option) => {
        if (typeof option?.value !== 'string' || seen.has(option.value))
          return false
        seen.add(option.value)
        return true
      })
    }, [rawOptions])
    const optionOrder = options.map((option) => option.value)
    const disabledValues = options
      .filter((option) => option.disabled)
      .map((option) => option.value)
    const optionLabels = Object.fromEntries(
      options.map((option) => [
        option.value,
        option.textValue ?? (optionText(option.label) || option.value),
      ]),
    )
    const unavailable = disabled || !options.some((option) => !option.disabled)
    const selectId = useId()
    const triggerElRef = useRef<HTMLButtonElement | null>(null)
    const contentElRef = useRef<HTMLDivElement | null>(null)
    const listboxRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useComposedRefs(triggerElRef, ref)
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
    useCommitEffect(() => {
      const trigger = triggerElRef.current
      if (trigger)
        setDirection(
          getComputedStyle(trigger).direction === 'rtl' ? 'rtl' : 'ltr',
        )
    })
    const initialValue = useRef<SelectValue>(
      normalizeSelectValue(defaultValue ?? null, multiple),
    )
    const machineValue = useControllableMachineProp<SelectValue>(
      value === undefined ? undefined : normalizeSelectValue(value, multiple),
      initialValue.current,
    )
    const syncingOpen = useRef(false)
    const openedByHover = useRef(false)
    const machine = useMemo(
      () => ({
        ...selectMachine,
        initial:
          (open ?? defaultOpen) && !unavailable
            ? ('open' as const)
            : ('closed' as const),
      }),
      [],
    )
    const { state, send, syncContext } = useMachine(machine, {
      value: machineValue,
      multiple,
      optionOrder,
      optionLabels,
      disabledValues,
      disabled: unavailable,
      onValueChange: (details) => {
        if (value !== undefined && selectValuesEqual(details.value, value))
          return
        if (props.multiple)
          props.onValueChange?.({
            value:
              typeof details.value === 'string' || details.value === null
                ? []
                : details.value,
          })
        else
          props.onValueChange?.({
            value: typeof details.value === 'string' ? details.value : null,
          })
      },
      onOpenChange: (details) => {
        if (!syncingOpen.current) onOpenChange?.(details)
      },
    })
    // Restore controlled state and reconcile dynamic choices before paint, without user callbacks.
    useCommitEffect(() => {
      const normalized = normalizeSelectValue(state.context.value, multiple)
      if (!selectValuesEqual(normalized, state.context.value))
        syncContext({ value: normalized })
      const wanted = !unavailable && (open ?? state.matches('open'))
      if (wanted !== state.matches('open')) {
        syncingOpen.current = true
        try {
          send({ type: wanted ? 'OPEN' : 'CLOSE' })
        } finally {
          syncingOpen.current = false
        }
      } else if (
        wanted &&
        (state.context.highlightedValue === null ||
          !optionOrder.includes(state.context.highlightedValue) ||
          disabledValues.includes(state.context.highlightedValue))
      ) {
        syncContext({
          highlightedValue: getSelectInitialHighlight({
            ...state.context,
            optionOrder,
            disabledValues,
          }),
        })
      }
    })
    const api = connectSelect(state, send)
    const isOpen = !unavailable && (open ?? state.matches('open'))
    const portalTarget = usePortalTarget()
    const responsiveSurface = useResponsiveOverlaySurface(
      surface === 'side' ? 'popover' : surface,
      surfaceBreakpoint,
    )
    const resolvedSurface = surface === 'side' ? 'side' : responsiveSurface
    const isSide = resolvedSurface === 'side'
    const isSheet = resolvedSurface === 'sheet'
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && portalTarget !== null && resolvedSurface === 'popover',
      triggerRef: triggerElRef,
      contentRef: contentElRef,
      side: 'bottom',
      align: 'start',
      dir: direction,
      sideOffset: 4,
      matchTriggerWidth: true,
    })
    const { style: sideFloatingStyle } = useSelectSidePosition({
      open: isOpen && isSide,
      triggerRef: triggerElRef,
      contentRef: contentElRef,
    })
    useBodyScrollLock(isOpen && isSheet)
    const sideCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const clearSideClose = useCallback(() => {
      if (sideCloseTimer.current !== null) clearTimeout(sideCloseTimer.current)
      sideCloseTimer.current = null
    }, [])
    const dismiss = useCallback(() => {
      clearSideClose()
      send({ type: 'CLOSE' })
    }, [clearSideClose, send])
    const scheduleSideClose = () => {
      clearSideClose()
      // A keyboard user can leave the pointer over/outside the surface without losing it.
      if (
        contentElRef.current?.contains(document.activeElement) ||
        triggerElRef.current === document.activeElement
      )
        return
      sideCloseTimer.current = setTimeout(dismiss, 150)
    }
    useEffect(() => clearSideClose, [clearSideClose])
    useLayer({
      enabled: isOpen && (isSheet || portalTarget !== null),
      contentRef: contentElRef,
      triggerRef: triggerElRef,
      modal: isSheet,
      autoFocus: false,
      restoreFocus: !openedByHover.current,
      onOutside: dismiss,
      onEscape: dismiss,
    })
    useEffect(() => {
      if (isOpen && isSheet) listboxRef.current?.focus({ preventScroll: true })
    }, [isOpen, isSheet])
    useEffect(() => {
      if (!isOpen) return
      const content = contentElRef.current
      const item = content?.querySelector<HTMLElement>('[data-highlighted]')
      const viewport = content?.querySelector<HTMLElement>(
        '.uf-select__contentPanel',
      )
      if (!item || !viewport) return
      const bounds = viewport.getBoundingClientRect(),
        row = item.getBoundingClientRect()
      const header = isSheet
        ? (content
            ?.querySelector<HTMLElement>('.uf-responsive-sheetHeader')
            ?.getBoundingClientRect().height ?? 0)
        : 0
      if (row.top < bounds.top + header)
        viewport.scrollTop -= bounds.top + header - row.top
      else if (row.bottom > bounds.bottom)
        viewport.scrollTop += row.bottom - bounds.bottom
    }, [isOpen, isSheet, state.context.highlightedValue])

    const hasLabel = hasSlotContent(label)
    const computedDisplay = getDisplayValue(state.context.value, options)
    const hasDisplay = hasSlotContent(displayValue)
    const noSelection =
      state.context.value === null ||
      (Array.isArray(state.context.value) && state.context.value.length === 0)
    const isPlaceholder = noSelection && !hasDisplay
    const triggerLabel = hasDisplay
      ? displayValue
      : noSelection
        ? placeholder
        : computedDisplay
    const triggerId = id ?? `uf-select:${selectId}:trigger`
    const labelId = hasLabel ? `uf-select:${selectId}:label` : undefined
    const contentId = `uf-select:${selectId}:content`
    const listboxId = `uf-select:${selectId}:listbox`
    const titleId = `uf-select:${selectId}:title`
    const fieldLabelId = labelledBy ?? (ariaLabel ? undefined : labelId)
    const highlightedIndex = options.findIndex(
      (option) =>
        option.value === state.context.highlightedValue && !option.disabled,
    )
    const activeDescendantId =
      isOpen && highlightedIndex >= 0
        ? `${listboxId}:option:${highlightedIndex}`
        : undefined
    const minWidth = formatSelectCssSize(contentMinWidth)
    const contentStyle = {
      ...(resolvedSurface === 'popover'
        ? floatingStyle
        : isSide
          ? sideFloatingStyle
          : undefined),
      ...(resolvedSurface === 'popover'
        ? {
            minWidth: `min(max(${formatSelectCssSize(floatingStyle.minWidth as number | string) ?? '0px'}, ${minWidth ?? (iconOnly ? '10rem' : '0px')}), ${formatSelectCssSize(floatingStyle.maxWidth as number | string) ?? 'calc(100vw - 16px)'})`,
            ...(minWidth !== undefined
              ? { '--face-runtime-select-content-min-width': minWidth }
              : {}),
          }
        : {}),
    } as CSSProperties
    const triggerProps = api.getTriggerProps({
      id: triggerId,
      contentId: isSheet ? contentId : listboxId,
      labelId: fieldLabelId,
      ariaLabel,
      activeDescendantId: isSheet ? undefined : activeDescendantId,
    })
    const sheetTitle = hasSlotContent(surfaceTitle)
      ? surfaceTitle
      : hasLabel
        ? label
        : ariaLabel || 'Select option'
    const triggerNode = (
      <button
        {...triggerProps}
        {...rest}
        ref={triggerRef}
        type="button"
        form={form}
        dir={dir}
        lang={lang}
        title={title}
        aria-required={required || undefined}
        aria-haspopup={isSheet ? 'dialog' : 'listbox'}
        disabled={disabled}
        tabIndex={rest.tabIndex ?? (disabled ? -1 : 0)}
        className={triggerClassName}
        data-placeholder={isPlaceholder || undefined}
        data-stretch-text={stretchText || undefined}
        data-icon-only={iconOnly || undefined}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            clearSideClose()
            openedByHover.current = false
            triggerElRef.current?.focus({ preventScroll: true })
            if (isSide) {
              if (!isOpen) send({ type: 'OPEN' })
            } else triggerProps.onClick()
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) {
            clearSideClose()
            openedByHover.current = false
            triggerProps.onKeyDown(event)
          }
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (
            !event.defaultPrevented &&
            isSide &&
            event.pointerType === 'mouse'
          ) {
            clearSideClose()
            if (!isOpen) {
              openedByHover.current = true
              send({ type: 'OPEN' })
            }
          }
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          if (
            !event.defaultPrevented &&
            isSide &&
            event.pointerType === 'mouse'
          )
            scheduleSideClose()
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (
            !event.defaultPrevented &&
            !isSheet &&
            isOpen &&
            !contentElRef.current?.contains(event.relatedTarget)
          )
            dismiss()
        }}
      >
        <span
          {...selectAnatomy.getPartAttrs('value')}
          className={cn(
            'uf-select__value',
            isPlaceholder && 'uf-select__value--placeholder',
            valueClassName,
          )}
        >
          {renderSelectLabelNode(triggerLabel)}
        </span>
        {!iconOnly && (
          <span
            {...selectAnatomy.getPartAttrs('indicator')}
            className="uf-select__indicator"
            aria-hidden="true"
          >
            <Icon
              name={
                isSide
                  ? 'select-chevron-right'
                  : isOpen
                    ? 'select-chevron-up'
                    : 'select-chevron-down'
              }
            />
          </span>
        )}
      </button>
    )
    const contentElement = (
      <div
        {...api.getContentProps()}
        ref={contentElRef}
        id={contentId}
        role={isSheet ? 'dialog' : undefined}
        aria-modal={isSheet || undefined}
        aria-labelledby={isSheet ? titleId : undefined}
        dir={direction}
        lang={lang}
        className={cn('uf-select__content', contentClassName)}
        data-surface={resolvedSurface}
        data-icon-only={iconOnly || undefined}
        data-uf-select-scrollable={
          (isSide && options.length > SELECT_SIDE_VISIBLE_OPTION_COUNT) ||
          undefined
        }
        data-uf-select-side-boundary={isSide || undefined}
        data-uf-select-side-panel={isSide || undefined}
        style={contentStyle}
        onPointerEnter={isSide ? clearSideClose : undefined}
        onPointerLeave={(event) => {
          if (isSide && event.pointerType === 'mouse') scheduleSideClose()
        }}
      >
        <Membrane
          enabled={membrane}
          as="div"
          fullWidth
          className="uf-select__contentMembrane"
        >
          <Card
            padding="membrane"
            radius="md"
            className="uf-select__contentPanel"
          >
            {isSheet && (
              <ResponsiveSheetHeader
                title={<span id={titleId}>{sheetTitle}</span>}
                closeLabel={closeLabel}
                onClose={dismiss}
              />
            )}
            <div
              {...api.getListboxProps({
                id: listboxId,
                labelId: fieldLabelId,
                ariaLabel,
                activeDescendantId,
                modal: isSheet,
              })}
              ref={listboxRef}
            >
              {options.map((option, index) => (
                <Membrane
                  enabled={membrane}
                  key={option.value}
                  fullWidth
                  className="uf-select__optionMembrane"
                  interactive
                >
                  <div
                    {...api.getOptionProps({
                      value: option.value,
                      disabled: option.disabled,
                      id: `${listboxId}:option:${index}`,
                    })}
                    aria-label={option.textValue}
                    className="uf-select-option uf-option uf-control"
                  >
                    {renderSelectLabelNode(
                      option.label,
                      'uf-select-optionLabel',
                    )}
                    <span className="uf-select__check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                  </div>
                </Membrane>
              ))}
            </div>
          </Card>
        </Membrane>
      </div>
    )
    return (
      <div
        {...api.getRootProps()}
        className={cn('uf-select', className)}
        style={style}
        dir={dir}
        lang={lang}
        hidden={hidden}
        title={title}
        data-surface={resolvedSurface}
        data-direction={direction}
        data-icon-only={iconOnly || undefined}
        data-full-width={fullWidth || undefined}
        data-label-orientation={hasLabel ? labelOrientation : undefined}
      >
        <FormValue
          name={name}
          form={form}
          value={state.context.value}
          required={required}
          disabled={disabled}
          triggerRef={triggerElRef}
          options={options.map((option) => ({
            value: option.value,
            label: optionLabels[option.value],
            disabled: option.disabled,
          }))}
          resetValue={value === undefined ? initialValue.current : value}
          onReset={() => {
            const reset = normalizeSelectValue(
              value === undefined ? initialValue.current : value,
              multiple,
            )
            syncContext({ value: reset })
            return reset
          }}
          onChange={(next) => send({ type: 'SET_VALUE', value: next })}
        />
        {hasLabel && (
          <Text
            as="label"
            variant="label"
            id={labelId}
            htmlFor={triggerId}
            data-part="label"
          >
            {label}
          </Text>
        )}
        <div className="uf-select-wrapper">
          <Membrane enabled={membrane} fullWidth interactive>
            {triggerNode}
          </Membrane>
          {isOpen && isSheet && (
            <div className="uf-responsive-overlay-backdrop" data-state="open" />
          )}
          {isOpen &&
            (isSheet || !portalTarget
              ? contentElement
              : createPortal(contentElement, portalTarget))}
        </div>
      </div>
    )
  },
)
