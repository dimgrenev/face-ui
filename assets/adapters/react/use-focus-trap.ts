import type { RefObject } from 'react'
import { useLayer } from './use-layer'

/** @deprecated Use useLayer to compose focus containment and dismissal in one layer. */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useLayer({ enabled: active, contentRef: containerRef, modal: true })
}
