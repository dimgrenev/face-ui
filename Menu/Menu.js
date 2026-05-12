import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Menu — contextual action list.
 *
 * Unifies: ContextMenu + DropdownMenu into a single component.
 *
 * - trigger='click'   -> dropdown menu (click on trigger button)
 * - trigger='context'  -> context menu (right-click opens at cursor position)
 */
import { Children, cloneElement, forwardRef, isValidElement, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMachine } from '../assets/adapters/react/use-machine';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useResponsiveOverlaySurface, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { menuMachine, connectMenu } from '../assets/machines/menu.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Separator } from '../Separator/Separator';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isSeparator(item) {
    return 'type' in item && item.type === 'separator';
}
function isGroup(item) {
    return 'type' in item && item.type === 'group';
}
const EMPTY_MENU_ITEMS = [];
function getMenuLabelText(label) {
    if (label == null || typeof label === 'boolean')
        return '';
    if (typeof label === 'string' || typeof label === 'number')
        return String(label);
    if (Array.isArray(label))
        return label.map(getMenuLabelText).filter(Boolean).join(' ');
    if (isValidElement(label))
        return getMenuLabelText(label.props.children);
    return '';
}
function collectMenuMachineMetadata(entries) {
    const itemOrder = [];
    const disabledValues = [];
    const itemLabels = {};
    const addItem = (item) => {
        itemOrder.push(item.value);
        if (item.disabled)
            disabledValues.push(item.value);
        itemLabels[item.value] = typeof item.textValue === 'string'
            ? item.textValue
            : getMenuLabelText(item.label);
    };
    for (const entry of entries) {
        if (isSeparator(entry))
            continue;
        if (isGroup(entry)) {
            for (const subItem of entry.items) {
                if (!isSeparator(subItem))
                    addItem(subItem);
            }
            continue;
        }
        addItem(entry);
    }
    return { itemOrder, disabledValues, itemLabels };
}
function composeTriggerHandler(childHandler, menuHandler) {
    if (!childHandler)
        return menuHandler;
    if (!menuHandler)
        return childHandler;
    return (event) => {
        childHandler(event);
        if (event.isPropagationStopped())
            return;
        menuHandler(event);
    };
}
// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
export const Menu = forwardRef(function Menu(props, ref) {
    const { trigger = 'click', items: rawItems = EMPTY_MENU_ITEMS, children, onSelect, disabled = false, onOpenChange, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, surfaceTitle, className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : EMPTY_MENU_ITEMS;
    const menuMachineMetadata = useMemo(() => collectMenuMachineMetadata(items), [items]);
    const { state, send } = useMachine(menuMachine, {
        trigger,
        disabled,
        itemOrder: menuMachineMetadata.itemOrder,
        disabledValues: menuMachineMetadata.disabledValues,
        itemLabels: menuMachineMetadata.itemLabels,
        onSelect: onSelect !== null && onSelect !== void 0 ? onSelect : null,
        onOpenChange: onOpenChange !== null && onOpenChange !== void 0 ? onOpenChange : null,
    });
    const api = connectMenu(state, send);
    const isOpen = state.matches('open');
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint);
    const contentId = useId();
    const triggerElRef = useRef(null);
    const contentElRef = useRef(null);
    const { style: floatingStyle } = useFloatingPosition({
        open: isOpen && resolvedSurface === 'popover',
        triggerRef: triggerElRef,
        contentRef: contentElRef,
        side: 'bottom',
        align: 'end',
        sideOffset: 4,
    });
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet');
    const sheetTitle = surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : (typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : 'Options');
    const rawTriggerProps = api.getTriggerProps();
    const { ['data-scope']: triggerScope, ['data-part']: triggerPart, ...interactiveTriggerBaseProps } = rawTriggerProps;
    const triggerProps = Object.assign(Object.assign({}, interactiveTriggerBaseProps), { 'aria-controls': contentId });
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
        if (!isOpen || !state.context.highlightedValue || !state.context.highlightedByKeyboard)
            return;
        const contentEl = contentElRef.current;
        if (!contentEl || typeof document === 'undefined')
            return;
        const highlightedItem = Array.from(contentEl.querySelectorAll('[role="menuitem"]'))
            .find((node) => node.dataset.value === state.context.highlightedValue);
        if (highlightedItem && document.activeElement !== highlightedItem) {
            highlightedItem.focus();
        }
    }, [isOpen, state.context.highlightedByKeyboard, state.context.highlightedValue]);
    const renderTrigger = () => {
        if (isValidElement(triggerNode)) {
            const child = Children.only(triggerNode);
            const childProps = child.props;
            return cloneElement(child, Object.assign(Object.assign({}, triggerProps), { disabled: childProps.disabled || triggerProps.disabled ? true : undefined, onClick: composeTriggerHandler(childProps.onClick, triggerProps.onClick), onContextMenu: composeTriggerHandler(childProps.onContextMenu, triggerProps.onContextMenu), onKeyDown: composeTriggerHandler(childProps.onKeyDown, triggerProps.onKeyDown) }));
        }
        return (_jsx(Button, Object.assign({}, triggerProps, { fullWidth: false, disabled: Boolean(triggerProps.disabled), children: triggerNode })));
    };
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
            return (_jsxs("div", Object.assign({}, api.getGroupProps(), { className: cn('uf-menu-group'), children: [_jsx("div", Object.assign({}, api.getGroupLabelProps(), { className: cn('uf-menu-group-label'), children: _jsx(Text, { as: "span", size: "xs", inset: "none", membrane: false, text: entry.label }) })), entry.items.map((subItem, j) => isSeparator(subItem)
                        ? renderSeparator(`group-${i}-sep-${j}`)
                        : renderItem(subItem, `group-${i}-item-${j}`))] }), `group-${i}`));
        }
        return renderItem(entry, `item-${i}`);
    });
    const contentElement = (_jsxs("div", Object.assign({ ref: handleContentRef }, contentProps, { id: contentId, "data-surface": resolvedSurface, "data-trigger": trigger, className: cn('uf-menu-content', className), style: resolvedSurface === 'popover' ? floatingStyle : undefined, children: [resolvedSurface === 'sheet' ? (_jsx(ResponsiveSheetHeader, { title: sheetTitle, onClose: () => send({ type: 'DISMISS' }) })) : null, renderEntries(items)] })));
    const renderedContent = useMemo(() => {
        if (resolvedSurface === 'sheet' || typeof document === 'undefined')
            return contentElement;
        return createPortal(contentElement, document.body);
    }, [contentElement, resolvedSurface]);
    return (_jsxs("div", { className: "uf-menu", "data-surface": resolvedSurface, "data-trigger": trigger, children: [_jsx("span", { ref: handleTriggerRef, "data-scope": triggerScope, "data-part": triggerPart, "data-state": triggerProps['data-state'], className: cn('uf-menu-trigger'), style: { display: 'inline-flex' }, onClick: (event) => {
                    var _a;
                    if (event.target !== event.currentTarget)
                        return;
                    (_a = triggerProps.onClick) === null || _a === void 0 ? void 0 : _a.call(triggerProps, event);
                }, onContextMenu: (event) => {
                    var _a;
                    if (event.target !== event.currentTarget)
                        return;
                    (_a = triggerProps.onContextMenu) === null || _a === void 0 ? void 0 : _a.call(triggerProps, event);
                }, children: renderTrigger() }), resolvedSurface === 'sheet' ? (_jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": isOpen ? 'open' : 'closed', onClick: () => send({ type: 'DISMISS' }) })) : null, renderedContent] }));
});
