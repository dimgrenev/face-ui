/** What Navigation and Panel share: item rules, the surface choice and the sheet. */
import { useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { getTriggerChild } from '../adapters/react/Trigger'
import { useControllableState } from '../adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../adapters/react/use-isomorphic-layout-effect'
import { useIsCompactViewport } from '../adapters/react/use-responsive-overlay-surface'
import type { Collection } from '../runtime/collection'
import { readDirection, type Direction } from '../runtime/keyboard'
import { hasSlotContent } from '../slot-content'
import { Button } from '../../Button/Button'
import { Modal } from '../../Modal/Modal'

/** The K9 kind of an item: a `{ type: 'group' }`, a `{ type: 'separator' }`, or a plain item. */
export const kindOf = (item: unknown) => {
  const { type } = item as { type?: unknown }
  return type === 'group' || type === 'separator' ? type : 'item'
}

/**
 * Whether `key` is out of use: unknown, disabled itself (K9 groups and separators always are), or
 * under a disabled item, which takes everything under it out of use.
 */
export function isDisabled(
  collection: Collection<unknown>,
  key: string | null | undefined,
): boolean {
  const entry = collection.get(key)
  if (!entry || entry.disabled) return true
  for (let up = collection.get(entry.parent); up; up = collection.get(up.parent))
    if ((up.item as { disabled?: unknown }).disabled === true) return true
  return false
}

/**
 * Whether a click opens a link somewhere else — a modifier key asks for a new tab, a window or a
 * download — so the page stays and the component should stay as it is.
 */
export const opensElsewhere = (event: MouseEvent<HTMLElement>) =>
  event.currentTarget.matches('a[href]') &&
  (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)

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
  /** The navigation's own `aria-label`: the sheet's visible title and name. */
  title: string | undefined
  /** The navigation's `aria-labelledby`, naming an untitled sheet. */
  labelledBy: string | undefined
  /** The landmark's default name, naming a sheet that has neither. */
  name: string
  placement: 'start' | 'bottom'
  /** The navigation's root: the portaled sheet takes its direction on open. */
  root: RefObject<HTMLElement | null>
  className: string
  children: ReactNode
}

/**
 * The compact surface of Navigation and Panel: a trigger that opens their items in a modal
 * sheet named like the landmark.
 */
export function NavSheet(props: NavSheetProps) {
  const { trigger, title, labelledBy, open, root } = props
  const [dir, setDir] = useState<Direction | undefined>(undefined)
  useIsomorphicLayoutEffect(() => {
    if (open) setDir(readDirection(root.current))
  }, [open, root])
  const custom = hasSlotContent(trigger)
  const node = getTriggerChild(trigger) ?? (
    <Button
      icon={custom ? undefined : props.icon}
      iconOnly={!custom}
      aria-label={custom ? undefined : props.openLabel}
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
      aria-labelledby={title ? undefined : labelledBy}
      aria-label={title || labelledBy ? undefined : props.name}
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
