import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { DEFAULT_OVERLAY_SURFACE_BREAKPOINT, useResponsiveOverlaySurface, } from '../assets/adapters/react/use-responsive-overlay-surface';
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock';
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader';
import { Calendar } from '../Calendar/Calendar';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { Icon } from '../Icon/Icon';
import { cn } from '../assets/utils';
import { connectDate, dateMachine, } from '../assets/machines/date.machine';
import { extractDatePart, getDefaultViews, getHourGrid, getMinuteGrid, getMonthGrid, getYearGrid, isTimeDisabled, normalizeISOValue, parseDateLike, toISODate, toISODateTime, } from '../assets/date-utils';
function normalizeIsoPoint(input) {
    const parsed = parseDateLike(input !== null && input !== void 0 ? input : null);
    return parsed ? toISODateTime(parsed) : null;
}
function normalizeDateList(values) {
    if (!Array.isArray(values))
        return [];
    return values
        .map((item) => {
        const d = parseDateLike(item);
        return d ? toISODate(d) : null;
    })
        .filter((item) => Boolean(item));
}
function getDefaultPresets(locale) {
    const now = new globalThis.Date();
    const today = new globalThis.Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new globalThis.Date(today);
    yesterday.setDate(today.getDate() - 1);
    const last7Start = new globalThis.Date(today);
    last7Start.setDate(today.getDate() - 6);
    return [
        { label: 'Today', value: toISODate(today) },
        { label: 'Yesterday', value: toISODate(yesterday) },
        {
            label: 'Last 7 days',
            value: {
                start: toISODate(last7Start),
                end: toISODate(today),
            },
        },
        {
            label: locale.startsWith('ru') ? 'Текущий месяц' : 'This month',
            value: {
                start: toISODate(new globalThis.Date(today.getFullYear(), today.getMonth(), 1)),
                end: toISODate(new globalThis.Date(today.getFullYear(), today.getMonth() + 1, 0)),
            },
        },
    ];
}
function viewLabel(view) {
    switch (view) {
        case 'day': return 'Day';
        case 'month': return 'Month';
        case 'year': return 'Year';
        case 'hours': return 'Hour';
        case 'minutes': return 'Minute';
        default: return String(view);
    }
}
export const Date = forwardRef(function Date(props, ref) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { mode = 'date', selection = 'single', views: viewsProp, openTo, value, defaultValue = null, onValueChange, onOpenChange, valueFormat = 'iso', locale = 'en-US', timezone = 'UTC', weekStartsOn = 1, min = null, max = null, disabledDates = [], disabledTime, closeOnSelect = mode === 'date' && selection === 'single', showNow = true, showClear = true, showPresets = false, presets, surface = 'auto', surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT, surfaceTitle, label, description, error, required = false, disabled = false, readOnly = false, placeholder = mode === 'time' ? 'Pick time' : 'Pick date', membrane = true, fullWidth = true, className, } = props;
    const resolvedViews = useMemo(() => (Array.isArray(viewsProp) && viewsProp.length > 0 ? viewsProp : getDefaultViews(mode)), [viewsProp, mode]);
    const controlledNormalized = useControllableMachineProp(value !== undefined ? normalizeISOValue(value) : undefined, normalizeISOValue(defaultValue));
    const normalizedSingle = controlledNormalized === undefined
        ? undefined
        : (typeof controlledNormalized === 'string' ? controlledNormalized : null);
    const normalizedRange = controlledNormalized === undefined
        ? undefined
        : (controlledNormalized && typeof controlledNormalized === 'object' && 'start' in controlledNormalized
            ? { start: (_a = controlledNormalized.start) !== null && _a !== void 0 ? _a : null, end: (_b = controlledNormalized.end) !== null && _b !== void 0 ? _b : null }
            : { start: null, end: null });
    const { state, send } = useMachine(dateMachine, {
        mode,
        selection,
        views: resolvedViews,
        view: openTo && resolvedViews.includes(openTo) ? openTo : resolvedViews[0],
        valueFormat,
        valueSingle: normalizedSingle,
        valueRange: normalizedRange,
        locale,
        timezone,
        weekStartsOn,
        min: normalizeIsoPoint(min),
        max: normalizeIsoPoint(max),
        disabledDates: normalizeDateList(disabledDates),
        disabledTime: disabledTime !== null && disabledTime !== void 0 ? disabledTime : null,
        closeOnSelect,
        disabled,
        readOnly,
        placeholder,
        onValueChange,
        onOpenChange,
    });
    const api = connectDate(state, send);
    const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint);
    useBodyScrollLock(api.open && resolvedSurface === 'sheet');
    const rootRef = useRef(null);
    useEffect(() => {
        if (!api.open || resolvedSurface !== 'popover')
            return;
        const handlePointerDown = (event) => {
            var _a;
            const target = event.target;
            if (!target)
                return;
            if ((_a = rootRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))
                return;
            send({ type: 'CLOSE' });
        };
        window.addEventListener('mousedown', handlePointerDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
        };
    }, [api.open, resolvedSurface, send]);
    const selectedDateForCalendar = useMemo(() => {
        var _a, _b;
        if (api.selection === 'range') {
            const start = extractDatePart((_b = (_a = api.valueRange) === null || _a === void 0 ? void 0 : _a.start) !== null && _b !== void 0 ? _b : null);
            if (!start)
                return null;
            const d = parseDateLike(start);
            return d !== null && d !== void 0 ? d : null;
        }
        if (!api.valueSingle)
            return null;
        const datePart = extractDatePart(api.valueSingle);
        if (!datePart)
            return null;
        return parseDateLike(datePart);
    }, [api.selection, api.valueRange, api.valueSingle]);
    const mergedRef = (node) => {
        rootRef.current = node;
        if (typeof ref === 'function')
            ref(node);
        else if (ref && typeof ref === 'object')
            ref.current = node;
    };
    const presetsList = Array.isArray(presets) && presets.length > 0 ? presets : getDefaultPresets(locale);
    const contentProps = api.getContentProps();
    const sheetTitle = (_c = surfaceTitle !== null && surfaceTitle !== void 0 ? surfaceTitle : label) !== null && _c !== void 0 ? _c : (mode === 'time' ? 'Choose time' : 'Choose date');
    const baseDate = (_e = parseDateLike((_d = extractDatePart(api.valueSingle)) !== null && _d !== void 0 ? _d : null)) !== null && _e !== void 0 ? _e : new globalThis.Date();
    const yearGrid = getYearGrid(baseDate.getFullYear(), 6);
    const monthGrid = getMonthGrid(locale);
    const hours = getHourGrid(1);
    const minutes = getMinuteGrid(5);
    const contentPanel = (_jsxs("div", { className: "uf-date__contentPanel", children: [resolvedSurface === 'sheet' ? (_jsx(ResponsiveSheetHeader, { title: sheetTitle, onClose: () => send({ type: 'CLOSE' }) })) : null, _jsx("div", { className: "uf-date__toolbar", children: api.views.map((view) => (_jsx("span", { className: "uf-membrane", children: _jsx(Button, Object.assign({}, api.getViewSwitchProps(view), { text: viewLabel(view), fullWidth: false, membrane: false, variant: api.view === view ? 'default' : 'ghost' })) }, view))) }), _jsxs("div", { className: "uf-date__panel", children: [api.view === 'day' ? (_jsx(Calendar, { value: selectedDateForCalendar, onValueChange: (details) => {
                            const date = details === null || details === void 0 ? void 0 : details.value;
                            if (!date)
                                return;
                            const iso = toISODate(date);
                            send({ type: 'SELECT_DAY', date: iso });
                        }, min: (_f = parseDateLike(min)) !== null && _f !== void 0 ? _f : undefined, max: (_g = parseDateLike(max)) !== null && _g !== void 0 ? _g : undefined, disabledDates: normalizeDateList(disabledDates).map((iso) => parseDateLike(iso)).filter((d) => Boolean(d)), locale: locale, weekStartsOn: weekStartsOn })) : null, api.view === 'month' ? (_jsx("div", { className: "uf-date__grid uf-date__grid--month", children: monthGrid.map((month) => {
                            const selected = (baseDate.getMonth() + 1) === month.value;
                            return (_jsx("span", { className: "uf-membrane", children: _jsx(Button, { text: month.label, fullWidth: true, membrane: false, variant: selected ? 'default' : 'ghost', onClick: () => send({ type: 'SELECT_MONTH', month: month.value }) }) }, month.value));
                        }) })) : null, api.view === 'year' ? (_jsx("div", { className: "uf-date__grid uf-date__grid--year", children: yearGrid.map((year) => {
                            const selected = baseDate.getFullYear() === year;
                            return (_jsx("span", { className: "uf-membrane", children: _jsx(Button, { text: String(year), fullWidth: true, membrane: false, variant: selected ? 'default' : 'ghost', onClick: () => send({ type: 'SELECT_YEAR', year }) }) }, year));
                        }) })) : null, api.view === 'hours' ? (_jsx("div", { className: "uf-date__grid uf-date__grid--time", children: hours.map((hour) => {
                            const selected = api.draftHour === hour;
                            const disabledHour = isTimeDisabled(hour, api.draftMinute, disabledTime);
                            return (_jsx("span", { className: "uf-membrane", children: _jsx(Button, { text: String(hour).padStart(2, '0'), fullWidth: true, membrane: false, variant: selected ? 'default' : 'ghost', disabled: disabledHour, onClick: () => send({ type: 'SELECT_HOUR', hour }) }) }, `hour:${hour}`));
                        }) })) : null, api.view === 'minutes' ? (_jsx("div", { className: "uf-date__grid uf-date__grid--time", children: minutes.map((minute) => {
                            const selected = api.draftMinute === minute;
                            const disabledMinute = isTimeDisabled(api.draftHour, minute, disabledTime);
                            return (_jsx("span", { className: "uf-membrane", children: _jsx(Button, { text: String(minute).padStart(2, '0'), fullWidth: true, membrane: false, variant: selected ? 'default' : 'ghost', disabled: disabledMinute, onClick: () => send({ type: 'SELECT_MINUTE', minute }) }) }, `minute:${minute}`));
                        }) })) : null] }), showPresets ? (_jsx("div", { className: "uf-date__presets", children: presetsList.map((preset) => (_jsx("span", { className: "uf-membrane", children: _jsx(Button, Object.assign({}, api.getPresetProps(preset.value), { text: preset.label, fullWidth: true, membrane: false, variant: "ghost" })) }, preset.label))) })) : null, _jsxs("div", { className: "uf-date__footer", children: [showClear ? (_jsx("span", { className: "uf-membrane", children: _jsx(Button, Object.assign({}, api.getClearProps(), { text: "Clear", fullWidth: false, membrane: false, variant: "ghost" })) })) : null, showNow ? (_jsx("span", { className: "uf-membrane", children: _jsx(Button, Object.assign({}, api.getNowProps(), { text: "Now", fullWidth: false, membrane: false, variant: "default" })) })) : null] })] }));
    return (_jsxs("div", Object.assign({ ref: mergedRef }, api.getRootProps(), { className: cn('uf-date', className), "data-full-width": fullWidth ? '' : undefined, children: [label != null ? (_jsxs(Text, { as: "label", variant: "label", className: "uf-date__label", children: [label, required ? ' *' : null] })) : null, _jsxs("div", { className: "uf-date__triggerWrap", children: [membrane ? (_jsx("span", { className: cn('uf-membrane', fullWidth && 'uf-membrane--full'), children: _jsxs("button", Object.assign({}, api.getTriggerProps(), { className: "uf-date__trigger", disabled: disabled, children: [_jsx(Text, { as: "span", membrane: false, inset: "none", className: "uf-date__value", children: api.triggerLabel }), _jsx("span", { className: "uf-date__icon", "aria-hidden": "true", children: _jsx(Icon, { name: "date", size: 16 }) })] })) })) : (_jsxs("button", Object.assign({}, api.getTriggerProps(), { className: "uf-date__trigger", disabled: disabled, children: [_jsx(Text, { as: "span", membrane: false, inset: "none", className: "uf-date__value", children: api.triggerLabel }), _jsx("span", { className: "uf-date__icon", "aria-hidden": "true", children: _jsx(Icon, { name: "date", size: 16 }) })] }))), resolvedSurface === 'sheet' ? (_jsx("div", { className: "uf-responsive-overlay-backdrop", "data-state": api.open ? 'open' : 'closed', onClick: () => send({ type: 'CLOSE' }) })) : null, _jsx("div", Object.assign({}, contentProps, { className: "uf-date__content", "data-surface": resolvedSurface, children: membrane ? (_jsx("span", { className: "uf-membrane uf-date__contentMembrane", children: contentPanel })) : contentPanel }))] }), description ? (_jsx(Text, { as: "div", variant: "caption", className: "uf-date__description", children: description })) : null, error ? (_jsx(Text, { as: "div", variant: "caption", className: "uf-date__error", children: error })) : null] })));
});
