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
 * Card — content container.
 *
 * `<Card title="Settings" content={<Form />} />`
 * `<Card>{children}</Card>`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
export const cardAnatomy = createAnatomy('card').parts('root', 'header', 'title', 'description', 'content', 'footer');
function renderCardNode(node, variant = 'body') {
    if (node == null)
        return null;
    if (typeof node === 'string' || typeof node === 'number') {
        return (_jsx(Text, { as: "div", variant: variant, membrane: false, inset: "none", children: String(node) }));
    }
    return node;
}
export const Card = forwardRef(function Card(props, ref) {
    const { title, description, content, footer, membrane = true, children, className } = props, rest = __rest(props
    // If children are provided, render them directly (escape hatch)
    , ["title", "description", "content", "footer", "membrane", "children", "className"]);
    // If children are provided, render them directly (escape hatch)
    if (children && !title && !content) {
        return (_jsx("div", Object.assign({ ref: ref }, cardAnatomy.getPartAttrs('root'), { "data-membrane": membrane ? '' : undefined, className: cn('uf-card', className) }, rest, { children: renderCardNode(children) })));
    }
    return (_jsxs("div", Object.assign({ ref: ref }, cardAnatomy.getPartAttrs('root'), { "data-membrane": membrane ? '' : undefined, className: cn('uf-card', className) }, rest, { children: [(title || description) && (_jsxs("div", Object.assign({}, cardAnatomy.getPartAttrs('header'), { children: [title && (_jsx(Text, Object.assign({}, cardAnatomy.getPartAttrs('title'), { as: "div", membrane: false, inset: "none", children: title }))), description && (_jsx(Text, Object.assign({}, cardAnatomy.getPartAttrs('description'), { as: "div", variant: "muted", membrane: false, inset: "none", children: description })))] }))), (content || children) && (_jsx("div", Object.assign({}, cardAnatomy.getPartAttrs('content'), { children: renderCardNode(content !== null && content !== void 0 ? content : children) }))), footer && (_jsx("div", Object.assign({}, cardAnatomy.getPartAttrs('footer'), { children: renderCardNode(footer) })))] })));
});
