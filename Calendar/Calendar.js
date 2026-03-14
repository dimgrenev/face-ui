import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Calendar — standalone date picker grid.
 *
 * `<Calendar value={date} onValueChange={({ value }) => setDate(value)} />`
 *
 * Public API uses Date objects. Internal machine uses ISO strings.
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { calendarMachine, connectCalendar } from '../assets/machines/calendar.machine';
import { cn } from '../assets/utils';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Date <-> ISO helpers
// ---------------------------------------------------------------------------
function dateToISO(d) {
    const y = String(d.getFullYear()).padStart(4, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function isoToDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}
function getViewDate(value, defaultValue) {
    if (value)
        return dateToISO(value).slice(0, 7) + '-01';
    if (defaultValue)
        return dateToISO(defaultValue).slice(0, 7) + '-01';
    const now = new Date();
    return dateToISO(now).slice(0, 7) + '-01';
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Calendar = forwardRef(function Calendar(props, ref) {
    const { value, defaultValue, min, max, disabledDates = [], locale = 'en-US', weekStartsOn = 0, onValueChange, className, } = props;
    const selectedISO = useControllableMachineProp(value !== undefined ? (value ? dateToISO(value) : null) : undefined, defaultValue ? dateToISO(defaultValue) : null);
    const viewDate = useControllableMachineProp(undefined, getViewDate(value, defaultValue));
    const focusedDate = useControllableMachineProp(undefined, selectedISO !== null && selectedISO !== void 0 ? selectedISO : viewDate);
    const handleValueChange = onValueChange
        ? (details) => {
            onValueChange({ value: isoToDate(details.value) });
        }
        : null;
    const { state, send } = useMachine(calendarMachine, {
        value: selectedISO !== null && selectedISO !== void 0 ? selectedISO : undefined,
        viewDate: viewDate !== null && viewDate !== void 0 ? viewDate : undefined,
        focusedDate: focusedDate !== null && focusedDate !== void 0 ? focusedDate : undefined,
        min: min ? dateToISO(min) : undefined,
        max: max ? dateToISO(max) : undefined,
        disabledDates: disabledDates.map(dateToISO),
        locale,
        weekStartsOn,
        onValueChange: handleValueChange,
    });
    const api = connectCalendar(state, send);
    return (_jsxs("div", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-calendar', className), children: [_jsxs("div", Object.assign({}, api.getHeaderProps(), { children: [_jsx(Button, Object.assign({}, api.getPrevMonthProps(), { icon: _jsx(Icon, { name: "left", size: 16 }), iconOnly: true, fullWidth: false, className: "uf-calendar-navButton" })), _jsx(Text, Object.assign({}, api.getTitleProps(), { as: "div", text: api.monthLabel, variant: "label", align: "center", fullWidth: true, className: "uf-calendar-titleText" })), _jsx(Button, Object.assign({}, api.getNextMonthProps(), { icon: _jsx(Icon, { name: "right", size: 16 }), iconOnly: true, fullWidth: false, className: "uf-calendar-navButton" }))] })), _jsxs("table", Object.assign({}, api.getGridProps(), { children: [_jsx("thead", { children: _jsx("tr", { children: api.weekdayLabels.map((label, i) => {
                                var _a;
                                const firstLetter = (_a = Array.from(String(label || '').trim())[0]) !== null && _a !== void 0 ? _a : '';
                                return (_jsx("th", Object.assign({}, api.getWeekdayProps(i), { children: _jsx(Text, { as: "span", text: firstLetter, variant: "caption", inset: "none", className: "uf-calendar-weekdayText" }) }), i));
                            }) }) }), _jsx("tbody", { children: Array.from({ length: 6 }, (_, weekIndex) => (_jsx("tr", { children: api.days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => (_jsx("td", { children: _jsx(Button, Object.assign({}, api.getDayProps(day), { text: String(day.dayOfMonth), fullWidth: true, className: "uf-calendar-dayButton" })) }, day.date))) }, weekIndex))) })] }))] })));
});
