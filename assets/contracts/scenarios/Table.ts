import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Team Directory',
    props: {
      'aria-label': 'Workspace members',
      selectable: true,
      defaultSelectedRows: ['u2'],
      defaultSort: { column: 'name', direction: 'asc' },
      activeRow: 'u1',
      rowKey: 'id',
      columns: [
        { id: 'name', header: 'Member', sortable: true, truncate: true },
        { id: 'role', header: 'Role', sortable: true },
        { id: 'status', header: 'Status' },
      ],
      rows: [
        { id: 'u1', name: 'Maya Chen', role: 'Owner', status: 'Active' },
        { id: 'u2', name: 'Noah Williams', role: 'Developer', status: 'Invited' },
        { id: 'u3', name: 'Ava Patel', role: 'Analyst', status: 'Active' },
      ],
    },
  },
  {
    name: 'Product / Invoice Ledger',
    props: {
      'aria-label': 'Invoice ledger',
      defaultSort: { column: 'date', direction: 'desc' },
      rowNumbers: true,
      stickyHeader: true,
      stickyLastColumn: true,
      resizable: true,
      rowKey: 'id',
      columns: [
        { id: 'invoice', header: 'Invoice', width: 160 },
        { id: 'date', header: 'Date', sortable: true, width: 140 },
        { id: 'customer', header: 'Customer', minWidth: 200, truncate: true },
        { id: 'amount', header: 'Amount', sortable: true, align: 'end', width: 120 },
      ],
      rows: [
        { id: 'i1', invoice: 'INV-2048', date: '2026-07-01', customer: 'Northwind Traders', amount: 420 },
        { id: 'i2', invoice: 'INV-2017', date: '2026-06-01', customer: 'Contoso Pharmaceuticals Europe', amount: 1280.5 },
        { id: 'i3', invoice: 'INV-2051', date: '2026-07-14', customer: 'Fabrikam', amount: 96 },
      ],
    },
  },
] satisfies ProductScenarioPair
