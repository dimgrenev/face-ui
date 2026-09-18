import type { Move } from './collection'

/** Inline text direction. */
export type Direction = 'ltr' | 'rtl'

/** Arrow axes a widget answers to; `'both'` takes all four arrows, as radio groups do. */
export type Orientation = 'horizontal' | 'vertical' | 'both'

/** The keyboard-event fields these helpers read; React and native keyboard events both fit. */
export interface KeyLike {
  readonly key: string
  readonly altKey?: boolean
  readonly ctrlKey?: boolean
  readonly metaKey?: boolean
  /** Native events carry the IME flag here, React events on `nativeEvent`. */
  readonly isComposing?: boolean
  readonly nativeEvent?: { readonly isComposing?: boolean }
  /** 229 marks IME input in Safari, which clears `isComposing` early. */
  readonly keyCode?: number
}

/**
 * The computed direction of `node`, read at event time and never during render; falls back to
 * the closest `[dir]` where no computed style exists (detached nodes, jsdom).
 */
export function readDirection(node: Element | null | undefined): Direction {
  if (!node) return 'ltr'
  const computed = node.ownerDocument.defaultView?.getComputedStyle(node).direction
  if (computed === 'ltr' || computed === 'rtl') return computed
  return node.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl'
    ? 'rtl'
    : 'ltr'
}

/** Shortcuts (Alt, Ctrl, Meta) and IME composition belong to someone else. */
const foreign = (e: KeyLike) =>
  !!(
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.isComposing ||
    e.nativeEvent?.isComposing ||
    e.keyCode === 229
  )

/**
 * The list move a key asks for: Home/End, plus the arrows of `orientation`, with left and right
 * swapped in RTL. `null` for any other key, with Alt, Ctrl or Meta held, or during IME composition.
 */
export function keyToMove(
  e: KeyLike,
  orientation: Orientation,
  dir: Direction,
): Move | null {
  if (foreign(e)) return null
  const vertical = orientation !== 'horizontal'
  const horizontal = orientation !== 'vertical'
  switch (e.key) {
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'ArrowDown':
      return vertical ? 'next' : null
    case 'ArrowUp':
      return vertical ? 'prev' : null
    case 'ArrowRight':
      return horizontal ? (dir === 'rtl' ? 'prev' : 'next') : null
    case 'ArrowLeft':
      return horizontal ? (dir === 'rtl' ? 'next' : 'prev') : null
  }
  return null
}

/**
 * A slider key: arrows step by ±1 (Up and Right increase; Right decreases on a horizontal RTL
 * track), PageUp/PageDown by ±10, Home/End jump to the bounds. `null` as for `keyToMove`.
 */
export function stepIntent(
  e: KeyLike,
  orientation: 'horizontal' | 'vertical',
  dir: Direction,
): { step: number } | { to: 'min' | 'max' } | null {
  if (foreign(e)) return null
  const right = orientation === 'horizontal' && dir === 'rtl' ? -1 : 1
  switch (e.key) {
    case 'ArrowUp':
      return { step: 1 }
    case 'ArrowDown':
      return { step: -1 }
    case 'ArrowRight':
      return { step: right }
    case 'ArrowLeft':
      return { step: -right }
    case 'PageUp':
      return { step: 10 }
    case 'PageDown':
      return { step: -10 }
    case 'Home':
      return { to: 'min' }
    case 'End':
      return { to: 'max' }
  }
  return null
}
