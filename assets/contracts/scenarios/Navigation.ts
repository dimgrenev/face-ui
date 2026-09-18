import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / SaaS Top Navigation',
    props: {
      orientation: 'horizontal',
      surface: 'inline',
      defaultActiveId: 'dashboard',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '#dashboard' },
        {
          id: 'projects',
          label: 'Projects',
          items: [
            { id: 'active', label: 'Active projects' },
            { id: 'archived', label: 'Archived projects' },
          ],
        },
        { id: 'analytics', label: 'Analytics', href: '#analytics' },
        { id: 'settings', label: 'Settings', href: '#settings' },
      ],
    },
  },
  {
    name: 'Product / Mobile Product Navigation',
    props: {
      orientation: 'vertical',
      surface: 'sheet',
      defaultOpen: true,
      surfaceTitle: 'Navigate',
      defaultActiveId: 'agents',
      items: [
        { id: 'agents', label: 'Agents' },
        { id: 'runs', label: 'Runs' },
        { id: 'knowledge', label: 'Knowledge' },
        { id: 'settings', label: 'Settings' },
      ],
    },
  },
] satisfies ProductScenarioPair
