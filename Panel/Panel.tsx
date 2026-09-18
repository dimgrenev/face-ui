/**
 * Panel — collapsible side panel navigation.
 *
 * Flat API: all items rendered from `items` prop.
 * Supports nested groups, expand/collapse, and item selection.
 *
 * `<Panel items={[{ id: 'home', label: 'Home', icon: <HomeIcon /> }]} />`
 */

import {
  forwardRef,
  useRef,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useIsCompactViewport,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { Trigger } from '../assets/adapters/react/Trigger'
import { useLayer } from '../assets/adapters/react/use-layer'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import {
  sidebarMachine,
  connectSidebar,
} from '../assets/machines/sidebar.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import type { NavItemBase } from '../assets/nav-item'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanelItem extends NavItemBase {
  icon?: ReactNode
  href?: string
  onClick?: () => void
  items?: PanelItem[]
}

export interface PanelProps {
  /** Panel item definitions (supports nested groups). */
  items?: PanelItem[]
  /** Whether the panel is collapsed. */
  collapsed?: boolean
  /** Uncontrolled initial collapsed state. */
  defaultCollapsed?: boolean
  /** Callback when collapsed state changes. */
  onCollapsedChange?: (details: { collapsed: boolean }) => void
  /** Currently selected item ID. */
  selectedId?: string | null
  /** Uncontrolled initial selected item ID. */
  defaultSelectedId?: string
  /** Callback when selected item changes. */
  onSelectedChange?: (details: { selectedId: string }) => void
  /** Width when expanded. */
  width?: number | string
  /** Width when collapsed. */
  collapsedWidth?: number | string
  /** Additional class name on the root element. */
  className?: string
  /** Surface behavior on compact viewports. */
  surface?: 'auto' | 'inline' | 'sheet'
  /** Breakpoint where auto surfaces switch to sheet mode. */
  surfaceBreakpoint?: number
  /** Controlled drawer state for sheet mode. */
  open?: boolean
  /** Uncontrolled initial drawer state for sheet mode. */
  defaultOpen?: boolean
  /** Callback when drawer state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Optional trigger for sheet mode. */
  trigger?: ReactNode
  /** Optional title used in compact sheet header. */
  surfaceTitle?: ReactNode
}

// ---------------------------------------------------------------------------
// Sub-item renderer
// ---------------------------------------------------------------------------

interface PanelItemRendererProps {
  item: PanelItem
  api: ReturnType<typeof connectSidebar>
  collapsed: boolean
  level?: number
}

function PanelItemRenderer(props: PanelItemRendererProps) {
  const { item, api, collapsed, level = 0 } = props
  const hasChildren = Array.isArray(item.items) && item.items.length > 0
  const resolvedIcon =
    typeof item.icon === 'string' ? <Icon name={item.icon} /> : item.icon
  const iconNode = resolvedIcon && (
    <span data-scope="sidebar" data-part="itemIcon">
      {resolvedIcon}
    </span>
  )

  if (!hasChildren) {
    const itemProps = api.getItemProps({ id: item.id, disabled: item.disabled })
    const {
      className: itemClassName,
      onClick: selectItem,
      onKeyDown,
      'data-scope': _itemScope,
      'data-part': _itemPart,
      ...itemDomProps
    } = itemProps as typeof itemProps & {
      className?: string
      onClick?: () => void
      onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
      'data-scope'?: string
      'data-part'?: string
    }

    const handleClick = () => {
      selectItem?.()
      item.onClick?.()
      if (item.href && !item.onClick && typeof window !== 'undefined') {
        window.location.assign(item.href)
      }
    }

    return (
      <Button
        {...itemDomProps}
        icon={iconNode}
        iconOnly={collapsed}
        fullWidth
        align="left"
        stretchText
        membrane
        variant="default"
        level={level}
        aria-label={
          collapsed && typeof item.label === 'string' ? item.label : undefined
        }
        disabled={item.disabled}
        className={cn('uf-sidebar-itemButton', itemClassName)}
        onClick={handleClick}
        onKeyDown={onKeyDown}
      >
        {!collapsed && (
          <span data-scope="sidebar" data-part="itemLabel">
            {item.label}
          </span>
        )}
      </Button>
    )
  }

  // Group with sub-items
  const groupLabelProps = api.getGroupLabelProps({ id: item.id })
  const {
    className: groupLabelClassName,
    onClick: toggleGroup,
    onKeyDown: onGroupKeyDown,
    'data-scope': _groupLabelScope,
    'data-part': _groupLabelPart,
    ...groupLabelDomProps
  } = groupLabelProps as typeof groupLabelProps & {
    className?: string
    onClick?: () => void
    onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
    'data-scope'?: string
    'data-part'?: string
  }
  const isGroupOpen = groupLabelProps['data-state'] === 'open'

  return (
    <div {...api.getGroupProps({ id: item.id })}>
      <Button
        {...groupLabelDomProps}
        icon={iconNode}
        iconOnly={collapsed}
        fullWidth
        align="left"
        stretchText
        membrane
        variant="default"
        level={level}
        className={cn(
          'uf-sidebar-itemButton',
          'uf-sidebar-groupButton',
          groupLabelClassName,
        )}
        disabled={item.disabled}
        aria-label={
          collapsed && typeof item.label === 'string' ? item.label : undefined
        }
        onClick={() => toggleGroup?.()}
        onKeyDown={onGroupKeyDown}
        chevron={!collapsed ? 'right' : undefined}
        aria-expanded={isGroupOpen}
      >
        {!collapsed && (
          <span data-scope="sidebar" data-part="itemLabel">
            {item.label}
          </span>
        )}
      </Button>
      {!collapsed && (
        <div data-scope="sidebar" data-part="groupContent">
          {item.items!.map((child) => (
            <PanelItemRenderer
              key={child.id}
              item={child}
              api={api}
              collapsed={collapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  function Panel(props, ref) {
    const {
      items: rawItems,
      collapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      selectedId,
      defaultSelectedId,
      onSelectedChange,
      width = 260,
      collapsedWidth = 60,
      className,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      open,
      defaultOpen = false,
      onOpenChange,
      trigger,
      surfaceTitle,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const isCompactViewport = useIsCompactViewport(surfaceBreakpoint)
    const isSheetSurface =
      surface === 'sheet' || (surface === 'auto' && isCompactViewport)
    const machineCollapsed = useControllableMachineProp(
      collapsed,
      defaultCollapsed,
    )
    const machineSelectedId = useControllableMachineProp(
      selectedId,
      defaultSelectedId ?? null,
    )
    const [sheetOpen, setSheetOpen] = useControllableOpenState(
      open,
      defaultOpen,
      onOpenChange,
    )
    const sheetRef = useRef<HTMLDivElement | null>(null)
    const sheetTriggerRef = useRef<HTMLElement | null>(null)
    const sheetId = useId()
    const sheetTitleId = useId()
    const portalTarget = usePortalTarget()
    useLayer({
      enabled: isSheetSurface && sheetOpen && portalTarget !== null,
      contentRef: sheetRef,
      triggerRef: sheetTriggerRef,
      modal: true,
      autoFocus: true,
      restoreFocus: true,
      onEscape: () => setSheetOpen(false),
      onOutside: () => setSheetOpen(false),
    })
    useBodyScrollLock(isSheetSurface && sheetOpen)

    const { state, send } = useMachine(sidebarMachine, {
      collapsed: machineCollapsed,
      selectedId: machineSelectedId,
      width,
      collapsedWidth,
      onCollapsedChange: onCollapsedChange ?? null,
      onSelectedChange: onSelectedChange ?? null,
    })

    const api = connectSidebar(state, send)
    const isCollapsed = isSheetSurface ? false : api.collapsed

    const getToggleButtonProps = () => {
      const toggleProps = api.getToggleProps()
      const {
        className: toggleClassName,
        'data-scope': _toggleScope,
        'data-part': _togglePart,
        ...toggleButtonProps
      } = toggleProps as typeof toggleProps & {
        className?: string
        'data-scope'?: string
        'data-part'?: string
      }

      return { toggleButtonProps, toggleClassName }
    }

    const renderPanelItems = () => {
      const { toggleButtonProps, toggleClassName } = getToggleButtonProps()

      return (
        <>
          {!isSheetSurface && (
            <div {...api.getHeaderProps()}>
              <Button
                {...toggleButtonProps}
                icon={
                  <Icon
                    name={
                      isCollapsed
                        ? 'layout-sidebar-left'
                        : 'layout-sidebar-left-open'
                    }
                  />
                }
                iconOnly
                fullWidth={false}
                variant="default"
                membrane
                className={cn('uf-sidebar-toggleButton', toggleClassName)}
                aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              />
            </div>
          )}
          <div {...api.getContentProps()}>
            {items.map((item) => (
              <PanelItemRenderer
                key={item.id}
                item={item}
                api={api}
                collapsed={isCollapsed}
              />
            ))}
          </div>
          <div {...api.getFooterProps()} />
        </>
      )
    }

    if (isSheetSurface) {
      const triggerNode = trigger ?? (
        <Button
          icon="layout-sidebar-left"
          iconOnly
          fullWidth={false}
          variant="ghost"
          membrane
          aria-label="Open panel"
        />
      )

      return (
        <div className={cn('uf-sidebar-sheetHost', className)}>
          <Trigger
            ref={sheetTriggerRef}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-controls={sheetId}
            className="uf-sidebar-sheetTrigger"
            onClick={() => setSheetOpen(true)}
          >
            {triggerNode}
          </Trigger>
          {portalTarget
            ? createPortal(
                <>
                  <div
                    className="uf-responsive-overlay-backdrop"
                    data-state={sheetOpen ? 'open' : 'closed'}
                    hidden={!sheetOpen}
                  />
                  <Card
                    ref={(node) => {
                      sheetRef.current = node
                      if (typeof ref === 'function') ref(node)
                      else if (ref) ref.current = node
                    }}
                    id={sheetId}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={sheetTitleId}
                    tabIndex={-1}
                    hidden={!sheetOpen}
                    variant="plain"
                    padding="none"
                    radius="none"
                    border={false}
                    className="uf-responsive-panel uf-sidebar-sheet"
                    data-state={sheetOpen ? 'open' : 'closed'}
                    data-placement="left"
                    style={
                      {
                        '--face-runtime-sidebar-sheet-w':
                          typeof width === 'number'
                            ? `${width}px`
                            : String(width),
                      } as any
                    }
                  >
                    <ResponsiveSheetHeader
                      title={
                        <span id={sheetTitleId}>{surfaceTitle ?? 'Panel'}</span>
                      }
                      onClose={() => setSheetOpen(false)}
                    />
                    <nav className="uf-sidebar">{renderPanelItems()}</nav>
                  </Card>
                </>,
                portalTarget,
              )
            : null}
        </div>
      )
    }

    return (
      <nav
        ref={ref}
        {...api.getRootProps()}
        className={cn('uf-sidebar', className)}
      >
        {renderPanelItems()}
      </nav>
    )
  },
)

export const Sidebar = Panel
export type SidebarProps = PanelProps
export type SidebarItem = PanelItem
