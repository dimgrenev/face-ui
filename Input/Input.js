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
import { forwardRef, useRef, useCallback, useEffect, useLayoutEffect, useId } from 'react';
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
    const { value, defaultValue, type = 'default', textLayout = 'scroll', disabled = false, readOnly = false, label, description, error = '', labelOrientation = 'vertical', placeholder, spellCheck, icon, iconPosition = 'left', stretchText = false, required = false, autoFocus, min, max, step, onValueChange, onChange, onBlur, onFocus, onKeyDown, membrane = false, className, } = props;
    const resolvedInitial = (_a = value !== null && value !== void 0 ? value : defaultValue) !== null && _a !== void 0 ? _a : '';
    const { state, send } = useMachine(inputMachine, {
        value: resolvedInitial,
        type: type === 'default' ? 'text' : type,
        disabled,
        readOnly,
        onValueChange,
    });
    const api = connectInput(state, send);
    const inputRef = useRef(null);
    // Auto-grow textarea in wrap mode
    const resizeToContent = useCallback(() => {
        if (type !== 'default')
            return;
        if (textLayout !== 'wrap')
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
    }, [type, textLayout]);
    useLayoutEffect(() => {
        if (type !== 'default')
            return;
        const el = inputRef.current;
        if (!el || !(el instanceof HTMLTextAreaElement))
            return;
        if (textLayout === 'scroll') {
            try {
                el.style.height = '';
            }
            catch (_a) { }
        }
        else {
            resizeToContent();
        }
    }, [type, textLayout, resizeToContent]);
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
    const inputId = useId();
    const descriptionId = description != null ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
    const isInvalid = !!error;
    const rootProps = api.getRootProps();
    const labelProps = api.getLabelProps();
    const inputProps = api.getInputProps();
    const iconNode = icon ? (_jsx("span", { className: "uf-input__icon", "data-position": iconPosition, children: typeof icon === 'string' ? _jsx(Icon, { name: icon }) : icon })) : null;
    const controlEl = isTextarea && textLayout === 'wrap' ? (_jsx("textarea", Object.assign({ ref: inputRef }, inputProps, { "data-part": (_b = inputProps['data-part']) !== null && _b !== void 0 ? _b : 'textarea', "data-text-layout": "wrap", placeholder: placeholder, spellCheck: spellCheck, required: required, id: inputId, "aria-describedby": describedBy, "aria-invalid": isInvalid || undefined, autoFocus: autoFocus, rows: 1, wrap: "soft", onChange: (e) => {
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
        }, onInput: resizeToContent }))) : (_jsx("input", Object.assign({ ref: inputRef }, inputProps, { type: htmlType, placeholder: placeholder, spellCheck: spellCheck, required: required, id: inputId, "aria-describedby": describedBy, "aria-invalid": isInvalid || undefined, autoFocus: autoFocus, min: min, max: max, step: step, "data-text-layout": isTextarea ? 'scroll' : undefined, onChange: (e) => {
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
    const controlNode = (_jsxs("span", { className: cn('uf-input__control', stretchText && 'uf-control--stretchText'), children: [iconNode, controlEl, _jsx("button", Object.assign({ type: "button", className: "uf-input__clear" }, api.getClearProps(), { children: _jsx(CloseIcon, {}) }))] }));
    return (_jsxs("div", Object.assign({ ref: ref }, rootProps, { "data-label-orientation": labelOrientation, "data-icon-position": icon ? iconPosition : undefined, "data-invalid": isInvalid || undefined, className: cn('uf-input', className), children: [label != null && (_jsxs(Text, Object.assign({}, labelProps, { as: "label", variant: "label", htmlFor: inputId, children: [label, required && _jsx("span", { className: "uf-input__required", children: "*" })] }))), membrane ? (_jsx("span", { className: "uf-membrane uf-membrane--full", children: controlNode })) : controlNode, description != null && (_jsx("div", { id: descriptionId, className: "uf-input__description uf-text-body", children: description })), error ? (_jsx("div", { id: errorId, className: "uf-input__error uf-text-body", role: "alert", "aria-live": "polite", children: error })) : null] })));
});
