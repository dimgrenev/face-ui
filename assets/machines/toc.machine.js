/**
 * Toc (Table of Contents) Machine — navigational "where you are" indicator.
 *
 * States: idle
 * Context tracks activeId and items list.
 * Events: SET_ACTIVE
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const tocAnatomy = createAnatomy('toc').parts('root', 'item');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const tocMachine = createMachine({
    id: 'toc',
    initial: 'idle',
    context: {
        activeId: '',
        items: [],
        onActiveChange: null,
    },
    watch: {
        activeId(ctx) {
            var _a;
            (_a = ctx.onActiveChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { id: ctx.activeId });
        },
    },
    states: {
        idle: {
            on: {
                SET_ACTIVE: {
                    actions: [
                        (ctx, e) => {
                            ctx.activeId = e.id;
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
export function connectToc(state, send) {
    const { activeId } = state.context;
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, tocAnatomy.getPartAttrs('root')), { role: 'navigation', 'aria-label': 'Table of contents' });
        },
        getItemProps(props) {
            var _a;
            const isActive = activeId === props.id;
            const isDisabled = (_a = props.disabled) !== null && _a !== void 0 ? _a : false;
            return Object.assign(Object.assign({}, tocAnatomy.getPartAttrs('item')), { 'data-active': isActive || undefined, 'data-disabled': isDisabled || undefined, 'aria-current': isActive ? 'location' : undefined, 'aria-disabled': isDisabled || undefined, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SET_ACTIVE', id: props.id });
                    }
                } });
        },
    };
}
