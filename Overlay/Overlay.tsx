import {
  FloatingOverlay,
  type FloatingOverlayProps,
} from '../assets/adapters/react/FloatingOverlay'

export type OverlayProps = FloatingOverlayProps
/**
 * Floating content surface unifying tooltip, popover and hover card.
 * @deprecated Use Tooltip or Popover; shared behavior lives in FloatingOverlay.
 */
export const Overlay = FloatingOverlay
