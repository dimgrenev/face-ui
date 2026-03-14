import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Menu — contextual action list.
 *
 * Unifies: ContextMenu + DropdownMenu into a single component.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */
import { forwardRef, useCallback } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useResponsiveOverlaySurface, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { menuMachine, connectMenu } from '../assets/machines/menu.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Separator } from '../Separator/Separator';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isSeparator(item) {
    return 'type' in item && item.type === 'separator';
}
function isGroup(item) {
    return 'type' in item && item.type === 'group';
}
// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
export const Menu = forwardRef(function Menu(props, ref) {
    const { trigger = 'click', items: rawItems = [], children, onSelect, disabled = false, onOpenChange, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, surfaceTitle, className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const { state, send } = useMachine(menuMachine, {
        trigger,
        disabled,
        onSelect: onSelect !== null && onSelect !== void 0 ? onSelect : null,
        onOpenChange: onOpenChange !== null && onOpenChange !== void 0 ? onOpenChange : null,
    });
    const api = connectMenu(state, send);
    const isOpen = state.matches('open');
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint);
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet');
    const sheetTitle = surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : (typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : 'Options');
    const triggerProps = api.getTriggerProps();
    const contentProps = api.getContentProps();
    const triggerNode = (() => {
        if (children == null)
            return _jsx(Button, { text: "Options", fullWidth: false });
        if (typeof children === 'string' || typeof children === 'number') {
            return _jsx(Button, { text: String(children), fullWidth: false });
        }
        return children;
    })();
    const handleContentRef = useCallback((el) => {
        if (typeof ref === 'function')
            ref(el);
        else if (ref)
            ref.current = el;
        send({ type: 'SET_CONTENT', el });
    }, [ref, send]);
    const handleTriggerRef = useCallback((el) => {
        send({ type: 'SET_TRIGGER', el });
    }, [send]);
    // Render a flat or grouped item
    const renderItem = (item, key) => {
        const itemProps = api.getItemProps({ value: item.value, disabled: item.disabled });
        return (_jsx(Button, Object.assign({}, itemProps, { fullWidth: true, align: "left", stretchText: true, className: cn('uf-menu-item', 'uf-option', 'uf-control', itemProps.className), children: item.label }), `${key}:button`));
    };
    const renderSeparator = (key) => (_jsx(Separator, Object.assign({}, api.getSeparatorProps(), { className: cn('uf-menu-separator') }), `${key}:separator`));
    const renderEntries = (entries) => entries.map((entry, i) => {
        if (isSeparator(entry)) {
            return renderSeparator(`sep-${i}`);
        }
        if (isGroup(entry)) {
            return (_jsxs("div", Object.assign({}, api.getGroupProps(), { className: cn('uf-menu-group'), children: [_jsx("div", Object.assign({}, api.getGroupLabelProps(), { className: cn('uf-menu-group-label'), children: entry.label })), entry.items.map((subItem, j) => isSeparator(subItem)
                        ? renderSeparator(`group-${i}-sep-${j}`)
                        : renderItem(subItem, `group-${i}-item-${j}`))] }), `group-${i}`));
        }
        return renderItem(entry, `item-${i}`);
    });
    return (_jsxs("div", { className: "uf-menu", "data-surface": resolvedSurface, "data-trigger": trigger, children: [_jsx("span", Object.assign({}, triggerProps, { ref: handleTriggerRef, className: cn('uf-menu-trigger'), style: { display: 'inline-flex' }, children: triggerNode })), resolvedSurface === 'sheet' ? (_jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": isOpen ? 'open' : 'closed', onClick: () => send({ type: 'DISMISS' }) })) : null, _jsxs("div", Object.assign({ ref: handleContentRef }, contentProps, { "data-surface": resolvedSurface, "data-trigger": trigger, className: cn('uf-menu-content', className), children: [resolvedSurface === 'sheet' ? (_jsx(ResponsiveSheetHeader, { title: sheetTitle, onClose: () => send({ type: 'DISMISS' }) })) : null, renderEntries(items)] }))] }));
});
