/** Shared floating surface, state and interaction for Tooltip/Popover. */
import {
  forwardRef,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { usePortalTarget } from './use-portal-target'
import { Trigger, getTriggerChild } from './Trigger'
import { useLayer } from './use-layer'
import { useFloatingPosition } from './use-floating-position'
import { useMachine } from './use-machine'
import { useComposedRefs } from './use-composed-refs'
import { useHoverIntent } from './use-hover-intent'
import { mergeProps } from './merge-props'
import {
  overlayMachine,
  connectOverlay,
  type OverlaySchema,
} from '../../machines/overlay.machine'
import { getCardSurfaceProps } from '../../internal/card-surface'
import { hasSlotContent } from '../../slot-content'
import { Text } from '../../../Text/Text'
import { Membrane } from './Membrane'
import { getFocusableElements } from '../../runtime/layers'

export interface FloatingSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'content'
  | 'children'
  | 'role'
  | 'tabIndex'
  | 'autoFocus'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'defaultValue'
  | 'defaultChecked'
  | 'popover'
> {
  /** Floating content. Empty content leaves the trigger without a layer. Tooltip content must be noninteractive. */
  content?: ReactNode
  /** One trigger element forwarding props/ref, or text rendered as a Button. */
  children?: ReactNode
  /** Controlled visibility. Changes from the parent do not emit onOpenChange. */
  open?: boolean
  /** Initial uncontrolled visibility; later changes do not reset the layer. */
  defaultOpen?: boolean
  /** Preferred side; may flip when the opposite side has more room. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Logical alignment on the cross axis, following dir or the trigger's direction. */
  align?: 'start' | 'center' | 'end'
  /** Additional nonnegative gap in pixels before the content membrane. */
  sideOffset?: number
  /** Content direction. Omitted inherits the trigger; auto follows the content. */
  dir?: HTMLAttributes<HTMLDivElement>['dir']
  /** Visibility requested by an interaction; a controlled parent may refuse. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Class on the same content surface as native attributes, style and ref. */
  className?: string
}
export interface HoverTimingProps {
  /** Hover/focus opening delay in milliseconds (0–2147483647); default 200. */
  openDelay?: number
  /** Closing delay after hover and focus leave (0–2147483647); default 0. */
  closeDelay?: number
}
export type FloatingOverlayProps = FloatingSurfaceProps &
  (
    | (HoverTimingProps & {
        /** Hover/focus activation for tooltips or interactive hover cards. */
        trigger?: 'hover'
        /** Hover content contains controls: dialog semantics and focus restoration. */
        interactive?: boolean
      })
    | {
        trigger: 'click'
        interactive?: never
        openDelay?: never
        closeDelay?: never
      }
  )
const hasContent = (node: ReactNode) =>
  hasSlotContent(node) && (typeof node !== 'string' || !!node.trim())
function delay(value: number | undefined, fallback: number, name: string) {
  const result = value === undefined ? fallback : value
  if (
    typeof result !== 'number' ||
    !Number.isFinite(result) ||
    result < 0 ||
    result > 2147483647
  )
    throw new RangeError(
      `${name} must be a finite delay from 0 to 2147483647 milliseconds`,
    )
  return result
}

export const FloatingOverlay = forwardRef<HTMLDivElement, FloatingOverlayProps>(
  function FloatingOverlay(props, ref) {
    const {
      trigger = 'hover',
      interactive = false,
      content,
      children,
      open,
      defaultOpen = false,
      openDelay,
      closeDelay,
      side = 'top',
      align = 'center',
      sideOffset = 2,
      onOpenChange,
      className,
      hidden,
      dir,
      ...rest
    } = props
    if (trigger !== 'hover' && trigger !== 'click')
      throw new TypeError('Overlay trigger must be hover or click')
    if (typeof interactive !== 'boolean')
      throw new TypeError('Overlay interactive must be boolean')
    if (
      typeof defaultOpen !== 'boolean' ||
      (open !== undefined && typeof open !== 'boolean')
    )
      throw new TypeError('Overlay open/defaultOpen must be boolean')
    if (
      trigger === 'click' &&
      (props.interactive !== undefined ||
        openDelay !== undefined ||
        closeDelay !== undefined)
    )
      throw new TypeError(
        'Click overlays do not accept hover interaction or delays',
      )
    const resolvedOpenDelay = delay(openDelay, 200, 'Overlay openDelay')
    const resolvedCloseDelay = delay(closeDelay, 0, 'Overlay closeDelay')
    const hasTrigger = hasContent(children)
    const available = !hidden && hasTrigger && hasContent(content)
    const tooltip = trigger === 'hover' && !interactive
    const [machine] = useState(() => {
      const initiallyOpen = available && (open ?? defaultOpen)
      return {
        ...overlayMachine,
        initial: initiallyOpen ? ('open' as const) : ('closed' as const),
        context: { ...overlayMachine.context, open: initiallyOpen },
      }
    })
    const { state, send } = useMachine<OverlaySchema>(machine, {
      open: available ? open : false,
      trigger,
      interactive,
      openDelay: resolvedOpenDelay,
      closeDelay: resolvedCloseDelay,
      positioning: { side, align, sideOffset },
      onOpenChange: (details) => {
        if (!available || (open !== undefined && details.open === open)) return
        onOpenChange?.(details)
      },
    })
    const machineOpen = state.matches('open', 'closing')
    const isOpen = available && (open ?? machineOpen)
    useEffect(() => {
      if (!available || (open !== undefined && open !== machineOpen))
        send(isOpen ? 'OPEN' : 'CLOSE')
    }, [available, open, machineOpen, isOpen, send])
    useEffect(() => {
      send('RECONFIGURE')
    }, [trigger, resolvedOpenDelay, resolvedCloseDelay, send])
    const api = connectOverlay(
      {
        ...state,
        matches: (...states) => states.includes(isOpen ? 'open' : 'closed'),
      },
      send,
    )
    const triggerRef = useRef<HTMLElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const positionRef = useRef<HTMLElement | null>(null)
    const mergedRef = useComposedRefs(contentRef, ref)
    const contentId = useId(),
      generatedTriggerId = useId()
    const childId = getTriggerChild(children)?.props.id
    const triggerId = typeof childId === 'string' ? childId : generatedTriggerId
    const id = rest.id ?? contentId
    const portalTarget = usePortalTarget()
    const position = useFloatingPosition({
      open: isOpen && portalTarget !== null,
      triggerRef,
      contentRef: positionRef,
      directionRef: contentRef,
      side,
      align,
      sideOffset,
      dir,
    })
    const hover = useHoverIntent({
      enabled: available && trigger === 'hover',
      open: isOpen,
      triggerRef,
      contentRef: positionRef,
      send,
    })
    useLayer({
      enabled: isOpen && portalTarget !== null,
      contentRef: positionRef,
      triggerRef,
      autoFocus: trigger === 'click',
      initialFocus: () => {
        const content = contentRef.current
        return content ? getFocusableElements(content)[0] ?? content : null
      },
      restoreFocus: !tooltip,
      onEscape: () => send('CLOSE'),
      // Tooltips too: one opened by focus must not outlive a press that keeps focus.
      onOutside: () => send('CLOSE'),
    })
    const contentAttributes = api.getContentProps()
    const contentNode =
      typeof content === 'string' || typeof content === 'number' ? (
        <Text as="div" fullWidth membrane={false} inset="none" align="left">
          {content}
        </Text>
      ) : (
        content
      )
    const surface =
      hasTrigger && hasContent(content) ? (
        <Membrane
          ref={positionRef}
          as="div"
          className="uf-overlay-contentMembrane"
          style={position.style}
          hidden={!isOpen}
        >
          <div
            {...getCardSurfaceProps({
              variant: 'default',
              padding: 'control',
              radius: 'md',
              border: true,
              hoverable: false,
              fullWidth: false,
              className: ['uf-overlay-content', className]
                .filter(Boolean)
                .join(' '),
            })}
            {...contentAttributes}
            {...mergeProps(rest, hover.content)}
            ref={mergedRef}
            id={id}
            dir={dir}
            role={tooltip ? 'tooltip' : 'dialog'}
            tabIndex={tooltip ? undefined : -1}
            aria-labelledby={
              rest['aria-labelledby'] ??
              (!tooltip && !rest['aria-label'] ? triggerId : undefined)
            }
            data-trigger={trigger}
            data-side={position.side}
            data-align={align}
            hidden={!isOpen}
          >
            {contentNode}
          </div>
        </Membrane>
      ) : null
    return (
      <>
        {hasTrigger && (
          <Trigger
            actionable={trigger === 'click'}
            {...(available ? api.getTriggerProps() : {})}
            {...hover.trigger}
            ref={triggerRef}
            id={triggerId}
            aria-expanded={available && !tooltip ? isOpen : undefined}
            aria-haspopup={available && !tooltip ? 'dialog' : undefined}
            aria-controls={available && !tooltip && isOpen ? id : undefined}
            aria-describedby={available && tooltip ? id : undefined}
            className="uf-overlay-triggerButton"
          >
            {children}
          </Trigger>
        )}
        {/* Server and hydrating renders have no surface: a <div> is invalid in phrasing content. */}
        {portalTarget && createPortal(surface, portalTarget)}
      </>
    )
  },
)
