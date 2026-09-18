import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Admin Sidebar',
    props: {
      surface: 'inline',
      width: 280,
      defaultSelectedId: 'members',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: 'layout-sidebar-left-open',
        },
        { id: 'members', label: 'Members', icon: 'account' },
        { id: 'billing', label: 'Billing', icon: 'file' },
        { id: 'security', label: 'Security', icon: 'settings' },
      ],
    },
  },
  {
    name: 'Product / Collapsed Workspace Rail',
    props: {
      surface: 'inline',
      defaultCollapsed: true,
      collapsedWidth: 60,
      defaultSelectedId: 'agents',
      items: [
        { id: 'agents', label: 'Agents', icon: 'component' },
        { id: 'runs', label: 'Runs', icon: 'props' },
        { id: 'files', label: 'Files', icon: 'folder' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
      ],
    },
  },
] satisfies ProductScenarioPair
