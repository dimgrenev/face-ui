import type { ReactNode } from 'react'

/**
 * Shared base for Face UI navigation/tree item descriptors.
 *
 * Tree, Panel and Navigation all describe items with a stable id, a label and
 * an optional disabled flag. Extending this base keeps that core shape aligned
 * across the navigation family without changing any item type's public fields —
 * component-specific fields (children/items/href/icon/…) stay on each type.
 */
export interface NavItemBase {
  /** Stable unique id. */
  id: string
  /** Visible label content. */
  label: ReactNode
  /** Disable this item. */
  disabled?: boolean
}
