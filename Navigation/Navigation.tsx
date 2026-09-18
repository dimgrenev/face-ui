/**
 * Navigation — horizontal/vertical navigation with hover dropdowns.
 *
 * Flat API: all items rendered from `items` prop.
 * Top-level groups open dropdowns; nested groups preserve their hierarchy inside the menu.
 *
 * `<Navigation items={[{ id: 'home', label: 'Home' }, { id: 'products', label: 'Products', items: [...] }]} />`
 */

import { forwardRef, useEffect, useRef, useId, type ReactNode } from 'react'
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
  navigationMachine,
  connectNavigation,
} from '../assets/machines/navigation.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'
import type { NavItemBase } from '../assets/nav-item'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavigationItem extends NavItemBase {
  href?: string
  onClick?: () => void
  items?: NavigationItem[]
}

export interface NavigationProps {
  /** Navigation item definitions (supports nested dropdowns). */
  items?: NavigationItem[]
  /** Currently active item ID. */
  activeId?: string | null
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
  if (item.items?.length)
    return (
      <div
        role="group"
        aria-label={typeof item.label === 'string' ? item.label : undefined}
        className="uf-navigation-nestedGroup"
      >
        <Text as="div" variant="muted" membrane={false}>
          {item.label}
        </Text>
        {item.items.map((child) => (
          <DropdownItemRenderer
            key={child.id}
            item={item.disabled ? { ...child, disabled: true } : child}
            api={api}
          />
        ))}
      </div>
    )
  const linkProps = api.getLinkProps({ id: item.id, disabled: item.disabled })

  if (item.href) {
    return (
      <a
        {...linkProps}
        href={item.disabled ? undefined : item.href}
        onClick={(e) => {
          if (item.disabled) {
            e.preventDefault()
            return
          }
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
      align="start"
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
    const isSheetSurface =
      surface === 'sheet' || (surface === 'auto' && isCompactViewport)
    const itemOrder = items.map((item) => item.id)
    const disabledIds = items
      .filter((item) => item.disabled)
      .map((item) => item.id)
    const machineActiveId = useControllableMachineProp(
      typeof activeId === 'string'
        ? activeId
        : activeId === null
          ? null
          : undefined,
      defaultActiveId,
    )

    const { state, send } = useMachine(navigationMachine, {
      activeId: machineActiveId,
      itemOrder,
      disabledIds,
      orientation,
      onActiveChange: onActiveChange ?? null,
    })

    const navigationId = useId()
    const api = connectNavigation(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)
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

    const pendingMenuFocus = useRef<'first' | 'last' | null>(null)
    useLayer({
      enabled: !isSheetSurface && api.isOpen,
      contentRef: rootRef,
      onOutside: () => send({ type: 'CLOSE' }),
      onEscape: () => {
        const button = rootRef.current?.querySelector<HTMLElement>(
          '[aria-expanded="true"]',
        )
        send({ type: 'CLOSE' })
        button?.focus()
      },
    })
    useEffect(() => {
      if (!api.openItemId || !pendingMenuFocus.current) return
      const stops = rootRef.current?.querySelectorAll<HTMLElement>(
        '[role="menu"]:not([hidden]) [role="menuitem"]:not([aria-disabled="true"])',
      )
      const target =
        pendingMenuFocus.current === 'last'
          ? stops?.[stops.length - 1]
          : stops?.[0]
      pendingMenuFocus.current = null
      target?.focus()
    }, [api.openItemId])

    useEffect(() => {
      if (isSheetSurface) return
      const targetId = state.context.focusedId
      if (!targetId) return
      const root = rootRef.current
      if (!root) return
      const triggers = root.querySelectorAll<HTMLElement>(
        '[role="menuitem"][data-value]',
      )
      for (const trigger of triggers) {
        if (trigger.getAttribute('data-value') !== targetId) continue
        if (trigger !== document.activeElement) {
          try {
            trigger.focus()
          } catch {}
        }
        break
      }
    }, [state.context.focusedId])

    if (isSheetSurface) {
      const triggerNode = trigger ?? (
        <Button
          icon="layout-sidebar-left"
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
              <Text as="div" className="uf-navigation-sheetGroupTitle">
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
            disabled={item.disabled}
            fullWidth
            align="start"
            stretchText
            membrane
            variant={isActive ? 'default' : 'ghost'}
            className={cn(
              'uf-navigation-sheetItem',
              nested && 'uf-navigation-sheetItem--nested',
            )}
            onClick={() => {
              send({ type: 'SET_ACTIVE', id: item.id })
              item.onClick?.()
              if (item.href && typeof window !== 'undefined' && !item.onClick) {
                try {
                  window.location.assign(item.href)
                } catch {}
              }
              setSheetOpen(false)
            }}
          >
            {item.label}
          </Button>
        )
      }

      return (
        <div className={cn('uf-navigation-sheetHost', className)}>
          <Trigger
            ref={sheetTriggerRef}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-controls={sheetId}
            className="uf-navigation-sheetTrigger"
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
                    padding="default"
                    radius="md"
                    className="uf-responsive-panel uf-navigation-sheet"
                    data-state={sheetOpen ? 'open' : 'closed'}
                  >
                    <ResponsiveSheetHeader
                      title={
                        <span id={sheetTitleId}>
                          {surfaceTitle ?? 'Navigation'}
                        </span>
                      }
                      onClose={() => setSheetOpen(false)}
                    />
                    <div className="uf-navigation-sheetList">
                      {items.map((item) => renderSheetItem(item))}
                    </div>
                  </Card>
                </>,
                portalTarget,
              )
            : null}
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
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            send({ type: 'CLOSE' })
        }}
        onKeyDownCapture={(event) => {
          const target = event.target as HTMLElement
          const menu = target.closest('[role="menu"]')
          if (!menu) {
            if (
              target.closest('[aria-haspopup="menu"]') &&
              ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)
            ) {
              pendingMenuFocus.current =
                event.key === 'ArrowUp' ? 'last' : 'first'
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                send({ type: 'OPEN_ITEM', id: target.dataset.value! })
              }
            }
            return
          }
          const stops = Array.from(
            menu.querySelectorAll<HTMLElement>(
              '[role="menuitem"]:not([aria-disabled="true"])',
            ),
          )
          const current = stops.indexOf(target)
          const direction =
            event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
          if (direction || event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            event.stopPropagation()
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? stops.length - 1
                  : (current + direction + stops.length) % stops.length
            stops[next]?.focus()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            const trigger = rootRef.current?.querySelector<HTMLElement>(
              '[aria-expanded="true"]',
            )
            send({ type: 'CLOSE' })
            trigger?.focus()
          }
        }}
        className={cn('uf-navigation', className)}
      >
        <div {...api.getListProps()}>
          {items.map((item) => {
            const hasItems = Array.isArray(item.items) && item.items.length > 0

            return (
              <div
                key={item.id}
                {...api.getItemProps({
                  id: item.id,
                  hasItems,
                  disabled: item.disabled,
                })}
              >
                {hasItems ? (
                  <>
                    <Button
                      {...{
                        ...api.getTriggerProps({
                          id: item.id,
                          hasItems,
                          disabled: item.disabled,
                        }),
                        id: `${navigationId}-trigger-${item.id}`,
                        'aria-controls': `${navigationId}-content-${item.id}`,
                      }}
                      fullWidth={false}
                      variant={api.openItemId === item.id ? 'default' : 'ghost'}
                      className="uf-navigation-trigger"
                    >
                      {item.label}
                    </Button>
                    <Card
                      {...api.getContentProps({
                        id: item.id,
                        hasItems,
                        disabled: item.disabled,
                      })}
                      id={`${navigationId}-content-${item.id}`}
                      aria-labelledby={`${navigationId}-trigger-${item.id}`}
                      padding="membrane"
                      radius="md"
                      fullWidth={false}
                    >
                      {item.items!.map((child) => (
                        <DropdownItemRenderer
                          key={child.id}
                          item={child}
                          api={api}
                        />
                      ))}
                    </Card>
                  </>
                ) : item.href ? (
                  <a
                    {...api.getTriggerProps({
                      id: item.id,
                      hasItems: false,
                      disabled: item.disabled,
                    })}
                    href={item.disabled ? undefined : item.href}
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault()
                        return
                      }
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
                    {...api.getTriggerProps({
                      id: item.id,
                      hasItems: false,
                      disabled: item.disabled,
                    })}
                    fullWidth={false}
                    variant={api.activeId === item.id ? 'default' : 'ghost'}
                    className="uf-navigation-trigger"
                    onClick={() => {
                      if (item.disabled) return
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
