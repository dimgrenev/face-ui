import type { HTMLAttributes, ReactNode } from 'react'

export interface FloatingSurfaceProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'content'
  | 'children'
  | 'role'
  | 'tabIndex'
  | 'autoFocus'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'defaultValue'
  | 'defaultChecked'
  | 'popover'
> {
  /** Content of the floating surface; empty content renders the trigger alone. Tooltip content must stay noninteractive. */
  content?: ReactNode
  /** One trigger element forwarding props/ref, or text rendered as a Button. */
  children?: ReactNode
  /** Controlled visibility; updates from the parent never call onOpenChange. */
  open?: boolean
  /** Visibility on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Preferred side; may flip when the opposite side has more room. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Logical alignment on the cross axis, following dir or the trigger's direction. */
  align?: 'start' | 'center' | 'end'
  /** Gap in pixels between the trigger and the content membrane; negative values overlap them. Default 2. */
  sideOffset?: number
  /** Nearest ancestor used for left/right attachment; --uf-dropdown-panel-gap measures the painted surface gap. Vertical alignment still follows the trigger. */
  attachmentSelector?: string
  /** Aligns a measured visible row opposite the trigger on left/right surfaces; pass the row's selector. */
  alignToOption?: string
  /** Content direction; omitted inherits the trigger's, auto follows the content. */
  dir?: HTMLAttributes<HTMLDivElement>['dir']
  /** Called once per user request to show or hide the surface; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Class on the same content surface as native attributes, style and ref. */
  className?: string
}

export interface HoverTimingProps {
  /** Milliseconds from hover or focus to showing the surface, 0–2147483647; default 200. */
  openDelay?: number
  /** Milliseconds from hover and focus leaving to hiding the surface, 0–2147483647; default 0. */
  closeDelay?: number
}

export type FloatingOverlayProps = FloatingSurfaceProps &
  (
    | (HoverTimingProps & {
        /** Opens on hover and keyboard focus of the trigger, or toggles on its click. */
        openOn?: 'hover'
        /** Hover content holds controls: dialog semantics, and focus it took returns to the trigger. */
        interactive?: boolean
      })
    | {
        /** Opens on hover and keyboard focus of the trigger, or toggles on its click. */
        openOn: 'click'
        interactive?: never
        openDelay?: never
        closeDelay?: never
      }
  )
