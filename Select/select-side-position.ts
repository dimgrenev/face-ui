// Pure placement math for Select `surface="side"`.
const SELECT_SIDE_WIDTH = 240
const SELECT_SIDE_MAX_HEIGHT = 480
export const SELECT_SIDE_VIEWPORT_INSET = 4
const SELECT_SIDE_GAP = 4
const SELECT_SIDE_MIN_HEIGHT = 80
export const SELECT_SIDE_VISIBLE_OPTION_COUNT = 5

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), Math.max(min, max))
}

type SelectSideRect = Pick<
  DOMRect,
  'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'
>

export interface SelectSidePosition {
  top: number
  left: number
  width: number
  maxHeight: number
  initialScrollTop: number
}

export function computeSelectSideOptionViewportHeight(params: {
  contentHeight: number
  optionBottomOffsets: number[]
  visibleOptionLimit?: number
}): number {
  const contentHeight = Math.max(0, params.contentHeight)
  const optionBottomOffsets = params.optionBottomOffsets.filter(
    (value) => Number.isFinite(value) && value > 0,
  )
  const visibleOptionLimit = Math.max(
    1,
    Math.floor(params.visibleOptionLimit ?? SELECT_SIDE_VISIBLE_OPTION_COUNT),
  )
  if (optionBottomOffsets.length <= visibleOptionLimit) return contentHeight

  const lastOptionBottom =
    optionBottomOffsets[optionBottomOffsets.length - 1] || contentHeight
  const visibleOptionsBottom =
    optionBottomOffsets[visibleOptionLimit - 1] || contentHeight
  const trailingInset = Math.max(0, contentHeight - lastOptionBottom)
  return Math.min(contentHeight, visibleOptionsBottom + trailingInset)
}

export function computeSelectSidePosition(params: {
  triggerRect: SelectSideRect
  boundaryRect: SelectSideRect | null | undefined
  /** Horizontal attachment is independent from the boundary's vertical workbench limits. */
  attachmentRect?: SelectSideRect | null
  /** Painted panel insets inside the positioning box, used only with attachmentRect. */
  surfaceInsets?: { left: number; right: number }
  contentHeight: number
  viewportWidth: number
  viewportHeight: number
  requestedWidth?: number
  requestedMaxHeight?: number
  requestedGap?: number
  requestedInset?: number
  activeOptionCenterOffset?: number | null
  direction?: 'ltr' | 'rtl'
}): SelectSidePosition {
  const {
    triggerRect,
    boundaryRect,
    attachmentRect,
    surfaceInsets,
    contentHeight,
    viewportWidth,
    viewportHeight,
    requestedWidth = SELECT_SIDE_WIDTH,
    requestedMaxHeight = SELECT_SIDE_MAX_HEIGHT,
    requestedGap = SELECT_SIDE_GAP,
    requestedInset = SELECT_SIDE_VIEWPORT_INSET,
    activeOptionCenterOffset,
    direction = 'ltr',
  } = params
  const inset = Math.max(0, requestedInset)
  const gap = Math.max(0, requestedGap)
  const viewportLeft = inset
  const viewportRight = Math.max(viewportLeft, viewportWidth - inset)
  const viewportTop = inset
  const viewportBottom = Math.max(viewportTop, viewportHeight - inset)
  const boundaryTop =
    boundaryRect == null
      ? viewportTop
      : clamp(boundaryRect.top, viewportTop, viewportBottom)
  const boundaryBottom =
    boundaryRect == null
      ? viewportBottom
      : clamp(boundaryRect.bottom, viewportTop, viewportBottom)
  const panelWidth = Math.min(
    requestedWidth,
    Math.max(SELECT_SIDE_MIN_HEIGHT, viewportRight - viewportLeft),
  )
  const verticalMin = Math.min(boundaryTop + gap, viewportBottom)
  const verticalMax = Math.max(verticalMin, boundaryBottom - gap)
  const availableHeight = Math.max(
    SELECT_SIDE_MIN_HEIGHT,
    verticalMax - verticalMin,
  )
  const panelHeight = Math.min(
    requestedMaxHeight,
    Math.max(SELECT_SIDE_MIN_HEIGHT, contentHeight || requestedMaxHeight),
    availableHeight,
  )
  const attachment = attachmentRect ?? boundaryRect ?? triggerRect
  const anchorLeft = attachment.right
  const anchorRight = attachment.left
  const rightSpace = viewportRight - anchorLeft
  const leftSpace = anchorRight - viewportLeft
  const rightGap = gap - (attachmentRect ? Math.max(0, surfaceInsets?.left ?? 0) : 0)
  const leftGap = gap - (attachmentRect ? Math.max(0, surfaceInsets?.right ?? 0) : 0)
  const rightFits = rightSpace >= panelWidth + rightGap
  const leftFits = leftSpace >= panelWidth + leftGap
  // The panel prefers the inline end: right in LTR, left in RTL.
  const endIsLeft = { ltr: false, rtl: true }[direction]
  const openLeft = endIsLeft
    ? leftFits || leftSpace >= rightSpace
    : !rightFits && leftSpace > rightSpace
  // When neither side fits, keep the trigger exposed for hover followed by click.
  if (!leftFits && !rightFits) {
    const below = Math.max(0, verticalMax - triggerRect.bottom - gap)
    const above = Math.max(0, triggerRect.top - gap - verticalMin)
    const openBelow = below >= panelHeight || below >= above
    const height = Math.max(1, Math.min(panelHeight, openBelow ? below : above))
    const top = openBelow
      ? triggerRect.bottom + gap
      : triggerRect.top - gap - height
    const scrollTop =
      typeof activeOptionCenterOffset === 'number' &&
      Number.isFinite(activeOptionCenterOffset)
        ? clamp(
            activeOptionCenterOffset - height / 2,
            0,
            contentHeight - height,
          )
        : 0
    return {
      top: Math.round(clamp(top, verticalMin, verticalMax - height)),
      left: Math.round(
        clamp(
          endIsLeft ? triggerRect.right - panelWidth : triggerRect.left,
          viewportLeft,
          viewportRight - panelWidth,
        ),
      ),
      width: Math.round(panelWidth),
      maxHeight: Math.round(height),
      initialScrollTop: Math.round(scrollTop),
    }
  }
  const desiredLeft = openLeft
    ? anchorRight - panelWidth - leftGap
    : anchorLeft + rightGap
  const triggerCenter = triggerRect.top + triggerRect.height / 2
  const hasActiveOptionOffset =
    typeof activeOptionCenterOffset === 'number' &&
    Number.isFinite(activeOptionCenterOffset)
  const desiredTop = hasActiveOptionOffset
    ? triggerCenter -
      (contentHeight > panelHeight
        ? Math.min(activeOptionCenterOffset, panelHeight / 2)
        : activeOptionCenterOffset)
    : triggerRect.top

  const top = clamp(desiredTop, verticalMin, verticalMax - panelHeight)
  const maxScrollTop = Math.max(0, contentHeight - panelHeight)
  const scrollTop = hasActiveOptionOffset
    ? clamp(top + activeOptionCenterOffset - triggerCenter, 0, maxScrollTop)
    : 0

  return {
    top: Math.round(top),
    left: Math.round(
      clamp(desiredLeft, viewportLeft, viewportRight - panelWidth),
    ),
    width: Math.round(panelWidth),
    maxHeight: Math.max(1, Math.round(panelHeight)),
    initialScrollTop: Math.round(scrollTop),
  }
}
