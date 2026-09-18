export interface Layer {
  elements: () => Array<Element | null>
  modal?: () => HTMLElement | null
  onEscape?: (event: KeyboardEvent) => void
  onOutside?: (event: Event) => void
}

const documents = new WeakMap<
  Document,
  { layers: Layer[]; update: () => void }
>()

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]',
    ),
  ).filter((node) => node.tabIndex >= 0 && isAvailable(node))
}

// Availability is distinct from tab order: a focused heading or surface may
// intentionally have tabIndex=-1 and must keep its programmatic focus.
function isAvailable(node: HTMLElement): boolean {
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
    let pointerLayer: Layer | null | undefined
    const dismissOutside = (event: Event) => {
      const entry = top()
      if (!entry || event.defaultPrevented) return
      const path = event.composedPath()
      if (
        entry
          .elements()
          .some(
            (node) =>
              node &&
              (path.includes(node) || node.contains(event.target as Node)),
          )
      )
        return
      entry.onOutside?.(event)
    }
    const onPointerDown = (event: Event) => {
      pointerLayer = top() ?? null
      dismissOutside(event)
    }
    const onClick = (event: Event) => {
      const startedLayer = pointerLayer
      pointerLayer = undefined
      // A click completing the gesture that closed a child cannot close its
      // parent. Keyboard/assistive clicks still get outside-dismiss behavior.
      if (startedLayer !== undefined) return
      dismissOutside(event)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      pointerLayer = undefined
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
    layer
      .elements()
      .some(
        (parent) =>
          parent &&
          existing.elements().some((child) => child && parent.contains(child)),
      ),
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
