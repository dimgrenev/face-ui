import { useState, type CSSProperties } from 'react'
import { useFaceUiOverlayBoundary } from './overlay-context'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

interface Frame {
  top: number
  left: number
  width: number
  height: number
}

const positionedRoots = new WeakMap<HTMLElement, { count: number; restore: () => void }>()

/** An absolutely placed fallback needs the instance root as its containing block. */
export function useOverlayRootPosition(root: HTMLElement | null | undefined, enabled: boolean) {
  useIsomorphicLayoutEffect(() => {
    if (!enabled || !root) return
    let position = positionedRoots.get(root)
    if (!position) {
      const style = root.style
      const value = style.getPropertyValue('position')
      const priority = style.getPropertyPriority('position')
      const changed = root.ownerDocument.defaultView?.getComputedStyle(root).position === 'static'
      if (changed) style.setProperty('position', 'relative')
      position = {
        count: 0,
        restore: () => {
          if (!changed) return
          if (value) style.setProperty('position', value, priority)
          else style.removeProperty('position')
        },
      }
      positionedRoots.set(root, position)
    }
    position.count++
    return () => {
      if (--position.count) return
      position.restore()
      positionedRoots.delete(root)
    }
  }, [root, enabled])
}

/** Pins a portaled modal to its instance rather than the entire viewport. */
export function useOverlayFrame(enabled: boolean): CSSProperties | undefined {
  const scopeRoot = useFaceUiOverlayBoundary()?.scopeRoot
  const root = enabled ? scopeRoot : null
  const [frame, setFrame] = useState<Frame | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (!root) return
    const update = () => {
      const { top, left, width, height } = root.getBoundingClientRect()
      setFrame((previous) =>
        previous?.top === top && previous.left === left &&
        previous.width === width && previous.height === height
          ? previous
          : { top, left, width, height },
      )
    }
    update()
    const view = root.ownerDocument.defaultView
    const observer = view?.ResizeObserver ? new view.ResizeObserver(update) : null
    observer?.observe(root)
    view?.addEventListener('resize', update)
    view?.addEventListener('scroll', update, true)
    return () => {
      observer?.disconnect()
      view?.removeEventListener('resize', update)
      view?.removeEventListener('scroll', update, true)
    }
  }, [root])

  if (!root) return undefined
  // The layout effect measures before paint. Keep a newly scoped surface
  // hidden until its first measurement instead of flashing over the page.
  if (!frame) return { visibility: 'hidden' }
  return {
    inset: 'auto',
    top: frame.top,
    left: frame.left,
    width: frame.width,
    height: frame.height,
    '--uf-modal-frame-width': `${frame.width}px`,
    '--uf-modal-frame-height': `${frame.height}px`,
  } as CSSProperties
}
