import { useEffect, useState } from 'react'

export type ResponsiveOverlaySurface = 'auto' | 'popover' | 'sheet'
export type ResolvedOverlaySurface = Exclude<ResponsiveOverlaySurface, 'auto'>

/** The one compact boundary (K20): below 900px wide, `auto` resolves to a sheet. */
const COMPACT_QUERY = '(max-width: 899px)'

function resolveSurface(surface: ResponsiveOverlaySurface): ResolvedOverlaySurface {
  if (surface === 'popover' || surface === 'sheet') {
    return surface
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'popover'
  }

  return window.matchMedia(COMPACT_QUERY).matches ? 'sheet' : 'popover'
}

export function useResponsiveOverlaySurface(
  surface: ResponsiveOverlaySurface = 'auto',
): ResolvedOverlaySurface {
  const [resolvedSurface, setResolvedSurface] = useState<ResolvedOverlaySurface>(() => (
    surface === 'popover' || surface === 'sheet' ? surface : 'popover'
  ))

  useEffect(() => {
    if (surface === 'popover' || surface === 'sheet') {
      setResolvedSurface(surface)
      return
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setResolvedSurface('popover')
      return
    }

    const mediaQuery = window.matchMedia(COMPACT_QUERY)
    const updateSurface = () => {
      setResolvedSurface(resolveSurface(surface))
    }

    updateSurface()
    window.addEventListener('resize', updateSurface)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSurface)
      return () => {
        window.removeEventListener('resize', updateSurface)
        mediaQuery.removeEventListener('change', updateSurface)
      }
    }

    mediaQuery.addListener(updateSurface)
    return () => {
      window.removeEventListener('resize', updateSurface)
      mediaQuery.removeListener(updateSurface)
    }
  }, [surface])

  return resolvedSurface
}

/** True below the 900px compact boundary. */
export function useIsCompactViewport(): boolean {
  return useResponsiveOverlaySurface('auto') === 'sheet'
}
