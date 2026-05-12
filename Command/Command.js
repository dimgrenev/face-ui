import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Command — command palette / search component.
 *
 * Flat API: all items rendered from `items` prop.
 * Supports text filtering, grouped items, and keyboard navigation.
 *
 * `<Command items={[{ id: 'copy', label: 'Copy', keywords: ['clipboard'] }]} />`
 */
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { useControllableOpenState } from '../assets/adapters/react/use-controllable-open-state';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useResponsiveOverlaySurface, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { commandMachine, connectCommand } from '../assets/machines/command.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Convert ReactNode labels to strings for machine-level filtering. */
function toMachineItems(items) {
    return items.map((item) => {
        var _a;
        return ({
            id: item.id,
            label: typeof item.label === 'string' ? item.label : String((_a = item.label) !== null && _a !== void 0 ? _a : ''),
            keywords: item.keywords,
            group: item.group,
            disabled: item.disabled,
            onSelect: item.onSelect,
        });
    });
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Command = forwardRef(function Command(props, ref) {
    const { items: rawItems, groups = [], placeholder = 'Search...', value, defaultValue = '', onValueChange, onSelect, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, surfaceTitle, open, defaultOpen = false, onOpenChange, emptyContent = 'No results found.', className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    // Memoize machine items by serialized ids to avoid infinite re-render loop
    const itemsKey = items.map(i => i.id).join(',');
    const machineItems = useMemo(() => toMachineItems(items), [itemsKey]);
    const machineQuery = useControllableMachineProp(typeof value === 'string' ? value : undefined, defaultValue);
    const responsiveOverlaySurface = useResponsiveOverlaySurface(surface === 'dialog' ? 'sheet' : surface === 'inline' ? 'popover' : 'auto', surfaceBreakpoint);
    const resolvedSurface = responsiveOverlaySurface === 'sheet' ? 'dialog' : 'inline';
    const isDialogSurface = resolvedSurface === 'dialog';
    const dialogTitle = surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : 'Command';
    const [dialogOpen, setDialogOpen] = useControllableOpenState(open, defaultOpen, onOpenChange);
    const inputRef = useRef(null);
    const { state, send } = useMachine(commandMachine, {
        items: machineItems,
        groups: groups,
        query: machineQuery,
        onValueChange: onValueChange !== null && onValueChange !== void 0 ? onValueChange : null,
        onSelect: ((details) => {
            onSelect === null || onSelect === void 0 ? void 0 : onSelect(details);
            if (isDialogSurface) {
                setDialogOpen(false);
            }
        }),
    });
    useBodyScrollLock(isDialogSurface && dialogOpen);
    // Sync items when they change (stable dependency via itemsKey)
    useEffect(() => {
        send({ type: 'SET_ITEMS', items: machineItems });
    }, [machineItems, send]);
    useEffect(() => {
        if (!isDialogSurface || !dialogOpen)
            return;
        const timer = window.setTimeout(() => {
            var _a;
            (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        }, 0);
        return () => {
            window.clearTimeout(timer);
        };
    }, [isDialogSurface, dialogOpen]);
    useEffect(() => {
        if (!isDialogSurface || !dialogOpen)
            return;
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            setDialogOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDialogSurface, dialogOpen, setDialogOpen]);
    const api = connectCommand(state, send);
    // Build a lookup from machine item id -> original ReactNode label
    const labelMap = new Map();
    for (const item of items) {
        labelMap.set(item.id, item.label);
    }
    // Track running global index for proper highlighting
    let globalIndex = 0;
    const groupedItems = api.getGroupedItems();
    const inputNode = (_jsx("input", Object.assign({}, api.getInputProps(), { ref: inputRef, placeholder: placeholder })));
    const showPalette = !isDialogSurface || dialogOpen;
    const triggerLabel = api.query || placeholder;
    const commandBody = (_jsxs("div", Object.assign({ ref: showPalette ? ref : null }, api.getRootProps(), { className: cn('uf-command', className), "data-surface": resolvedSurface, children: [isDialogSurface ? (_jsx(ResponsiveSheetHeader, { title: dialogTitle, onClose: () => setDialogOpen(false) })) : null, _jsx("span", { className: "uf-membrane uf-membrane--full uf-command__inputMembrane", children: inputNode }), _jsxs("div", Object.assign({}, api.getListProps(), { children: [api.isEmpty && (_jsx("div", Object.assign({}, api.getEmptyProps(), { children: typeof emptyContent === 'string' || typeof emptyContent === 'number' ? (_jsx(Text, { as: "span", inset: "none", membrane: false, children: emptyContent })) : emptyContent }))), groupedItems.map((section) => {
                        if (section.group) {
                            return (_jsxs("div", Object.assign({}, api.getGroupProps({ id: section.group.id }), { children: [_jsx("div", Object.assign({}, api.getGroupLabelProps({ id: section.group.id }), { children: _jsx(Text, { as: "span", size: "xs", inset: "none", membrane: false, text: section.group.label }) })), section.items.map((item) => {
                                        var _a;
                                        const currentIndex = globalIndex++;
                                        const itemProps = api.getItemProps({ id: item.id, index: currentIndex, disabled: item.disabled });
                                        return (_jsx("span", { className: "uf-membrane uf-membrane--full uf-command-itemMembrane", "data-membrane-interactive": "", "data-membrane-hover": "", onClick: (event) => {
                                                var _a, _b;
                                                if (event.target !== event.currentTarget)
                                                    return;
                                                (_b = (_a = itemProps).onClick) === null || _b === void 0 ? void 0 : _b.call(_a);
                                            }, onPointerEnter: () => {
                                                var _a, _b;
                                                ;
                                                (_b = (_a = itemProps).onPointerEnter) === null || _b === void 0 ? void 0 : _b.call(_a);
                                            }, onMouseEnter: () => {
                                                var _a, _b;
                                                ;
                                                (_b = (_a = itemProps).onMouseEnter) === null || _b === void 0 ? void 0 : _b.call(_a);
                                            }, onMouseOver: () => {
                                                var _a, _b;
                                                ;
                                                (_b = (_a = itemProps).onMouseOver) === null || _b === void 0 ? void 0 : _b.call(_a);
                                            }, children: _jsx(Button, Object.assign({}, itemProps, { membrane: false, fullWidth: true, align: "left", stretchText: true, className: cn('uf-command-item', 'uf-option', 'uf-control', itemProps.className), children: (_a = labelMap.get(item.id)) !== null && _a !== void 0 ? _a : item.label })) }, `${item.id}:membrane`));
                                    })] }), section.group.id));
                        }
                        return section.items.map((item) => {
                            var _a;
                            const currentIndex = globalIndex++;
                            const itemProps = api.getItemProps({ id: item.id, index: currentIndex, disabled: item.disabled });
                            return (_jsx("span", { className: "uf-membrane uf-membrane--full uf-command-itemMembrane", "data-membrane-interactive": "", "data-membrane-hover": "", onClick: (event) => {
                                    var _a, _b;
                                    if (event.target !== event.currentTarget)
                                        return;
                                    (_b = (_a = itemProps).onClick) === null || _b === void 0 ? void 0 : _b.call(_a);
                                }, onPointerEnter: () => {
                                    var _a, _b;
                                    ;
                                    (_b = (_a = itemProps).onPointerEnter) === null || _b === void 0 ? void 0 : _b.call(_a);
                                }, onMouseEnter: () => {
                                    var _a, _b;
                                    ;
                                    (_b = (_a = itemProps).onMouseEnter) === null || _b === void 0 ? void 0 : _b.call(_a);
                                }, onMouseOver: () => {
                                    var _a, _b;
                                    ;
                                    (_b = (_a = itemProps).onMouseOver) === null || _b === void 0 ? void 0 : _b.call(_a);
                                }, children: _jsx(Button, Object.assign({}, itemProps, { membrane: false, fullWidth: true, align: "left", stretchText: true, className: cn('uf-command-item', 'uf-option', 'uf-control', itemProps.className), children: (_a = labelMap.get(item.id)) !== null && _a !== void 0 ? _a : item.label })) }, `${item.id}:membrane`));
                        });
                    })] }))] })));
    if (!isDialogSurface) {
        return commandBody;
    }
    return (_jsxs("div", { className: "uf-commandSurface", "data-surface": resolvedSurface, "data-state": dialogOpen ? 'open' : 'closed', children: [_jsx("span", { className: "uf-membrane uf-membrane--full uf-command__triggerMembrane", children: _jsxs("button", { type: "button", className: "uf-command__trigger", "aria-haspopup": "dialog", "aria-expanded": dialogOpen, onClick: () => setDialogOpen(true), children: [_jsx("span", { className: "uf-command__triggerIcon", "aria-hidden": "true", children: _jsx(Icon, { name: "search", size: 16 }) }), _jsx(Text, { as: "span", membrane: false, inset: "none", className: cn('uf-command__triggerLabel', !api.query && 'uf-command__triggerLabel--placeholder'), children: triggerLabel })] }) }), _jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": dialogOpen ? 'open' : 'closed', onClick: () => setDialogOpen(false) }), _jsx("div", { className: "uf-command__dialog", "data-state": dialogOpen ? 'open' : 'closed', children: showPalette ? commandBody : null })] }));
});
