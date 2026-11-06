/** Select — a button that opens a list of items to choose one value, or several with `multiple`. */
import {
  Children,
  forwardRef,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { FormValue } from '../assets/adapters/react/FormValue'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { useHoverIntent } from '../assets/adapters/react/use-hover-intent'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useLayer } from '../assets/adapters/react/use-layer'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { useResponsiveOverlaySurface } from '../assets/adapters/react/use-responsive-overlay-surface'
import { createAnatomy } from '../assets/anatomy'
import {
  FieldLayout,
  useField,
  useNameReport,
  type FieldProps,
} from '../assets/internal/field'
import { readFlatCollection } from '../assets/internal/flat-collection'
import type { CollectionItem } from '../assets/internal/item'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import {
  domId,
  move,
  readKeys,
  typeahead,
  type Typeahead,
} from '../assets/runtime/collection'
import { keyToMove, readDirection, type Direction } from '../assets/runtime/keyboard'
import { resolveLabel, resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { readCssSize } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import {
  SELECT_SIDE_VISIBLE_OPTION_COUNT,
} from './select-side-position'
import { SELECT_SIDE_VIEWPORT_SELECTOR as VIEWPORT, useSelectSidePosition } from '../assets/internal/useSelectSidePosition'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One choice of a Select. */
export interface SelectItem extends Omit<CollectionItem, 'icon' | 'textValue'> {
  /** Plain text for typeahead and the option's accessible name when `label` is not plain text. */
  textValue?: string
}
export type SelectSurface = 'auto' | 'popover' | 'sheet' | 'side'
/** Strings Select renders itself. */
export type SelectLabels = Pick<CommonLabels, 'close'>

/** The shared Select button; the parent owns its popup, value and interactions. */
export interface SelectTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'dangerouslySetInnerHTML' | 'type' | 'aria-expanded'
> {
  /** The already resolved selected label, placeholder, or custom display value. */
  children?: ReactNode
  /** Current popup visibility; this component never changes it. */
  open?: boolean
  /** Resolved popup presentation; side triggers always point to the inline end. */
  surface?: Exclude<SelectSurface, 'auto'>
  /** Marks an empty selection's display value. */
  isPlaceholder?: boolean
  /** Announces unavailable content without removing the trigger from tab order. */
  unavailable?: boolean
  /** A square trigger without a chevron; name it with aria-label. */
  iconOnly?: boolean
  /** Expands the value area so the chevron sits at the inline end. */
  stretchText?: boolean
  /** Fills the available inline width. */
  fullWidth?: boolean
  /** Outer spacing around the trigger. */
  membrane?: boolean
  /** Class on the value slot; className and style target the button. */
  valueClassName?: string
}

interface SelectBaseProps
  extends FieldProps,
    Omit<
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
  /** Choices in list and keyboard order; an item repeating an earlier value is dropped. */
  items?: readonly SelectItem[]
  /** Text in the trigger while nothing is selected and `displayValue` is empty. */
  placeholder?: string
  /** Replaces the selected labels in the trigger, for example with a count or an icon. */
  displayValue?: ReactNode
  /** Disables the trigger and leaves the value out of FormData. */
  disabled?: boolean
  /** FormData key; a multiple value submits one entry per selected item. */
  name?: string
  /** Id of the form that submits and resets the value, when it is not an ancestor. */
  form?: string
  /** Blocks form submission until an item is selected and marks the label. */
  required?: boolean
  /** Names the field when there is no visible `label`, and then titles the sheet. */
  'aria-label'?: string
  /** Ids of elements that name the field; they take precedence over `label` and `aria-label`. */
  'aria-labelledby'?: string
  /** A square trigger without a chevron; name it with `aria-label`. */
  iconOnly?: boolean
  /** Fills the available inline width. */
  fullWidth?: boolean
  /** Expands the value area so the chevron sits at the inline end. */
  stretchText?: boolean
  /** Controlled list visibility; hidden, disabled, or unavailable Selects expose no list. */
  open?: boolean
  /** List visibility on mount when `open` is not set; read once. Hiding an uncontrolled list closes it. */
  defaultOpen?: boolean
  /** Called once per user request to open or close the list; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Where the list opens: auto is a popover, or a bottom sheet below 900px; side opens beside the trigger on hover or click. */
  surface?: SelectSurface
  /** Strings Select renders itself: `close` names the sheet's close button. */
  labels?: Partial<SelectLabels>
  /** Minimum popover width: a number or numeric string is pixels, or pass a CSS length; capped by the viewport. Side and sheet surfaces ignore it. */
  contentMinWidth?: number | string
  /** Outer spacing around the trigger and each option; the list surface keeps its own spacing. */
  membrane?: boolean
  /** Class on the trigger button; `className` and `style` go on the field root. */
  triggerClassName?: string
  /** Class on the trigger's value slot. */
  valueClassName?: string
  /** Class on the floating surface. */
  contentClassName?: string
}
interface SelectSingleProps {
  /** Lets the user select any number of items and makes the value a `string[]` instead of `string | null`; selecting then keeps the list open. */
  multiple?: false
  /** Selected value, or values with `multiple`; a value missing from `items` shows as unselected until it appears. */
  value?: string | null
  /** Selection on mount, restored by form reset; same shape as `value`. */
  defaultValue?: string | null
  /** Called once per user change with the new value, a fresh array with `multiple`; never for prop updates or reset. */
  onValueChange?: (details: { value: string | null }) => void
}
interface SelectMultipleProps {
  /** Lets the user select any number of items and makes the value a `string[]` instead of `string | null`; selecting then keeps the list open. */
  multiple: true
  /** Selected value, or values with `multiple`; a value missing from `items` shows as unselected until it appears. */
  value?: readonly string[]
  /** Selection on mount, restored by form reset; same shape as `value`. */
  defaultValue?: readonly string[]
  /** Called once per user change with the new value, a fresh array with `multiple`; never for prop updates or reset. */
  onValueChange?: (details: { value: string[] }) => void
}
export type SelectProps = SelectBaseProps &
  (SelectSingleProps | SelectMultipleProps)

type Value = string | readonly string[] | null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { getPartAttrs: part } = createAnatomy('select').parts(
  'root',
  'trigger',
  'value',
  'indicator',
  'content',
  'listbox',
  'option',
)
const defaultLabels: SelectLabels = Object.freeze({ close: 'Close' })

/** Visible text of a label, for typeahead and the native option; aria-hidden content is skipped. */
function plainText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode; 'aria-hidden'?: unknown }>(
              child,
            ) && String(child.props['aria-hidden']) !== 'true'
          ? plainText(child.props.children)
          : '',
    )
    .join('')
}

function renderLabel(node: ReactNode, className?: string) {
  if (!hasSlotContent(node)) return null
  return typeof node === 'string' || typeof node === 'number' ? (
    <Text as="span" membrane={false} inset="none" className={className}>
      {String(node)}
    </Text>
  ) : (
    <span className={className}>{node}</span>
  )
}

/** A CSS length: a number is pixels; anything else but a nonblank string is ignored. */
const cssSize = (value: unknown) =>
  typeof value === 'number'
    ? Number.isFinite(value) && value >= 0
      ? `${value}px`
      : undefined
    : typeof value === 'string'
      ? value.trim() || undefined
      : undefined

/** The same controlled trigger used by Select and externally owned popups. */
export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger({
    children,
    open = false,
    surface = 'popover',
    isPlaceholder = false,
    unavailable = false,
    disabled = false,
    iconOnly = false,
    stretchText = false,
    fullWidth = true,
    membrane = true,
    valueClassName,
    className,
    ...rest
  }, ref) {
    return (
      <Membrane
        enabled={membrane}
        fullWidth={fullWidth}
        interactive
        className="uf-select-trigger-membrane"
        data-icon-only={iconOnly || undefined}
      >
        <button
          {...rest}
          {...part('trigger')}
          ref={ref}
          type="button"
          disabled={disabled}
          tabIndex={rest.tabIndex ?? (disabled ? -1 : 0)}
          aria-expanded={open}
          aria-disabled={unavailable ? true : rest['aria-disabled']}
          data-state={open ? 'open' : 'closed'}
          data-disabled={unavailable || disabled || undefined}
          data-surface={surface}
          data-placeholder={isPlaceholder || undefined}
          data-stretch-text={stretchText || undefined}
          data-icon-only={iconOnly || undefined}
          data-full-width={fullWidth || undefined}
          data-autofocus={rest.autoFocus ? '' : undefined}
          className={cn('uf-select-trigger', className)}
        >
          <span
            {...part('value')}
            className={cn(
              'uf-select__value',
              isPlaceholder && 'uf-select__value--placeholder',
              valueClassName,
            )}
          >
            {renderLabel(children)}
          </span>
          {!iconOnly && (
            <span
              {...part('indicator')}
              className="uf-select__indicator"
              aria-hidden="true"
            >
              <Icon
                name={surface === 'side'
                  ? 'select-chevron-right'
                  : open ? 'select-chevron-up' : 'select-chevron-down'}
              />
            </span>
          )}
        </button>
      </Membrane>
    )
  },
)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** A button that opens a list of items to choose one value, or several with `multiple`. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(props, ref) {
    const {
      items,
      value,
      defaultValue,
      multiple = false,
      onValueChange,
      placeholder,
      displayValue,
      disabled = false,
      name,
      form,
      required = false,
      label,
      description,
      error,
      labelPosition,
      iconOnly = false,
      fullWidth = true,
      stretchText = false,
      open,
      defaultOpen = false,
      onOpenChange,
      surface = 'auto',
      labels,
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
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
      ...rest
    } = props

    // A flat list must discard structural items before they can reserve option keys.
    const collection = readFlatCollection<SelectItem>(items, {
      component: 'Select',
      key: (item) => item.value,
      text: (item) => item.textValue ?? (plainText(item.label) || item.value),
    })
    const entries = collection.children(null)
    const keys = entries.map((entry) => entry.key)
    const enabled = disabled
      ? []
      : entries.filter((entry) => !entry.disabled).map((entry) => entry.key)
    const available = enabled.length > 0

    // Value: the intent is stored; what shows is its projection onto the current items and
    // mode, computed here and never written back, so late items still receive their value.
    const [initial] = useState<Value>(() =>
      Array.isArray(defaultValue) ? [...defaultValue] : (defaultValue ?? null),
    )
    const project = (intent: Value): readonly string[] => {
      const wanted =
        typeof intent === 'string'
          ? [intent]
          : readKeys(intent ?? undefined, 'Select', 'value')
      const shown = wanted.filter((key) => keys.includes(key))
      return multiple ? shown : shown.slice(0, 1)
    }
    const toValue = (shown: readonly string[]): Value =>
      multiple ? shown : (shown[0] ?? null)
    const [intent, setIntent, replaceIntent] = useControllableState<Value>({
      value: value as Value | undefined,
      defaultValue: initial,
      onChange: (next) =>
        (onValueChange as ((details: { value: Value }) => void) | undefined)?.(
          { value: next },
        ),
      name: ['Select', 'value'],
    })
    const selected = project(intent)

    // Visibility and the highlighted option.
    const [openState, setOpen, replaceOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen,
      onChange: (next) => onOpenChange?.({ open: next }),
      name: ['Select', 'open'],
    })
    const isOpen = !hidden && available && !!openState
    // A hidden or unavailable uncontrolled list closes quietly and stays closed.
    // A controlled `open` remains the parent's intent, but cannot expose a hidden surface.
    useIsomorphicLayoutEffect(() => {
      if ((!available || hidden) && openState) replaceOpen(false)
    }, [available, hidden, openState, replaceOpen])
    const [highlight, setHighlight] = useState<string | null>(null)
    const [wasOpen, setWasOpen] = useState(isOpen)
    if (wasOpen !== isOpen) {
      // Closing forgets the highlight, so the next opening starts at the selection.
      setWasOpen(isOpen)
      if (!isOpen) setHighlight(null)
    }
    const initialKey = () =>
      selected.find((key) => enabled.includes(key)) ?? enabled[0] ?? null
    const active = !isOpen
      ? null
      : highlight !== null && enabled.includes(highlight)
        ? highlight
        : initialKey()

    const searchRef = useRef<Typeahead | null>(null)
    // Focus returns to the trigger on close, unless the close is focus moving elsewhere.
    const [restoreFocus, setRestoreFocus] = useState(true)
    const openList = (key: string | null) => {
      if (!available || hidden) return
      setHighlight(key)
      setRestoreFocus(true)
      setOpen(true)
    }
    const closeList = (restore = true) => {
      searchRef.current = null
      setRestoreFocus(restore)
      setOpen(false)
    }
    const choose = (key: string) => {
      if (!enabled.includes(key)) return
      if (multiple)
        setIntent(
          selected.includes(key)
            ? selected.filter((other) => other !== key)
            : [...selected, key],
        )
      else {
        setIntent(key)
        closeList()
      }
    }
    const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      const { key, altKey, ctrlKey, metaKey, nativeEvent } = event
      if (!available || hidden || altKey || ctrlKey || metaKey || nativeEvent.isComposing)
        return
      const step = keyToMove(event, 'vertical', 'ltr')
      const [search, match] =
        Array.from(key).length === 1
          ? typeahead(searchRef.current, key, Date.now(), entries, active)
          : [null, null]
      if (step)
        openList(
          !isOpen && step === 'next'
            ? initialKey()
            : move(enabled, active, step),
        )
      else if (search?.query) {
        // A running search takes Space as text ("New Y"), not as activation.
        searchRef.current = search
        openList(match ?? active ?? initialKey())
      } else if (key === 'Enter' || key === ' ') {
        if (!isOpen) openList(initialKey())
        else if (active !== null) choose(active)
      } else return
      event.preventDefault()
    }

    // Naming, description and validation.
    const [nativeError, setNativeError] = useState<string | null>(null)
    const field = useField({
      id,
      label,
      description,
      error,
      labelPosition,
      required,
      nativeError,
      labelable: true,
      'aria-label': resolveLabel(ariaLabel, '', 'Select', 'aria-label') || undefined,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': ariaInvalid,
    })
    const accessibleName = field.controlProps['aria-label']
    const contentId = `${field.id}-content`
    const listboxId = `${field.id}-listbox`
    const titleId = `${field.id}-title`
    const optionId = (key: string) => domId(listboxId, 'option', key)

    // Surfaces.
    const triggerElRef = useRef<HTMLButtonElement | null>(null)
    // The trigger is a <button>, which a `<label for>` of the consumer's own names as
    // well; no render can see that label, so the DOM is asked once it exists.
    useNameReport(
      'Select',
      triggerElRef,
      'the combobox has no accessible name; pass label, aria-label or aria-labelledby',
    )
    const contentRef = useRef<HTMLDivElement | null>(null)
    const listboxRef = useRef<HTMLDivElement | null>(null)
    const responsive = useResponsiveOverlaySurface(
      surface === 'side' ? 'popover' : surface,
    )
    const resolvedSurface = surface === 'side' ? 'side' : responsive
    const isSide = resolvedSurface === 'side'
    const isSheet = resolvedSurface === 'sheet'
    const portalTarget = usePortalTarget()
    const [direction, setDirection] = useState<Direction>('ltr')
    useIsomorphicLayoutEffect(() =>
      setDirection(readDirection(triggerElRef.current)),
    )
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && portalTarget !== null && resolvedSurface === 'popover',
      triggerRef: triggerElRef,
      contentRef,
      side: 'bottom',
      align: 'start',
      sideOffset: 4,
      matchTriggerWidth: true,
    })
    const sideStyle = useSelectSidePosition(
      isOpen && isSide,
      triggerElRef,
      contentRef,
    )
    useBodyScrollLock(isOpen && isSheet)
    const hover = useHoverIntent({
      value: isOpen ? 'list' : null,
      onValueChange: (next) => {
        if (next !== null) openList(initialKey())
        // A keyboard user may leave the pointer anywhere without losing the list.
        else if (
          document.activeElement !== triggerElRef.current &&
          !contentRef.current?.contains(document.activeElement)
        )
          closeList()
      },
      openDelay: 0,
      closeDelay: 150,
      focus: false,
      disabled: !isSide || !available || hidden,
    })
    const hoverTrigger = hover.trigger('list')
    const triggerRefs = useComposedRefs(triggerElRef, ref, hoverTrigger.ref)
    const contentRefs = useComposedRefs(contentRef, hover.content.ref)
    useLayer({
      enabled: isOpen && (isSheet || portalTarget !== null),
      contentRef,
      triggerRef: triggerElRef,
      modal: isSheet,
      autoFocus: isSheet,
      initialFocus: () => listboxRef.current,
      restoreFocus,
      onOutside: () => closeList(),
      onEscape: () => closeList(),
    })
    // Keep the highlighted row inside the scrolling panel without scrolling the page.
    useEffect(() => {
      const content = contentRef.current
      const row = content?.querySelector<HTMLElement>('[data-highlighted]')
      const viewport = content?.querySelector<HTMLElement>(VIEWPORT)
      if (!row || !viewport) return
      const bounds = viewport.getBoundingClientRect()
      const box = row.getBoundingClientRect()
      const header = isSheet
        ? (content
            ?.querySelector('.uf-responsive-sheetHeader')
            ?.getBoundingClientRect().height ?? 0)
        : 0
      if (box.top < bounds.top + header)
        viewport.scrollTop -= bounds.top + header - box.top
      else if (box.bottom > bounds.bottom)
        viewport.scrollTop += box.bottom - bounds.bottom
    }, [isOpen, isSheet, active])

    // Trigger text.
    const names = selected.map((key) => collection.get(key)!.item.label)
    const selectedLabel = names.every(
      (node) => typeof node === 'string' || typeof node === 'number',
    )
      ? names.join(', ')
      : names.map((node, index) => (
          <Fragment key={selected[index]}>
            {index > 0 && ', '}
            {node}
          </Fragment>
        ))
    const hasDisplay = hasSlotContent(displayValue)
    const isPlaceholder = selected.length === 0 && !hasDisplay
    const triggerLabel = hasDisplay
      ? displayValue
      : isPlaceholder
        ? resolveLabel(placeholder, '', 'Select', 'placeholder')
        : selectedLabel
    const sheetTitle = field.label ?? accessibleName
    const minWidth = resolvedSurface === 'popover'
      ? readCssSize('Select', 'contentMinWidth', contentMinWidth)
      : undefined
    const contentStyle =
      resolvedSurface === 'popover'
        ? ({
            ...floatingStyle,
            minWidth: `min(max(${cssSize(floatingStyle.minWidth) ?? '0px'}, ${minWidth ?? (iconOnly ? '10rem' : '0px')}), ${cssSize(floatingStyle.maxWidth) ?? 'calc(100vw - 16px)'})`,
            '--face-runtime-select-content-min-width': minWidth,
          } as CSSProperties)
        : isSide
          ? sideStyle
          : undefined

    const trigger = (
      <SelectTrigger
        {...rest}
        {...field.controlProps}
        ref={triggerRefs}
        role="combobox"
        form={form}
        dir={dir}
        lang={lang}
        title={title}
        disabled={disabled}
        open={isOpen}
        surface={resolvedSurface}
        isPlaceholder={isPlaceholder}
        unavailable={!available}
        iconOnly={iconOnly}
        stretchText={stretchText}
        membrane={membrane}
        fullWidth
        valueClassName={valueClassName}
        aria-haspopup={isSheet ? 'dialog' : 'listbox'}
        aria-controls={isOpen ? (isSheet ? contentId : listboxId) : undefined}
        aria-activedescendant={
          !isSheet && active !== null ? optionId(active) : undefined
        }
        aria-disabled={!available || undefined}
        aria-required={required || undefined}
        aria-invalid={field.invalid || undefined}
        className={triggerClassName}
        onClick={composeHandlers(onClick, () => {
          triggerElRef.current?.focus({ preventScroll: true })
          if (!isOpen) openList(initialKey())
          else if (!isSide) closeList()
        })}
        onKeyDown={composeHandlers(onKeyDown, onListKeyDown)}
        onPointerEnter={composeHandlers(
          onPointerEnter,
          hoverTrigger.onPointerEnter,
        )}
        onPointerLeave={composeHandlers(
          onPointerLeave,
          hoverTrigger.onPointerLeave,
        )}
        onBlur={composeHandlers(onBlur, (event) => {
          if (isOpen && !isSheet && !contentRef.current?.contains(event.relatedTarget))
            closeList(false)
        })}
      >
        {triggerLabel}
      </SelectTrigger>
    )
    const content = (
      <div
        {...part('content')}
        ref={contentRefs}
        id={contentId}
        role={isSheet ? 'dialog' : undefined}
        aria-modal={isSheet || undefined}
        aria-labelledby={
          !isSheet ? undefined : sheetTitle !== undefined ? titleId : field.labelledBy
        }
        data-state="open"
        dir={direction}
        lang={lang}
        className={cn('uf-select__content', contentClassName)}
        data-surface={resolvedSurface}
        data-icon-only={iconOnly || undefined}
        data-uf-select-scrollable={
          (isSide && entries.length > SELECT_SIDE_VISIBLE_OPTION_COUNT) ||
          undefined
        }
        data-uf-select-side-boundary={isSide || undefined}
        data-uf-select-side-panel={isSide || undefined}
        style={contentStyle}
        onPointerEnter={hover.content.onPointerEnter}
        onPointerLeave={hover.content.onPointerLeave}
      >
        <Membrane
          as="div"
          fullWidth
          className="uf-select__contentMembrane"
        >
          <Card
            padding="membrane"
            radius="md"
            className="uf-select__contentPanel uf-surface-stable"
          >
            {isSheet && (
              <ResponsiveSheetHeader
                title={sheetTitle}
                titleId={titleId}
                closeLabel={resolveLabels(defaultLabels, labels, 'Select').close}
                onClose={() => closeList()}
              />
            )}
            <div
              {...part('listbox')}
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={field.labelledBy}
              aria-label={accessibleName}
              aria-activedescendant={
                isSheet && active !== null ? optionId(active) : undefined
              }
              aria-multiselectable={multiple || undefined}
              tabIndex={isSheet ? 0 : -1}
              onKeyDown={onListKeyDown}
            >
              {entries.map(({ key, item, disabled: off }) => {
                const isSelected = selected.includes(key)
                return (
                  <Membrane
                    enabled={membrane}
                    key={key}
                    fullWidth
                    className="uf-select__optionMembrane"
                    interactive
                  >
                    <div
                      {...part('option')}
                      id={optionId(key)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={off || undefined}
                      aria-label={item.textValue}
                      data-state={isSelected ? 'selected' : undefined}
                      data-highlighted={key === active || undefined}
                      data-disabled={off || undefined}
                      data-value={key}
                      className="uf-select-option uf-option uf-control"
                      onClick={() => choose(key)}
                      onPointerMove={(event) => {
                        if (!off && event.pointerType !== 'touch' && key !== active)
                          setHighlight(key)
                      }}
                      // Keeps focus, and so the active descendant, on the trigger.
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {renderLabel(item.label, 'uf-select-optionLabel')}
                      <span className="uf-select__check" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    </div>
                  </Membrane>
                )
              })}
            </div>
          </Card>
        </Membrane>
      </div>
    )
    return (
      // Phrasing root and wrapper: a select can sit in running text such as a <p>.
      <span
        {...part('root')}
        {...field.rootProps}
        className={cn('uf-field uf-select', className)}
        style={style}
        dir={dir}
        lang={lang}
        hidden={hidden}
        title={title}
        data-state={isOpen ? 'open' : 'closed'}
        data-disabled={!available || undefined}
        data-multiple={multiple || undefined}
        data-surface={resolvedSurface}
        data-direction={direction}
        data-icon-only={iconOnly || undefined}
        data-full-width={fullWidth || undefined}
      >
        <FieldLayout field={field}>
          <span className="uf-select-wrapper">
            {trigger}
            <FormValue
              name={name}
              form={form}
              value={toValue(selected)}
              required={required}
              disabled={disabled}
              triggerRef={triggerElRef}
              options={entries.map(({ key, text, disabled: off }) => ({
                value: key,
                label: text,
                disabled: off,
              }))}
              resetValue={toValue(value === undefined ? project(initial) : selected)}
              onReset={() => {
                replaceIntent()
                return toValue(value === undefined ? project(initial) : selected)
              }}
              onChange={setIntent}
              onReport={setNativeError}
            />
            {isOpen && isSheet && (
              <div className="uf-responsive-overlay-backdrop" data-state="open" />
            )}
            {/* Before mount (server, hydration) a popover has nowhere to portal. */}
            {isOpen &&
              (isSheet
                ? content
                : portalTarget && createPortal(content, portalTarget))}
          </span>
        </FieldLayout>
      </span>
    )
  },
)
