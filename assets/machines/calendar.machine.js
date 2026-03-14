/**
 * Calendar Machine
 *
 * States: idle | focused
 * Standalone date grid for date selection.
 * All dates stored as ISO strings (YYYY-MM-DD) for serializability.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const calendarAnatomy = createAnatomy('calendar').parts('root', 'header', 'prevButton', 'nextButton', 'title', 'grid', 'weekday', 'day');
// ---------------------------------------------------------------------------
// Date helpers (ISO string based)
// ---------------------------------------------------------------------------
function toISODate(year, month, day) {
    const y = String(year).padStart(4, '0');
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
}
function todayISO() {
    const d = new Date();
    return toISODate(d.getFullYear(), d.getMonth(), d.getDate());
}
function addMonths(iso, count) {
    const { year, month } = parseISO(iso);
    const d = new Date(year, month + count, 1);
    return toISODate(d.getFullYear(), d.getMonth(), 1);
}
function addDays(iso, count) {
    const { year, month, day } = parseISO(iso);
    const d = new Date(year, month, day + count);
    return toISODate(d.getFullYear(), d.getMonth(), d.getDate());
}
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getDayOfWeek(iso) {
    const { year, month, day } = parseISO(iso);
    return new Date(year, month, day).getDay();
}
function isDateDisabled(iso, min, max, disabledDates) {
    if (min && iso < min)
        return true;
    if (max && iso > max)
        return true;
    return disabledDates.includes(iso);
}
function buildDaysGrid(viewDate, value, focusedDate, min, max, disabledDates, weekStartsOn) {
    const { year, month } = parseISO(viewDate);
    const today = todayISO();
    const daysInMonth = getDaysInMonth(year, month);
    // Day of week of the 1st of the month
    const firstDayISO = toISODate(year, month, 1);
    const firstDow = getDayOfWeek(firstDayISO);
    // How many days from previous month to show
    const leadingDays = (firstDow - weekStartsOn + 7) % 7;
    const days = [];
    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    for (let i = leadingDays - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const iso = toISODate(prevYear, prevMonth, d);
        days.push({
            date: iso,
            dayOfMonth: d,
            isCurrentMonth: false,
            isToday: iso === today,
            isSelected: iso === value,
            isDisabled: isDateDisabled(iso, min, max, disabledDates),
            isFocused: iso === focusedDate,
        });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const iso = toISODate(year, month, d);
        days.push({
            date: iso,
            dayOfMonth: d,
            isCurrentMonth: true,
            isToday: iso === today,
            isSelected: iso === value,
            isDisabled: isDateDisabled(iso, min, max, disabledDates),
            isFocused: iso === focusedDate,
        });
    }
    // Next month days — fill to 42 total (6 rows x 7 columns)
    const remaining = 42 - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
        const iso = toISODate(nextYear, nextMonth, d);
        days.push({
            date: iso,
            dayOfMonth: d,
            isCurrentMonth: false,
            isToday: iso === today,
            isSelected: iso === value,
            isDisabled: isDateDisabled(iso, min, max, disabledDates),
            isFocused: iso === focusedDate,
        });
    }
    return days;
}
function getMonthLabel(viewDate, locale) {
    const { year, month } = parseISO(viewDate);
    const d = new Date(year, month, 1);
    try {
        const monthName = d.toLocaleDateString(locale, { month: 'long' }).trim();
        return `${monthName} ${year}`;
    }
    catch (_a) {
        const monthName = d.toLocaleDateString('en-US', { month: 'long' }).trim();
        return `${monthName} ${year}`;
    }
}
function getWeekdayLabels(weekStartsOn, locale) {
    const labels = [];
    // Start from a known Sunday (Jan 4, 1970 is a Sunday)
    const base = new Date(1970, 0, 4);
    for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + ((weekStartsOn + i) % 7));
        try {
            labels.push(d.toLocaleDateString(locale, { weekday: 'short' }));
        }
        catch (_a) {
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }
    }
    return labels;
}
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
const initialToday = todayISO();
export const calendarMachine = createMachine({
    id: 'calendar',
    initial: 'idle',
    context: {
        value: null,
        focusedDate: initialToday,
        viewDate: initialToday.slice(0, 7) + '-01',
        min: null,
        max: null,
        disabledDates: [],
        weekStartsOn: 0,
        locale: 'en-US',
        onValueChange: null,
    },
    watch: {
        value(ctx) {
            var _a;
            if (ctx.value) {
                (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
            }
        },
    },
    computed: {
        days: (ctx) => buildDaysGrid(ctx.viewDate, ctx.value, ctx.focusedDate, ctx.min, ctx.max, ctx.disabledDates, ctx.weekStartsOn),
        monthLabel: (ctx) => getMonthLabel(ctx.viewDate, ctx.locale),
        yearLabel: (ctx) => parseISO(ctx.viewDate).year.toString(),
        weekdayLabels: (ctx) => getWeekdayLabels(ctx.weekStartsOn, ctx.locale),
    },
    states: {
        idle: {
            on: {
                FOCUS: {
                    target: 'focused',
                },
                SELECT_DATE: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            if (isDateDisabled(e.date, ctx.min, ctx.max, ctx.disabledDates))
                                return;
                            ctx.value = e.date;
                            ctx.focusedDate = e.date;
                            // Ensure viewDate shows the selected month
                            ctx.viewDate = e.date.slice(0, 7) + '-01';
                        },
                    ],
                },
                PREV_MONTH: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, -1);
                        },
                    ],
                },
                NEXT_MONTH: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, 1);
                        },
                    ],
                },
                PREV_YEAR: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, -12);
                        },
                    ],
                },
                NEXT_YEAR: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, 12);
                        },
                    ],
                },
            },
        },
        focused: {
            on: {
                BLUR: {
                    target: 'idle',
                },
                SELECT_DATE: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            if (isDateDisabled(e.date, ctx.min, ctx.max, ctx.disabledDates))
                                return;
                            ctx.value = e.date;
                            ctx.focusedDate = e.date;
                            ctx.viewDate = e.date.slice(0, 7) + '-01';
                        },
                    ],
                },
                FOCUS_DATE: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            ctx.focusedDate = e.date;
                            // If focused date moves outside current view, update viewDate
                            const focusedMonth = e.date.slice(0, 7) + '-01';
                            if (focusedMonth !== ctx.viewDate) {
                                ctx.viewDate = focusedMonth;
                            }
                        },
                    ],
                },
                KEY_DOWN: {
                    actions: [
                        (ctx, event) => {
                            const e = event;
                            let nextDate = ctx.focusedDate;
                            switch (e.key) {
                                case 'ArrowRight':
                                    nextDate = addDays(ctx.focusedDate, 1);
                                    break;
                                case 'ArrowLeft':
                                    nextDate = addDays(ctx.focusedDate, -1);
                                    break;
                                case 'ArrowDown':
                                    nextDate = addDays(ctx.focusedDate, 7);
                                    break;
                                case 'ArrowUp':
                                    nextDate = addDays(ctx.focusedDate, -7);
                                    break;
                                case 'Home': {
                                    // Go to start of week
                                    const dow = getDayOfWeek(ctx.focusedDate);
                                    const diff = (dow - ctx.weekStartsOn + 7) % 7;
                                    nextDate = addDays(ctx.focusedDate, -diff);
                                    break;
                                }
                                case 'End': {
                                    // Go to end of week
                                    const dow = getDayOfWeek(ctx.focusedDate);
                                    const diff = (6 - ((dow - ctx.weekStartsOn + 7) % 7));
                                    nextDate = addDays(ctx.focusedDate, diff);
                                    break;
                                }
                                case 'Enter':
                                case ' ':
                                    if (!isDateDisabled(ctx.focusedDate, ctx.min, ctx.max, ctx.disabledDates)) {
                                        ctx.value = ctx.focusedDate;
                                        ctx.viewDate = ctx.focusedDate.slice(0, 7) + '-01';
                                    }
                                    return;
                                default:
                                    return;
                            }
                            ctx.focusedDate = nextDate;
                            // Update viewDate if needed
                            const focusedMonth = nextDate.slice(0, 7) + '-01';
                            if (focusedMonth !== ctx.viewDate) {
                                ctx.viewDate = focusedMonth;
                            }
                        },
                    ],
                },
                PREV_MONTH: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, -1);
                            ctx.focusedDate = addDays(ctx.focusedDate, -getDaysInMonth(parseISO(ctx.viewDate).year, parseISO(ctx.viewDate).month));
                        },
                    ],
                },
                NEXT_MONTH: {
                    actions: [
                        (ctx) => {
                            const prev = ctx.viewDate;
                            ctx.viewDate = addMonths(prev, 1);
                            ctx.focusedDate = addDays(ctx.focusedDate, getDaysInMonth(parseISO(prev).year, parseISO(prev).month));
                        },
                    ],
                },
                PREV_YEAR: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, -12);
                            ctx.focusedDate = addMonths(ctx.focusedDate.slice(0, 7) + '-' + ctx.focusedDate.slice(8), -12);
                        },
                    ],
                },
                NEXT_YEAR: {
                    actions: [
                        (ctx) => {
                            ctx.viewDate = addMonths(ctx.viewDate, 12);
                            ctx.focusedDate = addMonths(ctx.focusedDate.slice(0, 7) + '-' + ctx.focusedDate.slice(8), 12);
                        },
                    ],
                },
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectCalendar(state, send) {
    const ctx = state.context;
    const isFocused = state.matches('focused');
    const days = state.computed['days'];
    const monthLabel = state.computed['monthLabel'];
    const weekdayLabels = state.computed['weekdayLabels'];
    return {
        /** Computed accessors */
        days,
        monthLabel,
        weekdayLabels,
        value: ctx.value,
        focusedDate: ctx.focusedDate,
        isFocused,
        getRootProps() {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('root')), { role: 'group', 'aria-label': 'Calendar', onFocus() {
                    if (!isFocused)
                        send({ type: 'FOCUS' });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                } });
        },
        getHeaderProps() {
            return Object.assign({}, calendarAnatomy.getPartAttrs('header'));
        },
        getPrevMonthProps() {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('prevButton')), { type: 'button', 'aria-label': 'Previous month', onClick() {
                    send({ type: 'PREV_MONTH' });
                } });
        },
        getNextMonthProps() {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('nextButton')), { type: 'button', 'aria-label': 'Next month', onClick() {
                    send({ type: 'NEXT_MONTH' });
                } });
        },
        getTitleProps() {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('title')), { 'aria-live': 'polite' });
        },
        getGridProps() {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('grid')), { role: 'grid', 'aria-label': monthLabel, onKeyDown(event) {
                    const handledKeys = [
                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                        'Home', 'End', 'Enter', ' ',
                    ];
                    if (handledKeys.includes(event.key)) {
                        event.preventDefault();
                        send({ type: 'KEY_DOWN', key: event.key });
                    }
                } });
        },
        getWeekdayProps(index) {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('weekday')), { 'aria-label': weekdayLabels[index], role: 'columnheader' });
        },
        getDayProps(day) {
            return Object.assign(Object.assign({}, calendarAnatomy.getPartAttrs('day')), { role: 'gridcell', tabIndex: day.isFocused ? 0 : -1, 'aria-selected': day.isSelected || undefined, 'aria-disabled': day.isDisabled || undefined, 'data-selected': day.isSelected || undefined, 'data-today': day.isToday || undefined, 'data-disabled': day.isDisabled || undefined, 'data-outside': !day.isCurrentMonth || undefined, 'data-focused': day.isFocused || undefined, 'data-date': day.date, onClick() {
                    if (!day.isDisabled) {
                        send({ type: 'SELECT_DATE', date: day.date });
                    }
                },
                onFocus() {
                    send({ type: 'FOCUS_DATE', date: day.date });
                } });
        },
    };
}
