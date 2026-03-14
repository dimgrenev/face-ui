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
 * Skeleton — loading placeholder.
 *
 * `<Skeleton />`
 * `<Skeleton width={200} height={20} />`
 * `<Skeleton variant="circle" />`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
export const skeletonAnatomy = createAnatomy('skeleton').parts('root');
export const Skeleton = forwardRef(function Skeleton(props, ref) {
    const { width, height, variant = 'text', className, style } = props, rest = __rest(props, ["width", "height", "variant", "className", "style"]);
    return (_jsx("div", Object.assign({ ref: ref }, skeletonAnatomy.getPartAttrs('root'), { "data-variant": variant, "aria-hidden": "true", className: cn('uf-skeleton', className), style: Object.assign({ width, height }, style) }, rest)));
});
