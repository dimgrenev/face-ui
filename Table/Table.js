import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Table — data table with sorting, row selection, and reference-matching features.
 *
 * `<Table columns={[...]} rows={[...]} />`
 * `<Table columns={[...]} rows={[...]} selectable />`
 * `<Table columns={[...]} rows={[...]} showRowNumbers stickyHeader />`
 */
import { forwardRef, useEffect, useMemo, useRef, useState, isValidElement } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { tableMachine, connectTable } from '../assets/machines/table.machine';
import { cn } from '../assets/utils';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRowId(row, rowKey, index) {
    if (typeof rowKey === 'function')
        return rowKey(row);
    if (typeof rowKey === 'string') {
        const val = row[rowKey];
        return val != null ? String(val) : String(index);
    }
    const asRecord = row;
    if (asRecord['id'] != null)
        return String(asRecord['id']);
    return String(index);
}
function getCellValue(row, accessor) {
    if (accessor == null)
        return undefined;
    if (typeof accessor === 'function')
        return accessor(row);
    return row[accessor];
}
function getRawValue(row, accessor) {
    if (accessor == null)
        return undefined;
    if (typeof accessor === 'string')
        return row[accessor];
    return accessor(row);
}
function compareTableValues(left, right) {
    if (left == null && right == null)
        return 0;
    if (left == null)
        return -1;
    if (right == null)
        return 1;
    if (typeof left === 'number' && typeof right === 'number')
        return left - right;
    if (typeof left === 'boolean' && typeof right === 'boolean')
        return Number(left) - Number(right);
    if (left instanceof Date && right instanceof Date)
        return left.getTime() - right.getTime();
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}
function renderCellContent(content, align = 'left') {
    if (content == null)
        return null;
    if (isValidElement(content) || Array.isArray(content))
        return content;
    if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
        return (_jsx(Text, { as: "div", fullWidth: true, align: align, inset: "none", membrane: false, className: "uf-table__cellText", children: String(content) }));
    }
    return content;
}
function renderHeaderContent(content, align = 'left') {
    if (content == null)
        return null;
    if (isValidElement(content) || Array.isArray(content))
        return content;
    if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
        return (_jsx(Text, { as: "div", fullWidth: true, align: align, inset: "none", membrane: false, className: "uf-table__headerText", children: String(content) }));
    }
    return content;
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Table = forwardRef(function Table(props, ref) {
    const { columns: rawColumns, rows: rawRows, rowKey, getRowId: getRowIdProp, sortColumn = null, sortDirection = 'asc', onSortChange, selectedRows = [], onSelectedRowsChange, selectable = false, showRowNumbers = false, stickyHeader = true, showDividers = true, stickyLastColumn = false, onColumnResize, resizable = false, className, } = props;
    const columns = (Array.isArray(rawColumns) ? rawColumns : []).map((col) => {
        var _a, _b;
        const c = col;
        const normalizedHeader = (_b = (_a = c.header) !== null && _a !== void 0 ? _a : c.title) !== null && _b !== void 0 ? _b : c.id;
        const fallbackAccessor = (typeof c.accessor === 'string' || typeof c.accessor === 'function')
            ? c.accessor
            : c.id;
        return Object.assign(Object.assign({}, c), { header: normalizedHeader, accessor: fallbackAccessor });
    });
    const rows = Array.isArray(rawRows) ? rawRows : [];
    const resolvedGetRowId = (row, i) => {
        if (typeof getRowIdProp === 'function') {
            try {
                return String(getRowIdProp(row, i));
            }
            catch (_a) { }
        }
        return getRowId(row, rowKey, i);
    };
    const allRowIds = rows.map((row, i) => resolvedGetRowId(row, i));
    const { state, send } = useMachine(tableMachine, {
        sortColumn,
        sortDirection,
        selectedRows,
        selectable,
        rowKey: typeof rowKey === 'string' ? rowKey : 'id',
        onSortChange: onSortChange !== null && onSortChange !== void 0 ? onSortChange : null,
        onSelectedRowsChange: onSelectedRowsChange !== null && onSelectedRowsChange !== void 0 ? onSelectedRowsChange : null,
        rowCount: rows.length,
        allRowIds,
    });
    const api = connectTable(state, send);
    const [resizedWidths, setResizedWidths] = useState({});
    const resizeStateRef = useRef(null);
    const displayRows = useMemo(() => {
        if (!api.sortColumn)
            return rows;
        const sortColumnDef = columns.find((column) => column.id === api.sortColumn);
        if (!sortColumnDef || !sortColumnDef.accessor)
            return rows;
        const sorted = [...rows];
        sorted.sort((leftRow, rightRow) => {
            const leftValue = getRawValue(leftRow, sortColumnDef.accessor);
            const rightValue = getRawValue(rightRow, sortColumnDef.accessor);
            const result = compareTableValues(leftValue, rightValue);
            return api.sortDirection === 'desc' ? result * -1 : result;
        });
        return sorted;
    }, [api.sortColumn, api.sortDirection, columns, rows]);
    useEffect(() => {
        const onPointerMove = (event) => {
            const drag = resizeStateRef.current;
            if (!drag)
                return;
            const delta = event.clientX - drag.startX;
            let width = Math.round(drag.startWidth + delta);
            width = Math.max(drag.minWidth, Math.min(drag.maxWidth, width));
            if (drag.nextId) {
                const maxWidthByNext = drag.startWidth + (drag.startNextWidth - drag.nextMinWidth);
                width = Math.min(width, maxWidthByNext);
                let nextWidth = drag.startNextWidth - (width - drag.startWidth);
                nextWidth = Math.max(drag.nextMinWidth, Math.min(drag.nextMaxWidth, nextWidth));
                width = drag.startWidth + (drag.startNextWidth - nextWidth);
                setResizedWidths((prev) => (Object.assign(Object.assign({}, prev), { [drag.id]: width, [drag.nextId]: nextWidth })));
                try {
                    onColumnResize === null || onColumnResize === void 0 ? void 0 : onColumnResize(drag.id, width);
                }
                catch (_a) { }
                try {
                    onColumnResize === null || onColumnResize === void 0 ? void 0 : onColumnResize(drag.nextId, nextWidth);
                }
                catch (_b) { }
                return;
            }
            setResizedWidths((prev) => (Object.assign(Object.assign({}, prev), { [drag.id]: width })));
            try {
                onColumnResize === null || onColumnResize === void 0 ? void 0 : onColumnResize(drag.id, width);
            }
            catch (_c) { }
        };
        const onPointerUp = () => {
            resizeStateRef.current = null;
        };
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        return () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };
    }, [onColumnResize]);
    return (_jsxs("table", Object.assign({ ref: ref }, api.getRootProps(), { "data-sticky-header": stickyHeader || undefined, "data-show-dividers": showDividers || undefined, className: cn('uf-table', className), style: resizable ? { tableLayout: 'fixed' } : undefined, children: [_jsx("thead", Object.assign({}, api.getHeaderProps(), { children: _jsxs("tr", Object.assign({}, api.getHeaderRowProps(), { children: [selectable && (_jsx("th", { role: "columnheader", children: _jsx("input", Object.assign({}, api.getSelectAllProps())) })), showRowNumbers && (_jsx("th", { role: "columnheader", className: "uf-table__row-number-header", children: _jsx("div", { className: "uf-table__cellSlot", "data-align": "left", children: renderHeaderContent('#', 'left') }) })), columns.map((col, index) => {
                            var _a, _b;
                            const style = {};
                            if (resizedWidths[col.id] != null)
                                style.width = resizedWidths[col.id];
                            else if (col.width != null)
                                style.width = col.width;
                            if (col.minWidth != null)
                                style.minWidth = col.minWidth;
                            if (col.maxWidth != null)
                                style.maxWidth = col.maxWidth;
                            if (col.align)
                                style.textAlign = col.align;
                            return (_jsxs("th", Object.assign({}, api.getHeaderCellProps(col.id, { sortable: col.sortable }), { style: Object.keys(style).length > 0 ? style : undefined, children: [_jsxs("div", { className: "uf-table__cellSlot", "data-align": (_a = col.align) !== null && _a !== void 0 ? _a : 'left', children: [renderHeaderContent(col.header, (_b = col.align) !== null && _b !== void 0 ? _b : 'left'), api.sortColumn === col.id && (_jsx("span", { "aria-hidden": "true", className: "uf-table__sort-icon", children: _jsx(Icon, { name: api.sortDirection === 'asc' ? 'up' : 'down', size: 14 }) }))] }), resizable && index < columns.length - 1 && (_jsx("span", { className: "uf-table__resize-handle", onPointerDown: (event) => {
                                            var _a, _b, _c, _d, _e, _f, _g;
                                            event.preventDefault();
                                            const cell = event.currentTarget.parentElement;
                                            const measuredWidth = (_b = (_a = resizedWidths[col.id]) !== null && _a !== void 0 ? _a : cell === null || cell === void 0 ? void 0 : cell.getBoundingClientRect().width) !== null && _b !== void 0 ? _b : 120;
                                            const nextColumn = columns[index + 1];
                                            const nextCell = cell === null || cell === void 0 ? void 0 : cell.nextElementSibling;
                                            const nextWidth = nextColumn
                                                ? (_d = (_c = resizedWidths[nextColumn.id]) !== null && _c !== void 0 ? _c : nextCell === null || nextCell === void 0 ? void 0 : nextCell.getBoundingClientRect().width) !== null && _d !== void 0 ? _d : 120
                                                : 0;
                                            resizeStateRef.current = {
                                                id: col.id,
                                                nextId: (_e = nextColumn === null || nextColumn === void 0 ? void 0 : nextColumn.id) !== null && _e !== void 0 ? _e : null,
                                                startX: event.clientX,
                                                startWidth: measuredWidth,
                                                startNextWidth: nextWidth,
                                                minWidth: (_f = col.minWidth) !== null && _f !== void 0 ? _f : 80,
                                                maxWidth: typeof col.maxWidth === 'number' ? col.maxWidth : Number.MAX_SAFE_INTEGER,
                                                nextMinWidth: (_g = nextColumn === null || nextColumn === void 0 ? void 0 : nextColumn.minWidth) !== null && _g !== void 0 ? _g : 80,
                                                nextMaxWidth: typeof (nextColumn === null || nextColumn === void 0 ? void 0 : nextColumn.maxWidth) === 'number' ? nextColumn.maxWidth : Number.MAX_SAFE_INTEGER,
                                            };
                                        } }))] }), col.id));
                        })] })) })), _jsx("tbody", Object.assign({}, api.getBodyProps(), { children: displayRows.map((row, rowIndex) => {
                    var _a;
                    const rowId = resolvedGetRowId(row, rowIndex);
                    const isLastColumnSticky = stickyLastColumn;
                    const lastColumnId = columns.length > 0 ? String(((_a = columns[columns.length - 1]) === null || _a === void 0 ? void 0 : _a.id) || '') : '';
                    return (_jsxs("tr", Object.assign({}, api.getRowProps(rowId), { children: [selectable && (_jsx("td", { role: "cell", children: _jsx("input", Object.assign({}, api.getRowSelectProps(rowId))) })), showRowNumbers && (_jsx("td", { "data-row-number": "", role: "cell", children: _jsx("div", { className: "uf-table__cellSlot", "data-align": "left", children: renderCellContent(rowIndex + 1, 'left') }) })), columns.map((col) => {
                                var _a, _b;
                                const cellStyle = {};
                                if (col.align)
                                    cellStyle.textAlign = col.align;
                                if (col.maxWidth != null)
                                    cellStyle.maxWidth = col.maxWidth;
                                // Resolve cell content: custom render > accessor
                                let content;
                                if (col.render) {
                                    const rawVal = getRawValue(row, col.accessor);
                                    content = col.render(rawVal, row, { rowIndex, column: col });
                                }
                                else {
                                    content = getCellValue(row, col.accessor);
                                }
                                const renderedContent = renderCellContent(content, (_a = col.align) !== null && _a !== void 0 ? _a : 'left');
                                return (_jsx("td", Object.assign({}, api.getCellProps(rowId, col.id), { "data-truncate": col.truncate || undefined, "data-sticky-right": isLastColumnSticky && lastColumnId && String(col.id) === lastColumnId ? '' : undefined, style: Object.keys(cellStyle).length > 0 ? cellStyle : undefined, title: col.truncate && typeof content === 'string' ? content : undefined, children: _jsx("div", { className: "uf-table__cellSlot", "data-align": (_b = col.align) !== null && _b !== void 0 ? _b : 'left', "data-truncate": col.truncate || undefined, children: renderedContent }) }), col.id));
                            })] }), rowId));
                }) }))] })));
});
