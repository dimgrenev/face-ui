/**
 * Shared component prop interfaces.
 * Every Face UI component reuses these for consistency.
 */

/** Base props for all interactive components */
export interface ControlProps {
  disabled?: boolean
  membrane?: boolean
}

/** Layout props for text-containing components */
export interface LayoutProps {
  stretchText?: boolean
  fullWidth?: boolean
  align?: 'left' | 'center' | 'right'
}

/** Label props for form controls */
export interface LabelProps {
  label?: string
  labelOrientation?: 'vertical' | 'horizontal'
}

/** Icon props */
export interface IconProps {
  icon?: unknown
  iconPosition?: 'left' | 'right'
  iconOnly?: boolean
}

/** List state props (empty/loading/error) */
export interface ListStateProps {
  empty?: unknown // ReactNode in adapter
  loading?: boolean
  error?: unknown  // ReactNode in adapter
}

/** Controlled/uncontrolled value pattern */
export interface ValueProps<T = string> {
  value?: T
  defaultValue?: T
  onValueChange?: (details: { value: T }) => void
}

/** Open/close state pattern */
export interface OpenProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (details: { open: boolean }) => void
}

/** Checked state pattern */
export interface CheckedProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (details: { checked: boolean }) => void
}

/** Responsive surface pattern for dropdown-like overlays */
export interface ResponsiveSurfaceProps {
  surface?: 'auto' | 'popover' | 'sheet'
  surfaceBreakpoint?: number
}
