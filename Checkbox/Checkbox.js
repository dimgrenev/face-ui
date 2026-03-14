import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Checkbox — form control for boolean/indeterminate selection.
 *
 * `<Checkbox label="Accept terms" />`
 * `<Checkbox checked disabled />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { checkboxMachine, connectCheckbox } from '../assets/machines/checkbox.machine';
import { cn } from '../assets/utils';
import { CheckOnIcon, CheckOffIcon, MinusIcon } from '../assets/icons';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Checkbox = forwardRef(function Checkbox(props, ref) {
    const legacyProps = props;
    const { checked, defaultChecked = false, disabled = false, required = false, name = '', label, onCheckedChange, className, membrane = true, } = props;
    const machineChecked = useControllableMachineProp(checked !== undefined ? checked : undefined, defaultChecked);
    const { state, send } = useMachine(checkboxMachine, {
        checked: machineChecked,
        disabled,
        required,
        name,
        onCheckedChange: ((details) => {
            try {
                onCheckedChange === null || onCheckedChange === void 0 ? void 0 : onCheckedChange(details);
            }
            catch (_a) { }
        }),
    });
    const api = connectCheckbox(state, send);
    const hasLabel = label != null && String(label).trim().length > 0;
    const controlVisualProps = Object.assign({}, api.getControlProps());
    delete controlVisualProps.role;
    delete controlVisualProps.tabIndex;
    delete controlVisualProps.onClick;
    delete controlVisualProps.onKeyDown;
    const labelVisualProps = Object.assign({}, api.getLabelProps());
    delete labelVisualProps.onClick;
    const rootNode = (_jsxs("label", Object.assign({ ref: ref }, api.getRootProps(), { "data-has-label": hasLabel ? '' : undefined, "data-icon-left": hasLabel ? '' : undefined, "data-icon-only": !hasLabel ? '' : undefined, className: cn('uf-checkbox', 'uf-option', 'uf-control', !hasLabel && 'uf-checkbox--iconOnly', className), children: [_jsx("span", Object.assign({}, controlVisualProps, { children: state.matches('indeterminate')
                    ? _jsx(MinusIcon, {})
                    : state.matches('checked')
                        ? _jsx(CheckOnIcon, {})
                        : _jsx(CheckOffIcon, {}) })), _jsx("input", Object.assign({}, api.getHiddenInputProps(), { onChange: (event) => {
                    var _a, _b, _c;
                    try {
                        (_b = (_a = api.getHiddenInputProps()).onChange) === null || _b === void 0 ? void 0 : _b.call(_a, event);
                    }
                    catch (_d) { }
                    try {
                        (_c = legacyProps.onChange) === null || _c === void 0 ? void 0 : _c.call(legacyProps, event);
                    }
                    catch (_e) { }
                } })), hasLabel && (_jsx("span", Object.assign({}, labelVisualProps, { className: cn('uf-text-body', labelVisualProps.className), children: label })))] })));
    if (!membrane)
        return rootNode;
    return _jsx("span", { className: "uf-membrane", children: rootNode });
});
