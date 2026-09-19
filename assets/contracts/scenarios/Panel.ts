import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Admin Sidebar',
    props: {
      surface: 'inline',
      'aria-label': 'Admin',
      width: 280,
      defaultValue: 'members',
      items: [
        { value: 'overview', label: 'Overview', icon: 'layout-sidebar-left-open', href: '#overview' },
        { value: 'members', label: 'Members', icon: 'account', href: '#members' },
        {
          value: 'billing',
          label: 'Billing',
          icon: 'file',
          items: [
            { value: 'plan', label: 'Plan', href: '#plan' },
            { value: 'invoices', label: 'Invoices', href: '#invoices' },
          ],
        },
        { value: 'security', label: 'Security', icon: 'settings', href: '#security' },
      ],
    },
  },
  {
    name: 'Product / Collapsed Workspace Rail',
    props: {
      surface: 'inline',
      'aria-label': 'Workspace',
      defaultCollapsed: true,
      collapsedWidth: 60,
      defaultValue: 'agents',
      items: [
        { value: 'agents', label: 'Agents', icon: 'component' },
        { value: 'runs', label: 'Runs', icon: 'props' },
        { value: 'files', label: 'Files', icon: 'folder' },
        { value: 'settings', label: 'Settings', icon: 'settings' },
      ],
    },
  },
] satisfies ProductScenarioPair
