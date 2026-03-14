let membraneInteractionsInstalled = false

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'label',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element
}

function isDisabledTarget(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return true
  if (el.getAttribute('aria-disabled') === 'true') return true
  if (el.hasAttribute('data-disabled')) return true
  return false
}

function resolveMembraneTarget(membrane: HTMLElement): HTMLElement | null {
  const candidate = membrane.querySelector(INTERACTIVE_SELECTOR)
  if (!candidate || !isElement(candidate)) return null
  return candidate as HTMLElement
}

function clearMembraneState(membrane: HTMLElement): void {
  membrane.removeAttribute('data-membrane-hover')
  membrane.removeAttribute('data-membrane-pressed')
}

function setHoverStateIfPaddingHit(eventTarget: Element, membrane: HTMLElement): void {
  const target = resolveMembraneTarget(membrane)
  if (!target) {
    clearMembraneState(membrane)
    return
  }
  membrane.setAttribute('data-membrane-interactive', '')
  if (target.contains(eventTarget)) {
    membrane.removeAttribute('data-membrane-hover')
    return
  }
  if (!isDisabledTarget(target)) {
    membrane.setAttribute('data-membrane-hover', '')
  }
}

export function installMembraneInteractions(): void {
  if (membraneInteractionsInstalled) return
  membraneInteractionsInstalled = true
  if (typeof document === 'undefined') return

  document.addEventListener('pointerover', (event) => {
    if (!isElement(event.target)) return
    const membrane = event.target.closest('.uf-membrane')
    if (!membrane || !isElement(membrane)) return
    setHoverStateIfPaddingHit(event.target, membrane as HTMLElement)
  }, true)

  document.addEventListener('pointerout', (event) => {
    if (!isElement(event.target)) return
    const membrane = event.target.closest('.uf-membrane')
    if (!membrane || !isElement(membrane)) return
    const related = (event as PointerEvent).relatedTarget
    if (isElement(related) && membrane.contains(related)) return
    clearMembraneState(membrane as HTMLElement)
  }, true)

  document.addEventListener('pointerdown', (event) => {
    if (!isElement(event.target)) return
    const membrane = event.target.closest('.uf-membrane')
    if (!membrane || !isElement(membrane)) return
    const target = resolveMembraneTarget(membrane as HTMLElement)
    if (!target) return
    ;(membrane as HTMLElement).setAttribute('data-membrane-interactive', '')

    if (target.contains(event.target)) return
    if (isDisabledTarget(target)) return

    ;(membrane as HTMLElement).setAttribute('data-membrane-pressed', '')
    try { target.focus({ preventScroll: true }) } catch {}
  }, true)

  document.addEventListener('pointerup', (event) => {
    if (!isElement(event.target)) return
    const membrane = event.target.closest('.uf-membrane')
    if (!membrane || !isElement(membrane)) return
    ;(membrane as HTMLElement).removeAttribute('data-membrane-pressed')
  }, true)

  document.addEventListener('click', (event) => {
    if (!isElement(event.target)) return
    const membrane = event.target.closest('.uf-membrane')
    if (!membrane || !isElement(membrane)) return
    const target = resolveMembraneTarget(membrane as HTMLElement)
    if (!target) return
    ;(membrane as HTMLElement).setAttribute('data-membrane-interactive', '')

    if (target.contains(event.target)) return
    if (isDisabledTarget(target)) return

    event.preventDefault()
    event.stopPropagation()
    target.click()
  }, true)
}

