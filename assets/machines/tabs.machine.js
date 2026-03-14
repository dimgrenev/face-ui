/**
 * @face-ui/core — Tabs Machine
 *
 * Framework-agnostic FSM for tabbed navigation.
 * Supports horizontal/vertical orientation and automatic/manual activation modes.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const tabsAnatomy = createAnatomy('tabs').parts('root', 'list', 'trigger', 'content', 'indicator');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
const isAutomatic = (ctx) => ctx.activationMode === 'automatic';
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const setValue = (ctx, event) => {
    const e = event;
    ctx.value = e.value;
};
const setFocusedValue = (ctx, event) => {
    const e = event;
    ctx.focusedValue = e.value;
};
const clearFocusedValue = (ctx) => {
    ctx.focusedValue = null;
};
const getEnabledValues = (ctx) => ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value));
const focusFirstValue = (ctx) => {
    const first = getEnabledValues(ctx)[0];
    if (!first)
        return;
    ctx.focusedValue = first;
    selectOnFocus(ctx);
};
const focusLastValue = (ctx) => {
    const values = getEnabledValues(ctx);
    const last = values[values.length - 1];
    if (!last)
        return;
    ctx.focusedValue = last;
    selectOnFocus(ctx);
};
const focusOffset = (ctx, delta) => {
    var _a;
    const values = getEnabledValues(ctx);
    if (values.length === 0)
        return;
    const current = (_a = ctx.focusedValue) !== null && _a !== void 0 ? _a : ctx.value;
    const currentIndex = current ? values.indexOf(current) : -1;
    const nextIndex = currentIndex < 0
        ? (delta > 0 ? 0 : values.length - 1)
        : (currentIndex + delta + values.length) % values.length;
    ctx.focusedValue = values[nextIndex];
    selectOnFocus(ctx);
};
const selectOnFocus = (ctx) => {
    if (ctx.activationMode === 'automatic' && ctx.focusedValue != null) {
        ctx.value = ctx.focusedValue;
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const tabsMachine = createMachine({
    id: 'tabs',
    initial: 'idle',
    context: {
        value: '',
        focusedValue: null,
        itemOrder: [],
        disabledValues: [],
        disabled: false,
        orientation: 'horizontal',
        activationMode: 'automatic',
        onValueChange: null,
    },
    watch: {
        value: (ctx) => {
            var _a;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
        },
    },
    states: {
        idle: {
            on: {
                SELECT: {
                    guard: isNotDisabled,
                    actions: [setValue],
                },
                SET_VALUE: {
                    actions: [setValue],
                },
                FOCUS: {
                    target: 'focused',
                    guard: isNotDisabled,
                    actions: [setFocusedValue, selectOnFocus],
                },
            },
        },
        focused: {
            on: {
                SELECT: {
                    guard: isNotDisabled,
                    actions: [setValue],
                },
                SET_VALUE: {
                    actions: [setValue],
                },
                FOCUS: {
                    guard: isNotDisabled,
                    actions: [setFocusedValue, selectOnFocus],
                },
                BLUR: {
                    target: 'idle',
                    actions: [clearFocusedValue],
                },
                FOCUS_NEXT: {
                    guard: isNotDisabled,
                    actions: [(ctx) => focusOffset(ctx, 1)],
                },
                FOCUS_PREV: {
                    guard: isNotDisabled,
                    actions: [(ctx) => focusOffset(ctx, -1)],
                },
                FOCUS_FIRST: {
                    guard: isNotDisabled,
                    actions: [focusFirstValue],
                },
                FOCUS_LAST: {
                    guard: isNotDisabled,
                    actions: [focusLastValue],
                },
            },
        },
    },
});
export function connectTabs(state, send) {
    var _a, _b;
    const ctx = state.context;
    const attrs = tabsAnatomy.getPartAttrs;
    const firstEnabledValue = ctx.itemOrder.find((value) => !ctx.disabledValues.includes(value));
    const tabStopValue = (_b = (_a = ctx.focusedValue) !== null && _a !== void 0 ? _a : ctx.value) !== null && _b !== void 0 ? _b : firstEnabledValue;
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { 'data-orientation': ctx.orientation, 'data-disabled': ctx.disabled ? '' : undefined, dir: 'ltr' });
        },
        getListProps() {
            return Object.assign(Object.assign({}, attrs('list')), { role: 'tablist', 'aria-orientation': ctx.orientation, 'data-orientation': ctx.orientation });
        },
        getTriggerProps(props) {
            const isSelected = ctx.value === props.value;
            const isDisabled = ctx.disabled || props.disabled;
            const isTabStop = tabStopValue === props.value;
            return Object.assign(Object.assign({}, attrs('trigger')), { role: 'tab', type: 'button', id: `tabs:${ctx.value !== '' ? '' : ''}trigger:${props.value}`, tabIndex: isTabStop ? 0 : -1, 'aria-selected': isSelected, 'aria-controls': `tabs:content:${props.value}`, 'data-state': isSelected ? 'active' : 'inactive', 'data-orientation': ctx.orientation, 'data-value': props.value, 'data-disabled': isDisabled ? '' : undefined, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SELECT', value: props.value });
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
                    const isHorizontal = ctx.orientation === 'horizontal';
                    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
                    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
                    switch (event.key) {
                        case nextKey:
                            event.preventDefault();
                            send({ type: 'FOCUS_NEXT' });
                            break;
                        case prevKey:
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
                            if (ctx.activationMode === 'manual') {
                                event.preventDefault();
                                send({ type: 'SELECT', value: props.value });
                            }
                            break;
                    }
                } });
        },
        getContentProps(props) {
            const isSelected = ctx.value === props.value;
            return Object.assign(Object.assign({}, attrs('content')), { role: 'tabpanel', id: `tabs:content:${props.value}`, 'aria-labelledby': `tabs:trigger:${props.value}`, 'data-state': isSelected ? 'active' : 'inactive', 'data-orientation': ctx.orientation, hidden: !isSelected, tabIndex: 0 });
        },
        getIndicatorProps() {
            return Object.assign(Object.assign({}, attrs('indicator')), { 'data-orientation': ctx.orientation, 'data-value': ctx.value });
        },
    };
}
