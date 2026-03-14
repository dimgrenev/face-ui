import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
import { endOfWeek, extractDatePart, formatTriggerValue, isDateDisabled, isTimeDisabled, mergeDateAndTime, normalizeRange, normalizeISOValue, parseDateLike, parseTimeFromISO, startOfWeek, toExternalValue, toISODate, toISODateTime, getDefaultViews, } from '../date-utils';
export const dateAnatomy = createAnatomy('date').parts('root', 'label', 'trigger', 'value', 'icon', 'content', 'toolbar', 'viewSwitch', 'panel', 'footer');
function todayIsoDate() {
    return toISODate(new Date());
}
function toIsoOrNull(input) {
    const parsed = parseDateLike(input !== null && input !== void 0 ? input : null);
    return parsed ? toISODateTime(parsed) : null;
}
function getEffectiveSelection(mode, selection) {
    return mode === 'week' ? 'range' : selection;
}
function getIsoValue(ctx) {
    var _a;
    return getEffectiveSelection(ctx.mode, ctx.selection) === 'range'
        ? ((_a = ctx.valueRange) !== null && _a !== void 0 ? _a : { start: null, end: null })
        : ctx.valueSingle;
}
function emitChange(ctx) {
    var _a;
    const nextIso = getIsoValue(ctx);
    (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: toExternalValue(nextIso, ctx.valueFormat) });
}
function getSingleDatePart(ctx) {
    const source = ctx.valueSingle ? extractDatePart(ctx.valueSingle) : null;
    return source || todayIsoDate();
}
function updateSingle(ctx, dateIso, preserveTime = true) {
    if (ctx.mode === 'date' || ctx.mode === 'week' || ctx.mode === 'month' || ctx.mode === 'year') {
        ctx.valueSingle = dateIso;
        emitChange(ctx);
        return;
    }
    const baseline = preserveTime && ctx.valueSingle ? parseTimeFromISO(ctx.valueSingle) : { hour: ctx.draftHour, minute: ctx.draftMinute };
    const next = mergeDateAndTime(dateIso, baseline.hour, baseline.minute);
    ctx.valueSingle = next;
    emitChange(ctx);
}
function updateRange(ctx, range) {
    var _a, _b;
    ctx.valueRange = range ? normalizeRange((_a = range.start) !== null && _a !== void 0 ? _a : null, (_b = range.end) !== null && _b !== void 0 ? _b : null) : { start: null, end: null };
    emitChange(ctx);
}
function applyIncomingValue(ctx, value) {
    const normalized = normalizeISOValue(value);
    if (normalized && typeof normalized === 'object' && 'start' in normalized) {
        ctx.valueRange = {
            start: normalized.start ? extractDatePart(normalized.start) : null,
            end: normalized.end ? extractDatePart(normalized.end) : null,
        };
        if (normalized.start) {
            const t = parseTimeFromISO(normalized.start);
            ctx.draftHour = t.hour;
            ctx.draftMinute = t.minute;
        }
        return;
    }
    if (typeof normalized === 'string') {
        ctx.valueSingle = normalized;
        const t = parseTimeFromISO(normalized);
        ctx.draftHour = t.hour;
        ctx.draftMinute = t.minute;
        return;
    }
    ctx.valueSingle = null;
    ctx.valueRange = { start: null, end: null };
}
export const dateMachine = createMachine({
    id: 'date',
    initial: 'closed',
    context: {
        open: false,
        mode: 'date',
        selection: 'single',
        views: ['day'],
        view: 'day',
        valueFormat: 'iso',
        valueSingle: null,
        valueRange: { start: null, end: null },
        rangeAnchor: null,
        draftHour: 0,
        draftMinute: 0,
        locale: 'en-US',
        timezone: 'UTC',
        weekStartsOn: 1,
        min: null,
        max: null,
        disabledDates: [],
        disabledTime: null,
        closeOnSelect: true,
        disabled: false,
        readOnly: false,
        placeholder: 'Pick a date',
        onValueChange: null,
        onOpenChange: null,
    },
    watch: {
        open(ctx) {
            var _a;
            (_a = ctx.onOpenChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { open: ctx.open });
        },
    },
    computed: {
        triggerLabel: (ctx) => formatTriggerValue(getIsoValue(ctx), {
            mode: ctx.mode,
            selection: getEffectiveSelection(ctx.mode, ctx.selection),
            locale: ctx.locale,
            timezone: ctx.timezone,
            placeholder: ctx.placeholder,
        }),
        effectiveSelection: (ctx) => getEffectiveSelection(ctx.mode, ctx.selection),
        effectiveViews: (ctx) => {
            const resolved = Array.isArray(ctx.views) && ctx.views.length > 0 ? ctx.views : getDefaultViews(ctx.mode);
            return resolved;
        },
    },
    states: {
        closed: {
            entry: [
                (ctx) => {
                    ctx.open = false;
                },
            ],
            on: {
                OPEN: [{ guard: (ctx) => !ctx.disabled && !ctx.readOnly, target: 'open' }],
                TOGGLE: [{ guard: (ctx) => !ctx.disabled && !ctx.readOnly, target: 'open' }],
                SET_VALUE: {
                    actions: [(ctx, ev) => applyIncomingValue(ctx, ev.value)],
                },
                APPLY_PRESET: {
                    actions: [
                        (ctx, ev) => {
                            applyIncomingValue(ctx, ev.value);
                            emitChange(ctx);
                        },
                    ],
                },
                CLEAR: {
                    actions: [
                        (ctx) => {
                            ctx.valueSingle = null;
                            ctx.valueRange = { start: null, end: null };
                            ctx.rangeAnchor = null;
                            emitChange(ctx);
                        },
                    ],
                },
            },
        },
        open: {
            entry: [
                (ctx) => {
                    ctx.open = true;
                    if (!ctx.views || ctx.views.length === 0) {
                        ctx.views = getDefaultViews(ctx.mode);
                    }
                    if (!ctx.views.includes(ctx.view)) {
                        ctx.view = ctx.views[0] || 'day';
                    }
                },
            ],
            on: {
                CLOSE: { target: 'closed' },
                TOGGLE: { target: 'closed' },
                SET_VIEW: {
                    actions: [
                        (ctx, ev) => {
                            const view = ev.view;
                            if (ctx.views.includes(view))
                                ctx.view = view;
                        },
                    ],
                },
                SET_VALUE: {
                    actions: [(ctx, ev) => applyIncomingValue(ctx, ev.value)],
                },
                APPLY_PRESET: {
                    actions: [
                        (ctx, ev) => {
                            applyIncomingValue(ctx, ev.value);
                            emitChange(ctx);
                            if (ctx.closeOnSelect) {
                                ctx.open = false;
                            }
                        },
                    ],
                    target: 'closed',
                },
                SET_NOW: {
                    actions: [
                        (ctx) => {
                            const now = new Date();
                            ctx.draftHour = now.getHours();
                            ctx.draftMinute = now.getMinutes();
                            const iso = toISODate(now);
                            if (getEffectiveSelection(ctx.mode, ctx.selection) === 'range') {
                                updateRange(ctx, { start: iso, end: iso });
                            }
                            else {
                                updateSingle(ctx, iso, false);
                            }
                            if (ctx.closeOnSelect)
                                ctx.open = false;
                        },
                    ],
                    target: 'closed',
                },
                CLEAR: {
                    actions: [
                        (ctx) => {
                            ctx.valueSingle = null;
                            ctx.valueRange = { start: null, end: null };
                            ctx.rangeAnchor = null;
                            emitChange(ctx);
                        },
                    ],
                },
                SELECT_DAY: {
                    actions: [
                        (ctx, ev) => {
                            var _a, _b;
                            const dateIso = extractDatePart(ev.date);
                            if (!dateIso)
                                return;
                            if (isDateDisabled(dateIso, ctx.min, ctx.max, ctx.disabledDates))
                                return;
                            const effectiveSelection = getEffectiveSelection(ctx.mode, ctx.selection);
                            if (ctx.mode === 'week') {
                                const start = startOfWeek(dateIso, ctx.weekStartsOn);
                                const end = endOfWeek(dateIso, ctx.weekStartsOn);
                                updateRange(ctx, { start, end });
                                if (ctx.closeOnSelect)
                                    ctx.open = false;
                                return;
                            }
                            if (effectiveSelection === 'range') {
                                if (!ctx.rangeAnchor || (((_a = ctx.valueRange) === null || _a === void 0 ? void 0 : _a.start) && ((_b = ctx.valueRange) === null || _b === void 0 ? void 0 : _b.end))) {
                                    ctx.rangeAnchor = dateIso;
                                    updateRange(ctx, { start: dateIso, end: null });
                                    return;
                                }
                                const normalized = normalizeRange(ctx.rangeAnchor, dateIso);
                                ctx.rangeAnchor = null;
                                updateRange(ctx, normalized);
                                if (ctx.closeOnSelect)
                                    ctx.open = false;
                                return;
                            }
                            updateSingle(ctx, dateIso, true);
                            if (ctx.closeOnSelect)
                                ctx.open = false;
                        },
                    ],
                    target: 'open',
                },
                SELECT_MONTH: {
                    actions: [
                        (ctx, ev) => {
                            var _a;
                            const month = Math.min(12, Math.max(1, Number(ev.month) || 1));
                            const base = (_a = parseDateLike(getSingleDatePart(ctx))) !== null && _a !== void 0 ? _a : new Date();
                            base.setMonth(month - 1);
                            const iso = toISODate(base);
                            updateSingle(ctx, iso, true);
                            if (ctx.views.includes('day')) {
                                ctx.view = 'day';
                            }
                            else if (ctx.closeOnSelect) {
                                ctx.open = false;
                            }
                        },
                    ],
                },
                SELECT_YEAR: {
                    actions: [
                        (ctx, ev) => {
                            var _a;
                            const year = Number(ev.year) || new Date().getFullYear();
                            const base = (_a = parseDateLike(getSingleDatePart(ctx))) !== null && _a !== void 0 ? _a : new Date();
                            base.setFullYear(year);
                            const iso = toISODate(base);
                            updateSingle(ctx, iso, true);
                            if (ctx.views.includes('month')) {
                                ctx.view = 'month';
                            }
                            else if (ctx.views.includes('day')) {
                                ctx.view = 'day';
                            }
                            else if (ctx.closeOnSelect) {
                                ctx.open = false;
                            }
                        },
                    ],
                },
                SELECT_HOUR: {
                    actions: [
                        (ctx, ev) => {
                            const hour = Math.min(23, Math.max(0, Number(ev.hour) || 0));
                            if (isTimeDisabled(hour, ctx.draftMinute, ctx.disabledTime))
                                return;
                            ctx.draftHour = hour;
                            const baseDate = getSingleDatePart(ctx);
                            updateSingle(ctx, baseDate, false);
                        },
                    ],
                },
                SELECT_MINUTE: {
                    actions: [
                        (ctx, ev) => {
                            const minute = Math.min(59, Math.max(0, Number(ev.minute) || 0));
                            if (isTimeDisabled(ctx.draftHour, minute, ctx.disabledTime))
                                return;
                            ctx.draftMinute = minute;
                            const baseDate = getSingleDatePart(ctx);
                            updateSingle(ctx, baseDate, false);
                            if (ctx.closeOnSelect && (ctx.mode === 'time' || ctx.mode === 'datetime')) {
                                ctx.open = false;
                            }
                        },
                    ],
                },
            },
        },
    },
});
export function connectDate(state, send) {
    var _a;
    const ctx = state.context;
    const triggerLabel = String((_a = state.computed['triggerLabel']) !== null && _a !== void 0 ? _a : ctx.placeholder);
    const effectiveViews = state.computed['effectiveViews'] || ['day'];
    const effectiveSelection = state.computed['effectiveSelection'] || ctx.selection;
    return {
        open: ctx.open,
        mode: ctx.mode,
        selection: effectiveSelection,
        views: effectiveViews,
        view: ctx.view,
        valueSingle: ctx.valueSingle,
        valueRange: ctx.valueRange,
        draftHour: ctx.draftHour,
        draftMinute: ctx.draftMinute,
        triggerLabel,
        getRootProps() {
            return Object.assign(Object.assign({}, dateAnatomy.getPartAttrs('root')), { 'data-state': ctx.open ? 'open' : 'closed', 'data-mode': ctx.mode, 'data-selection': effectiveSelection });
        },
        getTriggerProps() {
            return Object.assign(Object.assign({}, dateAnatomy.getPartAttrs('trigger')), { type: 'button', role: 'combobox', 'aria-haspopup': 'dialog', 'aria-expanded': ctx.open, 'aria-disabled': ctx.disabled || undefined, onClick() {
                    send({ type: 'TOGGLE' });
                },
                onKeyDown(event) {
                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        send({ type: 'OPEN' });
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        send({ type: 'CLOSE' });
                    }
                } });
        },
        getContentProps() {
            return Object.assign(Object.assign({}, dateAnatomy.getPartAttrs('content')), { role: 'dialog', 'aria-label': 'Date picker', hidden: !ctx.open, 'data-state': ctx.open ? 'open' : 'closed', onKeyDown(event) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        send({ type: 'CLOSE' });
                    }
                } });
        },
        getViewSwitchProps(view) {
            const selected = ctx.view === view;
            return Object.assign(Object.assign({}, dateAnatomy.getPartAttrs('viewSwitch')), { type: 'button', 'aria-pressed': selected, 'data-selected': selected || undefined, onClick() {
                    send({ type: 'SET_VIEW', view });
                } });
        },
        getClearProps() {
            return {
                type: 'button',
                onClick() {
                    send({ type: 'CLEAR' });
                },
            };
        },
        getNowProps() {
            return {
                type: 'button',
                onClick() {
                    send({ type: 'SET_NOW' });
                },
            };
        },
        getPresetProps(value) {
            return {
                type: 'button',
                onClick() {
                    send({ type: 'APPLY_PRESET', value });
                },
            };
        },
    };
}
