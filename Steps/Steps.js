import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Steps — step-by-step wizard navigation.
 *
 * Supports linear (no skipping) and non-linear modes.
 * Only the active step's content panel is visible.
 *
 * `<Steps items={[{ label: 'Account' }, { label: 'Profile' }]} step={0} />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { stepsMachine, connectSteps } from '../assets/machines/steps.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
function getCircledStepSymbol(stepNumber) {
    const symbols = [
        '①', '②', '③', '④', '⑤',
        '⑥', '⑦', '⑧', '⑨', '⑩',
        '⑪', '⑫', '⑬', '⑭', '⑮',
        '⑯', '⑰', '⑱', '⑲', '⑳',
    ];
    if (stepNumber >= 1 && stepNumber <= symbols.length) {
        return symbols[stepNumber - 1];
    }
    return String(stepNumber);
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Steps = forwardRef(function Steps(props, ref) {
    const { items: rawItems, step, defaultStep = 0, linear = true, disabled = false, onStepChange, className, } = props;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const machineStep = useControllableMachineProp(step, defaultStep);
    const { state, send } = useMachine(stepsMachine, {
        step: machineStep,
        total: items.length,
        linear,
        disabled,
        onStepChange: onStepChange !== null && onStepChange !== void 0 ? onStepChange : null,
    });
    const api = connectSteps(state, send);
    return (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-steps', className), children: [_jsx("div", { className: "uf-steps-list", children: items.map((item, index) => (_jsx("div", Object.assign({}, api.getItemProps(index), { className: "uf-steps-item", children: _jsx("span", { className: "uf-membrane", children: _jsxs("button", Object.assign({}, api.getTriggerProps(index), { className: "uf-steps-trigger uf-option uf-control", children: [_jsx("span", Object.assign({}, api.getIndicatorProps(index), { className: "uf-steps-indicator", children: getCircledStepSymbol(index + 1) })), _jsx("span", { className: "uf-steps-label", children: item.label })] })) }) }), index))) }), items.map((item, index) => item.content != null ? (_jsx("div", Object.assign({}, api.getContentProps(index), { children: typeof item.content === 'string' || typeof item.content === 'number'
                    ? (_jsx(Text, { as: "div", align: "left", fullWidth: true, children: String(item.content) }))
                    : item.content }), index)) : null)] })));
});
