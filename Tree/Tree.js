import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tree — hierarchical tree view navigation.
 *
 * Flat API: all nodes rendered from `items` prop (recursive).
 * Supports expand/collapse, selection, and full keyboard navigation.
 *
 * `<Tree items={[{ id: 'a', label: 'Folder', children: [{ id: 'b', label: 'File' }] }]} />`
 */
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { treeMachine, connectTree } from '../assets/machines/tree.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
function TreeNodeRenderer(props) {
    const { node, api, depth, activePathIds } = props;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isInActivePath = activePathIds.has(node.id);
    if (!hasChildren) {
        const itemProps = Object.assign({}, api.getItemProps({ id: node.id, disabled: node.disabled, depth }));
        delete itemProps['data-scope'];
        delete itemProps['data-part'];
        return (_jsx(Button, Object.assign({}, itemProps, { "data-tree-node-id": node.id, "data-active-path": isInActivePath ? '' : undefined, level: depth, variant: "default", align: "left", stretchText: true, membrane: true, className: "uf-tree-item-button", children: node.label })));
    }
    const branchProps = api.getBranchProps({ id: node.id, disabled: node.disabled, depth });
    const branchTriggerProps = Object.assign({}, api.getBranchTriggerProps({ id: node.id, disabled: node.disabled, depth }));
    const branchSelectProps = api.getItemProps({ id: node.id, disabled: node.disabled, depth });
    const branchTriggerOnClick = branchTriggerProps.onClick;
    delete branchTriggerProps['data-scope'];
    delete branchTriggerProps['data-part'];
    delete branchTriggerProps.onClick;
    delete branchTriggerProps.onFocus;
    delete branchTriggerProps.onBlur;
    return (_jsxs("div", Object.assign({}, branchProps, { children: [_jsx(Button, Object.assign({}, branchTriggerProps, { role: branchSelectProps.role, tabIndex: branchProps.tabIndex, onFocus: branchSelectProps.onFocus, onBlur: branchSelectProps.onBlur, "data-tree-node-id": node.id, "data-value": node.id, "aria-selected": branchSelectProps['aria-selected'], "data-selected": branchSelectProps['data-selected'], "data-focused": branchProps['data-focused'], "data-disabled": branchProps['data-disabled'], "data-active-path": isInActivePath ? '' : undefined, level: depth, variant: "default", align: "left", stretchText: true, membrane: true, className: "uf-tree-branch-button", onClick: () => {
                    var _a;
                    try {
                        branchTriggerOnClick === null || branchTriggerOnClick === void 0 ? void 0 : branchTriggerOnClick();
                    }
                    catch (_b) { }
                    try {
                        (_a = branchSelectProps.onClick) === null || _a === void 0 ? void 0 : _a.call(branchSelectProps);
                    }
                    catch (_c) { }
                }, children: node.label })), _jsx("div", Object.assign({}, api.getBranchContentProps({ id: node.id, disabled: node.disabled, depth }), { children: node.children.map((child) => (_jsx(TreeNodeRenderer, { node: child, api: api, depth: depth + 1, activePathIds: activePathIds }, child.id))) }))] })));
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Tree = forwardRef(function Tree(props, ref) {
    const { items: rawItems, expandedIds, defaultExpandedIds, selectedId, defaultSelectedId, onExpandedChange, onSelectedChange, className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const machineExpandedIds = useControllableMachineProp(Array.isArray(expandedIds) ? expandedIds.map((id) => String(id)) : undefined, Array.isArray(defaultExpandedIds) ? defaultExpandedIds.map((id) => String(id)) : []);
    const machineSelectedId = useControllableMachineProp(selectedId !== undefined ? String(selectedId) : undefined, defaultSelectedId ? String(defaultSelectedId) : null);
    const computeVisibleIds = (nodes, expandedSet) => {
        const ids = [];
        const visit = (itemsToVisit) => {
            for (const item of itemsToVisit) {
                ids.push(item.id);
                if (expandedSet.has(item.id) && Array.isArray(item.children) && item.children.length > 0) {
                    visit(item.children);
                }
            }
        };
        visit(nodes);
        return ids;
    };
    const visibleIds = computeVisibleIds(items, new Set(machineExpandedIds !== null && machineExpandedIds !== void 0 ? machineExpandedIds : []));
    const { state, send } = useMachine(treeMachine, {
        expandedIds: machineExpandedIds,
        visibleIds,
        selectedId: machineSelectedId,
        onExpandedChange: onExpandedChange !== null && onExpandedChange !== void 0 ? onExpandedChange : null,
        onSelectedChange: onSelectedChange !== null && onSelectedChange !== void 0 ? onSelectedChange : null,
    });
    const api = connectTree(state, send);
    const rootRef = useRef(null);
    const expandedSig = useMemo(() => (Array.isArray(api.expandedIds) ? api.expandedIds.join('\u0001') : ''), [api.expandedIds]);
    const activePathIds = useMemo(() => {
        var _a;
        const selected = String((_a = api.selectedId) !== null && _a !== void 0 ? _a : '').trim();
        const set = new Set();
        if (!selected)
            return set;
        const visit = (nodes, parents) => {
            for (const n of nodes) {
                if (n.id === selected) {
                    for (const parentId of parents)
                        set.add(parentId);
                    set.add(n.id);
                    return true;
                }
                if (Array.isArray(n.children) && n.children.length > 0) {
                    if (visit(n.children, [...parents, n.id]))
                        return true;
                }
            }
            return false;
        };
        visit(items, []);
        return set;
    }, [api.selectedId, items]);
    useEffect(() => {
        const nextVisibleIds = computeVisibleIds(items, new Set(state.context.expandedIds));
        send({ type: 'SET_VISIBLE', visibleIds: nextVisibleIds });
    }, [items, send, state.context.expandedIds]);
    useEffect(() => {
        var _a;
        const targetId = String((_a = state.context.focusedId) !== null && _a !== void 0 ? _a : '').trim();
        if (!targetId)
            return;
        const root = rootRef.current;
        if (!root)
            return;
        const activeElement = document.activeElement;
        if (!activeElement || !root.contains(activeElement))
            return;
        const nodes = root.querySelectorAll('[data-tree-node-id]');
        let target = null;
        for (const el of nodes) {
            if (String(el.getAttribute('data-tree-node-id') || '') === targetId) {
                target = el;
                break;
            }
        }
        if (!target)
            return;
        if (target !== document.activeElement) {
            try {
                target.focus({ preventScroll: true });
            }
            catch (_b) {
                try {
                    target.focus();
                }
                catch (_c) { }
            }
        }
        try {
            target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        }
        catch (_d) { }
    }, [expandedSig, state.context.focusedId]);
    return (_jsx("div", Object.assign({ ref: (node) => {
            rootRef.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        } }, api.getRootProps(), { className: cn('uf-tree', className), children: items.map((item) => (_jsx(TreeNodeRenderer, { node: item, api: api, depth: 0, activePathIds: activePathIds }, item.id))) })));
});
