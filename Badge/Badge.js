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
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Badge — status indicator.
 *
 * `<Badge text="New" />`
 * `<Badge text="3" appearance="outline" />`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
export const badgeAnatomy = createAnatomy('badge').parts('root');
export const Badge = forwardRef(function Badge(props, ref) {
    const { text, variant: variantProp = 'default', appearance: appearanceProp = 'fill', children, className } = props, rest = __rest(props, ["text", "variant", "appearance", "children", "className"]);
    const appearance = variantProp === 'outline' ? 'outline' : appearanceProp;
    const variant = variantProp === 'outline' ? 'default' : variantProp;
    return (_jsx("span", Object.assign({ ref: ref }, badgeAnatomy.getPartAttrs('root'), { "data-variant": variant, "data-appearance": appearance, className: cn('uf-badge', className) }, rest, { children: children !== null && children !== void 0 ? children : text })));
});
