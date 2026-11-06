import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Create Project',
    props: {
      open: true,
      portal: false,
      title: 'Create project',
      description: 'Start from a blank workspace or a template.',
      width: 520,
      closeOnBackdropClick: false,
      children: 'Project name, region, and environment settings.',
      footer: [
        { __componentName__: 'Button', variant: 'outline', children: 'Cancel' },
        { __componentName__: 'Button', variant: 'accent', children: 'Create project' },
      ],
    },
  },
  {
    name: 'Product / Record Inspector',
    props: {
      open: true,
      portal: false,
      placement: 'end',
      edge: 'flush',
      title: 'Customer details',
      description: 'Account health and recent activity',
      width: 420,
      children: 'Plan: Enterprise. Last active 12 minutes ago.',
      footer: { __componentName__: 'Button', variant: 'accent', children: 'Edit customer' },
    },
  },
] satisfies ProductScenarioPair
