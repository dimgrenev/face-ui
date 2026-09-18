import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Save Confirmation',
    props: {
      title: 'Workspace saved',
      description: 'Your changes are now visible to all collaborators.',
      tone: 'positive',
      dismissible: true,
      action: { label: 'View changes' },
    },
  },
  {
    name: 'Product / Background Sync',
    props: {
      title: 'Sync is taking longer than expected',
      description:
        'You can keep working while the remaining records are processed.',
      tone: 'warning',
      dismissible: false,
      action: { label: 'Open activity' },
    },
  },
] satisfies ProductScenarioPair
