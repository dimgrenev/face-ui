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
const TYPEAHEAD_TIMEOUT = 700;
const getEnabledValues = (ctx) => {
    if (ctx.disabled)
        return [];
    return ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value));
};
const isEnabledValue = (ctx, value) => value != null && getEnabledValues(ctx).includes(value);
const isSelectableValue = (ctx, value) => {
    if (ctx.disabled || value == null || ctx.disabledValues.includes(value))
        return false;
    return ctx.itemOrder.length === 0 || ctx.itemOrder.includes(value);
};
const isSelectableEventValue = (ctx, event) => (event.type === 'SELECT' && isSelectableValue(ctx, event.value));
const hasHighlightedItem = (ctx) => isEnabledValue(ctx, ctx.highlightedValue);
const normalizeTypeaheadKey = (key) => {
    if (key.length !== 1)
        return null;
    return key.toLocaleLowerCase();
};
const isRepeatedQuery = (query) => (query.length > 1 && Array.from(query).every((char) => char === query[0]));
const getItemLabel = (ctx, value) => (ctx.itemLabels[value] || value);
const findTypeaheadMatch = (ctx, query) => {
    const enabled = getEnabledValues(ctx);
    if (enabled.length === 0)
        return null;
    const search = isRepeatedQuery(query) ? query[0] : query;
    const currentIndex = ctx.highlightedValue ? enabled.indexOf(ctx.highlightedValue) : -1;
    for (let offset = 1; offset <= enabled.length; offset += 1) {
        const index = currentIndex < 0
            ? offset - 1
            : (currentIndex + offset) % enabled.length;
        const value = enabled[index];
        const label = getItemLabel(ctx, value).trim().toLocaleLowerCase();
        if (label.startsWith(search))
            return value;
    }
    return null;
};
const setHighlightedValue = (ctx, value, highlightedByKeyboard) => {
    const nextValue = isSelectableValue(ctx, value) ? value : null;
    ctx.highlightedValue = nextValue;
    ctx.highlightedByKeyboard = Boolean(nextValue && highlightedByKeyboard);
};
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const syncOpenTrue = (ctx) => {
    ctx.open = true;
};
const syncOpenFalse = (ctx) => {
    ctx.open = false;
    ctx.highlightedValue = null;
    ctx.highlightedByKeyboard = false;
    ctx.typeaheadQuery = '';
    ctx.typeaheadLastAt = 0;
};
const setHighlighted = (ctx, event) => {
    const { value, focus } = event;
    setHighlightedValue(ctx, value, Boolean(focus));
};
const highlightFirst = (ctx) => {
    var _a;
    setHighlightedValue(ctx, (_a = getEnabledValues(ctx)[0]) !== null && _a !== void 0 ? _a : null, true);
};
const highlightLast = (ctx) => {
    var _a;
    const enabled = getEnabledValues(ctx);
    setHighlightedValue(ctx, (_a = enabled[enabled.length - 1]) !== null && _a !== void 0 ? _a : null, true);
};
const highlightOffset = (ctx, delta) => {
    const enabled = getEnabledValues(ctx);
    if (enabled.length === 0) {
        setHighlightedValue(ctx, null, false);
        return;
    }
    const currentIndex = ctx.highlightedValue ? enabled.indexOf(ctx.highlightedValue) : -1;
    const nextIndex = currentIndex < 0
        ? (delta > 0 ? 0 : enabled.length - 1)
        : (currentIndex + delta + enabled.length) % enabled.length;
    setHighlightedValue(ctx, enabled[nextIndex], true);
};
const selectItem = (ctx, event) => {
    var _a;
    const value = event.value;
    (_a = ctx.onSelect) === null || _a === void 0 ? void 0 : _a.call(ctx, { value });
};
const selectHighlightedItem = (ctx) => {
    var _a;
    if (!isEnabledValue(ctx, ctx.highlightedValue))
        return;
    (_a = ctx.onSelect) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.highlightedValue });
};
const applyTypeahead = (ctx, event) => {
    const { key, now = Date.now() } = event;
    const normalizedKey = normalizeTypeaheadKey(key);
    if (!normalizedKey)
        return;
    const queryPrefix = ctx.typeaheadLastAt > 0 && now - ctx.typeaheadLastAt <= TYPEAHEAD_TIMEOUT
        ? ctx.typeaheadQuery
        : '';
    const nextQuery = `${queryPrefix}${normalizedKey}`;
    ctx.typeaheadQuery = nextQuery;
    ctx.typeaheadLastAt = now;
    const match = findTypeaheadMatch(ctx, nextQuery);
    if (match)
        setHighlightedValue(ctx, match, true);
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
        highlightedByKeyboard: false,
        itemOrder: [],
        disabledValues: [],
        itemLabels: {},
        typeaheadQuery: '',
        typeaheadLastAt: 0,
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
                OPEN_FIRST: [{ target: 'open', guard: isNotDisabled, actions: [highlightFirst] }],
                OPEN_LAST: [{ target: 'open', guard: isNotDisabled, actions: [highlightLast] }],
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
                OPEN_FIRST: { actions: [highlightFirst] },
                OPEN_LAST: { actions: [highlightLast] },
                TOGGLE: { target: 'closed' },
                DISMISS: { target: 'closed' },
                HIGHLIGHT: { actions: [setHighlighted] },
                SELECT: [{ target: 'closed', guard: isSelectableEventValue, actions: [selectItem] }],
                SELECT_HIGHLIGHTED: [{ target: 'closed', guard: hasHighlightedItem, actions: [selectHighlightedItem] }],
                NAVIGATE_UP: { actions: [(ctx) => highlightOffset(ctx, -1)] },
                NAVIGATE_DOWN: { actions: [(ctx) => highlightOffset(ctx, 1)] },
                NAVIGATE_FIRST: { actions: [highlightFirst] },
                NAVIGATE_LAST: { actions: [highlightLast] },
                TYPEAHEAD: { actions: [applyTypeahead] },
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
    },
    implementations: {
        effects: {
            trackDismiss: (ctx, send) => {
                if (typeof document === 'undefined')
                    return;
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
const isTypeaheadEvent = (event) => (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey);
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
                    switch (e.key) {
                        case 'ArrowDown':
                        case 'Enter':
                        case ' ': {
                            e.preventDefault();
                            send({ type: 'OPEN_FIRST' });
                            break;
                        }
                        case 'ArrowUp': {
                            e.preventDefault();
                            send({ type: 'OPEN_LAST' });
                            break;
                        }
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
                            send({ type: 'NAVIGATE_FIRST' });
                            break;
                        }
                        case 'End': {
                            e.preventDefault();
                            send({ type: 'NAVIGATE_LAST' });
                            break;
                        }
                        case 'Enter':
                        case ' ': {
                            e.preventDefault();
                            send({ type: 'SELECT_HIGHLIGHTED' });
                            break;
                        }
                        default: {
                            if (isTypeaheadEvent(e)) {
                                e.preventDefault();
                                send({ type: 'TYPEAHEAD', key: e.key });
                            }
                        }
                    }
                } });
        },
        getItemProps(props) {
            const { value, disabled: itemDisabled } = props;
            const isHighlighted = ctx.highlightedValue === value;
            return Object.assign(Object.assign({}, attrs('item')), { role: 'menuitem', 'aria-disabled': itemDisabled || undefined, 'data-value': value, 'data-highlighted': isHighlighted ? '' : undefined, 'data-disabled': itemDisabled ? '' : undefined, disabled: itemDisabled || undefined, tabIndex: itemDisabled ? -1 : (isHighlighted ? 0 : -1), onPointerEnter() {
                    if (!itemDisabled) {
                        send({ type: 'HIGHLIGHT', value });
                    }
                },
                onPointerLeave() {
                    send({ type: 'HIGHLIGHT', value: null });
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
