/**
 * @face-ui/core — Overlay Machine
 *
 * Unifies Tooltip + Popover + HoverCard into a single FSM.
 *
 * - trigger='hover'                -> tooltip (non-interactive, delay-based)
 * - trigger='click'                -> popover (interactive, toggle + dismiss)
 * - trigger='hover' + interactive  -> hovercard (hover-triggered, interactive content)
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const overlayAnatomy = createAnatomy('overlay').parts('trigger', 'content', 'arrow');
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isHoverTrigger = (ctx) => ctx.trigger === 'hover';
const isClickTrigger = (ctx) => ctx.trigger === 'click';
const hasOpenDelay = (ctx) => ctx.openDelay > 0;
const hasCloseDelay = (ctx) => ctx.closeDelay > 0;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const syncOpenTrue = (ctx) => {
    ctx.open = true;
};
const syncOpenFalse = (ctx) => {
    ctx.open = false;
};
const clearTimer = (ctx) => {
    if (ctx._timerId !== null) {
        clearTimeout(ctx._timerId);
        ctx._timerId = null;
    }
};
const setTriggerEl = (ctx, event) => {
    ctx.triggerEl = event.el;
};
const setContentEl = (ctx, event) => {
    ctx.contentEl = event.el;
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const overlayMachine = createMachine({
    id: 'overlay',
    initial: 'closed',
    context: {
        open: false,
        trigger: 'hover',
        interactive: false,
        triggerEl: null,
        contentEl: null,
        openDelay: 200,
        closeDelay: 0,
        positioning: { side: 'top', align: 'center', sideOffset: 8 },
        _timerId: null,
        onOpenChange: null,
    },
    computed: {
        isOpen: (_ctx, { matches }) => matches('open', 'closing'),
    },
    watch: {
        open: (ctx) => {
            var _a;
            (_a = ctx.onOpenChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { open: ctx.open });
        },
    },
    states: {
        closed: {
            entry: [syncOpenFalse, clearTimer],
            on: {
                // Hover trigger: enter → opening (with delay)
                POINTER_ENTER: [
                    { target: 'opening', guard: (ctx) => isHoverTrigger(ctx) && hasOpenDelay(ctx) },
                    { target: 'open', guard: isHoverTrigger },
                ],
                FOCUS: [
                    { target: 'opening', guard: (ctx) => isHoverTrigger(ctx) && hasOpenDelay(ctx) },
                    { target: 'open', guard: isHoverTrigger },
                ],
                // Click trigger: toggle
                CLICK: [
                    { target: 'open', guard: isClickTrigger },
                ],
                // Programmatic
                OPEN: [
                    { target: 'opening', guard: hasOpenDelay },
                    { target: 'open' },
                ],
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
        opening: {
            effects: ['trackOpenDelay'],
            on: {
                OPEN_DELAY_DONE: { target: 'open' },
                // Cancel on leave before delay completes
                POINTER_LEAVE: [
                    { target: 'closed', guard: isHoverTrigger },
                ],
                BLUR: [
                    { target: 'closed', guard: isHoverTrigger },
                ],
                CLOSE: { target: 'closed' },
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
            exit: [clearTimer],
        },
        open: {
            tags: ['visible'],
            entry: [syncOpenTrue],
            effects: ['trackDismiss'],
            on: {
                // Hover trigger: leave → closing or closed
                POINTER_LEAVE: [
                    { target: 'closing', guard: (ctx) => isHoverTrigger(ctx) && hasCloseDelay(ctx) },
                    { target: 'closed', guard: isHoverTrigger },
                ],
                BLUR: [
                    { target: 'closing', guard: (ctx) => isHoverTrigger(ctx) && hasCloseDelay(ctx) },
                    { target: 'closed', guard: isHoverTrigger },
                ],
                // Hover re-enter content (interactive mode): stay open
                POINTER_ENTER: [
                    // If interactive hover, cancel any pending close by staying open
                    { guard: (ctx) => isHoverTrigger(ctx) && ctx.interactive },
                ],
                // Click trigger: click toggles off
                CLICK: [
                    { target: 'closed', guard: isClickTrigger },
                ],
                // Dismiss (Escape + outside click) for click mode
                DISMISS: { target: 'closed' },
                CLOSE: { target: 'closed' },
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
        },
        closing: {
            effects: ['trackCloseDelay'],
            on: {
                CLOSE_DELAY_DONE: { target: 'closed' },
                // Re-enter before delay: go back to open
                POINTER_ENTER: [
                    { target: 'open', guard: (ctx) => isHoverTrigger(ctx) && ctx.interactive },
                    { target: 'open', guard: isHoverTrigger },
                ],
                FOCUS: [
                    { target: 'open', guard: isHoverTrigger },
                ],
                OPEN: { target: 'open' },
                CLOSE: { target: 'closed' },
                SET_TRIGGER: { actions: [setTriggerEl] },
                SET_CONTENT: { actions: [setContentEl] },
            },
            exit: [clearTimer],
        },
    },
    implementations: {
        effects: {
            trackOpenDelay: (ctx, send) => {
                ctx._timerId = setTimeout(() => {
                    send({ type: 'OPEN_DELAY_DONE' });
                }, ctx.openDelay);
                return () => {
                    clearTimer(ctx);
                };
            },
            trackCloseDelay: (ctx, send) => {
                ctx._timerId = setTimeout(() => {
                    send({ type: 'CLOSE_DELAY_DONE' });
                }, ctx.closeDelay);
                return () => {
                    clearTimer(ctx);
                };
            },
            trackDismiss: (ctx, send) => {
                // Only track dismiss for click-triggered overlays
                if (ctx.trigger !== 'click')
                    return;
                const onKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        send({ type: 'DISMISS' });
                    }
                };
                const onPointerDown = (e) => {
                    var _a, _b, _c, _d;
                    const target = e.target;
                    if (!target)
                        return;
                    const isInsideTrigger = (_b = (_a = ctx.triggerEl) === null || _a === void 0 ? void 0 : _a.contains(target)) !== null && _b !== void 0 ? _b : false;
                    const isInsideContent = (_d = (_c = ctx.contentEl) === null || _c === void 0 ? void 0 : _c.contains(target)) !== null && _d !== void 0 ? _d : false;
                    if (!isInsideTrigger && !isInsideContent) {
                        send({ type: 'DISMISS' });
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('pointerdown', onPointerDown);
                return () => {
                    document.removeEventListener('keydown', onKeyDown);
                    document.removeEventListener('pointerdown', onPointerDown);
                };
            },
        },
    },
});
export function connectOverlay(state, send) {
    const { context: ctx } = state;
    const isOpen = state.matches('open', 'closing');
    const attrs = overlayAnatomy.getPartAttrs;
    const triggerIsHover = ctx.trigger === 'hover';
    const triggerIsClick = ctx.trigger === 'click';
    return {
        getTriggerProps() {
            return Object.assign(Object.assign(Object.assign(Object.assign({}, attrs('trigger')), { 'aria-expanded': isOpen, 'data-state': isOpen ? 'open' : 'closed' }), (triggerIsHover && {
                onPointerEnter() {
                    send({ type: 'POINTER_ENTER' });
                },
                onPointerLeave() {
                    send({ type: 'POINTER_LEAVE' });
                },
                onFocus() {
                    send({ type: 'FOCUS' });
                },
                onBlur() {
                    send({ type: 'BLUR' });
                },
            })), (triggerIsClick && {
                onClick() {
                    send({ type: 'CLICK' });
                },
            }));
        },
        getContentProps() {
            return Object.assign(Object.assign(Object.assign({}, attrs('content')), { role: triggerIsHover && !ctx.interactive ? 'tooltip' : undefined, hidden: !isOpen, 'data-state': isOpen ? 'open' : 'closed', 'data-side': ctx.positioning.side, 'data-align': ctx.positioning.align }), (triggerIsHover && ctx.interactive && {
                onPointerEnter() {
                    send({ type: 'POINTER_ENTER' });
                },
                onPointerLeave() {
                    send({ type: 'POINTER_LEAVE' });
                },
            }));
        },
        getArrowProps() {
            return Object.assign(Object.assign({}, attrs('arrow')), { 'data-side': ctx.positioning.side, 'data-align': ctx.positioning.align, hidden: !isOpen });
        },
    };
}
