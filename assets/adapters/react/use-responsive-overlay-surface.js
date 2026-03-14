import { useEffect, useState } from 'react';
export const DEFAULT_OVERLAY_SURFACE_BREAKPOINT = 900;
function getCompactMediaQuery(breakpoint) {
    return `(max-width: ${Math.max(0, breakpoint - 1)}px)`;
}
function resolveSurface(surface, breakpoint) {
    if (surface === 'popover' || surface === 'sheet') {
        return surface;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'popover';
    }
    return window.matchMedia(getCompactMediaQuery(breakpoint)).matches ? 'sheet' : 'popover';
}
export function useResponsiveOverlaySurface(surface = 'auto', breakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT) {
    const [resolvedSurface, setResolvedSurface] = useState(() => (resolveSurface(surface, breakpoint)));
    useEffect(() => {
        if (surface === 'popover' || surface === 'sheet') {
            setResolvedSurface(surface);
            return;
        }
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            setResolvedSurface('popover');
            return;
        }
        const mediaQuery = window.matchMedia(getCompactMediaQuery(breakpoint));
        const updateSurface = () => {
            setResolvedSurface(mediaQuery.matches ? 'sheet' : 'popover');
        };
        updateSurface();
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateSurface);
            return () => {
                mediaQuery.removeEventListener('change', updateSurface);
            };
        }
        mediaQuery.addListener(updateSurface);
        return () => {
            mediaQuery.removeListener(updateSurface);
        };
    }, [surface, breakpoint]);
    return resolvedSurface;
}
export function useIsCompactViewport(breakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT) {
    return useResponsiveOverlaySurface('auto', breakpoint) === 'sheet';
}
