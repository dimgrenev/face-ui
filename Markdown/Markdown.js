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
 * Markdown — safe GFM renderer for rich text content.
 *
 * `<Markdown content={"# Title\\n\\n- item"} />`
 * `<Markdown content={md} allowRawHtml safeMode={false} />`
 */
import { forwardRef, useMemo } from 'react';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
export const markdownAnatomy = createAnatomy('markdown').parts('root', 'content');
function hasGfmSyntax(source) {
    const value = String(source || '');
    // Heuristic: GFM-only patterns (task lists / pipe tables / strikethrough).
    return (/(^|\n)\s*[-*]\s+\[[ xX]\]\s+/.test(value) ||
        /(^|\n)\s*\|.+\|\s*\n\s*\|(?:\s*:?-+:?\s*\|)+/m.test(value) ||
        /~~[^~]+~~/.test(value));
}
function stripHtmlTokens(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => stripHtmlTokens(item))
            .filter((item) => item != null);
    }
    if (!value || typeof value !== 'object')
        return value;
    if (value.type === 'html')
        return null;
    const out = Object.assign({}, value);
    for (const key of Object.keys(out)) {
        out[key] = stripHtmlTokens(out[key]);
    }
    return out;
}
function getStrictSanitizeOptions(linkTarget, linkRel) {
    return {
        allowedTags: [
            'p', 'br', 'hr',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote',
            'ul', 'ol', 'li',
            'a',
            'strong', 'em', 'del',
            'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img',
            'input',
        ],
        allowedAttributes: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'alt', 'title'],
            th: ['align'],
            td: ['align'],
            ol: ['start'],
            input: ['type', 'checked', 'disabled'],
            code: ['class'],
        },
        allowedClasses: {
            code: [/^language-/],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
        },
        transformTags: {
            a: (_tagName, attribs) => {
                const href = String(attribs.href || '');
                const isInternal = href.startsWith('/') || href.startsWith('#');
                const target = isInternal ? '_self' : linkTarget;
                const rel = target === '_blank' ? linkRel : (attribs.rel || '');
                return {
                    tagName: 'a',
                    attribs: Object.assign(Object.assign({}, attribs), { target,
                        rel }),
                };
            },
            input: (_tagName, attribs) => ({
                tagName: 'input',
                attribs: Object.assign(Object.assign({}, attribs), { type: attribs.type === 'checkbox' ? 'checkbox' : 'checkbox', disabled: 'disabled' }),
            }),
        },
    };
}
function getRelaxedSanitizeOptions(linkTarget, linkRel) {
    const allowedTags = Array.from(new Set([
        ...(sanitizeHtml.defaults.allowedTags || []),
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'input',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
    ]));
    return {
        allowedTags,
        allowedAttributes: Object.assign(Object.assign({}, sanitizeHtml.defaults.allowedAttributes), { a: ['href', 'name', 'target', 'title', 'rel'], img: ['src', 'alt', 'title'], th: ['align'], td: ['align'], ol: ['start'], input: ['type', 'checked', 'disabled'], code: ['class'] }),
        allowedClasses: {
            code: [/^language-/],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
        },
        transformTags: {
            a: (_tagName, attribs) => {
                const href = String(attribs.href || '');
                const isInternal = href.startsWith('/') || href.startsWith('#');
                const target = isInternal ? '_self' : linkTarget;
                const rel = target === '_blank' ? linkRel : (attribs.rel || '');
                return {
                    tagName: 'a',
                    attribs: Object.assign(Object.assign({}, attribs), { target,
                        rel }),
                };
            },
        },
    };
}
export const Markdown = forwardRef(function Markdown(props, ref) {
    const { content = '', gfm = true, safeMode = true, allowRawHtml = false, linkTarget = '_self', linkRel = 'noopener noreferrer', membrane = true, fullWidth = true, className } = props, rest = __rest(props, ["content", "gfm", "safeMode", "allowRawHtml", "linkTarget", "linkRel", "membrane", "fullWidth", "className"]);
    const html = useMemo(() => {
        try {
            const source = String(content || '');
            const effectiveGfm = Boolean(gfm || hasGfmSyntax(source));
            const lexed = marked.lexer(source, { gfm: effectiveGfm, breaks: true });
            const tokens = allowRawHtml ? lexed : stripHtmlTokens(lexed);
            const parsed = marked.parser(tokens, { gfm: effectiveGfm, breaks: true });
            const sanitizeOptions = safeMode
                ? getStrictSanitizeOptions(linkTarget, linkRel)
                : getRelaxedSanitizeOptions(linkTarget, linkRel);
            return sanitizeHtml(parsed, sanitizeOptions);
        }
        catch (_a) {
            return '';
        }
    }, [content, gfm, allowRawHtml, safeMode, linkTarget, linkRel]);
    const rootNode = (_jsx("div", Object.assign({ ref: ref }, markdownAnatomy.getPartAttrs('root'), { "data-full-width": fullWidth ? '' : undefined, className: cn('uf-markdown', className) }, rest, { children: _jsx("div", Object.assign({}, markdownAnatomy.getPartAttrs('content'), { dangerouslySetInnerHTML: { __html: html } })) })));
    if (!membrane)
        return rootNode;
    return (_jsx("span", { className: cn('uf-membrane', fullWidth && 'uf-membrane--full'), children: rootNode }));
});
