/** Navigation — the main links of a site or app in a bar, with dropdowns; a sheet on narrow screens. */
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useHoverIntent } from '../assets/adapters/react/use-hover-intent'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import { getCardSurfaceProps } from '../assets/internal/card-surface'
import type {
  CollectionItem,
  ItemGroup,
} from '../assets/internal/item'
import {
  isDisabled,
  kindOf,
  NavSheet,
  opensElsewhere,
  useNavSurface,
} from '../assets/internal/nav'
import {
  domId,
  readCollection,
  type Entry,
} from '../assets/runtime/collection'
import { keyToMove } from '../assets/runtime/keyboard'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { invalidProp } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A link or action of Navigation, in the bar, a dropdown or the sheet. */
export interface NavigationLink extends Omit<CollectionItem, 'textValue'> {
  /** Makes the item a link to this URL; a click with a modifier key or the middle button opens it elsewhere and changes nothing here. */
  href?: string
  /** Called with the click before the item becomes current or its dropdown toggles; `preventDefault()` cancels only a link's navigation. */
  onClick?: (event: MouseEvent<HTMLElement>) => void
  /** Only bar items open dropdowns. */
  items?: never
}

/** What a dropdown holds: links, and labelled groups of links. */
export type NavigationEntry = NavigationLink | ItemGroup<NavigationLink>

/** One item of the bar. */
export interface NavigationItem extends Omit<NavigationLink, 'items'> {
  /** Turns the item into a button that shows these entries in a dropdown (a section of the sheet); its `href` is then ignored, and disabling it disables them. */
  items?: readonly NavigationEntry[]
}

/** Strings Navigation renders itself. */
export type NavigationLabels = Pick<CommonLabels, 'open' | 'close'>

export interface NavigationProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    | 'children'
    | 'role'
    | 'defaultValue'
    | 'defaultChecked'
    | 'dangerouslySetInnerHTML'
    | 'contentEditable'
    | 'suppressContentEditableWarning'
  > {
  /** The bar's items in order; an item repeating an earlier value is dropped. */
  items?: readonly NavigationItem[]
  /** Value of the current page's item, marked `aria-current="page"`; `null` marks none, and an unknown value marks none. */
  value?: string | null
  /** Current item on mount when `value` is not set; read once. */
  defaultValue?: string | null
  /** Called once when the user activates an enabled item other than the current one; a controlled parent may refuse it. */
  onValueChange?: (details: { value: string }) => void
  /** `inline` shows the bar; `sheet` shows a trigger that opens the items in a bottom sheet; `auto` is a sheet below 900px. */
  surface?: 'auto' | 'inline' | 'sheet'
  /** Whether the sheet is open; only a sheet surface opens, and leaving it closes an uncontrolled sheet. */
  open?: boolean
  /** Whether the sheet is open on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Called once per user request to open or close the sheet; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Element that opens the sheet, keeping its own props; text renders as a Button. Default: an icon button named `labels.open`. */
  trigger?: ReactNode
  /** Names the navigation landmark (default "Main") and titles the sheet. */
  'aria-label'?: string
  /** Strings Navigation renders itself: `open` names the default sheet trigger, `close` the sheet's close button. */
  labels?: Partial<NavigationLabels>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { getPartAttrs: part } = createAnatomy('navigation').parts(
  'root',
  'list',
  'item',
  'trigger',
  'content',
  'link',
  'icon',
  'indicator',
  'group',
  'group-label',
)
const defaultLabels: NavigationLabels = Object.freeze({
  open: 'Open navigation',
  close: 'Close',
})
/** Landmark and sheet name until a native aria-label or aria-labelledby names the nav (K14). */
const defaultRootLabels = Object.freeze({ nav: 'Main' })
/** Hover opens a dropdown after this pause, and leaving closes it after the other. */
const OPEN_DELAY = 200
const CLOSE_DELAY = 150

function renderIcon(icon: ReactNode) {
  if (!hasSlotContent(icon)) return null
  return (
    <span {...part('icon')} aria-hidden="true">
      {typeof icon === 'string' ? <Icon name={icon} /> : icon}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/** The main links of a site or app in a bar, with dropdowns; a sheet on narrow screens. */
export const Navigation = forwardRef<HTMLElement, NavigationProps>(
  function Navigation(props, ref) {
    const {
      items,
      value,
      defaultValue = null,
      onValueChange,
      surface = 'auto',
      open,
      defaultOpen = false,
      onOpenChange,
      trigger,
      labels,
      className,
      ...rest
    } = props
    const strings = resolveLabels(defaultLabels, labels, 'Navigation')

    // Items: the bar's own items open dropdowns of links and groups of links; nothing nests deeper.
    const own = new Set<unknown>(Array.isArray(items) ? items : [])
    const collection = readCollection<unknown>(items, {
      component: 'Navigation',
      key: (item) => (item as NavigationLink).value,
      children: (item) =>
        own.has(item) ? (item as NavigationItem).items : undefined,
    })
    const kept = (entry: Entry<unknown>) => {
      const kind = kindOf(entry.item)
      return kind === 'item' || (kind === 'group' && own.has(collection.get(entry.parent)?.item))
    }
    for (const entry of collection.entries) {
      const kind = kindOf(entry.item)
      const { items: nested } = entry.item as NavigationItem
      if (!kept(entry))
        invalidProp(
          'Navigation',
          'items[].type',
          kind,
          kind === 'group'
            ? 'dropping it and its links: a group belongs directly in a dropdown'
            : 'dropping it: Navigation has no separators',
        )
      else if (kind === 'item' && !own.has(entry.item) && nested !== undefined)
        invalidProp('Navigation', 'items[].items', nested, 'ignoring it: only bar items open dropdowns')
    }
    const itemsOf = (parent: string | null) => collection.children(parent).filter(kept)
    const top = itemsOf(null)
    const topKeys = top.map((entry) => entry.key)
    const hasMenu = (key: string) => itemsOf(key).length > 0
    const disabled = (key: string) => isDisabled(collection, key)
    /** The links under a bar item, groups flattened, in order. */
    const linksOf = (key: string) =>
      itemsOf(key).flatMap((entry) =>
        kindOf(entry.item) === 'group'
          ? itemsOf(entry.key).filter((link) => kindOf(link.item) === 'item')
          : [entry],
      )
    for (const { key, item } of top) {
      const { href } = item as NavigationItem
      if (hasMenu(key) && href !== undefined)
        invalidProp('Navigation', 'items[].href', href, `ignoring it: ${JSON.stringify(key)} opens a dropdown`)
    }

    // Current page.
    const [current, setCurrent] = useControllableState<string | null>({
      value,
      defaultValue,
      onChange: (next) => {
        if (next !== null) onValueChange?.({ value: next })
      },
      name: ['Navigation', 'value'],
    })
    const isCurrent = (key: string) => key === current && !hasMenu(key)

    const { isSheet, open: sheetOpen, setOpen: setSheetOpen } = useNavSurface('Navigation', {
      surface,
      open,
      defaultOpen,
      onOpenChange,
    })

    // Dropdowns: one open at a time; hover opens one after a pause and a click toggles it. The last
    // change remembers its source: a click keeps a dropdown hover opened (the pointer was on its
    // way to press it), and focus moving out closes one without taking focus back to its trigger.
    const [dropdown, setDropdown] = useState<{
      key: string | null
      via: 'hover' | 'press' | 'blur'
    }>({ key: null, via: 'press' })
    const openKey = dropdown.key
    const shown =
      !isSheet && openKey !== null && hasMenu(openKey) && !disabled(openKey)
        ? openKey
        : null
    const close = () => setDropdown({ key: null, via: 'press' })
    const toggle = (key: string, isOpen: boolean) =>
      setDropdown({
        key: isOpen && dropdown.via !== 'hover' ? null : key,
        via: 'press',
      })
    const hover = useHoverIntent({
      value: shown,
      onValueChange: (next) => setDropdown({ key: next, via: 'hover' }),
      openDelay: OPEN_DELAY,
      closeDelay: CLOSE_DELAY,
      focus: false,
      disabled: isSheet,
    })

    const scope = useId()
    const triggerId = (key: string) => domId(scope, 'trigger', key)
    const contentId = (key: string) => domId(scope, 'content', key)
    const rootRef = useRef<HTMLElement | null>(null)
    const rootRefs = useComposedRefs(rootRef, ref)
    // The open item and its trigger: the layer's surface, and where focus returns.
    const itemRef = useRef<HTMLElement | null>(null)
    const openTriggerRef = useRef<HTMLElement | null>(null)
    useIsomorphicLayoutEffect(() => {
      if (shown === null) return
      const node = rootRef.current?.ownerDocument.getElementById(triggerId(shown))
      openTriggerRef.current = node ?? null
      itemRef.current = node?.closest('li') ?? null
    })
    useLayer({
      enabled: shown !== null,
      contentRef: itemRef,
      triggerRef: openTriggerRef,
      restoreFocus: dropdown.via !== 'blur',
      onEscape: close,
      onOutside: close,
    })

    // Keys: arrows along the bar and inside the open dropdown; nothing wraps (APG disclosure navigation).
    const barFocus = useRovingFocus({
      keys: topKeys,
      disabled,
      orientation: 'horizontal',
      tabStops: 'all',
      loop: false,
    })
    const links = shown === null ? [] : linksOf(shown)
    const menuFocus = useRovingFocus({
      keys: links.map((entry) => entry.key),
      disabled,
      orientation: 'vertical',
      tabStops: 'all',
      loop: false,
    })
    // Down and Up on a trigger open its dropdown at the first or last link.
    const [opening, setOpening] = useState<'first' | 'last' | null>(null)
    const edgeLink = (edge: 'first' | 'last') => {
      const enabled = links.filter((link) => !disabled(link.key))
      return (edge === 'first' ? enabled[0] : enabled.at(-1))?.key
    }
    useIsomorphicLayoutEffect(() => {
      if (opening === null) return
      const key = shown === null ? undefined : edgeLink(opening)
      if (key !== undefined) menuFocus.focus(key)
      setOpening(null)
    }, [opening, shown])

    const activate = (
      entry: Entry<unknown>,
      event: MouseEvent<HTMLElement>,
      after: () => void,
    ) => {
      if (disabled(entry.key)) return
      ;(entry.item as NavigationLink).onClick?.(event)
      if (opensElsewhere(event)) return
      setCurrent(entry.key)
      after()
    }

    const renderLink = (
      entry: Entry<unknown>,
      options: {
        roving?: ReturnType<typeof useRovingFocus>
        row: boolean
        after: () => void
      },
    ) => {
      const { key } = entry
      const off = disabled(key)
      const { label, icon, href } = entry.item as NavigationLink
      const link = typeof href === 'string' && href ? href : undefined
      const shared = {
        ...part('link'),
        ...options.roving?.item(key),
        className: options.row ? 'uf-option' : 'uf-control',
        'data-value': key,
        'data-disabled': off || undefined,
        'aria-current': isCurrent(key) ? ('page' as const) : undefined,
        onClick: (event: MouseEvent<HTMLElement>) =>
          activate(entry, event, options.after),
      }
      const content = (
        <>
          {renderIcon(icon)}
          <span className="uf-navigation-label">{label}</span>
        </>
      )
      return (
        <Membrane interactive fullWidth={options.row}>
          {link ? (
            <a {...shared} href={off ? undefined : link} aria-disabled={off || undefined}>
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

    /** A dropdown's or a sheet section's entries: links, and labelled groups of links. */
    const renderEntries = (
      parent: string,
      options: { roving?: ReturnType<typeof useRovingFocus>; after: () => void },
    ): ReactNode =>
      itemsOf(parent).map((entry) => {
        if (kindOf(entry.item) === 'item')
          return (
            <li key={entry.key} {...part('item')} data-value={entry.key}>
              {renderLink(entry, { ...options, row: true })}
            </li>
          )
        const labelId = domId(scope, 'group', entry.key)
        const { label } = entry.item as ItemGroup<unknown>
        return (
          <li key={entry.key} {...part('group')} className="uf-navigation-nestedGroup">
            {hasSlotContent(label) && (
              <span {...part('group-label')} id={labelId} className="uf-navigation-groupLabel">
                {label}
              </span>
            )}
            <ul
              className="uf-navigation-groupList"
              aria-labelledby={hasSlotContent(label) ? labelId : undefined}
            >
              {renderEntries(entry.key, options)}
            </ul>
          </li>
        )
      })

    const root = {
      'aria-label': defaultRootLabels.nav,
      ...rest,
      ...part('root'),
      ref: rootRefs,
      className: cn('uf-navigation', className),
      'data-surface': isSheet ? 'sheet' : 'inline',
    }

    if (isSheet) {
      const closeSheet = () => setSheetOpen(false)
      return (
        <nav {...root}>
          <NavSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            trigger={trigger}
            icon="layout-sidebar-left"
            openLabel={strings.open}
            closeLabel={strings.close}
            title={rest['aria-label']}
            labelledBy={rest['aria-labelledby']}
            name={defaultRootLabels.nav}
            placement="bottom"
            root={rootRef}
            className="uf-navigation-sheet"
          >
            <ul {...part('list')} className="uf-navigation-sheetList">
              {top.map((entry) => {
                if (!hasMenu(entry.key))
                  return (
                    <li key={entry.key} {...part('item')} data-value={entry.key}>
                      {renderLink(entry, { row: true, after: closeSheet })}
                    </li>
                  )
                const labelId = domId(scope, 'section', entry.key)
                const { label, icon } = entry.item as NavigationItem
                return (
                  <li
                    key={entry.key}
                    {...part('item')}
                    data-value={entry.key}
                    data-disabled={disabled(entry.key) || undefined}
                    className="uf-navigation-section"
                  >
                    <span id={labelId} className="uf-navigation-sectionLabel">
                      {renderIcon(icon)}
                      {label}
                    </span>
                    <ul className="uf-navigation-groupList" aria-labelledby={labelId}>
                      {renderEntries(entry.key, { after: closeSheet })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </NavSheet>
        </nav>
      )
    }

    return (
      <nav {...root}>
        <ul
          {...part('list')}
          className="uf-navigation-list"
          onKeyDown={barFocus.root.onKeyDown}
          // Focus landing outside the open item closes its dropdown, once it has landed, so no
          // recovery takes it back; a press outside is the layer's.
          onFocus={(event) => {
            barFocus.root.onFocus(event)
            if (shown !== null && !itemRef.current?.contains(event.target as Node))
              setDropdown({ key: null, via: 'blur' })
          }}
          onBlur={(event) => {
            barFocus.root.onBlur(event)
            const next = event.relatedTarget as Node | null
            if (shown !== null && next && !event.currentTarget.contains(next))
              setDropdown({ key: null, via: 'blur' })
          }}
        >
          {top.map((entry) => {
            const { key } = entry
            const off = disabled(key)
            if (!hasMenu(key))
              return (
                <li key={key} {...part('item')} data-value={key}>
                  {renderLink(entry, { roving: barFocus, row: false, after: close })}
                </li>
              )
            const { label, icon, onClick } = entry.item as NavigationItem
            const isOpen = shown === key
            const { ref: hoverRef, onPointerEnter, onPointerLeave } = hover.trigger(key)
            const holdsCurrent = linksOf(key).some((link) => isCurrent(link.key))
            return (
              <li
                key={key}
                {...part('item')}
                data-value={key}
                data-state={isOpen ? 'open' : 'closed'}
                {...(off ? {} : { ref: hoverRef, onPointerEnter, onPointerLeave })}
              >
                <Membrane interactive>
                  <button
                    {...part('trigger')}
                    {...barFocus.item(key)}
                    id={triggerId(key)}
                    type="button"
                    disabled={off}
                    aria-expanded={isOpen}
                    aria-controls={contentId(key)}
                    data-state={isOpen ? 'open' : 'closed'}
                    data-current={holdsCurrent || undefined}
                    data-value={key}
                    className="uf-control"
                    onClick={(event) => {
                      onClick?.(event)
                      toggle(key, isOpen)
                    }}
                    onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                      const to = keyToMove(event, 'vertical', 'ltr')
                      if (to !== 'next' && to !== 'prev') return
                      event.preventDefault()
                      const edge = to === 'next' ? 'first' : 'last'
                      if (isOpen) {
                        const link = edgeLink(edge)
                        if (link !== undefined) menuFocus.focus(link)
                      } else {
                        setOpening(edge)
                        setDropdown({ key, via: 'press' })
                      }
                    }}
                  >
                    {renderIcon(icon)}
                    <span className="uf-navigation-label">{label}</span>
                    <span {...part('indicator')} aria-hidden="true">
                      <Icon name="select-chevron-down" />
                    </span>
                  </button>
                </Membrane>
                <div
                  {...getCardSurfaceProps({
                    variant: 'default',
                    padding: 'membrane',
                    radius: 'md',
                    border: true,
                    hoverable: false,
                    fullWidth: false,
                    className: 'uf-navigation-content uf-surface-stable',
                  })}
                  {...part('content')}
                  id={contentId(key)}
                  data-state={isOpen ? 'open' : 'closed'}
                  hidden={!isOpen}
                >
                  <ul
                    className="uf-navigation-menu"
                    onKeyDown={menuFocus.root.onKeyDown}
                    onFocus={menuFocus.root.onFocus}
                    onBlur={menuFocus.root.onBlur}
                  >
                    {renderEntries(key, {
                      roving: isOpen ? menuFocus : undefined,
                      after: close,
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  },
)
