/**
 * @face-ui/core — Toast Machine
 *
 * Manages a queue of toast notifications with auto-remove timers.
 *
 * Also exports a standalone `createToaster()` function that provides
 * an imperative API: toast(opts), dismiss(id).
 */

import { createMachine, interpret } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineService } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const toastAnatomy = createAnatomy('toast').parts(
  'root',
  'title',
  'description',
  'action',
  'close',
)

// ---------------------------------------------------------------------------
// Toast Item
// ---------------------------------------------------------------------------

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastAction {
  label: string
  onClick?: () => void
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  action?: ToastAction
  variant: ToastVariant
  duration?: number
  createdAt: number
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface ToastContext {
  [key: string]: unknown
  toasts: ToastItem[]
  maxVisible: number
  defaultDuration: number
  _timerMap: Map<string, ReturnType<typeof setTimeout>>
  onToastsChange: ((details: { toasts: ToastItem[] }) => void) | null
}

type ToastState = 'idle' | 'active'

type ToastEvent =
  | { type: 'ADD'; toast: Omit<ToastItem, 'createdAt'> }
  | { type: 'REMOVE'; id: string }
  | { type: 'PAUSE'; id: string }
  | { type: 'RESUME'; id: string }

export interface ToastSchema extends MachineSchema {
  context: ToastContext
  state: ToastState
  event: ToastEvent
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const addToast = (ctx: ToastContext, event: ToastEvent): void => {
  const { toast } = event as { type: 'ADD'; toast: Omit<ToastItem, 'createdAt'> }
  const item: ToastItem = {
    ...toast,
    createdAt: Date.now(),
  }

  ctx.toasts = [...ctx.toasts, item]

  // Trim to maxVisible (remove oldest beyond limit)
  if (ctx.toasts.length > ctx.maxVisible) {
    const removed = ctx.toasts.slice(0, ctx.toasts.length - ctx.maxVisible)
    ctx.toasts = ctx.toasts.slice(ctx.toasts.length - ctx.maxVisible)
    // Clear timers for removed toasts
    for (const r of removed) {
      const timer = ctx._timerMap.get(r.id)
      if (timer !== undefined) {
        clearTimeout(timer)
        ctx._timerMap.delete(r.id)
      }
    }
  }
}

const removeToast = (ctx: ToastContext, event: ToastEvent): void => {
  const { id } = event as { type: 'REMOVE'; id: string }
  ctx.toasts = ctx.toasts.filter((t) => t.id !== id)
  const timer = ctx._timerMap.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    ctx._timerMap.delete(id)
  }
}

const pauseToast = (ctx: ToastContext, event: ToastEvent): void => {
  const { id } = event as { type: 'PAUSE'; id: string }
  const timer = ctx._timerMap.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    ctx._timerMap.delete(id)
  }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const toastMachine = createMachine<ToastSchema>({
  id: 'toast',
  initial: 'idle',

  context: {
    toasts: [],
    maxVisible: 3,
    defaultDuration: 5000,
    _timerMap: new Map(),
    onToastsChange: null,
  },

  computed: {
    count: (ctx) => ctx.toasts.length,
    visibleToasts: (ctx) => ctx.toasts.slice(-ctx.maxVisible),
    hasToasts: (ctx) => ctx.toasts.length > 0,
  },

  watch: {
    toasts: (ctx) => {
      ctx.onToastsChange?.({ toasts: ctx.toasts })
    },
  },

  states: {
    idle: {
      on: {
        ADD: {
          target: 'active',
          actions: [addToast],
        },
      },
    },

    active: {
      effects: ['autoRemoveTimers'],
      on: {
        ADD: {
          actions: [addToast],
        },
        REMOVE: [
          {
            target: 'idle',
            actions: [removeToast],
            guard: (ctx, event) => {
              const { id } = event as { type: 'REMOVE'; id: string }
              // Will become idle if this is the last toast
              return ctx.toasts.length === 1 && ctx.toasts[0].id === id
            },
          },
          {
            actions: [removeToast],
          },
        ],
        PAUSE: {
          actions: [pauseToast],
        },
        RESUME: {
          // Resume triggers the autoRemoveTimers effect to restart
          // by causing a re-evaluation. The effect itself sets up timers
          // for toasts that don't have active timers.
        },
      },
    },
  },

  implementations: {
    effects: {
      autoRemoveTimers: (ctx, send) => {
        // Set up auto-remove timers for all toasts that don't have one
        for (const toast of ctx.toasts) {
          if (ctx._timerMap.has(toast.id)) continue

          const duration = toast.duration ?? ctx.defaultDuration
          if (duration <= 0) continue

          const elapsed = Date.now() - toast.createdAt
          const remaining = Math.max(0, duration - elapsed)

          const timer = setTimeout(() => {
            ctx._timerMap.delete(toast.id)
            send({ type: 'REMOVE', id: toast.id })
          }, remaining)

          ctx._timerMap.set(toast.id, timer)
        }

        return () => {
          // Clean up all timers on exit
          for (const [id, timer] of ctx._timerMap) {
            clearTimeout(timer)
            ctx._timerMap.delete(id)
          }
        }
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export interface ToastConnectState {
  value: ToastState
  context: ToastContext
  computed: Record<string, unknown>
  matches: (...states: ToastState[]) => boolean
}

export function connectToast(
  state: ToastConnectState,
  send: (event: ToastEvent | ToastEvent['type']) => void,
) {
  const { context: ctx, computed } = state
  const visibleToasts = computed['visibleToasts'] as ToastItem[]
  const attrs = toastAnatomy.getPartAttrs

  return {
    getGroupProps() {
      return {
        ...attrs('root'),
        role: 'region',
        'aria-label': 'Notifications',
        'aria-live': 'polite' as const,
        'data-count': ctx.toasts.length,
      }
    },

    getToastProps(toast: ToastItem) {
      return {
        ...attrs('root'),
        role: 'status',
        'aria-atomic': true,
        'data-state': 'active',
        'data-variant': toast.variant,
        'data-toast-id': toast.id,

        onPointerEnter() {
          send({ type: 'PAUSE', id: toast.id })
        },

        onPointerLeave() {
          send({ type: 'RESUME', id: toast.id })
        },
      }
    },

    getTitleProps() {
      return {
        ...attrs('title'),
      }
    },

    getDescriptionProps() {
      return {
        ...attrs('description'),
      }
    },

    getActionProps() {
      return {
        ...attrs('action'),
        type: 'button' as const,
      }
    },

    getCloseProps(id: string) {
      return {
        ...attrs('close'),
        type: 'button' as const,
        'aria-label': 'Close notification',
        onClick() {
          send({ type: 'REMOVE', id })
        },
      }
    },

    /** Visible toasts (respects maxVisible) */
    visibleToasts,
  }
}

// ---------------------------------------------------------------------------
// Standalone Toaster
// ---------------------------------------------------------------------------

let toasterCounter = 0

export interface Toaster {
  toast: (opts: {
    title: string
    description?: string
    action?: ToastAction
    variant?: ToastVariant
    duration?: number
  }) => string
  dismiss: (id: string) => void
  subscribe: MachineService<ToastSchema>['subscribe']
  getSnapshot: MachineService<ToastSchema>['getSnapshot']
}

export function createToaster(options?: {
  maxVisible?: number
  defaultDuration?: number
}): Toaster {
  const overrides: Partial<ToastContext> = {
    maxVisible: options?.maxVisible ?? 3,
    defaultDuration: options?.defaultDuration ?? 5000,
    _timerMap: new Map(),
  }
  const service = interpret<ToastSchema>(toastMachine, overrides).start()

  return {
    toast(opts) {
      toasterCounter += 1
      const id = `toast-${toasterCounter}-${Date.now()}`
      const toastItem: Omit<ToastItem, 'createdAt'> = {
        id,
        title: opts.title,
        description: opts.description,
        action: opts.action,
        variant: opts.variant ?? 'default',
        duration: opts.duration,
      }
      service.send({ type: 'ADD', toast: toastItem } as ToastEvent)
      return id
    },

    dismiss(id: string) {
      service.send({ type: 'REMOVE', id } as ToastEvent)
    },

    subscribe: service.subscribe,
    getSnapshot: service.getSnapshot,
  }
}
