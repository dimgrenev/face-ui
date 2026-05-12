import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Radio — flat radio group with options prop.
 *
 * `<Radio options={[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]} />`
 */
import { forwardRef, useEffect, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { radioMachine, connectRadio } from '../assets/machines/radio.machine';
import { cn } from '../assets/utils';
import { RadioOnIcon, RadioOffIcon } from '../assets/icons';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Radio = forwardRef(function Radio(props, ref) {
    var _a;
    const { options: rawOptions, value, defaultValue, name, disabled = false, required = false, orientation, onValueChange, className, membrane = true, } = props;
    const effectiveOrientation = (_a = orientation !== null && orientation !== void 0 ? orientation : props.flow) !== null && _a !== void 0 ? _a : 'vertical';
    const options = Array.isArray(rawOptions) ? rawOptions : [];
    const itemOrder = options.map((option) => option.value);
    const disabledValues = options.filter((option) => option.disabled).map((option) => option.value);
    const machineValue = useControllableMachineProp(value !== undefined ? value : undefined, defaultValue !== null && defaultValue !== void 0 ? defaultValue : null);
    const { state, send } = useMachine(radioMachine, {
        value: machineValue,
        itemOrder,
        disabledValues,
        disabled,
        orientation: effectiveOrientation,
        onValueChange: ((details) => {
            var _a;
            try {
                onValueChange === null || onValueChange === void 0 ? void 0 : onValueChange(details);
            }
            catch (_b) { }
            try {
                (_a = props.onChange) === null || _a === void 0 ? void 0 : _a.call(props, details.value);
            }
            catch (_c) { }
        }),
    });
    const api = connectRadio(state, send);
    const rootRef = useRef(null);
    useEffect(() => {
        const targetValue = state.context.focusedValue;
        if (!targetValue)
            return;
        const root = rootRef.current;
        if (!root)
            return;
        const items = root.querySelectorAll('[role="radio"][data-value]');
        for (const item of items) {
            if (item.getAttribute('data-value') !== targetValue)
                continue;
            if (item !== document.activeElement) {
                try {
                    item.focus();
                }
                catch (_a) { }
            }
            break;
        }
    }, [state.context.focusedValue]);
    return (_jsx("div", Object.assign({ ref: (node) => {
            rootRef.current = node;
            if (typeof ref === 'function')
                ref(node);
            else if (ref)
                ref.current = node;
        } }, api.getRootProps(), { "data-orientation": effectiveOrientation, "data-disabled": disabled ? '' : undefined, className: cn('uf-radio', className), children: options.map((option) => {
            const optionDisabled = disabled || option.disabled;
            const itemVisualProps = Object.assign({}, api.getItemProps({ value: option.value, disabled: option.disabled }));
            const optionNode = (_jsxs("label", Object.assign({}, itemVisualProps, { "data-value": option.value, "data-icon-left": "", className: cn('uf-radio-option', 'uf-option', 'uf-control'), children: [_jsx("input", { type: "radio", name: name, value: option.value, checked: state.context.value === option.value, disabled: optionDisabled, tabIndex: -1, required: required, onChange: () => {
                            if (!optionDisabled) {
                                send({ type: 'SELECT', value: option.value });
                            }
                        }, style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 } }), _jsx("span", Object.assign({ className: "uf-radio-indicator" }, api.getIndicatorProps(), { children: state.context.value === option.value ? _jsx(RadioOnIcon, {}) : _jsx(RadioOffIcon, {}) })), _jsx("span", { className: "uf-radio-text uf-text-body", children: option.label })] }), option.value));
            if (!membrane)
                return optionNode;
            const isVertical = effectiveOrientation === 'vertical';
            return (_jsx("span", { className: cn('uf-membrane', isVertical && 'uf-membrane--full'), children: optionNode }, `membrane:${option.value}`));
        }) })));
});
