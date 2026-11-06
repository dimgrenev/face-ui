/** Row placement uses measured geometry, including the surface's real padding. */
export function alignFloatingOption(params: {
  triggerCenter: number
  contentHeight: number
  minimumTop: number
  maximumTop: number
  optionCenterOffsets: readonly number[]
}): number {
  const { triggerCenter, contentHeight, minimumTop, maximumTop, optionCenterOffsets } = params
  const maxTop = Math.max(minimumTop, maximumTop)
  const clamp = (top: number) => Math.max(minimumTop, Math.min(maxTop, top))
  const centered = triggerCenter - contentHeight / 2
  const preferred = clamp(centered)
  let nearest = preferred
  let distance = Infinity
  for (const offset of optionCenterOffsets) {
    if (!Number.isFinite(offset)) continue
    const top = triggerCenter - offset
    // Pick an actual row without moving the surface outside its allowed region.
    if (top < minimumTop || top > maxTop) continue
    // At an edge, face the first/last row rather than centering the clamped
    // surface and accidentally facing its second or penultimate row.
    const nextDistance = centered < minimumTop
      ? offset
      : centered > maxTop
        ? contentHeight - offset
        : Math.abs(top - preferred)
    if (nextDistance < distance) {
      nearest = top
      distance = nextDistance
    }
  }
  return nearest
}

/** Visible option centers relative to the outer positioning boundary. */
export function readFloatingOptionCenters(content: HTMLElement, selector: string): number[] {
  let rows: NodeListOf<HTMLElement>
  try { rows = content.querySelectorAll<HTMLElement>(selector) } catch { return [] }
  const bounds = content.getBoundingClientRect()
  const view = content.ownerDocument.defaultView
  if (!view) return []
  return Array.from(rows).flatMap((row) => {
    const rect = row.getBoundingClientRect()
    if (rect.height <= 0 || rect.width <= 0) return []
    let top = bounds.top, bottom = bounds.bottom
    for (let parent = row.parentElement; parent && content.contains(parent); parent = parent.parentElement) {
      const overflow = view.getComputedStyle(parent).overflowY
      if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden' || overflow === 'clip') {
        const clip = parent.getBoundingClientRect()
        top = Math.max(top, clip.top)
        bottom = Math.min(bottom, clip.bottom)
      }
      if (parent === content) break
    }
    // Partly clipped options must not become the row facing the selector.
    if (rect.top < top - 1 / 64 || rect.bottom > bottom + 1 / 64) return []
    return [rect.top + rect.height / 2 - bounds.top]
  })
}
