import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Slider — range input with single or multiple thumbs.
 *
 * `<Slider value={[50]} />`
 * `<Slider value={[20, 80]} label="Price range" />`
 * `<Slider variant="advanced" defaultValue={[42]} crop leading="iconText" leadingIcon="crop" leadingText="Crop" />`
 */
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { sliderMachine, connectSlider } from '../assets/machines/slider.machine';
import { cn } from '../assets/utils';
import { Text } from '../Text/Text';
import { SliderAdvanced, } from './SliderAdvanced';
function normalizeValues(input) {
    if (Array.isArray(input)) {
        const next = input
            .map((entry) => Number(entry))
            .filter((entry) => Number.isFinite(entry));
        return next.length > 0 ? next : undefined;
    }
    if (typeof input === 'number' && Number.isFinite(input)) {
        return [input];
    }
    return undefined;
}
export const Slider = forwardRef(function Slider({ variant = 'simple', value, defaultValue, scalarValue, min = 0, max = 100, step = 1, disabled = false, orientation = 'horizontal', label, onValueChange, onChange, leading = 'none', leadingIcon, leadingText, crop = false, defaultCropRange, cropRange, cropLocksValue = true, onCropChange, className, }, ref) {
    var _a, _b;
    const controlledValue = normalizeValues(value);
    const defaultValues = normalizeValues(defaultValue);
    const advancedFeaturesRequested = variant === 'advanced' ||
        scalarValue !== undefined ||
        typeof onChange === 'function' ||
        leading !== 'none' ||
        leadingIcon != null ||
        leadingText != null ||
        crop ||
        defaultCropRange != null ||
        cropRange != null ||
        cropLocksValue !== true;
    const canRenderAdvanced = orientation === 'horizontal' &&
        ((_b = (_a = controlledValue === null || controlledValue === void 0 ? void 0 : controlledValue.length) !== null && _a !== void 0 ? _a : defaultValues === null || defaultValues === void 0 ? void 0 : defaultValues.length) !== null && _b !== void 0 ? _b : 1) <= 1;
    if (advancedFeaturesRequested && canRenderAdvanced) {
        return (_jsx(SliderAdvanced, { rootRef: ref, value: controlledValue, defaultValue: defaultValues, scalarValue: scalarValue, min: min, max: max, step: step, disabled: disabled, label: label, onValueChange: onValueChange, onChange: onChange, leading: leading, leadingIcon: leadingIcon, leadingText: leadingText, crop: crop, defaultCropRange: defaultCropRange, cropRange: cropRange, cropLocksValue: cropLocksValue, onCropChange: onCropChange, className: className }));
    }
    const initialValue = defaultValues !== null && defaultValues !== void 0 ? defaultValues : (typeof scalarValue === 'number' && Number.isFinite(scalarValue) ? [scalarValue] : [0]);
    const machineValue = useControllableMachineProp(controlledValue, initialValue);
    const handleValueChange = (details) => {
        var _a, _b;
        try {
            onValueChange === null || onValueChange === void 0 ? void 0 : onValueChange(details);
        }
        catch (_c) { }
        if (typeof onChange === 'function') {
            try {
                onChange(Number((_b = (_a = details === null || details === void 0 ? void 0 : details.value) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 0));
            }
            catch (_d) { }
        }
    };
    const { state, send } = useMachine(sliderMachine, {
        value: machineValue,
        min,
        max,
        step,
        disabled,
        orientation,
        onValueChange: handleValueChange,
    });
    const api = connectSlider(state, send);
    const trackRef = useRef(null);
    const isDragging = state.matches('dragging');
    const renderedValues = state.context.value.length > 0 ? state.context.value : initialValue;
    useEffect(() => {
        if (controlledValue !== undefined)
            return;
        if (state.context.value.length > 0)
            return;
        if (!Array.isArray(initialValue) || initialValue.length === 0)
            return;
        send({ type: 'SET_VALUE', value: initialValue });
    }, [controlledValue, initialValue, send, state.context.value.length]);
    const getValueFromPointer = useCallback((event) => {
        const el = trackRef.current;
        if (!el)
            return min;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0)
            return min;
        const ratio = orientation === 'horizontal'
            ? (event.clientX - rect.left) / rect.width
            : (rect.bottom - event.clientY) / rect.height;
        const clamped = Math.min(1, Math.max(0, ratio));
        return min + clamped * (max - min);
    }, [max, min, orientation]);
    useEffect(() => {
        if (!isDragging || disabled)
            return undefined;
        const onPointerMove = (event) => {
            const nextValue = getValueFromPointer(event);
            send({ type: 'DRAG', value: nextValue });
        };
        const onPointerUp = () => {
            send({ type: 'DRAG_END' });
        };
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        return () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };
    }, [disabled, getValueFromPointer, isDragging, send]);
    const handleTrackPointerDown = (event) => {
        var _a, _b;
        if (disabled)
            return;
        const currentValues = renderedValues;
        const nextValue = getValueFromPointer(event);
        const nearestIndex = (_b = (_a = currentValues
            .map((current, index) => ({ index, distance: Math.abs(current - nextValue) }))
            .sort((left, right) => left.distance - right.distance)[0]) === null || _a === void 0 ? void 0 : _a.index) !== null && _b !== void 0 ? _b : 0;
        send({ type: 'DRAG_START', index: nearestIndex });
        send({ type: 'DRAG', value: nextValue });
    };
    return (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-slider', className), children: [label != null && (_jsx(Text, Object.assign({}, api.getLabelProps(), { as: "label", variant: "label", children: label }))), _jsxs("div", Object.assign({}, api.getTrackProps(), { ref: trackRef, onPointerDown: handleTrackPointerDown, className: cn('uf-slider-trackHitArea'), children: [_jsx("div", Object.assign({}, api.getRangeProps())), renderedValues.map((_, index) => (_jsx("div", Object.assign({}, api.getThumbProps(index)), index)))] }))] })));
});
