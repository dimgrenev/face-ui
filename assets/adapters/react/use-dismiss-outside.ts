import { useEffect, useRef } from 'react'
import { registerLayer } from '../../runtime/layers'

type DismissRef = { readonly current: Element | null }
export interface UseDismissOutsideOptions {
  enabled: boolean
  refs: ReadonlyArray<DismissRef>
  onDismiss: (event: Event) => void
  events?: ReadonlyArray<'pointerdown' | 'mousedown' | 'click'>
}

/** @deprecated Use useLayer to compose focus containment and dismissal in one layer. */
export function useDismissOutside(options: UseDismissOutsideOptions): void {
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })
  useEffect(() => {
    if (!options.enabled) return
    const doc = options.refs.find((ref) => ref.current)?.current?.ownerDocument
    if (!doc) return
    return registerLayer(doc, {
      elements: () => latest.current.refs.map((ref) => ref.current),
      onOutside: (event) => {
        const events = latest.current.events
        if (
          !events ||
          events.includes(event.type as 'click') ||
          (event.type === 'pointerdown' && events.includes('mousedown'))
        )
          latest.current.onDismiss(event)
      },
    })
  }, [options.enabled])
}
