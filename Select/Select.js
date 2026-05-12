import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Select — option picker (shell pattern).
 *
 * Handles open/close and value selection. Supports single and multi-select.
 * The machine manages state; the adapter renders the option list.
 *
 * `<Select options={items} placeholder="Choose..." />`
 * `<Select type="multiselect" options={items} value={['a','b']} />`
 */
import { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useResponsiveOverlaySurface, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { selectMachine, connectSelect } from '../assets/machines/select.machine';
import { cn } from '../assets/utils';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDisplayValue(value, options) {
    if (value == null)
        return null;
    if (Array.isArray(value)) {
        if (value.length === 0)
            return null;
        return value
            .map((v) => {
            const opt = options.find((o) => o.value === v);
            return opt ? opt.label : v;
        })
            .reduce((acc, label, i) => {
            if (i > 0)
                acc.push(', ');
            acc.push(label);
            return acc;
        }, []);
    }
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : value;
}
function selectValuesEqual(left, right) {
    if (Object.is(left, right))
        return true;
    if (!Array.isArray(left) || !Array.isArray(right))
        return false;
    if (left.length !== right.length)
        return false;
    return left.every((item, index) => item === right[index]);
}
function renderSelectLabelNode(node, className) {
    if (node == null)
        return null;
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return (_jsx(Text, { as: "span", membrane: false, inset: "none", className: className, children: String(node) }));
    }
    return (_jsx("span", { className: className, children: node }));
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Select = forwardRef(function Select(props, ref) {
    var _a, _b, _c, _d;
    const { options: rawOptions, value, defaultValue, placeholder, disabled = false, type = 'select', label, labelOrientation = 'vertical', ariaLabel, displayValue: displayValueOverride, stretchText = false, onValueChange, onOpenChange, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, surfaceTitle, membrane = true, className, } = props;
    const options = Array.isArray(rawOptions) ? rawOptions : [];
    const optionOrder = options.map((option) => option.value);
    const disabledValues = options
        .filter((option) => option.disabled)
        .map((option) => option.value);
    const selectId = useId();
    const rootRef = useRef(null);
    const machineValue = useControllableMachineProp(value !== undefined ? value : undefined, defaultValue !== null && defaultValue !== void 0 ? defaultValue : (type === 'multiselect' ? [] : null));
    const { state, send } = useMachine(selectMachine, {
        value: machineValue,
        optionOrder,
        disabledValues,
        disabled,
        type,
        onValueChange: ((details) => {
            var _a;
            if (value !== undefined && selectValuesEqual(details === null || details === void 0 ? void 0 : details.value, value))
                return;
            try {
                onValueChange === null || onValueChange === void 0 ? void 0 : onValueChange(details);
            }
            catch (_b) { }
            if (typeof props.onChange === 'function') {
                try {
                    props.onChange((_a = details === null || details === void 0 ? void 0 : details.value) !== null && _a !== void 0 ? _a : null);
                }
                catch (_c) { }
            }
        }),
        onOpenChange,
    });
    const api = connectSelect(state, send);
    const isOpen = state.matches('open');
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint);
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet');
    useEffect(() => {
        if (!isOpen || resolvedSurface !== 'popover')
            return;
        const handlePointerDown = (event) => {
            var _a;
            const target = event.target;
            if (!target)
                return;
            if ((_a = rootRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))
                return;
            send({ type: 'CLOSE' });
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isOpen, resolvedSurface, send]);
    const mergedRef = useCallback((node) => {
        rootRef.current = node;
        if (typeof ref === 'function')
            ref(node);
        else if (ref && typeof ref === 'object')
            ref.current = node;
    }, [ref]);
    const computedDisplay = getDisplayValue(state.context.value, options);
    const triggerLabel = (_b = (_a = displayValueOverride !== null && displayValueOverride !== void 0 ? displayValueOverride : computedDisplay) !== null && _a !== void 0 ? _a : placeholder) !== null && _b !== void 0 ? _b : 'Select…';
    const isPlaceholder = computedDisplay == null && !displayValueOverride;
    const triggerId = `uf-select:${selectId}:trigger`;
    const labelId = label != null ? `uf-select:${selectId}:label` : undefined;
    const contentId = `uf-select:${selectId}:listbox`;
    const highlightedOptionIndex = state.context.highlightedValue == null
        ? -1
        : options.findIndex((option) => (option.value === state.context.highlightedValue && !option.disabled));
    const activeDescendantId = highlightedOptionIndex >= 0
        ? `${contentId}:option:${highlightedOptionIndex}`
        : undefined;
    const contentProps = api.getContentProps({
        id: contentId,
        labelId,
        ariaLabel,
        activeDescendantId,
    });
    const triggerProps = api.getTriggerProps({
        id: triggerId,
        contentId,
        labelId,
        ariaLabel,
        activeDescendantId,
    });
    const sheetTitle = (_d = (_c = surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : label) !== null && _c !== void 0 ? _c : ariaLabel) !== null && _d !== void 0 ? _d : 'Select option';
    const triggerNode = (_jsxs("button", Object.assign({}, triggerProps, { type: "button", "data-stretch-text": stretchText ? '' : undefined, children: [renderSelectLabelNode(triggerLabel, cn('uf-select__value', isPlaceholder && 'uf-select__value--placeholder')), _jsx("span", { className: "uf-select__arrow", "aria-hidden": "true", children: _jsx(Icon, { name: "down", size: 16 }) })] })));
    const contentNode = (_jsxs("div", { className: "uf-select__contentPanel", children: [resolvedSurface === 'sheet' ? (_jsx(ResponsiveSheetHeader, { title: sheetTitle, onClose: () => send({ type: 'CLOSE' }) })) : null, options.map((option, index) => {
                const optionProps = api.getOptionProps({
                    value: option.value,
                    disabled: option.disabled,
                    id: `${contentId}:option:${index}`,
                });
                const optionNode = (_jsx("div", Object.assign({}, optionProps, { className: cn('uf-select-option', 'uf-option', 'uf-control', optionProps.className), children: renderSelectLabelNode(option.label, 'uf-select-optionLabel') }), option.value));
                if (!membrane)
                    return optionNode;
                return (_jsx("span", { className: "uf-membrane uf-membrane--full uf-select__optionMembrane", "data-membrane-interactive": "", "data-membrane-hover": "", onClick: (event) => {
                        var _a, _b;
                        if (event.target !== event.currentTarget)
                            return;
                        (_b = (_a = optionProps).onClick) === null || _b === void 0 ? void 0 : _b.call(_a);
                    }, children: optionNode }, `option-membrane:${option.value}`));
            })] }));
    return (_jsxs("div", Object.assign({ ref: mergedRef }, api.getRootProps(), { "data-label-orientation": labelOrientation, className: cn('uf-select', className), children: [label != null && (_jsx(Text, { as: "label", variant: "label", id: labelId, htmlFor: triggerId, "data-part": "label", children: label })), _jsxs("div", { className: "uf-select-wrapper", children: [membrane ? (_jsx("span", { className: "uf-membrane uf-membrane--full", children: triggerNode })) : triggerNode, isOpen && resolvedSurface === 'sheet' ? (_jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": isOpen ? 'open' : 'closed', onClick: () => send({ type: 'CLOSE' }) })) : null, isOpen ? (_jsx("div", Object.assign({}, contentProps, { className: cn('uf-select__content', contentProps.className), "data-surface": resolvedSurface, children: membrane ? (_jsx("span", { className: "uf-membrane uf-membrane--full uf-select__contentMembrane", children: contentNode })) : contentNode }))) : null] })] })));
});
