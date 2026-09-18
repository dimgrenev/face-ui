export interface Layer {
  /** Elements that count as inside the layer: its surface, then its trigger. */
  elements: () => Array<Element | null>
  /** The surface of a modal layer: content below it becomes inert and Tab stays inside. */
  modal?: () => HTMLElement | null
  /** Escape pressed while this layer is the top of the stack. */
  onEscape?: (event: KeyboardEvent) => void
  /** A press outside this layer and every layer above it, down to the nearest modal layer. */
  onOutside?: (event: Event) => void
}

const documents = new WeakMap<
  Document,
  { layers: Layer[]; update: () => void }
>()

/** Available elements in `container` that are in the tab order, in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]',
    ),
  ).filter((node) => node.tabIndex >= 0 && isAvailable(node))
}

/** True when `node` is connected, enabled and rendered: it can hold focus, whatever its tab order. */
export function isAvailable(node: HTMLElement): boolean {
  if (
    !node.isConnected ||
    node.matches(':disabled, input[type="hidden"]') ||
    node.closest('[hidden], [inert], [aria-hidden="true"]')
  )
    return false
  const view = node.ownerDocument.defaultView
  for (let el: Element | null = node; el; el = el.parentElement) {
    const style = view?.getComputedStyle(el)
    if (
      style?.display === 'none' ||
      style?.visibility === 'hidden' ||
      style?.visibility === 'collapse'
    )
      return false
  }
  return true
}

/** One event owner per document. Nested portals participate in the same stack. */
export function registerLayer(doc: Document, layer: Layer): () => void {
  let state = documents.get(doc)
  let teardown: (() => void) | undefined
  if (!state) {
    const layers: Layer[] = []
    const focused = new WeakMap<
      HTMLElement,
      { element: HTMLElement; root: HTMLElement }
    >()
    const inert = new Map<Element, string | null>()
    const restoreInert = () => {
      for (const [node, value] of inert) {
        if (value === null) node.removeAttribute('inert')
        else node.setAttribute('inert', value)
      }
      inert.clear()
    }
    const update = () => {
      restoreInert()
      let modalIndex = -1
      for (let i = 0; i < layers.length; i++)
        if (layers[i].modal?.()) modalIndex = i
      if (modalIndex < 0) return
      const allowed = [
        layers[modalIndex].modal!()!,
        ...layers
          .slice(modalIndex + 1)
          .flatMap((entry) => entry.elements())
          .filter((node): node is Element => !!node),
      ]
      const visit = (parent: Element) => {
        for (const child of Array.from(parent.children)) {
          if (allowed.includes(child)) continue
          if (allowed.some((node) => child.contains(node))) visit(child)
          else {
            inert.set(child, child.getAttribute('inert'))
            child.setAttribute('inert', '')
          }
        }
      }
      visit(doc.body)
      // React descendants may focus themselves before the parent layer effect.
      const active = doc.activeElement as HTMLElement | null
      if (active && isAvailable(active)) rememberFocus(active)
    }
    const top = () => layers[layers.length - 1]
    const focusBoundary = () => {
      const index = layers.findLastIndex(
        (entry) => !!entry.modal?.()?.isConnected,
      )
      if (index < 0) return null
      const modal = layers[index].modal!()!
      const roots = [
        modal,
        ...layers
          .slice(index + 1)
          .flatMap((entry) => entry.elements())
          .filter(
            (node): node is HTMLElement =>
              !!node && node instanceof doc.defaultView!.HTMLElement,
          ),
      ]
      return {
        modal,
        roots,
        get stops() {
          return [
            ...new Set(roots.flatMap((root) => getFocusableElements(root))),
          ]
        },
      }
    }
    const rememberFocus = (element: HTMLElement) => {
      const boundary = focusBoundary()
      const root = boundary?.roots.findLast((root) => root.contains(element))
      if (!boundary || !root) return false
      focused.set(boundary.modal, { element, root })
      return true
    }
    // 'mouse': a mouse or pen press dismissed already; its click completes it.
    // 'touch': the press may become a scroll, so its click dismisses instead.
    let gesture: 'mouse' | 'touch' | undefined
    const dismissOutside = (event: Event) => {
      if (event.defaultPrevented) return
      // Layers below the nearest modal are inert. From the top down, each layer
      // the press is outside of is dismissed; the first layer containing it is
      // inside every layer below it, so the walk stops there.
      const floor = layers.findLastIndex((entry) => !!entry.modal?.())
      const path = event.composedPath()
      for (const entry of layers.slice(Math.max(0, floor)).reverse()) {
        if (holds(entry, event.target as Node, path)) return
        entry.onOutside?.(event)
      }
      // Outside a modal only inert content can be hit. Its mousedown would blur
      // focus after the modal kept or returned it, so it does not happen.
      if (floor >= 0 && event.type === 'pointerdown') event.preventDefault()
    }
    const onPointerDown = (event: PointerEvent) => {
      gesture = event.pointerType === 'touch' ? 'touch' : 'mouse'
      if (gesture === 'mouse') dismissOutside(event)
    }
    const onPointerCancel = () => {
      gesture = undefined
    }
    const onClick = (event: Event) => {
      const started = gesture
      gesture = undefined
      // A click completing a mouse press that closed a child cannot close its
      // parent. Touch taps and keyboard/assistive clicks dismiss here.
      if (started !== 'mouse') dismissOutside(event)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      gesture = undefined
      const entry = top()
      if (!entry || event.defaultPrevented) return
      if (event.key === 'Escape' && entry.onEscape) {
        event.preventDefault()
        event.stopPropagation()
        entry.onEscape(event)
      }
      const boundary = focusBoundary()
      if (event.key !== 'Tab' || !boundary) return
      const { modal, roots, stops } = boundary
      const first = stops[0] ?? modal
      const last = stops[stops.length - 1] ?? modal
      const active = doc.activeElement
      if (
        !stops.length ||
        !roots.some((root) => root.contains(active)) ||
        (event.shiftKey ? active === first : active === last)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus({ preventScroll: true })
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (rememberFocus(event.target as HTMLElement)) return
      const boundary = focusBoundary()
      if (!boundary) return
      ;(boundary.stops[0] ?? boundary.modal).focus({ preventScroll: true })
    }
    const recoverFocus = () => {
      const boundary = focusBoundary()
      if (!boundary || !isAvailable(boundary.modal)) return
      const active = doc.activeElement as HTMLElement | null
      if (
        active &&
        boundary.roots.some((root) => root.contains(active)) &&
        isAvailable(active)
      )
        return
      const previous = focused.get(boundary.modal)
      // No initial autofocus, and no interference with a deliberate blur of a
      // still-available control. Recover only an invalidated focus destination.
      if (!previous || isAvailable(previous.element)) return
      const root =
        boundary.roots.includes(previous.root) && isAvailable(previous.root)
          ? previous.root
          : boundary.modal
      const target =
        getFocusableElements(root)[0] ??
        (root.hasAttribute('tabindex') ? root : boundary.stops[0]) ??
        boundary.modal
      target.focus({ preventScroll: true })
    }
    doc.addEventListener('pointerdown', onPointerDown, true)
    doc.addEventListener('pointercancel', onPointerCancel, true)
    doc.addEventListener('click', onClick, true)
    doc.addEventListener('keydown', onKeyDown)
    doc.addEventListener('focusin', onFocusIn)
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) update()
      recoverFocus()
    })
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'disabled',
        'hidden',
        'inert',
        'aria-hidden',
        'class',
        'style',
        'type',
      ],
    })
    state = { layers, update }
    documents.set(doc, state)
    teardown = () => {
      observer.disconnect()
      restoreInert()
      doc.removeEventListener('pointerdown', onPointerDown, true)
      doc.removeEventListener('pointercancel', onPointerCancel, true)
      doc.removeEventListener('click', onClick, true)
      doc.removeEventListener('keydown', onKeyDown)
      doc.removeEventListener('focusin', onFocusIn)
      documents.delete(doc)
    }
    // The owner can close before nested layers; teardown belongs to the stack.
    cleanups.set(state, teardown)
  }
  // Child effects mount first. Insert a parent below layers already inside it.
  const childIndex = state.layers.findIndex((existing) =>
    existing.elements().some((child) => !!child && holds(layer, child)),
  )
  if (childIndex < 0) state.layers.push(layer)
  else state.layers.splice(childIndex, 0, layer)
  state.update()
  let removed = false
  return () => {
    if (removed) return
    removed = true
    state.layers.splice(state.layers.indexOf(layer), 1)
    state.update()
    if (!state.layers.length) cleanups.get(state)?.()
  }
}

const cleanups = new WeakMap<object, () => void>()

const holds = (layer: Layer, node: Node, path: EventTarget[] = []) =>
  layer
    .elements()
    .some(
      (element) =>
        !!element && (path.includes(element) || element.contains(node)),
    )

/**
 * True when `node` is inside `layer` or inside a layer nested in it (stacked
 * above it with its trigger inside), such as a portaled child popover.
 */
export function layerContains(layer: Layer, node: Node | null): boolean {
  if (!node?.ownerDocument) return false
  const stack = documents.get(node.ownerDocument)?.layers ?? []
  const nested = [layer]
  const index = stack.indexOf(layer)
  for (const entry of index < 0 ? [] : stack.slice(index + 1))
    if (
      entry
        .elements()
        .some((child) => !!child && nested.some((one) => holds(one, child)))
    )
      nested.push(entry)
  return nested.some((entry) => holds(entry, node))
}

let restoring = 0
/** Focuses `element` without scrolling; isRestoringFocus() is true meanwhile. */
export function restoreFocus(element: HTMLElement): void {
  restoring++
  try {
    element.focus({ preventScroll: true })
  } finally {
    restoring--
  }
}
/** True during focus events caused by restoreFocus(): a programmatic return, not the user entering. */
export const isRestoringFocus = (): boolean => restoring > 0
