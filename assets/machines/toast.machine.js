/**
 * @face-ui/core — Toast Machine
 *
 * Manages a queue of toast notifications with auto-remove timers.
 *
 * Also exports a standalone `createToaster()` function that provides
 * an imperative API: toast(opts), dismiss(id).
 */
import { createMachine, interpret } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const toastAnatomy = createAnatomy('toast').parts('root', 'title', 'description', 'action', 'close');
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const addToast = (ctx, event) => {
    const { toast } = event;
    const item = Object.assign(Object.assign({}, toast), { createdAt: Date.now() });
    ctx.toasts = [...ctx.toasts, item];
    // Trim to maxVisible (remove oldest beyond limit)
    if (ctx.toasts.length > ctx.maxVisible) {
        const removed = ctx.toasts.slice(0, ctx.toasts.length - ctx.maxVisible);
        ctx.toasts = ctx.toasts.slice(ctx.toasts.length - ctx.maxVisible);
        // Clear timers for removed toasts
        for (const r of removed) {
            const timer = ctx._timerMap.get(r.id);
            if (timer !== undefined) {
                clearTimeout(timer);
                ctx._timerMap.delete(r.id);
            }
        }
    }
};
const removeToast = (ctx, event) => {
    const { id } = event;
    ctx.toasts = ctx.toasts.filter((t) => t.id !== id);
    const timer = ctx._timerMap.get(id);
    if (timer !== undefined) {
        clearTimeout(timer);
        ctx._timerMap.delete(id);
    }
};
const pauseToast = (ctx, event) => {
    const { id } = event;
    const timer = ctx._timerMap.get(id);
    if (timer !== undefined) {
        clearTimeout(timer);
        ctx._timerMap.delete(id);
    }
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const toastMachine = createMachine({
    id: 'toast',
    initial: 'idle',
    context: {
        toasts: [],
        maxVisible: 3,
        defaultDuration: 5000,
        _timerMap: new Map(),
        onToastsChange: null,
    },
    computed: {
        count: (ctx) => ctx.toasts.length,
        visibleToasts: (ctx) => ctx.toasts.slice(-ctx.maxVisible),
        hasToasts: (ctx) => ctx.toasts.length > 0,
    },
    watch: {
        toasts: (ctx) => {
            var _a;
            (_a = ctx.onToastsChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { toasts: ctx.toasts });
        },
    },
    states: {
        idle: {
            on: {
                ADD: {
                    target: 'active',
                    actions: [addToast],
                },
            },
        },
        active: {
            effects: ['autoRemoveTimers'],
            on: {
                ADD: {
                    actions: [addToast],
                },
                REMOVE: [
                    {
                        target: 'idle',
                        actions: [removeToast],
                        guard: (ctx, event) => {
                            const { id } = event;
                            // Will become idle if this is the last toast
                            return ctx.toasts.length === 1 && ctx.toasts[0].id === id;
                        },
                    },
                    {
                        actions: [removeToast],
                    },
                ],
                PAUSE: {
                    actions: [pauseToast],
                },
                RESUME: {
                // Resume triggers the autoRemoveTimers effect to restart
                // by causing a re-evaluation. The effect itself sets up timers
                // for toasts that don't have active timers.
                },
            },
        },
    },
    implementations: {
        effects: {
            autoRemoveTimers: (ctx, send) => {
                var _a;
                // Set up auto-remove timers for all toasts that don't have one
                for (const toast of ctx.toasts) {
                    if (ctx._timerMap.has(toast.id))
                        continue;
                    const duration = (_a = toast.duration) !== null && _a !== void 0 ? _a : ctx.defaultDuration;
                    if (duration <= 0)
                        continue;
                    const elapsed = Date.now() - toast.createdAt;
                    const remaining = Math.max(0, duration - elapsed);
                    const timer = setTimeout(() => {
                        ctx._timerMap.delete(toast.id);
                        send({ type: 'REMOVE', id: toast.id });
                    }, remaining);
                    ctx._timerMap.set(toast.id, timer);
                }
                return () => {
                    // Clean up all timers on exit
                    for (const [id, timer] of ctx._timerMap) {
                        clearTimeout(timer);
                        ctx._timerMap.delete(id);
                    }
                };
            },
        },
    },
});
export function connectToast(state, send) {
    const { context: ctx, computed } = state;
    const visibleToasts = computed['visibleToasts'];
    const attrs = toastAnatomy.getPartAttrs;
    return {
        getGroupProps() {
            return Object.assign(Object.assign({}, attrs('root')), { role: 'region', 'aria-label': 'Notifications', 'aria-live': 'polite', 'data-count': ctx.toasts.length });
        },
        getToastProps(toast) {
            return Object.assign(Object.assign({}, attrs('root')), { role: 'status', 'aria-atomic': true, 'data-state': 'active', 'data-variant': toast.variant, 'data-toast-id': toast.id, onPointerEnter() {
                    send({ type: 'PAUSE', id: toast.id });
                },
                onPointerLeave() {
                    send({ type: 'RESUME', id: toast.id });
                } });
        },
        getTitleProps() {
            return Object.assign({}, attrs('title'));
        },
        getDescriptionProps() {
            return Object.assign({}, attrs('description'));
        },
        getActionProps() {
            return Object.assign(Object.assign({}, attrs('action')), { type: 'button' });
        },
        getCloseProps(id) {
            return Object.assign(Object.assign({}, attrs('close')), { type: 'button', 'aria-label': 'Close notification', onClick() {
                    send({ type: 'REMOVE', id });
                } });
        },
        /** Visible toasts (respects maxVisible) */
        visibleToasts,
    };
}
// ---------------------------------------------------------------------------
// Standalone Toaster
// ---------------------------------------------------------------------------
let toasterCounter = 0;
export function createToaster(options) {
    var _a, _b;
    const overrides = {
        maxVisible: (_a = options === null || options === void 0 ? void 0 : options.maxVisible) !== null && _a !== void 0 ? _a : 3,
        defaultDuration: (_b = options === null || options === void 0 ? void 0 : options.defaultDuration) !== null && _b !== void 0 ? _b : 5000,
        _timerMap: new Map(),
    };
    const service = interpret(toastMachine, overrides).start();
    return {
        toast(opts) {
            var _a;
            toasterCounter += 1;
            const id = `toast-${toasterCounter}-${Date.now()}`;
            const toastItem = {
                id,
                title: opts.title,
                description: opts.description,
                action: opts.action,
                variant: (_a = opts.variant) !== null && _a !== void 0 ? _a : 'default',
                duration: opts.duration,
            };
            service.send({ type: 'ADD', toast: toastItem });
            return id;
        },
        dismiss(id) {
            service.send({ type: 'REMOVE', id });
        },
        subscribe: service.subscribe,
        getSnapshot: service.getSnapshot,
    };
}
