/**
 * Modal — a dialog above the page, centered or against a viewport edge.
 *
 * `<Modal trigger="Edit" title="Edit profile" footer={<Button>Save</Button>}>…</Modal>`
 */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Trigger } from '../assets/adapters/react/Trigger'
import { inertProp } from '../assets/adapters/react/inert-prop'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useFaceUiOverlayBoundary } from '../assets/adapters/react/overlay-context'
import { useOverlayFrame, useOverlayRootPosition } from '../assets/adapters/react/use-overlay-frame'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { invalidProp } from '../assets/runtime/props'
import { hasSlotContent, type SlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'

export type ModalPlacement = 'center' | 'start' | 'end' | 'top' | 'bottom'
export type ModalEdge = 'inset' | 'flush'
export type ModalLabels = Pick<CommonLabels, 'close'>

const defaultLabels: ModalLabels = Object.freeze({ close: 'Close' })

export interface ModalProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'title'
  | 'content'
  | 'children'
  | 'role'
  | 'hidden'
  | 'tabIndex'
  | 'autoFocus'
  | 'popover'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'defaultValue'
  | 'defaultChecked'
> {
  /** Whether the dialog is open; updates from the parent never call onOpenChange. */
  open?: boolean
  /** Whether the dialog is open on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Called once per user request to open or close: the trigger, the close button, Escape or a backdrop press. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Element that opens the dialog, keeping its own props and ref; text renders as a Button. */
  trigger?: ReactNode
  /** Heading of the dialog, which also gives the dialog its accessible name. */
  title?: ReactNode
  /** Text under the title, announced as the dialog's description. */
  description?: ReactNode
  /** Body of the dialog, mounted while it is open; text renders as body copy. */
  children?: SlotContent
  /** Region under the body, aligned to the end, usually the dialog's buttons; they close nothing on their own. */
  footer?: SlotContent
  /** `alertdialog` for a confirmation that interrupts the user's task; default `dialog`. */
  role?: 'dialog' | 'alertdialog'
  /** Shows the close button and lets Escape and backdrop presses close the dialog; false leaves closing to its own controls. */
  closable?: boolean
  /** A press on the backdrop closes the dialog; ignored while `closable` is false. */
  closeOnBackdropClick?: boolean
  /** Names of the dialog's own controls. */
  labels?: Partial<ModalLabels>
  /** Where the surface sits: centered, or against the start, end, top or bottom edge; start and end follow the direction. */
  placement?: ModalPlacement
  /** Edge placements only: `inset` keeps a gap with rounded, bordered corners; `flush` touches the edge, square and borderless. */
  edge?: ModalEdge
  /** Surface width in pixels, capped by the viewport. */
  width?: number
  /** Surface height in pixels, capped by the viewport. */
  height?: number
  /** Stops the page behind the open dialog from scrolling; off by default, and ignored when `portal` is false. */
  scrollLock?: boolean
  /** Renders into document.body as a modal layer; false renders a static preview inside the parent that leaves the page, keys and focus alone. */
  portal?: boolean
  /** Class on the surface, which also takes native attributes, style and ref. */
  className?: string
  /** Class on the backdrop behind the surface. */
  backdropClassName?: string
  /** Class on the viewport-sized box that places the surface. */
  positionerClassName?: string
}

/** True from opening until the box's own exit transitions end, so a closing dialog fades before it unmounts. */
function usePresence(open: boolean, box: RefObject<HTMLElement | null>): boolean {
  const [present, setPresent] = useState(open)
  if (open && !present) setPresent(true)
  useEffect(() => {
    if (open || !present) return
    let live = true
    const exits = box.current?.getAnimations?.() ?? []
    void Promise.allSettled(exits.map((exit) => exit.finished)).then(() => {
      if (live) setPresent(false)
    })
    return () => {
      live = false
    }
  }, [open, present, box])
  return open || present
}

function renderBody(children: SlotContent): SlotContent {
  if (typeof children !== 'string' && typeof children !== 'number') return children
  return (
    <Text as="div" variant="body" fullWidth membrane>
      {children}
    </Text>
  )
}

/** A dialog that takes over the page until closed, centered or attached to a viewport edge. */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  function Modal(props, ref) {
    const {
      open,
      defaultOpen = false,
      onOpenChange,
      trigger,
      title,
      description,
      children,
      footer,
      role = 'dialog',
      closable = true,
      closeOnBackdropClick = true,
      labels,
      placement = 'center',
      edge = 'inset',
      width,
      height,
      scrollLock = false,
      portal = true,
      className,
      backdropClassName,
      positionerClassName,
      style,
      dir,
      id,
      ...rest
    } = props
    const [isOpen, setOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen,
      onChange: (next) => onOpenChange?.({ open: next }),
      name: ['Modal', 'open'],
    })
    const text = resolveLabels(defaultLabels, labels, 'Modal')
    const portalTarget = usePortalTarget()
    const scopeRoot = useFaceUiOverlayBoundary()?.scopeRoot
    const [rootPlacement, setRootPlacement] = useState<{
      root: HTMLElement
      target: HTMLElement
    } | null>(null)
    const inRoot = portal && !!scopeRoot && !!portalTarget && (
      !scopeRoot.contains(portalTarget) ||
      (rootPlacement?.root === scopeRoot && rootPlacement.target === portalTarget)
    )
    const effectiveTarget = inRoot ? scopeRoot : portalTarget
    const viewportFrame = useOverlayFrame(portal)
    const overlayFrame = inRoot && scopeRoot ? {
      inset: 'auto',
      top: -scopeRoot.clientTop,
      left: -scopeRoot.clientLeft,
      width: scopeRoot.offsetWidth,
      height: scopeRoot.offsetHeight,
      '--uf-modal-frame-width': `${scopeRoot.offsetWidth}px`,
      '--uf-modal-frame-height': `${scopeRoot.offsetHeight}px`,
    } as CSSProperties : viewportFrame
    const scope = useId()
    const contentId = id ?? `${scope}content`
    const titleId = `${scope}title`
    const descriptionId = `${scope}description`
    const contentRef = useRef<HTMLDivElement | null>(null)
    const positionerRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLElement | null>(null)
    const surfaceRef = useComposedRefs(contentRef, ref)
    const present = usePresence(isOpen, positionerRef)
    useOverlayRootPosition(scopeRoot, inRoot && present)
    useIsomorphicLayoutEffect(() => {
      if (!portal || !present || !scopeRoot || !portalTarget || inRoot ||
          viewportFrame?.top === undefined) return
      const actual = positionerRef.current?.getBoundingClientRect()
      const expected = scopeRoot.getBoundingClientRect()
      if (!actual || ![actual.top - expected.top, actual.left - expected.left,
        actual.width - expected.width, actual.height - expected.height]
        .some((difference) => Math.abs(difference) > 1)) return
      // A transformed containing block changes what position:fixed measures
      // against. Portal into the root and use its own coordinate system instead.
      setRootPlacement({ root: scopeRoot, target: portalTarget })
    })
    const hasTitle = hasSlotContent(title)
    const hasDescription = hasSlotContent(description)

    // Only a portaled dialog is a document layer; in place it is a static preview.
    useLayer({
      enabled: portal && isOpen && effectiveTarget !== null,
      contentRef,
      triggerRef,
      modal: true,
      autoFocus: true,
      restoreFocus: true,
      onEscape: () => {
        if (closable) setOpen(false)
      },
      onOutside: () => {
        if (closable && closeOnBackdropClick) setOpen(false)
      },
    })
    useBodyScrollLock(portal && isOpen && scrollLock && effectiveTarget !== null)

    // Decidable here, unlike a field's: the surface is a `<div role="dialog">`, which is not a
    // labelable element, so no `<label for>` outside the component can name it — `title`,
    // `aria-label` and `aria-labelledby` are the whole list, and all three are props.
    if (isOpen && !hasTitle && !rest['aria-label'] && !rest['aria-labelledby'])
      invalidProp(
        'Modal',
        'title',
        undefined,
        'the dialog has no accessible name; pass title, aria-label or aria-labelledby',
      )

    const state = isOpen ? 'open' : 'closed'
    const flush = edge === 'flush' && placement !== 'center'
    const edgeName = flush ? 'flush' : 'inset'
    const surfaceStyle: CSSProperties = {
      ...style,
      ...(width != null
        ? ({ '--face-runtime-modal-w': `${width}px` } as CSSProperties)
        : {}),
      ...(height != null
        ? ({ '--face-runtime-modal-h': `${height}px` } as CSSProperties)
        : {}),
    }
    const layout = {
      'data-state': state,
      'data-variant': placement,
      'data-edge': edgeName,
      'data-portal': portal ? 'true' : 'false',
    }

    const overlay = present ? (
      <>
        <div
          data-scope="modal"
          data-part="backdrop"
          {...layout}
          {...inertProp(!isOpen)}
          data-scoped-root={inRoot ? '' : undefined}
          style={overlayFrame}
          className={cn('uf-modal-backdrop', backdropClassName)}
        />
        <div
          ref={positionerRef}
          data-scope="modal"
          data-part="positioner"
          {...layout}
          {...inertProp(!isOpen)}
          data-scoped-root={inRoot ? '' : undefined}
          style={overlayFrame}
          dir={dir}
          className={cn(
            'uf-modal-positioner',
            `uf-modal-positioner--edge-${edgeName}`,
            positionerClassName,
          )}
        >
          <Card
            {...rest}
            ref={surfaceRef}
            id={contentId}
            dir={dir}
            data-scope="modal"
            data-part="content"
            {...layout}
            role={role}
            aria-modal={portal && !scopeRoot ? true : undefined}
            aria-labelledby={
              rest['aria-labelledby'] ??
              (hasTitle && !rest['aria-label'] ? titleId : undefined)
            }
            aria-describedby={
              rest['aria-describedby'] ??
              (hasDescription ? descriptionId : undefined)
            }
            tabIndex={-1}
            padding="default"
            radius={flush ? 'none' : 'lg'}
            border={!flush}
            className={cn('uf-modal', `uf-modal--edge-${edgeName}`, className)}
            style={surfaceStyle}
          >
            {(hasTitle || closable) && (
              <Card.Header orientation="horizontal" className="uf-modal-bar">
                {hasTitle ? (
                  <Card.Title
                    id={titleId}
                    data-scope="modal"
                    data-part="title"
                    as="div"
                    fullWidth
                    align="start"
                    className="uf-modal-title"
                  >
                    {title}
                  </Card.Title>
                ) : null}
                {closable ? (
                  <Card.Actions className="uf-modal-closeActions">
                    <Button
                      data-scope="modal"
                      data-part="close"
                      icon="close"
                      iconOnly
                      fullWidth={false}
                      variant="default"
                      className="uf-modal-closeButton"
                      aria-label={text.close}
                      title={text.close}
                      onClick={(event) => {
                        if (!event.defaultPrevented) setOpen(false)
                      }}
                    />
                  </Card.Actions>
                ) : null}
              </Card.Header>
            )}
            {hasDescription ? (
              <Card.Description
                id={descriptionId}
                data-scope="modal"
                data-part="description"
                as="div"
                variant="muted"
                fullWidth
                align="start"
                className="uf-modal-description"
              >
                {description}
              </Card.Description>
            ) : null}
            {hasSlotContent(children) ? (
              <Card.Content className="uf-modal-body">
                {renderBody(children)}
              </Card.Content>
            ) : null}
            {hasSlotContent(footer) ? (
              <Card.Footer className="uf-modal-footer" align="end">
                {footer}
              </Card.Footer>
            ) : null}
          </Card>
        </div>
      </>
    ) : null

    return (
      <>
        {hasSlotContent(trigger) && (
          <Trigger
            ref={triggerRef}
            data-scope="modal"
            data-part="trigger"
            data-state={state}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={present ? contentId : undefined}
            onClick={(event) => {
              if (!event.defaultPrevented) setOpen(true)
            }}
          >
            {trigger}
          </Trigger>
        )}
        {portal ? (
          // Server and hydrating renders have no portal target: nothing mounts twice.
          effectiveTarget && overlay && createPortal(overlay, effectiveTarget)
        ) : overlay ? (
          <div className="uf-modal-inlineHost">{overlay}</div>
        ) : null}
      </>
    )
  },
)
