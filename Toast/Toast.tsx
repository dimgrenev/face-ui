/**
 * Toast — notification system.
 *
 * Exports:
 * - `createToastContext()` — factory returning a toaster + hook + component triple
 * - Default singleton: `useToast` hook + `Toaster` component
 *
 * Uses `createToaster()` from `@face-ui/core` which provides its own
 * subscribe/getSnapshot compatible with `useSyncExternalStore`.
 */

import { forwardRef, useSyncExternalStore, useCallback, type HTMLAttributes, type ReactNode } from 'react'
import { connectToast, createToaster, toastAnatomy } from '../assets/machines/toast.machine'
import type {
  ToastAction,
  ToastItem,
  ToastOptions,
  ToastTone,
  Toaster as ToasterType,
  ToastSchema,
} from '../assets/machines/toast.machine'
import type { MachineSnapshot } from '../assets/types'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Bar } from '../Bar/Bar'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToasterProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional class name for the toast group container. */
  className?: string
  /** Viewport edge and alignment used by the toast stack. */
  placement?: ToastPlacement
  /** Render the internal icon-only dismiss button. */
  dismissible?: boolean
  /** Accessible label for the internal dismiss button. */
  closeLabel?: string
}

export type ToastPlacement =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right'

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Primary notification text. */
  title?: ReactNode
  /** Supporting notification text. */
  description?: ReactNode
  /** Optional action button. Invoking it also requests dismissal. */
  action?: ToastAction
  /** Semantic notification tone. */
  tone?: ToastTone
  /** Render the icon-only dismiss button. */
  dismissible?: boolean
  /** Accessible label for the dismiss button. */
  closeLabel?: string
  /** Called when the close button or action requests dismissal. */
  onDismiss?: () => void
  /** Additional class name on the notification surface. */
  className?: string
}

export interface UseToastReturn {
  /** Show a toast. Returns the toast id. */
  toast: ToasterType['toast']
  /** Dismiss a toast by id. */
  dismiss: ToasterType['dismiss']
}

export interface ToastContextValue {
  toaster: ToasterType
  useToast: () => UseToastReturn
  Toaster: React.ForwardRefExoticComponent<ToasterProps & React.RefAttributes<HTMLDivElement>>
}

// ---------------------------------------------------------------------------
// Notification surface
// ---------------------------------------------------------------------------

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  function Toast(props, ref) {
    const {
      title,
      description,
      action,
      tone = 'neutral',
      dismissible = true,
      closeLabel = 'Close notification',
      onDismiss,
      className,
      ...rest
    } = props

    return (
      <Card
        ref={ref}
        {...toastAnatomy.getPartAttrs('root')}
        role="status"
        aria-atomic="true"
        data-state="active"
        data-tone={tone}
        padding="default"
        radius="md"
        className={cn('uf-toast', className)}
        {...rest}
      >
        <div className="uf-toast-body">
          <Bar className="uf-toast-bar">
            <Bar.LeftEllipsis>
              {title != null ? (
                <Text
                  {...(toastAnatomy.getPartAttrs('title') as any)}
                  as="div"

                  className="uf-toast-title"
                >
                  {title}
                </Text>
              ) : <span />}
            </Bar.LeftEllipsis>
            {dismissible ? (
              <Bar.Right>
                <Button
                  {...toastAnatomy.getPartAttrs('close')}
                  aria-label={closeLabel}
                  icon="close"
                  iconOnly
                  variant="ghost"
                  fullWidth={false}
                  className="uf-toast-close"
                  onClick={onDismiss}
                />
              </Bar.Right>
            ) : null}
          </Bar>
          {description != null ? (
            <Text
              {...(toastAnatomy.getPartAttrs('description') as any)}
              as="div"
              variant="muted"
              className="uf-toast-description"
            >
              {description}
            </Text>
          ) : null}
          {action?.label ? (
            <div className="uf-toast-actionRow">
              <Button
                {...toastAnatomy.getPartAttrs('action')}
                text={action.label}
                variant="ghost"
                fullWidth={false}
                className="uf-toast-action"
                onClick={() => {
                  try {
                    action.onClick?.()
                  } finally {
                    onDismiss?.()
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </Card>
    )
  },
)

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createToastContext(options?: {
  maxVisible?: number
  defaultDuration?: number
}): ToastContextValue {
  const toaster = createToaster(options)

  function useToast(): UseToastReturn {
    return {
      toast: toaster.toast,
      dismiss: toaster.dismiss,
    }
  }

  const ToasterComponent = forwardRef<HTMLDivElement, ToasterProps>(
    function Toaster(props, ref) {
      const {
        className,
        placement = 'bottom-center',
        dismissible = true,
        closeLabel = 'Close notification',
        ...rest
      } = props

      // Subscribe to the toaster service snapshot
      const subscribe = useCallback(
        (cb: () => void) => {
          // toaster.subscribe gives us the snapshot, but useSyncExternalStore
          // wants a plain callback. Wrap it.
          return toaster.subscribe(cb as unknown as (snap: MachineSnapshot<ToastSchema>) => void)
        },
        [],
      )

      const getSnapshot = useCallback(() => toaster.getSnapshot(), [])

      const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
      const api = connectToast(state, (event) => {
        // Route events through the toaster's send by mapping to toast/dismiss
        if (typeof event === 'string') return
        if (event.type === 'REMOVE') {
          toaster.dismiss((event as { type: 'REMOVE'; id: string }).id)
        }
      })

      const visibleToasts = api.visibleToasts as ToastItem[]

      return (
        <div
          ref={ref}
          {...api.getGroupProps()}
          data-placement={placement}
          data-membrane=""
          className={cn('uf-toaster', className)}
          {...rest}
        >
          {visibleToasts.map((toast) => (
            <Toast
              key={toast.id}
              {...api.getToastProps(toast)}
              title={toast.title}
              description={toast.description}
              action={toast.action}
              tone={toast.tone}
              dismissible={dismissible}
              closeLabel={closeLabel}
              onDismiss={() => toaster.dismiss(toast.id)}
            />
          ))}
        </div>
      )
    },
  )

  return {
    toaster,
    useToast,
    Toaster: ToasterComponent,
  }
}

// ---------------------------------------------------------------------------
// Default singleton
// ---------------------------------------------------------------------------

const defaultContext = createToastContext()

/** Hook to show/dismiss toasts using the default toaster. */
export const useToast = defaultContext.useToast

/** Renders visible toasts from the default toaster. */
export const Toaster = defaultContext.Toaster

export type { ToastAction, ToastOptions, ToastTone }
