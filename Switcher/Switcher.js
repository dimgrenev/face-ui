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
 * Switcher — binary toggle control with thumb animation.
 *
 * `<Switcher label="Dark mode" />`
 * `<Switcher checked disabled />`
 * `<Switcher text="Accept terms" withText />`
 * `<Switcher text="Long description..." withText textWrap="wrap" />`
 */
import { forwardRef, useId } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { switcherMachine, connectSwitcher } from '../assets/machines/switcher.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Switcher = forwardRef(function Switcher(props, ref) {
    const { checked, defaultChecked, disabled = false, required = false, name = '', value = 'on', label, text, withText = true, textWrap = 'truncate', onCheckedChange, onChange, className, membrane = true } = props, rest = __rest(props, ["checked", "defaultChecked", "disabled", "required", "name", "value", "label", "text", "withText", "textWrap", "onCheckedChange", "onChange", "className", "membrane"]);
    const resolvedChecked = useControllableMachineProp(checked !== undefined ? checked : undefined, defaultChecked !== null && defaultChecked !== void 0 ? defaultChecked : false);
    const { state, send } = useMachine(switcherMachine, {
        checked: resolvedChecked,
        disabled,
        required,
        name,
        value,
        onCheckedChange: ((details) => {
            try {
                onCheckedChange === null || onCheckedChange === void 0 ? void 0 : onCheckedChange(details);
            }
            catch (_a) { }
            try {
                onChange === null || onChange === void 0 ? void 0 : onChange(details.checked);
            }
            catch (_b) { }
        }),
    });
    const api = connectSwitcher(state, send);
    const generatedLabelId = useId();
    // Determine label content: explicit `label` prop takes priority, then `text` when `withText`
    const labelContent = label !== null && label !== void 0 ? label : (withText && text ? text : null);
    const hasLabel = labelContent != null;
    const labelId = hasLabel ? `${generatedLabelId}-label` : undefined;
    const switchOnly = !hasLabel;
    const rootNode = (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), rest, { "data-switch-only": switchOnly || undefined, "data-text-wrap": textWrap === 'wrap' || undefined, className: cn('uf-switcher', className), children: [hasLabel && (_jsx("label", Object.assign({}, api.getLabelProps(), { id: labelId, children: _jsx(Text, { as: "span", variant: "body", inset: "none", membrane: false, children: labelContent }) }))), _jsx("div", Object.assign({}, api.getControlProps(), { "aria-labelledby": labelId, children: _jsx("span", Object.assign({}, api.getThumbProps())) })), _jsx("input", Object.assign({}, api.getHiddenInputProps()))] })));
    if (!membrane)
        return rootNode;
    return _jsx("span", { className: "uf-membrane uf-membrane--full", children: rootNode });
});
