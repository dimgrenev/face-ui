import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Scroll — scroll area with custom scrollbar styling hooks.
 *
 * `<Scroll>{content}</Scroll>`
 * `<Scroll type="always" orientation="both">{content}</Scroll>`
 */
import { forwardRef } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const scrollAnatomy = createAnatomy('scroll').parts('root', 'viewport', 'scrollbar', 'thumb');
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Scroll = forwardRef(function Scroll(props, ref) {
    const { children, type = 'auto', orientation = 'vertical', className, height = 160, ariaLabel = 'Scrollable content', } = props;
    const overflowStyle = (() => {
        switch (orientation) {
            case 'horizontal':
                return { overflowX: 'auto', overflowY: 'hidden' };
            case 'both':
                return { overflowX: 'auto', overflowY: 'auto' };
            case 'vertical':
            default:
                return { overflowX: 'hidden', overflowY: 'auto' };
        }
    })();
    return (_jsx("div", Object.assign({ ref: ref }, scrollAnatomy.getPartAttrs('root'), { "data-type": type, "data-orientation": orientation, className: cn('uf-scroll', className), style: { height }, children: _jsx("div", Object.assign({}, scrollAnatomy.getPartAttrs('viewport'), { style: overflowStyle, tabIndex: 0, role: "region", "aria-label": ariaLabel, children: children })) })));
});
