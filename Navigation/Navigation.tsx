/**
 * Navigation — horizontal/vertical navigation with hover dropdowns.
 *
 * Flat API: all items rendered from `items` prop.
 * Items with sub-items render as hover-triggered dropdown menus.
 *
 * `<Navigation items={[{ id: 'home', label: 'Home' }, { id: 'products', label: 'Products', items: [...] }]} />`
 */

import { forwardRef, useEffect, useRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useIsCompactViewport,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { navigationMachine, connectNavigation } from '../assets/machines/navigation.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavigationItem {
  id: string
  label: ReactNode
  href?: string
  onClick?: () => void
  items?: NavigationItem[]
  disabled?: boolean
}

export interface NavigationProps {
  /** Navigation item definitions (supports nested dropdowns). */
  items: NavigationItem[]
  /** Currently active item ID. */
  activeId?: string
  /** Uncontrolled initial active item ID. */
  defaultActiveId?: string | null
  /** Callback when active item changes. */
  onActiveChange?: (details: { id: string }) => void
  /** Orientation of the navigation bar. */
  orientation?: 'horizontal' | 'vertical'
  /** Additional class name on the root element. */
  className?: string
  /** Surface behavior on compact viewports. */
  surface?: 'auto' | 'inline' | 'sheet'
  /** Breakpoint where auto surfaces switch to sheet mode. */
  surfaceBreakpoint?: number
  /** Controlled sheet state for compact mode. */
  open?: boolean
  /** Uncontrolled initial sheet state for compact mode. */
  defaultOpen?: boolean
  /** Callback when sheet state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Optional trigger for compact mode. */
  trigger?: ReactNode
  /** Optional title used in compact sheet header. */
  surfaceTitle?: ReactNode
}

// ---------------------------------------------------------------------------
// Sub-item renderer (dropdown content)
// ---------------------------------------------------------------------------

interface DropdownItemRendererProps {
  item: NavigationItem
  api: ReturnType<typeof connectNavigation>
}

function DropdownItemRenderer(props: DropdownItemRendererProps) {
  const { item, api } = props
  const linkProps = api.getLinkProps({ id: item.id, disabled: item.disabled })

  if (item.href) {
    return (
      <a
        {...linkProps}
        href={item.href}
        onClick={(e) => {
          linkProps.onClick()
          if (item.onClick) {
            e.preventDefault()
            item.onClick()
          }
        }}
      >
        {item.label}
      </a>
    )
  }

  return (
    <Button
      {...linkProps}
      fullWidth
      align="left"
      stretchText
      variant={api.activeId === item.id ? 'default' : 'ghost'}
      className="uf-navigation-dropdownItem"
      onClick={() => {
        linkProps.onClick()
        item.onClick?.()
      }}
    >
      {item.label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Navigation = forwardRef<HTMLDivElement, NavigationProps>(
  function Navigation(props, ref) {
    const {
      items: rawItems,
      activeId,
      defaultActiveId = null,
      onActiveChange,
      orientation = 'horizontal',
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
    const isSheetSurface = surface === 'sheet' || (surface === 'auto' && isCompactViewport)
    const itemOrder = items.map((item) => item.id)
    const disabledIds = items.filter((item) => item.disabled).map((item) => item.id)
    const machineActiveId = useControllableMachineProp(
      typeof activeId === 'string' ? activeId : (activeId === null ? null : undefined),
      defaultActiveId,
    )

    const { state, send } = useMachine(navigationMachine, {
      activeId: machineActiveId,
      itemOrder,
      disabledIds,
      orientation,
      onActiveChange: onActiveChange ?? null,
    })

    const api = connectNavigation(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const [sheetOpen, setSheetOpen] = useControllableOpenState(open, defaultOpen, onOpenChange)
    useBodyScrollLock(isSheetSurface && sheetOpen)

    useEffect(() => {
      if (isSheetSurface) return
      const targetId = state.context.focusedId
      if (!targetId) return
      const root = rootRef.current
      if (!root) return
      const triggers = root.querySelectorAll<HTMLElement>('[role="menuitem"][data-value]')
      for (const trigger of triggers) {
        if (trigger.getAttribute('data-value') !== targetId) continue
        if (trigger !== document.activeElement) {
          try { trigger.focus() } catch {}
        }
        break
      }
    }, [state.context.focusedId])

    if (isSheetSurface) {
      const triggerNode = trigger ?? (
        <Button
          icon="panel"
          iconOnly
          fullWidth={false}
          variant="ghost"
          aria-label="Open navigation"
        />
      )

      const renderSheetItem = (item: NavigationItem, nested = false) => {
        const hasItems = Array.isArray(item.items) && item.items.length > 0
        const isActive = api.activeId === item.id

        if (hasItems) {
          return (
            <div key={item.id} className="uf-navigation-sheetGroup">
              <Text as="div" variant="label" className="uf-navigation-sheetGroupTitle">
                {item.label}
              </Text>
              <div className="uf-navigation-sheetGroupItems">
                {item.items!.map((child) => renderSheetItem(child, true))}
              </div>
            </div>
          )
        }

        return (
          <Button
            key={item.id}
            text={typeof item.label === 'string' || typeof item.label === 'number' ? String(item.label) : undefined}
            fullWidth
            align="left"
            stretchText
            membrane
            variant={isActive ? 'default' : 'ghost'}
            className={cn('uf-navigation-sheetItem', nested && 'uf-navigation-sheetItem--nested')}
            onClick={() => {
              send({ type: 'SET_ACTIVE', id: item.id })
              item.onClick?.()
              if (item.href && typeof window !== 'undefined' && !item.onClick) {
                try { window.location.assign(item.href) } catch {}
              }
              setSheetOpen(false)
            }}
          >
            {typeof item.label === 'string' || typeof item.label === 'number' ? undefined : item.label}
          </Button>
        )
      }

      return (
        <div className={cn('uf-navigation-sheetHost', className)}>
          <span
            className="uf-navigation-sheetTrigger"
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
          <div className="uf-responsive-panel uf-navigation-sheet" data-state={sheetOpen ? 'open' : 'closed'}>
            <ResponsiveSheetHeader
              title={surfaceTitle ?? 'Navigation'}
              onClose={() => setSheetOpen(false)}
            />
            <div className="uf-navigation-sheetList">
              {items.map((item) => renderSheetItem(item))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={(node) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node
        }}
        {...api.getRootProps()}
        className={cn('uf-navigation', className)}
      >
        <div {...api.getListProps()}>
          {items.map((item) => {
            const hasItems = Array.isArray(item.items) && item.items.length > 0

            return (
              <div
                key={item.id}
                {...api.getItemProps({ id: item.id, hasItems, disabled: item.disabled })}
              >
                {hasItems ? (
                  <>
                    <Button
                      {...api.getTriggerProps({ id: item.id, hasItems, disabled: item.disabled })}
                      fullWidth={false}
                      variant={api.openItemId === item.id ? 'default' : 'ghost'}
                      className="uf-navigation-trigger"
                    >
                      {item.label}
                    </Button>
                    <div {...api.getContentProps({ id: item.id, hasItems, disabled: item.disabled })}>
                      {item.items!.map((child) => (
                        <DropdownItemRenderer key={child.id} item={child} api={api} />
                      ))}
                    </div>
                  </>
                ) : item.href ? (
                  <a
                    {...api.getTriggerProps({ id: item.id, hasItems: false, disabled: item.disabled })}
                    href={item.href}
                    onClick={(e) => {
                      if (item.onClick) {
                        e.preventDefault()
                        item.onClick()
                      }
                      send({ type: 'SET_ACTIVE', id: item.id })
                    }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Button
                    {...api.getTriggerProps({ id: item.id, hasItems: false, disabled: item.disabled })}
                    fullWidth={false}
                    variant={api.activeId === item.id ? 'default' : 'ghost'}
                    className="uf-navigation-trigger"
                    onClick={() => {
                      send({ type: 'SET_ACTIVE', id: item.id })
                      item.onClick?.()
                    }}
                  >
                    {item.label}
                  </Button>
                )}
              </div>
            )
          })}
          <div {...api.getIndicatorProps()} />
        </div>
      </div>
    )
  },
)
