import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { alignFloatingOption, readFloatingOptionCenters } from '../adapters/react/floating-option-alignment'
import { readCssLength } from '../adapters/react/read-css-length'
import { useIsomorphicLayoutEffect } from '../adapters/react/use-isomorphic-layout-effect'
import { readDirection } from '../runtime/keyboard'
import { SELECT_SIDE_VIEWPORT_INSET, computeSelectSideOptionViewportHeight, computeSelectSidePosition } from '../../Select/select-side-position'

export const SELECT_SIDE_PANEL_SELECTOR = '.uf-select__contentPanel'
export const SELECT_SIDE_VIEWPORT_SELECTOR = '[data-part="listbox"]'
const PANEL = SELECT_SIDE_PANEL_SELECTOR
const VIEWPORT = SELECT_SIDE_VIEWPORT_SELECTOR
const OPTION = '[data-part="option"]'
const SIDE_BOUNDARY = '[data-uf-select-side-boundary]'
const SIDE_ATTACHMENT = '[data-uf-dropdown-attachment]'
function hasAdaptiveSideRows(trigger: HTMLElement | null) {
  return Boolean(trigger?.closest(SIDE_ATTACHMENT) && trigger.ownerDocument.defaultView?.getComputedStyle(trigger)
    .getPropertyValue('--uf-dropdown-row-alignment').trim() === 'adaptive')
}
/** The row the side panel lines up with the trigger: selected, else highlighted, else first. */
const SIDE_ANCHORS = [
  `${OPTION}[aria-selected="true"]`,
  `${OPTION}[data-highlighted]`,
  OPTION,
]
const sideInitialStyle: CSSProperties = {
  position: 'fixed',
  top: -9999,
  left: -9999,
}

function readSideMetrics(content: HTMLElement) {
  const surface = content.querySelector<HTMLElement>(PANEL) ?? content
  const viewport = content.querySelector<HTMLElement>(VIEWPORT) ?? surface
  const bounds = surface.getBoundingClientRect()
  const scale = bounds.height > 0 && surface.offsetHeight > 0
    ? bounds.height / surface.offsetHeight : 1
  const offset = (y: number) => (y - bounds.top) / scale + viewport.scrollTop
  const css = surface.ownerDocument.defaultView?.getComputedStyle(surface)
  const inset = css ? ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
    .reduce((sum, name) => sum + (Number.parseFloat(css[name as keyof CSSStyleDeclaration] as string) || 0), 0) : 0
  // The list owns scrolling; its scrollHeight retains the natural content size
  // under a runtime cap. Measuring never changes styles or the user's scroll.
  const contentHeight = Math.max(viewport.scrollHeight + inset, surface.offsetHeight)
  const desiredVisibleHeight = computeSelectSideOptionViewportHeight({
    contentHeight,
    optionBottomOffsets: Array.from(
      content.querySelectorAll<HTMLElement>(OPTION),
      (option) => offset(option.getBoundingClientRect().bottom),
    ),
  })
  const authoredMaxHeight = readCssLength(content, '--uf-select-side-content-max-height')
  const maxVisibleHeight = authoredMaxHeight === null
    ? desiredVisibleHeight : Math.min(desiredVisibleHeight, Math.max(0, authoredMaxHeight))
  const anchor = SIDE_ANCHORS.map((selector) => content.querySelector<HTMLElement>(selector)).find(Boolean)
  const row = anchor?.getBoundingClientRect()
  const centered = row && Number.isFinite(bounds.top) && Number.isFinite(row.top) && row.height > 0
  return {
    contentHeight,
    maxVisibleHeight,
    activeOptionCenterOffset: centered ? offset(row.top + row.height / 2) : null,
  }
}

function sameSideStyle(previous: CSSProperties, next: CSSProperties): boolean {
  const keys = Object.keys(next) as Array<keyof CSSProperties>
  return Object.keys(previous).length === keys.length && keys.every(key => previous[key] === next[key])
}

/** Places the side surface beside the trigger with the selected row on the trigger's line. */
export function useSelectSidePosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
) {
  const [style, setStyle] = useState<CSSProperties>(sideInitialStyle)
  const initialScrollSynced = useRef(false)
  const pendingScroll = useRef(0)

  const update = useCallback(() => {
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return
    const metrics = readSideMetrics(content)
    const attachment = trigger.closest(SIDE_ATTACHMENT)
    const contentRect = content.getBoundingClientRect()
    const panelRect = attachment ? content.querySelector<HTMLElement>(PANEL)?.getBoundingClientRect() : null
    const position = computeSelectSidePosition({
      triggerRect: trigger.getBoundingClientRect(),
      boundaryRect: trigger.closest(SIDE_BOUNDARY)?.getBoundingClientRect(),
      attachmentRect: attachment?.getBoundingClientRect(),
      requestedGap: attachment ? readCssLength(trigger, '--uf-dropdown-panel-gap') ?? undefined : undefined,
      surfaceInsets: panelRect ? {
        left: Math.max(0, panelRect.left - contentRect.left),
        right: Math.max(0, contentRect.right - panelRect.right),
      } : undefined,
      direction: readDirection(trigger),
      contentHeight: metrics.contentHeight,
      requestedMaxHeight: metrics.maxVisibleHeight,
      activeOptionCenterOffset: metrics.activeOptionCenterOffset,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
    const adaptiveRows = hasAdaptiveSideRows(trigger)
    if (adaptiveRows) {
      const boundary = trigger.closest(SIDE_BOUNDARY)?.getBoundingClientRect()
      const gap = Math.max(0, readCssLength(trigger, '--uf-dropdown-panel-gap') ?? 4)
      const consumerInset = readCssLength(trigger, '--uf-dropdown-viewport-inset') ?? undefined
      const paintedTopInset = panelRect ? Math.max(0, panelRect.top - contentRect.top) : 0
      const paintedBottomInset = panelRect ? Math.max(0, contentRect.bottom - panelRect.bottom) : 0
      const top = consumerInset === undefined
        ? Math.max(SELECT_SIDE_VIEWPORT_INSET, boundary?.top ?? 0) + gap
        : Math.max(Math.max(0, consumerInset) - paintedTopInset, boundary ? boundary.top + gap : -Infinity)
      const bottom = consumerInset === undefined
        ? Math.min(window.innerHeight - SELECT_SIDE_VIEWPORT_INSET, boundary?.bottom ?? window.innerHeight) - gap
        : Math.min(window.innerHeight - Math.max(0, consumerInset) + paintedBottomInset, boundary ? boundary.bottom - gap : Infinity)
      const triggerRect = trigger.getBoundingClientRect()
      position.top = alignFloatingOption({
        triggerCenter: triggerRect.top + triggerRect.height / 2,
        contentHeight: contentRect.height,
        minimumTop: top,
        maximumTop: bottom - contentRect.height,
        optionCenterOffsets: readFloatingOptionCenters(content, OPTION),
      })
    }
    const next = {
      position: 'fixed',
      top: position.top,
      left: position.left,
      right: 'auto',
      bottom: 'auto',
      width: position.width,
      maxWidth: `calc(100vw - ${SELECT_SIDE_VIEWPORT_INSET * 2}px)`,
      maxHeight: position.maxHeight,
      '--face-runtime-select-side-content-max-height': `${position.maxHeight}px`,
      overflowY: 'visible',
    } as CSSProperties
    setStyle(previous => sameSideStyle(previous, next) ? previous : next)
    pendingScroll.current = position.initialScrollTop
  }, [contentRef, triggerRef])

  useIsomorphicLayoutEffect(() => {
    if (!open || style === sideInitialStyle || initialScrollSynced.current)
      return
    const viewport = contentRef.current?.querySelector<HTMLElement>(VIEWPORT)
    if (!viewport) return
    viewport.scrollTop = pendingScroll.current
    initialScrollSynced.current = true
    if (hasAdaptiveSideRows(triggerRef.current)) update()
  }, [open, style, contentRef, triggerRef, update])

  useEffect(() => {
    if (!open) {
      initialScrollSynced.current = false
      setStyle(sideInitialStyle)
      return
    }
    let frame: number | null = null
    let disposed = false
    const schedule = () => {
      if (disposed || frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        if (!disposed) update()
      })
    }
    update()
    schedule()
    const onScroll = (event: Event) => {
      // Scrolling the options changes which row is visible, not the attachment
      // geometry. Feeding that scroll back into row alignment moves the menu
      // under the pointer and can scroll the selected row back into view.
      if (!(event.target instanceof Node && contentRef.current?.contains(event.target))) schedule()
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    for (const node of [
      triggerRef.current,
      contentRef.current,
      triggerRef.current?.closest(SIDE_BOUNDARY),
      triggerRef.current?.closest(SIDE_ATTACHMENT),
    ]) if (node) observer?.observe(node)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', onScroll, true)
    const content = contentRef.current
    const onTransitionEnd = () => { if (hasAdaptiveSideRows(triggerRef.current)) schedule() }
    content?.addEventListener('transitionend', onTransitionEnd)
    return () => {
      disposed = true
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', onScroll, true)
      content?.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [contentRef, open, triggerRef, update])

  return style
}
