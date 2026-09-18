import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { getFocusableElements, registerLayer } from '../../runtime/layers'

interface LayerOptions {
  enabled: boolean
  contentRef: RefObject<HTMLElement | null>
  triggerRef?: RefObject<HTMLElement | null>
  modal?: boolean
  autoFocus?: boolean
  initialFocus?: () => HTMLElement | null
  restoreFocus?: boolean
  onEscape?: (event: KeyboardEvent) => void
  onOutside?: (event: Event) => void
}
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useLayer(options: LayerOptions) {
  const latest = useRef(options)
  useCommitEffect(() => {
    latest.current = options
  })
  const { enabled, modal, contentRef } = options
  useEffect(() => {
    if (!enabled) return
    const content = contentRef.current
    if (!content) return
    const doc = content.ownerDocument
    const previous = doc.activeElement as HTMLElement | null
    const unregister = registerLayer(doc, {
      elements: () => [
        contentRef.current,
        latest.current.triggerRef?.current ?? null,
      ],
      modal: modal ? () => contentRef.current : undefined,
      onEscape: (event) => latest.current.onEscape?.(event),
      onOutside: (event) => latest.current.onOutside?.(event),
    })
    if (latest.current.autoFocus)
      (
        latest.current.initialFocus?.() ??
        getFocusableElements(content)[0] ??
        content
      ).focus({
        preventScroll: true,
      })
    return () => {
      const active = doc.activeElement
      const shouldRestore = active === doc.body || content.contains(active)
      unregister()
      const trigger = latest.current.triggerRef?.current
      const returnTo = trigger
        ? trigger.tabIndex >= 0
          ? trigger
          : (getFocusableElements(trigger)[0] ?? previous)
        : previous
      if (
        latest.current.restoreFocus &&
        shouldRestore &&
        returnTo?.isConnected &&
        !returnTo.closest('[inert]')
      )
        returnTo.focus({ preventScroll: true })
    }
  }, [enabled, modal, contentRef])
}
