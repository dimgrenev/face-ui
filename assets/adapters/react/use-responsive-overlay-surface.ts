import { useEffect, useState } from 'react'

export type ResponsiveOverlaySurface = 'auto' | 'popover' | 'sheet'
export type ResolvedOverlaySurface = Exclude<ResponsiveOverlaySurface, 'auto'>

export const DEFAULT_OVERLAY_SURFACE_BREAKPOINT = 900

function getCompactMediaQuery(breakpoint: number): string {
  return `(max-width: ${Math.max(0, breakpoint - 1)}px)`
}

function resolveSurface(
  surface: ResponsiveOverlaySurface,
  breakpoint: number,
): ResolvedOverlaySurface {
  if (surface === 'popover' || surface === 'sheet') {
    return surface
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'popover'
  }

  return window.matchMedia(getCompactMediaQuery(breakpoint)).matches ? 'sheet' : 'popover'
}

export function useResponsiveOverlaySurface(
  surface: ResponsiveOverlaySurface = 'auto',
  breakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
): ResolvedOverlaySurface {
  const [resolvedSurface, setResolvedSurface] = useState<ResolvedOverlaySurface>(() => (
    resolveSurface(surface, breakpoint)
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

    const mediaQuery = window.matchMedia(getCompactMediaQuery(breakpoint))
    const updateSurface = () => {
      setResolvedSurface(mediaQuery.matches ? 'sheet' : 'popover')
    }

    updateSurface()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSurface)
      return () => {
        mediaQuery.removeEventListener('change', updateSurface)
      }
    }

    mediaQuery.addListener(updateSurface)
    return () => {
      mediaQuery.removeListener(updateSurface)
    }
  }, [surface, breakpoint])

  return resolvedSurface
}

export function useIsCompactViewport(
  breakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
): boolean {
  return useResponsiveOverlaySurface('auto', breakpoint) === 'sheet'
}
