/**
 * React adapter — useMachine hook
 *
 * Connects a @face-ui/core machine to React via useSyncExternalStore.
 * Second argument is flat Partial<TSchema['context']> — no wrapping.
 */
import { useSyncExternalStore, useRef, useEffect, useMemo } from 'react';
import { interpret, areContextValuesEqual } from '../../create-machine';
export function useMachine(config, options) {
    const serviceRef = useRef(null);
    // Create service once
    if (serviceRef.current === null) {
        serviceRef.current = interpret(config, options);
        serviceRef.current.start();
    }
    const service = serviceRef.current;
    useEffect(() => {
        if (!options || !serviceRef.current)
            return;
        const svc = serviceRef.current;
        const current = svc.getSnapshot().context;
        const patch = {};
        let hasPatch = false;
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined)
                continue;
            if (areContextValuesEqual(current[key], value))
                continue;
            patch[key] = value;
            hasPatch = true;
        }
        if (!hasPatch)
            return;
        svc.syncContext(patch);
    }, [options, service]);
    // Subscribe via useSyncExternalStore
    const subscribe = useMemo(() => (cb) => service.subscribe(cb), [service]);
    const getSnapshot = useMemo(() => () => service.getSnapshot(), [service]);
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            var _a;
            (_a = serviceRef.current) === null || _a === void 0 ? void 0 : _a.stop();
            serviceRef.current = null;
        };
    }, []);
    return { state, send: service.send };
}
