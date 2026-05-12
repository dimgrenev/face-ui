/**
 * Switcher Machine (NOT "switch")
 *
 * States: unchecked, checked
 * Binary toggle control with thumb animation support.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const switcherAnatomy = createAnatomy('switcher').parts('root', 'control', 'thumb', 'label', 'hiddenInput');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const switcherMachine = createMachine({
    id: 'switcher',
    initial: 'unchecked',
    context: {
        checked: false,
        disabled: false,
        required: false,
        name: '',
        value: 'on',
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
                ],
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectSwitcher(state, send) {
    const { checked, disabled, required, name, value } = state.context;
    const dataState = checked ? 'checked' : 'unchecked';
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, switcherAnatomy.getPartAttrs('root')), { 'data-state': dataState, 'data-disabled': disabled || undefined });
        },
        getControlProps() {
            return Object.assign(Object.assign({}, switcherAnatomy.getPartAttrs('control')), { 'data-state': dataState, 'data-disabled': disabled || undefined, role: 'switch', 'aria-checked': checked, 'aria-disabled': disabled || undefined, 'aria-required': required || undefined, tabIndex: disabled ? -1 : 0, onClick() {
                    send({ type: 'TOGGLE' });
                },
                onKeyDown(event) {
                    if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        send({ type: 'TOGGLE' });
                    }
                } });
        },
        getThumbProps() {
            return Object.assign(Object.assign({}, switcherAnatomy.getPartAttrs('thumb')), { 'data-state': dataState, 'data-disabled': disabled || undefined });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, switcherAnatomy.getPartAttrs('label')), { 'data-state': dataState, 'data-disabled': disabled || undefined, onClick() {
                    send({ type: 'TOGGLE' });
                } });
        },
        getHiddenInputProps() {
            return Object.assign(Object.assign({}, switcherAnatomy.getPartAttrs('hiddenInput')), { type: 'checkbox', role: 'switch', name,
                value,
                checked,
                disabled,
                required, 'aria-hidden': true, tabIndex: -1, style: {
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
    };
}
