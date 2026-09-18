import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Create Project',
    props: {
      open: true,
      portal: false,
      placement: 'center',
      edge: 'inset',
      title: 'Create project',
      description: 'Start from a blank workspace or a template.',
      width: 520,
      closable: true,
      closeOnOverlayClick: true,
      actions: [
        { label: 'Cancel', variant: 'outline' },
        { label: 'Create project', variant: 'accent' },
      ],
      children: 'Project name, region, and environment settings.',
    },
  },
  {
    name: 'Product / Record Inspector',
    props: {
      open: true,
      portal: false,
      placement: 'right',
      edge: 'flush',
      title: 'Customer details',
      description: 'Account health and recent activity',
      width: 420,
      closable: true,
      closeOnOverlayClick: true,
      actions: [{ label: 'Edit customer', variant: 'accent' }],
      children: 'Plan: Enterprise. Last active 12 minutes ago.',
    },
  },
] satisfies ProductScenarioPair
