import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useFaceUiOverlayBoundary } from '../assets/adapters/react/overlay-context'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { nearest } from '../assets/runtime/collection'
import { activeModal, isAvailable, subscribeActiveModal } from '../assets/runtime/layers'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Bar } from '../Bar/Bar'
import { Button, type ButtonProps } from '../Button/Button'
import { Card } from '../Card/Card'
import { Text } from '../Text/Text'
import {
  createToaster,
  serverToasts,
  type ToastAction,
  type ToasterOptions,
  type ToastOptions,
  type ToastTone,
} from './toaster'

export type { ToastAction, ToasterOptions, ToastOptions, ToastTone }

export type ToastLabels = Pick<CommonLabels, 'close'>
export type ToastButtonProps = Pick<ButtonProps, 'variant' | 'style'>

const defaultLabels: ToastLabels = Object.freeze({ close: 'Close notification' })
/** Landmark name until a native aria-label or aria-labelledby names the region (K14); F8 reaches it. */
const defaultRootLabels = Object.freeze({ region: 'Notifications (F8)' })

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children' | 'role'> {
  /** Main line of the notification, in bold. */
  title?: ReactNode
  /** Supporting text under the title. */
  description?: ReactNode
  /** A button under the text; clicking it runs its onClick and then calls onClose. */
  action?: ToastAction
  /** Border color: neutral, positive, warning or destructive; every tone is announced as a polite status. Default: neutral. */
  tone?: ToastTone
  /** Lets the user close the toast: a close button, and Escape inside the toast; both need `onClose`. Default: true. */
  closable?: boolean
  /** Name of the close button. */
  labels?: Partial<ToastLabels>
  /** Visual Button variant and style for both action and close controls. */
  buttonProps?: ToastButtonProps
  /** Called when the close button, Escape or the action asks to close; the owner removes the toast. */
  onClose?: () => void
  /** Additional class name on the notification surface. */
  className?: string
}

/** A notification surface: title, description, one action and a close button; `<Toaster>` shows, times and stacks them. */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(props, ref) {
  const {
    title,
    description,
    action,
    tone = 'neutral',
    closable = true,
    labels,
    buttonProps,
    onClose,
    className,
    onKeyDown,
    ...rest
  } = props
  const id = useId()
  const text = resolveLabels(defaultLabels, labels, 'Toast')
  const close = closable ? onClose : undefined
  const hasTitle = hasSlotContent(title)
  const hasDescription = hasSlotContent(description)

  return (
    <Card
      data-scope="toast"
      data-part="root"
      data-tone={tone}
      aria-atomic="true"
      aria-labelledby={hasTitle ? `${id}-title` : undefined}
      aria-describedby={hasDescription ? `${id}-description` : undefined}
      padding="default"
      radius="md"
      {...rest}
      ref={ref}
      role="status"
      className={cn('uf-toast', className)}
      onKeyDown={composeHandlers(onKeyDown, (event) => {
        if (!close || event.key !== 'Escape' || event.nativeEvent.isComposing) return
        event.preventDefault()
        close()
      })}
    >
      <div className="uf-toast-body">
        <Bar className="uf-toast-bar">
          <Bar.Section grow>
            {hasTitle ? (
              <Text data-scope="toast" data-part="title" id={`${id}-title`} as="div" className="uf-toast-title">
                {title}
              </Text>
            ) : null}
          </Bar.Section>
          {close ? (
            <Bar.Section align="end">
              <Button
                variant="ghost"
                {...buttonProps}
                data-scope="toast"
                data-part="close"
                aria-label={text.close}
                icon="close"
                iconOnly
                fullWidth={false}
                className="uf-toast-close"
                onClick={close}
              />
            </Bar.Section>
          ) : null}
        </Bar>
        {hasDescription ? (
          <Text
            data-scope="toast"
            data-part="description"
            id={`${id}-description`}
            as="div"
            variant="muted"
            className="uf-toast-description"
          >
            {description}
          </Text>
        ) : null}
        {hasSlotContent(action?.label) ? (
          <div className="uf-toast-actionRow">
            <Button
              variant="ghost"
              {...buttonProps}
              data-scope="toast"
              data-part="action"
              fullWidth={false}
              className="uf-toast-action"
              onClick={composeHandlers(action!.onClick, () => onClose?.())}
            >
              {action!.label}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
})

export type ToastPlacement =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end'

export interface ToasterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> {
  /** Viewport edge and side the stack sits at, newest toast nearest the edge; start and end follow the text direction. Default: bottom-center. */
  placement?: ToastPlacement
  /** Gives every toast a close button and closes the focused toast on Escape. Default: true. */
  closable?: boolean
  /** Name of each toast's close button; the region itself takes a native aria-label. */
  labels?: Partial<ToastLabels>
  /** Visual Button variant and style for every toast's action and close controls. */
  buttonProps?: ToastButtonProps
  /** Additional class name on the notification region. */
  className?: string
}

export interface UseToastReturn {
  /** Shows a toast, or updates the one with the same `id`; returns its id. */
  toast: (options: ToastOptions) => string
  /** Closes the toast with this id; an unknown id is ignored. */
  dismiss: (id: string) => void
}

export interface ToastContextValue {
  /** The toast and dismiss functions of this store, for code outside components. */
  toaster: UseToastReturn
  /** The same functions, for components. */
  useToast: () => UseToastReturn
  /** The region that shows this store's toasts; mount it once. */
  Toaster: ForwardRefExoticComponent<ToasterProps & RefAttributes<HTMLDivElement>>
}

/** An independent toast store with its own `toaster`, `useToast` and `<Toaster>`. */
export function createToastContext(options?: ToasterOptions): ToastContextValue {
  const store = createToaster(options)
  const toaster: UseToastReturn = { toast: store.toast, dismiss: store.dismiss }

  /** The notification region: a polite live region that stacks the visible toasts; hover and focus pause their timers. */
  const Toaster = forwardRef<HTMLDivElement, ToasterProps>(function Toaster(props, ref) {
    const { placement = 'bottom-center', closable = true, labels, buttonProps, className, onFocus, onPointerDown, ...rest } = props
    const shown = useSyncExternalStore(store.subscribe, store.getSnapshot, serverToasts)
    // Newest nearest the viewport edge, so the reading order matches what is seen.
    const toasts = /^top/.test(placement) ? [...shown].reverse() : shown
    const keys = toasts.map((toast) => toast.id)
    const regionRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(ref, regionRef)
    const scope = useFaceUiOverlayBoundary()?.scope
    const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null)
    useEffect(() => {
      const doc = regionRef.current?.ownerDocument
      if (!doc) return
      const sync = () => setModalTarget(activeModal(doc, scope))
      const unsubscribe = subscribeActiveModal(doc, sync)
      sync()
      return unsubscribe
    }, [scope])
    const previousKeys = useRef<readonly string[]>([])
    // Where focus came from when it entered the region, and whether a pointer was last used in it.
    const origin = useRef<HTMLElement | null>(null)
    const pointerUse = useRef(false)
    // Why the timers are paused: 'pointer' over a toast, 'focus' in the region, 'window' in the background.
    const holds = useRef(new Set<string>())
    const hold = (reason: string, on: boolean) => {
      if (on) holds.current.add(reason)
      else holds.current.delete(reason)
      if (holds.current.size) store.pause()
      else store.resume()
    }
    const holdFocus = () => {
      const region = regionRef.current
      hold('focus', !!region && region.contains(region.ownerDocument.activeElement))
    }

    // A toast closed from the keyboard hands focus to its neighbour, then back to where it came from.
    useFocusRecovery(regionRef, (lost) => {
      if (pointerUse.current) return null
      const id = lost.closest('[data-toast-id]')?.getAttribute('data-toast-id')
      const next = id == null ? null : nearest(previousKeys.current, keys, id)
      return (
        Array.from(regionRef.current!.children).find(
          (toast): toast is HTMLElement => toast.getAttribute('data-toast-id') === next,
        ) ?? origin.current
      )
    })
    useIsomorphicLayoutEffect(() => {
      previousKeys.current = keys
      // Removing the focused toast fires no focusout.
      holdFocus()
    })

    useEffect(() => {
      const region = regionRef.current!
      const doc = region.ownerDocument
      const view = doc.defaultView!
      const onPointerOver = (event: PointerEvent) =>
        hold('pointer', event.pointerType !== 'touch' && region.contains(event.target as Node))
      const onPointerOut = (event: PointerEvent) => {
        if (!event.relatedTarget) hold('pointer', false)
      }
      const onFocusOut = () => queueMicrotask(holdFocus)
      const onBlur = () => hold('window', true)
      const onWindowFocus = () => hold('window', false)
      const onKeyDown = (event: KeyboardEvent) => {
        pointerUse.current = false
        if (event.key !== 'F8' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        if (event.defaultPrevented || !region.firstElementChild) return
        event.preventDefault()
        region.focus({ preventScroll: true })
      }
      doc.addEventListener('pointerover', onPointerOver, true)
      doc.addEventListener('pointerout', onPointerOut, true)
      doc.addEventListener('focusin', holdFocus)
      doc.addEventListener('focusout', onFocusOut)
      doc.addEventListener('keydown', onKeyDown)
      view.addEventListener('blur', onBlur)
      view.addEventListener('focus', onWindowFocus)
      return () => {
        doc.removeEventListener('pointerover', onPointerOver, true)
        doc.removeEventListener('pointerout', onPointerOut, true)
        doc.removeEventListener('focusin', holdFocus)
        doc.removeEventListener('focusout', onFocusOut)
        doc.removeEventListener('keydown', onKeyDown)
        view.removeEventListener('blur', onBlur)
        view.removeEventListener('focus', onWindowFocus)
        holds.current.clear()
        store.resume()
      }
    }, [modalTarget])

    const region = (
      <div
        aria-label={defaultRootLabels.region}
        tabIndex={-1}
        {...rest}
        ref={composedRef}
        role="region"
        aria-live="polite"
        data-scope="toast"
        data-part="group"
        data-placement={placement}
        className={cn('uf-toaster', className)}
        onFocus={composeHandlers(onFocus, (event) => {
          // Focus recovered after a toast was removed comes from nowhere and keeps the origin.
          const from = event.relatedTarget as HTMLElement | null
          if (from && isAvailable(from) && from !== from.ownerDocument.body && !event.currentTarget.contains(from))
            origin.current = from
        })}
        onPointerDown={composeHandlers(onPointerDown, () => {
          pointerUse.current = true
        })}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            data-toast-id={toast.id}
            tabIndex={0}
            title={toast.title}
            description={toast.description}
            tone={toast.tone}
            action={toast.action}
            closable={closable}
            labels={labels}
            buttonProps={buttonProps}
            onClose={() => store.dismiss(toast.id)}
          />
        ))}
      </div>
    )
    // A modal makes sibling content inert. Put the same live region and its
    // controls inside that modal so announcements and F8 remain available.
    return modalTarget ? createPortal(region, modalTarget) : region
  })

  return { toaster, useToast: () => toaster, Toaster }
}

const shared = createToastContext()

/** Shows and dismisses toasts in the app's `<Toaster>`. */
export const useToast = shared.useToast

/** The app's notification region; mount it once, near the document root: it is `position: fixed`, so a transformed ancestor becomes its containing block. */
export const Toaster = shared.Toaster
