/**
 * Rating Machine
 *
 * States: idle, hovering
 * Supports half-star ratings via allowHalf.
 * hoveredIndex tracks which star is being hovered.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const ratingAnatomy = createAnatomy('rating').parts('root', 'item', 'label');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const ratingMachine = createMachine({
    id: 'rating',
    initial: 'idle',
    context: {
        value: 0,
        max: 5,
        disabled: false,
        allowHalf: false,
        hoveredIndex: -1,
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
                HOVER: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'hovering',
                        actions: [
                            (ctx, e) => {
                                ctx.hoveredIndex = e.index;
                            },
                        ],
                    },
                ],
                SELECT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const index = e.index;
                                // Toggle off if clicking the same value
                                ctx.value = ctx.value === index ? 0 : index;
                            },
                        ],
                    },
                ],
                SET_VALUE: {
                    actions: [
                        (ctx, e) => {
                            ctx.value = e.value;
                        },
                    ],
                },
            },
        },
        hovering: {
            on: {
                HOVER: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                ctx.hoveredIndex = e.index;
                            },
                        ],
                    },
                ],
                LEAVE: {
                    target: 'idle',
                    actions: [
                        (ctx) => {
                            ctx.hoveredIndex = -1;
                        },
                    ],
                },
                SELECT: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        actions: [
                            (ctx, e) => {
                                const index = e.index;
                                ctx.value = ctx.value === index ? 0 : index;
                            },
                        ],
                    },
                ],
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
export function connectRating(state, send) {
    const { value, max, disabled, allowHalf, hoveredIndex } = state.context;
    const isHovering = state.matches('hovering');
    const displayValue = isHovering && hoveredIndex >= 0 ? hoveredIndex : value;
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, ratingAnatomy.getPartAttrs('root')), { role: 'radiogroup', 'aria-label': 'Rating', 'data-disabled': disabled || undefined, 'data-hovering': isHovering || undefined, onMouseLeave() {
                    send({ type: 'LEAVE' });
                } });
        },
        getItemProps(index) {
            // index is 1-based (1 = first star, max = last star)
            const isHighlighted = index <= displayValue;
            const isHalf = allowHalf && index - 0.5 === displayValue;
            const isSelected = index === value;
            return Object.assign(Object.assign({}, ratingAnatomy.getPartAttrs('item')), { role: 'radio', 'aria-checked': isSelected, 'aria-disabled': disabled || undefined, 'aria-label': `${index} star${index !== 1 ? 's' : ''}`, 'data-index': index, 'data-highlighted': isHighlighted || undefined, 'data-half': isHalf || undefined, 'data-disabled': disabled || undefined, tabIndex: disabled ? -1 : isSelected || (value === 0 && index === 1) ? 0 : -1, onMouseEnter() {
                    send({ type: 'HOVER', index });
                },
                onClick() {
                    send({ type: 'SELECT', index });
                },
                onKeyDown(event) {
                    if (disabled)
                        return;
                    switch (event.key) {
                        case 'ArrowRight':
                        case 'ArrowUp': {
                            event.preventDefault();
                            const step = allowHalf ? 0.5 : 1;
                            const next = Math.min(max, (value || 0) + step);
                            send({ type: 'SET_VALUE', value: next });
                            break;
                        }
                        case 'ArrowLeft':
                        case 'ArrowDown': {
                            event.preventDefault();
                            const step = allowHalf ? 0.5 : 1;
                            const prev = Math.max(0, (value || 0) - step);
                            send({ type: 'SET_VALUE', value: prev });
                            break;
                        }
                        case 'Home':
                            event.preventDefault();
                            send({ type: 'SET_VALUE', value: 0 });
                            break;
                        case 'End':
                            event.preventDefault();
                            send({ type: 'SET_VALUE', value: max });
                            break;
                    }
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, ratingAnatomy.getPartAttrs('label')), { 'data-disabled': disabled || undefined });
        },
    };
}
