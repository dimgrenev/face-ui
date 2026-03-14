import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Navigation — horizontal/vertical navigation with hover dropdowns.
 *
 * Flat API: all items rendered from `items` prop.
 * Items with sub-items render as hover-triggered dropdown menus.
 *
 * `<Navigation items={[{ id: 'home', label: 'Home' }, { id: 'products', label: 'Products', items: [...] }]} />`
 */
import { forwardRef, useEffect, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useIsCompactViewport, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { navigationMachine, connectNavigation } from '../assets/machines/navigation.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
function DropdownItemRenderer(props) {
    const { item, api } = props;
    const linkProps = api.getLinkProps({ id: item.id, disabled: item.disabled });
    if (item.href) {
        return (_jsx("a", Object.assign({}, linkProps, { href: item.href, onClick: (e) => {
                linkProps.onClick();
                if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                }
            }, children: item.label })));
    }
    return (_jsx(Button, Object.assign({}, linkProps, { fullWidth: true, align: "left", stretchText: true, variant: api.activeId === item.id ? 'default' : 'ghost', className: "uf-navigation-dropdownItem", onClick: () => {
            var _a;
            linkProps.onClick();
            (_a = item.onClick) === null || _a === void 0 ? void 0 : _a.call(item);
        }, children: item.label })));
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Navigation = forwardRef(function Navigation(props, ref) {
    const { items: rawItems, activeId, defaultActiveId = null, onActiveChange, orientation = 'horizontal', className, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, open, defaultOpen = false, onOpenChange, trigger, surfaceTitle, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const isCompactViewport = useIsCompactViewport(surfaceBreakpoint);
    const isSheetSurface = surface === 'sheet' || (surface === 'auto' && isCompactViewport);
    const itemOrder = items.map((item) => item.id);
    const disabledIds = items.filter((item) => item.disabled).map((item) => item.id);
    const machineActiveId = useControllableMachineProp(typeof activeId === 'string' ? activeId : (activeId === null ? null : undefined), defaultActiveId);
    const { state, send } = useMachine(navigationMachine, {
        activeId: machineActiveId,
        itemOrder,
        disabledIds,
        orientation,
        onActiveChange: onActiveChange !== null && onActiveChange !== void 0 ? onActiveChange : null,
    });
    const api = connectNavigation(state, send);
    const rootRef = useRef(null);
    const [sheetOpen, setSheetOpen] = useControllableOpenState(open, defaultOpen, onOpenChange);
    useBodyScrollLock(isSheetSurface && sheetOpen);
    useEffect(() => {
        if (isSheetSurface)
            return;
        const targetId = state.context.focusedId;
        if (!targetId)
            return;
        const root = rootRef.current;
        if (!root)
            return;
        const triggers = root.querySelectorAll('[role="menuitem"][data-value]');
        for (const trigger of triggers) {
            if (trigger.getAttribute('data-value') !== targetId)
                continue;
            if (trigger !== document.activeElement) {
                try {
                    trigger.focus();
                }
                catch (_a) { }
            }
            break;
        }
    }, [state.context.focusedId]);
    if (isSheetSurface) {
        const triggerNode = trigger !== null && trigger !== void 0 ? trigger : (_jsx(Button, { icon: "panel", iconOnly: true, fullWidth: false, variant: "ghost", "aria-label": "Open navigation" }));
        const renderSheetItem = (item, nested = false) => {
            const hasItems = Array.isArray(item.items) && item.items.length > 0;
            const isActive = api.activeId === item.id;
            if (hasItems) {
                return (_jsxs("div", { className: "uf-navigation-sheetGroup", children: [_jsx(Text, { as: "div", variant: "label", className: "uf-navigation-sheetGroupTitle", children: item.label }), _jsx("div", { className: "uf-navigation-sheetGroupItems", children: item.items.map((child) => renderSheetItem(child, true)) })] }, item.id));
            }
            return (_jsx(Button, { text: typeof item.label === 'string' || typeof item.label === 'number' ? String(item.label) : undefined, fullWidth: true, align: "left", stretchText: true, membrane: true, variant: isActive ? 'default' : 'ghost', className: cn('uf-navigation-sheetItem', nested && 'uf-navigation-sheetItem--nested'), onClick: () => {
                    var _a;
                    send({ type: 'SET_ACTIVE', id: item.id });
                    (_a = item.onClick) === null || _a === void 0 ? void 0 : _a.call(item);
                    if (item.href && typeof window !== 'undefined' && !item.onClick) {
                        try {
                            window.location.assign(item.href);
                        }
                        catch (_b) { }
                    }
                    setSheetOpen(false);
                }, children: typeof item.label === 'string' || typeof item.label === 'number' ? undefined : item.label }, item.id));
        };
        return (_jsxs("div", { className: cn('uf-navigation-sheetHost', className), children: [_jsx("span", { className: "uf-navigation-sheetTrigger", style: { display: 'inline-flex' }, onClick: () => setSheetOpen(true), children: triggerNode }), _jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": sheetOpen ? 'open' : 'closed', onClick: () => setSheetOpen(false) }), _jsxs("div", { className: "uf-responsive-panel uf-navigation-sheet", "data-state": sheetOpen ? 'open' : 'closed', children: [_jsx(ResponsiveSheetHeader, { title: surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : 'Navigation', onClose: () => setSheetOpen(false) }), _jsx("div", { className: "uf-navigation-sheetList", children: items.map((item) => renderSheetItem(item)) })] })] }));
    }
    return (_jsx("div", Object.assign({ ref: (node) => {
            rootRef.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        } }, api.getRootProps(), { className: cn('uf-navigation', className), children: _jsxs("div", Object.assign({}, api.getListProps(), { children: [items.map((item) => {
                    const hasItems = Array.isArray(item.items) && item.items.length > 0;
                    return (_jsx("div", Object.assign({}, api.getItemProps({ id: item.id, hasItems, disabled: item.disabled }), { children: hasItems ? (_jsxs(_Fragment, { children: [_jsx(Button, Object.assign({}, api.getTriggerProps({ id: item.id, hasItems, disabled: item.disabled }), { fullWidth: false, variant: api.openItemId === item.id ? 'default' : 'ghost', className: "uf-navigation-trigger", children: item.label })), _jsx("div", Object.assign({}, api.getContentProps({ id: item.id, hasItems, disabled: item.disabled }), { children: item.items.map((child) => (_jsx(DropdownItemRenderer, { item: child, api: api }, child.id))) }))] })) : item.href ? (_jsx("a", Object.assign({}, api.getTriggerProps({ id: item.id, hasItems: false, disabled: item.disabled }), { href: item.href, onClick: (e) => {
                                if (item.onClick) {
                                    e.preventDefault();
                                    item.onClick();
                                }
                                send({ type: 'SET_ACTIVE', id: item.id });
                            }, children: item.label }))) : (_jsx(Button, Object.assign({}, api.getTriggerProps({ id: item.id, hasItems: false, disabled: item.disabled }), { fullWidth: false, variant: api.activeId === item.id ? 'default' : 'ghost', className: "uf-navigation-trigger", onClick: () => {
                                var _a;
                                send({ type: 'SET_ACTIVE', id: item.id });
                                (_a = item.onClick) === null || _a === void 0 ? void 0 : _a.call(item);
                            }, children: item.label }))) }), item.id));
                }), _jsx("div", Object.assign({}, api.getIndicatorProps()))] })) })));
});
