import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tabs — tabbed navigation component.
 *
 * Flat API: all tabs rendered from `items` prop.
 * Supports horizontal/vertical orientation and automatic/manual activation.
 *
 * `<Tabs items={[{ value: 'a', label: 'Alpha', content: <p>Alpha</p> }]} value="a" />`
 */
import { forwardRef, useEffect, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { tabsMachine, connectTabs } from '../assets/machines/tabs.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Tabs = forwardRef(function Tabs(props, ref) {
    var _a;
    const { items: rawItems, value, defaultValue, orientation = 'horizontal', activationMode = 'automatic', disabled = false, onValueChange, withLine = false, wrap = false, membrane = true, className, } = props;
    const rawTabs = props.tabs;
    const legacyOnChange = props.onChange;
    const itemsFromTabs = Array.isArray(rawTabs)
        ? rawTabs.map((item) => ({
            value: String(item.id),
            label: item.label,
            content: item.content,
            disabled: item.disabled,
        }))
        : [];
    const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : itemsFromTabs;
    const controlledValue = typeof props.activeTab === 'string' ? props.activeTab : value;
    const machineValue = useControllableMachineProp(controlledValue, (_a = defaultValue !== null && defaultValue !== void 0 ? defaultValue : props.defaultActiveTab) !== null && _a !== void 0 ? _a : (items.length > 0 ? items[0].value : ''));
    const itemOrder = items.map((item) => item.value);
    const disabledValues = items.filter((item) => item.disabled).map((item) => item.value);
    const { state, send } = useMachine(tabsMachine, {
        value: machineValue,
        itemOrder,
        disabledValues,
        orientation,
        activationMode,
        disabled,
        onValueChange: ((details) => {
            try {
                onValueChange === null || onValueChange === void 0 ? void 0 : onValueChange(details);
            }
            catch (_a) { }
            try {
                legacyOnChange === null || legacyOnChange === void 0 ? void 0 : legacyOnChange(details.value);
            }
            catch (_b) { }
        }),
    });
    const api = connectTabs(state, send);
    const rootRef = useRef(null);
    useEffect(() => {
        const targetValue = state.context.focusedValue;
        if (!targetValue)
            return;
        const root = rootRef.current;
        if (!root)
            return;
        const triggers = root.querySelectorAll('[role="tab"][data-value]');
        for (const trigger of triggers) {
            if (trigger.getAttribute('data-value') !== targetValue)
                continue;
            if (trigger !== document.activeElement) {
                try {
                    trigger.focus();
                }
                catch (_a) { }
            }
            try {
                trigger.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }
            catch (_b) { }
            break;
        }
    }, [state.context.focusedValue]);
    return (_jsxs("div", Object.assign({ ref: (node) => {
            rootRef.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        } }, api.getRootProps(), { className: cn('uf-tabs', withLine && 'uf-tabs--withLine', wrap && 'uf-tabs--wrap', className), children: [_jsxs("div", Object.assign({}, api.getListProps(), { className: cn('uf-tabs-header'), children: [items.map((item) => {
                        const tabNode = (_jsx("button", Object.assign({}, api.getTriggerProps({ value: item.value, disabled: item.disabled }), { className: cn('uf-tabs-tab'), children: item.label }), item.value));
                        if (!membrane)
                            return tabNode;
                        return (_jsx("span", { className: "uf-membrane", "data-membrane-interactive": "", "data-membrane-hover": "", children: tabNode }, `tab-membrane:${item.value}`));
                    }), withLine ? _jsx("div", { className: "uf-tabs-indicator", "aria-hidden": "true" }) : null] })), items.map((item) => (_jsx("div", Object.assign({}, api.getContentProps({ value: item.value }), { className: cn('uf-tabs-content'), children: (typeof item.content === 'string' || typeof item.content === 'number')
                    ? (_jsx(Text, { as: "div", fullWidth: true, children: item.content }))
                    : item.content }), item.value)))] })));
});
