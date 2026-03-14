/**
 * @face-ui/core — Steps Machine
 *
 * Framework-agnostic FSM for step-by-step / wizard navigation.
 * Supports linear (no skipping) and non-linear modes, step completion tracking,
 * and progress percentage computation.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const stepsAnatomy = createAnatomy('steps').parts('root', 'item', 'trigger', 'content', 'indicator', 'separator');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clampStep(step, total) {
    return Math.max(0, Math.min(step, total - 1));
}
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
const canSetStep = (ctx, event) => {
    if (ctx.disabled)
        return false;
    const e = event;
    const target = e.step;
    if (!ctx.linear)
        return true;
    // In linear mode, can only move to adjacent steps or completed steps
    // Can go back freely, but can only go forward one step at a time
    // or to a previously completed step
    if (target <= ctx.step)
        return true;
    if (target === ctx.step + 1)
        return true;
    return ctx.completed.includes(target);
};
const canGoNext = (ctx) => {
    if (ctx.disabled)
        return false;
    return ctx.step < ctx.total - 1;
};
const canGoPrev = (ctx) => {
    if (ctx.disabled)
        return false;
    return ctx.step > 0;
};
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const setStep = (ctx, event) => {
    const e = event;
    ctx.step = clampStep(e.step, ctx.total);
};
const goNext = (ctx) => {
    ctx.step = clampStep(ctx.step + 1, ctx.total);
};
const goPrev = (ctx) => {
    ctx.step = clampStep(ctx.step - 1, ctx.total);
};
const completeStep = (ctx, event) => {
    const e = event;
    const stepIndex = e.step;
    if (!ctx.completed.includes(stepIndex)) {
        ctx.completed = [...ctx.completed, stepIndex];
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const stepsMachine = createMachine({
    id: 'steps',
    initial: 'idle',
    context: {
        step: 0,
        total: 0,
        completed: [],
        linear: true,
        disabled: false,
        onStepChange: null,
    },
    computed: {
        isFirst: (ctx) => ctx.step === 0,
        isLast: (ctx) => ctx.step === ctx.total - 1,
        canGoNext: (ctx) => ctx.step < ctx.total - 1,
        canGoPrev: (ctx) => ctx.step > 0,
        progress: (ctx) => ctx.total > 0 ? Math.round((ctx.completed.length / ctx.total) * 100) : 0,
    },
    watch: {
        step: (ctx) => {
            var _a;
            (_a = ctx.onStepChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { step: ctx.step });
        },
    },
    states: {
        idle: {
            on: {
                SET_STEP: [
                    {
                        guard: canSetStep,
                        actions: [setStep],
                    },
                ],
                NEXT: {
                    guard: canGoNext,
                    actions: [goNext],
                },
                PREV: {
                    guard: canGoPrev,
                    actions: [goPrev],
                },
                COMPLETE: {
                    guard: isNotDisabled,
                    actions: [completeStep],
                },
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------
export function connectSteps(state, send) {
    const ctx = state.context;
    const computed = state.computed;
    const attrs = stepsAnatomy.getPartAttrs;
    const isFirst = computed.isFirst;
    const isLast = computed.isLast;
    const canNext = computed.canGoNext;
    const canPrev = computed.canGoPrev;
    const progress = computed.progress;
    function getStepState(index) {
        if (index === ctx.step)
            return 'active';
        if (index < ctx.step)
            return 'completed';
        if (ctx.completed.includes(index))
            return 'completed';
        return 'upcoming';
    }
    return {
        /** Current step index (0-based) */
        step: ctx.step,
        /** Whether current step is the first */
        isFirst,
        /** Whether current step is the last */
        isLast,
        /** Whether the user can navigate forward */
        canGoNext: canNext,
        /** Whether the user can navigate backward */
        canGoPrev: canPrev,
        /** Completion progress as a percentage (0-100) */
        progress,
        /** Set of completed step indices */
        completed: ctx.completed,
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { 'data-orientation': 'horizontal', 'data-disabled': ctx.disabled ? '' : undefined, 'aria-label': 'Steps' });
        },
        getItemProps(index) {
            const stepState = getStepState(index);
            return Object.assign(Object.assign({}, attrs('item')), { 'data-state': stepState, 'data-index': index, 'data-disabled': ctx.disabled ? '' : undefined });
        },
        getTriggerProps(index) {
            const stepState = getStepState(index);
            const isDisabled = ctx.disabled || (ctx.linear && index > ctx.step + 1 && !ctx.completed.includes(index));
            return Object.assign(Object.assign({}, attrs('trigger')), { role: 'button', type: 'button', 'aria-current': index === ctx.step ? 'step' : undefined, 'data-state': stepState, 'data-index': index, 'data-disabled': isDisabled ? '' : undefined, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SET_STEP', step: index });
                    }
                } });
        },
        getContentProps(index) {
            const isCurrent = ctx.step === index;
            return Object.assign(Object.assign({}, attrs('content')), { 'data-state': getStepState(index), 'data-index': index, hidden: !isCurrent });
        },
        getIndicatorProps(index) {
            const stepState = getStepState(index);
            return Object.assign(Object.assign({}, attrs('indicator')), { 'data-state': stepState, 'data-index': index });
        },
        getSeparatorProps(index) {
            // Separator between step[index] and step[index+1]
            const isCompleted = index < ctx.step || ctx.completed.includes(index);
            return Object.assign(Object.assign({}, attrs('separator')), { 'data-state': isCompleted ? 'completed' : 'incomplete', 'data-index': index, 'aria-hidden': true });
        },
    };
}
