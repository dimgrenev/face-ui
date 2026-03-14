/**
 * @face-ui/core — Avatar Machine
 *
 * Manages image loading state with optional fallback delay.
 * States: loading -> loaded | error
 * If fallbackDelayMs > 0, the fallback waits before showing (gives image time to load).
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const avatarAnatomy = createAnatomy('avatar').parts('root', 'image', 'fallback');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getInitials(name) {
    if (!name)
        return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1)
        return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const avatarMachine = createMachine({
    id: 'avatar',
    initial: 'loading',
    context: {
        src: '',
        name: '',
        fallbackDelayMs: 0,
        fallbackTimerElapsed: false,
        onLoadChange: null,
    },
    states: {
        loading: {
            effects: ['preloadImage', 'fallbackTimer'],
            on: {
                IMG_LOAD: {
                    target: 'loaded',
                },
                IMG_ERROR: {
                    target: 'error',
                },
                SHOW_FALLBACK: {
                    actions: [
                        (ctx) => {
                            ctx.fallbackTimerElapsed = true;
                        },
                    ],
                },
            },
        },
        loaded: {
            entry: [
                (ctx) => {
                    var _a;
                    (_a = ctx.onLoadChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { loaded: true });
                },
            ],
            on: {
                SRC_CHANGE: {
                    target: 'loading',
                    actions: [
                        (ctx) => {
                            ctx.fallbackTimerElapsed = false;
                        },
                    ],
                },
            },
        },
        error: {
            entry: [
                (ctx) => {
                    var _a;
                    ctx.fallbackTimerElapsed = true;
                    (_a = ctx.onLoadChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { loaded: false });
                },
            ],
            on: {
                SRC_CHANGE: {
                    target: 'loading',
                    actions: [
                        (ctx) => {
                            ctx.fallbackTimerElapsed = false;
                        },
                    ],
                },
            },
        },
    },
    computed: {
        showImage: (_ctx, { matches }) => matches('loaded'),
        showFallback: (ctx, { matches }) => {
            if (matches('error'))
                return true;
            if (matches('loading') && ctx.fallbackDelayMs <= 0)
                return true;
            if (matches('loading') && ctx.fallbackTimerElapsed)
                return true;
            return false;
        },
        initials: (ctx) => getInitials(ctx.name),
    },
    watch: {
        src: (ctx) => {
            // Handled externally — the adapter re-sends SRC_CHANGE
            void ctx;
        },
    },
    implementations: {
        effects: {
            preloadImage: (ctx, send) => {
                if (!ctx.src) {
                    send({ type: 'IMG_ERROR' });
                    return;
                }
                const img = new Image();
                const onLoad = () => send({ type: 'IMG_LOAD' });
                const onError = () => send({ type: 'IMG_ERROR' });
                img.addEventListener('load', onLoad);
                img.addEventListener('error', onError);
                img.src = ctx.src;
                return () => {
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                };
            },
            fallbackTimer: (ctx, send) => {
                if (ctx.fallbackDelayMs <= 0)
                    return;
                const timer = setTimeout(() => {
                    send({ type: 'SHOW_FALLBACK' });
                }, ctx.fallbackDelayMs);
                return () => clearTimeout(timer);
            },
        },
    },
});
export function connectAvatar(state, send) {
    const { value: stateValue, context: ctx, computed } = state;
    const showImage = computed['showImage'];
    const showFallback = computed['showFallback'];
    const initials = computed['initials'];
    return {
        getRootProps() {
            return Object.assign(Object.assign({}, avatarAnatomy.getPartAttrs('root')), { 'data-state': stateValue });
        },
        getImageProps() {
            return Object.assign(Object.assign({}, avatarAnatomy.getPartAttrs('image')), { src: ctx.src, alt: ctx.name, hidden: !showImage, 'data-state': stateValue });
        },
        getFallbackProps() {
            return Object.assign(Object.assign({}, avatarAnatomy.getPartAttrs('fallback')), { hidden: !showFallback, 'data-state': stateValue, children: initials });
        },
        /** Imperative helpers */
        setSrc(src) {
            // Context will be patched by the adapter; trigger reload
            void src;
            send({ type: 'SRC_CHANGE' });
        },
        /** Computed accessors */
        showImage,
        showFallback,
        initials,
        isLoading: stateValue === 'loading',
        isLoaded: stateValue === 'loaded',
        isError: stateValue === 'error',
    };
}
