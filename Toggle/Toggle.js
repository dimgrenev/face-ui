import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Toggle — unified Toggle + ToggleGroup.
 *
 * Single mode: `<Toggle type="single" items={[...]} />`
 * Multiple mode: `<Toggle type="multiple" items={[...]} />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { toggleMachine, connectToggle } from '../assets/machines/toggle.machine';
import { cn } from '../assets/utils';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Toggle = forwardRef(function Toggle(props, ref) {
    const { items: rawItems, value, defaultValue, type = 'multiple', disabled = false, orientation = 'horizontal', onValueChange, className, membrane = true, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const machineValue = useControllableMachineProp(Array.isArray(value) ? value.map((item) => String(item)) : undefined, Array.isArray(defaultValue) ? defaultValue.map((item) => String(item)) : []);
    const { state, send } = useMachine(toggleMachine, {
        value: machineValue,
        type,
        disabled,
        orientation,
        onValueChange,
    });
    const api = connectToggle(state, send);
    return (_jsx("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-toggle', className), children: items.map((item) => {
            const itemNode = (_jsx("button", Object.assign({ type: "button" }, api.getItemProps({ value: item.value, disabled: item.disabled }), { className: cn('uf-toggle-item', 'uf-option', 'uf-control'), children: item.label }), item.value));
            if (!membrane)
                return itemNode;
            return (_jsx("span", { className: "uf-membrane", children: itemNode }, `toggle-membrane:${item.value}`));
        }) })));
});
