import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Breadcrumb — navigation trail showing the current location in a hierarchy.
 *
 * `<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'API' }]} />`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const breadcrumbAnatomy = createAnatomy('breadcrumb').parts('root', 'list', 'item', 'link', 'separator', 'current');
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Breadcrumb = forwardRef(function Breadcrumb(props, ref) {
    const { items: rawItems, separator = '/', membrane = true, allowNavigation = false, className, collapseAfter = 4, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const shouldCollapse = collapseAfter >= 3 && items.length > collapseAfter;
    const overflowItems = shouldCollapse
        ? items.slice(1, Math.max(1, items.length - (collapseAfter - 2)))
        : [];
    const visibleItems = shouldCollapse
        ? [items[0], { label: 'More', __overflow: true }, ...items.slice(-(collapseAfter - 2))]
        : items;
    const defaultSeparatorNode = (_jsx("svg", { className: "uf-breadcrumb-separatorSvg", viewBox: "0 0 8 24", width: "8", height: "18", "aria-hidden": "true", focusable: "false", children: _jsx("path", { d: "M2 22L6 2", fill: "none", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" }) }));
    return (_jsx("nav", Object.assign({ ref: ref }, breadcrumbAnatomy.getPartAttrs('root'), { "aria-label": "Breadcrumb", className: cn('uf-breadcrumb', className), children: _jsx("ol", Object.assign({}, breadcrumbAnatomy.getPartAttrs('list'), { children: visibleItems.map((item, index) => {
                var _a, _b;
                const isOverflow = '__overflow' in item;
                const isLast = index === visibleItems.length - 1;
                const isDefaultSlash = separator === '/';
                const handleItemClick = (e) => {
                    var _a;
                    // In playground/sandbox mode we keep clicks inside preview.
                    // Set allowNavigation=true to restore native anchor navigation.
                    if (!allowNavigation || item.onClick) {
                        e.preventDefault();
                    }
                    (_a = item.onClick) === null || _a === void 0 ? void 0 : _a.call(item);
                };
                return (_jsx("li", Object.assign({}, breadcrumbAnatomy.getPartAttrs('item'), { children: _jsxs(_Fragment, { children: [membrane ? (isOverflow ? (_jsx(Menu, { items: overflowItems.map((overflowItem, overflowIndex) => ({
                                    value: String(overflowIndex),
                                    label: overflowItem.label,
                                })), surfaceTitle: "Path", onSelect: ({ value }) => {
                                    var _a;
                                    const overflowItem = overflowItems[Number(value)];
                                    (_a = overflowItem === null || overflowItem === void 0 ? void 0 : overflowItem.onClick) === null || _a === void 0 ? void 0 : _a.call(overflowItem);
                                    if ((overflowItem === null || overflowItem === void 0 ? void 0 : overflowItem.href) && typeof window !== 'undefined' && allowNavigation) {
                                        window.location.assign(overflowItem.href);
                                    }
                                }, children: _jsx(Button, { icon: "more", iconOnly: true, fullWidth: false, membrane: true, variant: "default", className: "uf-breadcrumb-overflow", "aria-label": "Show path" }) })) : (_jsx("span", { className: "uf-membrane", children: _jsx("a", Object.assign({}, (isLast ? breadcrumbAnatomy.getPartAttrs('current') : breadcrumbAnatomy.getPartAttrs('link')), { "aria-current": isLast ? 'page' : undefined, href: (_a = item.href) !== null && _a !== void 0 ? _a : '#', onClick: handleItemClick, children: item.label })) }))) : (isOverflow ? (_jsx(Menu, { items: overflowItems.map((overflowItem, overflowIndex) => ({
                                    value: String(overflowIndex),
                                    label: overflowItem.label,
                                })), surfaceTitle: "Path", onSelect: ({ value }) => {
                                    var _a;
                                    const overflowItem = overflowItems[Number(value)];
                                    (_a = overflowItem === null || overflowItem === void 0 ? void 0 : overflowItem.onClick) === null || _a === void 0 ? void 0 : _a.call(overflowItem);
                                    if ((overflowItem === null || overflowItem === void 0 ? void 0 : overflowItem.href) && typeof window !== 'undefined' && allowNavigation) {
                                        window.location.assign(overflowItem.href);
                                    }
                                }, children: _jsx(Button, { icon: "more", iconOnly: true, fullWidth: false, membrane: false, variant: "default", className: "uf-breadcrumb-overflow", "aria-label": "Show path" }) })) : (_jsx("a", Object.assign({}, (isLast ? breadcrumbAnatomy.getPartAttrs('current') : breadcrumbAnatomy.getPartAttrs('link')), { "aria-current": isLast ? 'page' : undefined, href: (_b = item.href) !== null && _b !== void 0 ? _b : '#', onClick: handleItemClick, children: item.label })))), !isLast && (_jsx("span", Object.assign({}, breadcrumbAnatomy.getPartAttrs('separator'), { className: cn('uf-breadcrumb-separator', isDefaultSlash && 'uf-breadcrumb-separator--slash'), "aria-hidden": "true", children: isDefaultSlash ? defaultSeparatorNode : separator })))] }) }), index));
            }) })) })));
});
