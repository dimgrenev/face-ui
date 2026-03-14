/**
 * Select Machine — Shell Pattern
 *
 * States: closed, open
 * Shell-pattern: machine handles open/close and value selection.
 * Sub-component rendering (OptionList, Calendar, etc.) is the adapter's job.
 *
 * type='select' is default. The React adapter uses discriminated unions
 * to swap sub-components based on type.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const selectAnatomy = createAnatomy('select').parts('root', 'trigger', 'content', 'option');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const selectMachine = createMachine({
    id: 'select',
    initial: 'closed',
    context: {
        value: null,
        open: false,
        searchQuery: '',
        disabled: false,
        type: 'select',
    },
    watch: {
        value(ctx) {
            var _a;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
        },
        open(ctx) {
            var _a;
            (_a = ctx.onOpenChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { open: ctx.open });
        },
    },
    states: {
        closed: {
            entry: [
                (ctx) => {
                    ctx.open = false;
                    ctx.searchQuery = '';
                },
            ],
            on: {
                OPEN: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'open',
                    },
                ],
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'open',
                    },
                ],
                SET_VALUE: {
                    actions: [
                        (ctx, e) => {
                            ctx.value = e.value;
                        },
                    ],
                },
            },
        },
        open: {
            entry: [
                (ctx) => {
                    ctx.open = true;
                },
            ],
            on: {
                CLOSE: {
                    target: 'closed',
                },
                TOGGLE: {
                    target: 'closed',
                },
                ESCAPE: {
                    target: 'closed',
                },
                SELECT: [
                    {
                        // Multi-select: toggle item, stay open
                        guard: (ctx) => !ctx.disabled && Array.isArray(ctx.value),
                        actions: [
                            (ctx, e) => {
                                const selectedValue = e.value;
                                const values = ctx.value;
                                ctx.value = values.includes(selectedValue)
                                    ? values.filter((v) => v !== selectedValue)
                                    : [...values, selectedValue];
                            },
                        ],
                    },
                    {
                        // Single-select: set value and close
                        guard: (ctx) => !ctx.disabled && !Array.isArray(ctx.value),
                        target: 'closed',
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
                SEARCH: {
                    actions: [
                        (ctx, e) => {
                            ctx.searchQuery = e.query;
                        },
                    ],
                },
                SET_VALUE: {
                    actions: [
                        (ctx, e) => {
                            ctx.value = e.value;
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
export function connectSelect(state, send) {
    const { value, open, disabled, searchQuery, type } = state.context;
    const isOpen = state.matches('open');
    // Determine display value for trigger
    const displayValue = Array.isArray(value)
        ? value.join(', ')
        : value !== null && value !== void 0 ? value : '';
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, selectAnatomy.getPartAttrs('root')), { 'data-state': isOpen ? 'open' : 'closed', 'data-disabled': disabled || undefined, 'data-type': type });
        },
        getTriggerProps() {
            return Object.assign(Object.assign({}, selectAnatomy.getPartAttrs('trigger')), { role: 'combobox', 'aria-expanded': isOpen, 'aria-haspopup': 'listbox', 'aria-disabled': disabled || undefined, 'data-state': isOpen ? 'open' : 'closed', 'data-disabled': disabled || undefined, 'data-placeholder': !value || (Array.isArray(value) && value.length === 0) || undefined, tabIndex: disabled ? -1 : 0, onClick() {
                    send({ type: 'TOGGLE' });
                },
                onKeyDown(event) {
                    if (disabled)
                        return;
                    switch (event.key) {
                        case 'Enter':
                        case ' ':
                            event.preventDefault();
                            send({ type: 'TOGGLE' });
                            break;
                        case 'ArrowDown':
                            event.preventDefault();
                            send({ type: 'OPEN' });
                            break;
                        case 'Escape':
                            if (isOpen) {
                                event.preventDefault();
                                send({ type: 'ESCAPE' });
                            }
                            break;
                    }
                } });
        },
        getContentProps() {
            return Object.assign(Object.assign({}, selectAnatomy.getPartAttrs('content')), { role: 'listbox', 'aria-multiselectable': Array.isArray(value) || undefined, 'data-state': isOpen ? 'open' : 'closed', hidden: !isOpen, onKeyDown(event) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        send({ type: 'ESCAPE' });
                    }
                } });
        },
        getOptionProps(props) {
            const optionDisabled = disabled || props.disabled;
            const isSelected = Array.isArray(value)
                ? value.includes(props.value)
                : value === props.value;
            return Object.assign(Object.assign({}, selectAnatomy.getPartAttrs('option')), { role: 'option', 'aria-selected': isSelected, 'aria-disabled': optionDisabled || undefined, 'data-state': isSelected ? 'selected' : undefined, 'data-disabled': optionDisabled || undefined, 'data-value': props.value, tabIndex: optionDisabled ? -1 : 0, onClick() {
                    if (!optionDisabled) {
                        send({ type: 'SELECT', value: props.value });
                    }
                },
                onKeyDown(event) {
                    if (optionDisabled)
                        return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        send({ type: 'SELECT', value: props.value });
                    }
                } });
        },
    };
}
