/**
 * Checkbox Machine
 *
 * States: unchecked, checked, indeterminate
 * Supports tri-state (boolean | 'indeterminate') with toggle and direct set.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const checkboxAnatomy = createAnatomy('checkbox').parts('root', 'control', 'indicator', 'label', 'hiddenInput');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function stateFromChecked(checked) {
    if (checked === 'indeterminate')
        return 'indeterminate';
    return checked ? 'checked' : 'unchecked';
}
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const checkboxMachine = createMachine({
    id: 'checkbox',
    initial: 'unchecked',
    context: {
        checked: false,
        disabled: false,
        required: false,
        name: '',
    },
    watch: {
        checked(ctx) {
            var _a;
            (_a = ctx.onCheckedChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { checked: ctx.checked });
        },
    },
    states: {
        unchecked: {
            on: {
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'checked',
                        actions: [(ctx) => { ctx.checked = true; }],
                    },
                ],
                SET: [
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === true;
                        },
                        target: 'checked',
                        actions: [(ctx) => { ctx.checked = true; }],
                    },
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === 'indeterminate';
                        },
                        target: 'indeterminate',
                        actions: [(ctx) => { ctx.checked = 'indeterminate'; }],
                    },
                ],
            },
        },
        checked: {
            on: {
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'unchecked',
                        actions: [(ctx) => { ctx.checked = false; }],
                    },
                ],
                SET: [
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === false;
                        },
                        target: 'unchecked',
                        actions: [(ctx) => { ctx.checked = false; }],
                    },
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === 'indeterminate';
                        },
                        target: 'indeterminate',
                        actions: [(ctx) => { ctx.checked = 'indeterminate'; }],
                    },
                ],
            },
        },
        indeterminate: {
            on: {
                TOGGLE: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'checked',
                        actions: [(ctx) => { ctx.checked = true; }],
                    },
                ],
                SET: [
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === true;
                        },
                        target: 'checked',
                        actions: [(ctx) => { ctx.checked = true; }],
                    },
                    {
                        guard: (ctx, e) => {
                            const v = e.checked;
                            return !ctx.disabled && v === false;
                        },
                        target: 'unchecked',
                        actions: [(ctx) => { ctx.checked = false; }],
                    },
                ],
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectCheckbox(state, send) {
    const { checked, disabled, required, name } = state.context;
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';
    const dataState = stateFromChecked(checked);
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, checkboxAnatomy.getPartAttrs('root')), { 'data-state': dataState, 'data-disabled': disabled || undefined });
        },
        getControlProps() {
            return Object.assign(Object.assign({}, checkboxAnatomy.getPartAttrs('control')), { 'data-state': dataState, 'data-disabled': disabled || undefined, role: 'checkbox', 'aria-checked': isIndeterminate ? 'mixed' : isChecked, 'aria-disabled': disabled || undefined, 'aria-required': required || undefined, tabIndex: disabled ? -1 : 0, onClick() {
                    send({ type: 'TOGGLE' });
                },
                onKeyDown(event) {
                    if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        send({ type: 'TOGGLE' });
                    }
                } });
        },
        getIndicatorProps() {
            return Object.assign(Object.assign({}, checkboxAnatomy.getPartAttrs('indicator')), { 'data-state': dataState, 'data-disabled': disabled || undefined, hidden: !isChecked && !isIndeterminate });
        },
        getHiddenInputProps() {
            return Object.assign(Object.assign({}, checkboxAnatomy.getPartAttrs('hiddenInput')), { type: 'checkbox', name, checked: isChecked, disabled,
                required, tabIndex: -1, style: {
                    position: 'absolute',
                    width: 'var(--uf-membrane)',
                    height: 'var(--uf-membrane)',
                    margin: 'calc(-1 * var(--uf-membrane))',
                    padding: '0',
                    overflow: 'hidden',
                    clip: 'rect(0,0,0,0)',
                    border: '0',
                }, onChange() {
                    send({ type: 'TOGGLE' });
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, checkboxAnatomy.getPartAttrs('label')), { 'data-state': dataState, 'data-disabled': disabled || undefined, onClick() {
                    send({ type: 'TOGGLE' });
                } });
        },
    };
}
