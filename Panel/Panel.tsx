/** Panel — side navigation: links in expandable groups that collapses to a rail, or a sheet on narrow screens. */
import {
  forwardRef,
  useId,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import type { CollectionItem } from '../assets/internal/item'
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
  readKeys,
  visibleKeys,
} from '../assets/runtime/collection'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { invalidProp, readCssSize } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One row of Panel: a link, an action, or a group of rows. */
export interface PanelItem extends Omit<CollectionItem, 'textValue'> {
  /** Makes the item a link to this URL; a click with a modifier key or the middle button opens it elsewhere and changes nothing here. */
  href?: string
  /** Called with the click before the item becomes current or its group toggles; `preventDefault()` cancels only a link's navigation. */
  onClick?: (event: MouseEvent<HTMLElement>) => void
  /** Turns the item into a group whose button shows these rows while it is expanded; its `href` is then ignored, and disabling it disables them. */
  items?: readonly PanelItem[]
}

/** Strings Panel renders itself. */
export type PanelLabels = Pick<CommonLabels, 'open' | 'close' | 'expand' | 'collapse'>

export interface PanelProps
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
  /** Rows in order, groups nesting their rows; an item repeating an earlier value is dropped. */
  items?: readonly PanelItem[]
  /** Value of the current page's row, marked `aria-current="page"`; `null` marks none, and an unknown value marks none. */
  value?: string | null
  /** Current row on mount when `value` is not set; read once. */
  defaultValue?: string | null
  /** Called once when the user activates an enabled row other than the current one; a controlled parent may refuse it. */
  onValueChange?: (details: { value: string }) => void
  /** Values of the groups showing their rows; unknown values are kept but show nothing. */
  expanded?: readonly string[]
  /** Expanded groups on mount when `expanded` is not set; read once. Default: the groups that hold the current row. */
  defaultExpanded?: readonly string[]
  /** Called once per user toggle of a group, with the new list; a controlled parent may refuse it. */
  onExpandedChange?: (details: { expanded: string[] }) => void
  /** Whether the inline panel is a rail of icons, labels kept as accessible names; a sheet never collapses. */
  collapsed?: boolean
  /** Whether the panel is collapsed on mount when `collapsed` is not set; read once. */
  defaultCollapsed?: boolean
  /** Called once per user request to collapse or expand the panel; a controlled parent may refuse it. */
  onCollapsedChange?: (details: { collapsed: boolean }) => void
  /** Shows the button that collapses the panel to a rail, and lets a group in the rail open the panel at it; false leaves `collapsed` to the parent, and groups then open in the rail. Default true. */
  collapsible?: boolean
  /** Width of the expanded inline panel: a number or numeric string is pixels, or pass a CSS length. Wins over `style.width`; otherwise that style is used, then 260px. */
  width?: number | string
  /** Width of the collapsed rail: a number or numeric string is pixels, or pass a CSS length. Wins over `style.width`; default 60px. */
  collapsedWidth?: number | string
  /** `inline` shows the panel; `sheet` shows a trigger that opens the rows in a drawer at the start edge; `auto` is a sheet below 900px. */
  surface?: 'auto' | 'inline' | 'sheet'
  /** Whether the sheet is open; only a sheet surface opens, and leaving it closes an uncontrolled sheet. */
  open?: boolean
  /** Whether the sheet is open on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Called once per user request to open or close the sheet; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Element that opens the sheet, keeping its own props; text renders as a Button. Default: an icon button named `labels.open`. */
  trigger?: ReactNode
  /** Names the navigation landmark (default "Sidebar") and titles the sheet. */
  'aria-label'?: string
  /** Strings Panel renders itself: `open` names the default sheet trigger, `close` the sheet's close button, `expand` and `collapse` the rail toggle. */
  labels?: Partial<PanelLabels>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { getPartAttrs: part } = createAnatomy('sidebar').parts(
  'root',
  'header',
  'content',
  'item',
  'link',
  'trigger',
  'group',
  'icon',
  'label',
  'indicator',
)
const defaultLabels: PanelLabels = Object.freeze({
  open: 'Open panel',
  close: 'Close',
  expand: 'Expand panel',
  collapse: 'Collapse panel',
})
/** Landmark and sheet name until a native aria-label or aria-labelledby names the nav (K14). */
const defaultRootLabels = Object.freeze({ nav: 'Sidebar' })
// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

/** Side navigation: links in expandable groups that collapses to a rail, or a sheet on narrow screens. */
export const Panel = forwardRef<HTMLElement, PanelProps>(
  function Panel(props, ref) {
    const {
      items,
      value,
      defaultValue = null,
      onValueChange,
      expanded,
      defaultExpanded,
      onExpandedChange,
      collapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      collapsible = true,
      width = 260,
      collapsedWidth = 60,
      surface = 'auto',
      open,
      defaultOpen = false,
      onOpenChange,
      trigger,
      labels,
      className,
      style,
      ...rest
    } = props
    const strings = resolveLabels(defaultLabels, labels, 'Panel')

    const collection = readCollection<PanelItem>(items, {
      component: 'Panel',
      key: (item) => item.value,
      children: (item) => item.items,
    })
    /** Rows under `parent`; K9 groups and separators are not rows. */
    const rowsOf = (parent: string | null) =>
      collection.children(parent).filter((entry) => kindOf(entry.item) === 'item')
    const isGroup = (key: string) => rowsOf(key).length > 0
    const off = (key: string) => isDisabled(collection, key)
    for (const { key, item } of collection.entries) {
      const kind = kindOf(item)
      if (kind !== 'item')
        invalidProp('Panel', 'items[].type', kind, 'dropping it: a group is a row with items, and Panel has no separators')
      else if (isGroup(key) && item.href !== undefined)
        invalidProp('Panel', 'items[].href', item.href, `ignoring it: ${JSON.stringify(key)} is a group`)
    }

    // Current page.
    const [current, setCurrent] = useControllableState<string | null>({
      value,
      defaultValue,
      onChange: (next) => {
        if (next !== null) onValueChange?.({ value: next })
      },
      name: ['Panel', 'value'],
    })
    const isCurrent = (key: string) => key === current && !isGroup(key)
    /** The groups that hold the current row, outermost first. */
    const holders = () => {
      const keys: string[] = []
      for (let key = collection.get(current)?.parent ?? null; key !== null; key = collection.get(key)?.parent ?? null)
        keys.unshift(key)
      return keys
    }

    // Groups: expanded by value; on mount, the groups that hold the current row.
    const [expandedKeys, setExpanded] = useControllableState<readonly string[]>({
      value:
        expanded === undefined
          ? undefined
          : readKeys(expanded, 'Panel', 'expanded'),
      defaultValue: () =>
        defaultExpanded === undefined
          ? holders()
          : readKeys(defaultExpanded, 'Panel', 'defaultExpanded'),
      onChange: (next) => onExpandedChange?.({ expanded: next as string[] }),
      name: ['Panel', 'expanded'],
    })
    const expandedSet = new Set(expandedKeys)

    // Rail.
    const [isCollapsed, setCollapsed] = useControllableState<boolean>({
      value: collapsed,
      defaultValue: defaultCollapsed,
      onChange: (next) => onCollapsedChange?.({ collapsed: next }),
      name: ['Panel', 'collapsed'],
    })

    const { isSheet, open: sheetOpen, setOpen: setSheetOpen } = useNavSurface('Panel', {
      surface,
      open,
      defaultOpen,
      onOpenChange,
    })

    const rail = !isSheet && !!isCollapsed
    // A group in a rail the user may widen opens the panel at that group; in a fixed rail it
    // shows its rows in place.
    const widens = rail && collapsible
    const shows = (key: string) => !widens && expandedSet.has(key)
    const holding = new Set(holders())
    const rows = useRovingFocus({
      keys: visibleKeys(collection, widens ? new Set() : expandedSet),
      disabled: off,
      orientation: 'vertical',
      tabStops: 'all',
      loop: false,
    })
    const scope = useId()
    const rootRef = useRef<HTMLElement | null>(null)
    const rootRefs = useComposedRefs(rootRef, ref)

    const toggleGroup = (key: string) => {
      if (widens) {
        setCollapsed(false)
        if (!expandedSet.has(key)) setExpanded((keys) => [...keys, key])
      } else
        setExpanded((keys) =>
          keys.includes(key) ? keys.filter((other) => other !== key) : [...keys, key],
        )
    }

    const renderRows = (parent: string | null, after: () => void): ReactNode =>
      rowsOf(parent).map((entry) => {
        const { key, level } = entry
        const inert = off(key)
        const { label, icon, href, onClick } = entry.item
        const group = isGroup(key)
        const isOpen = group && shows(key)
        const groupId = domId(scope, 'group', key)
        const content = (
          <>
            {hasSlotContent(icon) && (
              <span {...part('icon')} className="uf-sidebar-itemIcon" aria-hidden="true">
                {typeof icon === 'string' ? <Icon name={icon} /> : icon}
              </span>
            )}
            <span
              {...part('label')}
              className={rail ? 'uf-visually-hidden' : 'uf-sidebar-itemLabel'}
            >
              {label}
            </span>
            {group && !rail && (
              <span {...part('indicator')} className="uf-sidebar-itemIndicator" aria-hidden="true">
                <Icon name="select-chevron-right" />
              </span>
            )}
          </>
        )
        const shared = {
          ...rows.item(key),
          className: 'uf-sidebar-item uf-option',
          style: { '--face-runtime-option-level': level - 1 } as CSSProperties,
          'data-value': key,
          'data-disabled': inert || undefined,
        }
        const link = typeof href === 'string' && href && !group ? href : undefined
        const onActivate = (event: MouseEvent<HTMLElement>) => {
          if (inert) return
          onClick?.(event)
          if (opensElsewhere(event)) return
          if (group) toggleGroup(key)
          else {
            setCurrent(key)
            after()
          }
        }
        return (
          <li key={key} {...part('item')} data-value={key}>
            <Membrane interactive fullWidth>
              {group ? (
                <button
                  {...part('trigger')}
                  {...shared}
                  type="button"
                  disabled={inert}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? groupId : undefined}
                  data-current={!isOpen && holding.has(key) ? '' : undefined}
                  onClick={onActivate}
                >
                  {content}
                </button>
              ) : link ? (
                <a
                  {...part('link')}
                  {...shared}
                  href={inert ? undefined : link}
                  aria-disabled={inert || undefined}
                  aria-current={isCurrent(key) ? 'page' : undefined}
                  onClick={onActivate}
                >
                  {content}
                </a>
              ) : (
                <button
                  {...part('link')}
                  {...shared}
                  type="button"
                  disabled={inert}
                  aria-current={isCurrent(key) ? 'page' : undefined}
                  onClick={onActivate}
                >
                  {content}
                </button>
              )}
            </Membrane>
            {isOpen && (
              <ul {...part('group')} id={groupId} className="uf-sidebar-group">
                {renderRows(key, after)}
              </ul>
            )}
          </li>
        )
      })
    const list = (after: () => void) => (
      <ul
        {...part('content')}
        className="uf-sidebar-content"
        onKeyDown={rows.root.onKeyDown}
        onFocus={rows.root.onFocus}
        onBlur={rows.root.onBlur}
      >
        {renderRows(null, after)}
      </ul>
    )
    const root = {
      'aria-label': defaultRootLabels.nav,
      ...rest,
      ...part('root'),
      ref: rootRefs,
      className: cn('uf-sidebar', className),
      'data-surface': isSheet ? 'sheet' : 'inline',
    }

    if (isSheet)
      return (
        <nav {...root} style={style}>
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
            placement="start"
            root={rootRef}
            className="uf-sidebar-sheet"
          >
            {list(() => setSheetOpen(false))}
          </NavSheet>
        </nav>
      )

    const expandedWidth = props.width === undefined
      ? style?.width ?? '260px'
      : readCssSize('Panel', 'width', width) ?? style?.width ?? '260px'
    const railWidth = readCssSize('Panel', 'collapsedWidth', collapsedWidth) ?? '60px'
    return (
      <nav
        {...root}
        data-state={rail ? 'collapsed' : 'expanded'}
        style={{ ...style, width: rail ? railWidth : expandedWidth }}
      >
        {collapsible && (
          <div {...part('header')}>
            <Button
              icon={rail ? 'layout-sidebar-left' : 'layout-sidebar-left-open'}
              iconOnly
              fullWidth={false}
              variant="default"
              aria-label={rail ? strings.expand : strings.collapse}
              className="uf-sidebar-toggleButton"
              onClick={() => setCollapsed(!rail)}
            />
          </div>
        )}
        {list(() => {})}
      </nav>
    )
  },
)
