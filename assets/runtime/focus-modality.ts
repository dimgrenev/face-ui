const attribute = 'data-uf-focus-modality'
const modifiers = new Set([
  'Alt',
  'AltGraph',
  'Control',
  'Meta',
  'Shift',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Fn',
  'FnLock',
])

type Modality = 'pointer' | 'keyboard'
interface DocumentModality {
  count: number
  dispose(): void
}
const documents = new WeakMap<Document, DocumentModality>()

/**
 * Native focus-visible can retain a text field's indicator when a pointer
 * forwards focus to another control. One document owner records the input
 * source before controls, their membranes and portaled layers move focus.
 */
export function acquireFocusModality(doc: Document): () => void {
  let state = documents.get(doc)
  if (!state) {
    const root = doc.documentElement
    const view = doc.defaultView
    const previous = root.getAttribute(attribute)
    let written: Modality | null = null
    let active = true
    let pendingFocus = false
    const restore = () => {
      // Another owner may have taken over the marker. Never erase its write.
      if (written !== null && root.getAttribute(attribute) === written) {
        if (previous === null) root.removeAttribute(attribute)
        else root.setAttribute(attribute, previous)
      }
      written = null
    }
    const set = (modality: Modality) => {
      if (root.getAttribute(attribute) !== modality)
        root.setAttribute(attribute, modality)
      written = modality
    }
    const pointer = () => set('pointer')
    const keyboard = (event: KeyboardEvent) => {
      // Option+Tab is keyboard traversal on macOS; other command shortcuts
      // and modifier presses alone do not change how the user is navigating.
      if (
        !event.key ||
        modifiers.has(event.key) ||
        event.metaKey ||
        event.ctrlKey ||
        (event.altKey && event.key !== 'Tab')
      )
        return
      set('keyboard')
    }
    // A child frame or another window can receive keyboard events this
    // document cannot observe. Return to native focus-visible until its next
    // local input, rather than carrying a stale pointer modality back in.
    const blur = () => restore()
    const focus = () => {
      if (pendingFocus) return
      pendingFocus = true
      // Firefox can enter an iframe without blurring the parent window.
      // Focus transitions settle after focusout; inspect only the parent's
      // focused element, without depending on access to the child document.
      queueMicrotask(() => {
        pendingFocus = false
        if (active && doc.activeElement?.matches('iframe, frame')) restore()
      })
    }
    doc.addEventListener('pointerdown', pointer, true)
    doc.addEventListener('keydown', keyboard, true)
    doc.addEventListener('focusin', focus, true)
    doc.addEventListener('focusout', focus, true)
    view?.addEventListener('blur', blur)
    state = {
      count: 0,
      dispose() {
        active = false
        doc.removeEventListener('pointerdown', pointer, true)
        doc.removeEventListener('keydown', keyboard, true)
        doc.removeEventListener('focusin', focus, true)
        doc.removeEventListener('focusout', focus, true)
        view?.removeEventListener('blur', blur)
        restore()
      },
    }
    documents.set(doc, state)
  }
  state.count++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--state.count !== 0) return
    state.dispose()
    documents.delete(doc)
  }
}
