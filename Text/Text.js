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
 * Text — typography component.
 *
 * Unifies: Typography, Label, Kbd.
 * Per synthesize doc section 5: "Typography + Label + Kbd"
 *
 * `<Text text="Hello" />`
 * `<Text text="⌘K" variant="kbd" />`
 * `<Text text="Label" variant="label" />`
 * `<Text text="Settings" icon={<GearIcon />} />`
 * `<Text text="Flush" inset="none" />`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Icon } from '../Icon/Icon';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const textAnatomy = createAnatomy('text').parts('root');
// ---------------------------------------------------------------------------
// Auto-detect element from variant
// ---------------------------------------------------------------------------
function defaultElement(variant) {
    switch (variant) {
        case 'heading': return 'h2';
        case 'label': return 'label';
        case 'kbd': return 'kbd';
        case 'code': return 'code';
        case 'caption': return 'small';
        case 'default': return 'div';
        default: return 'p';
    }
}
// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
export const Text = forwardRef(function Text(props, ref) {
    const { text, variant = 'default', size, as, icon, iconPosition = 'left', inset = 'control', stretchText = false, fullWidth = false, align = 'left', membrane = true, truncate = false, children, className, htmlFor } = props, rest = __rest(props, ["text", "variant", "size", "as", "icon", "iconPosition", "inset", "stretchText", "fullWidth", "align", "membrane", "truncate", "children", "className", "htmlFor"]);
    const normalizedVariant = variant === 'default' ? 'body' : variant;
    const isLabelVariant = variant === 'label';
    // Label must keep default Text control paddings/membrane for consistent UI rhythm.
    const effectiveInset = isLabelVariant ? 'control' : inset;
    const effectiveMembrane = isLabelVariant ? true : membrane;
    const Element = (as !== null && as !== void 0 ? as : defaultElement(variant));
    const hasIcon = icon != null;
    const content = children !== null && children !== void 0 ? children : text;
    const hasContent = content != null && String(content).length > 0;
    const textClasses = cn('uf-text', 
    // Components-compat class contract (keep while also exposing data-* attrs).
    variant === 'label' ? 'uf-text-section' : 'uf-text-body', `uf-text--${variant}`, `uf-text--align-${align}`, effectiveInset === 'none' ? 'uf-text--inset-none' : 'uf-text--inset-control', hasIcon && 'uf-text--withIcon', hasIcon && `uf-text--icon-${iconPosition}`, className);
    const textNode = (_jsxs(Element, Object.assign({ ref: ref }, textAnatomy.getPartAttrs('root'), { "data-variant": normalizedVariant, "data-size": size, "data-inset": effectiveInset, "data-icon-position": hasIcon ? iconPosition : undefined, "data-stretch-text": stretchText ? '' : undefined, "data-full-width": fullWidth ? '' : undefined, "data-truncate": truncate ? '' : undefined, "data-align": align, "data-membrane": effectiveMembrane ? '' : undefined, className: textClasses, htmlFor: variant === 'label' ? htmlFor : undefined }, rest, { children: [hasIcon && iconPosition === 'left' && (_jsx("span", { className: "uf-text__icon", children: typeof icon === 'string' ? _jsx(Icon, { name: icon }) : icon })), hasContent && (_jsx("span", { className: "uf-text__content", children: content })), hasIcon && iconPosition === 'right' && (_jsx("span", { className: "uf-text__icon", children: typeof icon === 'string' ? _jsx(Icon, { name: icon }) : icon }))] })));
    if (!effectiveMembrane)
        return textNode;
    return (_jsx("span", { className: cn('uf-membrane', fullWidth && 'uf-membrane--full', truncate && 'uf-membrane--truncate'), children: textNode }));
});
