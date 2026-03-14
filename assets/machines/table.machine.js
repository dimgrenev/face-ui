/**
 * Table Machine
 *
 * States: idle
 * Manages sort column/direction and row selection state.
 * Row data and column definitions live in the React component (not machine context)
 * since they may contain ReactNode content.
 */
import { createMachine } from '../create-machine';
import { createAnatomy } from '../anatomy';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const tableAnatomy = createAnatomy('table').parts('root', 'header', 'headerRow', 'headerCell', 'body', 'row', 'cell', 'footer');
// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const tableMachine = createMachine({
    id: 'table',
    initial: 'idle',
    context: {
        sortColumn: null,
        sortDirection: 'asc',
        selectedRows: [],
        selectable: false,
        rowKey: 'id',
        onSortChange: null,
        onSelectedRowsChange: null,
        rowCount: 0,
        allRowIds: [],
    },
    watch: {
        selectedRows(ctx) {
            var _a;
            (_a = ctx.onSelectedRowsChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { selectedRows: ctx.selectedRows });
        },
    },
    computed: {
        sortedColumn: (ctx) => ctx.sortColumn,
        sortedDirection: (ctx) => ctx.sortDirection,
        allSelected: (ctx) => ctx.allRowIds.length > 0 && ctx.selectedRows.length === ctx.allRowIds.length,
        someSelected: (ctx) => ctx.selectedRows.length > 0 && ctx.selectedRows.length < ctx.allRowIds.length,
    },
    states: {
        idle: {
            on: {
                SORT: {
                    actions: [
                        (ctx, event) => {
                            var _a;
                            const e = event;
                            if (ctx.sortColumn === e.column) {
                                // Toggle direction
                                ctx.sortDirection = ctx.sortDirection === 'asc' ? 'desc' : 'asc';
                            }
                            else {
                                ctx.sortColumn = e.column;
                                ctx.sortDirection = 'asc';
                            }
                            (_a = ctx.onSortChange) === null || _a === void 0 ? void 0 : _a.call(ctx, { column: ctx.sortColumn, direction: ctx.sortDirection });
                        },
                    ],
                },
                SELECT_ROW: [
                    {
                        guard: (ctx) => ctx.selectable,
                        actions: [
                            (ctx, event) => {
                                const e = event;
                                if (!ctx.selectedRows.includes(e.id)) {
                                    ctx.selectedRows = [...ctx.selectedRows, e.id];
                                }
                            },
                        ],
                    },
                ],
                DESELECT_ROW: [
                    {
                        guard: (ctx) => ctx.selectable,
                        actions: [
                            (ctx, event) => {
                                const e = event;
                                ctx.selectedRows = ctx.selectedRows.filter((id) => id !== e.id);
                            },
                        ],
                    },
                ],
                SELECT_ALL: [
                    {
                        guard: (ctx) => ctx.selectable,
                        actions: [
                            (ctx) => {
                                ctx.selectedRows = [...ctx.allRowIds];
                            },
                        ],
                    },
                ],
                DESELECT_ALL: [
                    {
                        guard: (ctx) => ctx.selectable,
                        actions: [
                            (ctx) => {
                                ctx.selectedRows = [];
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
export function connectTable(state, send) {
    const { sortColumn, sortDirection, selectedRows, selectable } = state.context;
    const allSelected = state.computed['allSelected'];
    const someSelected = state.computed['someSelected'];
    return {
        /** Computed accessors */
        sortColumn,
        sortDirection,
        selectedRows,
        allSelected,
        someSelected,
        getRootProps() {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('root')), { role: 'table' });
        },
        getHeaderProps() {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('header')), { role: 'rowgroup' });
        },
        getHeaderRowProps() {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('headerRow')), { role: 'row' });
        },
        getHeaderCellProps(columnId, options) {
            var _a;
            const isSorted = sortColumn === columnId;
            const sortable = (_a = options === null || options === void 0 ? void 0 : options.sortable) !== null && _a !== void 0 ? _a : false;
            return Object.assign(Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('headerCell')), { role: 'columnheader', 'data-column': columnId, 'data-sorted': isSorted || undefined, 'data-sort-direction': isSorted ? sortDirection : undefined, 'aria-sort': isSorted
                    ? (sortDirection === 'asc' ? 'ascending' : 'descending')
                    : 'none' }), (sortable
                ? {
                    style: { cursor: 'pointer' },
                    onClick() {
                        send({ type: 'SORT', column: columnId });
                    },
                    onKeyDown(event) {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            send({ type: 'SORT', column: columnId });
                        }
                    },
                    tabIndex: 0,
                }
                : {}));
        },
        getSelectAllProps() {
            return {
                type: 'checkbox',
                checked: allSelected,
                'aria-label': 'Select all rows',
                // indeterminate must be set via ref in React
                onChange() {
                    if (allSelected) {
                        send({ type: 'DESELECT_ALL' });
                    }
                    else {
                        send({ type: 'SELECT_ALL' });
                    }
                },
            };
        },
        getBodyProps() {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('body')), { role: 'rowgroup' });
        },
        getRowProps(rowId) {
            const isSelected = selectedRows.includes(rowId);
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('row')), { role: 'row', 'data-row-id': rowId, 'data-selected': isSelected || undefined, 'aria-selected': selectable ? isSelected : undefined });
        },
        getRowSelectProps(rowId) {
            const isSelected = selectedRows.includes(rowId);
            return {
                type: 'checkbox',
                checked: isSelected,
                'aria-label': `Select row ${rowId}`,
                onChange() {
                    if (isSelected) {
                        send({ type: 'DESELECT_ROW', id: rowId });
                    }
                    else {
                        send({ type: 'SELECT_ROW', id: rowId });
                    }
                },
            };
        },
        getCellProps(rowId, columnId) {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('cell')), { role: 'cell', 'data-row-id': rowId, 'data-column': columnId });
        },
        getFooterProps() {
            return Object.assign(Object.assign({}, tableAnatomy.getPartAttrs('footer')), { role: 'rowgroup' });
        },
    };
}
