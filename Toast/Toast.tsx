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

import { forwardRef, useRef, useSyncExternalStore, useCallback, useEffect, type HTMLAttributes } from 'react'
import { connectToast, createToaster } from '../assets/machines/toast.machine'
import type { ToastAction, ToastItem, Toaster as ToasterType, ToastSchema } from '../assets/machines/toast.machine'
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
      const { className, ...rest } = props

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
          className={cn('uf-toaster', className)}
          {...rest}
        >
          {visibleToasts.map((toast) => (
            <Card
              key={toast.id}
              {...api.getToastProps(toast)}
              className={cn('uf-toast')}
            >
              <div className="uf-toast-body">
                <Bar className="uf-toast-bar">
                  <Bar.LeftEllipsis>
                    {toast.title ? (
                      <Text
                        {...(api.getTitleProps() as any)}
                        as="div"
                        variant="label"
                        className={cn('uf-toast-title')}
                      >
                        {toast.title}
                      </Text>
                    ) : (
                      <span />
                    )}
                  </Bar.LeftEllipsis>
                  <Bar.Right>
                    <Button
                      {...api.getCloseProps(toast.id)}
                      icon="close"
                      iconOnly
                      variant="ghost"
                      fullWidth={false}
                      className={cn('uf-toast-close')}
                    />
                  </Bar.Right>
                </Bar>
                {toast.description && (
                  <Text
                    {...(api.getDescriptionProps() as any)}
                    as="div"
                    variant="muted"
                    className={cn('uf-toast-description')}
                  >
                    {toast.description}
                  </Text>
                )}
                {toast.action?.label ? (
                  <div className="uf-toast-actionRow">
                    <Button
                      {...api.getActionProps()}
                      text={toast.action.label}
                      variant="ghost"
                      fullWidth={false}
                      className={cn('uf-toast-action')}
                      onClick={() => {
                        try {
                          toast.action?.onClick?.()
                        } finally {
                          toaster.dismiss(toast.id)
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </Card>
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

// ---------------------------------------------------------------------------
// Playground-friendly default export wrapper
// ---------------------------------------------------------------------------

/**
 * Toast — demo wrapper that renders the Toaster and shows a sample toast.
 * Useful for playground preview where we need a single renderable component.
 */
export interface ToastDemoProps {
  className?: string
  /** Show explicit trigger button in preview/demo wrapper. */
  showTrigger?: boolean
  /** Automatically show one sample toast after mount. */
  autoShow?: boolean
}

export type { ToastAction }

export const Toast = forwardRef<HTMLDivElement, ToastDemoProps>(
  function Toast(props, ref) {
    const { className, showTrigger = true, autoShow = false } = props
    const { toast } = defaultContext.useToast()

    // Show a sample toast only once after mount.
    // Avoid side effects during render (important for StrictMode and deterministic previews).
    const shownRef = useRef(false)
    useEffect(() => {
      if (!autoShow) return
      if (shownRef.current) return
      shownRef.current = true
      const timer = window.setTimeout(() => {
        toast({ title: 'Notification', description: 'This is a toast message.' })
      }, 100)
      return () => window.clearTimeout(timer)
    }, [toast, autoShow])

    const showSampleToast = useCallback(() => {
      toast({ title: 'Notification', description: 'This is a toast message.' })
    }, [toast])

    return (
      <div ref={ref} className={cn('uf-toast-demo', className)}>
        {showTrigger && (
          <div className="uf-toast-demo-trigger">
            <Button
              text="Show toast"
              variant="default"
              align="left"
              className="uf-toast-trigger"
              onClick={showSampleToast}
            />
          </div>
        )}
        <defaultContext.Toaster />
      </div>
    )
  },
)
