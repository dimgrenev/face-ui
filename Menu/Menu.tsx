/**
 * Menu — contextual action list.
 *
 * Unifies: ContextMenu + DropdownMenu into a single component.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { menuMachine, connectMenu } from '../assets/machines/menu.machine'
import type { MenuSchema } from '../assets/machines/menu.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Separator } from '../Separator/Separator'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuItemDef {
  value: string
  label: ReactNode
  /** Explicit searchable text for custom React labels used by typeahead. */
  textValue?: string
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

const EMPTY_MENU_ITEMS: MenuItemEntry[] = []

function getMenuLabelText(label: ReactNode): string {
  if (label == null || typeof label === 'boolean') return ''
  if (typeof label === 'string' || typeof label === 'number') return String(label)
  if (Array.isArray(label)) return label.map(getMenuLabelText).filter(Boolean).join(' ')
  if (isValidElement<{ children?: ReactNode }>(label)) return getMenuLabelText(label.props.children)
  return ''
}

function collectMenuMachineMetadata(entries: MenuItemEntry[]): {
  itemOrder: string[]
  disabledValues: string[]
  itemLabels: Record<string, string>
} {
  const itemOrder: string[] = []
  const disabledValues: string[] = []
  const itemLabels: Record<string, string> = {}

  const addItem = (item: MenuItemDef) => {
    itemOrder.push(item.value)
    if (item.disabled) disabledValues.push(item.value)
    itemLabels[item.value] = typeof item.textValue === 'string'
      ? item.textValue
      : getMenuLabelText(item.label)
  }

  for (const entry of entries) {
    if (isSeparator(entry)) continue
    if (isGroup(entry)) {
      for (const subItem of entry.items) {
        if (!isSeparator(subItem)) addItem(subItem)
      }
      continue
    }
    addItem(entry)
  }

  return { itemOrder, disabledValues, itemLabels }
}

type TriggerEvent = SyntheticEvent<HTMLElement> & {
  key?: string
  preventDefault: () => void
}

type TriggerElementProps = {
  [key: string]: unknown
  className?: string
  style?: CSSProperties
  disabled?: boolean
  onClick?: (event: TriggerEvent) => void
  onContextMenu?: (event: TriggerEvent) => void
  onKeyDown?: (event: TriggerEvent) => void
}

function composeTriggerHandler(
  childHandler: ((event: TriggerEvent) => void) | undefined,
  menuHandler: ((event: TriggerEvent) => void) | undefined,
) {
  if (!childHandler) return menuHandler
  if (!menuHandler) return childHandler

  return (event: TriggerEvent) => {
    childHandler(event)
    if (event.isPropagationStopped()) return
    menuHandler(event)
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  function Menu(props, ref) {
    const {
      trigger = 'click',
      items: rawItems = EMPTY_MENU_ITEMS,
      children,
      onSelect,
      disabled = false,
      onOpenChange,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      surfaceTitle,
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : EMPTY_MENU_ITEMS
    const menuMachineMetadata = useMemo(() => collectMenuMachineMetadata(items), [items])

    const { state, send } = useMachine<MenuSchema>(menuMachine, {
      trigger,
      disabled,
      itemOrder: menuMachineMetadata.itemOrder,
      disabledValues: menuMachineMetadata.disabledValues,
      itemLabels: menuMachineMetadata.itemLabels,
      onSelect: onSelect ?? null,
      onOpenChange: onOpenChange ?? null,
    })

    const api = connectMenu(state, send)
    const isOpen = state.matches('open')
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint)
    const contentId = useId()
    const triggerElRef = useRef<HTMLElement | null>(null)
    const contentElRef = useRef<HTMLDivElement | null>(null)
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && resolvedSurface === 'popover',
      triggerRef: triggerElRef,
      contentRef: contentElRef,
      side: 'bottom',
      align: 'end',
      sideOffset: 4,
    })
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')
    const sheetTitle = surfaceTitle ?? (
      typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : 'Options'
    )

    const rawTriggerProps = api.getTriggerProps() as TriggerElementProps
    const {
      ['data-scope']: triggerScope,
      ['data-part']: triggerPart,
      ...interactiveTriggerBaseProps
    } = rawTriggerProps
    const triggerProps = {
      ...interactiveTriggerBaseProps,
      'aria-controls': contentId,
    } as TriggerElementProps
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
        contentElRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el
        send({ type: 'SET_CONTENT', el } as MenuSchema['event'])
      },
      [ref, send],
    )

    const handleTriggerRef = useCallback(
      (el: HTMLElement | null) => {
        triggerElRef.current = el
        send({ type: 'SET_TRIGGER', el } as MenuSchema['event'])
      },
      [send],
    )

    useEffect(() => {
      if (!isOpen || !state.context.highlightedValue || !state.context.highlightedByKeyboard) return
      const contentEl = contentElRef.current
      if (!contentEl || typeof document === 'undefined') return

      const highlightedItem = Array.from(contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]'))
        .find((node) => node.dataset.value === state.context.highlightedValue)
      if (highlightedItem && document.activeElement !== highlightedItem) {
        highlightedItem.focus()
      }
    }, [isOpen, state.context.highlightedByKeyboard, state.context.highlightedValue])

    const renderTrigger = () => {
      if (isValidElement<TriggerElementProps>(triggerNode)) {
        const child = Children.only(triggerNode) as ReactElement<TriggerElementProps>
        const childProps = child.props
        return cloneElement(child, {
          ...triggerProps,
          disabled: childProps.disabled || triggerProps.disabled ? true : undefined,
          onClick: composeTriggerHandler(childProps.onClick, triggerProps.onClick),
          onContextMenu: composeTriggerHandler(childProps.onContextMenu, triggerProps.onContextMenu),
          onKeyDown: composeTriggerHandler(childProps.onKeyDown, triggerProps.onKeyDown),
        })
      }

      return (
        <Button
          {...triggerProps}
          fullWidth={false}
          disabled={Boolean(triggerProps.disabled)}
        >
          {triggerNode}
        </Button>
      )
    }

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
                <Text as="span" size="xs" inset="none" membrane={false} text={entry.label} />
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

    const contentElement = (
      <div
        ref={handleContentRef}
        {...contentProps}
        id={contentId}
        data-surface={resolvedSurface}
        data-trigger={trigger}
        className={cn('uf-menu-content', className)}
        style={resolvedSurface === 'popover' ? floatingStyle : undefined}
      >
        {resolvedSurface === 'sheet' ? (
          <ResponsiveSheetHeader
            title={sheetTitle}
            onClose={() => send({ type: 'DISMISS' })}
          />
        ) : null}
        {renderEntries(items)}
      </div>
    )

    const renderedContent = useMemo(() => {
      if (resolvedSurface === 'sheet' || typeof document === 'undefined') return contentElement
      return createPortal(contentElement, document.body)
    }, [contentElement, resolvedSurface])

    return (
      <div className="uf-menu" data-surface={resolvedSurface} data-trigger={trigger}>
        <span
          ref={handleTriggerRef}
          data-scope={triggerScope as string | undefined}
          data-part={triggerPart as string | undefined}
          data-state={triggerProps['data-state'] as string | undefined}
          className={cn('uf-menu-trigger')}
          style={{ display: 'inline-flex' }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return
            triggerProps.onClick?.(event as unknown as TriggerEvent)
          }}
          onContextMenu={(event) => {
            if (event.target !== event.currentTarget) return
            triggerProps.onContextMenu?.(event as unknown as TriggerEvent)
          }}
        >
          {renderTrigger()}
        </span>

        {resolvedSurface === 'sheet' ? (
          <div
            className="uf-responsive-overlay-backdrop"
            data-state={isOpen ? 'open' : 'closed'}
            onClick={() => send({ type: 'DISMISS' })}
          />
        ) : null}

        {renderedContent}
      </div>
    )
  },
)
