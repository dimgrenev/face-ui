import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Dashboard View',
    props: {
      multiple: false,
      orientation: 'horizontal',
      defaultValue: 'table',
      'aria-label': 'Dashboard view',
      membrane: true,
      items: [
        { value: 'table', label: 'Table' },
        { value: 'board', label: 'Board' },
        { value: 'timeline', label: 'Timeline' },
      ],
    },
  },
  {
    name: 'Product / Notification Channels',
    props: {
      multiple: true,
      orientation: 'horizontal',
      defaultValue: ['email', 'slack'],
      'aria-label': 'Notification channels',
      membrane: true,
      items: [
        { value: 'email', label: 'Email' },
        { value: 'slack', label: 'Slack' },
        { value: 'push', label: 'Push' },
      ],
    },
  },
] satisfies ProductScenarioPair
