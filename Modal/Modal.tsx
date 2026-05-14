/**
 * Modal — overlay surface component.
 *
 * Unifies: Dialog + Drawer + AlertDialog into a single component.
 *
 * - variant='center'                     -> classic dialog
 * - variant='left'|'right'|'top'|'bottom' -> drawer / sheet
 * - closable=false                       -> alertdialog (no Escape, no backdrop dismiss)
 *
 * `<Modal open title="Settings" variant="right" width={400} />`
 */

import { forwardRef, useId, useCallback, useEffect, useState, type MutableRefObject, type ReactNode, type HTMLAttributes, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useIsCompactViewport,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { modalMachine, connectModal } from '../assets/machines/modal.machine'
import type { ModalSchema } from '../assets/machines/modal.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import type { ButtonVariant } from '../Button/Button'
import { Bar } from '../Bar/Bar'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalVariant = 'center' | 'left' | 'right' | 'top' | 'bottom'
export type ModalSurface = 'auto' | 'dialog' | 'sheet'

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'content'> {
  /** Controlled open state. */
  open?: boolean
  /** Visual placement variant. */
  variant?: ModalVariant
  /** components API compatibility: overlay click behavior. */
  closeOnOverlayClick?: boolean
  /** Whether the modal can be closed via Escape / backdrop click. */
  closable?: boolean
  /** Title content rendered inside the modal. */
  title?: ReactNode
  /** Description content rendered below the title. */
  description?: ReactNode
  /** Body content. */
  children?: ReactNode
  /** Optional footer actions. */
  actions?: Array<{
    label: ReactNode
    variant?: ButtonVariant
    disabled?: boolean
  }>
  /** Trigger element that toggles the modal open. */
  trigger?: ReactNode
  /** Width in px for left/right variants. */
  width?: number
  /** Height in px for top/bottom variants. */
  height?: number
  /** Called when the open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Surface behavior on compact viewports. */
  surface?: ModalSurface
  /** Breakpoint where auto surfaces switch to sheet mode. */
  surfaceBreakpoint?: number
  /** Additional class name for the content element. */
  className?: string
}

interface ModalLegacyProps {
  isOpen?: boolean
  onClose?: () => void
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  function Modal(props, ref) {
    const legacyProps = props as ModalProps & ModalLegacyProps
    const {
      open,
      variant = 'right',
      closeOnOverlayClick = true,
      closable = true,
      title,
      description,
      children,
      actions = [],
      trigger,
      width = 400,
      height = 420,
      onOpenChange,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      className,
      ...rest
    } = props

    const isCompactViewport = useIsCompactViewport(surfaceBreakpoint)
    const resolvedSurface: Exclude<ModalSurface, 'auto'> = surface === 'auto'
      ? (isCompactViewport ? 'sheet' : 'dialog')
      : surface
    const effectiveVariant: ModalVariant = (
      resolvedSurface === 'sheet' && variant === 'center'
        ? 'bottom'
        : variant
    )

    const titleId = useId()
    const descriptionId = useId()
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

    useEffect(() => {
      if (typeof document === 'undefined') return
      setPortalTarget(document.body)
    }, [])

    const resolvedOpen = typeof legacyProps.isOpen === 'boolean' ? legacyProps.isOpen : open
    const { state, send } = useMachine<ModalSchema>(modalMachine, {
      open: resolvedOpen,
      variant: effectiveVariant,
      closable,
      titleId,
      descriptionId,
      onOpenChange: ((details: { open: boolean }) => {
        try { onOpenChange?.(details) } catch {}
        if (!details?.open) {
          try { legacyProps.onClose?.() } catch {}
        }
      }) as any,
    })
    const controlledOpen = typeof resolvedOpen === 'boolean' ? resolvedOpen : null
    const isMachineOpen = state.matches('open')

    useEffect(() => {
      if (controlledOpen === null || controlledOpen === isMachineOpen) return
      send(controlledOpen ? 'OPEN' : 'CLOSE')
    }, [controlledOpen, isMachineOpen, send])

    const api = connectModal(state, send)
    const triggerProps = api.getTriggerProps()
    const isPrimitiveTrigger = typeof trigger === 'string' || typeof trigger === 'number'
    const backdropProps = api.getBackdropProps() as any
    if (!closeOnOverlayClick) {
      try { delete backdropProps.onClick } catch {}
    }

    const handleRef = useCallback(
      (el: HTMLDivElement | null) => {
        send({ type: 'SET_CONTENT', el })
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el
      },
      [ref, send],
    )

    // Build inline style for width/height CSS custom properties (only on matching variants)
    const isHorizontal = effectiveVariant === 'left' || effectiveVariant === 'right'
    const isVertical = effectiveVariant === 'top' || effectiveVariant === 'bottom'
    const contentStyle: CSSProperties | undefined =
      (isHorizontal && width != null) || (isVertical && height != null)
        ? {
          ...(isHorizontal && width != null ? { '--face-runtime-modal-w': `${width}px` } as CSSProperties : {}),
          ...(isVertical && height != null ? { '--face-runtime-modal-h': `${height}px` } as CSSProperties : {}),
        }
        : undefined

    const overlay = (
      <>
        <div {...backdropProps} className={cn('uf-modal-backdrop')} />

        <div {...api.getPositionerProps()} className={cn('uf-modal-positioner')}>
          <div
            ref={handleRef}
            {...api.getContentProps()}
            data-surface={resolvedSurface}
            className={cn('uf-modal', className)}
            style={contentStyle}
            {...rest}
          >
            {(title != null || closable) && (
              <Bar className="uf-modal-bar">
                {title != null ? (
                  <Text
                    {...(api.getTitleProps() as any)}
                    as="div"
                    fullWidth
                    align="left"
                    className={cn('uf-modal-title')}
                  >
                    {title}
                  </Text>
                ) : null}
                {closable ? (
                  <Bar.Right>
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
                  </Bar.Right>
                ) : null}
              </Bar>
            )}

            {description != null && (
              <Text
                {...(api.getDescriptionProps() as any)}
                as="div"
                variant="muted"
                fullWidth
                align="left"
                className={cn('uf-modal-description')}
              >
                {description}
              </Text>
            )}

            {children != null ? (
              typeof children === 'string' || typeof children === 'number' ? (
                <div className="uf-modal-body">
                  <Text as="div" fullWidth align="left">
                    {children}
                  </Text>
                </div>
              ) : (
                <div className="uf-modal-body">{children}</div>
              )
            ) : null}

            {actions.length > 0 ? (
              <Bar className="uf-modal-actionsBar">
                <Bar.Right>
                  {actions.map((action, index) => (
                    <Button
                      key={`modal-action:${index}`}
                      text={typeof action.label === 'string' || typeof action.label === 'number' ? String(action.label) : undefined}
                      variant={action.variant ?? (index === actions.length - 1 ? 'accent' : 'outline')}
                      disabled={action.disabled}
                      fullWidth={false}
                    >
                      {typeof action.label === 'string' || typeof action.label === 'number' ? undefined : action.label}
                    </Button>
                  ))}
                </Bar.Right>
              </Bar>
            ) : null}
          </div>
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

        {portalTarget ? createPortal(overlay, portalTarget) : overlay}
      </>
    )
  },
)
