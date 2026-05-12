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
    if (ctx.open)
        focusInitialElement(ctx);
};
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');
function getFocusableElements(root) {
    if (!root)
        return [];
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}
function focusInitialElement(ctx) {
    const el = ctx.contentEl;
    if (!el)
        return;
    const focusable = getFocusableElements(el);
    try {
        (focusable[0] || el).focus();
    }
    catch (_a) { }
}
function focusInitialElementWhenVisible(ctx) {
    focusInitialElement(ctx);
    let cancelled = false;
    const schedule = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback) => window.setTimeout(callback, 0);
    const cancel = typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : window.clearTimeout;
    const frame = schedule(() => {
        const el = ctx.contentEl;
        if (cancelled || !ctx.open || !el)
            return;
        const active = document.activeElement;
        if (active instanceof HTMLElement && el.contains(active))
            return;
        focusInitialElement(ctx);
    });
    return () => {
        cancelled = true;
        cancel(frame);
    };
}
function capturePreviousFocus(ctx) {
    const active = document.activeElement;
    ctx.previousFocusEl = active instanceof HTMLElement ? active : null;
}
function restorePreviousFocus(ctx) {
    const previous = ctx.previousFocusEl;
    ctx.previousFocusEl = null;
    if (!previous || !document.contains(previous))
        return;
    try {
        previous.focus();
    }
    catch (_a) { }
}
function containTabFocus(ctx, event) {
    const el = ctx.contentEl;
    if (!el)
        return;
    const focusable = getFocusableElements(el);
    if (focusable.length === 0) {
        event.preventDefault();
        try {
            el.focus();
        }
        catch (_a) { }
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const activeInside = active instanceof HTMLElement && el.contains(active);
    if (event.shiftKey) {
        if (!activeInside || active === first) {
            event.preventDefault();
            try {
                last.focus();
            }
            catch (_a) { }
        }
        return;
    }
    if (!activeInside || active === last) {
        event.preventDefault();
        try {
            first.focus();
        }
        catch (_a) { }
    }
}
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
        previousFocusEl: null,
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
            effects: ['restoreFocus'],
            on: {
                OPEN: { target: 'open' },
                TOGGLE: { target: 'open' },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
        open: {
            tags: ['visible'],
            entry: [syncOpenTrue],
            effects: ['trackDocumentEscape', 'focusInitial'],
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
                capturePreviousFocus(ctx);
                const onKeyDown = (event) => {
                    if (event.key === 'Escape') {
                        send({ type: 'ESCAPE' });
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                return () => {
                    document.removeEventListener('keydown', onKeyDown);
                };
            },
            focusInitial: (ctx) => {
                return focusInitialElementWhenVisible(ctx);
            },
            restoreFocus: (ctx) => {
                restorePreviousFocus(ctx);
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
                    if (e.key === 'Tab') {
                        containTabFocus(ctx, e);
                    }
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
