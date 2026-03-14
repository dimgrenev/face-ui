/**
 * @face-ui/core — Command Machine
 *
 * Framework-agnostic FSM for a command palette / search.
 *
 * Supports:
 * - Text-based search filtering (matches label or keywords)
 * - Grouped items
 * - Keyboard navigation (ArrowUp/Down to highlight, Enter to select)
 * - Focus/blur state tracking
 * - Highlighted item management
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const commandAnatomy = createAnatomy('command').parts('root', 'input', 'list', 'group', 'groupLabel', 'item', 'empty', 'separator');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function filterItems(items, query) {
    if (!query.trim())
        return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
        var _a, _b;
        const labelMatch = item.label.toLowerCase().includes(lowerQuery);
        const keywordMatch = (_b = (_a = item.keywords) === null || _a === void 0 ? void 0 : _a.some((kw) => kw.toLowerCase().includes(lowerQuery))) !== null && _b !== void 0 ? _b : false;
        return labelMatch || keywordMatch;
    });
}
function clampIndex(index, length) {
    if (length === 0)
        return -1;
    if (index < 0)
        return length - 1;
    if (index >= length)
        return 0;
    return index;
}
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const setQuery = (ctx, event) => {
    const e = event;
    ctx.query = e.value;
    ctx.filteredItems = filterItems(ctx.items, ctx.query);
    // Reset highlight to first item
    ctx.highlightedIndex = ctx.filteredItems.length > 0 ? 0 : -1;
};
const highlightNext = (ctx) => {
    var _a;
    const enabledItems = ctx.filteredItems.filter((item) => !item.disabled);
    if (enabledItems.length === 0) {
        ctx.highlightedIndex = -1;
        return;
    }
    // Find next enabled item
    let nextIndex = ctx.highlightedIndex + 1;
    while (nextIndex < ctx.filteredItems.length && ctx.filteredItems[nextIndex].disabled) {
        nextIndex++;
    }
    ctx.highlightedIndex = clampIndex(nextIndex, ctx.filteredItems.length);
    // If we landed on a disabled item, skip forward
    while (ctx.highlightedIndex >= 0 && ((_a = ctx.filteredItems[ctx.highlightedIndex]) === null || _a === void 0 ? void 0 : _a.disabled)) {
        ctx.highlightedIndex = clampIndex(ctx.highlightedIndex + 1, ctx.filteredItems.length);
    }
};
const highlightPrev = (ctx) => {
    var _a;
    const enabledItems = ctx.filteredItems.filter((item) => !item.disabled);
    if (enabledItems.length === 0) {
        ctx.highlightedIndex = -1;
        return;
    }
    let prevIndex = ctx.highlightedIndex - 1;
    while (prevIndex >= 0 && ctx.filteredItems[prevIndex].disabled) {
        prevIndex--;
    }
    ctx.highlightedIndex = clampIndex(prevIndex, ctx.filteredItems.length);
    // If we landed on a disabled item, skip backward
    while (ctx.highlightedIndex >= 0 && ((_a = ctx.filteredItems[ctx.highlightedIndex]) === null || _a === void 0 ? void 0 : _a.disabled)) {
        ctx.highlightedIndex = clampIndex(ctx.highlightedIndex - 1, ctx.filteredItems.length);
    }
};
const highlightIndex = (ctx, event) => {
    const e = event;
    ctx.highlightedIndex = e.index;
};
const selectHighlighted = (ctx) => {
    var _a, _b;
    const item = ctx.filteredItems[ctx.highlightedIndex];
    if (!item || item.disabled)
        return;
    (_a = item.onSelect) === null || _a === void 0 ? void 0 : _a.call(item);
    (_b = ctx.onSelect) === null || _b === void 0 ? void 0 : _b.call(ctx, { item });
};
const selectItemById = (ctx, event) => {
    var _a, _b;
    const e = event;
    const item = ctx.filteredItems.find((i) => i.id === e.id);
    if (!item || item.disabled)
        return;
    (_a = item.onSelect) === null || _a === void 0 ? void 0 : _a.call(item);
    (_b = ctx.onSelect) === null || _b === void 0 ? void 0 : _b.call(ctx, { item });
};
const setItems = (ctx, event) => {
    const e = event;
    ctx.items = e.items;
    ctx.filteredItems = filterItems(ctx.items, ctx.query);
    ctx.highlightedIndex = ctx.filteredItems.length > 0 ? 0 : -1;
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const commandMachine = createMachine({
    id: 'command',
    initial: 'idle',
    context: {
        query: '',
        highlightedIndex: 0,
        items: [],
        filteredItems: [],
        groups: [],
        onValueChange: null,
        onSelect: null,
    },
    watch: {
        query: (ctx) => {
            var _a;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.query });
        },
    },
    states: {
        idle: {
            on: {
                FOCUS: {
                    target: 'focused',
                },
                HIGHLIGHT_INDEX: {
                    actions: [highlightIndex],
                },
                SELECT_ITEM: {
                    actions: [selectItemById],
                },
                SET_QUERY: {
                    actions: [setQuery],
                },
                SET_ITEMS: {
                    actions: [setItems],
                },
            },
        },
        focused: {
            on: {
                BLUR: {
                    target: 'idle',
                },
                SET_QUERY: {
                    actions: [setQuery],
                },
                HIGHLIGHT_NEXT: {
                    actions: [highlightNext],
                },
                HIGHLIGHT_PREV: {
                    actions: [highlightPrev],
                },
                HIGHLIGHT_INDEX: {
                    actions: [highlightIndex],
                },
                SELECT: {
                    actions: [selectHighlighted],
                },
                SELECT_ITEM: {
                    actions: [selectItemById],
                },
                SET_ITEMS: {
                    actions: [setItems],
                },
            },
        },
    },
});
export function connectCommand(state, send) {
    const ctx = state.context;
    const isFocused = state.matches('focused');
    const attrs = commandAnatomy.getPartAttrs;
    return {
        /** Current search query */
        query: ctx.query,
        /** Filtered items based on query */
        filteredItems: ctx.filteredItems,
        /** Currently highlighted index */
        highlightedIndex: ctx.highlightedIndex,
        /** Whether the input is focused */
        isFocused,
        /** Whether there are no results */
        isEmpty: ctx.filteredItems.length === 0 && ctx.query.length > 0,
        /**
         * Group filtered items by their group field.
         * Returns an array of { group, items } objects, with ungrouped items first.
         */
        getGroupedItems() {
            const grouped = [];
            const groupMap = new Map();
            for (const item of ctx.filteredItems) {
                const key = item.group;
                if (!groupMap.has(key)) {
                    groupMap.set(key, []);
                }
                groupMap.get(key).push(item);
            }
            // Ungrouped items first
            const ungrouped = groupMap.get(undefined);
            if (ungrouped) {
                grouped.push({ group: null, items: ungrouped });
            }
            // Then grouped items in group definition order
            for (const groupDef of ctx.groups) {
                const items = groupMap.get(groupDef.id);
                if (items) {
                    grouped.push({ group: groupDef, items });
                }
            }
            return grouped;
        },
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { 'data-state': isFocused ? 'focused' : 'idle' });
        },
        getInputProps() {
            var _a;
            return Object.assign(Object.assign({}, attrs('input')), { role: 'combobox', 'aria-expanded': true, 'aria-controls': 'command:list', 'aria-activedescendant': ctx.highlightedIndex >= 0 ? `command:item:${(_a = ctx.filteredItems[ctx.highlightedIndex]) === null || _a === void 0 ? void 0 : _a.id}` : undefined, autoComplete: 'off', autoCorrect: 'off', spellCheck: false, value: ctx.query, onChange(event) {
                    send({ type: 'SET_QUERY', value: event.target.value });
                },
                onFocus() {
                    send({ type: 'FOCUS' });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
                onKeyDown(event) {
                    switch (event.key) {
                        case 'ArrowDown':
                            event.preventDefault();
                            send({ type: 'HIGHLIGHT_NEXT' });
                            break;
                        case 'ArrowUp':
                            event.preventDefault();
                            send({ type: 'HIGHLIGHT_PREV' });
                            break;
                        case 'Enter':
                            event.preventDefault();
                            send({ type: 'SELECT' });
                            break;
                        case 'Escape':
                            event.preventDefault();
                            send({ type: 'BLUR' });
                            break;
                    }
                } });
        },
        getListProps() {
            return Object.assign(Object.assign({}, attrs('list')), { id: 'command:list', role: 'listbox', 'aria-label': 'Command items' });
        },
        getGroupProps(props) {
            return Object.assign(Object.assign({}, attrs('group')), { role: 'group', 'aria-labelledby': `command:group-label:${props.id}`, 'data-value': props.id });
        },
        getGroupLabelProps(props) {
            return Object.assign(Object.assign({}, attrs('groupLabel')), { id: `command:group-label:${props.id}`, role: 'presentation', 'data-value': props.id });
        },
        getItemProps(props) {
            const isHighlighted = ctx.highlightedIndex === props.index;
            const isDisabled = props.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { id: `command:item:${props.id}`, role: 'option', 'aria-selected': isHighlighted, 'data-highlighted': isHighlighted ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.id, tabIndex: -1, onPointerDown(event) {
                    if (!isDisabled) {
                        event.preventDefault();
                    }
                },
                onPointerEnter() {
                    if (!isDisabled) {
                        send({ type: 'HIGHLIGHT_INDEX', index: props.index });
                    }
                },
                onMouseEnter() {
                    if (!isDisabled) {
                        send({ type: 'HIGHLIGHT_INDEX', index: props.index });
                    }
                },
                onMouseOver() {
                    if (!isDisabled) {
                        send({ type: 'HIGHLIGHT_INDEX', index: props.index });
                    }
                },
                onClick() {
                    if (!isDisabled) {
                        send({ type: 'SELECT_ITEM', id: props.id });
                    }
                } });
        },
        getEmptyProps() {
            return Object.assign(Object.assign({}, attrs('empty')), { role: 'presentation' });
        },
        getSeparatorProps() {
            return Object.assign(Object.assign({}, attrs('separator')), { role: 'separator' });
        },
    };
}
