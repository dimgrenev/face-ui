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
 * Overlay — floating content surface.
 *
 * Unifies: Tooltip + Popover + HoverCard into a single component.
 *
 * - trigger='hover'                -> tooltip (non-interactive, delay-based)
 * - trigger='click'                -> popover (interactive, toggle + dismiss)
 * - trigger='hover' + interactive  -> hovercard (hover-triggered, interactive content)
 */
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMachine } from '../assets/adapters/react/use-machine';
import { overlayMachine, connectOverlay } from '../assets/machines/overlay.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------
export const Overlay = forwardRef(function Overlay(props, ref) {
    const { trigger = 'hover', interactive = false, content, children, open, openDelay, closeDelay, side = 'top', align = 'center', sideOffset = 8, onOpenChange, className } = props, rest = __rest(props, ["trigger", "interactive", "content", "children", "open", "openDelay", "closeDelay", "side", "align", "sideOffset", "onOpenChange", "className"]);
    const { state, send } = useMachine(overlayMachine, {
        open,
        trigger,
        interactive,
        openDelay: openDelay !== null && openDelay !== void 0 ? openDelay : 200,
        closeDelay: closeDelay !== null && closeDelay !== void 0 ? closeDelay : 0,
        positioning: { side, align, sideOffset },
        onOpenChange: onOpenChange !== null && onOpenChange !== void 0 ? onOpenChange : null,
    });
    const api = connectOverlay(state, send);
    const isOpen = state.matches('open', 'closing');
    const triggerElRef = useRef(null);
    const contentElRef = useRef(null);
    const [contentStyle, setContentStyle] = useState({ position: 'fixed', top: -9999, left: -9999 });
    const triggerProps = api.getTriggerProps();
    const contentProps = api.getContentProps();
    const isPrimitiveTrigger = children == null || typeof children === 'string' || typeof children === 'number';
    const updateFloatingPosition = useCallback(() => {
        if (typeof window === 'undefined')
            return;
        const triggerEl = triggerElRef.current;
        const contentEl = contentElRef.current;
        if (!triggerEl || !contentEl)
            return;
        const triggerRect = triggerEl.getBoundingClientRect();
        const contentRect = contentEl.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const viewportInset = 8;
        let top = triggerRect.bottom + sideOffset;
        let left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        if (side === 'top') {
            top = triggerRect.top - contentRect.height - sideOffset;
        }
        else if (side === 'left') {
            top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
            left = triggerRect.left - contentRect.width - sideOffset;
        }
        else if (side === 'right') {
            top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
            left = triggerRect.right + sideOffset;
        }
        if (side === 'top' || side === 'bottom') {
            if (align === 'start')
                left = triggerRect.left;
            if (align === 'end')
                left = triggerRect.right - contentRect.width;
        }
        else {
            if (align === 'start')
                top = triggerRect.top;
            if (align === 'end')
                top = triggerRect.bottom - contentRect.height;
        }
        top = Math.min(Math.max(viewportInset, top), Math.max(viewportInset, viewportHeight - contentRect.height - viewportInset));
        left = Math.min(Math.max(viewportInset, left), Math.max(viewportInset, viewportWidth - contentRect.width - viewportInset));
        setContentStyle({
            position: 'fixed',
            top: Math.round(top),
            left: Math.round(left),
        });
    }, [align, side, sideOffset]);
    const handleContentRef = useCallback((el) => {
        contentElRef.current = el;
        if (typeof ref === 'function')
            ref(el);
        else if (ref)
            ref.current = el;
        send({ type: 'SET_CONTENT', el });
    }, [ref, send]);
    const handleTriggerRef = useCallback((el) => {
        triggerElRef.current = el;
        send({ type: 'SET_TRIGGER', el });
    }, [send]);
    useEffect(() => {
        if (!isOpen)
            return;
        updateFloatingPosition();
        const rafId = window.requestAnimationFrame(updateFloatingPosition);
        const handleWindowChange = () => updateFloatingPosition();
        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [isOpen, updateFloatingPosition]);
    const rawContentNode = content !== null && content !== void 0 ? content : 'Tooltip text';
    const contentNode = (typeof rawContentNode === 'string' || typeof rawContentNode === 'number'
        ? (_jsx(Text, { as: "div", fullWidth: true, children: String(rawContentNode) }))
        : rawContentNode);
    const contentElement = (_jsxs("div", Object.assign({ ref: handleContentRef }, contentProps, { "data-trigger": trigger, className: cn('uf-overlay-content', className), style: contentStyle }, rest, { children: [_jsx("div", Object.assign({}, api.getArrowProps(), { className: cn('uf-overlay-arrow') })), contentNode] })));
    const renderedContent = useMemo(() => {
        if (typeof document === 'undefined')
            return contentElement;
        return createPortal(contentElement, document.body);
    }, [contentElement]);
    return (_jsxs(_Fragment, { children: [isPrimitiveTrigger ? (_jsx("span", Object.assign({}, triggerProps, { ref: handleTriggerRef, className: "uf-membrane uf-overlay-triggerMembrane", "data-membrane-hover": "", "data-membrane-interactive": "", children: _jsx(Button, { text: children == null ? 'Hover me' : String(children), fullWidth: false, membrane: false, className: "uf-overlay-triggerButton" }) }))) : (_jsx("span", Object.assign({}, triggerProps, { ref: handleTriggerRef, className: cn('uf-overlay-trigger'), style: { display: 'inline-flex' }, children: children }))), renderedContent] }));
});
