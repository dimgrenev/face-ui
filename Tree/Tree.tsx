/**
 * Tree — hierarchical tree view navigation.
 *
 * Flat API: all nodes rendered from `items` prop (recursive).
 * Supports expand/collapse, selection, and full keyboard navigation.
 *
 * `<Tree items={[{ id: 'a', label: 'Folder', children: [{ id: 'b', label: 'File' }] }]} />`
 */

import { forwardRef, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { treeMachine, connectTree } from '../assets/machines/tree.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeNode {
  id: string
  label: ReactNode
  children?: TreeNode[]
  disabled?: boolean
}

export interface TreeProps {
  /** Tree node definitions (recursive). */
  items: TreeNode[]
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
  /** Additional class name on the root element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Recursive node renderer
// ---------------------------------------------------------------------------

interface TreeNodeRendererProps {
  node: TreeNode
  api: ReturnType<typeof connectTree>
  depth: number
  activePathIds: Set<string>
}

function TreeNodeRenderer(props: TreeNodeRendererProps) {
  const { node, api, depth, activePathIds } = props
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  const isInActivePath = activePathIds.has(node.id)

  if (!hasChildren) {
    const itemProps = { ...(api.getItemProps({ id: node.id, disabled: node.disabled, depth }) as any) }
    delete itemProps['data-scope']
    delete itemProps['data-part']
    return (
      <Button
        {...itemProps}
        data-tree-node-id={node.id}
        data-active-path={isInActivePath ? '' : undefined}
        level={depth}
        variant="default"
        align="left"
        stretchText
        membrane
        className="uf-tree-item-button"
      >
        {node.label}
      </Button>
    )
  }

  const branchProps = api.getBranchProps({ id: node.id, disabled: node.disabled, depth })
  const branchTriggerProps = { ...(api.getBranchTriggerProps({ id: node.id, disabled: node.disabled, depth }) as any) }
  const branchSelectProps = api.getItemProps({ id: node.id, disabled: node.disabled, depth }) as any
  const branchTriggerOnClick = branchTriggerProps.onClick
  delete branchTriggerProps['data-scope']
  delete branchTriggerProps['data-part']
  delete branchTriggerProps.onClick
  delete branchTriggerProps.onFocus
  delete branchTriggerProps.onBlur

  return (
    <div {...branchProps}>
      <Button
        {...branchTriggerProps}
        role={branchSelectProps.role}
        tabIndex={branchProps.tabIndex}
        onFocus={branchSelectProps.onFocus}
        onBlur={branchSelectProps.onBlur}
        data-tree-node-id={node.id}
        data-value={node.id}
        aria-selected={branchSelectProps['aria-selected']}
        data-selected={branchSelectProps['data-selected']}
        data-focused={branchProps['data-focused']}
        data-disabled={branchProps['data-disabled']}
        data-active-path={isInActivePath ? '' : undefined}
        level={depth}
        variant="default"
        align="left"
        stretchText
        membrane
        className="uf-tree-branch-button"
        onClick={() => {
          try { branchTriggerOnClick?.() } catch {}
          try { branchSelectProps.onClick?.() } catch {}
        }}
      >
        {node.label}
      </Button>
      <div {...api.getBranchContentProps({ id: node.id, disabled: node.disabled, depth })}>
        {node.children!.map((child) => (
          <TreeNodeRenderer
            key={child.id}
            node={child}
            api={api}
            depth={depth + 1}
            activePathIds={activePathIds}
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
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const machineExpandedIds = useControllableMachineProp(
      Array.isArray(expandedIds) ? expandedIds.map((id) => String(id)) : undefined,
      Array.isArray(defaultExpandedIds) ? defaultExpandedIds.map((id) => String(id)) : [],
    )
    const machineSelectedId = useControllableMachineProp(
      selectedId !== undefined ? String(selectedId) : undefined,
      defaultSelectedId ? String(defaultSelectedId) : null,
    )
    const computeVisibleIds = (nodes: TreeNode[], expandedSet: Set<string>): string[] => {
      const ids: string[] = []
      const visit = (itemsToVisit: TreeNode[]) => {
        for (const item of itemsToVisit) {
          ids.push(item.id)
          if (expandedSet.has(item.id) && Array.isArray(item.children) && item.children.length > 0) {
            visit(item.children)
          }
        }
      }
      visit(nodes)
      return ids
    }
    const visibleIds = computeVisibleIds(items, new Set(machineExpandedIds ?? []))

    const { state, send } = useMachine(treeMachine, {
      expandedIds: machineExpandedIds,
      visibleIds,
      selectedId: machineSelectedId,
      onExpandedChange: onExpandedChange ?? null,
      onSelectedChange: onSelectedChange ?? null,
    })

    const api = connectTree(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const expandedSig = useMemo(() => (Array.isArray(api.expandedIds) ? api.expandedIds.join('\u0001') : ''), [api.expandedIds])
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
      const nextVisibleIds = computeVisibleIds(items, new Set(state.context.expandedIds))
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
        try { target.focus({ preventScroll: true }) } catch {
          try { target.focus() } catch {}
        }
      }
      try {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
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
          />
        ))}
      </div>
    )
  },
)
