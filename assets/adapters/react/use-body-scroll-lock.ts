import { useEffect } from 'react'
import { useFaceUiOverlayBoundary } from './overlay-context'

const locks = new WeakMap<Document, { count: number; restore: () => void }>()
const scopeLocks = new WeakMap<HTMLElement, { count: number; restore: () => void }>()

/**
 * Stops document scrolling until every owner has released it, so nested
 * surfaces may close in any order. The removed scrollbar's width is padded on
 * the side it occupied (the left in some RTL documents): nothing shifts.
 */
export function acquireBodyScrollLock(doc: Document): () => void {
  let lock = locks.get(doc)
  if (!lock) {
    const { body, documentElement: root } = doc
    const style = body.style
    const view = doc.defaultView
    // clientWidth is 0 without layout (jsdom): there is no scrollbar to measure.
    const gutter =
      view && root.clientWidth
        ? Math.max(0, view.innerWidth - root.clientWidth)
        : 0
    const side =
      gutter && Math.round(root.getBoundingClientRect().left) + root.scrollLeft
        ? 'padding-left'
        : 'padding-right'
    const previous = (['overflow', side] as const).map((name) => ({
      name,
      value: style.getPropertyValue(name),
      priority: style.getPropertyPriority(name),
    }))
    const padding = gutter
      ? parseFloat(view!.getComputedStyle(body).getPropertyValue(side)) || 0
      : 0
    style.setProperty('overflow', 'hidden')
    if (gutter) style.setProperty(side, `${padding + gutter}px`)
    lock = {
      count: 0,
      restore: () => {
        for (const { name, value, priority } of previous) {
          if (value) style.setProperty(name, value, priority)
          else style.removeProperty(name)
        }
      },
    }
    locks.set(doc, lock)
  }
  lock.count++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--lock.count !== 0) return
    lock.restore()
    locks.delete(doc)
  }
}

/** Locks only the host instance; sibling providers retain their own scrolling. */
function acquireScopeScrollLock(root: HTMLElement): () => void {
  let lock = scopeLocks.get(root)
  if (!lock) {
    const style = root.style
    const value = style.getPropertyValue('overflow')
    const priority = style.getPropertyPriority('overflow')
    style.setProperty('overflow', 'hidden')
    lock = {
      count: 0,
      restore: () => {
        if (value) style.setProperty('overflow', value, priority)
        else style.removeProperty('overflow')
      },
    }
    scopeLocks.set(root, lock)
  }
  lock.count++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--lock.count !== 0) return
    lock.restore()
    scopeLocks.delete(root)
  }
}

/** Holds a scroll lock while `locked` is true, within the provider when present. */
export function useBodyScrollLock(locked: boolean) {
  const overlay = useFaceUiOverlayBoundary()
  useEffect(() => {
    if (!locked) return
    if (overlay?.scopeRoot) return acquireScopeScrollLock(overlay.scopeRoot)
    if (typeof document !== 'undefined') return acquireBodyScrollLock(document)
  }, [locked, overlay?.scope, overlay?.scopeRoot])
}
