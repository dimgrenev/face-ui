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
 * Bar — toolbar layout component with start/end sections.
 *
 * `<Bar><BarSection align="start">Left</BarSection><BarSection align="end">Right</BarSection></Bar>`
 * `<Bar orientation="vertical">...</Bar>`
 */
import React, { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const barAnatomy = createAnatomy('bar').parts('root', 'section');
const BarLeftEllipsis = (_props) => null;
BarLeftEllipsis.displayName = 'Bar.LeftEllipsis';
const BarLeftOverlap = (_props) => null;
BarLeftOverlap.displayName = 'Bar.LeftOverlap';
const BarRight = (_props) => null;
BarRight.displayName = 'Bar.Right';
function isElementOfType(el, type) {
    return Boolean(el) && React.isValidElement(el) && el.type === type;
}
function renderSlot(node) {
    if (node == null)
        return null;
    if (Array.isArray(node))
        return node.map((x, i) => _jsx(React.Fragment, { children: renderSlot(x) }, i));
    if (React.isValidElement(node))
        return node;
    if (typeof node === 'string' || typeof node === 'number') {
        return (_jsx(Text, { as: "span", className: "uf-bar__slotText", children: String(node) }));
    }
    if (typeof node !== 'object')
        return String(node);
    const name = node.__componentName__;
    if (!name || typeof name !== 'string')
        return null;
    const _a = node, { __componentName__ } = _a, slotProps = __rest(_a, ["__componentName__"]);
    switch (name) {
        case 'Text': return _jsx(Text, Object.assign({}, slotProps));
        case 'Icon': return _jsx(Icon, Object.assign({}, slotProps));
        case 'Button': return _jsx(Button, Object.assign({}, slotProps));
        default:
            return (_jsx(Text, { as: "span", className: "uf-bar__slotText", style: { opacity: 0.6 }, children: name }));
    }
}
// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export const Bar = forwardRef(function Bar(props, ref) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { orientation = 'horizontal', children: rawChildren, className } = props, rest = __rest(props, ["orientation", "children", "className"]);
    const children = (() => {
        if (rawChildren == null)
            return [];
        if (Array.isArray(rawChildren))
            return rawChildren;
        if (typeof rawChildren === 'object' && !React.isValidElement(rawChildren))
            return [rawChildren];
        return React.Children.toArray(rawChildren);
    })();
    // components API compatibility:
    // support compound children (`Bar.LeftEllipsis`, `Bar.LeftOverlap`, `Bar.Right`)
    // and plain Feld descriptor objects from playground JSON.
    let leftMode = 'ellipsis';
    let leftNode = null;
    let rightNode = null;
    for (const child of children) {
        if (isElementOfType(child, BarRight)) {
            rightNode = (_b = (_a = child.props) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : null;
            continue;
        }
        if (isElementOfType(child, BarLeftOverlap)) {
            leftMode = 'overlap';
            leftNode = (_d = (_c = child.props) === null || _c === void 0 ? void 0 : _c.children) !== null && _d !== void 0 ? _d : null;
            continue;
        }
        if (isElementOfType(child, BarLeftEllipsis)) {
            leftMode = 'ellipsis';
            leftNode = (_f = (_e = child.props) === null || _e === void 0 ? void 0 : _e.children) !== null && _f !== void 0 ? _f : null;
            continue;
        }
        if (child && typeof child === 'object' && !React.isValidElement(child) && typeof child.__componentName__ === 'string') {
            const n = String(child.__componentName__);
            if (n === 'Bar.Right') {
                rightNode = (_g = child.children) !== null && _g !== void 0 ? _g : null;
                continue;
            }
            if (n === 'Bar.LeftOverlap') {
                leftMode = 'overlap';
                leftNode = (_h = child.children) !== null && _h !== void 0 ? _h : null;
                continue;
            }
            if (n === 'Bar.LeftEllipsis') {
                leftMode = 'ellipsis';
                leftNode = (_j = child.children) !== null && _j !== void 0 ? _j : null;
                continue;
            }
        }
        if (leftNode == null)
            leftNode = child;
    }
    if (leftNode == null && rightNode == null) {
        leftNode = (_jsx(Text, { as: "span", className: "uf-bar__slotText", children: "Bar" }));
        rightNode = (_jsx(Button, { type: "button", "aria-label": "Close", title: "Close", icon: "close", iconOnly: true, fullWidth: false, variant: "default" }));
    }
    if (leftNode != null || rightNode != null) {
        return (_jsxs("div", Object.assign({ ref: ref }, barAnatomy.getPartAttrs('root'), { role: "toolbar", "aria-orientation": orientation, "data-orientation": orientation, className: cn('uf-bar', leftMode === 'overlap' ? 'uf-bar--overlap' : 'uf-bar--ellipsis', className) }, rest, { children: [_jsx("div", { className: "uf-bar__left", children: renderSlot(leftNode) }), _jsx("div", { className: "uf-bar__right", children: renderSlot(rightNode) })] })));
    }
    return (_jsx("div", Object.assign({ ref: ref }, barAnatomy.getPartAttrs('root'), { role: "toolbar", "aria-orientation": orientation, "data-orientation": orientation, className: cn('uf-bar', className) }, rest, { children: children })));
});
Bar.LeftEllipsis = BarLeftEllipsis;
Bar.LeftOverlap = BarLeftOverlap;
Bar.Right = BarRight;
export const BarSection = forwardRef(function BarSection(props, ref) {
    const { align = 'start', children, className } = props, rest = __rest(props, ["align", "children", "className"]);
    return (_jsx("div", Object.assign({ ref: ref }, barAnatomy.getPartAttrs('section'), { "data-align": align, className: cn('uf-bar-section', className) }, rest, { children: children })));
});
