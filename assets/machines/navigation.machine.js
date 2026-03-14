/**
 * @face-ui/core — Navigation Machine
 *
 * Framework-agnostic FSM for horizontal/vertical navigation with hover dropdowns.
 * Composition of Bar + Overlay pattern (like Notion's nav menu).
 *
 * Supports:
 * - Hover to open dropdown for items with sub-items
 * - Mouse leave closes after a configurable delay
 * - Active item tracking
 * - Horizontal and vertical orientation
 * - Keyboard navigation (ArrowLeft/Right for horizontal, ArrowUp/Down for vertical)
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const navigationAnatomy = createAnatomy('navigation').parts('root', 'list', 'item', 'trigger', 'content', 'link', 'indicator');
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const openItem = (ctx, event) => {
    const e = event;
    ctx.openItemId = e.id;
    // Clear any pending close timer
    if (ctx.closeTimerId != null) {
        clearTimeout(ctx.closeTimerId);
        ctx.closeTimerId = null;
    }
};
const closeItem = (ctx) => {
    ctx.openItemId = null;
    if (ctx.closeTimerId != null) {
        clearTimeout(ctx.closeTimerId);
        ctx.closeTimerId = null;
    }
};
const setActive = (ctx, event) => {
    const e = event;
    ctx.activeId = e.id;
    ctx.focusedId = e.id;
};
const handleMouseEnter = (ctx, event) => {
    const e = event;
    ctx.openItemId = e.id;
    ctx.focusedId = e.id;
    // Clear any pending close timer
    if (ctx.closeTimerId != null) {
        clearTimeout(ctx.closeTimerId);
        ctx.closeTimerId = null;
    }
};
const setFocusedItem = (ctx, event) => {
    const e = event;
    ctx.focusedId = e.id;
};
const getEnabledItemIds = (ctx) => ctx.itemOrder.filter((id) => !ctx.disabledIds.includes(id));
const focusByOffset = (ctx, delta) => {
    var _a;
    const enabledIds = getEnabledItemIds(ctx);
    if (enabledIds.length === 0)
        return;
    const currentId = (_a = ctx.focusedId) !== null && _a !== void 0 ? _a : ctx.activeId;
    const currentIndex = currentId ? enabledIds.indexOf(currentId) : -1;
    const nextIndex = currentIndex < 0
        ? (delta > 0 ? 0 : enabledIds.length - 1)
        : (currentIndex + delta + enabledIds.length) % enabledIds.length;
    ctx.focusedId = enabledIds[nextIndex];
};
const cancelClose = (ctx) => {
    if (ctx.closeTimerId != null) {
        clearTimeout(ctx.closeTimerId);
        ctx.closeTimerId = null;
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const navigationMachine = createMachine({
    id: 'navigation',
    initial: 'idle',
    context: {
        openItemId: null,
        activeId: null,
        focusedId: null,
        itemOrder: [],
        disabledIds: [],
        orientation: 'horizontal',
        closeDelay: 200,
        closeTimerId: null,
        onActiveChange: null,
    },
    watch: {
        activeId: (ctx) => {
            var _a;
            if (ctx.activeId != null) {
                (_a = ctx.onActiveChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { id: ctx.activeId });
            }
        },
    },
    states: {
        idle: {
            on: {
                OPEN_ITEM: {
                    target: 'open',
                    actions: [openItem],
                },
                MOUSE_ENTER: {
                    target: 'open',
                    actions: [handleMouseEnter],
                },
                SET_ACTIVE: {
                    actions: [setActive],
                },
                FOCUS_ITEM: {
                    actions: [setFocusedItem],
                },
                NAVIGATE_NEXT: {
                    actions: [(ctx) => focusByOffset(ctx, 1)],
                },
                NAVIGATE_PREV: {
                    actions: [(ctx) => focusByOffset(ctx, -1)],
                },
            },
        },
        open: {
            on: {
                OPEN_ITEM: {
                    actions: [openItem],
                },
                MOUSE_ENTER: {
                    actions: [handleMouseEnter],
                },
                CLOSE: {
                    target: 'idle',
                    actions: [closeItem],
                },
                MOUSE_LEAVE: {
                    // Delayed close is handled in the connect layer via setTimeout
                    // because effects need DOM-level integration. The machine just tracks state.
                    target: 'idle',
                    actions: [closeItem],
                },
                CANCEL_CLOSE: {
                    actions: [cancelClose],
                },
                SET_ACTIVE: {
                    actions: [setActive],
                },
                FOCUS_ITEM: {
                    actions: [setFocusedItem],
                },
                NAVIGATE_NEXT: {
                    actions: [(ctx) => focusByOffset(ctx, 1)],
                },
                NAVIGATE_PREV: {
                    actions: [(ctx) => focusByOffset(ctx, -1)],
                },
            },
        },
    },
});
export function connectNavigation(state, send) {
    var _a, _b;
    const ctx = state.context;
    const isOpen = state.matches('open');
    const attrs = navigationAnatomy.getPartAttrs;
    const isHorizontal = ctx.orientation === 'horizontal';
    const firstEnabledId = ctx.itemOrder.find((id) => !ctx.disabledIds.includes(id));
    const tabStopId = (_b = (_a = ctx.focusedId) !== null && _a !== void 0 ? _a : ctx.activeId) !== null && _b !== void 0 ? _b : firstEnabledId;
    // Delay close helper — used by mouse leave handlers
    let closeTimer = null;
    const scheduleClose = () => {
        if (closeTimer != null)
            clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
            send({ type: 'CLOSE' });
            closeTimer = null;
        }, ctx.closeDelay);
    };
    const cancelScheduledClose = () => {
        if (closeTimer != null) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
    };
    return {
        /** Whether any dropdown is open */
        isOpen,
        /** Currently open item ID */
        openItemId: ctx.openItemId,
        /** Currently active item ID */
        activeId: ctx.activeId,
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { role: 'navigation', 'aria-orientation': ctx.orientation, 'data-orientation': ctx.orientation });
        },
        getListProps() {
            return Object.assign(Object.assign({}, attrs('list')), { role: 'menubar', 'aria-orientation': ctx.orientation, 'data-orientation': ctx.orientation, onKeyDown(event) {
                    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
                    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
                    switch (event.key) {
                        case nextKey:
                            event.preventDefault();
                            send({ type: 'NAVIGATE_NEXT' });
                            break;
                        case prevKey:
                            event.preventDefault();
                            send({ type: 'NAVIGATE_PREV' });
                            break;
                        case 'Escape':
                            event.preventDefault();
                            send({ type: 'CLOSE' });
                            break;
                    }
                } });
        },
        getItemProps(props) {
            const isActive = ctx.activeId === props.id;
            const isItemOpen = ctx.openItemId === props.id;
            const isDisabled = props.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { 'data-active': isActive ? '' : undefined, 'data-state': isItemOpen ? 'open' : 'closed', 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, onMouseEnter() {
                    if (!isDisabled && props.hasItems) {
                        cancelScheduledClose();
                        send({ type: 'MOUSE_ENTER', id: props.id });
                    }
                },
                onMouseLeave() {
                    if (props.hasItems) {
                        scheduleClose();
                    }
                } });
        },
        getTriggerProps(props) {
            const isItemOpen = ctx.openItemId === props.id;
            const isDisabled = props.disabled;
            const isTabStop = tabStopId === props.id;
            return Object.assign(Object.assign({}, attrs('trigger')), { role: 'menuitem', 'aria-haspopup': props.hasItems ? 'menu' : undefined, 'aria-expanded': props.hasItems ? isItemOpen : undefined, 'data-state': isItemOpen ? 'open' : 'closed', 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, tabIndex: isDisabled ? -1 : (isTabStop ? 0 : -1), onClick() {
                    if (isDisabled)
                        return;
                    if (props.hasItems) {
                        if (isItemOpen) {
                            send({ type: 'CLOSE' });
                        }
                        else {
                            send({ type: 'OPEN_ITEM', id: props.id });
                        }
                    }
                    else {
                        send({ type: 'SET_ACTIVE', id: props.id });
                    }
                },
                onFocus() {
                    if (!isDisabled) {
                        send({ type: 'FOCUS_ITEM', id: props.id });
                    }
                },
                onKeyDown(event) {
                    if (isDisabled)
                        return;
                    const openKey = isHorizontal ? 'ArrowDown' : 'ArrowRight';
                    switch (event.key) {
                        case 'Enter':
                        case ' ':
                            event.preventDefault();
                            if (props.hasItems) {
                                send({ type: 'OPEN_ITEM', id: props.id });
                            }
                            else {
                                send({ type: 'SET_ACTIVE', id: props.id });
                            }
                            break;
                        case openKey:
                            if (props.hasItems) {
                                event.preventDefault();
                                send({ type: 'OPEN_ITEM', id: props.id });
                            }
                            break;
                        case 'Escape':
                            event.preventDefault();
                            send({ type: 'CLOSE' });
                            break;
                    }
                } });
        },
        getContentProps(props) {
            const isItemOpen = ctx.openItemId === props.id;
            return Object.assign(Object.assign({}, attrs('content')), { role: 'menu', 'data-state': isItemOpen ? 'open' : 'closed', 'data-value': props.id, hidden: !isItemOpen, onMouseEnter() {
                    cancelScheduledClose();
                },
                onMouseLeave() {
                    scheduleClose();
                },
                onKeyDown(event) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        send({ type: 'CLOSE' });
                    }
                } });
        },
        getLinkProps(props) {
            const isActive = ctx.activeId === props.id;
            const isDisabled = props.disabled;
            return Object.assign(Object.assign({}, attrs('link')), { 'aria-current': isActive ? 'page' : undefined, 'data-active': isActive ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, tabIndex: isDisabled ? -1 : 0, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SET_ACTIVE', id: props.id });
                        send({ type: 'CLOSE' });
                    }
                } });
        },
        getIndicatorProps() {
            return Object.assign(Object.assign({}, attrs('indicator')), { 'data-state': isOpen ? 'open' : 'closed', 'aria-hidden': true });
        },
    };
}
