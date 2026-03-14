/**
 * @face-ui/core — Menu Machine
 *
 * Unifies ContextMenu + DropdownMenu into a single FSM.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const menuAnatomy = createAnatomy('menu').parts('trigger', 'content', 'item', 'separator', 'group', 'group-label');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const syncOpenTrue = (ctx) => {
    ctx.open = true;
};
const syncOpenFalse = (ctx) => {
    ctx.open = false;
    ctx.highlightedValue = null;
};
const setHighlighted = (ctx, event) => {
    ctx.highlightedValue = event.value;
};
const selectItem = (ctx, event) => {
    var _a;
    const value = event.value;
    (_a = ctx.onSelect) === null || _a === void 0 ? void 0 : _a.call(ctx, { value });
};
const setTriggerEl = (ctx, event) => {
    ctx.triggerEl = event.el;
};
const setContentEl = (ctx, event) => {
    ctx.contentEl = event.el;
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const menuMachine = createMachine({
    id: 'menu',
    initial: 'closed',
    context: {
        open: false,
        trigger: 'click',
        highlightedValue: null,
        disabled: false,
        triggerEl: null,
        contentEl: null,
        onSelect: null,
        onOpenChange: null,
    },
    computed: {
        isOpen: (ctx) => ctx.open,
    },
    watch: {
        open: (ctx) => {
            var _a;
            (_a = ctx.onOpenChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { open: ctx.open });
        },
    },
    states: {
        closed: {
            entry: [syncOpenFalse],
            on: {
                OPEN: [{ target: 'open', guard: isNotDisabled }],
                TOGGLE: [{ target: 'open', guard: isNotDisabled }],
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
        open: {
            tags: ['visible'],
            entry: [syncOpenTrue],
            effects: ['trackDismiss', 'trackContextMenu'],
            on: {
                CLOSE: { target: 'closed' },
                TOGGLE: { target: 'closed' },
                DISMISS: { target: 'closed' },
                HIGHLIGHT: { actions: [setHighlighted] },
                SELECT: {
                    target: 'closed',
                    actions: [selectItem],
                },
                NAVIGATE_UP: { actions: ['navigateUp'] },
                NAVIGATE_DOWN: { actions: ['navigateDown'] },
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
    },
    implementations: {
        actions: {
            navigateUp: (ctx) => {
                // Navigation is delegated to the connect layer via getItemProps
                // The machine stores highlightedValue; the adapter reads DOM siblings
                // This is a placeholder for adapter integration
                void ctx;
            },
            navigateDown: (ctx) => {
                void ctx;
            },
        },
        effects: {
            trackDismiss: (ctx, send) => {
                const onKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        send({ type: 'DISMISS' });
                    }
                };
                const onPointerDown = (e) => {
                    var _a, _b, _c, _d;
                    const target = e.target;
                    if (!target)
                        return;
                    const isInsideTrigger = (_b = (_a = ctx.triggerEl) === null || _a === void 0 ? void 0 : _a.contains(target)) !== null && _b !== void 0 ? _b : false;
                    const isInsideContent = (_d = (_c = ctx.contentEl) === null || _c === void 0 ? void 0 : _c.contains(target)) !== null && _d !== void 0 ? _d : false;
                    if (!isInsideTrigger && !isInsideContent) {
                        send({ type: 'DISMISS' });
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('pointerdown', onPointerDown);
                return () => {
                    document.removeEventListener('keydown', onKeyDown);
                    document.removeEventListener('pointerdown', onPointerDown);
                };
            },
            trackContextMenu: (ctx, send) => {
                // Only attach context menu listener for context trigger
                if (ctx.trigger !== 'context')
                    return;
                const el = ctx.triggerEl;
                if (!el)
                    return;
                const onContextMenu = (e) => {
                    e.preventDefault();
                    send({ type: 'OPEN' });
                };
                el.addEventListener('contextmenu', onContextMenu);
                return () => {
                    el.removeEventListener('contextmenu', onContextMenu);
                };
            },
        },
    },
});
export function connectMenu(state, send) {
    const { context: ctx } = state;
    const isOpen = state.matches('open');
    const attrs = menuAnatomy.getPartAttrs;
    const triggerIsClick = ctx.trigger === 'click';
    const triggerIsContext = ctx.trigger === 'context';
    return {
        getTriggerProps() {
            return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, attrs('trigger')), { 'aria-haspopup': 'menu', 'aria-expanded': isOpen, 'data-state': isOpen ? 'open' : 'closed', disabled: ctx.disabled || undefined }), (triggerIsClick && {
                onClick() {
                    send({ type: 'TOGGLE' });
                },
            })), (triggerIsContext && {
                onContextMenu(e) {
                    e.preventDefault();
                    send({ type: 'OPEN' });
                },
            })), { onKeyDown(e) {
                    if (ctx.disabled)
                        return;
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        send({ type: 'OPEN' });
                    }
                } });
        },
        getContentProps() {
            return Object.assign(Object.assign({}, attrs('content')), { role: 'menu', 'aria-orientation': 'vertical', hidden: !isOpen, 'data-state': isOpen ? 'open' : 'closed', tabIndex: 0, onKeyDown(e) {
                    switch (e.key) {
                        case 'ArrowUp': {
                            e.preventDefault();
                            send({ type: 'NAVIGATE_UP' });
                            break;
                        }
                        case 'ArrowDown': {
                            e.preventDefault();
                            send({ type: 'NAVIGATE_DOWN' });
                            break;
                        }
                        case 'Escape': {
                            e.preventDefault();
                            send({ type: 'DISMISS' });
                            break;
                        }
                        case 'Home': {
                            e.preventDefault();
                            send({ type: 'NAVIGATE_UP' });
                            break;
                        }
                        case 'End': {
                            e.preventDefault();
                            send({ type: 'NAVIGATE_DOWN' });
                            break;
                        }
                    }
                } });
        },
        getItemProps(props) {
            const { value, disabled: itemDisabled } = props;
            const isHighlighted = ctx.highlightedValue === value;
            return Object.assign(Object.assign({}, attrs('item')), { role: 'menuitem', 'data-value': value, 'data-highlighted': isHighlighted ? '' : undefined, 'data-disabled': itemDisabled ? '' : undefined, tabIndex: isHighlighted ? 0 : -1, onPointerEnter() {
                    if (!itemDisabled) {
                        send({ type: 'HIGHLIGHT', value });
                    }
                },
                onPointerLeave() {
                    send({ type: 'HIGHLIGHT', value: '' });
                },
                onClick() {
                    if (!itemDisabled) {
                        send({ type: 'SELECT', value });
                    }
                },
                onKeyDown(e) {
                    if (itemDisabled)
                        return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        send({ type: 'SELECT', value });
                    }
                } });
        },
        getSeparatorProps() {
            return Object.assign(Object.assign({}, attrs('separator')), { role: 'separator' });
        },
        getGroupProps() {
            return Object.assign(Object.assign({}, attrs('group')), { role: 'group' });
        },
        getGroupLabelProps() {
            return Object.assign(Object.assign({}, attrs('group-label')), { role: 'presentation' });
        },
    };
}
