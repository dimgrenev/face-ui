import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Input — text input control.
 *
 * Manages focus state, value changes, and clearing via the input machine.
 *
 * `<Input label="Email" placeholder="you@example.com" />`
 * `<Input value={text} onValueChange={({ value }) => setText(value)} />`
 * `<Input type="number" min={0} max={100} step={1} />`
 * `<Input textLayout="wrap" />`
 */
import { forwardRef, useRef, useCallback, useEffect, useId, useMemo } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { inputMachine, connectInput } from '../assets/machines/input.machine';
import { cn } from '../assets/utils';
import { CloseIcon } from '../assets/icons';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Input = forwardRef(function Input(props, ref) {
    var _a, _b;
    const { value, defaultValue, id, name, type = 'default', textLayout = 'scroll', autoGrow = true, disabled = false, readOnly = false, label, description, error = '', labelOrientation = 'vertical', placeholder, ariaLabel, controlRole, ariaControls, ariaActiveDescendant, ariaAutoComplete, ariaExpanded, ariaHasPopup, spellCheck, icon, iconPosition = 'left', stretchText = false, required = false, autoFocus, autoComplete, min, max, step, minLength, maxLength, pattern, onValueChange, onChange, onBlur, onFocus, onKeyDown, controlRef, membrane = false, className, } = props;
    const resolvedInitial = (_a = value !== null && value !== void 0 ? value : defaultValue) !== null && _a !== void 0 ? _a : '';
    const initialValueRef = useRef(resolvedInitial);
    const inputMachineConfig = useMemo(() => (Object.assign(Object.assign({}, inputMachine), { context: Object.assign(Object.assign({}, inputMachine.context), { value: initialValueRef.current }) })), []);
    const { state, send } = useMachine(inputMachineConfig, {
        type: type === 'default' ? 'text' : type,
        disabled,
        readOnly,
        onValueChange,
    });
    const api = connectInput(state, send);
    const inputRef = useRef(null);
    useEffect(() => {
        if (value === undefined)
            return;
        if (state.context.value === value)
            return;
        send({ type: 'SYNC_VALUE', value });
    }, [send, state.context.value, value]);
    // Auto-grow textarea in wrap mode
    const resizeToContent = useCallback(() => {
        if (type !== 'default')
            return;
        if (textLayout !== 'wrap')
            return;
        if (!autoGrow)
            return;
        const el = inputRef.current;
        if (!el || !(el instanceof HTMLTextAreaElement))
            return;
        const BASE_H = 32;
        try {
            el.style.height = 'auto';
        }
        catch (_a) { }
        const next = Math.max(BASE_H, el.scrollHeight || 0);
        try {
            if (next <= BASE_H)
                el.style.height = '';
            else
                el.style.height = `${next}px`;
        }
        catch (_b) { }
    }, [autoGrow, type, textLayout]);
    useEffect(() => {
        if (type !== 'default')
            return;
        const el = inputRef.current;
        if (!el || !(el instanceof HTMLTextAreaElement))
            return;
        if (textLayout === 'scroll' || !autoGrow) {
            try {
                el.style.height = '';
            }
            catch (_a) { }
        }
        else {
            resizeToContent();
        }
    }, [autoGrow, type, textLayout, resizeToContent]);
    useEffect(() => { resizeToContent(); }, [resizeToContent, value]);
    useEffect(() => {
        if (!autoFocus)
            return;
        const el = inputRef.current;
        if (el)
            try {
                el.focus();
            }
            catch (_a) { }
    }, [autoFocus, type]);
    const isTextarea = type === 'default';
    const htmlType = type === 'default' ? undefined : type;
    const generatedInputId = useId();
    const inputId = id !== null && id !== void 0 ? id : generatedInputId;
    const descriptionId = description != null ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
    const isInvalid = !!error;
    const rootProps = api.getRootProps();
    const labelProps = api.getLabelProps();
    const inputProps = api.getInputProps();
    const iconNode = icon ? (_jsx("span", { className: "uf-input__icon", "data-position": iconPosition, children: typeof icon === 'string' ? _jsx(Icon, { name: icon }) : icon })) : null;
    const setControlRef = useCallback((node) => {
        inputRef.current = node;
        if (typeof controlRef === 'function') {
            controlRef(node);
        }
        else if (controlRef) {
            controlRef.current = node;
        }
    }, [controlRef]);
    const controlEl = isTextarea && textLayout === 'wrap' ? (_jsx("textarea", Object.assign({ ref: setControlRef }, inputProps, { "data-part": (_b = inputProps['data-part']) !== null && _b !== void 0 ? _b : 'textarea', "data-text-layout": "wrap", placeholder: placeholder, "aria-label": ariaLabel, role: controlRole, "aria-controls": ariaControls, "aria-activedescendant": ariaActiveDescendant, "aria-autocomplete": ariaAutoComplete, "aria-expanded": ariaExpanded, "aria-haspopup": ariaHasPopup, spellCheck: spellCheck, required: required, name: name, id: inputId, autoComplete: autoComplete, "aria-describedby": describedBy, "aria-invalid": isInvalid || undefined, autoFocus: autoFocus, minLength: minLength, maxLength: maxLength, rows: 1, wrap: "soft", onChange: (e) => {
            inputProps.onChange(e);
            onChange === null || onChange === void 0 ? void 0 : onChange(e);
            resizeToContent();
        }, onBlur: (e) => {
            inputProps.onBlur();
            onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
        }, onFocus: (e) => {
            inputProps.onFocus();
            onFocus === null || onFocus === void 0 ? void 0 : onFocus(e);
        }, onKeyDown: (e) => {
            ;
            onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(e);
    }, onInput: resizeToContent }))) : (_jsx("input", Object.assign({ ref: setControlRef }, inputProps, { type: htmlType, placeholder: placeholder, "aria-label": ariaLabel, role: controlRole, "aria-controls": ariaControls, "aria-activedescendant": ariaActiveDescendant, "aria-autocomplete": ariaAutoComplete, "aria-expanded": ariaExpanded, "aria-haspopup": ariaHasPopup, spellCheck: spellCheck, required: required, name: name, id: inputId, autoComplete: autoComplete, "aria-describedby": describedBy, "aria-invalid": isInvalid || undefined, autoFocus: autoFocus, min: min, max: max, step: step, minLength: minLength, maxLength: maxLength, pattern: pattern, "data-text-layout": isTextarea ? 'scroll' : undefined, onChange: (e) => {
            inputProps.onChange(e);
            onChange === null || onChange === void 0 ? void 0 : onChange(e);
        }, onBlur: (e) => {
            inputProps.onBlur();
            onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
        }, onFocus: (e) => {
            inputProps.onFocus();
            onFocus === null || onFocus === void 0 ? void 0 : onFocus(e);
        }, onKeyDown: (e) => {
            ;
            onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(e);
        } })));
    const controlNode = (_jsxs("span", { className: "uf-input__control", "data-stretch-text": stretchText ? '' : undefined, children: [iconNode, controlEl, _jsx("button", Object.assign({ type: "button", className: "uf-input__clear" }, api.getClearProps(), { children: _jsx(CloseIcon, {}) }))] }));
    return (_jsxs("div", Object.assign({ ref: ref }, rootProps, { "data-label-orientation": labelOrientation, "data-icon-position": icon ? iconPosition : undefined, "data-invalid": isInvalid || undefined, className: cn('uf-input', className), children: [label != null && (_jsxs(Text, Object.assign({}, labelProps, { as: "label", variant: "label", htmlFor: inputId, children: [label, required && _jsx("span", { className: "uf-input__required", children: "*" })] }))), membrane ? (_jsx("span", { className: "uf-membrane uf-membrane--full", children: controlNode })) : controlNode, description != null && (_jsx("div", { id: descriptionId, className: "uf-input__description uf-text-body", children: typeof description === 'string' || typeof description === 'number' ? (_jsx(Text, { as: "span", size: "xs", inset: "none", membrane: false, children: description })) : description })), error ? (_jsx("div", { id: errorId, className: "uf-input__error uf-text-body", role: "alert", "aria-live": "polite", children: _jsx(Text, { as: "span", size: "xs", inset: "none", membrane: false, text: error }) })) : null] })));
});
