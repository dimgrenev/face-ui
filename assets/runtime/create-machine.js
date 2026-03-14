/**
 * @face-ui/core — State Machine Runtime
 *
 * Framework-agnostic finite state machine.
 * ~330 LOC, zero dependencies.
 *
 * Features:
 * - Typed states, events, context via Schema generic
 * - Entry/exit actions per state
 * - Guards on transitions
 * - Effects (side-effects with cleanup, like useEffect)
 * - Computed values (derived from context)
 * - Watch (react to context changes)
 * - Subscribe for external listeners (React adapter uses this)
 */
// ---------------------------------------------------------------------------
// Guard combinators
// ---------------------------------------------------------------------------
export function and(...guards) {
    return (ctx, event) => guards.every((g) => g(ctx, event));
}
export function or(...guards) {
    return (ctx, event) => guards.some((g) => g(ctx, event));
}
export function not(guard) {
    return (ctx, event) => !guard(ctx, event);
}
// ---------------------------------------------------------------------------
// createMachine — returns a config object (not a running service)
// ---------------------------------------------------------------------------
export function createMachine(config) {
    return config;
}
function isPlainObject(value) {
    if (value == null || typeof value !== 'object')
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
export function areContextValuesEqual(left, right) {
    if (Object.is(left, right))
        return true;
    if (left instanceof Date && right instanceof Date) {
        return left.getTime() === right.getTime();
    }
    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length)
            return false;
        for (let index = 0; index < left.length; index += 1) {
            if (!areContextValuesEqual(left[index], right[index]))
                return false;
        }
        return true;
    }
    if (isPlainObject(left) && isPlainObject(right)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length)
            return false;
        for (const key of leftKeys) {
            if (!(key in right))
                return false;
            if (!areContextValuesEqual(left[key], right[key]))
                return false;
        }
        return true;
    }
    return false;
}
// ---------------------------------------------------------------------------
// interpret — starts a machine, returns a running service
// ---------------------------------------------------------------------------
export function interpret(config, overrides) {
    // -- Mutable state ---------------------------------------------------------
    let currentState = config.initial;
    let ctx = Object.assign(Object.assign({}, config.context), overrides);
    let running = false;
    const listeners = new Set();
    let effectCleanups = [];
    let cachedSnapshot = null;
    // -- Helpers ---------------------------------------------------------------
    const matches = (...states) => states.includes(currentState);
    const hasTag = (tag) => {
        var _a, _b;
        const node = config.states[currentState];
        return (_b = (_a = node === null || node === void 0 ? void 0 : node.tags) === null || _a === void 0 ? void 0 : _a.includes(tag)) !== null && _b !== void 0 ? _b : false;
    };
    const computeAll = () => {
        const result = {};
        if (config.computed) {
            for (const [key, fn] of Object.entries(config.computed)) {
                result[key] = fn(ctx, { matches, hasTag });
            }
        }
        return result;
    };
    const buildSnapshot = () => {
        var _a;
        const node = config.states[currentState];
        return {
            value: currentState,
            context: ctx,
            tags: new Set((_a = node === null || node === void 0 ? void 0 : node.tags) !== null && _a !== void 0 ? _a : []),
            computed: computeAll(),
            matches,
            hasTag,
        };
    };
    /** Invalidate cached snapshot — next getSnapshot() will rebuild. */
    const invalidateSnapshot = () => {
        cachedSnapshot = buildSnapshot();
    };
    const notify = () => {
        invalidateSnapshot();
        for (const listener of listeners) {
            listener(cachedSnapshot);
        }
    };
    const resolveAction = (nameOrFn) => {
        var _a, _b;
        if (typeof nameOrFn === 'function')
            return nameOrFn;
        return (_b = (_a = config.implementations) === null || _a === void 0 ? void 0 : _a.actions) === null || _b === void 0 ? void 0 : _b[nameOrFn];
    };
    const runActions = (actions, event) => {
        if (!actions)
            return;
        for (const a of actions) {
            const fn = resolveAction(a);
            fn === null || fn === void 0 ? void 0 : fn(ctx, event);
        }
    };
    const cleanupEffects = () => {
        for (const cleanup of effectCleanups) {
            cleanup();
        }
        effectCleanups = [];
    };
    const runEffects = () => {
        var _a, _b;
        const node = config.states[currentState];
        if (!(node === null || node === void 0 ? void 0 : node.effects))
            return;
        for (const name of node.effects) {
            const effectFn = (_b = (_a = config.implementations) === null || _a === void 0 ? void 0 : _a.effects) === null || _b === void 0 ? void 0 : _b[name];
            if (effectFn) {
                const cleanup = effectFn(ctx, send);
                if (typeof cleanup === 'function') {
                    effectCleanups.push(cleanup);
                }
            }
        }
    };
    const runWatch = (prevCtx) => {
        if (!config.watch)
            return;
        for (const [key, watchFn] of Object.entries(config.watch)) {
            if (watchFn && ctx[key] !== prevCtx[key]) {
                watchFn(ctx, prevCtx[key]);
            }
        }
    };
    const transition = (event) => {
        const stateNode = config.states[currentState];
        if (!(stateNode === null || stateNode === void 0 ? void 0 : stateNode.on))
            return false;
        const handler = stateNode.on[event.type];
        if (handler == null)
            return false;
        // Resolve handler to a single transition config
        let resolved;
        if (typeof handler === 'string') {
            // Simple target: 'otherState'
            resolved = { target: handler };
        }
        else if (Array.isArray(handler)) {
            // Array of guarded transitions — pick first matching
            for (const t of handler) {
                if (!t.guard || t.guard(ctx, event)) {
                    resolved = t;
                    break;
                }
            }
        }
        else if ('actions' in handler && !('target' in handler) && !('guard' in handler)) {
            // Action-only: { actions: [...] }
            const actionOnly = handler;
            resolved = { actions: actionOnly.actions };
        }
        else {
            // Single transition config
            const single = handler;
            if (!single.guard || single.guard(ctx, event)) {
                resolved = single;
            }
        }
        if (!resolved)
            return false;
        const prevCtx = Object.assign({}, ctx);
        const prevState = currentState;
        // Run actions (before state change if no target, or as part of transition)
        if (resolved.actions) {
            runActions(resolved.actions, event);
        }
        // State change
        if (resolved.target && resolved.target !== currentState) {
            // Exit current state
            cleanupEffects();
            const exitNode = config.states[prevState];
            runActions(exitNode === null || exitNode === void 0 ? void 0 : exitNode.exit, event);
            // Enter new state
            currentState = resolved.target;
            const enterNode = config.states[currentState];
            runActions(enterNode === null || enterNode === void 0 ? void 0 : enterNode.entry, event);
            // Start effects of new state
            runEffects();
        }
        // Watch for context changes
        runWatch(prevCtx);
        // Notify subscribers
        notify();
        return true;
    };
    const syncContext = (patch) => {
        if (!running)
            return;
        const prevCtx = Object.assign({}, ctx);
        let changed = false;
        let shouldNotify = false;
        for (const [key, value] of Object.entries(patch)) {
            if (value === undefined)
                continue;
            const currentValue = ctx[key];
            if (areContextValuesEqual(currentValue, value))
                continue;
            ctx[key] = value;
            changed = true;
            if (typeof currentValue !== 'function' || typeof value !== 'function') {
                shouldNotify = true;
            }
        }
        if (!changed)
            return;
        if (!shouldNotify)
            return;
        runWatch(prevCtx);
        notify();
    };
    // -- Public API ------------------------------------------------------------
    const send = (event) => {
        if (!running)
            return;
        const normalized = typeof event === 'string' ? { type: event } : event;
        transition(normalized);
    };
    const service = {
        send,
        syncContext,
        getSnapshot: () => {
            if (!cachedSnapshot)
                cachedSnapshot = buildSnapshot();
            return cachedSnapshot;
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start: () => {
            if (running)
                return service;
            running = true;
            // Run entry actions of initial state
            const initialNode = config.states[currentState];
            const dummyEvent = { type: '__init__' };
            runActions(initialNode === null || initialNode === void 0 ? void 0 : initialNode.entry, dummyEvent);
            // Start effects of initial state
            runEffects();
            // Initial notification
            notify();
            return service;
        },
        stop: () => {
            running = false;
            cleanupEffects();
            listeners.clear();
        },
    };
    return service;
}
