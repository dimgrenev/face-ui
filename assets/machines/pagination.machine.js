/**
 * @face-ui/core — Pagination Machine
 *
 * Framework-agnostic FSM for page navigation.
 * Computes total pages, visible page ranges with ellipses, and prev/next state.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const paginationAnatomy = createAnatomy('pagination').parts('root', 'prev', 'next', 'item', 'ellipsis');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeTotalPages(ctx) {
    return Math.max(1, Math.ceil(ctx.total / ctx.pageSize));
}
function clampPage(page, totalPages) {
    return Math.max(1, Math.min(page, totalPages));
}
/**
 * Build the visible page range with ellipsis markers.
 * Returns an array of page numbers and -1 for ellipsis positions.
 */
function computeRange(page, totalPages, siblingCount) {
    // Total slots: first + last + current + 2*siblings + 2 ellipsis positions
    const totalSlots = 2 * siblingCount + 5;
    // If total pages fit in the slots, show all pages
    if (totalPages <= totalSlots) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);
    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;
    if (!showLeftEllipsis && showRightEllipsis) {
        // Show first N pages + ellipsis + last page
        const leftCount = 3 + 2 * siblingCount;
        const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1);
        return [...leftRange, -1, totalPages];
    }
    if (showLeftEllipsis && !showRightEllipsis) {
        // Show first page + ellipsis + last N pages
        const rightCount = 3 + 2 * siblingCount;
        const rightRange = Array.from({ length: rightCount }, (_, i) => totalPages - rightCount + i + 1);
        return [1, -1, ...rightRange];
    }
    // Both ellipses
    const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
    return [1, -1, ...middleRange, -1, totalPages];
}
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const isNotDisabled = (ctx) => !ctx.disabled;
// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const setPage = (ctx, event) => {
    const e = event;
    const totalPages = computeTotalPages(ctx);
    ctx.page = clampPage(e.page, totalPages);
};
const goNext = (ctx) => {
    const totalPages = computeTotalPages(ctx);
    ctx.page = clampPage(ctx.page + 1, totalPages);
};
const goPrev = (ctx) => {
    ctx.page = clampPage(ctx.page - 1, computeTotalPages(ctx));
};
const goFirst = (ctx) => {
    ctx.page = 1;
};
const goLast = (ctx) => {
    ctx.page = computeTotalPages(ctx);
};
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const paginationMachine = createMachine({
    id: 'pagination',
    initial: 'idle',
    context: {
        page: 1,
        total: 0,
        pageSize: 10,
        siblingCount: 1,
        disabled: false,
        onPageChange: null,
    },
    computed: {
        totalPages: (ctx) => computeTotalPages(ctx),
        range: (ctx) => computeRange(ctx.page, computeTotalPages(ctx), ctx.siblingCount),
        hasPrev: (ctx) => ctx.page > 1,
        hasNext: (ctx) => ctx.page < computeTotalPages(ctx),
    },
    watch: {
        page: (ctx) => {
            var _a;
            (_a = ctx.onPageChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { page: ctx.page });
        },
    },
    states: {
        idle: {
            on: {
                SET_PAGE: {
                    guard: isNotDisabled,
                    actions: [setPage],
                },
                NEXT: {
                    guard: isNotDisabled,
                    actions: [goNext],
                },
                PREV: {
                    guard: isNotDisabled,
                    actions: [goPrev],
                },
                FIRST: {
                    guard: isNotDisabled,
                    actions: [goFirst],
                },
                LAST: {
                    guard: isNotDisabled,
                    actions: [goLast],
                },
            },
        },
    },
});
// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------
export function connectPagination(state, send) {
    const ctx = state.context;
    const computed = state.computed;
    const attrs = paginationAnatomy.getPartAttrs;
    const totalPages = computed.totalPages;
    const range = computed.range;
    const hasPrev = computed.hasPrev;
    const hasNext = computed.hasNext;
    return {
        /** Current page number (1-indexed) */
        page: ctx.page,
        /** Total number of pages */
        totalPages,
        /** Visible page numbers (-1 = ellipsis) */
        range,
        /** Whether there is a previous page */
        hasPrev,
        /** Whether there is a next page */
        hasNext,
        getRootProps() {
            return Object.assign(Object.assign({}, attrs('root')), { role: 'navigation', 'aria-label': 'Pagination', 'data-disabled': ctx.disabled ? '' : undefined });
        },
        getPrevProps() {
            const isDisabled = ctx.disabled || !hasPrev;
            return Object.assign(Object.assign({}, attrs('prev')), { type: 'button', 'aria-label': 'Previous page', 'data-disabled': isDisabled ? '' : undefined, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'PREV' });
                    }
                } });
        },
        getNextProps() {
            const isDisabled = ctx.disabled || !hasNext;
            return Object.assign(Object.assign({}, attrs('next')), { type: 'button', 'aria-label': 'Next page', 'data-disabled': isDisabled ? '' : undefined, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'NEXT' });
                    }
                } });
        },
        getPageProps(page) {
            const isCurrent = ctx.page === page;
            const isDisabled = ctx.disabled;
            return Object.assign(Object.assign({}, attrs('item')), { type: 'button', 'aria-label': `Page ${page}`, 'aria-current': isCurrent ? 'page' : undefined, 'data-selected': isCurrent ? '' : undefined, 'data-disabled': isDisabled ? '' : undefined, 'data-value': page, disabled: isDisabled, onClick() {
                    if (!isDisabled) {
                        send({ type: 'SET_PAGE', page });
                    }
                } });
        },
        getEllipsisProps() {
            return Object.assign(Object.assign({}, attrs('ellipsis')), { 'aria-hidden': true });
        },
    };
}
