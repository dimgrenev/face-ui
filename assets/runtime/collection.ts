/**
 * @face-ui/core — ListCollection
 *
 * O(1) lookup, navigation, search, filter for list-based components.
 * Used by Select, Menu, Radio, Toggle, etc.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionItem<T = unknown> {
  value: string
  label: string
  disabled?: boolean
  data?: T
  group?: string
}

export interface CollectionOptions<T = unknown> {
  items: CollectionItem<T>[]
  itemToValue?: (item: CollectionItem<T>) => string
  itemToString?: (item: CollectionItem<T>) => string
}

export interface CollectionGroup<T = unknown> {
  label: string
  items: CollectionItem<T>[]
}

// ---------------------------------------------------------------------------
// ListCollection
// ---------------------------------------------------------------------------

export class ListCollection<T = unknown> {
  private items: CollectionItem<T>[]
  private indexMap: Map<string, number>
  private itemToValue: (item: CollectionItem<T>) => string
  private itemToString: (item: CollectionItem<T>) => string

  constructor(options: CollectionOptions<T>) {
    this.items = options.items
    this.itemToValue = options.itemToValue ?? ((item) => item.value)
    this.itemToString = options.itemToString ?? ((item) => item.label)
    this.indexMap = new Map()
    this.reindex()
  }

  private reindex() {
    this.indexMap.clear()
    for (let i = 0; i < this.items.length; i++) {
      this.indexMap.set(this.itemToValue(this.items[i]), i)
    }
  }

  // -- Query -----------------------------------------------------------------

  get size(): number {
    return this.items.length
  }

  getItems(): CollectionItem<T>[] {
    return this.items
  }

  getItem(value: string): CollectionItem<T> | undefined {
    const idx = this.indexMap.get(value)
    return idx != null ? this.items[idx] : undefined
  }

  has(value: string): boolean {
    return this.indexMap.has(value)
  }

  indexOf(value: string): number {
    return this.indexMap.get(value) ?? -1
  }

  at(index: number): CollectionItem<T> | undefined {
    return this.items[index]
  }

  first(): CollectionItem<T> | undefined {
    return this.items[0]
  }

  last(): CollectionItem<T> | undefined {
    return this.items[this.items.length - 1]
  }

  // -- Navigation ------------------------------------------------------------

  next(value: string, opts?: { loop?: boolean; skipDisabled?: boolean }): CollectionItem<T> | undefined {
    const idx = this.indexOf(value)
    if (idx < 0) return this.first()
    const loop = opts?.loop ?? true
    const skipDisabled = opts?.skipDisabled ?? true

    for (let i = 1; i <= this.items.length; i++) {
      const nextIdx = loop
        ? (idx + i) % this.items.length
        : idx + i
      if (nextIdx >= this.items.length) return undefined
      const item = this.items[nextIdx]
      if (skipDisabled && item.disabled) continue
      return item
    }
    return undefined
  }

  prev(value: string, opts?: { loop?: boolean; skipDisabled?: boolean }): CollectionItem<T> | undefined {
    const idx = this.indexOf(value)
    if (idx < 0) return this.last()
    const loop = opts?.loop ?? true
    const skipDisabled = opts?.skipDisabled ?? true

    for (let i = 1; i <= this.items.length; i++) {
      const prevIdx = loop
        ? (idx - i + this.items.length) % this.items.length
        : idx - i
      if (prevIdx < 0) return undefined
      const item = this.items[prevIdx]
      if (skipDisabled && item.disabled) continue
      return item
    }
    return undefined
  }

  firstEnabled(): CollectionItem<T> | undefined {
    return this.items.find((item) => !item.disabled)
  }

  lastEnabled(): CollectionItem<T> | undefined {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].disabled) return this.items[i]
    }
    return undefined
  }

  // -- Search / Filter -------------------------------------------------------

  search(query: string): CollectionItem<T>[] {
    const q = query.toLowerCase()
    return this.items.filter((item) =>
      this.itemToString(item).toLowerCase().includes(q),
    )
  }

  filter(predicate: (item: CollectionItem<T>) => boolean): CollectionItem<T>[] {
    return this.items.filter(predicate)
  }

  // -- Groups ----------------------------------------------------------------

  getGroups(): CollectionGroup<T>[] {
    const groupMap = new Map<string, CollectionItem<T>[]>()
    for (const item of this.items) {
      const key = item.group ?? ''
      const arr = groupMap.get(key) ?? []
      arr.push(item)
      groupMap.set(key, arr)
    }
    return Array.from(groupMap.entries()).map(([label, items]) => ({
      label,
      items,
    }))
  }

  // -- Mutation (returns new collection) -------------------------------------

  setItems(items: CollectionItem<T>[]): ListCollection<T> {
    return new ListCollection({
      items,
      itemToValue: this.itemToValue,
      itemToString: this.itemToString,
    })
  }

  // -- String conversion -----------------------------------------------------

  toString(value: string): string {
    const item = this.getItem(value)
    return item ? this.itemToString(item) : ''
  }

  toValues(values: string[]): CollectionItem<T>[] {
    return values
      .map((v) => this.getItem(v))
      .filter((item): item is CollectionItem<T> => item != null)
  }
}

// ---------------------------------------------------------------------------
// Convenience constructors
// ---------------------------------------------------------------------------

export function fromStrings(strings: string[]): ListCollection {
  return new ListCollection({
    items: strings.map((s) => ({ value: s, label: s })),
  })
}

export function fromItems<T>(
  items: CollectionItem<T>[],
  options?: {
    itemToValue?: (item: CollectionItem<T>) => string
    itemToString?: (item: CollectionItem<T>) => string
  },
): ListCollection<T> {
  return new ListCollection({ items, ...options })
}

// ---------------------------------------------------------------------------
// Typeahead
// ---------------------------------------------------------------------------

export interface TypeaheadState {
  keysSoFar: string
  timer: ReturnType<typeof setTimeout> | null
}

export function createTypeahead(opts?: { timeout?: number }): {
  state: TypeaheadState
  handle: (key: string) => string
  reset: () => void
} {
  const timeout = opts?.timeout ?? 350
  const state: TypeaheadState = { keysSoFar: '', timer: null }

  return {
    state,
    handle: (key: string) => {
      if (state.timer) clearTimeout(state.timer)
      state.keysSoFar += key.toLowerCase()
      state.timer = setTimeout(() => {
        state.keysSoFar = ''
        state.timer = null
      }, timeout)
      return state.keysSoFar
    },
    reset: () => {
      if (state.timer) clearTimeout(state.timer)
      state.keysSoFar = ''
      state.timer = null
    },
  }
}
