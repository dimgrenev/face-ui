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
 * Separator — visual divider.
 *
 * `<Separator />`
 * `<Separator orientation="vertical" />`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
export const separatorAnatomy = createAnatomy('separator').parts('root');
export const Separator = forwardRef(function Separator(props, ref) {
    const { orientation = 'horizontal', decorative = true, membrane = true, className } = props, rest = __rest(props, ["orientation", "decorative", "membrane", "className"]);
    const separatorNode = (_jsx("div", Object.assign({ ref: ref }, separatorAnatomy.getPartAttrs('root'), { role: decorative ? 'none' : 'separator', "aria-orientation": decorative ? undefined : orientation, "data-orientation": orientation, "data-membrane": membrane ? '' : undefined, className: cn('uf-separator', className) }, rest)));
    if (!membrane)
        return separatorNode;
    const membraneClassName = orientation === 'horizontal'
        ? 'uf-membrane uf-membrane--full uf-separator-membrane'
        : 'uf-membrane uf-membrane--full';
    return (_jsx("span", { className: membraneClassName, children: separatorNode }));
});
