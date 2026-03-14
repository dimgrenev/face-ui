import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Progress — data display indicator.
 *
 * Shows loading progress as a bar with track + indicator.
 * Pass value=-1 for indeterminate state.
 *
 * `<Progress value={50} max={100} />`
 * `<Progress value={-1} label="Loading..." />`
 * `<Progress value={75} variant="success" showLabel />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { progressMachine, connectProgress } from '../assets/machines/progress.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Progress = forwardRef(function Progress(props, ref) {
    const { value, max = 100, variant = 'default', showLabel = false, label, className, } = props;
    const { state, send } = useMachine(progressMachine, {
        value,
        max,
    });
    const api = connectProgress(state, send);
    return (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), { "data-variant": variant, className: cn('uf-progress', className), children: [label != null && (_jsx(Text, Object.assign({ as: "span", inset: "none", membrane: false }, api.getLabelProps(), { children: label }))), _jsx("div", Object.assign({}, api.getTrackProps(), { children: _jsx("div", Object.assign({}, api.getIndicatorProps())) })), showLabel && (_jsxs(Text, { as: "span", inset: "none", membrane: false, className: "uf-progress-label", children: [Math.round(api.percent), "%"] }))] })));
});
