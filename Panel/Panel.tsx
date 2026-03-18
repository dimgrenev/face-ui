/**
 * Panel — collapsible side panel navigation.
 *
 * Flat API: all items rendered from `items` prop.
 * Supports nested groups, expand/collapse, and item selection.
 *
 * `<Panel items={[{ id: 'home', label: 'Home', icon: <HomeIcon /> }]} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useIsCompactViewport,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { sidebarMachine, connectSidebar } from '../assets/machines/sidebar.machine'
import { cn } from '../assets/utils'
import { Bar } from '../Bar/Bar'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Tree } from '../Tree/Tree'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanelItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  href?: string
  onClick?: () => void
  items?: PanelItem[]
  disabled?: boolean
}

export interface PanelProps {
  /** Panel item definitions (supports nested groups). */
  items: PanelItem[]
  /** Whether the panel is collapsed. */
  collapsed?: boolean
  /** Uncontrolled initial collapsed state. */
  defaultCollapsed?: boolean
  /** Callback when collapsed state changes. */
  onCollapsedChange?: (details: { collapsed: boolean }) => void
  /** Currently selected item ID. */
  selectedId?: string
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
  /** Showcase-only built-in layout preset. */
  previewPreset?: 'workspace'
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
}

function PanelItemRenderer(props: PanelItemRendererProps) {
  const { item, api, collapsed } = props
  const hasChildren = Array.isArray(item.items) && item.items.length > 0

  if (!hasChildren) {
    const itemProps = api.getItemProps({ id: item.id, disabled: item.disabled })

    const handleClick = () => {
      itemProps.onClick()
      item.onClick?.()
    }

    if (item.href) {
      return (
        <a
          {...itemProps}
          href={item.href}
          className={cn('uf-sidebar-item', (itemProps as { className?: string }).className)}
          onClick={(e) => {
            handleClick()
            if (item.onClick) {
              e.preventDefault()
              item.onClick()
            }
          }}
        >
          {item.icon && <span data-scope="sidebar" data-part="itemIcon">{item.icon}</span>}
          {!collapsed && (
            <Text as="span" inset="none" membrane={false} data-scope="sidebar" data-part="itemLabel">
              {item.label}
            </Text>
          )}
        </a>
      )
    }

    return (
      <div
        {...itemProps}
        className={cn('uf-sidebar-item', (itemProps as { className?: string }).className)}
        onClick={handleClick}
      >
        {item.icon && <span data-scope="sidebar" data-part="itemIcon">{item.icon}</span>}
        {!collapsed && (
          <span data-scope="sidebar" data-part="itemLabel" className="uf-text-body">
            {item.label}
          </span>
        )}
      </div>
    )
  }

  // Group with sub-items
  const groupLabelProps = api.getGroupLabelProps({ id: item.id })
  return (
    <div {...api.getGroupProps({ id: item.id })}>
      <div
        {...groupLabelProps}
        className={cn(
          'uf-sidebar-item',
          (groupLabelProps as { className?: string }).className,
        )}
      >
        {item.icon && <span data-scope="sidebar" data-part="itemIcon">{item.icon}</span>}
        {!collapsed && (
          <span data-scope="sidebar" data-part="itemLabel" className="uf-text-body">
            {item.label}
          </span>
        )}
      </div>
      {!collapsed && (
        <div data-scope="sidebar" data-part="groupContent">
          {item.items!.map((child) => (
            <PanelItemRenderer key={child.id} item={child} api={api} collapsed={collapsed} />
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
      previewPreset,
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
    const isSheetSurface = surface === 'sheet' || (surface === 'auto' && isCompactViewport)
    const machineCollapsed = useControllableMachineProp(collapsed, defaultCollapsed)
    const machineSelectedId = useControllableMachineProp(selectedId, defaultSelectedId ?? null)
    const [sheetOpen, setSheetOpen] = useControllableOpenState(open, defaultOpen, onOpenChange)
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
    const previewSections = [
      {
        title: 'Workspace',
        items: [
          { id: 'overview', label: 'Overview', icon: 'panel' as const },
          { id: 'components', label: 'Components', icon: 'component' as const },
          { id: 'tokens', label: 'Tokens', icon: 'props' as const },
        ],
      },
      {
        title: 'Tools',
        items: [
          { id: 'search', label: 'Search', icon: 'search' as const },
          { id: 'themes', label: 'Themes', icon: 'theme' as const },
          { id: 'settings', label: 'Settings', icon: 'settings' as const },
        ],
      },
    ]

    const renderWorkspacePreview = (showHeaderBar: boolean) => {
      const toggleProps = api.getToggleProps()
      return (
        <div className="uf-sidebar-preview">
          {showHeaderBar ? (
            <Bar className="uf-sidebar-preview-bar">
              <Bar.LeftEllipsis>
                <Text as="span" variant="label" fullWidth>
                  {isCollapsed ? 'UF' : 'FaceUI React'}
                </Text>
              </Bar.LeftEllipsis>
              <Bar.Right>
                <Button
                  {...toggleProps}
                  icon={<Icon name={isCollapsed ? 'right' : 'left'} />}
                  iconOnly
                  fullWidth={false}
                  variant="default"
                  className="uf-sidebar-preview-toggle"
                  aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                />
              </Bar.Right>
            </Bar>
          ) : null}

          <div className="uf-sidebar-preview-body">
            {previewSections.map((section) => (
              <section key={section.title} className="uf-sidebar-preview-section">
                {!isCollapsed ? (
                  <Text
                    as="div"
                    variant="label"
                    fullWidth
                    className="uf-sidebar-preview-sectionTitle"
                  >
                    {section.title}
                  </Text>
                ) : null}
                <div className="uf-sidebar-preview-items">
                  {section.items.map((item) => {
                    const isSelected = api.selectedId === item.id
                    return (
                      <Button
                        key={item.id}
                        icon={<Icon name={item.icon} />}
                        iconOnly={isCollapsed}
                        text={isCollapsed ? undefined : item.label}
                        fullWidth
                        align="left"
                        stretchText
                        membrane
                        variant="default"
                        data-selected={isSelected ? '' : undefined}
                        className="uf-sidebar-preview-item"
                        onClick={() => {
                          send({ type: 'SELECT', id: item.id })
                          if (isSheetSurface) setSheetOpen(false)
                        }}
                      />
                    )
                  })}
                </div>
              </section>
            ))}

            {!isCollapsed ? (
              <section className="uf-sidebar-preview-section uf-sidebar-preview-section--tree">
                <Text
                  as="div"
                  variant="label"
                  fullWidth
                  className="uf-sidebar-preview-sectionTitle"
                >
                  Structure
                </Text>
                <Tree
                  className="uf-sidebar-preview-tree"
                  defaultExpandedIds={['workspace']}
                  items={[
                    {
                      id: 'workspace',
                      label: 'Workspace',
                      children: [
                        { id: 'overview-screen', label: 'Overview' },
                        { id: 'components-screen', label: 'Components' },
                        { id: 'tokens-screen', label: 'Tokens' },
                      ],
                    },
                  ]}
                />
              </section>
            ) : null}
          </div>
        </div>
      )
    }

    const renderPanelItems = () => (
      <>
        <div {...api.getHeaderProps()}>
          <button {...api.getToggleProps()} />
        </div>
        <div {...api.getContentProps()}>
          {items.map((item) => (
            <PanelItemRenderer key={item.id} item={item} api={api} collapsed={isCollapsed} />
          ))}
        </div>
        <div {...api.getFooterProps()} />
      </>
    )

    if (isSheetSurface) {
      const triggerNode = trigger ?? (
        <Button
          icon="panel"
          iconOnly
          fullWidth={false}
          variant="ghost"
          aria-label="Open panel"
        />
      )

      return (
        <div className={cn('uf-sidebar-sheetHost', className)}>
          <span
            className="uf-sidebar-sheetTrigger"
            style={{ display: 'inline-flex' }}
            onClick={() => setSheetOpen(true)}
          >
            {triggerNode}
          </span>
          <div
            className="uf-responsive-overlay-backdrop"
            data-state={sheetOpen ? 'open' : 'closed'}
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="uf-responsive-panel uf-sidebar-sheet"
            data-state={sheetOpen ? 'open' : 'closed'}
            data-placement="left"
            style={{ '--uf-sidebar-sheet-w': typeof width === 'number' ? `${width}px` : String(width) } as any}
          >
            <ResponsiveSheetHeader
              title={surfaceTitle ?? 'Panel'}
              onClose={() => setSheetOpen(false)}
            />
            <nav className={cn('uf-sidebar', previewPreset === 'workspace' && 'uf-sidebar--workspace')}>
              {previewPreset === 'workspace' ? renderWorkspacePreview(false) : renderPanelItems()}
            </nav>
          </div>
        </div>
      )
    }

    if (previewPreset === 'workspace') {
      return (
        <nav ref={ref} {...api.getRootProps()} className={cn('uf-sidebar', 'uf-sidebar--workspace', className)}>
          {renderWorkspacePreview(true)}
        </nav>
      )
    }

    return (
      <nav ref={ref} {...api.getRootProps()} className={cn('uf-sidebar', className)}>
        {renderPanelItems()}
      </nav>
    )
  },
)

export const Sidebar = Panel
export type SidebarProps = PanelProps
export type SidebarItem = PanelItem
