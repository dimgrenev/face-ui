export interface Layer {
  /** Elements that count as inside the layer: its surface, then its trigger. */
  elements: () => Array<Element | null>
  /** The surface of a modal layer: content below it becomes inert and Tab stays inside. */
  modal?: () => HTMLElement | null
  /** Escape pressed while this layer is the top of the stack. */
  onEscape?: (event: KeyboardEvent) => void
  /** A press outside this layer and every layer above it, down to the nearest modal layer. */
  onOutside?: (event: Event) => void
  /** Omitted layers retain the document-wide legacy stack. */
  scope?: object
  /** Instance boundary used for scoped modal inertness and outside activity. */
  scopeRoot?: HTMLElement | null
}

const documents = new WeakMap<
  Document,
  { layers: Layer[]; update: () => void }
>()
const modalListeners = new WeakMap<Document, Set<() => void>>()

/** The active modal surface for one overlay scope, if one is registered. */
export function activeModal(doc: Document, scope?: object): HTMLElement | null {
  const layers = documents.get(doc)?.layers ?? []
  return layers.findLast((entry) => entry.scope === scope && !!entry.modal?.()?.isConnected)
    ?.modal?.() ?? null
}

/** Notifies notification regions when their owning modal opens or closes. */
export function subscribeActiveModal(doc: Document, listener: () => void): () => void {
  let listeners = modalListeners.get(doc)
  if (!listeners) {
    listeners = new Set()
    modalListeners.set(doc, listeners)
  }
  listeners.add(listener)
  return () => {
    listeners!.delete(listener)
    if (!listeners!.size) modalListeners.delete(doc)
  }
}

function notifyActiveModal(doc: Document) {
  modalListeners.get(doc)?.forEach((listener) => listener())
}

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
    const scopeFor = (node: Node | null, path: EventTarget[] = []): object | null => {
      if (!node) return null
      const owned = layers.findLast(
        (entry) => entry.scope && holds(entry, node, path),
      )
      if (owned?.scope) return owned.scope
      const rooted = layers.findLast(
        (entry) => entry.scope && entry.scopeRoot?.contains(node),
      )
      return rooted?.scope ?? null
    }
    const modalIndexFor = (scope: object | undefined) =>
      layers.findLastIndex(
        (entry) =>
          entry.scope === scope && !!entry.modal?.()?.isConnected,
      )
    const update = () => {
      restoreInert()
      const visit = (parent: Element, allowed: Element[]) => {
        for (const child of Array.from(parent.children)) {
          if (allowed.includes(child)) continue
          if (allowed.some((node) => child.contains(node))) visit(child, allowed)
          else {
            inert.set(child, child.getAttribute('inert'))
            child.setAttribute('inert', '')
          }
        }
      }
      for (const scope of new Set(layers.map((entry) => entry.scope))) {
        const modalIndex = modalIndexFor(scope)
        if (modalIndex < 0) continue
        const root = scope === undefined
          ? doc.body
          : layers[modalIndex].scopeRoot
        if (!root || root.ownerDocument !== doc) continue
        const allowed = [
          layers[modalIndex].modal!()!,
          ...layers.slice(modalIndex + 1)
            .filter((entry) => entry.scope === scope)
            .flatMap((entry) => entry.elements())
            .filter((node): node is Element => !!node),
        ]
        visit(root, allowed)
      }
      // React descendants may focus themselves before the parent layer effect.
      const active = doc.activeElement as HTMLElement | null
      if (active && isAvailable(active)) rememberFocus(active)
    }
    const focusBoundary = (scope: object | undefined) => {
      const index = modalIndexFor(scope)
      if (index < 0) return null
      const modal = layers[index].modal!()!
      const roots = [
        modal,
        ...layers
          .slice(index + 1)
          .filter((entry) => entry.scope === scope)
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
    let lastScopedFocus: object | null = null
    const rememberFocus = (element: HTMLElement) => {
      const scope = scopeFor(element)
      if (scope) lastScopedFocus = scope
      const boundary = focusBoundary(undefined) ?? focusBoundary(scope ?? undefined)
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
      const path = event.composedPath()
      // A press in a sibling instance must not inherit the focused instance's
      // layer stack. The target alone decides which scope owns the gesture.
      const scope = scopeFor(event.target as Node, path)
      const candidates = layers.filter((entry) => entry.scope === (scope ?? undefined))
      const floor = candidates.findLastIndex((entry) => !!entry.modal?.())
      for (const entry of candidates.slice(Math.max(0, floor)).reverse()) {
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
      const scope = scopeFor(event.target as Node) ?? scopeFor(doc.activeElement)
      const entry = layers.findLast((item) => item.scope === (scope ?? undefined))
      if (!entry || event.defaultPrevented) return
      if (event.key === 'Escape' && entry.onEscape) {
        event.preventDefault()
        event.stopPropagation()
        entry.onEscape(event)
      }
      const boundary = focusBoundary(undefined) ?? focusBoundary(scope ?? undefined)
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
      const scope = scopeFor(event.target as Node)
      const boundary = focusBoundary(undefined) ?? focusBoundary(scope ?? undefined)
      if (!boundary) return
      ;(boundary.stops[0] ?? boundary.modal).focus({ preventScroll: true })
    }
    const recoverFocus = () => {
      const active = doc.activeElement as HTMLElement | null
      const scope = scopeFor(active) ?? (active === doc.body ? lastScopedFocus : null)
      const boundary = focusBoundary(undefined) ?? focusBoundary(scope ?? undefined)
      if (!boundary || !isAvailable(boundary.modal)) return
      if (active && active !== doc.body && isAvailable(active) &&
          !boundary.roots.some((root) => root.contains(active))) return
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
    existing.scope === layer.scope &&
    existing.elements().some((child) => !!child && holds(layer, child)),
  )
  if (childIndex < 0) state.layers.push(layer)
  else state.layers.splice(childIndex, 0, layer)
  state.update()
  notifyActiveModal(doc)
  let removed = false
  return () => {
    if (removed) return
    removed = true
    state.layers.splice(state.layers.indexOf(layer), 1)
    state.update()
    notifyActiveModal(doc)
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
      entry.scope === layer.scope &&
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
