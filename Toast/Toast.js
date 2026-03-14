var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Toast — notification system.
 *
 * Exports:
 * - `createToastContext()` — factory returning a toaster + hook + component triple
 * - Default singleton: `useToast` hook + `Toaster` component
 *
 * Uses `createToaster()` from `@face-ui/core` which provides its own
 * subscribe/getSnapshot compatible with `useSyncExternalStore`.
 */
import { forwardRef, useRef, useSyncExternalStore, useCallback, useEffect } from 'react';
import { connectToast, createToaster } from '../assets/machines/toast.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Bar } from '../Bar/Bar';
import { Card } from '../Card/Card';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createToastContext(options) {
    const toaster = createToaster(options);
    function useToast() {
        return {
            toast: toaster.toast,
            dismiss: toaster.dismiss,
        };
    }
    const ToasterComponent = forwardRef(function Toaster(props, ref) {
        const { className } = props, rest = __rest(props
        // Subscribe to the toaster service snapshot
        , ["className"]);
        // Subscribe to the toaster service snapshot
        const subscribe = useCallback((cb) => {
            // toaster.subscribe gives us the snapshot, but useSyncExternalStore
            // wants a plain callback. Wrap it.
            return toaster.subscribe(cb);
        }, []);
        const getSnapshot = useCallback(() => toaster.getSnapshot(), []);
        const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
        const api = connectToast(state, (event) => {
            // Route events through the toaster's send by mapping to toast/dismiss
            if (typeof event === 'string')
                return;
            if (event.type === 'REMOVE') {
                toaster.dismiss(event.id);
            }
        });
        const visibleToasts = api.visibleToasts;
        return (_jsx("div", Object.assign({ ref: ref }, api.getGroupProps(), { className: cn('uf-toaster', className) }, rest, { children: visibleToasts.map((toast) => {
                var _a;
                return (_jsx(Card, Object.assign({}, api.getToastProps(toast), { className: cn('uf-toast'), children: _jsxs("div", { className: "uf-toast-body", children: [_jsxs(Bar, { className: "uf-toast-bar", children: [_jsx(Bar.LeftEllipsis, { children: toast.title ? (_jsx(Text, Object.assign({}, api.getTitleProps(), { as: "div", variant: "label", className: cn('uf-toast-title'), children: toast.title }))) : (_jsx("span", {})) }), _jsx(Bar.Right, { children: _jsx(Button, Object.assign({}, api.getCloseProps(toast.id), { icon: "close", iconOnly: true, variant: "ghost", fullWidth: false, className: cn('uf-toast-close') })) })] }), toast.description && (_jsx(Text, Object.assign({}, api.getDescriptionProps(), { as: "div", variant: "muted", className: cn('uf-toast-description'), children: toast.description }))), ((_a = toast.action) === null || _a === void 0 ? void 0 : _a.label) ? (_jsx("div", { className: "uf-toast-actionRow", children: _jsx(Button, Object.assign({}, api.getActionProps(), { text: toast.action.label, variant: "ghost", fullWidth: false, className: cn('uf-toast-action'), onClick: () => {
                                        var _a, _b;
                                        try {
                                            (_b = (_a = toast.action) === null || _a === void 0 ? void 0 : _a.onClick) === null || _b === void 0 ? void 0 : _b.call(_a);
                                        }
                                        finally {
                                            toaster.dismiss(toast.id);
                                        }
                                    } })) })) : null] }) }), toast.id));
            }) })));
    });
    return {
        toaster,
        useToast,
        Toaster: ToasterComponent,
    };
}
// ---------------------------------------------------------------------------
// Default singleton
// ---------------------------------------------------------------------------
const defaultContext = createToastContext();
/** Hook to show/dismiss toasts using the default toaster. */
export const useToast = defaultContext.useToast;
/** Renders visible toasts from the default toaster. */
export const Toaster = defaultContext.Toaster;
export const Toast = forwardRef(function Toast(props, ref) {
    const { className, showTrigger = true, autoShow = false } = props;
    const { toast } = defaultContext.useToast();
    // Show a sample toast only once after mount.
    // Avoid side effects during render (important for StrictMode and deterministic previews).
    const shownRef = useRef(false);
    useEffect(() => {
        if (!autoShow)
            return;
        if (shownRef.current)
            return;
        shownRef.current = true;
        const timer = window.setTimeout(() => {
            toast({ title: 'Notification', description: 'This is a toast message.' });
        }, 100);
        return () => window.clearTimeout(timer);
    }, [toast, autoShow]);
    const showSampleToast = useCallback(() => {
        toast({ title: 'Notification', description: 'This is a toast message.' });
    }, [toast]);
    return (_jsxs("div", { ref: ref, className: cn('uf-toast-demo', className), children: [showTrigger && (_jsx("div", { className: "uf-toast-demo-trigger", children: _jsx(Button, { text: "Show toast", variant: "default", align: "left", className: "uf-toast-trigger", onClick: showSampleToast }) })), _jsx(defaultContext.Toaster, {})] }));
});
