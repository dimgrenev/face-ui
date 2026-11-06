import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { readCssLength } from './read-css-length'
import { alignFloatingOption, readFloatingOptionCenters } from './floating-option-alignment'

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
export type FloatingAlign = 'start' | 'center' | 'end'

export interface UseFloatingPositionOptions {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  /** Nearest ancestor that supplies the horizontal attachment edges for lateral surfaces. */
  attachmentSelector?: string
  /** Visible option selector for adaptive row alignment on left/right surfaces. */
  alignToOption?: string
  /** Painted surface inside contentRef; attachment gaps exclude its outer membrane. */
  surfaceRef?: RefObject<HTMLElement | null>
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

type PlacementRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>
type SideOffsets = Record<FloatingSide, number>

function getAvailableSpace(
  triggerRect: PlacementRect,
  side: FloatingSide,
  offsets: SideOffsets,
  viewportInset: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const sideOffset = offsets[side] ?? offsets.right
  if (side === 'top') return triggerRect.top - sideOffset - viewportInset
  if (side === 'bottom')
    return viewportHeight - triggerRect.bottom - sideOffset - viewportInset
  if (side === 'left') return triggerRect.left - sideOffset - viewportInset
  return viewportWidth - triggerRect.right - sideOffset - viewportInset
}

function resolveSide(
  preferredSide: FloatingSide,
  triggerRect: PlacementRect,
  contentRect: DOMRect,
  offsets: SideOffsets,
  viewportInset: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const currentSpace = getAvailableSpace(
    triggerRect,
    preferredSide,
    offsets,
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
    offsets,
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
    attachmentSelector,
    alignToOption,
    surfaceRef = contentRef,
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
    const lateral = side === 'left' || side === 'right'
    let attachment: Element | null = null
    if (lateral && attachmentSelector) {
      try { attachment = triggerEl.closest(attachmentSelector) } catch { attachment = null }
    }
    const attachmentRect = attachment?.getBoundingClientRect()
    const placementRect = attachmentRect ? {
      left: attachmentRect.left,
      right: attachmentRect.right,
      top: triggerRect.top,
      bottom: triggerRect.bottom,
    } : triggerRect
    const gap = attachment ? Math.max(0, readCssLength(triggerEl, '--uf-dropdown-panel-gap') ?? sideOffset) : sideOffset
    const surfaceRect = attachment ? surfaceRef.current?.getBoundingClientRect() : null
    // A consumer may constrain the painted surface rather than its outer
    // membrane. Keep the authored viewport inset for every unmarked surface.
    const rowViewportInset = attachment && alignToOption
      ? readCssLength(triggerEl, '--uf-dropdown-viewport-inset') ?? undefined : undefined
    const paintedTopInset = surfaceRect ? Math.max(0, surfaceRect.top - contentRect.top) : 0
    const paintedBottomInset = surfaceRect ? Math.max(0, contentRect.bottom - surfaceRect.bottom) : 0
    const offsets: SideOffsets = {
      top: sideOffset,
      bottom: sideOffset,
      left: gap - (surfaceRect ? Math.max(0, contentRect.right - surfaceRect.right) : 0),
      right: gap - (surfaceRect ? Math.max(0, surfaceRect.left - contentRect.left) : 0),
    }
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
      placementRect,
      contentRect,
      offsets,
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
      left = placementRect.left - contentRect.width - offsets.left
    } else if (resolvedSide === 'right') {
      top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
      left = placementRect.right + offsets.right
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
    const optionCenterOffsets = !vertical && alignToOption
      ? readFloatingOptionCenters(contentEl, alignToOption) : []
    const alignedToRow = optionCenterOffsets.length > 0
    const paintedViewport = alignedToRow && rowViewportInset !== undefined
    const minimumRowTop = paintedViewport
      ? Math.max(0, rowViewportInset) - paintedTopInset : viewportInset
    const maximumRowTop = paintedViewport
      ? viewportHeight - contentRect.height - Math.max(0, rowViewportInset) + paintedBottomInset
      : viewportHeight - contentRect.height - viewportInset
    const available = Math.max(
      0,
      getAvailableSpace(
        placementRect,
        resolvedSide,
        offsets,
        viewportInset,
        viewportWidth,
        viewportHeight,
      ),
    )
    const maxHeight = Math.max(
      0,
      vertical
        ? Math.min(available, viewportHeight - viewportInset * 2)
        : paintedViewport
          ? viewportHeight - Math.max(0, rowViewportInset) * 2 + paintedTopInset + paintedBottomInset
          : viewportHeight - viewportInset * 2,
    )
    const maxWidth = Math.max(
      0,
      vertical
        ? viewportWidth - viewportInset * 2
        : Math.min(available, viewportWidth - viewportInset * 2),
    )

    if (alignedToRow) {
      top = alignFloatingOption({
        triggerCenter: triggerRect.top + triggerRect.height / 2,
        contentHeight: contentRect.height,
        minimumTop: minimumRowTop,
        maximumTop: maximumRowTop,
        optionCenterOffsets,
      })
    }

    const nextStyle: CSSProperties = {
      position: 'fixed',
      direction: direction === 'rtl' ? 'rtl' : 'ltr',
      top: alignedToRow ? top : Math.round(
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
    alignToOption,
    attachmentSelector,
    contentRef,
    dir,
    directionRef,
    matchTriggerWidth,
    side,
    sideOffset,
    surfaceRef,
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
    if (attachmentSelector && triggerRef.current) {
      try {
        const attachment = triggerRef.current.closest(attachmentSelector)
        if (attachment) resizeObserver?.observe(attachment)
      } catch { /* An invalid optional selector leaves trigger-relative placement intact. */ }
    }
    view.addEventListener('resize', handleWindowChange)
    view.addEventListener('scroll', handleWindowChange, true)
    const content = contentRef.current
    if (alignToOption) content?.addEventListener('transitionend', handleWindowChange)

    return () => {
      view.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      view.removeEventListener('resize', handleWindowChange)
      view.removeEventListener('scroll', handleWindowChange, true)
      if (alignToOption) content?.removeEventListener('transitionend', handleWindowChange)
    }
  }, [alignToOption, attachmentSelector, contentRef, open, side, triggerRef, update])

  // Native direction and class changes need not resize the anchor. Read them
  // after each commit; equality above avoids producing another render.
  useEffect(() => {
    if (open) update()
  })

  return { ...position, update }
}
