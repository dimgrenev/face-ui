import { cloneElement, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { getTriggerChild } from '../adapters/react/Trigger'
import { useControllableState } from '../adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../adapters/react/use-isomorphic-layout-effect'
import { useIsCompactViewport } from '../adapters/react/use-responsive-overlay-surface'
import { readDirection, type Direction } from '../runtime/keyboard'
import { hasSlotContent } from '../slot-content'
import { Button } from '../../Button/Button'
import { Modal } from '../../Modal/Modal'

export interface NavSurfaceProps {
  surface: 'auto' | 'inline' | 'sheet'
  open: boolean | undefined
  defaultOpen: boolean
  onOpenChange: ((details: { open: boolean }) => void) | undefined
}

/**
 * The surface of Navigation and Panel and the open state of their sheet: `auto` is a sheet below
 * 900px, and leaving the sheet surface closes an uncontrolled sheet quietly.
 */
export function useNavSurface(component: string, props: NavSurfaceProps) {
  const compact = useIsCompactViewport()
  const isSheet = props.surface === 'sheet' || (props.surface === 'auto' && compact)
  const [open, setOpen, replaceOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen,
    onChange: (next) => props.onOpenChange?.({ open: next }),
    name: [component, 'open'],
  })
  const wasSheet = useRef(isSheet)
  useIsomorphicLayoutEffect(() => {
    if (wasSheet.current && !isSheet) replaceOpen(false)
    wasSheet.current = isSheet
  }, [isSheet, replaceOpen])
  return { isSheet, open, setOpen } as const
}

export interface NavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The consumer's trigger: an element keeps its own props, text renders as a Button. */
  trigger: ReactNode
  /** Icon of the default trigger, which `openLabel` names. */
  icon: string
  openLabel: string
  closeLabel: string
  /** The navigation's `aria-label`: the sheet's visible title and name. */
  title: string | undefined
  /** The navigation's `aria-labelledby`, naming an untitled sheet. */
  labelledBy: string | undefined
  placement: 'start' | 'bottom'
  /** The navigation's root: the portaled sheet takes its direction on open. */
  root: RefObject<HTMLElement | null>
  className: string
  children: ReactNode
}

/**
 * The compact surface of Navigation and Panel: a trigger that opens their items
 * in a modal sheet. An untitled sheet is named by its trigger.
 */
export function NavSheet(props: NavSheetProps) {
  const { trigger, openLabel, title, labelledBy, open, root } = props
  const [dir, setDir] = useState<Direction | undefined>(undefined)
  useIsomorphicLayoutEffect(() => {
    if (open) setDir(readDirection(root.current))
  }, [open, root])
  const generated = `${useId()}trigger`
  const child = getTriggerChild(trigger)
  const childId = child?.props.id
  const triggerId = typeof childId === 'string' ? childId : generated
  const custom = hasSlotContent(trigger)
  const node = child ? (
    childId === triggerId ? child : cloneElement(child, { id: triggerId })
  ) : (
    <Button
      id={triggerId}
      icon={custom ? undefined : props.icon}
      iconOnly={!custom}
      aria-label={custom ? undefined : openLabel}
      variant="ghost"
      fullWidth={false}
      className="uf-nav-sheetTrigger"
    >
      {custom ? trigger : undefined}
    </Button>
  )
  return (
    <Modal
      trigger={node}
      open={open}
      onOpenChange={({ open }) => props.onOpenChange(open)}
      title={title}
      aria-labelledby={title ? undefined : (labelledBy ?? triggerId)}
      labels={{ close: props.closeLabel }}
      placement={props.placement}
      edge={props.placement === 'start' ? 'flush' : 'inset'}
      scrollLock
      className={props.className}
      dir={dir}
    >
      {props.children}
    </Modal>
  )
}
