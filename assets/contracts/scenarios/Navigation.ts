import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / SaaS Top Navigation',
    props: {
      surface: 'inline',
      'aria-label': 'Main',
      defaultValue: 'dashboard',
      items: [
        { value: 'dashboard', label: 'Dashboard', href: '#dashboard' },
        {
          value: 'projects',
          label: 'Projects',
          items: [
            { value: 'active', label: 'Active projects', href: '#active' },
            { value: 'archived', label: 'Archived projects', href: '#archived' },
            {
              type: 'group',
              label: 'Templates',
              items: [
                { value: 'starter', label: 'Starter kits', href: '#starter' },
                { value: 'shared', label: 'Shared with me', href: '#shared' },
              ],
            },
          ],
        },
        { value: 'analytics', label: 'Analytics', href: '#analytics' },
        { value: 'settings', label: 'Settings', href: '#settings' },
      ],
    },
  },
  {
    name: 'Product / Mobile Product Navigation',
    props: {
      surface: 'sheet',
      defaultOpen: true,
      'aria-label': 'Navigate',
      defaultValue: 'agents',
      items: [
        { value: 'agents', label: 'Agents', icon: 'component', href: '#agents' },
        { value: 'runs', label: 'Runs', icon: 'activity-running', href: '#runs' },
        {
          value: 'knowledge',
          label: 'Knowledge',
          icon: 'folder',
          items: [
            { value: 'sources', label: 'Sources', href: '#sources' },
            { value: 'indexes', label: 'Indexes', href: '#indexes' },
          ],
        },
        { value: 'settings', label: 'Settings', icon: 'settings', href: '#settings' },
      ],
    },
  },
] satisfies ProductScenarioPair
