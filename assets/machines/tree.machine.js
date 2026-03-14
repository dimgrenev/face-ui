/**
 * @face-ui/core — Tree Machine
 *
 * Framework-agnostic FSM for tree view / hierarchical navigation.
 *
 * Supports:
 * - Expand / collapse branches
 * - Single item selection
 * - Keyboard navigation (ArrowUp/Down for focus, ArrowLeft to collapse/parent,
 *   ArrowRight to expand/first-child, Home, End, Enter/Space to select)
 * - Disabled state at root and item level
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const treeAnatomy = createAnatomy('tree').parts('root', 'item', 'branch', 'branchContent', 'branchTrigger', 'branchIndicator');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const toggleExpand = (ctx, event) => {
    const e = event;
    const id = e.id;
    if (ctx.expandedIds.includes(id)) {
        ctx.expandedIds = ctx.expandedIds.filter((v) => v !== id);
    }
    else {
        ctx.expandedIds = [...ctx.expandedIds, id];
    }
};
const selectItem = (ctx, event) => {
    const e = event;
    ctx.selectedId = e.id;
};
const setFocusedId = (ctx, event) => {
    const e = event;
    ctx.focusedId = e.id;
};
const clearFocusedId = (ctx) => {
    ctx.focusedId = null;
};
const setExpanded = (ctx, event) => {
    const e = event;
    ctx.expandedIds = e.expandedIds;
};
const setVisible = (ctx, event) => {
    const e = event;
    ctx.visibleIds = e.visibleIds;
};
const focusByOffset = (ctx, delta) => {
    var _a;
    const visibleIds = ctx.visibleIds;
    if (visibleIds.length === 0)
        return;
    const currentId = (_a = ctx.focusedId) !== null && _a !== void 0 ? _a : ctx.selectedId;
    const currentIndex = currentId ? visibleIds.indexOf(currentId) : -1;
    const nextIndex = currentIndex < 0
        ? (delta > 0 ? 0 : visibleIds.length - 1)
        : Math.max(0, Math.min(visibleIds.length - 1, currentIndex + delta));
    ctx.focusedId = visibleIds[nextIndex];
};
const focusFirst = (ctx) => {
    if (ctx.visibleIds.length > 0) {
        ctx.focusedId = ctx.visibleIds[0];
    }
};
const focusLast = (ctx) => {
    if (ctx.visibleIds.length > 0) {
        ctx.focusedId = ctx.visibleIds[ctx.visibleIds.length - 1];
    }
};
const expandFocused = (ctx) => {
    if (ctx.focusedId && !ctx.expandedIds.includes(ctx.focusedId)) {
        ctx.expandedIds = [...ctx.expandedIds, ctx.focusedId];
    }
};
const collapseFocused = (ctx) => {
    if (ctx.focusedId && ctx.expandedIds.includes(ctx.focusedId)) {
        ctx.expandedIds = ctx.expandedIds.filter((id) => id !== ctx.focusedId);
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const treeMachine = createMachine({
    id: 'tree',
    initial: 'idle',
    context: {
        expandedIds: [],
        selectedId: null,
        focusedId: null,
        visibleIds: [],
        disabled: false,
        onExpandedChange: null,
        onSelectedChange: null,
    },
    watch: {
        expandedIds: (ctx) => {
            var _a;
            (_a = ctx.onExpandedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { expandedIds: ctx.expandedIds });
        },
        selectedId: (ctx) => {
            var _a;
            if (ctx.selectedId != null) {
                (_a = ctx.onSelectedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { selectedId: ctx.selectedId });
            }
        },
    },
    states: {
        idle: {
            on: {
                TOGGLE_EXPAND: {
                    guard: isNotDisabled,
                    actions: [toggleExpand],
                },
                SELECT: {
                    guard: isNotDisabled,
                    actions: [selectItem],
                },
                SET_EXPANDED: {
                    actions: [setExpanded],
                },
                SET_VISIBLE: {
                    actions: [setVisible],
                },
                FOCUS: {
                    target: 'focused',
                    guard: isNotDisabled,
                    actions: [setFocusedId],
                },
            },
        },
        focused: {
            on: {
                TOGGLE_EXPAND: {
                    guard: isNotDisabled,
                    actions: [toggleExpand],
                },
                SELECT: {
                    guard: isNotDisabled,
                    actions: [selectItem],
                },
                SET_EXPANDED: {
                    actions: [setExpanded],
                },
                SET_VISIBLE: {
                    actions: [setVisible],
                },
                FOCUS: {
                    guard: isNotDisabled,
                    actions: [setFocusedId],
                },
                BLUR: {
                    target: 'idle',
                    actions: [clearFocusedId],
                },
                FOCUS_NEXT: {
                    guard: isNotDisabled,
                    actions: [(ctx) => focusByOffset(ctx, 1)],
                },
                FOCUS_PREV: {
                    guard: isNotDisabled,
                    actions: [(ctx) => focusByOffset(ctx, -1)],
                },
                FOCUS_FIRST: {
                    guard: isNotDisabled,
                    actions: [focusFirst],
                },
                FOCUS_LAST: {
                    guard: isNotDisabled,
                    actions: [focusLast],
                },
                EXPAND_FOCUSED: {
                    guard: isNotDisabled,
                    actions: [expandFocused],
                },
                COLLAPSE_FOCUSED: {
                    guard: isNotDisabled,
                    actions: [collapseFocused],
                },
            },
        },
    },
});
export function connectTree(state, send) {
    var _a, _b, _c;
    const ctx = state.context;
    const attrs = treeAnatomy.getPartAttrs;
    const tabStopId = (_c = (_b = (_a = ctx.focusedId) !== null && _a !== void 0 ? _a : ctx.selectedId) !== null && _b !== void 0 ? _b : ctx.visibleIds[0]) !== null && _c !== void 0 ? _c : null;
    return {
        /** Current expanded node IDs */
        expandedIds: ctx.expandedIds,
        /** Currently selected node ID */
        selectedId: ctx.selectedId,
        /** Currently focused node ID */
        focusedId: ctx.focusedId,
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { role: 'tree', 'aria-label': 'Tree navigation', 'data-disabled': ctx.disabled ? '' : undefined, onKeyDown(event) {
                    if (ctx.disabled)
                        return;
                    switch (event.key) {
                        case 'ArrowDown':
                            event.preventDefault();
                            send({ type: 'FOCUS_NEXT' });
                            break;
                        case 'ArrowUp':
                            event.preventDefault();
                            send({ type: 'FOCUS_PREV' });
                            break;
                        case 'ArrowRight':
                            event.preventDefault();
                            send({ type: 'EXPAND_FOCUSED' });
                            break;
                        case 'ArrowLeft':
                            event.preventDefault();
                            send({ type: 'COLLAPSE_FOCUSED' });
                            break;
                        case 'Home':
                            event.preventDefault();
                            send({ type: 'FOCUS_FIRST' });
                            break;
                        case 'End':
                            event.preventDefault();
                            send({ type: 'FOCUS_LAST' });
                            break;
                        case 'Enter':
                        case ' ':
                            event.preventDefault();
                            if (ctx.focusedId) {
                                send({ type: 'SELECT', id: ctx.focusedId });
                            }
                            break;
                    }
                } });
        },
        getItemProps(props) {
            const isSelected = ctx.selectedId === props.id;
            const isFocused = ctx.focusedId === props.id;
            const isDisabled = ctx.disabled || props.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { role: 'treeitem', 'aria-selected': isSelected, 'data-selected': isSelected ? '' : undefined, 'data-focused': isFocused ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, 'data-depth': props.depth, tabIndex: tabStopId === props.id ? 0 : -1, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SELECT', id: props.id });
                        send({ type: 'FOCUS', id: props.id });
                    }
                },
                onFocus() {
                    if (!isDisabled) {
                        send({ type: 'FOCUS', id: props.id });
                    }
                },
                onBlur() {
                    send({ type: 'BLUR' });
                } });
        },
        getBranchProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.id);
            const isFocused = ctx.focusedId === props.id;
            const isDisabled = ctx.disabled || props.disabled;
            return Object.assign(Object.assign({}, attrs('branch')), { role: 'treeitem', 'aria-expanded': isExpanded, 'data-state': isExpanded ? 'open' : 'closed', 'data-focused': isFocused ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, 'data-depth': props.depth, tabIndex: tabStopId === props.id ? 0 : -1 });
        },
        getBranchTriggerProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.id);
            const isDisabled = ctx.disabled || props.disabled;
            return Object.assign(Object.assign({}, attrs('branchTrigger')), { 'aria-expanded': isExpanded, 'data-state': isExpanded ? 'open' : 'closed', 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, onClick() {
                    if (!isDisabled) {
                        send({ type: 'TOGGLE_EXPAND', id: props.id });
                        send({ type: 'FOCUS', id: props.id });
                    }
                },
                onFocus() {
                    if (!isDisabled) {
                        send({ type: 'FOCUS', id: props.id });
                    }
                },
                onBlur() {
                    send({ type: 'BLUR' });
                } });
        },
        getBranchContentProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.id);
            return Object.assign(Object.assign({}, attrs('branchContent')), { role: 'group', 'data-state': isExpanded ? 'open' : 'closed', 'data-value': props.id, hidden: !isExpanded });
        },
        getBranchIndicatorProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.id);
            return Object.assign(Object.assign({}, attrs('branchIndicator')), { 'aria-hidden': true, 'data-state': isExpanded ? 'open' : 'closed', 'data-value': props.id });
        },
    };
}
