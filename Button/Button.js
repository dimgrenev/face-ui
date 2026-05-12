var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Button — action component.
 *
 * Unifies: Button, ButtonGroup, Clipboard (copyText prop).
 * Per synthesize doc section 5: "Button + ButtonGroup + Clipboard"
 *
 * `<Button text="Save" />`
 * `<Button text="Copy" copyText={code} />`
 * `<Button icon="search" iconOnly />`
 */
import { forwardRef, useCallback, useRef, useState } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Icon } from '../Icon/Icon';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const buttonAnatomy = createAnatomy('button').parts('root', 'icon', 'text', 'group');
// ---------------------------------------------------------------------------
// ButtonGroup
// ---------------------------------------------------------------------------
export const ButtonGroup = forwardRef(function ButtonGroup(_a, ref) {
    var { children, orientation = 'horizontal', className } = _a, rest = __rest(_a, ["children", "orientation", "className"]);
    return (_jsx("div", Object.assign({ ref: ref, role: "group" }, buttonAnatomy.getPartAttrs('group'), { "data-orientation": orientation, className: cn('uf-button-group', className) }, rest, { children: children })));
});
// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export const Button = forwardRef(function Button(rawProps, ref) {
    const props = rawProps;
    const { text, rightText, variant: rawVariant = 'default', icon, iconPosition = 'left', iconOnly = false, disabled = false, loading = false, stretchText = false, fullWidth = true, align, level, membrane = true, copyText, onCopied, children, className, onClick, style, type = 'button' } = props, rest = __rest(props, ["text", "rightText", "variant", "icon", "iconPosition", "iconOnly", "disabled", "loading", "stretchText", "fullWidth", "align", "level", "membrane", "copyText", "onCopied", "children", "className", "onClick", "style", "type"]);
    const variant = rawVariant === 'delete' ? 'destructive' : rawVariant;
    const clampedLevel = (level != null && Number.isFinite(Number(level)))
        ? Math.max(0, Math.min(9, Number(level)))
        : undefined;
    const [copied, setCopied] = useState(false);
    const buttonRef = useRef(null);
    const setRefs = useCallback((node) => {
        buttonRef.current = node;
        if (typeof ref === 'function')
            ref(node);
        else if (ref) {
            ;
            ref.current = node;
        }
    }, [ref]);
    const handleClick = useCallback(async (e) => {
        var _a;
        if (copyText != null) {
            const canUseNavigatorClipboard = typeof window !== 'undefined' &&
                typeof navigator !== 'undefined' &&
                typeof ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) === 'function' &&
                window.isSecureContext &&
                window.top === window.self;
            let didCopy = false;
            if (canUseNavigatorClipboard) {
                try {
                    await navigator.clipboard.writeText(copyText);
                    didCopy = true;
                }
                catch (_b) {
                    didCopy = false;
                }
            }
            if (!didCopy && typeof document !== 'undefined') {
                try {
                    const el = document.createElement('textarea');
                    el.value = copyText;
                    el.setAttribute('readonly', 'true');
                    el.style.position = 'fixed';
                    el.style.left = '-9999em';
                    el.style.opacity = '0';
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    didCopy = true;
                }
                catch (_c) {
                    didCopy = false;
                }
            }
            if (didCopy) {
                setCopied(true);
                onCopied === null || onCopied === void 0 ? void 0 : onCopied();
                setTimeout(() => setCopied(false), 3000);
            }
        }
        onClick === null || onClick === void 0 ? void 0 : onClick(e);
    }, [copyText, onCopied, onClick]);
    const resolvedIcon = typeof icon === 'string'
        ? _jsx(Icon, { name: icon })
        : icon;
    const hasIcon = resolvedIcon != null;
    const hasText = text != null || children != null;
    const isIconOnly = iconOnly || (hasIcon && !hasText);
    const levelStyle = clampedLevel != null
        ? Object.assign(Object.assign({}, style), { '--face-runtime-option-level': clampedLevel })
        : style;
    const buttonNode = (_jsxs("button", Object.assign({ ref: setRefs, type: type, disabled: disabled || loading, "aria-busy": loading ? true : undefined }, buttonAnatomy.getPartAttrs('root'), { "data-variant": variant, "data-icon-only": isIconOnly ? '' : undefined, "data-stretch-text": stretchText ? '' : undefined, "data-full-width": fullWidth ? '' : undefined, "data-align": align, "data-icon-left": hasIcon && !isIconOnly && iconPosition === 'left' ? '' : undefined, "data-icon-right": hasIcon && !isIconOnly && iconPosition === 'right' ? '' : undefined, "data-level": clampedLevel != null ? '' : undefined, "data-loading": loading ? '' : undefined, "data-copied": copied ? '' : undefined, "data-membrane": membrane ? '' : undefined, className: cn('uf-button', 'uf-option', 'uf-control', className), style: levelStyle, onClick: handleClick }, rest, { children: [loading && (_jsx("span", { className: "uf-button__spinner", children: _jsx("span", { className: "uf-spinner uf-spinner--small" }) })), hasIcon && !isIconOnly && iconPosition === 'left' && (_jsx("span", Object.assign({}, buttonAnatomy.getPartAttrs('icon'), { "data-position": "left", children: resolvedIcon }))), hasIcon && isIconOnly && (_jsx("span", Object.assign({}, buttonAnatomy.getPartAttrs('icon'), { "data-position": "only", children: resolvedIcon }))), hasText && !isIconOnly && (_jsxs("span", Object.assign({}, buttonAnatomy.getPartAttrs('text'), { children: [children !== null && children !== void 0 ? children : text, rightText != null && (_jsx("span", { className: "uf-button__rightText uf-text-body", children: rightText }))] }))), hasIcon && !isIconOnly && iconPosition === 'right' && (_jsx("span", Object.assign({}, buttonAnatomy.getPartAttrs('icon'), { "data-position": "right", children: resolvedIcon })))] })));
    if (!membrane)
        return buttonNode;
    return (_jsx("span", { className: cn('uf-membrane', fullWidth ? 'uf-membrane--full' : undefined), "data-membrane-hover": "", "data-membrane-interactive": disabled || loading ? undefined : '', onClick: (event) => {
            if (event.target !== event.currentTarget)
                return;
            if (disabled || loading)
                return;
            const button = buttonRef.current;
            button === null || button === void 0 ? void 0 : button.focus();
            button === null || button === void 0 ? void 0 : button.click();
        }, children: buttonNode }));
});
