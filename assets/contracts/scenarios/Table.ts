import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Team Directory',
    props: {
      selectable: true,
      selectedRows: ['u2'],
      showRowNumbers: false,
      stickyHeader: true,
      showDividers: true,
      membrane: true,
      ariaLabel: 'Workspace members',
      rowKey: 'id',
      columns: [
        {
          id: 'name',
          header: 'Member',
          accessor: 'name',
          sortable: true,
          truncate: true,
        },
        { id: 'role', header: 'Role', accessor: 'role' },
        { id: 'status', header: 'Status', accessor: 'status' },
      ],
      rows: [
        { id: 'u1', name: 'Maya Chen', role: 'Owner', status: 'Active' },
        {
          id: 'u2',
          name: 'Noah Williams',
          role: 'Developer',
          status: 'Invited',
        },
        { id: 'u3', name: 'Ava Patel', role: 'Analyst', status: 'Active' },
      ],
    },
  },
  {
    name: 'Product / Invoice Ledger',
    props: {
      sortColumn: 'date',
      sortDirection: 'desc',
      showRowNumbers: true,
      stickyHeader: true,
      showDividers: true,
      resizable: true,
      ariaLabel: 'Invoice ledger',
      rowKey: 'id',
      columns: [
        { id: 'invoice', header: 'Invoice', accessor: 'invoice', width: 160 },
        {
          id: 'date',
          header: 'Date',
          accessor: 'date',
          sortable: true,
          width: 140,
        },
        {
          id: 'amount',
          header: 'Amount',
          accessor: 'amount',
          align: 'right',
          width: 120,
        },
      ],
      rows: [
        {
          id: 'i1',
          invoice: 'INV-2048',
          date: '2026-07-01',
          amount: '$420.00',
        },
        {
          id: 'i2',
          invoice: 'INV-2017',
          date: '2026-06-01',
          amount: '$420.00',
        },
      ],
    },
  },
] satisfies ProductScenarioPair
