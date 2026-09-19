/**
 * Tree — nested items that expand and collapse, with one item selected.
 *
 * `<Tree aria-label="Files" items={[{ value: 'src', label: 'src', items: [{ value: 'app', label: 'App.tsx' }] }]} />`
 */

import {
  forwardRef,
  Fragment,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import { RightIcon } from '../assets/icons'
import type { CollectionItem } from '../assets/internal/item'
import {
  readCollection,
  readKeys,
  visibleKeys,
} from '../assets/runtime/collection'
import { keyToMove, readDirection } from '../assets/runtime/keyboard'
import { resolveLabel } from '../assets/runtime/labels'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'

/** One item of a Tree; `value` is unique across the whole tree. */
export interface TreeItem extends CollectionItem {
  /** Keeps the item and everything nested in it visible but out of selection, expansion and keyboard focus. */
  disabled?: boolean
  /** Secondary text at the row's inline end, such as a count; screen readers read it after the label. */
  meta?: ReactNode
  /** Nested items; an item with at least one is a branch that expands and collapses. */
  items?: readonly TreeItem[]
}

/** What `renderNode` receives for each row. */
export interface TreeRenderNodeDetails {
  /** The item the row shows. */
  item: TreeItem
  /** Whether the item's nested items are shown; always false for an item without any. */
  expanded: boolean
  /** Whether the item is the tree's value. */
  selected: boolean
}

export interface TreeProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'role'
  | 'tabIndex'
  | 'autoFocus'
  | 'defaultValue'
  | 'defaultChecked'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Items in order, nested through `items`; an item repeating a value used anywhere earlier in the tree is dropped. */
  items?: readonly TreeItem[]
  /** Value of the selected item (controlled); `null` selects nothing, as does a value no item has. */
  value?: string | null
  /** Value of the item selected on mount (uncontrolled); later changes are ignored. */
  defaultValue?: string | null
  /** Called once per user selection with the chosen item's value; never for prop updates. */
  onValueChange?: (details: {
    /** Value of the item the user activated. */
    value: string
  }) => void
  /** Values of the expanded items (controlled); values of items that are not branches are kept but show nothing. */
  expanded?: readonly string[]
  /** Values of the items expanded on mount (uncontrolled); later changes are ignored. */
  defaultExpanded?: readonly string[]
  /** Called once per user expand or collapse with the expanded values; never for prop updates. */
  onExpandedChange?: (details: {
    /** Values of the expanded items after the change, in a new array. */
    expanded: string[]
  }) => void
  /** Renders each row's content after its disclosure arrow, in place of the item's icon, label and meta. */
  renderNode?: (details: TreeRenderNodeDetails) => ReactNode
  /** `lines` draws a guide line along the nested items of every expanded item; `default` draws none. */
  variant?: 'default' | 'lines'
  /** Names the tree; without it and `aria-labelledby` the name is "Tree". */
  'aria-label'?: string
}

const { getPartAttrs: part } = createAnatomy('tree').parts(
  'root',
  'item',
  'indicator',
  'icon',
  'label',
  'meta',
  'group',
)
/** A tree needs a name until a native aria-label or aria-labelledby gives one (K14). */
const defaultRootLabels = Object.freeze({ tree: 'Tree' })

/** Nested items that expand and collapse, with one item selected. */
export const Tree = forwardRef<HTMLDivElement, TreeProps>(function Tree(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    expanded,
    defaultExpanded,
    onExpandedChange,
    renderNode,
    variant = 'default',
    className,
    onClick,
    onKeyDown,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const collection = readCollection<TreeItem>(items, {
    component: 'Tree',
    key: (item) => item.value,
    children: (item) => item.items,
  })
  // A disabled item takes everything nested in it along.
  const blocked = new Set<string>()
  for (const { key, parent, disabled } of collection.entries)
    if (disabled || (parent !== null && blocked.has(parent))) blocked.add(key)
  const isBranch = (key: string) => collection.children(key).length > 0

  const [selected, setSelected] = useControllableState<string | null>({
    value,
    defaultValue: defaultValue ?? null,
    // The user only ever proposes an item's value.
    onChange: (next) => onValueChange?.({ value: next as string }),
    name: ['Tree', 'value'],
  })
  const [stored, setStored] = useControllableState<readonly string[]>({
    value:
      expanded === undefined
        ? undefined
        : readKeys(expanded, 'Tree', 'expanded'),
    defaultValue: () => readKeys(defaultExpanded, 'Tree', 'defaultExpanded'),
    onChange: (next) => onExpandedChange?.({ expanded: next as string[] }),
    name: ['Tree', 'expanded'],
  })
  const open = new Set(stored)
  const isOpen = (key: string) => open.has(key) && isBranch(key)
  const current =
    typeof selected === 'string' && collection.get(selected) ? selected : null
  const keys = visibleKeys(collection, open)
  // Tab enters at the selected item, or at the collapsed item that holds it.
  const shown = new Set(keys)
  let entry = current
  while (entry !== null && !shown.has(entry))
    entry = collection.get(entry)?.parent ?? null

  const roving = useRovingFocus({
    keys,
    disabled: (key) => blocked.has(key),
    active: entry,
    orientation: 'vertical',
    loop: false,
    typeahead: (key) => collection.get(key)?.text ?? '',
  })

  const toggle = (key: string) =>
    setStored((list) =>
      list.includes(key) ? list.filter((item) => item !== key) : [...list, key],
    )

  // A click, or Enter and Space on the focused item, selects it and toggles a branch;
  // a click on a branch's arrow only toggles it.
  const activate = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element
    const key = roving.keyOf(target.closest('[role="treeitem"]'))
    if (key === null || blocked.has(key)) return
    roving.focus(key)
    if (!target.closest('[data-scope="tree"][data-part="indicator"]')) setSelected(key)
    if (isBranch(key)) toggle(key)
  }

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = roving.keyOf(event.target)
    if (key === null) return
    if (
      event.key === '*' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      // Expands every sibling branch of the focused item; focus stays.
      event.preventDefault()
      const siblings = collection
        .children(collection.get(key)?.parent ?? null)
        .map((sibling) => sibling.key)
        .filter((sibling) => isBranch(sibling) && !blocked.has(sibling))
      setStored((list) => [
        ...list,
        ...siblings.filter((sibling) => !list.includes(sibling)),
      ])
      return
    }
    roving.root.onKeyDown(event)
    if (event.defaultPrevented) return
    // Right goes in (expands, then to the first child), Left goes out (collapses, then to the parent);
    // they swap in right-to-left text. A key with nothing to do is left to the page.
    const to = keyToMove(event, 'horizontal', readDirection(event.target as Element))
    const inward = to === 'next'
    if (!inward && to !== 'prev') return
    const child = collection.children(key).find((item) => !blocked.has(item.key))
    const parent = collection.get(key)?.parent ?? null
    let act: (() => void) | null = null
    if (inward) {
      if (isBranch(key) && !isOpen(key)) act = () => toggle(key)
      else if (isOpen(key) && child) act = () => roving.focus(child.key)
    } else if (isOpen(key)) act = () => toggle(key)
    else if (parent !== null) act = () => roving.focus(parent)
    if (!act) return
    event.preventDefault()
    act()
  }

  const renderLevel = (parent: string | null): ReactNode => {
    const siblings = collection.children(parent)
    return siblings.map(({ key, item, level }, index) => {
      const branch = isBranch(key)
      const expandedNow = branch && open.has(key)
      const isSelected = key === current
      const depth = { '--uf-tree-depth': level - 1 } as CSSProperties
      return (
        <Fragment key={key}>
          <Membrane fullWidth interactive>
            <button
              {...roving.item(key)}
              {...part('item')}
              type="button"
              role="treeitem"
              disabled={blocked.has(key)}
              aria-level={level}
              aria-setsize={siblings.length}
              aria-posinset={index + 1}
              aria-expanded={branch ? expandedNow : undefined}
              aria-selected={isSelected}
              data-value={key}
              className="uf-tree-item uf-option"
              style={depth}
            >
              <span
                {...(branch ? part('indicator') : undefined)}
                className="uf-tree-indicator"
                aria-hidden="true"
              >
                {branch && <RightIcon />}
              </span>
              {renderNode ? (
                renderNode({ item, expanded: expandedNow, selected: isSelected })
              ) : (
                <>
                  {hasSlotContent(item.icon) && (
                    <span {...part('icon')} className="uf-tree-icon" aria-hidden="true">
                      {typeof item.icon === 'string' ? <Icon name={item.icon} /> : item.icon}
                    </span>
                  )}
                  <span {...part('label')} className="uf-tree-label">
                    {item.label}
                  </span>
                  {hasSlotContent(item.meta) && (
                    <span {...part('meta')} className="uf-tree-meta">
                      {item.meta}
                    </span>
                  )}
                </>
              )}
            </button>
          </Membrane>
          {expandedNow && (
            <div {...part('group')} role="group" className="uf-tree-group" style={depth}>
              {renderLevel(key)}
            </div>
          )}
        </Fragment>
      )
    })
  }

  // Blank text cannot erase the name.
  const name = resolveLabel(ariaLabel, defaultRootLabels.tree, 'Tree', 'aria-label')

  return (
    <div
      {...rest}
      {...part('root')}
      ref={ref}
      role="tree"
      aria-label={name}
      data-variant={variant}
      className={cn('uf-tree', className)}
      onClick={composeHandlers(onClick, activate)}
      onKeyDown={composeHandlers(onKeyDown, navigate)}
      onFocus={composeHandlers(onFocus, roving.root.onFocus)}
      onBlur={composeHandlers(onBlur, roving.root.onBlur)}
    >
      {renderLevel(null)}
    </div>
  )
})
