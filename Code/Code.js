import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Code — source code display with optional line numbers, line highlighting,
 * title bar, copy-to-clipboard, and collapse/expand.
 *
 * `<Code code="const x = 1" language="tsx" />`
 * `<Code code={snippet} showLineNumbers highlight={[3, 5]} />`
 * `<Code code={snippet} title="example.ts" defaultCollapsed />`
 */
import { forwardRef, useState, useCallback, useMemo } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const codeAnatomy = createAnatomy('code').parts('root', 'pre', 'line', 'lineNumber');
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Code = forwardRef(function Code(props, ref) {
    const { code, language, title, showLineNumbers = false, highlight = [], defaultCollapsed = false, collapsedHeight = 160, className, id, role, titleAttr, style, } = props;
    const canToggle = (String(code || '').split('\n').length > 8) || (String(code || '').length > 240);
    const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed) && canToggle);
    const lines = useMemo(() => (code || '').split('\n'), [code]);
    const highlightSet = useMemo(() => new Set(Array.isArray(highlight) ? highlight : []), [highlight]);
    const hasTitle = title != null;
    const hasHeader = true;
    const onCopy = useCallback(async () => {
        var _a;
        const text = String(code !== null && code !== void 0 ? code : '');
        const canUseNavigatorClipboard = typeof window !== 'undefined' &&
            typeof navigator !== 'undefined' &&
            typeof ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) === 'function' &&
            window.isSecureContext &&
            window.top === window.self;
        if (canUseNavigatorClipboard) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            }
            catch (_b) {
                // fall through to legacy copy path
            }
        }
        if (typeof document === 'undefined')
            return;
        try {
            const el = document.createElement('textarea');
            el.value = text;
            el.setAttribute('readonly', 'true');
            el.style.position = 'fixed';
            el.style.left = '-9999px';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        catch (_c) {
            // ignore
        }
    }, [code]);
    const onToggle = useCallback(() => setCollapsed((v) => !v), []);
    return (_jsxs("div", Object.assign({ ref: ref }, codeAnatomy.getPartAttrs('root'), { "data-language": language, "data-line-numbers": showLineNumbers || undefined, "data-collapsed": collapsed || undefined, "data-has-header": hasHeader || undefined, className: cn('uf-code', className), id: id, role: role, title: titleAttr, style: style, children: [hasHeader && (_jsxs("div", { className: "uf-code-header", children: [hasTitle && (_jsx(Text, { as: "span", fullWidth: true, className: "uf-code-title", children: title })), _jsxs("div", { className: "uf-code-actions", children: [_jsx(Button, { icon: _jsx(Icon, { name: "copy", size: 16 }), iconOnly: true, fullWidth: false, variant: "default", className: "uf-code-action", "aria-label": "Copy code", title: "Copy", onClick: onCopy }), canToggle && (_jsx(Button, { icon: _jsx(Icon, { name: collapsed ? 'down' : 'up', size: 16 }), iconOnly: true, fullWidth: false, variant: "default", className: "uf-code-action", "aria-label": collapsed ? 'Expand code' : 'Collapse code', title: collapsed ? 'Expand' : 'Collapse', onClick: onToggle })), !canToggle && (_jsx(Button, { icon: _jsx(Icon, { name: "up", size: 16 }), iconOnly: true, fullWidth: false, variant: "default", className: "uf-code-action", "aria-label": "Collapse unavailable", title: "Not enough content to collapse", disabled: true }))] })] })), _jsx("pre", Object.assign({}, codeAnatomy.getPartAttrs('pre'), { style: collapsed ? { maxHeight: `${collapsedHeight}px` } : undefined, className: cn(collapsed && 'is-collapsed', !collapsed && canToggle && 'is-scrollable'), children: _jsx("code", { children: lines.map((line, index) => {
                        const lineNum = index + 1;
                        const isHighlighted = highlightSet.has(lineNum);
                        return (_jsxs("span", Object.assign({}, codeAnatomy.getPartAttrs('line'), { "data-highlight": isHighlighted || undefined, "data-line": lineNum, children: [showLineNumbers && (_jsx("span", Object.assign({}, codeAnatomy.getPartAttrs('lineNumber'), { "aria-hidden": "true", children: lineNum }))), line, '\n'] }), index));
                    }) }) }))] })));
});
