/**
 * Menu — contextual action list.
 *
 * Unifies: ContextMenu + DropdownMenu into a single component.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */

import { forwardRef, useCallback, type MutableRefObject, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { menuMachine, connectMenu } from '../assets/machines/menu.machine'
import type { MenuSchema } from '../assets/machines/menu.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Separator } from '../Separator/Separator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuItemDef {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface MenuSeparatorDef {
  type: 'separator'
}

export interface MenuGroupDef {
  type: 'group'
  label: string
  items: (MenuItemDef | MenuSeparatorDef)[]
}

export type MenuItemEntry = MenuItemDef | MenuSeparatorDef | MenuGroupDef

export interface MenuProps {
  /** How the menu is triggered. */
  trigger?: 'click' | 'context'
  /** Menu item definitions. */
  items?: MenuItemEntry[]
  /** Trigger element (the anchor). */
  children?: ReactNode
  /** Called when a menu item is selected. */
  onSelect?: (details: { value: string }) => void
  /** Disable the entire menu. */
  disabled?: boolean
  /** Called when the open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Preferred content surface. Auto switches to bottom sheet on compact viewports. */
  surface?: ResponsiveOverlaySurface
  /** Breakpoint where auto surfaces switch from popover to sheet. */
  surfaceBreakpoint?: number
  /** Optional title used for the mobile sheet header. */
  surfaceTitle?: ReactNode
  /** Additional class name for the content element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSeparator(item: MenuItemEntry): item is MenuSeparatorDef {
  return 'type' in item && item.type === 'separator'
}

function isGroup(item: MenuItemEntry): item is MenuGroupDef {
  return 'type' in item && item.type === 'group'
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  function Menu(props, ref) {
    const {
      trigger = 'click',
      items: rawItems = [],
      children,
      onSelect,
      disabled = false,
      onOpenChange,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      surfaceTitle,
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []

    const { state, send } = useMachine<MenuSchema>(menuMachine, {
      trigger,
      disabled,
      onSelect: onSelect ?? null,
      onOpenChange: onOpenChange ?? null,
    })

    const api = connectMenu(state, send)
    const isOpen = state.matches('open')
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint)
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')
    const sheetTitle = surfaceTitle ?? (
      typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : 'Options'
    )

    const triggerProps = api.getTriggerProps()
    const contentProps = api.getContentProps()
    const triggerNode = (() => {
      if (children == null) return <Button text="Options" fullWidth={false} />
      if (typeof children === 'string' || typeof children === 'number') {
        return <Button text={String(children)} fullWidth={false} />
      }
      return children
    })()

    const handleContentRef = useCallback(
      (el: HTMLDivElement | null) => {
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el
        send({ type: 'SET_CONTENT', el } as MenuSchema['event'])
      },
      [ref, send],
    )

    const handleTriggerRef = useCallback(
      (el: HTMLElement | null) => {
        send({ type: 'SET_TRIGGER', el } as MenuSchema['event'])
      },
      [send],
    )

    // Render a flat or grouped item
    const renderItem = (item: MenuItemDef, key: string) => {
      const itemProps = api.getItemProps({ value: item.value, disabled: item.disabled })
      return (
        <Button
          key={`${key}:button`}
          {...itemProps}
          fullWidth
          align="left"
          stretchText
          className={cn('uf-menu-item', 'uf-option', 'uf-control', (itemProps as { className?: string }).className)}
        >
          {item.label}
        </Button>
      )
    }

    const renderSeparator = (key: string) => (
      <Separator key={`${key}:separator`} {...api.getSeparatorProps()} className={cn('uf-menu-separator')} />
    )

    const renderEntries = (entries: MenuItemEntry[]) =>
      entries.map((entry, i) => {
        if (isSeparator(entry)) {
          return renderSeparator(`sep-${i}`)
        }

        if (isGroup(entry)) {
          return (
            <div key={`group-${i}`} {...api.getGroupProps()} className={cn('uf-menu-group')}>
              <div {...api.getGroupLabelProps()} className={cn('uf-menu-group-label')}>
                {entry.label}
              </div>
              {entry.items.map((subItem, j) =>
                isSeparator(subItem)
                  ? renderSeparator(`group-${i}-sep-${j}`)
                  : renderItem(subItem as MenuItemDef, `group-${i}-item-${j}`),
              )}
            </div>
          )
        }

        return renderItem(entry, `item-${i}`)
      })

    return (
      <div className="uf-menu" data-surface={resolvedSurface} data-trigger={trigger}>
        <span
          {...triggerProps}
          ref={handleTriggerRef}
          className={cn('uf-menu-trigger')}
          style={{ display: 'inline-flex' }}
        >
          {triggerNode}
        </span>

        {resolvedSurface === 'sheet' ? (
          <div
            className="uf-responsive-overlay-backdrop"
            data-state={isOpen ? 'open' : 'closed'}
            onClick={() => send({ type: 'DISMISS' })}
          />
        ) : null}

        <div
          ref={handleContentRef}
          {...contentProps}
          data-surface={resolvedSurface}
          data-trigger={trigger}
          className={cn('uf-menu-content', className)}
        >
          {resolvedSurface === 'sheet' ? (
            <ResponsiveSheetHeader
              title={sheetTitle}
              onClose={() => send({ type: 'DISMISS' })}
            />
          ) : null}
          {renderEntries(items)}
        </div>
      </div>
    )
  },
)
