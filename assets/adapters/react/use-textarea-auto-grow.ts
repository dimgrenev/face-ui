import { useCallback, type RefObject } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

/** Native intrinsic sizing where available; measure only for older browsers. */
export function useTextareaAutoGrow(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  enabled: boolean,
) {
  const measure = useCallback(() => {
    const field = ref.current
    if (!enabled || field?.tagName !== 'TEXTAREA') return
    const view = field.ownerDocument.defaultView
    if (!view || view.CSS?.supports('field-sizing', 'content')) return
    const style = view.getComputedStyle(field)
    const border =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const minimum = parseFloat(style.minHeight) || 0
    field.style.height = 'auto'
    field.style.height = `${Math.max(minimum, field.scrollHeight + border)}px`
  }, [enabled, ref])

  // The committed value includes typing, controlled updates, clearing and reset.
  useIsomorphicLayoutEffect(measure)
  useIsomorphicLayoutEffect(() => {
    const field = ref.current
    if (!enabled || field?.tagName !== 'TEXTAREA') return
    const view = field.ownerDocument.defaultView
    if (!view || view.CSS?.supports('field-sizing', 'content')) return
    field.style.setProperty('field-sizing', 'fixed')
    let width = field.clientWidth
    let frame = 0
    const observer = view.ResizeObserver
      ? new view.ResizeObserver(() => {
          if (field.clientWidth === width) return
          width = field.clientWidth
          // A size write inside observer delivery creates an undelivered resize
          // notification in WebKit. Measure at the next frame, after layout settles.
          view.cancelAnimationFrame(frame)
          frame = view.requestAnimationFrame(measure)
        })
      : undefined
    observer?.observe(field)
    const fonts = field.ownerDocument.fonts
    fonts?.addEventListener('loadingdone', measure)
    view.addEventListener('resize', measure)
    measure()
    return () => {
      observer?.disconnect()
      view.cancelAnimationFrame(frame)
      fonts?.removeEventListener('loadingdone', measure)
      view.removeEventListener('resize', measure)
      field.style.removeProperty('height')
      field.style.removeProperty('field-sizing')
    }
  }, [enabled, measure, ref])
}
