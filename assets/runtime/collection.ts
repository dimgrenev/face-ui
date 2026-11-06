import { invalidProp } from './props'

/** How `readCollection` reads one component's `items`. */
export interface CollectionSpec<T> {
  /** Component name in reports, such as `'Tabs'`. */
  component: string
  /** Prop name in reports; defaults to `'items'`. */
  prop?: string
  /** Reads the item's key; a non-string or duplicate key drops the item (first wins) with a report. */
  key: (item: T) => unknown
  /** Display-only lists: a missing key becomes `#<index>` silently, a non-string one with a report. */
  positional?: boolean
  /** Plain text for typeahead and filtering; defaults to a string `textValue`, then a string `label`. */
  text?: (item: T) => string | undefined
  /** Whether the item is disabled; defaults to `item.disabled === true`. */
  disabled?: (item: T) => boolean
  /** The item's nested items (Tree, Navigation, Panel); `undefined` and `null` mean a leaf. */
  children?: (item: T) => unknown
}

/** One item that survived `readCollection`. */
export interface Entry<T> {
  /** Unique across the whole collection, all levels included. */
  readonly key: string
  /** The item as passed in. */
  readonly item: T
  /** Key of the containing item or group; `null` at the top level. */
  readonly parent: string | null
  /** Nesting depth, 1 at the top level (as `aria-level`). */
  readonly level: number
  /** Whether the item is disabled; always true for groups and separators, so navigation skips them. */
  readonly disabled: boolean
  /** Typeahead and filter text; empty when the item has none. */
  readonly text: string
}

/** A normalized, read-only view of an `items` tree. */
export interface Collection<T> {
  /** Every entry, depth-first in document order. */
  readonly entries: readonly Entry<T>[]
  /** Top-level keys in order. */
  readonly keys: readonly string[]
  /** The entry with `key` at any level. */
  get(key: string | null | undefined): Entry<T> | undefined
  /** Entries directly under `parent` (`null` for the top level), in order. */
  children(parent: string | null): readonly Entry<T>[]
}

const none: readonly never[] = []

/** The K9 structural items: `{ type: 'group', label, items }` and `{ type: 'separator' }`. */
const structure = (item: object) => {
  const { type } = item as { type?: unknown }
  return type === 'group' || type === 'separator' ? type : null
}

function defaultText(item: object): string {
  const { textValue, label } = item as { textValue?: unknown; label?: unknown }
  if (typeof textValue === 'string') return textValue
  return typeof label === 'string' || typeof label === 'number'
    ? String(label)
    : ''
}

/**
 * Normalizes `items` into a keyed tree; never throws. A non-array becomes empty and a non-object
 * item is dropped, each with an `invalidProp` report; `undefined` is an empty list. Groups and
 * separators take positional keys and a group's `items` are its children.
 */
export function readCollection<T>(
  items: unknown,
  spec: CollectionSpec<T>,
): Collection<T> {
  const { component, prop = 'items', positional = false } = spec
  const entries: Entry<T>[] = []
  const byKey = new Map<string, Entry<T>>()
  const byParent = new Map<string | null, Entry<T>[]>()
  const ancestors: object[] = []

  const visit = (
    list: unknown,
    parent: string | null,
    level: number,
    at: string,
  ) => {
    if (list === undefined || (list === null && parent !== null)) return
    if (!Array.isArray(list)) {
      invalidProp(component, at, list, 'using []')
      return
    }
    for (let index = 0; index < list.length; index += 1) {
      const item: unknown = list[index]
      const where = `${at}[${index}]`
      // An item nested inside itself would recurse forever.
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item) ||
        ancestors.includes(item)
      ) {
        invalidProp(component, where, item, 'dropping the item')
        continue
      }
      const node = item as T
      const kind = structure(item)
      const raw = kind ? undefined : spec.key(node)
      let key = typeof raw === 'string' ? raw : null
      if (key === null) {
        if (!kind && !positional) {
          invalidProp(component, `${where} key`, raw, 'dropping the item')
          continue
        }
        key = `${parent ?? ''}#${index}`
        if (!kind && raw !== undefined)
          invalidProp(component, `${where} key`, raw, `using ${JSON.stringify(key)}`)
      }
      if (byKey.has(key)) {
        invalidProp(component, `${where} key`, key, 'dropping the duplicate')
        continue
      }
      const text = kind ? undefined : spec.text?.(node)
      const entry: Entry<T> = {
        key,
        item: node,
        parent,
        level,
        disabled:
          kind !== null ||
          (spec.disabled
            ? spec.disabled(node) === true
            : (item as { disabled?: unknown }).disabled === true),
        text: kind ? '' : typeof text === 'string' ? text : defaultText(item),
      }
      entries.push(entry)
      byKey.set(key, entry)
      const siblings = byParent.get(parent)
      if (siblings) siblings.push(entry)
      else byParent.set(parent, [entry])
      const nested =
        kind === 'group'
          ? (item as { items?: unknown }).items
          : kind
            ? undefined
            : spec.children?.(node)
      ancestors.push(item)
      visit(nested, key, level + 1, `${where}.items`)
      ancestors.pop()
    }
  }
  visit(items, null, 1, prop)

  return {
    entries,
    keys: (byParent.get(null) ?? none).map((entry) => entry.key),
    get: (key) => (key == null ? undefined : byKey.get(key)),
    children: (parent) => byParent.get(parent) ?? none,
  }
}

/**
 * Reads a string-key array such as `expanded`, a multiple `value` or `selectedRows`. A non-array
 * becomes `[]` and non-string or repeated keys are dropped, each with a report; `undefined` is `[]`.
 * A clean array is returned as is.
 */
export function readKeys(
  value: unknown,
  component: string,
  prop: string,
): readonly string[] {
  if (value === undefined) return none
  if (!Array.isArray(value)) {
    invalidProp(component, prop, value, 'using []')
    return none
  }
  const seen = new Set<string>()
  const keys = value.filter((key: unknown, index): key is string => {
    if (typeof key === 'string' && !seen.has(key)) {
      seen.add(key)
      return true
    }
    invalidProp(
      component,
      `${prop}[${index}]`,
      key,
      typeof key === 'string' ? 'dropping the duplicate' : 'dropping it',
    )
    return false
  })
  return keys.length === value.length ? (value as string[]) : keys
}

/** Keys of the entries a tree shows: depth-first, descending only into `expanded` entries. */
export function visibleKeys(
  c: Collection<unknown>,
  expanded: ReadonlySet<string>,
): readonly string[] {
  const keys: string[] = []
  const walk = (parent: string | null) => {
    for (const { key } of c.children(parent)) {
      keys.push(key)
      if (expanded.has(key)) walk(key)
    }
  }
  walk(null)
  return keys
}

/** A keyboard move within an ordered list of keys. */
export type Move = 'next' | 'prev' | 'first' | 'last'

/**
 * The key `to` reaches from `from` in `keys` (pass only the reachable ones). An unknown or `null`
 * start enters at the first or last key; at an edge `loop` (default true) wraps, else stays put.
 */
export function move(
  keys: readonly string[],
  from: string | null,
  to: Move,
  loop = true,
): string | null {
  const last = keys.length - 1
  if (last < 0) return null
  if (to === 'first') return keys[0]
  if (to === 'last') return keys[last]
  const index = from === null ? -1 : keys.indexOf(from)
  if (index < 0) return to === 'next' ? keys[0] : keys[last]
  const target = index + (to === 'next' ? 1 : -1)
  if (target >= 0 && target <= last) return keys[target]
  return loop ? keys[(target + keys.length) % keys.length] : keys[index]
}

/**
 * Neighbour of a removed key: the key now at its former index in `previous`, else the last key;
 * the first key when `lost` was not in `previous`, `null` for an empty list.
 */
export function nearest(
  previous: readonly string[],
  keys: readonly string[],
  lost: string,
): string | null {
  if (!keys.length) return null
  return keys[Math.min(Math.max(0, previous.indexOf(lost)), keys.length - 1)]
}

/** Typeahead state between keystrokes: the query so far and when its last character arrived. */
export interface Typeahead {
  readonly query: string
  readonly at: number
}

const TYPEAHEAD_WINDOW = 700

/**
 * Appends `char` (one printable `event.key`) to the query when it arrives within 700 ms of the
 * previous one and returns the next enabled candidate whose text starts with it. A query of one
 * repeated character cycles through the items starting with that character; a longer query keeps
 * `from` while it still matches. Whitespace does not start a query: the returned query is then empty
 * and the caller may treat Space as activation. Pure — no timers.
 */
export function typeahead(
  state: Typeahead | null,
  char: string,
  now: number,
  candidates: readonly { key: string; text: string; disabled: boolean }[],
  from: string | null,
): readonly [Typeahead, string | null] {
  const prefix =
    state !== null && now - state.at <= TYPEAHEAD_WINDOW ? state.query : ''
  if (!prefix && !char.trim()) return [{ query: '', at: now }, null]
  const query = (prefix + char).toLocaleLowerCase()
  const chars = Array.from(query)
  const repeated = chars.every((c) => c === chars[0])
  const search = repeated ? chars[0] : query
  const current = from === null ? -1 : candidates.findIndex((c) => c.key === from)
  const start = current < 0 ? 0 : current + (repeated ? 1 : 0)
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length]
    if (
      !candidate.disabled &&
      candidate.text.trim().toLocaleLowerCase().startsWith(search)
    )
      return [{ query, at: now }, candidate.key]
  }
  return [{ query, at: now }, null]
}

/**
 * A DOM-safe id for `key` within `scope`: the key's code points in hex, joined by `-`, so any string
 * (empty, spaces, emoji) maps to a distinct id.
 */
export function domId(scope: string, part: string, key: string): string {
  const hex = Array.from(key, (char) => char.codePointAt(0)!.toString(16))
  return `${scope}-${part}-${hex.join('-')}`
}
