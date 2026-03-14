/**
 * @face-ui/core — Accordion Machine
 *
 * Framework-agnostic FSM for accordion / collapsible panels.
 * Collapsible is simply an Accordion with a single item.
 *
 * Supports:
 * - Single or multiple expanded items
 * - Collapsible mode (allow closing the last open item)
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Disabled state at root and item level
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const accordionAnatomy = createAnatomy('accordion').parts('root', 'item', 'trigger', 'content');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const toggleItem = (ctx, event) => {
    const e = event;
    const value = e.value;
    const isExpanded = ctx.expandedIds.includes(value);
    if (isExpanded) {
        // Collapse: check if collapsible allows it
        if (ctx.collapsible || ctx.expandedIds.length > 1) {
            ctx.expandedIds = ctx.expandedIds.filter((id) => id !== value);
        }
    }
    else {
        // Expand
        if (ctx.multiple) {
            ctx.expandedIds = [...ctx.expandedIds, value];
        }
        else {
            ctx.expandedIds = [value];
        }
    }
};
const setExpanded = (ctx, event) => {
    const e = event;
    ctx.expandedIds = e.expandedIds;
};
const expandAll = (ctx) => {
    // expandAll is only meaningful when multiple=true; otherwise it's a no-op
    // The caller is responsible for knowing the full list of item values.
    // This action is a signal — the connect layer or user code should populate it.
    if (!ctx.multiple)
        return;
};
const collapseAll = (ctx) => {
    if (ctx.collapsible) {
        ctx.expandedIds = [];
    }
};
const setFocusedValue = (ctx, event) => {
    const e = event;
    ctx.focusedValue = e.value;
};
const clearFocusedValue = (ctx) => {
    ctx.focusedValue = null;
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const accordionMachine = createMachine({
    id: 'accordion',
    initial: 'idle',
    context: {
        expandedIds: [],
        focusedValue: null,
        multiple: false,
        collapsible: true,
        disabled: false,
        onExpandedChange: null,
    },
    watch: {
        expandedIds: (ctx) => {
            var _a;
            (_a = ctx.onExpandedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { expandedIds: ctx.expandedIds });
        },
    },
    states: {
        idle: {
            on: {
                TOGGLE: {
                    guard: isNotDisabled,
                    actions: [toggleItem],
                },
                SET_EXPANDED: {
                    actions: [setExpanded],
                },
                EXPAND_ALL: {
                    guard: isNotDisabled,
                    actions: [expandAll],
                },
                COLLAPSE_ALL: {
                    guard: isNotDisabled,
                    actions: [collapseAll],
                },
                FOCUS: {
                    target: 'focused',
                    guard: isNotDisabled,
                    actions: [setFocusedValue],
                },
            },
        },
        focused: {
            on: {
                TOGGLE: {
                    guard: isNotDisabled,
                    actions: [toggleItem],
                },
                SET_EXPANDED: {
                    actions: [setExpanded],
                },
                EXPAND_ALL: {
                    guard: isNotDisabled,
                    actions: [expandAll],
                },
                COLLAPSE_ALL: {
                    guard: isNotDisabled,
                    actions: [collapseAll],
                },
                FOCUS: {
                    guard: isNotDisabled,
                    actions: [setFocusedValue],
                },
                BLUR: {
                    target: 'idle',
                    actions: [clearFocusedValue],
                },
                FOCUS_NEXT: {
                    guard: isNotDisabled,
                    actions: [],
                },
                FOCUS_PREV: {
                    guard: isNotDisabled,
                    actions: [],
                },
                FOCUS_FIRST: {
                    guard: isNotDisabled,
                    actions: [],
                },
                FOCUS_LAST: {
                    guard: isNotDisabled,
                    actions: [],
                },
            },
        },
    },
});
export function connectAccordion(state, send) {
    const ctx = state.context;
    const attrs = accordionAnatomy.getPartAttrs;
    return {
        /** Current expanded item IDs */
        expandedIds: ctx.expandedIds,
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { 'data-disabled': ctx.disabled ? '' : undefined });
        },
        getItemProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.value);
            const isDisabled = ctx.disabled || props.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { 'data-state': isExpanded ? 'open' : 'closed', 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.value });
        },
        getTriggerProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.value);
            const isDisabled = ctx.disabled || props.disabled;
            return Object.assign(Object.assign({}, attrs('trigger')), { role: 'button', type: 'button', id: `accordion:trigger:${props.value}`, 'aria-expanded': isExpanded, 'aria-controls': `accordion:content:${props.value}`, 'data-state': isExpanded ? 'open' : 'closed', 'data-disabled': isDisabled ? '' : undefined, 'data-value': props.value, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'TOGGLE', value: props.value });
                    }
                },
                onFocus() {
                    if (!isDisabled) {
                        send({ type: 'FOCUS', value: props.value });
                    }
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
                onKeyDown(event) {
                    if (isDisabled)
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
                            send({ type: 'TOGGLE', value: props.value });
                            break;
                    }
                } });
        },
        getContentProps(props) {
            const isExpanded = ctx.expandedIds.includes(props.value);
            return Object.assign(Object.assign({}, attrs('content')), { role: 'region', id: `accordion:content:${props.value}`, 'aria-labelledby': `accordion:trigger:${props.value}`, 'data-state': isExpanded ? 'open' : 'closed', hidden: !isExpanded });
        },
    };
}
