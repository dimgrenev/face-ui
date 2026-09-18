import { useEffect, useLayoutEffect, useState } from 'react'
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Keep the server and first client render identical, then portal before paint. */
export function usePortalTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useCommitEffect(() => {
    setTarget(document.body)
  }, [])
  return target
}
