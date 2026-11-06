/** Menu — a list of actions opened from its trigger, or at the pointer as a context menu. */
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Membrane } from '../assets/adapters/react/Membrane'
import { Trigger, getTriggerChild } from '../assets/adapters/react/Trigger'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from '../assets/adapters/react/use-floating-position'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useLayer } from '../assets/adapters/react/use-layer'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import {
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import type {
  CollectionItem,
  ItemGroup,
  ItemSeparator,
} from '../assets/internal/item'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import {
  domId,
  readCollection,
  typeahead,
  type Entry,
  type Move,
  type Typeahead,
} from '../assets/runtime/collection'
import {
  keyToMove,
  readDirection,
  type Direction,
} from '../assets/runtime/keyboard'
import {
  resolveLabel,
  resolveLabels,
  type CommonLabels,
} from '../assets/runtime/labels'
import { readNumber } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One action of a Menu. */
export interface MenuItem extends CollectionItem {
  /** Makes the item a link to this URL: activation follows it, and modifier keys open it elsewhere as for any link. */
  href?: string
  /** Makes the item a checkbox item that shows a check and is announced as checked while true. */
  checked?: boolean
  /** `destructive` marks an action that deletes or cannot be undone. Default neutral. */
  tone?: 'neutral' | 'destructive'
}

/** What `items` holds: items, separators, and labelled groups of them. */
export type MenuItemEntry =
  | MenuItem
  | ItemSeparator
  | ItemGroup<MenuItem | ItemSeparator>

/** Strings Menu renders itself. */
export type MenuLabels = Pick<CommonLabels, 'close'>

export interface MenuProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | 'children'
    | 'role'
    | 'tabIndex'
    | 'hidden'
    | 'autoFocus'
    | 'onSelect'
    | 'aria-orientation'
    | 'dangerouslySetInnerHTML'
    | 'defaultValue'
    | 'defaultChecked'
    | 'contentEditable'
    | 'suppressContentEditableWarning'
    | 'popover'
  > {
  /** The trigger: one element that takes the trigger props and ref, or text shown as a Button; without it nothing renders. */
  children?: ReactNode
  /** Items, separators and labelled groups in menu order; an item repeating an earlier value is dropped. */
  items?: readonly MenuItemEntry[]
  /** Called when the user activates an enabled item, then the menu closes; `event` is the click, whose `preventDefault()` cancels only a link item's navigation. */
  onSelect?: (details: { value: string; event: MouseEvent<HTMLElement> }) => void
  /** Opens on a click of the trigger, or on its context menu at the pointer. Default click. */
  openOn?: 'click' | 'context'
  /** Controlled visibility; a disabled Menu, or one without a trigger, stays closed. */
  open?: boolean
  /** Visibility on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Called once per user request to open or close the menu; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Disables the trigger and closes an open menu. */
  disabled?: boolean
  /** Where the menu opens: auto is a popover, or a bottom sheet below 900px. */
  surface?: ResponsiveOverlaySurface
  /** Preferred side of the trigger for a click menu's popover; flips when the opposite side has more room. Default bottom. */
  side?: FloatingSide
  /** Alignment of a click menu's popover on the cross axis, following the trigger's direction. Default end. */
  align?: FloatingAlign
  /** Gap in pixels between the trigger and a click menu's popover; negative values overlap them. Default 4. */
  sideOffset?: number
  /** Nearest ancestor used for a click menu's left/right attachment; --uf-dropdown-panel-gap measures the painted surface gap. Vertical alignment still follows the trigger. */
  attachmentSelector?: string
  /** Aligns a measured visible row opposite the trigger on left/right surfaces; usually `[role^="menuitem"]`. Context menus ignore it. */
  alignToOption?: string
  /** Names the menu and titles the sheet; without it a click menu is named by its trigger. */
  'aria-label'?: string
  /** Strings Menu renders itself: `close` names the sheet's close button. */
  labels?: Partial<MenuLabels>
  /** Class on the floating surface, as is `style`; the other native attributes and ref go on the menu list. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { getPartAttrs: part } = createAnatomy('menu').parts(
  'root',
  'trigger',
  'content',
  'list',
  'item',
  'icon',
  'indicator',
  'separator',
  'group',
  'group-label',
)
const defaultLabels: MenuLabels = Object.freeze({ close: 'Close' })
/** The floating surface keeps this far from the viewport edges. */
const VIEWPORT_INSET = 8

const kindOf = (item: unknown) => {
  const { type } = item as { type?: unknown }
  return type === 'group' || type === 'separator' ? type : 'item'
}

function renderLabel(node: ReactNode) {
  if (!hasSlotContent(node)) return null
  return typeof node === 'string' || typeof node === 'number' ? (
    <Text as="span" membrane={false} inset="none" className="uf-menu-itemLabel">
      {String(node)}
    </Text>
  ) : (
    <span className="uf-menu-itemLabel">{node}</span>
  )
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/** A list of actions opened from its trigger, or at the pointer as a context menu. */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  function Menu(props, ref) {
    const {
      children,
      items,
      onSelect,
      openOn = 'click',
      open,
      defaultOpen = false,
      onOpenChange,
      disabled = false,
      surface = 'auto',
      side = 'bottom',
      align = 'end',
      sideOffset,
      attachmentSelector,
      alignToOption,
      labels,
      className,
      style,
      id,
      dir,
      onKeyDown,
      onFocus,
      onBlur,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...rest
    } = props
    const context = openOn === 'context'
    const strings = resolveLabels(defaultLabels, labels, 'Menu')

    // Items: groups and separators structure the list; only items take focus.
    const collection = readCollection<MenuItemEntry>(items, {
      component: 'Menu',
      key: (item) => (item as MenuItem).value,
    })
    const entries = collection.entries.filter(
      (entry) => kindOf(entry.item) === 'item',
    )
    const keys = entries.map((entry) => entry.key)
    const enabledKeys = entries
      .filter((entry) => !entry.disabled)
      .map((entry) => entry.key)
    // Keys enter the items at an edge: down, Home, Enter and Space at the first, up and End at the last.
    const edgeOf = (to: Move | null) =>
      to === 'prev' || to === 'last' ? 'last' : 'first'
    const edgeKey = (edge: 'first' | 'last') =>
      edge === 'first' ? enabledKeys[0] : enabledKeys.at(-1)

    // Visibility: a Menu without a trigger, or a disabled one, shows closed.
    const hasTrigger = hasSlotContent(children)
    const available = hasTrigger && !disabled
    const [shown, setOpen, replaceOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen,
      onChange: (next) => onOpenChange?.({ open: next }),
      name: ['Menu', 'open'],
    })
    const isOpen = available && !!shown
    // An uncontrolled menu that loses its trigger or is disabled closes quietly.
    useIsomorphicLayoutEffect(() => {
      if (!available && shown) replaceOpen(false)
    }, [available, shown, replaceOpen])
    const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
    const [highlighted, setHighlighted] = useState<string | null>(null)
    // Where focus goes on open: a key opens at an edge item, anything else on the list.
    const [entry, setEntry] = useState<'first' | 'last' | null>(null)
    const [wasOpen, setWasOpen] = useState(isOpen)
    if (wasOpen !== isOpen) {
      setWasOpen(isOpen)
      if (!isOpen) {
        setPoint(null)
        setHighlighted(null)
      }
    }
    // A closed menu forgets the edge, so a request the parent refused cannot steer a later open.
    if (entry !== null && !isOpen) setEntry(null)
    const request = (next: boolean, edge: 'first' | 'last' | null = null) => {
      if (!available) return
      setEntry(next ? edge : null)
      setOpen(next)
    }
    const close = () => request(false)

    // Surfaces.
    const resolved = useResponsiveOverlaySurface(surface)
    const isSheet = resolved === 'sheet'
    const portalTarget = usePortalTarget()
    // Server and hydrating renders have no surface: a <div> is invalid in phrasing content.
    const shows = isOpen && portalTarget !== null
    const generatedId = useId()
    const childId = getTriggerChild(children)?.props.id
    const triggerId =
      typeof childId === 'string' ? childId : `${generatedId}-trigger`
    const listId = id ?? `${generatedId}-list`
    const contentId = `${generatedId}-content`
    const titleId = `${generatedId}-title`
    const itemId = (key: string) => domId(listId, 'item', key)

    const triggerRef = useRef<HTMLElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const listRef = useRef<HTMLDivElement | null>(null)
    const pointRef = useRef<HTMLSpanElement | null>(null)
    const listRefs = useComposedRefs(listRef, ref)
    const [direction, setDirection] = useState<Direction>('ltr')
    useIsomorphicLayoutEffect(() => {
      if (shows) setDirection(readDirection(triggerRef.current))
    })
    // A context menu opens from the pointer in the reading direction. When only one side of the
    // pointer has room, its anchor spans the menu's width on that side, which places it there in
    // either direction.
    const [span, setSpan] = useState({ start: 0, width: 0 })
    useIsomorphicLayoutEffect(() => {
      const node = contentRef.current
      const view = node?.ownerDocument.defaultView
      let next = { start: 0, width: 0 }
      if (context && point && node && view) {
        const width = node.getBoundingClientRect().width
        const right = point.x + width + VIEWPORT_INSET <= view.innerWidth
        const left = point.x - width - VIEWPORT_INSET >= 0
        if (right !== left) next = { start: right ? 0 : -width, width }
      }
      setSpan((previous) =>
        previous.start === next.start && previous.width === next.width ? previous : next,
      )
    }, [context, point, shows])
    const position = useFloatingPosition({
      open: shows && !isSheet,
      triggerRef: context && point ? pointRef : triggerRef,
      contentRef,
      surfaceRef: panelRef,
      attachmentSelector: context ? undefined : attachmentSelector,
      alignToOption: context ? undefined : alignToOption,
      side: context ? 'bottom' : side,
      align: context ? 'start' : align,
      sideOffset: context
        ? 0
        : readNumber('Menu', 'sideOffset', sideOffset, 4),
      dir: dir ?? direction,
      viewportInset: VIEWPORT_INSET,
    })
    useBodyScrollLock(shows && isSheet)
    useLayer({
      enabled: shows,
      contentRef,
      // A press in a context area outside the menu is outside it; focus returns where it was on open.
      triggerRef: context ? undefined : triggerRef,
      modal: isSheet,
      autoFocus: true,
      initialFocus: () => {
        const key = entry ? edgeKey(entry) : undefined
        const node =
          key === undefined
            ? null
            : listRef.current?.ownerDocument.getElementById(itemId(key))
        return node ?? listRef.current
      },
      restoreFocus: true,
      onEscape: close,
      onOutside: close,
    })

    // Keyboard focus between items: arrows and Home/End.
    const roving = useRovingFocus({
      keys,
      disabled: (key) => collection.get(key)?.disabled !== false,
      orientation: 'vertical',
    })
    // Typeahead belongs to the whole list, so the letters typed before focus reaches an item still count.
    const query = useRef<Typeahead | null>(null)
    useIsomorphicLayoutEffect(() => {
      query.current = null
    }, [shows])
    const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      roving.root.onKeyDown(event)
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (event.key === 'Tab') {
        // Focus returns to the trigger before the browser moves it on; a sheet keeps Tab inside.
        if (!isSheet) flushSync(close)
        return
      }
      if (
        Array.from(event.key).length === 1 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.nativeEvent.isComposing
      ) {
        const [state, found] = typeahead(
          query.current,
          event.key,
          event.timeStamp,
          entries,
          roving.keyOf(target),
        )
        query.current = state
        // Space outside a query stays the item's own activation.
        if (state.query) {
          event.preventDefault()
          if (found !== null) roving.focus(found)
          return
        }
      }
      if (target !== event.currentTarget) {
        // Buttons activate on Space natively, links do not.
        if (event.key === ' ' && target.localName === 'a') {
          event.preventDefault()
          target.click()
        }
        return
      }
      // Focus on the list itself (opened by pointer): arrows enter the items at an edge.
      const to = keyToMove(event, 'vertical', 'ltr')
      if (!to) return
      event.preventDefault()
      const key = edgeKey(edgeOf(to))
      if (key !== undefined) roving.focus(key)
    }

    // Trigger.
    const triggerProps = context
      ? {
          onContextMenu: (event: MouseEvent<HTMLElement>) => {
            if (!available) return
            event.preventDefault()
            setPoint({ x: event.clientX, y: event.clientY })
            // A mouse press closed an open menu already; a touch long-press moves it and takes focus back.
            if (isOpen) listRef.current?.focus({ preventScroll: true })
            else request(true)
          },
        }
      : {
          'aria-haspopup': isSheet ? ('dialog' as const) : ('menu' as const),
          'aria-expanded': isOpen,
          'aria-controls': shows ? (isSheet ? contentId : listId) : undefined,
          onClick: () => request(!isOpen),
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            const to = keyToMove(event, 'vertical', 'ltr')
            if (!available || (!to && event.key !== 'Enter' && event.key !== ' '))
              return
            event.preventDefault()
            const key = edgeKey(edgeOf(to))
            if (!isOpen) request(true, edgeOf(to))
            else if (key !== undefined) roving.focus(key)
          },
        }

    // Items.
    const renderItem = ({ key, item, disabled: off }: Entry<MenuItemEntry>) => {
      const { label, icon, href, checked, tone } = item as MenuItem
      const { ref: itemRef, tabIndex } = roving.item(key)
      const checkable = typeof checked === 'boolean'
      const shared = {
        ...part('item'),
        ref: itemRef,
        id: itemId(key),
        role: checkable ? 'menuitemcheckbox' : 'menuitem',
        'aria-checked': checkable ? checked : undefined,
        tabIndex,
        className: 'uf-menu-item uf-option uf-control',
        'data-value': key,
        'data-highlighted': key === highlighted || undefined,
        'data-disabled': off || undefined,
        'data-tone': tone === 'destructive' ? tone : undefined,
        onClick: (event: MouseEvent<HTMLElement>) => {
          if (off) return
          onSelect?.({ value: key, event })
          close()
        },
        // The pointer and the keyboard share one highlight: the focused item.
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
          const node = event.currentTarget
          if (!off && event.pointerType !== 'touch' && node.ownerDocument.activeElement !== node)
            node.focus({ preventScroll: true })
        },
        onPointerLeave: (event: PointerEvent<HTMLElement>) => {
          const node = event.currentTarget
          if (event.pointerType !== 'touch' && node.ownerDocument.activeElement === node)
            listRef.current?.focus({ preventScroll: true })
        },
      }
      const content = (
        <>
          {hasSlotContent(icon) && (
            <span {...part('icon')} className="uf-menu-itemIcon" aria-hidden="true">
              {typeof icon === 'string' ? <Icon name={icon} /> : icon}
            </span>
          )}
          {renderLabel(label)}
          {checkable && (
            <span {...part('indicator')} className="uf-menu-itemCheck" aria-hidden="true">
              <Icon name="check" />
            </span>
          )}
        </>
      )
      return (
        <Membrane key={key} fullWidth interactive>
          {typeof href === 'string' && href ? (
            <a {...shared} href={off ? undefined : href} aria-disabled={off || undefined}>
              {content}
            </a>
          ) : (
            <button {...shared} type="button" disabled={off}>
              {content}
            </button>
          )}
        </Membrane>
      )
    }
    const renderEntries = (parent: string | null): ReactNode =>
      collection.children(parent).map((entry) => {
        const kind = kindOf(entry.item)
        if (kind === 'item') return renderItem(entry)
        if (kind === 'separator')
          return (
            <div
              key={entry.key}
              {...part('separator')}
              role="separator"
              className="uf-menu-separator"
            />
          )
        const { label } = entry.item as ItemGroup<unknown>
        const labelId = domId(listId, 'group', entry.key)
        const labelled = hasSlotContent(label)
        return (
          <div
            key={entry.key}
            {...part('group')}
            role="group"
            aria-labelledby={labelled ? labelId : undefined}
          >
            {labelled && (
              // Names the group through aria-labelledby; a menu has no place for plain text.
              <div {...part('group-label')} id={labelId} aria-hidden="true" className="uf-menu-group-label">
                <Text as="span" size="xs" inset="none" membrane={false}>
                  {label}
                </Text>
              </div>
            )}
            {renderEntries(entry.key)}
          </div>
        )
      })

    // Naming: aria-label, else the trigger names a click menu.
    const name = resolveLabel(ariaLabel, '', 'Menu', 'aria-label') || undefined
    const title =
      name ??
      (typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : undefined)
    const labelledBy = ariaLabelledby ?? (context ? undefined : triggerId)

    const list = (
      <div
        {...rest}
        {...part('list')}
        ref={listRefs}
        id={listId}
        dir={dir}
        role="menu"
        aria-orientation="vertical"
        aria-label={name}
        aria-labelledby={name && !ariaLabelledby ? undefined : labelledBy}
        tabIndex={-1}
        className="uf-menu-list"
        onKeyDown={composeHandlers(onKeyDown, onListKeyDown)}
        onFocus={composeHandlers(onFocus, (event) => {
          roving.root.onFocus(event)
          setHighlighted(roving.keyOf(event.target))
        })}
        onBlur={composeHandlers(onBlur, (event) => {
          roving.root.onBlur(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setHighlighted(null)
        })}
      >
        {renderEntries(null)}
      </div>
    )
    const content = (
      <div
        {...part('content')}
        ref={contentRef}
        id={contentId}
        role={isSheet ? 'dialog' : undefined}
        aria-modal={isSheet || undefined}
        aria-labelledby={isSheet ? (title !== undefined ? titleId : labelledBy) : undefined}
        dir={dir ?? direction}
        data-state="open"
        data-surface={resolved}
        data-open-on={openOn}
        data-side={isSheet ? undefined : position.side}
        className={cn('uf-menu-content', className)}
        style={isSheet ? style : { ...style, ...position.style }}
      >
        <Membrane fullWidth as="div" className="uf-menu-contentMembrane">
          <Card
            ref={panelRef}
            padding="membrane"
            radius="md"
            fullWidth
            className="uf-menu-contentPanel uf-surface-stable"
          >
            {isSheet && (
              <ResponsiveSheetHeader
                title={title}
                titleId={title !== undefined ? titleId : undefined}
                closeLabel={strings.close}
                onClose={close}
              />
            )}
            {list}
          </Card>
        </Membrane>
      </div>
    )

    if (!hasTrigger) return null
    return (
      // Phrasing root: a menu can sit in running text such as a <p>.
      <span
        {...part('root')}
        className="uf-menu"
        data-state={isOpen ? 'open' : 'closed'}
        data-surface={resolved}
        data-open-on={openOn}
      >
        <Trigger
          {...part('trigger')}
          {...triggerProps}
          ref={triggerRef}
          id={triggerId}
          data-state={isOpen ? 'open' : 'closed'}
          disabled={disabled || undefined}
          actionable={!context}
          className="uf-menu-trigger"
        >
          {children}
        </Trigger>
        {shows && isSheet && (
          <div className="uf-responsive-overlay-backdrop" data-state="open" />
        )}
        {shows &&
          (isSheet
            ? content
            : createPortal(
                <>
                  {context && point && (
                    <span
                      ref={pointRef}
                      aria-hidden="true"
                      style={{
                        position: 'fixed',
                        left: point.x + span.start,
                        top: point.y,
                        width: span.width,
                      }}
                    />
                  )}
                  {content}
                </>,
                portalTarget,
              ))}
      </span>
    )
  },
)
