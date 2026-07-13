/**
 * Modal — overlay surface component.
 *
 * One modal surface for centered dialogs and viewport-edge workflows.
 *
 * `<Modal open title="Settings" />`
 */

import { forwardRef, useId, useCallback, useEffect, useState, type MutableRefObject, type ReactNode, type HTMLAttributes, type CSSProperties, type MouseEventHandler } from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { modalMachine, connectModal } from '../assets/machines/modal.machine'
import type { ModalSchema } from '../assets/machines/modal.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import type { ButtonVariant } from '../Button/Button'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalPlacement = 'center' | 'left' | 'right' | 'top' | 'bottom'
export type ModalEdge = 'inset' | 'flush'

export interface ModalAction {
  label: ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

interface ModalSharedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'content'> {
  /** Controlled open state. */
  open?: boolean
  /** Close the surface when its backdrop is clicked. */
  closeOnOverlayClick?: boolean
  /** Whether the surface can be closed via Escape / backdrop click. */
  closable?: boolean
  /** Title content rendered inside the surface. */
  title?: ReactNode
  /** Description content rendered below the title. */
  description?: ReactNode
  /** Body content. */
  children?: ReactNode
  /** Optional footer actions. */
  actions?: ModalAction[]
  /** Trigger element that toggles the modal open. */
  trigger?: ReactNode
  /** Called when the open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Move focus into the surface when it opens. Disable for bounded previews that render it inline. */
  autoFocusOnOpen?: boolean
  /** Lock body scroll while the modal is open. Opt-in; off by default. */
  scrollLock?: boolean
  /** Render overlay into document.body. Disable for bounded component previews. */
  portal?: boolean
  /** Additional class name for the content element. */
  className?: string
  /** Additional class name for the backdrop element. */
  backdropClassName?: string
  /** Additional class name for the positioner element. */
  positionerClassName?: string
}

export interface ModalProps extends ModalSharedProps {
  /** Where the modal is anchored in the viewport. */
  placement?: ModalPlacement
  /** Inset surfaces use the system viewport gap, radius, and border. */
  edge?: ModalEdge
  /** Surface width in px, capped by the available viewport width. */
  width?: number
  /** Surface height in px, capped by the available viewport height. */
  height?: number
}

function renderModalBody(children: ReactNode): ReactNode {
  if (typeof children !== 'string' && typeof children !== 'number') return children
  return (
    <Text as="div" variant="body" fullWidth membrane>
      {String(children)}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  function Modal(props, ref) {
    const {
      open,
      placement = 'center',
      edge = 'inset',
      closeOnOverlayClick = true,
      closable = true,
      title,
      description,
      children,
      actions = [],
      trigger,
      width,
      height,
      onOpenChange,
      autoFocusOnOpen = true,
      scrollLock = false,
      portal = true,
      className,
      backdropClassName,
      positionerClassName,
      style,
      ...rest
    } = props

    const titleId = useId()
    const descriptionId = useId()
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

    useEffect(() => {
      if (typeof document === 'undefined') return
      setPortalTarget(document.body)
    }, [])

    const { state, send } = useMachine<ModalSchema>(modalMachine, {
      open,
      variant: placement,
      closable,
      autoFocusOnOpen,
      titleId,
      descriptionId,
      onOpenChange: ((details: { open: boolean }) => {
        if (typeof onOpenChange === 'function') onOpenChange(details)
      }) as any,
    })
    const controlledOpen = typeof open === 'boolean' ? open : null
    const isMachineOpen = state.matches('open')

    useBodyScrollLock(isMachineOpen && scrollLock)

    useEffect(() => {
      if (controlledOpen === null || controlledOpen === isMachineOpen) return
      send(controlledOpen ? 'OPEN' : 'CLOSE')
    }, [controlledOpen, isMachineOpen, send])

    const api = connectModal(state, send)
    const triggerProps = api.getTriggerProps()
    const isPrimitiveTrigger = typeof trigger === 'string' || typeof trigger === 'number'
    const backdropProps = api.getBackdropProps() as any
    if (!closeOnOverlayClick) {
      delete backdropProps.onClick
    }

    const handleRef = useCallback(
      (el: HTMLDivElement | null) => {
        send({ type: 'SET_CONTENT', el })
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el
      },
      [ref, send],
    )

    const contentStyle: CSSProperties = {
      ...style,
      ...(width != null ? { '--face-runtime-modal-w': `${width}px` } as CSSProperties : {}),
      ...(height != null ? { '--face-runtime-modal-h': `${height}px` } as CSSProperties : {}),
    }

    const overlay = (
      <>
        <div {...backdropProps} data-portal={portal ? 'true' : 'false'} className={cn('uf-modal-backdrop', backdropClassName)} />

        <div
          {...api.getPositionerProps()}
          data-edge={edge}
          data-portal={portal ? 'true' : 'false'}
          className={cn('uf-modal-positioner', `uf-modal-positioner--edge-${edge}`, positionerClassName)}
        >
          <Card
            ref={handleRef}
            {...rest}
            {...api.getContentProps()}
            data-edge={edge}
            padding="default"
            radius={edge === 'flush' ? 'none' : 'lg'}
            border={edge === 'inset'}
            className={cn('uf-modal', `uf-modal--edge-${edge}`, className)}
            style={contentStyle}
          >
            {(title != null || closable) && (
              <Card.Header layout="bar" className="uf-modal-bar">
                {title != null ? (
                  <Card.Title
                    {...(api.getTitleProps() as any)}
                    as="div"
                    fullWidth
                    align="left"
                    className={cn('uf-modal-title')}
                  >
                    {title}
                  </Card.Title>
                ) : null}
                {closable ? (
                  <Card.Actions className="uf-modal-closeActions">
                    <Button
                      {...api.getCloseProps()}
                      icon="close"
                      iconOnly
                      fullWidth={false}
                      variant="default"
                      className="uf-modal-closeButton"
                      aria-label="Close modal"
                      title="Close"
                    />
                  </Card.Actions>
                ) : null}
              </Card.Header>
            )}

            {description != null && (
              <Card.Description
                {...(api.getDescriptionProps() as any)}
                as="div"
                variant="muted"
                fullWidth
                align="left"
                className={cn('uf-modal-description')}
              >
                {description}
              </Card.Description>
            )}

            {children != null ? (
              <Card.Content className="uf-modal-body">
                {renderModalBody(children)}
              </Card.Content>
            ) : null}

            {actions.length > 0 ? (
              <Card.Footer className="uf-modal-actionsBar" layout="end">
                <Card.Actions align="end">
                  {actions.map((action, index) => (
                    <Button
                      key={`modal-action:${index}`}
                      text={typeof action.label === 'string' || typeof action.label === 'number' ? String(action.label) : undefined}
                      variant={action.variant ?? (index === actions.length - 1 ? 'accent' : 'outline')}
                      disabled={action.disabled}
                      onClick={action.onClick}
                      fullWidth={false}
                    >
                      {typeof action.label === 'string' || typeof action.label === 'number' ? undefined : action.label}
                    </Button>
                  ))}
                </Card.Actions>
              </Card.Footer>
            ) : null}
          </Card>
        </div>
      </>
    )

    return (
      <>
        {trigger != null && (
          isPrimitiveTrigger ? (
            <Button
              {...(triggerProps as any)}
              text={String(trigger)}
              fullWidth={false}
              membrane={false}
            />
          ) : (
            <span
              {...triggerProps}
              style={{ display: 'inline-flex' }}
            >
              {trigger}
            </span>
          )
        )}

        {portal && portalTarget
          ? createPortal(overlay, portalTarget)
          : <span className="uf-modal-inlineHost">{overlay}</span>}
      </>
    )
  },
)
