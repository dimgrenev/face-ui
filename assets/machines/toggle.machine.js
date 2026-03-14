/**
 * Toggle Machine — Unified Toggle + ToggleGroup
 *
 * States: idle, focused
 * Items-based: value is string[] (selected item values).
 * type='single': at most one item selected (toggle on/off).
 * type='multiple': each item toggles independently.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const toggleAnatomy = createAnatomy('toggle').parts('root', 'item');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
function toggleValue(ctx, itemValue) {
    if (ctx.type === 'single') {
        // Single mode: toggle off if already selected, otherwise select this one
        return ctx.value.includes(itemValue) ? [] : [itemValue];
    }
    // Multiple mode: toggle individual item
    return ctx.value.includes(itemValue)
        ? ctx.value.filter((v) => v !== itemValue)
        : [...ctx.value, itemValue];
}
export const toggleMachine = createMachine({
    id: 'toggle',
    initial: 'idle',
    context: {
        value: [],
        type: 'multiple',
        disabled: false,
        orientation: 'horizontal',
    },
    watch: {
        value(ctx) {
            var _a;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
        },
    },
    states: {
        idle: {
            on: {
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const itemValue = e.value;
                                ctx.value = toggleValue(ctx, itemValue);
                            },
                        ],
                    },
                ],
                FOCUS: {
                    target: 'focused',
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
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const itemValue = e.value;
                                ctx.value = toggleValue(ctx, itemValue);
                            },
                        ],
                    },
                ],
                BLUR: {
                    target: 'idle',
                },
                FOCUS_NEXT: {
                    actions: [],
                },
                FOCUS_PREV: {
                    actions: [],
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
export function connectToggle(state, send) {
    const { value, disabled, orientation, type } = state.context;
    const isFocused = state.matches('focused');
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, toggleAnatomy.getPartAttrs('root')), { role: 'group', 'aria-orientation': orientation, 'data-orientation': orientation, 'data-disabled': disabled || undefined, 'data-focus': isFocused || undefined, 'data-type': type });
        },
        getItemProps(props) {
            const itemDisabled = disabled || props.disabled;
            const isPressed = value.includes(props.value);
            return Object.assign(Object.assign({}, toggleAnatomy.getPartAttrs('item')), { role: type === 'single' ? 'radio' : 'checkbox', 'aria-checked': isPressed, 'aria-pressed': isPressed, 'aria-disabled': itemDisabled || undefined, 'data-state': isPressed ? 'on' : 'off', 'data-disabled': itemDisabled || undefined, 'data-orientation': orientation, tabIndex: itemDisabled ? -1 : 0, onClick() {
                    if (!itemDisabled) {
                        send({ type: 'TOGGLE', value: props.value });
                    }
                },
                onFocus() {
                    send({ type: 'FOCUS' });
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
                    else if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        send({ type: 'TOGGLE', value: props.value });
                    }
                } });
        },
    };
}
