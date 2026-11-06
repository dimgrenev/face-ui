const cache = new WeakMap<HTMLElement, Map<string, { context: string; value: number | null }>>()

/** Resolve a custom property's CSS length, including calc(), in its owner's context. */
export function readCssLength(element: HTMLElement, property: string): number | null {
  const view = element.ownerDocument.defaultView
  if (!view) return null
  const style = view.getComputedStyle(element)
  const value = style.getPropertyValue(property).trim()
  if (!value) return null
  const pixels = /^(-?(?:\d+\.?\d*|\.\d+))px$/.exec(value)
  if (pixels) return Number(pixels[1])
  if (value === '0') return 0
  const root = view.getComputedStyle(element.ownerDocument.documentElement)
  const context = [value, style.font, style.lineHeight, root.font, root.lineHeight,
    view.innerWidth, view.innerHeight, value.includes('%') ? element.parentElement?.clientWidth : ''].join('|')
  let properties = cache.get(element)
  const previous = properties?.get(property)
  if (previous?.context === context) return previous.value
  if (!properties) { properties = new Map(); cache.set(element, properties) }
  const probe = element.ownerDocument.createElement('span')
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: value,
    height: '0',
    minWidth: '0',
    maxWidth: 'none',
    padding: '0',
    border: '0',
    boxSizing: 'content-box',
  })
  if (!probe.style.width) { properties.set(property, { context, value: null }); return null }
  element.appendChild(probe)
  try {
    const resolved = Number.parseFloat(view.getComputedStyle(probe).width)
    const result = Number.isFinite(resolved) ? resolved : null
    properties.set(property, { context, value: result })
    return result
  } finally {
    probe.remove()
  }
}
