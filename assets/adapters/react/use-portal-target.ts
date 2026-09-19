import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

/** Keep the server and first client render identical, then portal before paint. */
export function usePortalTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useIsomorphicLayoutEffect(() => {
    setTarget(document.body)
  }, [])
  return target
}
