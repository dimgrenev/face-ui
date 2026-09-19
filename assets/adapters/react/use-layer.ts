import { useEffect, useRef, type RefObject } from 'react'
import {
  getFocusableElements,
  isAvailable,
  layerContains,
  registerLayer,
  restoreFocus,
  type Layer,
} from '../../runtime/layers'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

interface LayerOptions {
  /** Registers the layer while true; turning it off is a close. */
  enabled: boolean
  /** The layer's surface. */
  contentRef: RefObject<HTMLElement | null>
  /** Counts as inside the layer and receives focus back on close. */
  triggerRef?: RefObject<HTMLElement | null>
  /** Makes everything below inert and keeps Tab inside the surface. */
  modal?: boolean
  /** On open, moves focus in unless it is already inside: `[data-autofocus]`, `initialFocus()`, the first tabbable, the surface. */
  autoFocus?: boolean
  /** The component's own initial focus target, tried after `[data-autofocus]`. */
  initialFocus?: () => HTMLElement | null
  /** On close, returns focus to the trigger if the layer owned it; a non-modal layer dismissed by an outside press does not. */
  restoreFocus?: boolean
  /** Escape while this layer is the top of the stack. */
  onEscape?: (event: KeyboardEvent) => void
  /** A press outside this layer and every layer above it. */
  onOutside?: (event: Event) => void
}

/** Registers a dismissable layer in the document stack and owns its focus on open and close. */
export function useLayer(options: LayerOptions) {
  const latest = useRef(options)
  useIsomorphicLayoutEffect(() => {
    latest.current = options
  })
  const { enabled, modal, contentRef } = options
  useEffect(() => {
    if (!enabled) return
    const content = contentRef.current
    if (!content) return
    const doc = content.ownerDocument
    const opener = doc.activeElement as HTMLElement | null
    let outside = false
    const layer: Layer = {
      elements: () => [
        contentRef.current,
        latest.current.triggerRef?.current ?? null,
      ],
      modal: modal ? () => contentRef.current : undefined,
      onEscape: (event) => latest.current.onEscape?.(event),
      onOutside: (event) => {
        outside = true
        latest.current.onOutside?.(event)
      },
    }
    const unregister = registerLayer(doc, layer)
    // Focus a descendant already took (a child effect, native autoFocus) wins.
    if (latest.current.autoFocus && !content.contains(doc.activeElement))
      for (const target of [
        ...content.querySelectorAll<HTMLElement>('[data-autofocus]'),
        latest.current.initialFocus?.(),
        getFocusableElements(content)[0],
        content,
      ]) {
        if (!target || !isAvailable(target)) continue
        target.focus({ preventScroll: true })
        if (doc.activeElement === target) break
      }
    // The layer owns focus while the last focus move landed inside it or in a
    // layer nested in it; focus lost to <body> afterwards stays owned.
    let owned = layerContains(layer, doc.activeElement)
    const track = () => {
      owned = layerContains(layer, doc.activeElement)
      if (owned) outside = false
    }
    doc.addEventListener('focusin', track)
    return () => {
      doc.removeEventListener('focusin', track)
      const restore =
        latest.current.restoreFocus && owned && (modal || !outside)
      unregister()
      const trigger = latest.current.triggerRef?.current
      const previous = opener && !content.contains(opener) ? opener : null
      const returnTo = trigger
        ? trigger.tabIndex >= 0
          ? trigger
          : (getFocusableElements(trigger)[0] ?? previous)
        : previous
      if (restore && returnTo && isAvailable(returnTo)) restoreFocus(returnTo)
    }
  }, [enabled, modal, contentRef])
}
