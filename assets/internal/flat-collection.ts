import {
  readCollection,
  type Collection,
  type CollectionSpec,
} from '../runtime/collection'
import { invalidProp } from '../runtime/props'

/** A flat component has no place for K9 groups, separators, or a group's nested items. */
export function readFlatCollection<T>(
  items: unknown,
  spec: Omit<CollectionSpec<T>, 'children'>,
): Collection<T> {
  const flatItems = Array.isArray(items)
    ? Array.from(items).filter((item: unknown) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return true
        const { type } = item as { type?: unknown }
        if (type !== 'group' && type !== 'separator') return true
        invalidProp(spec.component, `${spec.prop ?? 'items'}[].type`, type, 'dropping the item')
        return false
      })
    : items
  return readCollection(flatItems, spec)
}
