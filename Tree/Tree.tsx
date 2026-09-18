/**
 * Tree — hierarchical tree view navigation.
 *
 * Flat API: all nodes rendered from `items` prop (recursive).
 * Supports expand/collapse, selection, and full keyboard navigation.
 *
 * `<Tree items={[{ id: 'a', label: 'Folder', children: [{ id: 'b', label: 'File' }] }]} />`
 */

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { treeMachine, connectTree } from '../assets/machines/tree.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Tile } from '../Tile/Tile'
import type { NavItemBase } from '../assets/nav-item'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeNode extends NavItemBase {
  children?: TreeNode[]
  /** Preferred default row component for this node. */
  kind?: 'button' | 'tile' | 'custom'
  /** Optional icon rendered by default button/tile rows. */
  icon?: ReactNode
  /** Optional secondary text rendered at the far edge of default button/tile rows. */
  rightText?: ReactNode
  /** Optional nested actions for tile rows. */
  actions?: ReactNode
  /** Custom node body. Tree still owns selection, focus, and nesting layout. */
  content?: ReactNode
  /** Per-node render override. */
  render?: (details: TreeRenderNodeDetails) => ReactNode
}

export interface TreeProps {
  /** Tree node definitions (recursive). */
  items?: TreeNode[]
  /** Currently expanded node IDs. */
  expandedIds?: string[]
  /** Uncontrolled initial expanded node IDs. */
  defaultExpandedIds?: string[]
  /** Currently selected node ID. */
  selectedId?: string
  /** Uncontrolled initial selected node ID. */
  defaultSelectedId?: string
  /** Callback when expanded nodes change. */
  onExpandedChange?: (details: { expandedIds: string[] }) => void
  /** Callback when selected node changes. */
  onSelectedChange?: (details: { selectedId: string }) => void
  /** Global render override for node content. */
  renderNode?: (details: TreeRenderNodeDetails) => ReactNode
  /** Additional class name on the root element. */
  className?: string
}

export interface TreeRenderNodeDetails {
  node: TreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
  selected: boolean
  focused: boolean
  activePath: boolean
}

function normalizeIdArray(value: string[] | undefined): string[] | undefined {
  return Array.isArray(value) ? value.map((id) => String(id)) : undefined
}

function idArraysEqual(
  left: string[] | undefined,
  right: string[] | undefined,
): boolean {
  if (left === right) return true
  if (!Array.isArray(left) || !Array.isArray(right)) return false
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

function computeVisibleIds(
  nodes: TreeNode[],
  expandedSet: Set<string>,
): string[] {
  const ids: string[] = []
  const visit = (itemsToVisit: TreeNode[]) => {
    for (const item of itemsToVisit) {
      ids.push(item.id)
      if (
        expandedSet.has(item.id) &&
        Array.isArray(item.children) &&
        item.children.length > 0
      ) {
        visit(item.children)
      }
    }
  }
  visit(nodes)
  return ids
}

// ---------------------------------------------------------------------------
// Recursive node renderer
// ---------------------------------------------------------------------------

interface TreeNodeRendererProps {
  node: TreeNode
  api: ReturnType<typeof connectTree>
  depth: number
  activePathIds: Set<string>
  renderNode?: TreeProps['renderNode']
}

function TreeNodeRenderer(props: TreeNodeRendererProps) {
  const { node, api, depth, activePathIds, renderNode } = props
  const nodeRender = typeof node.render === 'function' ? node.render : undefined
  const treeRenderNode =
    typeof renderNode === 'function' ? renderNode : undefined
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  const isInActivePath = activePathIds.has(node.id)
  const isExpanded = api.expandedIds.includes(node.id)
  const isSelected = api.selectedId === node.id
  const isFocused = api.focusedId === node.id
  const renderDetails: TreeRenderNodeDetails = {
    node,
    depth,
    hasChildren,
    expanded: isExpanded,
    selected: isSelected,
    focused: isFocused,
    activePath: isInActivePath,
  }

  const renderDefaultRow = (
    rowProps: Record<string, any>,
    className: string,
  ) => {
    const customContent =
      nodeRender?.(renderDetails) ??
      treeRenderNode?.(renderDetails) ??
      node.content
    if (customContent != null || node.kind === 'custom') {
      return (
        <div
          {...rowProps}
          data-tree-node-id={node.id}
          data-active-path={isInActivePath ? '' : undefined}
          data-kind="custom"
          className={cn('uf-tree-custom-node', className)}
          style={
            {
              '--face-runtime-option-level': Math.max(0, depth),
            } as CSSProperties
          }
        >
          {customContent ?? node.label}
        </div>
      )
    }

    const commonProps = {
      ...rowProps,
      'data-tree-node-id': node.id,
      'data-active-path': isInActivePath ? '' : undefined,
      indent: Math.min(depth, 9),
      align: 'start' as const,
      stretchText: true,
      fullWidth: true,
      membrane: true,
      icon: node.icon,
      meta: node.rightText,
      className,
    }

    if (node.kind === 'tile') {
      return (
        <Tile
          {...commonProps}
          active={isSelected || isInActivePath}
          chevron={hasChildren ? 'down' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          actions={node.actions}
        >
          {node.label}
        </Tile>
      )
    }

    return (
      <Button
        {...commonProps}
        variant="default"
        chevron={hasChildren ? 'down' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {node.label}
      </Button>
    )
  }

  if (!hasChildren) {
    const itemProps = {
      ...(api.getItemProps({
        id: node.id,
        disabled: node.disabled,
        depth,
      }) as any),
    }
    itemProps['aria-level'] = depth + 1
    delete itemProps['data-scope']
    delete itemProps['data-part']
    return renderDefaultRow(itemProps, 'uf-tree-item-button')
  }

  const branchProps = {
    ...(api.getBranchProps({
      id: node.id,
      disabled: node.disabled,
      depth,
    }) as any),
  }
  branchProps.className = cn('uf-tree-branch', branchProps.className)
  const branchTriggerProps = {
    ...(api.getBranchTriggerProps({
      id: node.id,
      disabled: node.disabled,
      depth,
    }) as any),
  }
  delete branchTriggerProps['data-scope']
  delete branchTriggerProps['data-part']

  return (
    <div {...branchProps}>
      {renderDefaultRow(
        {
          ...branchTriggerProps,
        },
        'uf-tree-branch-button',
      )}
      <div
        {...api.getBranchContentProps({
          id: node.id,
          disabled: node.disabled,
          depth,
        })}
        className="uf-tree-branch-content"
      >
        {node.children!.map((child) => (
          <TreeNodeRenderer
            key={child.id}
            node={child}
            api={api}
            depth={depth + 1}
            activePathIds={activePathIds}
            renderNode={renderNode}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Tree = forwardRef<HTMLDivElement, TreeProps>(
  function Tree(props, ref) {
    const {
      items: rawItems,
      expandedIds,
      defaultExpandedIds,
      selectedId,
      defaultSelectedId,
      onExpandedChange,
      onSelectedChange,
      renderNode,
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const expandedChangeHandler =
      typeof onExpandedChange === 'function' ? onExpandedChange : undefined
    const selectedChangeHandler =
      typeof onSelectedChange === 'function' ? onSelectedChange : undefined

    const controlledExpandedIds = normalizeIdArray(expandedIds)
    const isExpandedControlled = controlledExpandedIds !== undefined
    const initialExpandedIds =
      controlledExpandedIds ?? normalizeIdArray(defaultExpandedIds) ?? []
    const machineExpandedIds = useControllableMachineProp(
      isExpandedControlled ? controlledExpandedIds : undefined,
      initialExpandedIds,
    )

    const controlledSelectedId =
      selectedId !== undefined ? String(selectedId) : undefined
    const isSelectedControlled = controlledSelectedId !== undefined
    const initialSelectedId =
      controlledSelectedId ??
      (defaultSelectedId ? String(defaultSelectedId) : null)
    const machineSelectedId = useControllableMachineProp<string | null>(
      isSelectedControlled ? controlledSelectedId : undefined,
      initialSelectedId,
    )

    const initialVisibleIds = computeVisibleIds(
      items,
      new Set(initialExpandedIds),
    )
    const machineVisibleIds = useControllableMachineProp<string[] | undefined>(
      undefined,
      initialVisibleIds,
    )

    const { state, send } = useMachine(treeMachine, {
      expandedIds: machineExpandedIds,
      visibleIds: machineVisibleIds,
      selectedId: machineSelectedId,
      onExpandedChange: ((details: { expandedIds: string[] }) => {
        if (
          isExpandedControlled &&
          idArraysEqual(details.expandedIds, controlledExpandedIds)
        ) {
          return
        }
        expandedChangeHandler?.(details)
      }) as any,
      onSelectedChange: ((details: { selectedId: string }) => {
        if (
          isSelectedControlled &&
          details.selectedId === controlledSelectedId
        ) {
          return
        }
        selectedChangeHandler?.(details)
      }) as any,
    })

    const api = connectTree(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const expandedSig = useMemo(
      () =>
        Array.isArray(api.expandedIds) ? api.expandedIds.join('\u0001') : '',
      [api.expandedIds],
    )
    const activePathIds = useMemo(() => {
      const selected = String(api.selectedId ?? '').trim()
      const set = new Set<string>()
      if (!selected) return set

      const visit = (nodes: TreeNode[], parents: string[]): boolean => {
        for (const n of nodes) {
          if (n.id === selected) {
            for (const parentId of parents) set.add(parentId)
            set.add(n.id)
            return true
          }
          if (Array.isArray(n.children) && n.children.length > 0) {
            if (visit(n.children, [...parents, n.id])) return true
          }
        }
        return false
      }

      visit(items, [])
      return set
    }, [api.selectedId, items])

    useEffect(() => {
      const nextVisibleIds = computeVisibleIds(
        items,
        new Set(state.context.expandedIds),
      )
      send({ type: 'SET_VISIBLE', visibleIds: nextVisibleIds })
    }, [items, send, state.context.expandedIds])

    useEffect(() => {
      const targetId = String(state.context.focusedId ?? '').trim()
      if (!targetId) return
      const root = rootRef.current
      if (!root) return
      const activeElement = document.activeElement as HTMLElement | null
      if (!activeElement || !root.contains(activeElement)) return
      const nodes = root.querySelectorAll<HTMLElement>('[data-tree-node-id]')
      let target: HTMLElement | null = null
      for (const el of nodes) {
        if (String(el.getAttribute('data-tree-node-id') || '') === targetId) {
          target = el
          break
        }
      }
      if (!target) return
      if (target !== document.activeElement) {
        try {
          target.focus({ preventScroll: true })
        } catch {
          try {
            target.focus()
          } catch {}
        }
      }
      try {
        target.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'auto',
        })
      } catch {}
    }, [expandedSig, state.context.focusedId])

    return (
      <div
        ref={(node) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node
        }}
        {...api.getRootProps()}
        className={cn('uf-tree', className)}
      >
        {items.map((item) => (
          <TreeNodeRenderer
            key={item.id}
            node={item}
            api={api}
            depth={0}
            activePathIds={activePathIds}
            renderNode={renderNode}
          />
        ))}
      </div>
    )
  },
)
