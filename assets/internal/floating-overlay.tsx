/** The implementation behind Tooltip, Popover and the Overlay compat alias; not public. */
import {
  useId,
  useRef,
  type ForwardedRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { usePortalTarget } from '../adapters/react/use-portal-target'
import { Trigger, getTriggerChild } from '../adapters/react/Trigger'
import { useLayer } from '../adapters/react/use-layer'
import { useFloatingPosition } from '../adapters/react/use-floating-position'
import { useComposedRefs } from '../adapters/react/use-composed-refs'
import { useControllableState } from '../adapters/react/use-controllable-state'
import { useHoverIntent } from '../adapters/react/use-hover-intent'
import { useIsomorphicLayoutEffect } from '../adapters/react/use-isomorphic-layout-effect'
import { mergeProps } from '../adapters/react/merge-props'
import { getCardSurfaceProps } from './card-surface'
import { hasSlotContent } from '../slot-content'
import { Text } from '../../Text/Text'
import { Membrane } from '../adapters/react/Membrane'
import { getFocusableElements } from '../runtime/layers'
import { readNumber } from '../runtime/props'
import type { FloatingOverlayProps } from '../adapters/react/FloatingOverlay'

const MAX_DELAY = 2147483647
const hasContent = (node: ReactNode) =>
  hasSlotContent(node) && (typeof node !== 'string' || !!node.trim())

/**
 * Renders a floating overlay; `component` names it in development reports.
 * Visibility lives in one place, `useControllableState`; hover and focus
 * propose it through `useHoverIntent`, the trigger click and the layer's
 * Escape and outside press set it directly.
 */
export function useFloatingOverlay(
  component: string,
  props: FloatingOverlayProps,
  ref: ForwardedRef<HTMLDivElement>,
): ReactElement {
  const {
    openOn,
    interactive,
    content,
    children,
    open,
    defaultOpen = false,
    openDelay,
    closeDelay,
    side = 'top',
    align = 'center',
    sideOffset,
    onOpenChange,
    className,
    hidden,
    dir,
    ...rest
  } = props
  const click = openOn === 'click'
  const tooltip = !click && !interactive
  const hasTrigger = hasContent(children)
  const available = !hidden && hasTrigger && hasContent(content)
  const [shown, setOpen, replaceOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: (next) => onOpenChange?.({ open: next }),
    name: [component, 'open'],
  })
  const isOpen = available && !!shown
  // An uncontrolled surface that loses its trigger or content closes quietly
  // and stays closed when they return.
  useIsomorphicLayoutEffect(() => {
    if (!available && shown) replaceOpen(false)
  }, [available, shown, replaceOpen])
  const delay = (name: string, value: number | undefined, fallback: number) =>
    click ? 0 : readNumber(component, name, value, fallback, { min: 0, max: MAX_DELAY })
  const hover = useHoverIntent({
    value: isOpen ? 'self' : null,
    onValueChange: (next) => setOpen(next !== null),
    openDelay: delay('openDelay', openDelay, 200),
    closeDelay: delay('closeDelay', closeDelay, 0),
    disabled: click || !available,
  })
  const { ref: hoverTriggerRef, ...hoverTrigger } = hover.trigger('self')
  const { ref: hoverContentRef, ...hoverContent } = hover.content
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const positionRef = useRef<HTMLElement | null>(null)
  const triggerRefs = useComposedRefs(triggerRef, hoverTriggerRef)
  const surfaceRefs = useComposedRefs(contentRef, ref)
  const membraneRefs = useComposedRefs(positionRef, hoverContentRef)
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
    sideOffset: readNumber(component, 'sideOffset', sideOffset, 2),
    dir,
  })
  useLayer({
    enabled: isOpen && portalTarget !== null,
    contentRef: positionRef,
    triggerRef,
    autoFocus: click,
    initialFocus: () => {
      const content = contentRef.current
      return content ? (getFocusableElements(content)[0] ?? content) : null
    },
    restoreFocus: !tooltip,
    onEscape: () => setOpen(false),
    // Tooltips too: one opened by focus must not outlive a press that keeps focus.
    onOutside: () => setOpen(false),
  })
  const state = isOpen ? 'open' : 'closed'
  const contentNode =
    typeof content === 'string' || typeof content === 'number' ? (
      <Text as="div" fullWidth membrane={false} inset="none" align="start">
        {content}
      </Text>
    ) : (
      content
    )
  const surface =
    hasTrigger && hasContent(content) ? (
      <Membrane
        ref={membraneRefs}
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
          {...mergeProps(rest, hoverContent)}
          data-scope="overlay"
          data-part="content"
          data-state={state}
          ref={surfaceRefs}
          id={id}
          dir={dir}
          role={tooltip ? 'tooltip' : 'dialog'}
          tabIndex={tooltip ? undefined : -1}
          aria-labelledby={
            rest['aria-labelledby'] ??
            (!tooltip && !rest['aria-label'] ? triggerId : undefined)
          }
          data-trigger={click ? 'click' : 'hover'}
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
          actionable={click}
          {...(available
            ? {
                'data-scope': 'overlay',
                'data-part': 'trigger',
                'data-state': state,
                ...hoverTrigger,
                onClick: click
                  ? (event: MouseEvent<HTMLElement>) => {
                      if (!event.defaultPrevented) setOpen((current) => !current)
                    }
                  : undefined,
              }
            : {})}
          ref={triggerRefs}
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
}
