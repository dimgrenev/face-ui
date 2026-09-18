import { useEffect } from 'react'

const locks = new WeakMap<Document, { count: number; restore: () => void }>()

/** Shared ownership allows nested surfaces to close in any order. */
export function acquireBodyScrollLock(doc: Document): () => void {
  let lock = locks.get(doc)
  if (!lock) {
    const style = doc.body.style
    const properties = ['overflow', 'padding-right'] as const
    const previous = properties.map((name) => [
      name,
      style.getPropertyValue(name),
      style.getPropertyPriority(name),
    ])
    const view = doc.defaultView
    const compensation = view
      ? Math.max(0, view.innerWidth - doc.documentElement.clientWidth)
      : 0
    const padding = view
      ? parseFloat(view.getComputedStyle(doc.body).paddingRight) || 0
      : 0
    style.setProperty('overflow', 'hidden')
    if (compensation > 0)
      style.setProperty('padding-right', `${padding + compensation}px`)
    lock = {
      count: 0,
      restore: () => {
        for (const [name, value, priority] of previous) {
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

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return
    return acquireBodyScrollLock(document)
  }, [locked])
}
