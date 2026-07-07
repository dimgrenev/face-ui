import { useEffect } from 'react'

type DismissRef = {
  readonly current: Element | null
}

export interface UseDismissOutsideOptions {
  enabled: boolean
  refs: ReadonlyArray<DismissRef>
  onDismiss: (event: Event) => void
  events?: ReadonlyArray<'pointerdown' | 'mousedown' | 'click'>
}

const DEFAULT_DISMISS_OUTSIDE_EVENTS = ['pointerdown', 'mousedown', 'click'] as const

function getOwnerDocument(refs: ReadonlyArray<DismissRef>): Document | null {
  for (const ref of refs) {
    const ownerDocument = ref.current?.ownerDocument
    if (ownerDocument) return ownerDocument
  }
  return typeof document === 'undefined' ? null : document
}

function isEventInsideRef(event: Event, ref: DismissRef): boolean {
  const node = ref.current
  if (!node) return false

  const target = event.target as Node | null
  if (target && node.contains(target)) return true

  const path = typeof event.composedPath === 'function'
    ? event.composedPath()
    : []
  return path.includes(node)
}

export function useDismissOutside(options: UseDismissOutsideOptions): void {
  const { enabled, refs, onDismiss, events = DEFAULT_DISMISS_OUTSIDE_EVENTS } = options

  useEffect(() => {
    if (!enabled) return undefined

    const ownerDocument = getOwnerDocument(refs)
    if (!ownerDocument) return undefined

    const handleDismissEvent = (event: Event) => {
      if (refs.some((ref) => isEventInsideRef(event, ref))) return
      onDismiss(event)
    }

    for (const eventName of events) {
      ownerDocument.addEventListener(eventName, handleDismissEvent, true)
    }

    return () => {
      for (const eventName of events) {
        ownerDocument.removeEventListener(eventName, handleDismissEvent, true)
      }
    }
  }, [enabled, events, onDismiss, refs])
}
