import type { ReactNode } from 'react'

/** The base item of every `items` collection; component item types extend it. */
export interface CollectionItem {
  /** Stable key, unique within the collection; an empty string is a valid key. */
  value: string
  /** Visible content. */
  label: ReactNode
  /** Keeps the item visible but out of selection and keyboard navigation. */
  disabled?: boolean
  /** Plain text for typeahead and filtering when `label` is not a string. */
  textValue?: string
  /** Icon at the start of the label. */
  icon?: ReactNode
}

/** A labelled run of items inside `items`; the group itself is never selectable. */
export interface ItemGroup<I> {
  type: 'group'
  /** Visible group heading. */
  label: ReactNode
  /** The grouped items, in order. */
  items: readonly I[]
}

/** A divider between items inside `items`. */
export interface ItemSeparator {
  type: 'separator'
}
