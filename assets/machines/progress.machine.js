/**
 * @face-ui/core — Progress Machine
 *
 * Pure-computed FSM for progress indicators (linear, circular, etc.).
 * Single state (idle) — all interesting values are derived via computed.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const progressAnatomy = createAnatomy('progress').parts('root', 'track', 'indicator', 'label');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const progressMachine = createMachine({
    id: 'progress',
    initial: 'idle',
    context: {
        value: 0,
        max: 100,
        onValueChange: null,
    },
    states: {
        idle: {
            on: {
                SET_VALUE: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.value = e.value;
                        },
                    ],
                },
                SET_MAX: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.max = Math.max(e.max, 0);
                        },
                    ],
                },
            },
        },
    },
    computed: {
        percent: (ctx) => {
            if (ctx.value < 0)
                return 0;
            const clamped = Math.min(Math.max(ctx.value / ctx.max, 0), 1);
            return clamped * 100;
        },
        isIndeterminate: (ctx) => ctx.value < 0,
        isComplete: (ctx) => ctx.value >= ctx.max,
    },
    watch: {
        value: (ctx) => {
            var _a;
            const percent = Math.min(Math.max(ctx.value / ctx.max, 0), 1) * 100;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value, percent });
        },
    },
});
export function connectProgress(state, send) {
    const { context: ctx, computed } = state;
    const percent = computed['percent'];
    const isIndeterminate = computed['isIndeterminate'];
    const dataState = isIndeterminate
        ? 'indeterminate'
        : computed['isComplete']
            ? 'complete'
            : 'loading';
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, progressAnatomy.getPartAttrs('root')), { role: 'progressbar', 'aria-valuenow': isIndeterminate ? undefined : ctx.value, 'aria-valuemin': 0, 'aria-valuemax': ctx.max, 'aria-valuetext': isIndeterminate
                    ? undefined
                    : `${Math.round(percent)}%`, 'data-state': dataState });
        },
        getTrackProps() {
            return Object.assign(Object.assign({}, progressAnatomy.getPartAttrs('track')), { 'data-state': dataState });
        },
        getIndicatorProps() {
            return Object.assign(Object.assign({}, progressAnatomy.getPartAttrs('indicator')), { 'data-state': dataState, style: {
                    width: isIndeterminate ? 'var(--progress-indeterminate-width, 50%)' : `${percent}%`,
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, progressAnatomy.getPartAttrs('label')), { 'data-state': dataState });
        },
        /** Imperative helpers */
        setValue(value) {
            send({ type: 'SET_VALUE', value });
        },
        setMax(max) {
            send({ type: 'SET_MAX', max });
        },
        /** Computed accessors */
        percent,
        isIndeterminate,
        isComplete: computed['isComplete'],
    };
}
