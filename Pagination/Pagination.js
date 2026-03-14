import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Pagination — page navigation component.
 *
 * Renders prev/next buttons and numbered page buttons with ellipsis.
 * Range items with value -1 are rendered as ellipsis spans.
 *
 * `<Pagination page={1} total={100} pageSize={10} />`
 */
import { forwardRef } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { paginationMachine, connectPagination } from '../assets/machines/pagination.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Pagination = forwardRef(function Pagination(props, ref) {
    const { page: rawPage, defaultPage: rawDefaultPage = 1, total: rawTotal, pageSize: rawPageSize = 10, siblingCount = 1, disabled = false, onPageChange, className, membrane = true, surfaceTitle = 'Choose page', } = props;
    // NaN protection: face.json may deliver wrong types for number props
    const controlledPage = rawPage === undefined ? undefined : (Number(rawPage) || 1);
    const defaultPage = Number(rawDefaultPage) || 1;
    const total = Number(rawTotal) || 0;
    const pageSize = Number(rawPageSize) || 10;
    const page = useControllableMachineProp(controlledPage, defaultPage);
    const { state, send } = useMachine(paginationMachine, {
        page,
        total,
        pageSize,
        siblingCount,
        disabled,
        onPageChange: onPageChange !== null && onPageChange !== void 0 ? onPageChange : null,
    });
    const api = connectPagination(state, send);
    const pageItems = Array.from({ length: api.totalPages }, (_, index) => ({
        value: String(index + 1),
        label: `Page ${index + 1}`,
    }));
    return (_jsxs("nav", Object.assign({ ref: ref }, api.getRootProps(), { className: cn('uf-pagination', className), children: [_jsx(Button, Object.assign({}, api.getPrevProps(), { text: "Previous", fullWidth: false, membrane: membrane, variant: "ghost", className: "uf-pagination-nav uf-pagination-navPrev" })), _jsx("span", { className: cn('uf-pagination-currentSlot', membrane && 'uf-membrane'), children: _jsx(Text, { as: "span", membrane: false, fullWidth: false, variant: "label", className: "uf-pagination-current", "aria-current": "page", title: `Page ${api.page} of ${api.totalPages}`, children: api.page }) }), _jsxs("span", { className: "uf-pagination-trailing", children: [_jsx(Button, Object.assign({}, api.getNextProps(), { text: "Next", fullWidth: false, membrane: membrane, variant: "ghost", className: "uf-pagination-nav uf-pagination-navNext" })), _jsx(Menu, { items: pageItems, surfaceTitle: surfaceTitle, onSelect: (details) => {
                            const nextPage = Number(details.value);
                            if (!Number.isFinite(nextPage))
                                return;
                            send({ type: 'SET_PAGE', page: nextPage });
                        }, children: _jsx(Button, { icon: "more", iconOnly: true, fullWidth: false, membrane: membrane, variant: "ghost", className: "uf-pagination-more", "aria-label": "Choose page", title: "Choose page" }) })] })] })));
});
