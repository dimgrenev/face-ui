/**
 * Radio Machine (NOT "radio-group")
 *
 * States: idle, focused
 * Flat API: options are NOT in machine context (handled by React adapter).
 * Machine manages value selection and focus state only.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const radioAnatomy = createAnatomy('radio').parts('root', 'item', 'label', 'indicator');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const radioMachine = createMachine({
    id: 'radio',
    initial: 'idle',
    context: {
        value: null,
        focusedValue: null,
        itemOrder: [],
        disabledValues: [],
        disabled: false,
        orientation: 'vertical',
    },
    watch: {
        value(ctx) {
            var _a;
            if (ctx.value != null) {
                (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
            }
        },
    },
    states: {
        idle: {
            on: {
                SELECT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
                FOCUS: {
                    target: 'focused',
                    actions: [
                        (ctx, e) => {
                            ctx.focusedValue = e.value;
                        },
                    ],
                },
                SET_VALUE: {
                    actions: [
                        (ctx, e) => {
                            ctx.value = e.value;
                        },
                    ],
                },
            },
        },
        focused: {
            on: {
                SELECT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
                BLUR: {
                    target: 'idle',
                    actions: [
                        (ctx) => {
                            ctx.focusedValue = null;
                        },
                    ],
                },
                FOCUS_NEXT: {
                    actions: [
                        (ctx) => {
                            var _a;
                            const enabled = ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value));
                            if (enabled.length === 0)
                                return;
                            const current = (_a = ctx.focusedValue) !== null && _a !== void 0 ? _a : ctx.value;
                            const currentIndex = current ? enabled.indexOf(current) : -1;
                            const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % enabled.length;
                            const nextValue = enabled[nextIndex];
                            ctx.focusedValue = nextValue;
                            ctx.value = nextValue;
                        },
                    ],
                },
                FOCUS_PREV: {
                    actions: [
                        (ctx) => {
                            var _a;
                            const enabled = ctx.itemOrder.filter((value) => !ctx.disabledValues.includes(value));
                            if (enabled.length === 0)
                                return;
                            const current = (_a = ctx.focusedValue) !== null && _a !== void 0 ? _a : ctx.value;
                            const currentIndex = current ? enabled.indexOf(current) : -1;
                            const nextIndex = currentIndex < 0 ? enabled.length - 1 : (currentIndex - 1 + enabled.length) % enabled.length;
                            const nextValue = enabled[nextIndex];
                            ctx.focusedValue = nextValue;
                            ctx.value = nextValue;
                        },
                    ],
                },
                SET_VALUE: {
                    actions: [
                        (ctx, e) => {
                            ctx.value = e.value;
                        },
                    ],
                },
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectRadio(state, send) {
    var _a;
    const { value, focusedValue, itemOrder, disabledValues, disabled, orientation } = state.context;
    const isFocused = state.matches('focused');
    const firstEnabled = itemOrder.find((itemValue) => !disabledValues.includes(itemValue));
    const tabStopValue = (_a = focusedValue !== null && focusedValue !== void 0 ? focusedValue : value) !== null && _a !== void 0 ? _a : firstEnabled;
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, radioAnatomy.getPartAttrs('root')), { role: 'radiogroup', 'aria-orientation': orientation, 'data-orientation': orientation, 'data-disabled': disabled || undefined, 'data-focus': isFocused || undefined });
        },
        getItemProps(props) {
            const itemDisabled = disabled || props.disabled;
            const isSelected = value === props.value;
            const isTabStop = tabStopValue === props.value;
            return Object.assign(Object.assign({}, radioAnatomy.getPartAttrs('item')), { role: 'radio', 'aria-checked': isSelected, 'aria-disabled': itemDisabled || undefined, 'data-state': isSelected ? 'checked' : 'unchecked', 'data-disabled': itemDisabled || undefined, 'data-orientation': orientation, 'data-value': props.value, tabIndex: isTabStop ? 0 : -1, onClick() {
                    if (!itemDisabled) {
                        send({ type: 'SELECT', value: props.value });
                    }
                },
                onFocus() {
                    send({ type: 'FOCUS', value: props.value });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
                onKeyDown(event) {
                    if (itemDisabled)
                        return;
                    const isVertical = orientation === 'vertical';
                    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
                    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
                    if (event.key === nextKey) {
                        event.preventDefault();
                        send({ type: 'FOCUS_NEXT' });
                    }
                    else if (event.key === prevKey) {
                        event.preventDefault();
                        send({ type: 'FOCUS_PREV' });
                    }
                    else if (event.key === ' ') {
                        event.preventDefault();
                        send({ type: 'SELECT', value: props.value });
                    }
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, radioAnatomy.getPartAttrs('label')), { 'data-disabled': disabled || undefined, 'data-orientation': orientation });
        },
        getIndicatorProps() {
            return Object.assign(Object.assign({}, radioAnatomy.getPartAttrs('indicator')), { 'data-disabled': disabled || undefined });
        },
    };
}
