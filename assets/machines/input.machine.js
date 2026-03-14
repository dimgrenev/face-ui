/**
 * Input Machine
 *
 * States: idle, focused
 * Base text input machine. Type variants (textarea, number, otp, tags)
 * are handled by the React adapter, not this machine.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const inputAnatomy = createAnatomy('input').parts('root', 'input', 'label', 'clear');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const inputMachine = createMachine({
    id: 'input',
    initial: 'idle',
    context: {
        value: '',
        disabled: false,
        readOnly: false,
        type: 'text',
    },
    watch: {
        value(ctx) {
            var _a;
            (_a = ctx.onValueChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { value: ctx.value });
        },
    },
    states: {
        idle: {
            on: {
                FOCUS: [
                    {
                        guard: (ctx) => !ctx.disabled,
                        target: 'focused',
                    },
                ],
                SET_VALUE: [
                    {
                        guard: (ctx) => !ctx.disabled && !ctx.readOnly,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
                CLEAR: [
                    {
                        guard: (ctx) => !ctx.disabled && !ctx.readOnly,
                        actions: [
                            (ctx) => {
                                ctx.value = '';
                            },
                        ],
                    },
                ],
            },
        },
        focused: {
            on: {
                BLUR: {
                    target: 'idle',
                },
                SET_VALUE: [
                    {
                        guard: (ctx) => !ctx.disabled && !ctx.readOnly,
                        actions: [
                            (ctx, e) => {
                                ctx.value = e.value;
                            },
                        ],
                    },
                ],
                CLEAR: [
                    {
                        guard: (ctx) => !ctx.disabled && !ctx.readOnly,
                        actions: [
                            (ctx) => {
                                ctx.value = '';
                            },
                        ],
                    },
                ],
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function connectInput(state, send) {
    const { value, disabled, readOnly, type } = state.context;
    const isFocused = state.matches('focused');
    const isEmpty = value === '';
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, inputAnatomy.getPartAttrs('root')), { 'data-disabled': disabled || undefined, 'data-readonly': readOnly || undefined, 'data-focus': isFocused || undefined, 'data-empty': isEmpty || undefined });
        },
        getInputProps() {
            return Object.assign(Object.assign({}, inputAnatomy.getPartAttrs('input')), { type,
                value,
                disabled,
                readOnly, 'aria-disabled': disabled || undefined, 'aria-readonly': readOnly || undefined, 'data-disabled': disabled || undefined, 'data-readonly': readOnly || undefined, 'data-focus': isFocused || undefined, onFocus() {
                    send({ type: 'FOCUS' });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
                onChange(event) {
                    send({ type: 'SET_VALUE', value: event.target.value });
                } });
        },
        getLabelProps() {
            return Object.assign(Object.assign({}, inputAnatomy.getPartAttrs('label')), { 'data-disabled': disabled || undefined, 'data-focus': isFocused || undefined, 'data-empty': isEmpty || undefined });
        },
        getClearProps() {
            return Object.assign(Object.assign({}, inputAnatomy.getPartAttrs('clear')), { role: 'button', tabIndex: -1, 'aria-label': 'Clear input', 'data-disabled': disabled || undefined, hidden: isEmpty || disabled || readOnly, onClick() {
                    send({ type: 'CLEAR' });
                } });
        },
    };
}
