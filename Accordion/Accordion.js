import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Accordion — expandable panel navigation.
 *
 * Also works as a Collapsible with a single item.
 * Flat API: all items rendered from `items` prop.
 *
 * `<Accordion items={[{ value: 'a', label: 'Section A', content: <p>...</p> }]} />`
 * `<Accordion items={[{ value: 'solo', label: 'Toggle', content: <p>...</p> }]} collapsible />`
 */
import { Children, Fragment, forwardRef, isValidElement, useMemo } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { accordionMachine, connectAccordion } from '../assets/machines/accordion.machine';
import { cn } from '../assets/utils';
import { RightIcon } from '../assets/icons';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
function buildDefaultItems() {
    return [
        {
            value: 'getting-started',
            label: 'Getting Started',
            content: (_jsxs(_Fragment, { children: [_jsx(Button, { text: "Install package", variant: "default", align: "left", stretchText: true, membrane: true }), _jsx(Button, { text: "Quick start", variant: "default", align: "left", stretchText: true, membrane: true }), _jsx(Button, { text: "Delete setup", variant: "delete", align: "left", stretchText: true, membrane: true })] })),
        },
        {
            value: 'usage',
            label: 'Usage Guide',
            content: (_jsxs(_Fragment, { children: [_jsx(Button, { text: "Basic usage", variant: "default", align: "left", stretchText: true, membrane: true }), _jsx(Button, { text: "Advanced usage", variant: "default", align: "left", stretchText: true, membrane: true })] })),
        },
        {
            value: 'api',
            label: 'API Reference',
            content: (_jsxs(_Fragment, { children: [_jsx(Button, { text: "Props", variant: "default", align: "left", stretchText: true, membrane: true }), _jsx(Button, { text: "Events", variant: "default", align: "left", stretchText: true, membrane: true })] })),
        },
    ];
}
function flattenAccordionContent(content) {
    var _a;
    try {
        if (content == null)
            return [];
        if (isValidElement(content) && content.type === Fragment) {
            return Children.toArray((_a = content.props) === null || _a === void 0 ? void 0 : _a.children);
        }
        return Children.toArray(content);
    }
    catch (_b) {
        return [];
    }
}
function renderAccordionContentNode(node) {
    if (node == null)
        return null;
    if (isValidElement(node) || Array.isArray(node))
        return node;
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return (_jsx(Text, { as: "div", fullWidth: true, children: String(node) }));
    }
    return node;
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Accordion = forwardRef(function Accordion(props, ref) {
    const legacyProps = props;
    const { items: rawItems, expandedIds, defaultExpandedIds, multiple = false, collapsible = true, disabled = false, onExpandedChange, className, } = props;
    const legacyItems = legacyProps.legacyItems;
    const legacyOnChange = legacyProps.onChange;
    const legacySource = Array.isArray(legacyItems) ? legacyItems : [];
    const fromLegacy = legacySource.map((item, index) => {
        var _a;
        return ({
            value: String((_a = item.id) !== null && _a !== void 0 ? _a : index),
            label: item.summary,
            content: item.content,
            disabled: item.disabled,
        });
    });
    const items = Array.isArray(rawItems) && rawItems.length > 0
        ? rawItems
        : (fromLegacy.length > 0 ? fromLegacy : buildDefaultItems());
    const isControlledExpanded = Array.isArray(expandedIds);
    const controlledExpandedSig = isControlledExpanded
        ? expandedIds.map((id) => String(id)).join('\u0001')
        : '';
    const controlledExpanded = useMemo(() => (isControlledExpanded ? expandedIds.map((id) => String(id)) : []), [isControlledExpanded, controlledExpandedSig]);
    const initialExpanded = controlledExpanded.length > 0
        ? controlledExpanded
        : Array.isArray(defaultExpandedIds) && defaultExpandedIds.length > 0
            ? defaultExpandedIds.map((id) => String(id))
            : legacySource
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.isOpen)
                .map(({ item, index }) => { var _a; return String((_a = item.id) !== null && _a !== void 0 ? _a : index); });
    const machineExpandedIds = useControllableMachineProp(isControlledExpanded ? controlledExpanded : undefined, initialExpanded);
    const machineOptions = {
        expandedIds: machineExpandedIds,
        multiple,
        collapsible,
        disabled,
        onExpandedChange: ((details) => {
            try {
                onExpandedChange === null || onExpandedChange === void 0 ? void 0 : onExpandedChange(details);
            }
            catch (_a) { }
            try {
                legacyOnChange === null || legacyOnChange === void 0 ? void 0 : legacyOnChange(details.expandedIds);
            }
            catch (_b) { }
        }),
    };
    const { state, send } = useMachine(accordionMachine, machineOptions);
    const api = connectAccordion(state, send);
    return (_jsx("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-accordion', className), children: items.map((item) => (_jsxs("div", Object.assign({}, api.getItemProps({ value: item.value, disabled: item.disabled }), { children: [_jsx("span", { className: "uf-membrane uf-membrane--full", children: _jsxs("button", Object.assign({}, api.getTriggerProps({ value: item.value, disabled: item.disabled }), { children: [_jsx("span", { className: "uf-accordion-label uf-text-body", children: item.label }), _jsx("span", { className: "uf-accordion-arrow", "aria-hidden": "true", children: _jsx(RightIcon, {}) })] })) }), _jsx("div", Object.assign({}, api.getContentProps({ value: item.value }), { children: _jsx("div", { className: "uf-accordion-content-inner uf-text-body", children: flattenAccordionContent(item.content).map((node, idx) => (_jsx("div", { className: "uf-accordion-slot", children: renderAccordionContentNode(node) }, `${item.value}:slot:${idx}`))) }) }))] }), item.value))) })));
});
