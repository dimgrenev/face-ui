import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'
import { useFaceUiOverlayBoundary } from './overlay-context'

/** Keep the server and first client render identical, then portal before paint. */
export function usePortalTarget(): HTMLElement | null {
  const overlay = useFaceUiOverlayBoundary()
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useIsomorphicLayoutEffect(() => {
    setTarget(overlay?.portalContainer === undefined
      ? overlay?.scopeRoot ?? document.body
      : overlay.portalContainer)
  }, [overlay?.portalContainer, overlay?.scopeRoot])
  return target
}
