/**
 * Command — command palette / search component.
 *
 * Flat API: all items rendered from `items` prop.
 * Supports text filtering, grouped items, and keyboard navigation.
 *
 * `<Command items={[{ id: 'copy', label: 'Copy', keywords: ['clipboard'] }]} />`
 */

import {
  forwardRef,
  useId,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useLayer } from '../assets/adapters/react/use-layer'
import {
  commandMachine,
  connectCommand,
} from '../assets/machines/command.machine'
import type {
  CommandItemDef,
  CommandGroupDef,
} from '../assets/machines/command.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandItem {
  id: string
  label: ReactNode
  keywords?: string[]
  group?: string
  disabled?: boolean
  onSelect?: () => void
}

export interface CommandGroup {
  id: string
  label: string
}

export interface CommandProps {
  /** Command item definitions. */
  items?: CommandItem[]
  /** Group definitions for organizing items. */
  groups?: CommandGroup[]
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Search input value (controlled). */
  value?: string
  /** Uncontrolled initial search input value. */
  defaultValue?: string
  /** Callback when search value changes. */
  onValueChange?: (details: { value: string }) => void
  /** Callback when an item is selected. */
  onSelect?: (details: { item: CommandItemDef }) => void
  /** Shell presentation mode. Auto switches to dialog on compact viewports. */
  surface?: 'auto' | 'inline' | 'dialog'
  /** Breakpoint where auto surfaces switch from inline to dialog. */
  surfaceBreakpoint?: number
  /** Controlled dialog open state (used in dialog surface). */
  open?: boolean
  /** Uncontrolled initial dialog open state (used in dialog surface). */
  defaultOpen?: boolean
  /** Callback when dialog open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Content to display when no results match. */
  emptyContent?: ReactNode
  /** Additional class name on the root element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert ReactNode labels to strings for machine-level filtering. */
function toMachineItems(items: CommandItem[]): CommandItemDef[] {
  return items.map((item) => ({
    id: item.id,
    label:
      typeof item.label === 'string' ? item.label : String(item.label ?? ''),
    keywords: item.keywords,
    group: item.group,
    disabled: item.disabled,
    onSelect: item.onSelect,
  }))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Command = forwardRef<HTMLDivElement, CommandProps>(
  function Command(props, ref) {
    const {
      items: rawItems,
      groups = [],
      placeholder = 'Search...',
      value,
      defaultValue = '',
      onValueChange,
      onSelect,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      open,
      defaultOpen = false,
      onOpenChange,
      emptyContent = 'No results found.',
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []

    // Memoize machine items by serialized ids to avoid infinite re-render loop
    const itemsKey = items.map((i) => i.id).join(',')
    const machineItems = useMemo(() => toMachineItems(items), [itemsKey])
    const machineQuery = useControllableMachineProp(
      typeof value === 'string' ? value : undefined,
      defaultValue,
    )
    const responsiveOverlaySurface = useResponsiveOverlaySurface(
      surface === 'dialog'
        ? 'sheet'
        : surface === 'inline'
          ? 'popover'
          : 'auto',
      surfaceBreakpoint,
    )
    const resolvedSurface =
      responsiveOverlaySurface === 'sheet' ? 'dialog' : 'inline'
    const isDialogSurface = resolvedSurface === 'dialog'
    const [dialogOpen, setDialogOpen] = useControllableOpenState(
      open,
      defaultOpen,
      onOpenChange,
    )
    const inputRef = useRef<HTMLInputElement | null>(null)
    const paletteRef = useRef<HTMLDivElement | null>(null)
    const setPaletteRef = useCallback(
      (node: HTMLDivElement | null) => {
        paletteRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
      },
      [ref],
    )

    const { state, send } = useMachine(commandMachine, {
      items: machineItems,
      groups: groups as CommandGroupDef[],
      query: machineQuery,
      onValueChange: onValueChange ?? null,
      onSelect: (details: { item: CommandItemDef }) => {
        onSelect?.(details)
        if (isDialogSurface) {
          setDialogOpen(false)
        }
      },
    })
    useBodyScrollLock(isDialogSurface && dialogOpen)
    useLayer({
      enabled: isDialogSurface && dialogOpen,
      contentRef: paletteRef,
      modal: true,
      autoFocus: true,
      restoreFocus: true,
      onEscape: () => setDialogOpen(false),
      onOutside: () => setDialogOpen(false),
    })

    // Sync items when they change (stable dependency via itemsKey)
    useEffect(() => {
      send({ type: 'SET_ITEMS', items: machineItems } as CommandItemDef & {
        type: 'SET_ITEMS'
        items: CommandItemDef[]
      })
    }, [machineItems, send])

    const instanceId = useId()
    const api = connectCommand(state, send, instanceId)

    // Build a lookup from machine item id -> original ReactNode label
    const labelMap = new Map<string, ReactNode>()
    for (const item of items) {
      labelMap.set(item.id, item.label)
    }

    // Track running global index for proper highlighting
    let globalIndex = 0

    const groupedItems = api.getGroupedItems()
    const inputNode = (
      <input
        {...api.getInputProps()}
        ref={inputRef}
        placeholder={placeholder}
        aria-label={placeholder || 'Search commands'}
      />
    )
    const showPalette = !isDialogSurface || dialogOpen
    const triggerLabel = api.query || placeholder
    const commandBody = (
      <Card
        ref={showPalette ? setPaletteRef : null}
        {...api.getRootProps()}
        padding={isDialogSurface ? 'none' : 'membrane'}
        radius="md"
        fullWidth
        className={cn('uf-command', className)}
        data-surface={resolvedSurface}
        role={isDialogSurface ? 'dialog' : undefined}
        aria-modal={isDialogSurface || undefined}
        aria-label={isDialogSurface ? placeholder || 'Commands' : undefined}
        tabIndex={isDialogSurface ? -1 : undefined}
      >
        <Membrane
          fullWidth
          as="div"
          className="uf-command__inputMembrane"
          interactive
          target={'input'}
        >
          {inputNode}
        </Membrane>

        <div {...api.getListProps()}>
          {api.isEmpty && (
            <div {...api.getEmptyProps()}>
              {typeof emptyContent === 'string' ||
              typeof emptyContent === 'number' ? (
                <Text as="span" inset="none" membrane={false}>
                  {emptyContent}
                </Text>
              ) : (
                emptyContent
              )}
            </div>
          )}

          {groupedItems.map((section) => {
            if (section.group) {
              return (
                <div
                  key={section.group.id}
                  {...api.getGroupProps({ id: section.group.id })}
                >
                  <div {...api.getGroupLabelProps({ id: section.group.id })}>
                    <Text
                      as="span"
                      size="xs"
                      inset="none"
                      membrane={false}
                      text={section.group.label}
                    />
                  </div>
                  {section.items.map((item) => {
                    const currentIndex = globalIndex++
                    const itemProps = api.getItemProps({
                      id: item.id,
                      index: currentIndex,
                      disabled: item.disabled,
                    })
                    return (
                      <Membrane
                        fullWidth
                        key={`${item.id}:membrane`}
                        className="uf-command-itemMembrane"
                        onPointerEnter={() => {
                          ;(
                            itemProps as { onPointerEnter?: () => void }
                          ).onPointerEnter?.()
                        }}
                        onMouseEnter={() => {
                          ;(
                            itemProps as { onMouseEnter?: () => void }
                          ).onMouseEnter?.()
                        }}
                        onMouseOver={() => {
                          ;(
                            itemProps as { onMouseOver?: () => void }
                          ).onMouseOver?.()
                        }}
                        interactive
                      >
                        <Button
                          {...itemProps}
                          membrane={false}
                          fullWidth
                          align="left"
                          stretchText
                          className={cn(
                            'uf-command-item',
                            'uf-option',
                            'uf-control',
                            (itemProps as { className?: string }).className,
                          )}
                        >
                          {labelMap.get(item.id) ?? item.label}
                        </Button>
                      </Membrane>
                    )
                  })}
                </div>
              )
            }

            return section.items.map((item) => {
              const currentIndex = globalIndex++
              const itemProps = api.getItemProps({
                id: item.id,
                index: currentIndex,
                disabled: item.disabled,
              })
              return (
                <Membrane
                  fullWidth
                  key={`${item.id}:membrane`}
                  className="uf-command-itemMembrane"
                  onPointerEnter={() => {
                    ;(
                      itemProps as { onPointerEnter?: () => void }
                    ).onPointerEnter?.()
                  }}
                  onMouseEnter={() => {
                    ;(
                      itemProps as { onMouseEnter?: () => void }
                    ).onMouseEnter?.()
                  }}
                  onMouseOver={() => {
                    ;(itemProps as { onMouseOver?: () => void }).onMouseOver?.()
                  }}
                  interactive
                >
                  <Button
                    {...itemProps}
                    membrane={false}
                    fullWidth
                    align="left"
                    stretchText
                    className={cn(
                      'uf-command-item',
                      'uf-option',
                      'uf-control',
                      (itemProps as { className?: string }).className,
                    )}
                  >
                    {labelMap.get(item.id) ?? item.label}
                  </Button>
                </Membrane>
              )
            })
          })}
        </div>
      </Card>
    )

    if (!isDialogSurface) {
      return commandBody
    }

    return (
      <div
        className="uf-commandSurface"
        data-surface={resolvedSurface}
        data-state={dialogOpen ? 'open' : 'closed'}
      >
        <Membrane fullWidth className="uf-command__triggerMembrane" interactive>
          <button
            type="button"
            className="uf-command__trigger"
            aria-haspopup="dialog"
            aria-expanded={dialogOpen}
            onClick={() => setDialogOpen(true)}
          >
            <span className="uf-command__triggerIcon" aria-hidden="true">
              <Icon name="search" />
            </span>
            <Text
              as="span"
              membrane={false}
              inset="none"
              className={cn(
                'uf-command__triggerLabel',
                !api.query && 'uf-command__triggerLabel--placeholder',
              )}
            >
              {triggerLabel}
            </Text>
          </button>
        </Membrane>

        <div
          className="uf-responsive-overlay-backdrop"
          data-state={dialogOpen ? 'open' : 'closed'}
          onClick={() => setDialogOpen(false)}
        />

        <div
          className="uf-command__dialog"
          data-state={dialogOpen ? 'open' : 'closed'}
        >
          {showPalette ? commandBody : null}
        </div>
      </div>
    )
  },
)
