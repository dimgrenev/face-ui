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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Modal — overlay surface component.
 *
 * Unifies: Dialog + Drawer + AlertDialog into a single component.
 *
 * - variant='center'                     -> classic dialog
 * - variant='left'|'right'|'top'|'bottom' -> drawer / sheet
 * - closable=false                       -> alertdialog (no Escape, no backdrop dismiss)
 *
 * `<Modal open title="Settings" variant="right" width={400} />`
 */
import { forwardRef, useId, useCallback } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useIsCompactViewport, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { modalMachine, connectModal } from '../assets/machines/modal.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Bar } from '../Bar/Bar';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export const Modal = forwardRef(function Modal(props, ref) {
    const legacyProps = props;
    const { open, variant = 'right', closeOnOverlayClick = true, closable = true, title, description, children, actions = [], trigger, width = 400, height = 420, onOpenChange, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, className } = props, rest = __rest(props, ["open", "variant", "closeOnOverlayClick", "closable", "title", "description", "children", "actions", "trigger", "width", "height", "onOpenChange", "surface", "surfaceBreakpoint", "className"]);
    const isCompactViewport = useIsCompactViewport(surfaceBreakpoint);
    const resolvedSurface = surface === 'auto'
        ? (isCompactViewport ? 'sheet' : 'dialog')
        : surface;
    const effectiveVariant = (resolvedSurface === 'sheet' && variant === 'center'
        ? 'bottom'
        : variant);
    const titleId = useId();
    const descriptionId = useId();
    const resolvedOpen = typeof legacyProps.isOpen === 'boolean' ? legacyProps.isOpen : open;
    const { state, send } = useMachine(modalMachine, {
        open: resolvedOpen,
        variant: effectiveVariant,
        closable,
        titleId,
        descriptionId,
        onOpenChange: ((details) => {
            var _a;
            try {
                onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange(details);
            }
            catch (_b) { }
            if (!(details === null || details === void 0 ? void 0 : details.open)) {
                try {
                    (_a = legacyProps.onClose) === null || _a === void 0 ? void 0 : _a.call(legacyProps);
                }
                catch (_c) { }
            }
        }),
    });
    const api = connectModal(state, send);
    const triggerProps = api.getTriggerProps();
    const isPrimitiveTrigger = typeof trigger === 'string' || typeof trigger === 'number';
    const backdropProps = api.getBackdropProps();
    if (!closeOnOverlayClick) {
        try {
            delete backdropProps.onClick;
        }
        catch (_a) { }
    }
    const handleRef = useCallback((el) => {
        send({ type: 'SET_CONTENT', el });
        if (typeof ref === 'function')
            ref(el);
        else if (ref)
            ref.current = el;
    }, [ref, send]);
    // Build inline style for width/height CSS custom properties (only on matching variants)
    const isHorizontal = effectiveVariant === 'left' || effectiveVariant === 'right';
    const isVertical = effectiveVariant === 'top' || effectiveVariant === 'bottom';
    const contentStyle = (isHorizontal && width != null) || (isVertical && height != null)
        ? Object.assign(Object.assign({}, (isHorizontal && width != null ? { '--uf-modal-w': `${width}px` } : {})), (isVertical && height != null ? { '--uf-modal-h': `${height}px` } : {})) : undefined;
    return (_jsxs(_Fragment, { children: [trigger != null && (isPrimitiveTrigger ? (_jsx(Button, Object.assign({}, triggerProps, { text: String(trigger), fullWidth: false, membrane: false }))) : (_jsx("span", Object.assign({}, triggerProps, { className: cn('uf-modal-trigger'), style: { display: 'inline-flex' }, children: trigger })))), _jsx("div", Object.assign({}, backdropProps, { className: cn('uf-modal-backdrop') })), _jsx("div", Object.assign({}, api.getPositionerProps(), { className: cn('uf-modal-positioner'), children: _jsxs("div", Object.assign({ ref: handleRef }, api.getContentProps(), { "data-surface": resolvedSurface, className: cn('uf-modal', className), style: contentStyle }, rest, { children: [(title != null || closable) && (_jsxs(Bar, { className: "uf-modal-bar", children: [title != null ? (_jsx(Text, Object.assign({}, api.getTitleProps(), { as: "div", fullWidth: true, align: "left", className: cn('uf-modal-title'), children: title }))) : null, closable ? (_jsx(Bar.Right, { children: _jsx(Button, Object.assign({}, api.getCloseProps(), { icon: "close", iconOnly: true, fullWidth: false, variant: "default", className: "uf-modal-closeButton", "aria-label": "Close modal", title: "Close" })) })) : null] })), description != null && (_jsx(Text, Object.assign({}, api.getDescriptionProps(), { as: "div", variant: "muted", fullWidth: true, align: "left", className: cn('uf-modal-description'), children: description }))), children != null ? (typeof children === 'string' || typeof children === 'number' ? (_jsx("div", { className: "uf-modal-body", children: _jsx(Text, { as: "div", fullWidth: true, align: "left", children: children }) })) : (_jsx("div", { className: "uf-modal-body", children: children }))) : null, actions.length > 0 ? (_jsx(Bar, { className: "uf-modal-actionsBar", children: _jsx(Bar.Right, { children: actions.map((action, index) => {
                                    var _a;
                                    return (_jsx(Button, { text: typeof action.label === 'string' || typeof action.label === 'number' ? String(action.label) : undefined, variant: (_a = action.variant) !== null && _a !== void 0 ? _a : (index === actions.length - 1 ? 'accent' : 'outline'), disabled: action.disabled, fullWidth: false, children: typeof action.label === 'string' || typeof action.label === 'number' ? undefined : action.label }, `modal-action:${index}`));
                                }) }) })) : null] })) }))] }));
});
