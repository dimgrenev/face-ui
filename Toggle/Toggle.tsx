/**
 * Toggle — deprecated compatibility wrapper over SegmentedControl.
 *
 * Prefer `SegmentedControl` (the canonical engine). Toggle maps its legacy
 * `type` prop onto SegmentedControl's `selectionMode` and is kept only for
 * backward compatibility (see compat.ts).
 *
 * Single mode: `<Toggle type="single" items={[...]} />`
 * Multiple mode: `<Toggle type="multiple" items={[...]} />`
 */

import { forwardRef } from 'react'
import { SegmentedControl, type SegmentedControlItem } from '../SegmentedControl/SegmentedControl'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToggleItem extends SegmentedControlItem {}

export interface ToggleProps {
  /** Toggle items to render. */
  items?: ToggleItem[]
  /** Currently selected values. */
  value?: string[]
  /** Uncontrolled initial selected values. */
  defaultValue?: string[]
  /** Selection mode: single or multiple. */
  type?: 'single' | 'multiple'
  /** Disabled state for the entire group. */
  disabled?: boolean
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Callback when value changes. */
  onValueChange?: (details: { value: string[] }) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper around each toggle item. */
  membrane?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Toggle = forwardRef<HTMLDivElement, ToggleProps>(
  function Toggle(props, ref) {
    const { type = 'multiple', ...rest } = props
    return <SegmentedControl ref={ref} selectionMode={type} {...rest} />
  },
)
