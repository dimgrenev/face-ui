/**
 * @face-ui/core — Modal Machine
 *
 * Unifies Dialog + Drawer + AlertDialog into a single FSM.
 *
 * - variant='center'                     -> classic dialog
 * - variant='left'|'right'|'top'|'bottom' -> drawer / sheet
 * - closable=false                       -> alertdialog (no Escape, no backdrop dismiss)
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const modalAnatomy = createAnatomy('modal').parts('trigger', 'backdrop', 'positioner', 'content', 'title', 'description', 'close');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isClosable = (ctx) => ctx.closable;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const syncOpenTrue = (ctx) => {
    ctx.open = true;
};
const syncOpenFalse = (ctx) => {
    ctx.open = false;
};
const setContentEl = (ctx, event) => {
    ctx.contentEl = event.el;
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const modalMachine = createMachine({
    id: 'modal',
    initial: 'closed',
    context: {
        open: false,
        variant: 'center',
        closable: true,
        contentEl: null,
        titleId: '',
        descriptionId: '',
        onOpenChange: null,
    },
    computed: {
        isOpen: (ctx) => ctx.open,
        role: (ctx) => (ctx.closable ? 'dialog' : 'alertdialog'),
    },
    watch: {
        open: (ctx) => {
            var _a;
            (_a = ctx.onOpenChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { open: ctx.open });
        },
    },
    states: {
        closed: {
            entry: [syncOpenFalse],
            on: {
                OPEN: { target: 'open' },
                TOGGLE: { target: 'open' },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
        open: {
            tags: ['visible'],
            entry: [syncOpenTrue],
            effects: ['trackDocumentEscape'],
            on: {
                CLOSE: { target: 'closed' },
                TOGGLE: { target: 'closed' },
                ESCAPE: [
                    { target: 'closed', guard: isClosable },
                ],
                BACKDROP_CLICK: [
                    { target: 'closed', guard: isClosable },
                ],
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
    },
    implementations: {
        effects: {
            trackDocumentEscape: (ctx, send) => {
                const onKeyDown = (event) => {
                    if (event.key === 'Escape') {
                        send({ type: 'ESCAPE' });
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                const el = ctx.contentEl;
                if (el) {
                    try {
                        el.focus();
                    }
                    catch (_a) { }
                }
                return () => {
                    document.removeEventListener('keydown', onKeyDown);
                };
            },
        },
    },
});
export function connectModal(state, send) {
    const { context: ctx, computed } = state;
    const isOpen = state.matches('open');
    const role = computed['role'];
    const attrs = modalAnatomy.getPartAttrs;
    return {
        getTriggerProps() {
            return Object.assign(Object.assign({}, attrs('trigger')), { type: 'button', 'aria-haspopup': role, 'aria-expanded': isOpen, onClick() {
                    send({ type: 'TOGGLE' });
                } });
        },
        getBackdropProps() {
            return Object.assign(Object.assign({}, attrs('backdrop')), { hidden: !isOpen, 'data-state': isOpen ? 'open' : 'closed', onClick() {
                    send({ type: 'BACKDROP_CLICK' });
                } });
        },
        getPositionerProps() {
            return Object.assign(Object.assign({}, attrs('positioner')), { 'data-state': isOpen ? 'open' : 'closed', 'data-variant': ctx.variant });
        },
        getContentProps() {
            return Object.assign(Object.assign({}, attrs('content')), { role, 'aria-modal': true, 'aria-labelledby': ctx.titleId || undefined, 'aria-describedby': ctx.descriptionId || undefined, 'data-state': isOpen ? 'open' : 'closed', 'data-variant': ctx.variant, hidden: !isOpen, tabIndex: -1, onKeyDown(e) {
                    if (e.key === 'Escape') {
                        send({ type: 'ESCAPE' });
                    }
                } });
        },
        getTitleProps() {
            return Object.assign(Object.assign({}, attrs('title')), { id: ctx.titleId });
        },
        getDescriptionProps() {
            return Object.assign(Object.assign({}, attrs('description')), { id: ctx.descriptionId });
        },
        getCloseProps() {
            return Object.assign(Object.assign({}, attrs('close')), { type: 'button', 'aria-label': 'Close', hidden: !ctx.closable, onClick() {
                    send({ type: 'CLOSE' });
                } });
        },
    };
}
