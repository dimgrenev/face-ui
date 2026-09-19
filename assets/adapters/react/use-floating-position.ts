import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
export type FloatingAlign = 'start' | 'center' | 'end'

export interface UseFloatingPositionOptions {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  /** Explicit content direction; otherwise alignment follows the trigger. */
  dir?: string
  /** Semantic surface when contentRef measures an outer positioning boundary. */
  directionRef?: RefObject<HTMLElement | null>
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
  if (side === 'bottom')
    return viewportHeight - triggerRect.bottom - sideOffset - viewportInset
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
    preferredSide === 'top'
      ? 'bottom'
      : preferredSide === 'bottom'
        ? 'top'
        : preferredSide === 'left'
          ? 'right'
          : 'left'
  const oppositeSpace = getAvailableSpace(
    triggerRect,
    oppositeSide,
    sideOffset,
    viewportInset,
    viewportWidth,
    viewportHeight,
  )
  const requiredSpace =
    preferredSide === 'top' || preferredSide === 'bottom'
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
    dir,
    directionRef = contentRef,
    viewportInset = 8,
    matchTriggerWidth = false,
  } = options
  const [position, setPosition] = useState({ style: initialStyle, side })

  const update = useCallback(() => {
    const triggerEl = triggerRef.current
    const contentEl = contentRef.current
    if (!triggerEl || !contentEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const contentRect = contentEl.getBoundingClientRect()
    const view = triggerEl.ownerDocument.defaultView
    if (!view) return
    const viewportWidth = view.innerWidth
    const viewportHeight = view.innerHeight
    const direction =
      dir === 'ltr' || dir === 'rtl'
        ? dir
        : view.getComputedStyle(
            dir === 'auto' ? (directionRef.current ?? contentEl) : triggerEl,
          ).direction
    const horizontalAlign =
      direction === 'rtl'
        ? align === 'start'
          ? 'end'
          : align === 'end'
            ? 'start'
            : align
        : align
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
      if (horizontalAlign === 'center')
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
      if (horizontalAlign === 'end')
        left = triggerRect.right - contentRect.width
    } else {
      if (align === 'start') top = triggerRect.top
      if (align === 'end') top = triggerRect.bottom - contentRect.height
    }

    const vertical = resolvedSide === 'top' || resolvedSide === 'bottom'
    const available = Math.max(
      0,
      getAvailableSpace(
        triggerRect,
        resolvedSide,
        sideOffset,
        viewportInset,
        viewportWidth,
        viewportHeight,
      ),
    )
    const maxHeight = Math.max(
      0,
      vertical
        ? Math.min(available, viewportHeight - viewportInset * 2)
        : viewportHeight - viewportInset * 2,
    )
    const maxWidth = Math.max(
      0,
      vertical
        ? viewportWidth - viewportInset * 2
        : Math.min(available, viewportWidth - viewportInset * 2),
    )

    const nextStyle: CSSProperties = {
      position: 'fixed',
      direction: direction === 'rtl' ? 'rtl' : 'ltr',
      top: Math.round(
        clamp(
          top,
          viewportInset,
          viewportHeight - contentRect.height - viewportInset,
        ),
      ),
      left: Math.round(
        clamp(
          left,
          viewportInset,
          viewportWidth - contentRect.width - viewportInset,
        ),
      ),
      right: 'auto',
      bottom: 'auto',
      maxWidth: Math.round(maxWidth),
      maxHeight: Math.round(maxHeight),
      overflowY: 'auto',
      ...(matchTriggerWidth
        ? {
            width: Math.round(Math.min(triggerRect.width, maxWidth)),
            minWidth: Math.round(Math.min(triggerRect.width, maxWidth)),
          }
        : null),
    }
    setPosition((previous) =>
      previous.side === resolvedSide &&
      Object.keys(previous.style).length === Object.keys(nextStyle).length &&
      Object.entries(nextStyle).every(
        ([key, value]) => previous.style[key as keyof CSSProperties] === value,
      )
        ? previous
        : { style: nextStyle, side: resolvedSide },
    )
  }, [
    align,
    contentRef,
    dir,
    directionRef,
    matchTriggerWidth,
    side,
    sideOffset,
    triggerRef,
    viewportInset,
  ])

  useEffect(() => {
    if (!open) {
      setPosition((previous) =>
        previous.style === initialStyle && previous.side === side
          ? previous
          : { style: initialStyle, side },
      )
      return
    }

    const view = triggerRef.current?.ownerDocument.defaultView
    if (!view) return
    update()
    const rafId = view.requestAnimationFrame(update)
    const handleWindowChange = () => update()
    const resizeObserver =
      typeof view.ResizeObserver !== 'undefined'
        ? new view.ResizeObserver(handleWindowChange)
        : null

    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    if (contentRef.current) resizeObserver?.observe(contentRef.current)
    view.addEventListener('resize', handleWindowChange)
    view.addEventListener('scroll', handleWindowChange, true)

    return () => {
      view.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      view.removeEventListener('resize', handleWindowChange)
      view.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [contentRef, open, side, triggerRef, update])

  // Native direction and class changes need not resize the anchor. Read them
  // after each commit; equality above avoids producing another render.
  useEffect(() => {
    if (open) update()
  })

  return { ...position, update }
}
