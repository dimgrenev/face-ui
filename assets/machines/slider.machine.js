/**
 * Slider Machine
 *
 * States: idle, focused, dragging
 * Multi-thumb support: value is always number[].
 * Single thumb = [50], range = [20, 80].
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const sliderAnatomy = createAnatomy('slider').parts('root', 'track', 'range', 'thumb', 'label');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clampValue(val, min, max, step) {
    const stepped = Math.round((val - min) / step) * step + min;
    return Math.min(max, Math.max(min, stepped));
}
function updateThumbValue(ctx, index, newValue) {
    const clamped = clampValue(newValue, ctx.min, ctx.max, ctx.step);
    const values = [...ctx.value];
    values[index] = clamped;
    // Ensure thumbs don't cross each other
    if (index > 0 && values[index] < values[index - 1]) {
        values[index] = values[index - 1];
    }
    if (index < values.length - 1 && values[index] > values[index + 1]) {
        values[index] = values[index + 1];
    }
    return values;
}
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const sliderMachine = createMachine({
    id: 'slider',
    initial: 'idle',
    context: {
        value: [0],
        min: 0,
        max: 100,
        step: 1,
        disabled: false,
        orientation: 'horizontal',
        activeThumbIndex: 0,
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
                FOCUS: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'focused',
                        actions: [
                            (ctx, e) => {
                                ctx.activeThumbIndex = e.index;
                            },
                        ],
                    },
                ],
                DRAG_START: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'dragging',
                        actions: [
                            (ctx, e) => {
                                ctx.activeThumbIndex = e.index;
                            },
                        ],
                    },
                ],
                SET_VALUE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
            },
        },
        focused: {
            on: {
                BLUR: {
                    target: 'idle',
                },
                DRAG_START: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'dragging',
                        actions: [
                            (ctx, e) => {
                                ctx.activeThumbIndex = e.index;
                            },
                        ],
                    },
                ],
                INCREMENT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const index = e.index;
                                ctx.value = updateThumbValue(ctx, index, ctx.value[index] + ctx.step);
                            },
                        ],
                    },
                ],
                DECREMENT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const index = e.index;
                                ctx.value = updateThumbValue(ctx, index, ctx.value[index] - ctx.step);
                            },
                        ],
                    },
                ],
                SET_VALUE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
            },
        },
        dragging: {
            on: {
                DRAG: {
                    actions: [
                        (ctx, e) => {
                            const newValue = e.value;
                            ctx.value = updateThumbValue(ctx, ctx.activeThumbIndex, newValue);
                        },
                    ],
                },
                DRAG_END: {
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
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectSlider(state, send) {
    const { value, min, max, step, disabled, orientation, activeThumbIndex } = state.context;
    const isDragging = state.matches('dragging');
    const isFocused = state.matches('focused');
    const isHorizontal = orientation === 'horizontal';
    // Calculate range percentage
    const getPercent = (val) => ((val - min) / (max - min)) * 100;
    const rangeStart = value.length > 1 ? getPercent(value[0]) : 0;
    const rangeEnd = getPercent(value[value.length - 1]);
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, sliderAnatomy.getPartAttrs('root')), { 'data-orientation': orientation, 'data-disabled': disabled || undefined, 'data-dragging': isDragging || undefined, 'data-focus': isFocused || undefined });
        },
        getTrackProps() {
            return Object.assign(Object.assign({}, sliderAnatomy.getPartAttrs('track')), { 'data-orientation': orientation, 'data-disabled': disabled || undefined });
        },
        getRangeProps() {
            const rangeStyle = isHorizontal
                ? { left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }
                : { bottom: `${rangeStart}%`, height: `${rangeEnd - rangeStart}%` };
            return Object.assign(Object.assign({}, sliderAnatomy.getPartAttrs('range')), { 'data-orientation': orientation, 'data-disabled': disabled || undefined, 'data-dragging': isDragging || undefined, style: rangeStyle });
        },
        getThumbProps(index) {
            var _a;
            const thumbValue = (_a = value[index]) !== null && _a !== void 0 ? _a : min;
            const percent = getPercent(thumbValue);
            const isActive = activeThumbIndex === index;
            const thumbStyle = isHorizontal
                ? { left: `${percent}%` }
                : { bottom: `${percent}%` };
            return Object.assign(Object.assign({}, sliderAnatomy.getPartAttrs('thumb')), { role: 'slider', tabIndex: disabled ? -1 : 0, 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': thumbValue, 'aria-orientation': orientation, 'aria-disabled': disabled || undefined, 'data-index': index, 'data-orientation': orientation, 'data-disabled': disabled || undefined, 'data-dragging': (isDragging && isActive) || undefined, 'data-focus': (isFocused && isActive) || undefined, style: thumbStyle, onFocus() {
                    send({ type: 'FOCUS', index });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
                onPointerDown() {
                    send({ type: 'DRAG_START', index });
                },
                onKeyDown(event) {
                    if (disabled)
                        return;
                    const incrementKey = isHorizontal ? 'ArrowRight' : 'ArrowUp';
                    const decrementKey = isHorizontal ? 'ArrowLeft' : 'ArrowDown';
                    switch (event.key) {
                        case incrementKey:
                            event.preventDefault();
                            send({ type: 'INCREMENT', index });
                            break;
                        case decrementKey:
                            event.preventDefault();
                            send({ type: 'DECREMENT', index });
                            break;
                        case 'Home':
                            event.preventDefault();
                            send({
                                type: 'SET_VALUE',
                                value: value.map((v, i) => (i === index ? min : v)),
                            });
                            break;
                        case 'End':
                            event.preventDefault();
                            send({
                                type: 'SET_VALUE',
                                value: value.map((v, i) => (i === index ? max : v)),
                            });
                            break;
                    }
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, sliderAnatomy.getPartAttrs('label')), { 'data-orientation': orientation, 'data-disabled': disabled || undefined });
        },
    };
}
