import type { MouseEvent, ReactNode } from 'react'
import { readNumber } from '../assets/runtime/props'

export type ToastTone = 'neutral' | 'positive' | 'warning' | 'destructive'

export interface ToastAction {
  /** Text of the button under the toast's text. */
  label: ReactNode
  /** Runs on click, then the toast closes unless the handler calls `event.preventDefault()`. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

export interface ToastOptions {
  /** Updates the toast with this id in place, content and timer, if it is still there; `toast()` returns the id. */
  id?: string
  /** Main line of the notification, in bold. */
  title: ReactNode
  /** Supporting text under the title. */
  description?: ReactNode
  /** Border color: neutral, positive, warning or destructive; every tone is announced as a polite status. */
  tone?: ToastTone
  /** A button under the text; clicking it runs its onClick and closes the toast. */
  action?: ToastAction
  /** Milliseconds the toast stays on screen, pauses not counted; 0 keeps it until it is closed. */
  duration?: number
}

export interface ToasterOptions {
  /** How many of the newest toasts are shown; older ones wait with their time stopped. Default: 3. */
  maxVisible?: number
  /** Milliseconds a toast without its own `duration` stays on screen; 0 keeps toasts until closed. Default: 5000. */
  duration?: number
}

/** A toast in the store: its options with the id `toast()` returned and the duration it runs for. */
export type ToastRecord = ToastOptions & { readonly id: string; readonly duration: number }

/** The longest delay setTimeout honours; a longer one fires at once. */
const MAX_DELAY = 2_147_483_647
const NONE: readonly ToastRecord[] = []
let created = 0

/** Server render and hydration show no toasts: the store is per page, not per request. */
export const serverToasts = () => NONE

/**
 * The store behind one `<Toaster>`: toasts in the order they were shown, the newest `maxVisible`
 * visible. A toast's timer runs only while it is visible and the store is not paused, so a pause
 * or a wait behind newer toasts keeps the time it has left.
 */
export function createToaster(options: ToasterOptions = {}) {
  const maxVisible = readNumber('Toast', 'maxVisible', options.maxVisible, 3, { integer: true, min: 1 })
  const fallback = readNumber('Toast', 'duration', options.duration, 5000, { min: 0, max: MAX_DELAY })
  const clocks = new Map<string, { left: number; since: number; timer?: ReturnType<typeof setTimeout> }>()
  const listeners = new Set<() => void>()
  let toasts = NONE
  let visible = NONE
  let paused = false

  function schedule() {
    const now = Date.now()
    for (const toast of toasts) {
      const clock = clocks.get(toast.id)!
      const run = !paused && toast.duration > 0 && visible.includes(toast)
      if (run && clock.timer === undefined) {
        clock.since = now
        clock.timer = setTimeout(() => dismiss(toast.id), clock.left)
      } else if (!run && clock.timer !== undefined) {
        clearTimeout(clock.timer)
        clock.timer = undefined
        clock.left = Math.max(0, clock.left - (now - clock.since))
      }
    }
  }

  function commit(next: readonly ToastRecord[]) {
    toasts = next
    visible = next.length > maxVisible ? next.slice(-maxVisible) : next
    schedule()
    for (const listener of [...listeners]) listener()
  }

  function dismiss(id: string) {
    const clock = clocks.get(id)
    if (!clock) return
    clearTimeout(clock.timer)
    clocks.delete(id)
    commit(toasts.filter((toast) => toast.id !== id))
  }

  return {
    /** Shows a toast, or updates the one with the same `id`; returns its id. */
    toast(options: ToastOptions): string {
      const id = options.id || `toast-${++created}`
      const duration = readNumber('Toast', 'duration', options.duration, fallback, { min: 0, max: MAX_DELAY })
      const record: ToastRecord = { ...options, id, duration }
      const shown = clocks.get(id)
      clearTimeout(shown?.timer)
      clocks.set(id, { left: duration, since: 0 })
      commit(shown ? toasts.map((toast) => (toast.id === id ? record : toast)) : [...toasts, record])
      return id
    },
    /** Closes the toast with this id; an unknown id is ignored. */
    dismiss,
    /** Stops every running timer, keeping the time each toast has left. */
    pause() {
      if (paused) return
      paused = true
      schedule()
    },
    /** Restarts the timers of the visible toasts with the time they have left. */
    resume() {
      if (!paused) return
      paused = false
      schedule()
    },
    /** Calls `listener` after every change to the toasts. */
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    /** The visible toasts, oldest first; the same array until the toasts change. */
    getSnapshot: () => visible,
  }
}
