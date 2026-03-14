import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Toc — table of contents navigation.
 *
 * Renders a list of section links with active-item tracking and
 * an optional animated indicator line (matching the reference library).
 *
 * `<Toc items={[{ id: 'intro', label: 'Introduction' }]} activeId="intro" />`
 * `<Toc items={items} withLine lineSide="left" />`
 * `<Toc items={items} defaultActiveId="setup" />`
 */
import { forwardRef, useRef, useEffect } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { tocMachine, connectToc } from '../assets/machines/toc.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Toc = forwardRef(function Toc(props, ref) {
    var _a, _b;
    const legacyProps = props;
    const { items: rawItems, activeId, defaultActiveId, withLine = true, lineSide = 'left', onActiveChange, className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const resolvedActiveId = useControllableMachineProp(activeId, (_b = defaultActiveId !== null && defaultActiveId !== void 0 ? defaultActiveId : (_a = items[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '');
    const { state, send } = useMachine(tocMachine, {
        items,
        activeId: resolvedActiveId,
        onActiveChange: ((details) => {
            var _a;
            try {
                onActiveChange === null || onActiveChange === void 0 ? void 0 : onActiveChange(details);
            }
            catch (_b) { }
            try {
                (_a = legacyProps.onChange) === null || _a === void 0 ? void 0 : _a.call(legacyProps, details.id);
            }
            catch (_c) { }
        }),
    });
    const api = connectToc(state, send);
    const listRef = useRef(null);
    const indicatorRef = useRef(null);
    // Animate indicator to the active item's position
    useEffect(() => {
        if (!withLine)
            return;
        if (!listRef.current || !indicatorRef.current)
            return;
        const currentId = state.context.activeId;
        if (!currentId)
            return;
        const rows = listRef.current.querySelectorAll('.uf-toc-item[data-active]');
        let target = null;
        rows.forEach((row) => {
            if (row.getAttribute('data-active') != null)
                target = row;
        });
        if (!target)
            return;
        const { offsetTop, offsetHeight } = target;
        indicatorRef.current.style.transform = `translateY(${offsetTop}px)`;
        indicatorRef.current.style.height = `${offsetHeight}px`;
    }, [state.context.activeId, items, withLine]);
    return (_jsx("nav", Object.assign({ ref: ref }, api.getRootProps(), { "data-with-line": withLine || undefined, "data-line-side": withLine ? lineSide : undefined, className: cn('uf-toc', className), children: _jsxs("div", { className: "uf-toc-list", ref: listRef, children: [items.map((item) => {
                    var _a;
                    return (_jsx("div", { className: "uf-toc-slot", children: _jsx(Button, Object.assign({}, (() => {
                            const p = Object.assign({}, api.getItemProps({ id: item.id, disabled: item.disabled }));
                            delete p['data-scope'];
                            return p;
                        })(), { className: "uf-toc-item", align: "left", stretchText: true, level: Math.max(0, ((_a = item.level) !== null && _a !== void 0 ? _a : 1) - 1), membrane: true, variant: "default", children: item.label })) }, item.id));
                }), withLine && _jsx("div", { className: "uf-toc-indicator", ref: indicatorRef })] }) })));
});
