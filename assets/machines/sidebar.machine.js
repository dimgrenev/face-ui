/**
 * @face-ui/core — Sidebar Machine
 *
 * Framework-agnostic FSM for a collapsible side panel.
 *
 * Supports:
 * - Expanded / collapsed states
 * - Item selection
 * - Nested groups (expandable sub-items)
 * - Configurable expanded/collapsed widths
 * - Keyboard toggle (bracket key)
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const sidebarAnatomy = createAnatomy('sidebar').parts('root', 'header', 'content', 'item', 'group', 'groupLabel', 'toggle', 'footer');
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const syncCollapsedTrue = (ctx) => {
    ctx.collapsed = true;
};
const syncCollapsedFalse = (ctx) => {
    ctx.collapsed = false;
};
const selectItem = (ctx, event) => {
    const e = event;
    ctx.selectedId = e.id;
};
const toggleGroup = (ctx, event) => {
    const e = event;
    const id = e.id;
    if (ctx.expandedGroups.includes(id)) {
        ctx.expandedGroups = ctx.expandedGroups.filter((g) => g !== id);
    }
    else {
        ctx.expandedGroups = [...ctx.expandedGroups, id];
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const sidebarMachine = createMachine({
    id: 'sidebar',
    initial: 'expanded',
    context: {
        collapsed: false,
        selectedId: null,
        expandedGroups: [],
        width: 260,
        collapsedWidth: 60,
        onCollapsedChange: null,
        onSelectedChange: null,
    },
    watch: {
        collapsed: (ctx) => {
            var _a;
            (_a = ctx.onCollapsedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { collapsed: ctx.collapsed });
        },
        selectedId: (ctx) => {
            var _a;
            if (ctx.selectedId != null) {
                (_a = ctx.onSelectedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { selectedId: ctx.selectedId });
            }
        },
    },
    states: {
        expanded: {
            entry: [syncCollapsedFalse],
            on: {
                TOGGLE_COLLAPSE: {
                    target: 'collapsed',
                },
                SET_COLLAPSED: [
                    {
                        guard: (_ctx, event) => {
                            const e = event;
                            return e.collapsed === true;
                        },
                        target: 'collapsed',
                    },
                ],
                SELECT: {
                    actions: [selectItem],
                },
                TOGGLE_GROUP: {
                    actions: [toggleGroup],
                },
            },
        },
        collapsed: {
            entry: [syncCollapsedTrue],
            on: {
                TOGGLE_COLLAPSE: {
                    target: 'expanded',
                },
                SET_COLLAPSED: [
                    {
                        guard: (_ctx, event) => {
                            const e = event;
                            return e.collapsed === false;
                        },
                        target: 'expanded',
                    },
                ],
                SELECT: {
                    actions: [selectItem],
                },
                TOGGLE_GROUP: {
                    actions: [toggleGroup],
                },
            },
        },
    },
});
export function connectSidebar(state, send) {
    const ctx = state.context;
    const isCollapsed = state.matches('collapsed');
    const attrs = sidebarAnatomy.getPartAttrs;
    return {
        /** Whether the sidebar is collapsed. */
        collapsed: isCollapsed,
        /** Currently selected item ID. */
        selectedId: ctx.selectedId,
        getRootProps() {
            const currentWidth = isCollapsed ? ctx.collapsedWidth : ctx.width;
            return Object.assign(Object.assign({}, attrs('root')), { 'data-state': isCollapsed ? 'collapsed' : 'expanded', style: {
                    width: typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth,
                }, onKeyDown(event) {
                    if (event.key === '[') {
                        event.preventDefault();
                        send({ type: 'TOGGLE_COLLAPSE' });
                    }
                } });
        },
        getHeaderProps() {
            return Object.assign(Object.assign({}, attrs('header')), { 'data-state': isCollapsed ? 'collapsed' : 'expanded' });
        },
        getContentProps() {
            return Object.assign(Object.assign({}, attrs('content')), { 'data-state': isCollapsed ? 'collapsed' : 'expanded' });
        },
        getItemProps(props) {
            const isSelected = ctx.selectedId === props.id;
            const isDisabled = props.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { role: 'menuitem', 'aria-selected': isSelected, 'data-selected': isSelected ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-state': isCollapsed ? 'collapsed' : 'expanded', 'data-value': props.id, tabIndex: isDisabled ? -1 : 0, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SELECT', id: props.id });
                    }
                },
                onKeyDown(event) {
                    if (isDisabled)
                        return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        send({ type: 'SELECT', id: props.id });
                    }
                } });
        },
        getGroupProps(props) {
            const isExpanded = ctx.expandedGroups.includes(props.id);
            return Object.assign(Object.assign({}, attrs('group')), { role: 'group', 'data-state': isExpanded ? 'open' : 'closed', 'data-value': props.id });
        },
        getGroupLabelProps(props) {
            const isExpanded = ctx.expandedGroups.includes(props.id);
            return Object.assign(Object.assign({}, attrs('groupLabel')), { role: 'button', 'aria-expanded': isExpanded, 'data-state': isExpanded ? 'open' : 'closed', 'data-value': props.id, tabIndex: 0, onClick() {
                    send({ type: 'TOGGLE_GROUP', id: props.id });
                },
                onKeyDown(event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        send({ type: 'TOGGLE_GROUP', id: props.id });
                    }
                } });
        },
        getToggleProps() {
            return Object.assign(Object.assign({}, attrs('toggle')), { role: 'button', type: 'button', 'aria-label': isCollapsed ? 'Expand sidebar' : 'Collapse sidebar', 'data-state': isCollapsed ? 'collapsed' : 'expanded', tabIndex: 0, onClick() {
                    send({ type: 'TOGGLE_COLLAPSE' });
                },
                onKeyDown(event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        send({ type: 'TOGGLE_COLLAPSE' });
                    }
                } });
        },
        getFooterProps() {
            return Object.assign(Object.assign({}, attrs('footer')), { 'data-state': isCollapsed ? 'collapsed' : 'expanded' });
        },
    };
}
