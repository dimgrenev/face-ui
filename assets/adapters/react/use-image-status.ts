import { useEffect, useMemo, useState } from 'react'

/**
 * Where an image stands: `idle` while a pending load is still inside its delay, `loading` after it,
 * then `loaded` or `error`. A missing source is an `error`.
 */
export type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

/** Wiring for the element that loads the source; key that element by the source. */
export interface ImageStatusProps {
  /** Reads a load that finished before React attached, as after hydration or from the memory cache. */
  ref: (node: HTMLElement | null) => void
  /** Marks the source `loaded`; a media element calls it from `onLoadedData`. */
  onLoad: () => void
  /** Marks the source `error`. */
  onError: () => void
}

interface Load {
  src: string | undefined
  settled?: 'loaded' | 'error'
  late?: boolean
}

/**
 * The loading status of `src` as reported by the element it is spread on, starting over whenever
 * `src` changes. `delay` (milliseconds) keeps a pending load `idle` so a fast image never flashes a
 * placeholder. Server and first client render agree: the status depends on the props alone.
 */
export function useImageStatus(
  src: string | undefined,
  { delay = 0 }: { delay?: number } = {},
): readonly [ImageStatus, ImageStatusProps] {
  const [load, setLoad] = useState<Load>({ src })
  // A new source starts over before anything shows (the render with the old state is discarded).
  if (load.src !== src) setLoad({ src })
  const waiting = !!src && !load.settled && !load.late && delay > 0

  useEffect(() => {
    if (!waiting) return
    // Cleared on unmount and on any change, so no state is set after either.
    const timer = setTimeout(
      () => setLoad((l) => (l.src === src ? { ...l, late: true } : l)),
      delay,
    )
    return () => clearTimeout(timer)
  }, [src, delay, waiting])

  const props = useMemo<ImageStatusProps>(() => {
    const settle = (settled: Load['settled']) =>
      setLoad((l) => (l.src === src && l.settled !== settled ? { ...l, settled } : l))
    return {
      ref: (node) => {
        const image = node as HTMLImageElement | null
        if (image?.complete) settle(image.naturalWidth > 0 ? 'loaded' : 'error')
      },
      onLoad: () => settle('loaded'),
      onError: () => settle('error'),
    }
  }, [src])

  const status = !src ? 'error' : (load.settled ?? (waiting ? 'idle' : 'loading'))
  return [status, props]
}
