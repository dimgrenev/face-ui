import { useCallback, useEffect, useState, type CSSProperties, type RefObject } from 'react'

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
export type FloatingAlign = 'start' | 'center' | 'end'

export interface UseFloatingPositionOptions {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  viewportInset?: number
  matchTriggerWidth?: boolean
}

const initialStyle: CSSProperties = {
  position: 'fixed',
  top: -9999,
  left: -9999,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), Math.max(min, max))
}

function getAvailableSpace(
  triggerRect: DOMRect,
  side: FloatingSide,
  sideOffset: number,
  viewportInset: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (side === 'top') return triggerRect.top - sideOffset - viewportInset
  if (side === 'bottom') return viewportHeight - triggerRect.bottom - sideOffset - viewportInset
  if (side === 'left') return triggerRect.left - sideOffset - viewportInset
  return viewportWidth - triggerRect.right - sideOffset - viewportInset
}

function resolveSide(
  preferredSide: FloatingSide,
  triggerRect: DOMRect,
  contentRect: DOMRect,
  sideOffset: number,
  viewportInset: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const currentSpace = getAvailableSpace(
    triggerRect,
    preferredSide,
    sideOffset,
    viewportInset,
    viewportWidth,
    viewportHeight,
  )
  const oppositeSide: FloatingSide =
    preferredSide === 'top' ? 'bottom'
      : preferredSide === 'bottom' ? 'top'
        : preferredSide === 'left' ? 'right'
          : 'left'
  const oppositeSpace = getAvailableSpace(
    triggerRect,
    oppositeSide,
    sideOffset,
    viewportInset,
    viewportWidth,
    viewportHeight,
  )
  const requiredSpace = preferredSide === 'top' || preferredSide === 'bottom'
    ? contentRect.height
    : contentRect.width

  return currentSpace < requiredSpace && oppositeSpace > currentSpace
    ? oppositeSide
    : preferredSide
}

export function useFloatingPosition(options: UseFloatingPositionOptions) {
  const {
    open,
    triggerRef,
    contentRef,
    side = 'bottom',
    align = 'start',
    sideOffset = 6,
    viewportInset = 8,
    matchTriggerWidth = false,
  } = options
  const [style, setStyle] = useState<CSSProperties>(initialStyle)

  const update = useCallback(() => {
    if (typeof window === 'undefined') return

    const triggerEl = triggerRef.current
    const contentEl = contentRef.current
    if (!triggerEl || !contentEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const contentRect = contentEl.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const resolvedSide = resolveSide(
      side,
      triggerRect,
      contentRect,
      sideOffset,
      viewportInset,
      viewportWidth,
      viewportHeight,
    )

    let top = triggerRect.bottom + sideOffset
    let left = triggerRect.left

    if (resolvedSide === 'top') {
      top = triggerRect.top - contentRect.height - sideOffset
    } else if (resolvedSide === 'left') {
      top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
      left = triggerRect.left - contentRect.width - sideOffset
    } else if (resolvedSide === 'right') {
      top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
      left = triggerRect.right + sideOffset
    }

    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      if (align === 'center') left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
      if (align === 'end') left = triggerRect.right - contentRect.width
    } else {
      if (align === 'start') top = triggerRect.top
      if (align === 'end') top = triggerRect.bottom - contentRect.height
    }

    const maxHeight = Math.max(
      80,
      getAvailableSpace(
        triggerRect,
        resolvedSide,
        sideOffset,
        viewportInset,
        viewportWidth,
        viewportHeight,
      ),
    )

    setStyle({
      position: 'fixed',
      top: Math.round(clamp(top, viewportInset, viewportHeight - contentRect.height - viewportInset)),
      left: Math.round(clamp(left, viewportInset, viewportWidth - contentRect.width - viewportInset)),
      right: 'auto',
      bottom: 'auto',
      maxWidth: `calc(100vw - ${viewportInset * 2}px)`,
      maxHeight: Math.round(maxHeight),
      overflowY: 'auto',
      ...(matchTriggerWidth
        ? {
            width: Math.round(triggerRect.width),
            minWidth: Math.round(triggerRect.width),
          }
        : null),
    })
  }, [align, contentRef, matchTriggerWidth, side, sideOffset, triggerRef, viewportInset])

  useEffect(() => {
    if (!open) {
      setStyle(initialStyle)
      return
    }

    update()
    const rafId = window.requestAnimationFrame(update)
    const handleWindowChange = () => update()
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleWindowChange)
        : null

    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    if (contentRef.current) resizeObserver?.observe(contentRef.current)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [contentRef, open, triggerRef, update])

  return { style, update }
}
